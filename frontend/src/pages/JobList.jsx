import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { jobsAPI } from '../lib/api';
import { formatCustomerName } from '../lib/formatName';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    AlertCircle,
    RefreshCw,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronRight,
    Plus,
    Calendar,
    Wrench,
    User
} from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Väntande',
    scheduled: 'Inbokad',
    in_progress: 'Pågående',
    waiting_parts: 'Väntar reservdelar',
    completed: 'Klar',
    invoiced: 'Fakturerad',
    cancelled: 'Avbruten'
};

const STATUS_COLORS = {
    pending: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    invoiced: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
};

const JOB_TYPE_LABELS = {
    service: 'Service',
    repair: 'Reparation',
    installation: 'Installation',
    inspection: 'Besiktning',
    winterization: 'Förvintring',
    launch: 'Sjösättning'
};

export const JobList = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('scheduled_date');
    const [sortDirection, setSortDirection] = useState('asc');
    const [statusFilter, setStatusFilter] = useState('all');
    const [jobTypeFilter, setJobTypeFilter] = useState('all');

    const fetchJobs = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await jobsAPI.getAll();
            setJobs(response.data || []);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Kunde inte ladda jobb. Försök igen.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    // Filter and sort
    const filteredAndSorted = useMemo(() => {
        let result = [...jobs];

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(j => j.status === statusFilter);
        }

        // Filter by job type
        if (jobTypeFilter !== 'all') {
            result = result.filter(j => j.job_type === jobTypeFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(j =>
                (j.title || '').toLowerCase().includes(query) ||
                (j.customer?.name || '').toLowerCase().includes(query) ||
                (j.boat?.make || '').toLowerCase().includes(query) ||
                (j.boat?.model || '').toLowerCase().includes(query)
            );
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            // Special handling for nested fields
            if (sortField === 'customer') {
                aVal = a.customer?.name || '';
                bVal = b.customer?.name || '';
            }

            // Handle nulls
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Special handling for dates
            if (sortField === 'scheduled_date' || sortField === 'created_at') {
                aVal = new Date(aVal || 0).getTime();
                bVal = new Date(bVal || 0).getTime();
            }

            // Compare
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [jobs, searchQuery, sortField, sortDirection, statusFilter, jobTypeFilter]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
        return sortDirection === 'asc' ?
            <ArrowUp className="h-4 w-4 ml-1" /> :
            <ArrowDown className="h-4 w-4 ml-1" />;
    };

    const stats = useMemo(() => {
        const activeJobs = jobs.filter(j => ['pending', 'scheduled', 'in_progress', 'waiting_parts'].includes(j.status));
        const scheduledToday = jobs.filter(j => {
            if (!j.scheduled_date) return false;
            const today = format(new Date(), 'yyyy-MM-dd');
            return j.scheduled_date === today;
        });

        return {
            total: jobs.length,
            active: activeJobs.length,
            today: scheduledToday.length
        };
    }, [jobs]);

    if (loading) {
        return (
            <div className="flex-1 p-4 sm:p-6 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 p-4 sm:p-6">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 sm:p-6 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-900">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchJobs}>
                            Försök igen
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Jobb</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {stats.active} aktiva jobb • {stats.today} inbokade idag
                    </p>
                </div>
                <Button asChild>
                    <Link to="/jobb/nytt">
                        <Plus className="h-4 w-4 mr-2" />
                        Nytt jobb
                    </Link>
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Sök på titel, kund eller båt..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Status filter */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={statusFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                        >
                            Alla ({jobs.length})
                        </Button>
                        <Button
                            variant={statusFilter === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('pending')}
                        >
                            Väntande
                        </Button>
                        <Button
                            variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('scheduled')}
                        >
                            Inbokade
                        </Button>
                        <Button
                            variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('in_progress')}
                        >
                            Pågående
                        </Button>
                        <Button
                            variant={statusFilter === 'completed' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('completed')}
                        >
                            Klara
                        </Button>
                    </div>

                    {/* Job Type filter */}
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground flex items-center mr-2">Typ:</span>
                        <Button
                            variant={jobTypeFilter === 'all' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setJobTypeFilter('all')}
                        >
                            Alla
                        </Button>
                        {Object.entries(JOB_TYPE_LABELS).map(([key, label]) => (
                            <Button
                                key={key}
                                variant={jobTypeFilter === key ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setJobTypeFilter(key)}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Desktop Jobs Table */}
            <Card className="hidden md:block">
                <CardContent className="p-0">
                    {filteredAndSorted.length === 0 ? (
                        <div className="p-8 text-center">
                            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {searchQuery || statusFilter !== 'all' ? 'Inga jobb matchade sökningen' : 'Inga jobb än'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px]">
                                            <button
                                                onClick={() => handleSort('title')}
                                                className="flex items-center hover:text-foreground font-semibold"
                                            >
                                                Titel
                                                {getSortIcon('title')}
                                            </button>
                                        </TableHead>
                                        <TableHead>
                                            <button
                                                onClick={() => handleSort('customer')}
                                                className="flex items-center hover:text-foreground font-semibold"
                                            >
                                                Kund
                                                {getSortIcon('customer')}
                                            </button>
                                        </TableHead>
                                        <TableHead>Båt</TableHead>
                                        <TableHead>Typ</TableHead>
                                        <TableHead>
                                            <button
                                                onClick={() => handleSort('status')}
                                                className="flex items-center hover:text-foreground font-semibold"
                                            >
                                                Status
                                                {getSortIcon('status')}
                                            </button>
                                        </TableHead>
                                        <TableHead>
                                            <button
                                                onClick={() => handleSort('scheduled_date')}
                                                className="flex items-center hover:text-foreground font-semibold"
                                            >
                                                Inbokad
                                                {getSortIcon('scheduled_date')}
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSorted.map((job) => (
                                        <TableRow
                                            key={job.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => window.location.href = `/jobb/${job.id}`}
                                        >
                                            <TableCell className="font-medium">
                                                {job.title}
                                            </TableCell>
                                            <TableCell>
                                                {job.customer ? (
                                                    <Link
                                                        to={`/kund/${job.customer.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {formatCustomerName(job.customer.name)}
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {job.boat ? (
                                                    <span className="text-sm">
                                                        {job.boat.make} {job.boat.model}
                                                        {job.boat.year && ` (${job.boat.year})`}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {job.job_type ? (
                                                    <span className="text-sm">
                                                        {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'}>
                                                    {STATUS_LABELS[job.status] || job.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {job.scheduled_date ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(job.scheduled_date), 'dd MMM', { locale: sv })}
                                                        {job.scheduled_time && (
                                                            <span className="text-muted-foreground ml-1">
                                                                {job.scheduled_time}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Mobile Jobs Cards */}
            <div className="md:hidden space-y-3">
                {filteredAndSorted.length === 0 ? (
                    <Card>
                        <CardContent className="py-8">
                            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-center text-muted-foreground">
                                {searchQuery || statusFilter !== 'all' ? 'Inga jobb matchade sökningen' : 'Inga jobb än'}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    filteredAndSorted.map((job) => (
                        <Link key={job.id} to={`/jobb/${job.id}`}>
                            <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-base mb-2">
                                                {job.title}
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className={STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'}>
                                                    {STATUS_LABELS[job.status] || job.status}
                                                </Badge>
                                                {job.job_type && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {JOB_TYPE_LABELS[job.job_type] || job.job_type}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="space-y-1.5 text-sm">
                                                {job.customer && (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <User className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">{formatCustomerName(job.customer.name)}</span>
                                                    </div>
                                                )}
                                                {job.boat && (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Wrench className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">
                                                            {job.boat.make} {job.boat.model}
                                                            {job.boat.year && ` (${job.boat.year})`}
                                                        </span>
                                                    </div>
                                                )}
                                                {job.scheduled_date && (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                        <span>
                                                            {format(new Date(job.scheduled_date), 'dd MMM', { locale: sv })}
                                                            {job.scheduled_time && ` kl ${job.scheduled_time}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};
