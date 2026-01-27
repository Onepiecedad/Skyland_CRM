// Supabase Edge Function: Send Email via Resend
// Deploy via: supabase functions deploy send-email --no-verify-jwt
// Set secret: supabase secrets set RESEND_API_KEY=re_...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
    to: string;
    subject: string;
    body: string;
    from?: string;
    replyTo?: string;
    messageId?: string; // ID in messages table to update status
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY not configured');
        }

        const { to, subject, body, from, replyTo, messageId }: EmailRequest = await req.json();

        if (!to || !subject || !body) {
            throw new Error('Missing required fields: to, subject, body');
        }

        // Send email via Resend API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: from || 'Thomas Guldager <info@marinmekaniker.nu>',
                to: [to],
                subject: subject,
                text: body,
                reply_to: replyTo || 'info@marinmekaniker.nu',
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Resend API error:', result);

            // Update message status to 'failed' if messageId provided
            if (messageId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                await supabase
                    .from('messages')
                    .update({
                        status: 'failed',
                        error_message: result.message || 'Email send failed'
                    })
                    .eq('id', messageId);
            }

            throw new Error(result.message || 'Failed to send email');
        }

        console.log('Email sent successfully:', result.id);

        // Update message status to 'sent' if messageId provided
        if (messageId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            await supabase
                .from('messages')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    external_id: result.id // Resend email ID
                })
                .eq('id', messageId);
        }

        return new Response(
            JSON.stringify({
                success: true,
                emailId: result.id,
                message: 'Email sent successfully'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error) {
        console.error('Send email error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        );
    }
});
