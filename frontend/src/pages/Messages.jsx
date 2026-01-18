import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { formatCustomerName } from '../lib/formatName';
import { Header } from '../components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Mail,
    ArrowUpDown,
    User,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    Search
} from 'lucide-react';

// Utility to decode HTML entities
const decodeHTML = (html) => {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
};

// Utility to decode quoted-printable encoding
const decodeQuotedPrintable = (text) => {
    if (!text) return '';

    try {
        // Replace =XX hex codes with actual characters
        let decoded = text.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        // Remove soft line breaks (=\r\n or =\n)
        decoded = decoded.replace(/=\r?\n/g, '');

        return decoded;
    } catch (e) {
        console.warn('Error decoding quoted-printable:', e);
        return text;
    }
};

// Utility to decode base64
const decodeBase64 = (text) => {
    if (!text) return '';

    try {
        // Check if it looks like base64
        if (/^[A-Za-z0-9+/]+=*$/.test(text.trim())) {
            return atob(text);
        }
        return text;
    } catch (e) {
        return text;
    }
};

// Utility to fix mojibake (incorrectly decoded UTF-8 Swedish characters)
const fixSwedishEncoding = (text) => {
    if (!text) return '';

    // Common UTF-8 mojibake patterns for Swedish characters
    const replacements = {
        'Ã¥': 'å', 'Ã¤': 'ä', 'Ã¶': 'ö',
        'Ã…': 'Å', 'Ã„': 'Ä', 'Ã–': 'Ö',
        'Ã©': 'é', 'Ã¨': 'è', 'Ã': 'à',
        'â€™': "'", 'â€œ': '"', 'â€': '"',
        'â€"': '–', 'â€"': '—',
        'Â': '', // Non-breaking space artifacts
        'å€¦': 'å', 'å€¡': 'ä', 'å€': 'ö',
        'Ã¡': 'á', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
        '☰': '', // Trigram symbols (often from encoding errors)
        '▓': '', // Block characters (often from corrupted encoding)
        '▒': '', // Medium shade block
        '░': '', // Light shade block
        '█': '', // Full block
        '�': '', // Replacement character
        '\uFFFD': '', // Unicode replacement character
        '\u2593': '', // Dark shade (▓)
        '\u2592': '', // Medium shade (▒)
        '\u2591': '', // Light shade (░)
        '\u2588': '', // Full block (█)
    };

    let fixed = text;
    for (const [wrong, correct] of Object.entries(replacements)) {
        fixed = fixed.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }

    return fixed;
};

// Utility to clean email body text
const cleanEmailBody = (text) => {
    if (!text) return '';

    let cleaned = text;

    // Remove email headers (date/time stamps with timezone info)
    cleaned = cleaned.replace(/^\d{1,2}\s+\w+\s+\d{4},\s+\d{2}:\d{2}\s+\w+\s+\w+,\s+skrev\s+[^:]+:/gm, '');

    // Remove "Den [date] skrev [name] <email>:" patterns
    cleaned = cleaned.replace(/^Den\s+\d{4}-\d{2}-\d{2}\s+\w+\s+\d{2}:\d{2}\s+skrev\s+[^:]+:/gm, '');

    // Remove "On [date], [name] wrote:" patterns
    cleaned = cleaned.replace(/^On\s+\w+,?\s+\w+\s+\d{1,2},?\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s+[AP]M,?\s+[^:]+wrote:/gm, '');

    // Simplify quoted reply markers - collapse multiple levels
    cleaned = cleaned.replace(/^(>\s*)+/gm, '> ');

    // Remove multiple consecutive blank lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
};


export const Messages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState('received_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

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

    // Filter messages based on search query
    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;

        const query = searchQuery.toLowerCase();
        return messages.filter(msg =>
            (msg.subject || '').toLowerCase().includes(query) ||
            (msg.from_name || '').toLowerCase().includes(query) ||
            (msg.from_email || '').toLowerCase().includes(query) ||
            (msg.body_preview || '').toLowerCase().includes(query) ||
            (msg.body_full || '').toLowerCase().includes(query) ||
            (msg.customers?.name || '').toLowerCase().includes(query)
        );
    }, [messages, searchQuery]);

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
                            {filteredMessages.length} av {messages.length} st
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Sök på ämne, avsändare, kund eller innehåll..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
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
                    ) : filteredMessages.length === 0 ? (
                        <Card>
                            <CardContent className="py-8">
                                <p className="text-muted-foreground text-center">
                                    {searchQuery ? 'Inga meddelanden matchade sökningen' : 'Inga meddelanden'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {filteredMessages.map((message) => {
                                const isExpanded = expandedIds.has(message.id);

                                // Get the full content (prioritize body_full over body_preview) and decode in correct order
                                const rawContent = message.body_full || message.body_preview || '';
                                const fullContent = cleanEmailBody(fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(rawContent))));
                                const subject = fixSwedishEncoding(decodeQuotedPrintable(message.subject || 'Inget ämne'));
                                const fromName = fixSwedishEncoding(decodeQuotedPrintable(message.from_name || message.from_address || 'Okänd'));

                                // Determine if we should show expand button
                                const hasMore = fullContent.length > 300;

                                // Display content based on expansion state
                                const displayContent = isExpanded
                                    ? fullContent
                                    : fullContent.substring(0, 300);

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
                                    <Card key={message.id} className="hover:shadow-sm transition-shadow">
                                        <CardContent className="p-3 sm:p-4">
                                            <div className="flex flex-col gap-3">
                                                {/* Header row */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 hidden sm:block" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-sm sm:text-base">
                                                                    {subject}
                                                                </span>
                                                                {message.direction === 'outbound' && (
                                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded shrink-0">
                                                                        Skickat
                                                                    </span>
                                                                )}
                                                                {message.direction === 'inbound' && (
                                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded shrink-0">
                                                                        Inkommande
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                                                        <span className="hidden sm:inline">{formattedDate}</span>
                                                        <span className="sm:hidden">{shortDate}</span>
                                                    </span>
                                                </div>

                                                {/* From/To info */}
                                                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <User className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {fromName}
                                                        </span>
                                                    </div>
                                                    {message.customers && (
                                                        <>
                                                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                            <Link
                                                                to={`/kund/${message.customers.id}`}
                                                                className="text-primary hover:underline truncate"
                                                            >
                                                                {formatCustomerName(message.customers.name, message.customers.email)}
                                                            </Link>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Body preview */}
                                                {displayContent && (
                                                    <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                                                        <p className="whitespace-pre-wrap break-words">
                                                            {displayContent}
                                                            {!isExpanded && hasMore && '...'}
                                                        </p>
                                                    </div>
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
