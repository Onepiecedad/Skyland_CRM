import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';

export const Today = () => {
    const [leads, setLeads] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [stats, setStats] = useState({ leadsCount: 0, customersCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Leads (Att svara på)
                const { data: leadsData } = await supabase
                    .from('leads')
                    .select('*')
                    .neq('ai_category', 'SPAM')
                    .order('created_at', { ascending: false })
                    .limit(10);

                setLeads(leadsData || []);

                // 2. Fetch Upcoming Jobs (next 7 days)
                const today = startOfDay(new Date());
                const nextWeek = endOfDay(addDays(today, 7));

                const { data: jobsData } = await supabase
                    .from('jobs')
                    .select('*')
                    .in('status', ['pending', 'scheduled'])
                    .gte('scheduled_date', format(today, 'yyyy-MM-dd'))
                    .lte('scheduled_date', format(nextWeek, 'yyyy-MM-dd'))
                    .order('scheduled_date', { ascending: true });

                setJobs(jobsData || []);

                // 3. Stats
                const { count: leadsCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .neq('ai_category', 'SPAM');

                const { count: customersCount } = await supabase
                    .from('customers')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    leadsCount: leadsCount || 0,
                    customersCount: customersCount || 0
                });

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <div className="p-8">Laddar...</div>
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
                            <CardTitle className="text-sm font-medium text-muted-foreground">Antal Kunder</CardTitle>
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
                                <p className="text-muted-foreground">Inget att göra idag 🎉</p>
                            ) : (
                                leads.map((lead) => {
                                    const InnerContent = () => (
                                        <>
                                            <div className="space-y-1">
                                                <div className="font-medium decoration-primary group-hover:underline">
                                                    {lead.name}
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
                                <p className="text-muted-foreground">Inga bokade jobb</p>
                            ) : (
                                jobs.map((job) => (
                                    <div key={job.id} className="flex justify-between items-start border-b last:border-0 pb-3 last:pb-0">
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {job.customer_id ? (
                                                    <Link to={`/kund/${job.customer_id}`} className="hover:underline">
                                                        {job.title}
                                                    </Link>
                                                ) : (
                                                    job.title
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate w-64">
                                                {job.description}
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
            </main>
        </div>
    );
};
