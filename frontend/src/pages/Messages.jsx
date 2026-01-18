import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { formatCustomerName } from '../lib/formatName';
import { Header } from '../components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Mail,
    ArrowUpDown,
    User,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ArrowRight
} from 'lucide-react';


export const Messages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState('received_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [expandedIds, setExpandedIds] = useState(new Set());

    useEffect(() => {
        fetchMessages();
    }, [sortField, sortDirection]);

    const fetchMessages = async () => {
        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('messages')
                .select(`
                    id,
                    subject,
                    from_email,
                    from_name,
                    to_email,
                    body_preview,
                    body_full,
                    direction,
                    received_at,
                    customer_id,
                    customers (
                        id,
                        name,
                        email
                    )
                `)
                .order(sortField, { ascending: sortDirection === 'asc' })
                .limit(100);

            if (fetchError) throw fetchError;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError('Kunde inte ladda meddelanden');
        } finally {
            setLoading(false);
        }
    };

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const SortButton = ({ field, label, shortLabel }) => (
        <Button
            variant={sortField === field ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort(field)}
            className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3"
        >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel || label}</span>
            {sortField === field && (
                sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
            )}
        </Button>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-4 sm:py-6">
                <div className="flex flex-col gap-4 sm:gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl sm:text-2xl font-bold">Meddelanden</h1>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                            {messages.length} st
                        </div>
                    </div>

                    {/* Sorting controls */}
                    <Card>
                        <CardContent className="py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1 -mb-1">
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                                    <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="hidden sm:inline">Sortera:</span>
                                </span>
                                <div className="flex gap-1 sm:gap-2">
                                    <SortButton field="received_at" label="Datum" shortLabel="Datum" />
                                    <SortButton field="subject" label="Ämne" shortLabel="Ämne" />
                                    <SortButton field="from_email" label="Avsändare" shortLabel="Från" />
                                    <SortButton field="direction" label="Riktning" shortLabel="Typ" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Messages list */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <Card>
                            <CardContent className="py-8">
                                <p className="text-destructive text-center">{error}</p>
                            </CardContent>
                        </Card>
                    ) : messages.length === 0 ? (
                        <Card>
                            <CardContent className="py-8">
                                <p className="text-muted-foreground text-center">Inga meddelanden</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {messages.map((message) => {
                                const isExpanded = expandedIds.has(message.id);
                                const hasMore = message.body_full && message.body_full.length > 200;
                                const displayContent = isExpanded
                                    ? message.body_full
                                    : (message.body_preview || message.body_full || '').substring(0, 200);

                                let formattedDate = 'Okänt datum';
                                let shortDate = '';
                                if (message.received_at) {
                                    try {
                                        formattedDate = format(
                                            new Date(message.received_at),
                                            'd MMM yyyy HH:mm',
                                            { locale: sv }
                                        );
                                        shortDate = format(
                                            new Date(message.received_at),
                                            'd MMM HH:mm',
                                            { locale: sv }
                                        );
                                    } catch (e) { }
                                }

                                return (
                                    <Card key={message.id} className="hover:shadow-md transition-shadow">
                                        <CardContent className="p-3 sm:py-4 sm:px-5">
                                            <div className="flex flex-col gap-2">
                                                {/* Header row */}
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                                                        <span className="font-medium text-sm sm:text-base truncate">
                                                            {message.subject || 'Inget ämne'}
                                                        </span>
                                                        {message.direction === 'outbound' && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                                                                Skickat
                                                            </span>
                                                        )}
                                                        {message.direction === 'inbound' && (
                                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded shrink-0">
                                                                In
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground shrink-0">
                                                        <span className="hidden sm:inline">{formattedDate}</span>
                                                        <span className="sm:hidden">{shortDate}</span>
                                                    </span>
                                                </div>

                                                {/* From/To info */}
                                                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <User className="h-3 w-3" />
                                                        <span className="truncate max-w-[150px] sm:max-w-none">
                                                            {message.from_name || message.from_email || 'Okänd'}
                                                        </span>
                                                    </div>
                                                    {message.customers && (
                                                        <Link
                                                            to={`/kund/${message.customers.id}`}
                                                            className="text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <ArrowRight className="h-3 w-3" />
                                                            <span className="truncate max-w-[150px] sm:max-w-none">
                                                                {formatCustomerName(message.customers.name, message.customers.email)}
                                                            </span>
                                                        </Link>
                                                    )}
                                                </div>

                                                {/* Body preview */}
                                                {displayContent && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line mt-1 line-clamp-3">
                                                        {displayContent}
                                                        {!isExpanded && hasMore && '...'}
                                                    </p>
                                                )}

                                                {/* Expand button */}
                                                {hasMore && (
                                                    <button
                                                        onClick={() => toggleExpand(message.id)}
                                                        className="flex items-center gap-1 text-xs text-primary hover:underline w-fit mt-1"
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                <ChevronUp className="h-3 w-3" />
                                                                Visa mindre
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="h-3 w-3" />
                                                                Visa mer
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
