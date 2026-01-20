import { useState } from 'react';
import { X, Send, RefreshCw, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '../lib/supabase';

/**
 * Modal for replying to an email message
 * 
 * Props:
 *   isOpen: boolean - whether modal is visible
 *   onClose: () => void - close handler
 *   originalMessage: object - the message being replied to
 *   customer: object - the customer (for email address)
 *   onReplySent: () => void - callback after successful reply
 */
export const ReplyModal = ({ isOpen, onClose, originalMessage, customer, onReplySent }) => {
    const [subject, setSubject] = useState(`Re: ${originalMessage?.title || ''}`);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !originalMessage) return null;

    const recipientEmail = originalMessage.direction === 'inbound'
        ? (originalMessage.from_email || customer?.email)
        : (originalMessage.to_email || customer?.email);

    const handleSend = async () => {
        if (!body.trim()) {
            setError('Skriv ett meddelande');
            return;
        }

        if (!recipientEmail) {
            setError('Ingen mottagaradress hittades');
            return;
        }

        setSending(true);
        setError(null);

        try {
            // Insert the outbound message into messages table with 'queued' status
            // n8n workflow will pick up queued messages and send them via SMTP
            const { error: insertError } = await supabase
                .from('messages')
                .insert({
                    customer_id: customer?.id || null,
                    lead_id: originalMessage.lead_id || null,
                    direction: 'outbound',
                    channel: 'email',
                    subject: subject,
                    content: body,
                    body_preview: body.substring(0, 500),
                    body_full: body,
                    from_email: 'info@marinmekaniker.nu',
                    from_name: 'Marinmekaniker Thomas Guldager',
                    to_email: recipientEmail,
                    status: 'queued', // n8n picks up queued messages
                    reply_to_id: originalMessage.id,
                    thread_id: originalMessage.thread_id || originalMessage.id,
                    created_at: new Date().toISOString()
                });

            if (insertError) throw insertError;

            // Success - close modal and notify parent
            onReplySent?.();
            onClose();
            setBody('');

        } catch (err) {
            console.error('Error saving reply:', err);
            setError(err.message || 'Kunde inte spara meddelandet');
        } finally {
            setSending(false);
        }
    };

    const handleClose = () => {
        if (!sending) {
            setBody('');
            setError(null);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Reply className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Svara på mejl</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleClose} disabled={sending}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {/* Recipient */}
                    <div className="space-y-2">
                        <Label htmlFor="reply-to">Till</Label>
                        <Input
                            id="reply-to"
                            value={recipientEmail || ''}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                        <Label htmlFor="reply-subject">Ämne</Label>
                        <Input
                            id="reply-subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ämne"
                        />
                    </div>

                    {/* Message body */}
                    <div className="space-y-2">
                        <Label htmlFor="reply-body">Meddelande</Label>
                        <textarea
                            id="reply-body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Skriv ditt svar här..."
                            className="w-full min-h-[200px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                            autoFocus
                        />
                    </div>

                    {/* Original message preview */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs">Originalmeddelande</Label>
                        <div className="p-3 bg-muted/50 rounded-lg border text-sm">
                            <div className="font-medium text-xs text-muted-foreground mb-1">
                                Från: {originalMessage.from_label}
                            </div>
                            <div className="font-medium text-xs text-muted-foreground mb-2">
                                Ämne: {originalMessage.title}
                            </div>
                            <div className="text-muted-foreground whitespace-pre-wrap line-clamp-6">
                                {originalMessage.preview}
                            </div>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t">
                    <Button variant="outline" onClick={handleClose} disabled={sending}>
                        Avbryt
                    </Button>
                    <Button onClick={handleSend} disabled={sending || !body.trim()}>
                        {sending ? (
                            <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Skickar...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Skicka
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
