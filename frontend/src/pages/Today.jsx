import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AlertCircle, RefreshCw, Mail, ArrowRight } from 'lucide-react';

export const Today = () => {
    const [leads, setLeads] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({ leadsCount: 0, customersCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Leads (Att svara på)
            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('*')
                .neq('ai_category', 'SPAM')
                .order('created_at', { ascending: false })
                .limit(10);

            if (leadsError) throw leadsError;
            setLeads(leadsData || []);

            // 2. Fetch Upcoming Jobs (next 7 days)
            const today = startOfDay(new Date());
            const nextWeek = endOfDay(addDays(today, 7));

            const { data: jobsData, error: jobsError } = await supabase
                .from('jobs')
                .select('*')
                .in('status', ['pending', 'scheduled'])
                .gte('scheduled_date', format(today, 'yyyy-MM-dd'))
                .lte('scheduled_date', format(nextWeek, 'yyyy-MM-dd'))
                .order('scheduled_date', { ascending: true });

            if (jobsError) throw jobsError;
            setJobs(jobsData || []);

            // 3. Fetch 5 latest messages
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select(`
                    id,
                    subject,
                    from_email,
                    from_name,
                    direction,
                    received_at,
                    body_preview,
                    customer_id,
                    customers (
                        id,
                        name
                    )
                `)
                .order('received_at', { ascending: false })
                .limit(5);

            if (messagesError) throw messagesError;
            setMessages(messagesData || []);

            // 4. Stats
            const { count: leadsCount, error: leadsCountError } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .neq('ai_category', 'SPAM');

            if (leadsCountError) throw leadsCountError;

            const { count: customersCount, error: customersCountError } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true });

            if (customersCountError) throw customersCountError;

            setStats({
                leadsCount: leadsCount || 0,
                customersCount: customersCount || 0
            });
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Kunde inte ladda data. Försök igen.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <AlertCircle className="h-10 w-10 text-destructive" />
                            <p className="text-muted-foreground">{error}</p>
                            <button
                                onClick={fetchDashboardData}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Försök igen
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
                {/* Snabbstatistik */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Aktiva ärenden</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.leadsCount}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Antal kunder</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.customersCount}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Att svara på */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Att svara på</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {leads.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">Inget att göra idag 🎉</p>
                            ) : (
                                leads.map((lead) => {
                                    const InnerContent = () => (
                                        <>
                                            <div className="space-y-1">
                                                <div className="font-medium decoration-primary group-hover:underline">
                                                    {lead.name || 'Okänd'}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {lead.ai_summary || lead.subject || 'Inget ämne'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs text-muted-foreground">
                                                    {lead.created_at ? format(new Date(lead.created_at), 'd MMM', { locale: sv }) : ''}
                                                </span>
                                                {lead.ai_category && <Badge variant="secondary" className="text-xs">{lead.ai_category}</Badge>}
                                            </div>
                                        </>
                                    );

                                    return lead.customer_id ? (
                                        <Link
                                            key={lead.id}
                                            to={`/kund/${lead.customer_id}`}
                                            className="group flex justify-between items-start border-b last:border-0 pb-3 last:pb-0 pt-2 hover:bg-muted/50 transition-colors -mx-4 px-4"
                                        >
                                            <InnerContent />
                                        </Link>
                                    ) : (
                                        <div key={lead.id} className="flex justify-between items-start border-b last:border-0 pb-3 last:pb-0 pt-2 -mx-4 px-4">
                                            <InnerContent />
                                        </div>
                                    );
                                })
                            )}
                            {leads.length >= 10 && (
                                <p className="text-sm text-center text-muted-foreground pt-2">Visa alla (kommer snart)</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Kommande jobb */}
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Kommande jobb (7 dagar)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {jobs.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">Inga bokade jobb</p>
                            ) : (
                                jobs.map((job) => (
                                    <div key={job.id} className="flex justify-between items-start border-b last:border-0 pb-3 last:pb-0">
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {job.customer_id ? (
                                                    <Link to={`/kund/${job.customer_id}`} className="hover:underline">
                                                        {job.title || 'Utan titel'}
                                                    </Link>
                                                ) : (
                                                    job.title || 'Utan titel'
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate w-64">
                                                {job.description || ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">
                                                {job.scheduled_date ? format(new Date(job.scheduled_date), 'd MMM', { locale: sv }) : ''}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {job.scheduled_time || ''}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Senaste meddelanden */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Senaste meddelanden</CardTitle>
                        <Link
                            to="/meddelanden"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                            Visa alla
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {messages.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">Inga meddelanden</p>
                        ) : (
                            messages.map((message) => {
                                let formattedDate = '';
                                if (message.received_at) {
                                    try {
                                        formattedDate = format(new Date(message.received_at), 'd MMM HH:mm', { locale: sv });
                                    } catch (e) { }
                                }

                                const content = (
                                    <>
                                        <Mail className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate group-hover:text-primary transition-colors">
                                                    {message.subject || 'Inget ämne'}
                                                </span>
                                                {message.direction === 'outbound' && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                                                        Skickat
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>{message.from_name || message.from_email || 'Okänd'}</span>
                                                {message.customers && (
                                                    <>
                                                        <span>→</span>
                                                        <span className="text-primary">
                                                            {message.customers.name}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {formattedDate}
                                        </span>
                                    </>
                                );

                                return message.customer_id ? (
                                    <Link
                                        key={message.id}
                                        to={`/kund/${message.customer_id}`}
                                        className="group flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0 hover:bg-muted/50 -mx-4 px-4 py-2 transition-colors"
                                    >
                                        {content}
                                    </Link>
                                ) : (
                                    <div
                                        key={message.id}
                                        className="flex items-start gap-3 border-b last:border-0 pb-3 last:pb-0"
                                    >
                                        {content}
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};
