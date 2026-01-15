import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Mail, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Timeline component that fetches and displays both emails (from messages)
 * and form submissions (from inbox via leads) for a customer.
 * 
 * Props:
 *   customerId: UUID of the customer to show timeline for
 */
export const Timeline = ({ customerId }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!customerId) {
            setItems([]);
            setLoading(false);
            return;
        }

        const fetchTimeline = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Fetch emails from messages table
                // Using select('*') because column names may vary between schema versions
                const { data: emailsData, error: emailsError } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('customer_id', customerId)
                    .eq('channel', 'email')
                    .order('created_at', { ascending: false });

                if (emailsError) throw emailsError;

                // 2. Fetch leads for this customer
                const { data: leadsData, error: leadsError } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('customer_id', customerId);

                if (leadsError) throw leadsError;

                const leadIds = leadsData?.map(l => l.id) || [];

                // 3. Fetch form submissions from inbox (linked via leads)
                let formsData = [];
                if (leadIds.length > 0) {
                    const { data: inboxData, error: inboxError } = await supabase
                        .from('inbox')
                        .select('id, name, email, message, created_at, lead_id')
                        .in('lead_id', leadIds)
                        .neq('status', 'spam')
                        .order('created_at', { ascending: false });

                    if (inboxError) throw inboxError;
                    formsData = inboxData || [];
                }

                // 4. Transform to unified shape
                // Handle varying column names for email content: content, body_preview, or body
                const emailItems = (emailsData || []).map(email => {
                    const emailContent = email.content || email.body_preview || email.body || '';
                    const fromLabel = email.from_name || email.from_address || email.from_email || 'Okänd avsändare';

                    return {
                        id: email.id,
                        type: 'email',
                        title: email.subject || 'Inget ämne',
                        from_label: fromLabel,
                        preview: emailContent
                            ? (emailContent.length > 160 ? emailContent.substring(0, 160) + '...' : emailContent)
                            : '',
                        ts: email.received_at || email.created_at || null,
                        direction: email.direction,
                    };
                });

                const formItems = (formsData || []).map(form => ({
                    id: form.id,
                    type: 'form',
                    title: 'Formulär',
                    from_label: form.name || form.email || 'Okänd avsändare',
                    preview: form.message
                        ? (form.message.length > 160 ? form.message.substring(0, 160) + '...' : form.message)
                        : '',
                    ts: form.created_at || null,
                }));

                // 5. Merge and sort by timestamp (newest first)
                const merged = [...emailItems, ...formItems];
                merged.sort((a, b) => {
                    const tsA = a.ts ? new Date(a.ts).getTime() : 0;
                    const tsB = b.ts ? new Date(b.ts).getTime() : 0;
                    return tsB - tsA;
                });

                // 6. Deduplicate by id (just in case)
                const seen = new Set();
                const deduped = merged.filter(item => {
                    if (seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                });

                setItems(deduped);

            } catch (err) {
                console.error('Error fetching timeline:', err);
                setError('Kunde inte ladda tidslinjen.');
            } finally {
                setLoading(false);
            }
        };

        fetchTimeline();
    }, [customerId]);

    // Loading state
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tidslinje</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tidslinje</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive text-center py-4">{error}</p>
                </CardContent>
            </Card>
        );
    }

    // Empty state
    if (!items || items.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tidslinje</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">Ingen kommunikation ännu</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tidslinje</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 border-l-2 border-muted pl-6 relative">
                    {items.map((item) => {
                        const isEmail = item.type === 'email';
                        const Icon = isEmail ? Mail : FileText;
                        const sourceLabel = isEmail ? 'Mejl' : 'Formulär';

                        // Format timestamp with edge case handling
                        let formattedDate = 'Okänt datum';
                        if (item.ts) {
                            try {
                                formattedDate = format(new Date(item.ts), 'd MMM yyyy HH:mm', { locale: sv });
                            } catch (e) {
                                console.warn('Invalid timestamp:', item.ts);
                            }
                        }

                        return (
                            <div key={item.id} className="relative">
                                <span className="absolute -left-[31px] top-1 bg-background border-2 border-primary rounded-full w-4 h-4" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-muted-foreground">
                                        {formattedDate}
                                    </span>
                                    <div className="font-semibold flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span>{sourceLabel}</span>
                                        {isEmail && item.direction === 'outbound' && (
                                            <span className="text-xs text-muted-foreground">(skickat)</span>
                                        )}
                                    </div>
                                    {item.title && item.type === 'email' && (
                                        <div className="text-sm font-medium text-foreground">
                                            {item.title}
                                        </div>
                                    )}
                                    <div className="text-sm text-foreground">
                                        {item.from_label}
                                    </div>
                                    {item.preview && (
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                            {item.preview}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
