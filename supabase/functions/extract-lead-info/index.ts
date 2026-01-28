// Supabase Edge Function: Extract Lead Info from Partner Portal Emails
// Deploy via: supabase functions deploy extract-lead-info --no-verify-jwt
// Secrets needed: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for extracting customer info from partner portal emails
const SYSTEM_PROMPT = `Du är expert på att extrahera kundinformation från förfrågningar via partner-portaler (Offerta, Byggleads, etc.).

Analysera mailet och extrahera följande information i JSON-format:

{
  "customer_name": "Kundens fullständiga namn",
  "customer_email": "Kundens email om tillgänglig, annars null",
  "customer_phone": "Telefonnummer (behåll original-format)",
  "location": "Ort/adress",
  "property_type": "villa/lägenhet/båt/industri/annat",
  "job_description": "Kort sammanfattning av uppdraget (max 100 tecken)",
  "detailed_description": "Fullständig beskrivning av uppdraget",
  "urgency": "urgent/soon/flexible",
  "estimated_value": "Uppskattat värde om angivet, annars null",
  "competition_level": "Antal konkurrerande företag (siffra) om angivet",
  "category": "QUOTE/SERVICE/REPAIR/INQUIRY/BOOKING",
  "priority": "high/medium/low"
}

Prioritetsregler:
- HIGH: "Snarast möjligt" + få konkurrenter (1-3)
- HIGH: Explicit brådskande + inom 1 vecka
- MEDIUM: Inom 2 veckor ELLER många konkurrenter (4+)
- LOW: Flexibelt timing, ej tidskritiskt

Kategori-regler:
- QUOTE: Vill ha offert/kostnadsförslag
- SERVICE: Regelbunden service/underhåll
- REPAIR: Reparation av något trasigt
- INQUIRY: Allmän fråga
- BOOKING: Vill boka tid

VIKTIGT: Svara ENDAST med JSON. Inga förklaringar eller markdown.`;

// Get Supabase client
function getSupabaseClient() {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not configured');
    }

    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Extract Offerta ID from subject
function extractSourceId(subject: string, portalName: string): string | null {
    if (portalName === 'Offerta') {
        const match = subject.match(/\(Id:(\d+)\)/i);
        return match ? match[1] : null;
    }
    // Add more patterns for other portals
    return null;
}

// Call OpenAI to extract info
async function extractWithAI(subject: string, body: string, portalName: string): Promise<Record<string, any>> {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const userMessage = `Portal: ${portalName}
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
            max_tokens: 800,
            temperature: 0.3, // Lower temp for more consistent extraction
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
    extractedData: Record<string, any>,
    subject: string,
    messageId: string | null,
    portalName: string,
    sourceId: string | null
): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
        const supabase = getSupabaseClient();

        const leadData = {
            name: extractedData.customer_name || 'Okänd kund',
            email: extractedData.customer_email || null,
            phone: extractedData.customer_phone || null,
            subject: subject,
            ai_summary: extractedData.job_description || extractedData.detailed_description || null,
            ai_category: extractedData.category || 'INQUIRY',
            source: portalName,
            status: 'new',
            message_id: messageId || null,
            // Store extra data in notes or a JSON field if available
            notes: JSON.stringify({
                source_id: sourceId,
                location: extractedData.location,
                property_type: extractedData.property_type,
                urgency: extractedData.urgency,
                priority: extractedData.priority,
                competition_level: extractedData.competition_level,
                estimated_value: extractedData.estimated_value,
                detailed_description: extractedData.detailed_description
            }),
            created_at: new Date().toISOString()
        };

        const { data: lead, error } = await supabase
            .from('leads')
            .insert(leadData)
            .select()
            .single();

        if (error) throw error;

        console.log(`Lead created: ${lead.id} for ${extractedData.customer_name}`);
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
        const { subject, body, portalName, messageId } = await req.json();

        if (!subject || !body || !portalName) {
            throw new Error('Missing required fields: subject, body, portalName');
        }

        console.log(`Processing ${portalName} email: ${subject}`);

        // Extract source ID (e.g., Offerta ID)
        const sourceId = extractSourceId(subject, portalName);
        console.log(`Source ID: ${sourceId || 'not found'}`);

        // Extract info using AI
        const extractedData = await extractWithAI(subject, body, portalName);
        console.log('Extracted data:', JSON.stringify(extractedData));

        // Create lead
        const result = await createLead(extractedData, subject, messageId, portalName, sourceId);

        if (!result.success) {
            throw new Error(result.error || 'Failed to create lead');
        }

        return new Response(
            JSON.stringify({
                success: true,
                leadId: result.leadId,
                extractedData: extractedData,
                sourceId: sourceId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (error) {
        console.error('Extract lead info error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
