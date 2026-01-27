// Supabase Edge Function: AI Assistant with Email Sending Capability
// Deploy via: supabase functions deploy ai-assistant --no-verify-jwt
// Secrets needed: OPENAI_API_KEY, RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the send_email tool for OpenAI function calling
const tools = [
    {
        type: "function",
        function: {
            name: "send_email",
            description: "Skicka ett mail till en kund eller kontakt. Använd denna funktion när användaren explicit ber dig skicka ett mail. OBS: Fråga ALLTID användaren om bekräftelse innan du skickar.",
            parameters: {
                type: "object",
                properties: {
                    to: {
                        type: "string",
                        description: "Mottagarens e-postadress"
                    },
                    subject: {
                        type: "string",
                        description: "Ämnesrad för mailet"
                    },
                    body: {
                        type: "string",
                        description: "Mailinnehållet (plain text)"
                    },
                    recipient_name: {
                        type: "string",
                        description: "Mottagarens namn (för bekräftelse)"
                    }
                },
                required: ["to", "subject", "body"]
            }
        }
    }
];

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

        const { messages, confirmSendEmail } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            throw new Error('Invalid messages format');
        }

        // If user confirmed sending a specific email
        if (confirmSendEmail) {
            const { to, subject, body } = confirmSendEmail;
            const result = await sendEmail(to, subject, body);

            if (result.success) {
                return new Response(
                    JSON.stringify({
                        message: `✅ Mailet har skickats till ${to}!\n\nÄmne: ${subject}`,
                        emailSent: true,
                        emailId: result.emailId
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
                );
            } else {
                return new Response(
                    JSON.stringify({
                        message: `❌ Kunde inte skicka mailet: ${result.error}`,
                        emailSent: false
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
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

        // Check if AI wants to call a function (send email)
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
            const toolCall = choice.message.tool_calls[0];

            if (toolCall.function.name === 'send_email') {
                const args = JSON.parse(toolCall.function.arguments);

                // Return the email details for user confirmation
                return new Response(
                    JSON.stringify({
                        message: `📧 Jag har förberett ett mail åt dig:\n\n**Till:** ${args.to}\n**Ämne:** ${args.subject}\n\n---\n${args.body}\n---\n\n⚠️ Vill du att jag skickar detta mail?`,
                        pendingEmail: {
                            to: args.to,
                            subject: args.subject,
                            body: args.body,
                            recipient_name: args.recipient_name || null
                        }
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
                );
            }
        }

        // Regular chat response
        const assistantMessage = choice.message?.content || 'Kunde inte generera svar.';

        return new Response(
            JSON.stringify({ message: assistantMessage }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('AI Assistant error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
