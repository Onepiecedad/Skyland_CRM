import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCustomerName } from '../lib/formatName';
import { Header } from '../components/Header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AlertCircle, RefreshCw, Mail, ArrowRight, Users, FileText, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export const Today = () => {
    const [leads, setLeads] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [messages, setMessages] = useState([]);
    const [stats, setStats] = useState({ leadsCount: 0, customersCount: 0, jobsCount: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
    const [isMessagesExpanded, setIsMessagesExpanded] = useState(false);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Leads (Att svara på) - include null ai_category (new leads) and exclude SPAM
            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('*')
                .or('ai_category.is.null,ai_category.neq.SPAM')
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
                .or('ai_category.is.null,ai_category.neq.SPAM');

            if (leadsCountError) throw leadsCountError;

            const { count: customersCount, error: customersCountError } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true });

            if (customersCountError) throw customersCountError;

            const { count: jobsCount, error: jobsCountError } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true });

            if (jobsCountError) throw jobsCountError;

            setStats({
                leadsCount: leadsCount || 0,
                customersCount: customersCount || 0,
                jobsCount: jobsCount || 0
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
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
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
            <main className="flex-1 container mx-auto px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
                {/* Snabbstatistik */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <Link to="/jobb">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200/50 hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-3 sm:p-6">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Jobb</p>
                                        <p className="text-xl sm:text-3xl font-bold">{stats.jobsCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/kunder">
                        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200/50 hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-3 sm:p-6">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Kunder</p>
                                        <p className="text-xl sm:text-3xl font-bold">{stats.customersCount}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                    {/* Att svara på */}
                    <Card className="h-full">
                        <CardHeader className="pb-2 sm:pb-4">
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                                Att svara på
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 sm:space-y-4">
                            {leads.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4 text-sm">Inget att göra idag 🎉</p>
                            ) : (
                                leads.map((lead) => {
                                    const InnerContent = () => (
                                        <div className="flex items-start justify-between gap-2 w-full">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm sm:text-base truncate">
                                                    {formatCustomerName(lead.name, lead.email)}
                                                </div>
                                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                                    {lead.ai_summary || lead.subject || 'Inget ämne'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-xs text-muted-foreground">
                                                    {lead.created_at ? format(new Date(lead.created_at), 'd MMM', { locale: sv }) : ''}
                                                </span>
                                                {lead.ai_category && <Badge variant="secondary" className="text-xs">{lead.ai_category}</Badge>}
                                            </div>
                                        </div>
                                    );

                                    return lead.customer_id ? (
                                        <Link
                                            key={lead.id}
                                            to={`/kund/${lead.customer_id}`}
                                            className="group flex items-start border-b last:border-0 pb-2 sm:pb-3 last:pb-0 pt-1 sm:pt-2 hover:bg-muted/50 transition-colors -mx-3 sm:-mx-4 px-3 sm:px-4 rounded-lg"
                                        >
                                            <InnerContent />
                                        </Link>
                                    ) : (
                                        <div key={lead.id} className="flex items-start border-b last:border-0 pb-2 sm:pb-3 last:pb-0 pt-1 sm:pt-2 -mx-3 sm:-mx-4 px-3 sm:px-4">
                                            <InnerContent />
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* Kommande jobb - Kalendervy */}
                    <Card className="h-full">
                        <CardHeader
                            className="pb-2 sm:pb-4 md:cursor-default cursor-pointer hover:bg-muted/50 md:hover:bg-transparent transition-colors"
                            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                        >
                            <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                                    <span>Kommande 7 dagar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-normal text-muted-foreground md:hidden">
                                        {jobs.filter(j => j.scheduled_date).length} jobb
                                    </span>
                                    {isCalendarExpanded ? (
                                        <ChevronUp className="h-4 w-4 md:hidden" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 md:hidden" />
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className={`space-y-3 ${isCalendarExpanded ? 'block' : 'hidden'} md:block`}>
                            {(() => {
                                const today = new Date();
                                const days = [];

                                // Create 7 days
                                for (let i = 0; i < 7; i++) {
                                    const date = addDays(today, i);
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const dayJobs = jobs.filter(j => j.scheduled_date === dateStr);

                                    days.push({
                                        date,
                                        dateStr,
                                        jobs: dayJobs,
                                        isToday: i === 0
                                    });
                                }

                                return days.map((day) => {
                                    const hasJobs = day.jobs.length > 0;

                                    return (
                                        <div
                                            key={day.dateStr}
                                            className={`border rounded-lg p-3 ${day.isToday ? 'bg-blue-50 border-blue-200' : 'bg-muted/30'} ${hasJobs ? '' : 'opacity-60'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">
                                                        {format(day.date, 'EEEE', { locale: sv })}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(day.date, 'd MMM', { locale: sv })}
                                                    </span>
                                                    {day.isToday && (
                                                        <Badge variant="default" className="text-xs py-0">Idag</Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {day.jobs.length} jobb
                                                </span>
                                            </div>

                                            {hasJobs ? (
                                                <div className="space-y-2">
                                                    {day.jobs.map((job) => (
                                                        <Link
                                                            key={job.id}
                                                            to={`/jobb/${job.id}`}
                                                            className="block p-2 bg-white rounded hover:bg-blue-50 transition-colors border"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-medium text-sm truncate">
                                                                        {job.title || 'Utan titel'}
                                                                    </div>
                                                                    {job.customer_id && (
                                                                        <div className="text-xs text-muted-foreground truncate">
                                                                            Kund #{job.customer_id.substring(0, 8)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground shrink-0">
                                                                    {job.scheduled_time || ''}
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground text-center py-1">Inga jobb</p>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
                        </CardContent>
                    </Card>
                </div>

                {/* Senaste meddelanden */}
                <Card>
                    <CardHeader
                        className="flex flex-row items-center justify-between pb-2 sm:pb-4 md:cursor-default cursor-pointer"
                        onClick={() => setIsMessagesExpanded(!isMessagesExpanded)}
                    >
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                            <div className="flex items-center gap-2">
                                <span>Senaste meddelanden</span>
                                {!isMessagesExpanded && messages.length > 0 && (
                                    <span className="md:hidden text-xs text-muted-foreground font-normal">
                                        ({messages.length})
                                    </span>
                                )}
                            </div>
                            <div className="md:hidden">
                                {isMessagesExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </div>
                        </CardTitle>
                        <Link
                            to="/meddelanden"
                            className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Visa alla
                            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Link>
                    </CardHeader>
                    <CardContent className={`space-y-2 sm:space-y-3 ${isMessagesExpanded ? 'block' : 'hidden'} md:block`}>
                        {messages.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4 text-sm">Inga meddelanden</p>
                        ) : (
                            messages.map((message) => {
                                let formattedDate = '';
                                if (message.received_at) {
                                    try {
                                        formattedDate = format(new Date(message.received_at), 'd MMM HH:mm', { locale: sv });
                                    } catch (e) { }
                                }

                                const hasCustomer = !!message.customer_id;

                                return hasCustomer ? (
                                    <Link
                                        key={message.id}
                                        to={`/kund/${message.customer_id}`}
                                        className="group flex items-start gap-2 sm:gap-3 border-b last:border-0 pb-2 sm:pb-3 last:pb-0 hover:bg-accent -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 transition-colors cursor-pointer rounded-md"
                                    >
                                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                                                    {message.subject || 'Inget ämne'}
                                                </span>
                                                {message.direction === 'outbound' && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                                                        Skickat
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                                                <span className="truncate">{message.from_name || message.from_email || 'Okänd'}</span>
                                                {message.customers && (
                                                    <>
                                                        <span>→</span>
                                                        <span className="text-primary group-hover:underline truncate">
                                                            {formatCustomerName(message.customers.name, message.customers.email)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                                            {formattedDate}
                                        </span>
                                    </Link>
                                ) : (
                                    <div
                                        key={message.id}
                                        className="flex items-start gap-2 sm:gap-3 border-b last:border-0 pb-2 sm:pb-3 last:pb-0 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 opacity-60"
                                        title="Ingen kundkoppling"
                                    >
                                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm sm:text-base truncate">
                                                    {message.subject || 'Inget ämne'}
                                                </span>
                                                {message.direction === 'outbound' && (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                                                        Skickat
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                                                <span className="truncate">{message.from_name || message.from_email || 'Okänd'}</span>
                                                <span className="text-xs italic">(ingen kund)</span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                                            {formattedDate}
                                        </span>
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
