// Supabase Edge Function: AI-baserad Email Klassificering
// Deploy via: supabase functions deploy classify-email --no-verify-jwt
// Secrets needed: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Ersätter hårdkodad partner portal detection med dynamisk AI-klassificering.
// Klassificerar OCH extraherar data i ett anrop.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt för klassificering + extraktion
const SYSTEM_PROMPT = `Du är en intelligent email-klassificerare för ett marin-serviceföretag (Skyland / Marinmekaniker).

Din uppgift är att:
1. KLASSIFICERA mailet (typ, källa, prioritet)
2. EXTRAHERA relevant data om det är en lead/förfrågan

Analysera mailet och returnera JSON:

{
  "classification": {
    "mailType": "lead_portal | direct_inquiry | existing_customer | spam | newsletter | invoice | other",
    "portalName": "Offerta | Byggleads | Blocket | Hitta | null",
    "isNewLead": true/false,
    "shouldCreateLead": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "Kort förklaring (max 30 tecken)"
  },
  "priority": "high | medium | low",
  "extractedData": {
    "customerName": "Namn eller null",
    "customerEmail": "Email eller null",
    "customerPhone": "Telefon eller null",
    "location": "Ort eller null",
    "summary": "Kort sammanfattning (max 100 tecken)",
    "detailedDescription": "Full beskrivning",
    "category": "QUOTE | SERVICE | REPAIR | INQUIRY | BOOKING | OTHER",
    "urgency": "urgent | soon | flexible | unknown",
    "competitionLevel": "Antal konkurrenter (siffra) eller null"
  },
  "sourceId": "Portal-ID om tillgängligt (t.ex. Offerta Id:51011)"
}

## Klassificeringsregler:

### lead_portal
Mail från partner-portaler som Offerta, Byggleads, Blocket Jobb, Hitta.
Kännetecken:
- Avsändare: info@offerta.se, noreply@byggleads.se, jobb@blocket.se, etc.
- Ämnesrad: "Ny förfrågan", "Du har fått en förfrågan", "(Id:12345)"
- Innehåll: Strukturerade data om kund, tjänst, tidsram

### direct_inquiry
Direktförfrågan från potentiell kund (inte via portal).
Kännetecken:
- Personlig avsändare (namn@gmail.com, etc.)
- Frågar om tjänster, priser, tillgänglighet

### existing_customer
Mail från känd/återkommande kund.
Kännetecken:
- Refererar till tidigare jobb eller relation
- Uppföljning, feedback, ny bokning

### spam/newsletter
Reklam, nyhetsbrev, automatiska notifieringar.
shouldCreateLead = false

## Prioritetsregler:
- HIGH: Brådskande ("snarast", "akut") + få konkurrenter (1-3)
- HIGH: Tidskritiskt (inom 1 vecka)
- MEDIUM: Inom 2 veckor ELLER många konkurrenter (4+)
- LOW: Flexibelt, ej tidskritiskt

VIKTIGT: Svara ENDAST med JSON. Ingen markdown, inga förklaringar.`;

// Get Supabase client
function getSupabaseClient() {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not configured');
    }

    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Call OpenAI for classification + extraction
async function classifyWithAI(
    subject: string,
    body: string,
    fromEmail: string,
    fromName: string
): Promise<Record<string, any>> {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const userMessage = `Avsändare: ${fromName} <${fromEmail}>
Ämne: ${subject}

Innehåll:
${body}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 1000,
            temperature: 0.2, // Low temp for consistent classification
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    // Parse JSON response (handle potential markdown wrapping)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '');
    }

    return JSON.parse(jsonStr);
}

// Create lead in database
async function createLead(
    result: Record<string, any>,
    subject: string,
    messageId: string | null
): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
        const supabase = getSupabaseClient();
        const classification = result.classification || {};
        const extracted = result.extractedData || {};

        const leadData = {
            name: extracted.customerName || 'Okänd kund',
            email: extracted.customerEmail || null,
            phone: extracted.customerPhone || null,
            subject: subject,
            ai_summary: extracted.summary || extracted.detailedDescription || null,
            ai_category: extracted.category || 'INQUIRY',
            source: classification.portalName || 'Direct',
            status: 'new',
            message_id: messageId || null,
            notes: JSON.stringify({
                source_id: result.sourceId,
                location: extracted.location,
                urgency: extracted.urgency,
                priority: result.priority,
                competition_level: extracted.competitionLevel,
                detailed_description: extracted.detailedDescription,
                classification: classification
            }),
            created_at: new Date().toISOString()
        };

        const { data: lead, error } = await supabase
            .from('leads')
            .insert(leadData)
            .select()
            .single();

        if (error) throw error;

        console.log(`Lead created: ${lead.id} for ${extracted.customerName}`);
        return { success: true, leadId: lead.id };
    } catch (error) {
        console.error('Create lead error:', error);
        return { success: false, error: error.message };
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { subject, body, fromEmail, fromName, messageId, autoCreateLead = true } = await req.json();

        if (!subject || !body) {
            throw new Error('Missing required fields: subject, body');
        }

        console.log(`Classifying email from ${fromName} <${fromEmail}>: ${subject}`);

        // Classify and extract using AI
        const result = await classifyWithAI(subject, body, fromEmail || '', fromName || '');
        console.log('Classification result:', JSON.stringify(result));

        const classification = result.classification || {};
        let leadId = null;

        // Automatically create lead if enabled and appropriate
        if (autoCreateLead && classification.shouldCreateLead) {
            const leadResult = await createLead(result, subject, messageId);
            if (leadResult.success) {
                leadId = leadResult.leadId;
            } else {
                console.warn('Failed to create lead:', leadResult.error);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                classification: classification,
                priority: result.priority,
                extractedData: result.extractedData,
                sourceId: result.sourceId,
                leadCreated: leadId !== null,
                leadId: leadId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (error) {
        console.error('Classify email error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                // Return safe defaults for n8n to continue
                classification: {
                    mailType: 'other',
                    isNewLead: false,
                    shouldCreateLead: false,
                    confidence: 0
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
