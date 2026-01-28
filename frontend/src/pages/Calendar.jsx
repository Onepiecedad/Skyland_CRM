import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Wrench, Clock, MapPin, User, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay, isToday, addDays, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { formatCustomerName } from '../lib/formatName';

export const Calendar_ = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState(null);

    // Fetch jobs for the current month view (with some padding)
    useEffect(() => {
        const fetchJobs = async () => {
            setLoading(true);
            const monthStart = startOfMonth(currentMonth);
            const monthEnd = endOfMonth(currentMonth);

            // Get jobs for the entire visible calendar (including days from prev/next month)
            const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    *,
                    customers!jobs_customer_id_fkey (
                        id,
                        name,
                        email,
                        phone,
                        address
                    )
                `)
                .gte('scheduled_date', format(calendarStart, 'yyyy-MM-dd'))
                .lte('scheduled_date', format(calendarEnd, 'yyyy-MM-dd'))
                .order('scheduled_date', { ascending: true });

            if (!error) {
                setJobs(data || []);
            }
            setLoading(false);
        };

        fetchJobs();
    }, [currentMonth]);

    // Group jobs by date
    const jobsByDate = useMemo(() => {
        const grouped = {};
        jobs.forEach(job => {
            if (job.scheduled_date) {
                const dateKey = job.scheduled_date.split('T')[0];
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(job);
            }
        });
        return grouped;
    }, [jobs]);

    // Get jobs for selected date
    const selectedDateJobs = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return jobsByDate[dateKey] || [];
    }, [selectedDate, jobsByDate]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = calendarStart;

        while (day <= calendarEnd) {
            days.push(day);
            day = addDays(day, 1);
        }

        return days;
    }, [currentMonth]);

    const navigateMonth = (direction) => {
        setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
    };

    const getJobTypeColor = (type) => {
        const colors = {
            'service': 'bg-blue-500',
            'repair': 'bg-orange-500',
            'installation': 'bg-green-500',
            'inspection': 'bg-purple-500',
            'maintenance': 'bg-teal-500',
        };
        return colors[type?.toLowerCase()] || 'bg-primary';
    };

    const getStatusBadge = (status) => {
        const variants = {
            'pending': { variant: 'outline', label: 'Väntande' },
            'scheduled': { variant: 'default', label: 'Schemalagd' },
            'in_progress': { variant: 'secondary', label: 'Pågår' },
            'completed': { variant: 'success', label: 'Klar' },
            'cancelled': { variant: 'destructive', label: 'Avbokad' },
        };
        const config = variants[status] || { variant: 'outline', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col pb-24 md:pb-0">
            <Header />

            <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Month Navigation - Apple Style */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateMonth('prev')}
                        className="h-10 w-10"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <div className="text-center">
                        <h1 className="text-xl font-semibold capitalize">
                            {format(currentMonth, 'MMMM yyyy', { locale: sv })}
                        </h1>
                        <button
                            onClick={() => setCurrentMonth(new Date())}
                            className="text-sm text-primary hover:underline"
                        >
                            Idag
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateMonth('next')}
                        className="h-10 w-10"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
                    {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
                        <div key={day} className="py-2">{day}</div>
                    ))}
                </div>

                {/* Calendar Grid - Apple Style */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayJobs = jobsByDate[dateKey] || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = isSameDay(day, selectedDate);
                        const dayIsToday = isToday(day);

                        return (
                            <button
                                key={index}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative aspect-square flex flex-col items-center justify-start p-1 rounded-xl transition-all
                                    ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'}
                                    ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                                    ${dayIsToday && !isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                                `}
                            >
                                <span className={`text-sm font-medium ${dayIsToday && !isSelected ? 'text-primary' : ''}`}>
                                    {format(day, 'd')}
                                </span>

                                {/* Job indicators */}
                                {dayJobs.length > 0 && (
                                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                                        {dayJobs.slice(0, 3).map((job, i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-primary-foreground' : getJobTypeColor(job.type)}`}
                                            />
                                        ))}
                                        {dayJobs.length > 3 && (
                                            <span className={`text-[10px] ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                                +{dayJobs.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Date Header */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <h2 className="text-lg font-semibold capitalize">
                        {format(selectedDate, 'EEEE d MMMM', { locale: sv })}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                        {selectedDateJobs.length} jobb
                    </Badge>
                </div>

                {/* Jobs List for Selected Date */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : selectedDateJobs.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                                <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">Inga jobb schemalagda</p>
                                <Button variant="outline" size="sm" className="mt-4" asChild>
                                    <Link to="/jobb">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Boka nytt jobb
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        selectedDateJobs.map(job => (
                            <Card
                                key={job.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => setSelectedJob(job)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Color indicator */}
                                        <div className={`w-1 h-full min-h-[60px] rounded-full ${getJobTypeColor(job.type)}`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h3 className="font-medium truncate">
                                                    {job.title || job.description?.substring(0, 50) || 'Jobb'}
                                                </h3>
                                                {getStatusBadge(job.status)}
                                            </div>

                                            {job.customers && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    <span className="truncate">
                                                        {formatCustomerName(job.customers.name, job.customers.email)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {job.scheduled_time && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>{job.scheduled_time}</span>
                                                    </div>
                                                )}
                                                {job.type && (
                                                    <div className="flex items-center gap-1">
                                                        <Wrench className="h-3 w-3" />
                                                        <span className="capitalize">{job.type}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </main>

            {/* Job Detail Modal */}
            <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedJob?.title || 'Jobbdetaljer'}</DialogTitle>
                        <DialogDescription>
                            {selectedJob?.scheduled_date && format(parseISO(selectedJob.scheduled_date), 'EEEE d MMMM yyyy', { locale: sv })}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedJob && (
                        <div className="space-y-4 pt-4">
                            {/* Status */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                {getStatusBadge(selectedJob.status)}
                            </div>

                            {/* Description */}
                            {selectedJob.description && (
                                <div className="space-y-1">
                                    <span className="text-sm text-muted-foreground">Beskrivning</span>
                                    <p className="text-sm">{selectedJob.description}</p>
                                </div>
                            )}

                            {/* Customer */}
                            {selectedJob.customers && (
                                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm font-medium">Kund</span>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span>{formatCustomerName(selectedJob.customers.name, selectedJob.customers.email)}</span>
                                        </div>
                                        {selectedJob.customers.phone && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground">📞</span>
                                                <a href={`tel:${selectedJob.customers.phone}`} className="text-primary hover:underline">
                                                    {selectedJob.customers.phone}
                                                </a>
                                            </div>
                                        )}
                                        {selectedJob.customers.address && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span>{selectedJob.customers.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Time & Type */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {selectedJob.scheduled_time && (
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">Tid</span>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            <span>{selectedJob.scheduled_time}</span>
                                        </div>
                                    </div>
                                )}
                                {selectedJob.type && (
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">Typ</span>
                                        <div className="flex items-center gap-1">
                                            <Wrench className="h-4 w-4" />
                                            <span className="capitalize">{selectedJob.type}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-4 border-t">
                                <Button asChild className="w-full h-12 text-base">
                                    <Link to={`/jobb/${selectedJob.id}`}>
                                        Visa fullständigt jobb
                                    </Link>
                                </Button>
                                {selectedJob.customers && (
                                    <Button variant="outline" asChild className="w-full h-12 text-base">
                                        <Link to={`/kund/${selectedJob.customer_id}`}>
                                            <User className="h-5 w-5 mr-2" />
                                            Visa kund
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Calendar_;
