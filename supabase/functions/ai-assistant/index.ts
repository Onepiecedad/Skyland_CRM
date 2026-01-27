// Supabase Edge Function: AI Assistant with Email & Data Editing Capabilities
// Deploy via: supabase functions deploy ai-assistant --no-verify-jwt
// Secrets needed: OPENAI_API_KEY, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define all available tools for OpenAI function calling
const tools = [
    {
        type: "function",
        function: {
            name: "send_email",
            description: "Skicka ett mail till en kund eller kontakt. Använd denna funktion när användaren explicit ber dig skicka ett mail.",
            parameters: {
                type: "object",
                properties: {
                    to: { type: "string", description: "Mottagarens e-postadress" },
                    subject: { type: "string", description: "Ämnesrad för mailet" },
                    body: { type: "string", description: "Mailinnehållet (plain text)" },
                    recipient_name: { type: "string", description: "Mottagarens namn (för bekräftelse)" }
                },
                required: ["to", "subject", "body"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_customer",
            description: "Uppdatera kundinformation i CRM:et. Använd när användaren ber dig ändra/uppdatera en kunds uppgifter som telefonnummer, e-post, båtmodell, motor etc.",
            parameters: {
                type: "object",
                properties: {
                    customer_id: { type: "string", description: "Kundens ID (UUID)" },
                    customer_name: { type: "string", description: "Kundens nuvarande namn (för bekräftelse)" },
                    updates: {
                        type: "object",
                        description: "Fält att uppdatera",
                        properties: {
                            name: { type: "string", description: "Nytt namn" },
                            email: { type: "string", description: "Ny e-postadress" },
                            phone: { type: "string", description: "Nytt telefonnummer" },
                            boat_model: { type: "string", description: "Ny båtmodell" },
                            engine_brand: { type: "string", description: "Nytt motormärke" },
                            notes: { type: "string", description: "Nya anteckningar" }
                        }
                    }
                },
                required: ["customer_id", "customer_name", "updates"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_job",
            description: "Uppdatera ett jobb/ärende i CRM:et. Använd när användaren ber dig ändra status, datum eller annan information om ett jobb.",
            parameters: {
                type: "object",
                properties: {
                    job_id: { type: "string", description: "Jobbets ID (UUID)" },
                    job_title: { type: "string", description: "Jobbets nuvarande titel (för bekräftelse)" },
                    updates: {
                        type: "object",
                        description: "Fält att uppdatera",
                        properties: {
                            title: { type: "string", description: "Ny titel" },
                            status: { type: "string", description: "Ny status (pending, scheduled, in_progress, completed, cancelled)" },
                            scheduled_date: { type: "string", description: "Nytt schemalagt datum (YYYY-MM-DD)" },
                            description: { type: "string", description: "Ny beskrivning" },
                            notes: { type: "string", description: "Nya anteckningar" }
                        }
                    }
                },
                required: ["job_id", "job_title", "updates"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_job",
            description: "Skapa ett nytt jobb/ärende för en kund. Använd när användaren ber dig skapa ett nytt jobb.",
            parameters: {
                type: "object",
                properties: {
                    customer_id: { type: "string", description: "Kundens ID (UUID)" },
                    customer_name: { type: "string", description: "Kundens namn (för bekräftelse)" },
                    title: { type: "string", description: "Jobbets titel" },
                    description: { type: "string", description: "Beskrivning av jobbet" },
                    scheduled_date: { type: "string", description: "Schemalagt datum (YYYY-MM-DD), valfritt" },
                    status: { type: "string", description: "Status (pending, scheduled, in_progress)", default: "pending" }
                },
                required: ["customer_id", "customer_name", "title"]
            }
        }
    }
];

// Get Supabase client
function getSupabaseClient() {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase credentials not configured');
    }

    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Send email via Resend API
async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string; emailId?: string }> {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
        return { success: false, error: 'RESEND_API_KEY not configured' };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Thomas Guldager <info@marinmekaniker.nu>',
                to: [to],
                subject: subject,
                text: body,
                reply_to: 'info@marinmekaniker.nu',
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Resend API error:', result);
            return { success: false, error: result.message || 'Failed to send email' };
        }

        console.log('Email sent successfully:', result.id);
        return { success: true, emailId: result.id };
    } catch (error) {
        console.error('Send email error:', error);
        return { success: false, error: error.message };
    }
}

// Update customer in database
async function updateCustomer(customerId: string, updates: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('customers')
            .update(updates)
            .eq('id', customerId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update customer error:', error);
        return { success: false, error: error.message };
    }
}

// Update job in database
async function updateJob(jobId: string, updates: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('jobs')
            .update(updates)
            .eq('id', jobId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update job error:', error);
        return { success: false, error: error.message };
    }
}

// Create new job in database
async function createJob(data: Record<string, any>): Promise<{ success: boolean; error?: string; jobId?: string }> {
    try {
        const supabase = getSupabaseClient();
        const { data: job, error } = await supabase
            .from('jobs')
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return { success: true, jobId: job.id };
    } catch (error) {
        console.error('Create job error:', error);
        return { success: false, error: error.message };
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not configured');
        }

        const { messages, confirmAction } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            throw new Error('Invalid messages format');
        }

        // If user confirmed an action
        if (confirmAction) {
            const { action, ...params } = confirmAction;

            switch (action) {
                case 'send_email': {
                    const result = await sendEmail(params.to, params.subject, params.body);
                    if (result.success) {
                        return new Response(
                            JSON.stringify({
                                message: `✅ Mailet har skickats till ${params.to}!\n\nÄmne: ${params.subject}`,
                                actionCompleted: true
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    } else {
                        return new Response(
                            JSON.stringify({ message: `❌ Kunde inte skicka mailet: ${result.error}`, actionCompleted: false }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    }
                }

                case 'update_customer': {
                    const result = await updateCustomer(params.customer_id, params.updates);
                    if (result.success) {
                        const fields = Object.entries(params.updates).map(([k, v]) => `• ${k}: ${v}`).join('\n');
                        return new Response(
                            JSON.stringify({
                                message: `✅ Kunden **${params.customer_name}** har uppdaterats!\n\nÄndringar:\n${fields}`,
                                actionCompleted: true
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    } else {
                        return new Response(
                            JSON.stringify({ message: `❌ Kunde inte uppdatera kund: ${result.error}`, actionCompleted: false }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    }
                }

                case 'update_job': {
                    const result = await updateJob(params.job_id, params.updates);
                    if (result.success) {
                        const fields = Object.entries(params.updates).map(([k, v]) => `• ${k}: ${v}`).join('\n');
                        return new Response(
                            JSON.stringify({
                                message: `✅ Jobbet **${params.job_title}** har uppdaterats!\n\nÄndringar:\n${fields}`,
                                actionCompleted: true
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    } else {
                        return new Response(
                            JSON.stringify({ message: `❌ Kunde inte uppdatera jobb: ${result.error}`, actionCompleted: false }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    }
                }

                case 'create_job': {
                    const jobData = {
                        customer_id: params.customer_id,
                        title: params.title,
                        description: params.description || null,
                        scheduled_date: params.scheduled_date || null,
                        status: params.status || 'pending'
                    };
                    const result = await createJob(jobData);
                    if (result.success) {
                        return new Response(
                            JSON.stringify({
                                message: `✅ Nytt jobb skapat för **${params.customer_name}**!\n\n📋 ${params.title}${params.scheduled_date ? `\n📅 ${params.scheduled_date}` : ''}`,
                                actionCompleted: true
                            }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    } else {
                        return new Response(
                            JSON.stringify({ message: `❌ Kunde inte skapa jobb: ${result.error}`, actionCompleted: false }),
                            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                        );
                    }
                }

                default:
                    return new Response(
                        JSON.stringify({ message: `❌ Okänd åtgärd: ${action}`, actionCompleted: false }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
            }
        }

        // Call OpenAI API with tools
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                tools: tools,
                tool_choice: 'auto',
                max_tokens: 1500,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const choice = data.choices[0];

        // Check if AI wants to call a function
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
            const toolCall = choice.message.tool_calls[0];
            const args = JSON.parse(toolCall.function.arguments);

            switch (toolCall.function.name) {
                case 'send_email':
                    return new Response(
                        JSON.stringify({
                            message: `📧 Jag har förberett ett mail åt dig:\n\n**Till:** ${args.to}\n**Ämne:** ${args.subject}\n\n---\n${args.body}\n---\n\n⚠️ Vill du att jag skickar detta mail?`,
                            pendingAction: { action: 'send_email', ...args }
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );

                case 'update_customer': {
                    const fields = Object.entries(args.updates).map(([k, v]) => `• **${k}** → ${v}`).join('\n');
                    return new Response(
                        JSON.stringify({
                            message: `✏️ Jag vill uppdatera kunden **${args.customer_name}**:\n\n${fields}\n\n⚠️ Bekräfta ändringen?`,
                            pendingAction: { action: 'update_customer', ...args }
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
                }

                case 'update_job': {
                    const fields = Object.entries(args.updates).map(([k, v]) => `• **${k}** → ${v}`).join('\n');
                    return new Response(
                        JSON.stringify({
                            message: `✏️ Jag vill uppdatera jobbet **${args.job_title}**:\n\n${fields}\n\n⚠️ Bekräfta ändringen?`,
                            pendingAction: { action: 'update_job', ...args }
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
                }

                case 'create_job':
                    return new Response(
                        JSON.stringify({
                            message: `📋 Jag vill skapa ett nytt jobb:\n\n**Kund:** ${args.customer_name}\n**Titel:** ${args.title}${args.description ? `\n**Beskrivning:** ${args.description}` : ''}${args.scheduled_date ? `\n**Datum:** ${args.scheduled_date}` : ''}\n\n⚠️ Bekräfta skapandet?`,
                            pendingAction: { action: 'create_job', ...args }
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    );
            }
        }

        // Regular chat response
        const assistantMessage = choice.message?.content || 'Kunde inte generera svar.';

        return new Response(
            JSON.stringify({ message: assistantMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (error) {
        console.error('AI Assistant error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
