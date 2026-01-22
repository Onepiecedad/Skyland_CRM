import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { messagesAPI } from '../lib/api';
import { formatCustomerName } from '../lib/formatName';
import { Header } from '../components/Header';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';
import { ReplyTemplates } from '../components/ReplyTemplates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '../hooks/use-toast';
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
    Search,
    Reply,
    Trash2,
    CheckCheck
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

// Utility to strip HTML and CSS from email body
const stripHtmlAndCss = (html) => {
    if (!html) return '';

    let text = html;

    // Remove all <style> blocks and their content
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove all <script> blocks and their content
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Remove all <head> blocks and their content
    text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // Remove DOCTYPE, xml declarations
    text = text.replace(/<!DOCTYPE[^>]*>/gi, '');
    text = text.replace(/<\?xml[^>]*\?>/gi, '');

    // Convert common block elements to newlines before stripping
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<hr\s*\/?>/gi, '\n---\n');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');

    // Decode common HTML entities
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');
    text = text.replace(/&quot;/gi, '"');
    text = text.replace(/&#39;/gi, "'");
    text = text.replace(/&apos;/gi, "'");
    text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
    text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

    // Remove CSS-like patterns that might have leaked through
    // Match patterns like: .class { ... } or element { ... } or @media { ... }
    text = text.replace(/[.#@]?[\w-]+\s*\{[^}]*\}/g, '');

    // Remove remaining inline style-like patterns (property: value;)
    text = text.replace(/[\w-]+\s*:\s*[^;{}\n]+;/g, '');

    return text;
};

// Utility to clean email body text - removes quoted replies
const cleanEmailBody = (text) => {
    if (!text) return '';

    // First strip any HTML/CSS
    let cleaned = stripHtmlAndCss(text);

    // STEP 1: Find and cut at common reply header patterns
    const cutoffPatterns = [
        // "Den mån 12 jan. 2026 18:13Lars Johansson skrev:"
        /Den\s+(mån|tis|ons|tors|fre|lör|sön)?\s*\d{1,2}/i,
        // "12 januari 2026, 14:23 centraleuropeisk"
        /\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4},?\s+\d{1,2}:\d{2}/i,
        // Just "centraleuropeisk" timezone indicator
        /centraleuropeisk/i,
        // "On Mon, Jan 6, 2024"
        /On\s+\w{3,},?\s+\w{3,}\s+\d{1,2}/i,
        // "skrev" attributions
        /,?\s*skrev\s+[A-Za-zÀ-ÿ\s]+[<@]/i,
    ];

    // Find the earliest cutoff point
    let earliestCutoff = cleaned.length;
    for (const pattern of cutoffPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index !== undefined && match.index < earliestCutoff && match.index > 20) {
            earliestCutoff = match.index;
        }
    }

    // Cut at the earliest pattern match
    if (earliestCutoff < cleaned.length) {
        cleaned = cleaned.substring(0, earliestCutoff);
    }

    // STEP 2: Remove lines starting with ">" (quoted text)
    const lines = cleaned.split('\n');
    const cleanedLines = [];
    let foundContent = false;

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines at the start
        if (!foundContent && trimmed === '') continue;

        // Skip lines starting with ">" (quoted)
        if (trimmed.startsWith('>')) continue;

        // Skip lines that are just ">" markers with spaces
        if (/^[\s>]+$/.test(line)) continue;

        // Check for inline reply headers and stop
        if (/^Den\s+(mån|tis|ons|tors|fre|lör|sön)?\s*\d/i.test(trimmed)) break;
        if (/^\d{1,2}\s+(jan|feb|mar)/i.test(trimmed) && /skrev|kl\./i.test(trimmed)) break;
        if (/^On\s+\w+,?\s+\w+\s+\d/i.test(trimmed)) break;

        // Skip "Skickat från min iPhone" etc
        if (/^Skickat från/i.test(trimmed)) continue;
        if (/^Sent from/i.test(trimmed)) continue;

        // Skip lines that are email headers
        if (/^<[^>]+>:?\s*$/.test(trimmed)) continue;

        foundContent = true;
        cleanedLines.push(line);
    }

    cleaned = cleanedLines.join('\n');

    // STEP 3: Clean up any remaining ">" artifacts
    cleaned = cleaned.replace(/^>\s*/gm, '');
    cleaned = cleaned.replace(/\s*>\s*>/g, ' ');

    // Remove multiple consecutive empty lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Trim
    cleaned = cleaned.trim();

    // STEP 4: If result is too short, get first non-quoted lines
    if (cleaned.length < 20) {
        const firstLines = text.split('\n')
            .filter(l => !l.trim().startsWith('>') && l.trim().length > 0)
            .slice(0, 5)
            .join('\n');
        return firstLines.substring(0, 300).trim() || text.substring(0, 200);
    }

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
    const [directionFilter, setDirectionFilter] = useState('all'); // 'all', 'inbound', 'outbound'
    const [showReplyDialog, setShowReplyDialog] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [replyToMessage, setReplyToMessage] = useState(null);
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchMessages();
    }, [sortField, sortDirection]);

    // Calculate unread count
    const unreadCount = useMemo(() => {
        return messages.filter(m => m.direction === 'inbound' && !m.seen).length;
    }, [messages]);

    const handleMarkAllAsRead = async () => {
        try {
            await messagesAPI.markAllAsSeen();
            // Update local state
            setMessages(prev => prev.map(m => ({ ...m, seen: true })));
            toast({
                title: 'Klart!',
                description: 'Alla meddelanden markerade som lästa',
            });
        } catch (err) {
            console.error('Error marking all as read:', err);
            toast({
                title: 'Fel',
                description: 'Kunde inte markera meddelanden som lästa',
                variant: 'destructive',
            });
        }
    };

    const fetchMessages = async () => {
        setLoading(true);
        setError(null);

        try {
            // Use !messages_customer_id_fkey to resolve ambiguous relationship (PGRST201)
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
                    customers!messages_customer_id_fkey (
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

    // Pull-to-refresh
    const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
        onRefresh: fetchMessages,
        threshold: 80
    });

    const toggleExpand = async (id, message) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
                // Mark as seen when expanding an inbound message
                if (message && message.direction === 'inbound' && !message.seen) {
                    messagesAPI.markAsSeen(id).catch(console.error);
                    // Update local state
                    setMessages(prev => prev.map(m =>
                        m.id === id ? { ...m, seen: true } : m
                    ));
                }
            }
            return newSet;
        });
    };

    const handleReplyClick = (message) => {
        setReplyToMessage(message);
        setReplyMessage('');
        setShowReplyDialog(true);
    };

    const handleReply = async () => {
        if (!replyMessage.trim()) {
            toast({
                title: 'Tomt meddelande',
                description: 'Skriv ett meddelande innan du skickar',
                variant: 'destructive',
            });
            return;
        }

        if (!replyToMessage) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from('messages')
                .insert([{
                    customer_id: replyToMessage.customer_id,
                    direction: 'outbound',
                    channel: 'email',
                    subject: `Re: ${replyToMessage.subject || ''}`,
                    body_full: replyMessage,
                    body_preview: replyMessage.substring(0, 500),
                    from_email: 'info@marinmekaniker.nu',
                    to_email: replyToMessage.from_email || '',
                    status: 'draft',
                    received_at: new Date().toISOString(),
                }]);

            if (error) throw error;

            toast({
                title: 'Svar sparat',
                description: 'Ditt svar har sparats som utkast',
            });

            setReplyMessage('');
            setShowReplyDialog(false);
            setReplyToMessage(null);
            fetchMessages(); // Refresh list
        } catch (err) {
            console.error('Error saving reply:', err);
            toast({
                title: 'Fel',
                description: 'Kunde inte spara svaret. Försök igen.',
                variant: 'destructive',
            });
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm('Är du säker på att du vill radera detta meddelande?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);

            if (error) throw error;

            toast({
                title: 'Raderat',
                description: 'Meddelandet har raderats',
            });

            // Remove from local state
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error('Error deleting message:', err);
            toast({
                title: 'Fel',
                description: 'Kunde inte radera meddelandet. Försök igen.',
                variant: 'destructive',
            });
        }
    };

    // Filter messages based on search query and direction
    const filteredMessages = useMemo(() => {
        let result = messages;

        // Filter by direction
        if (directionFilter !== 'all') {
            result = result.filter(msg => msg.direction === directionFilter);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(msg =>
                (msg.subject || '').toLowerCase().includes(query) ||
                (msg.from_name || '').toLowerCase().includes(query) ||
                (msg.from_email || '').toLowerCase().includes(query) ||
                (msg.body_preview || '').toLowerCase().includes(query) ||
                (msg.body_full || '').toLowerCase().includes(query) ||
                (msg.customers?.name || '').toLowerCase().includes(query)
            );
        }

        return result;
    }, [messages, searchQuery, directionFilter]);

    // Count messages by direction
    const inboundCount = messages.filter(m => m.direction === 'inbound').length;
    const outboundCount = messages.filter(m => m.direction === 'outbound').length;

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
        <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0" {...handlers}>
            <Header />
            <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />
            <main className="flex-1 container mx-auto px-4 py-4 sm:py-6">
                <div className="flex flex-col gap-4 sm:gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold">Meddelanden</h1>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs h-8"
                                >
                                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="hidden sm:inline">Markera alla lästa</span>
                                    <span className="sm:hidden">Lästa ({unreadCount})</span>
                                </Button>
                            )}
                            <span className="text-xs sm:text-sm text-muted-foreground">
                                {filteredMessages.length} av {messages.length} st
                            </span>
                        </div>
                    </div>

                    {/* Direction Filter Tabs */}
                    <div className="flex gap-1 sm:gap-2 border-b">
                        <button
                            onClick={() => setDirectionFilter('all')}
                            className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors ${directionFilter === 'all'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Alla ({messages.length})
                        </button>
                        <button
                            onClick={() => setDirectionFilter('inbound')}
                            className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors ${directionFilter === 'inbound'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Inbox ({inboundCount})
                        </button>
                        <button
                            onClick={() => setDirectionFilter('outbound')}
                            className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors ${directionFilter === 'outbound'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Skickat ({outboundCount})
                        </button>
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

                                // Extract sender name - try multiple sources
                                let fromName = message.from_name;
                                if (!fromName || fromName.trim() === '') {
                                    // Try to extract name from "Name <email>" format in from_email
                                    const emailMatch = message.from_email?.match(/^([^<]+)\s*<[^>]+>$/);
                                    if (emailMatch) {
                                        fromName = emailMatch[1].trim();
                                    } else if (message.customers?.name) {
                                        // Fall back to linked customer name
                                        fromName = message.customers.name;
                                    } else {
                                        fromName = message.from_email || 'Okänd';
                                    }
                                }
                                fromName = fixSwedishEncoding(decodeQuotedPrintable(fromName));

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

                                const isOutbound = message.direction === 'outbound';
                                const isUnread = message.direction === 'inbound' && !message.seen;

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} w-full`}
                                    >
                                        {/* Sender info and timestamp */}
                                        <div className={`flex items-center gap-2 mb-1.5 text-xs ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`flex items-center gap-1.5 font-medium ${isOutbound ? 'text-primary' : 'text-foreground'}`}>
                                                {isOutbound ? (
                                                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Du</span>
                                                ) : (
                                                    <>
                                                        <User className="h-3.5 w-3.5" />
                                                        <span>{fromName}</span>
                                                        {isUnread && (
                                                            <span className="h-2 w-2 bg-primary rounded-full" />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <span className="text-muted-foreground">
                                                {shortDate}
                                            </span>
                                            {message.customers && (
                                                <Link
                                                    to={`/kund/${message.customers.id}`}
                                                    className="text-primary hover:underline truncate max-w-[120px]"
                                                >
                                                    → {formatCustomerName(message.customers.name, message.customers.email)}
                                                </Link>
                                            )}
                                        </div>

                                        {/* Chat bubble */}
                                        <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl border p-3 sm:p-4 ${isOutbound
                                            ? 'ml-auto bg-primary/10 border-primary/30 rounded-tr-sm'
                                            : `mr-auto ${isUnread ? 'bg-primary/5 border-primary/40' : 'bg-muted/50 border-border'} rounded-tl-sm`
                                            }`}>
                                            {/* Subject line */}
                                            <div className={`font-semibold text-sm mb-2 pb-2 border-b border-foreground/10 ${isUnread ? 'text-foreground' : ''}`}>
                                                {subject}
                                            </div>

                                            {/* Message content */}
                                            {displayContent && (
                                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                                    {displayContent}
                                                    {!isExpanded && hasMore && '...'}
                                                </p>
                                            )}

                                            {/* Expand button */}
                                            {hasMore && (
                                                <button
                                                    onClick={() => toggleExpand(message.id, message)}
                                                    className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                                                >
                                                    {isExpanded ? (
                                                        <><ChevronUp className="h-3 w-3" /> Visa mindre</>
                                                    ) : (
                                                        <><ChevronDown className="h-3 w-3" /> Visa mer</>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Action buttons below bubble */}
                                        <div className={`flex items-center gap-3 mt-1.5 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {!isOutbound && (
                                                <button
                                                    onClick={() => handleReplyClick(message)}
                                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <Reply className="h-3 w-3" />
                                                    Svara
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(message.id)}
                                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Reply Dialog */}
            <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
                <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-base sm:text-lg">Svara på meddelande</DialogTitle>
                        {replyToMessage && (
                            <DialogDescription className="text-sm">
                                Svar till: {fixSwedishEncoding(decodeQuotedPrintable(replyToMessage.from_name || replyToMessage.from_email || ''))}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <div className="space-y-4 py-3 sm:py-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="reply-message" className="text-sm">Meddelande</Label>
                                <ReplyTemplates
                                    onSelect={(template) => {
                                        setReplyMessage(template.body);
                                    }}
                                />
                            </div>
                            <Textarea
                                id="reply-message"
                                placeholder="Skriv ditt svar här eller välj en mall..."
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                rows={8}
                                className="resize-none text-sm sm:text-base min-h-[180px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowReplyDialog(false)}
                            disabled={sending}
                            className="w-full sm:w-auto order-2 sm:order-1"
                        >
                            Avbryt
                        </Button>
                        <Button
                            onClick={handleReply}
                            disabled={sending}
                            className="w-full sm:w-auto order-1 sm:order-2"
                        >
                            {sending ? 'Skickar...' : 'Skicka svar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
