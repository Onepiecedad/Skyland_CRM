import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { messagesAPI } from '../lib/api';
import { Header } from '../components/Header';
import { usePullToRefresh, PullToRefreshIndicator } from '../components/PullToRefresh';
import { MessageModal } from '../components/MessageModal';
import { ReplyModal } from '../components/ReplyModal';
import { SwipeableCard } from '../components/SwipeableCard';
import { UndoToast } from '../components/UndoToast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '../hooks/use-toast';
import { useUndoableAction } from '../hooks/useUndoableAction';
import { fixSwedishEncoding, decodeQuotedPrintable } from '../lib/textUtils';
import {
    Mail,
    ArrowUpDown,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    Search,
    CheckCheck,
    Inbox,
    Send,
    User
} from 'lucide-react';

// ============================================
// UTILITIES - Page-specific helpers
// ============================================

/**
 * Ta bort HTML och extrahera ren text
 */
const stripHtml = (html) => {
    if (!html) return '';

    let text = html;
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/(p|div|li|tr)>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&amp;/gi, '&');
    text = text.replace(/&lt;/gi, '<');
    text = text.replace(/&gt;/gi, '>');

    return text;
};

/**
 * Rensa email-text för förhandsgranskning
 */
const cleanPreview = (text) => {
    if (!text) return '';

    let cleaned = stripHtml(text);
    cleaned = fixSwedishEncoding(decodeQuotedPrintable(cleaned));

    // Ta bort citerat innehåll
    const lines = cleaned.split('\n');
    const cleanLines = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>')) continue;
        if (/^Den\s+(mån|tis|ons|tors|fre|lör|sön)/i.test(trimmed)) break;
        if (/^On\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(trimmed)) break;
        if (/skrev\s*:/i.test(trimmed)) break;
        if (/wrote\s*:/i.test(trimmed)) break;
        cleanLines.push(line);
    }

    cleaned = cleanLines.join(' ').replace(/\s+/g, ' ').trim();
    return cleaned.substring(0, 120);
};

/**
 * Hämta avsändarnamn från olika källor
 */
const extractSenderName = (message) => {
    let name = message.from_name;

    if (!name || name.trim() === '') {
        // Försök extrahera från "Namn <email>" format
        const emailMatch = message.from_email?.match(/^([^<]+)\s*<[^>]+>$/);
        if (emailMatch) {
            name = emailMatch[1].trim();
        } else if (message.customers?.name) {
            name = message.customers.name;
        } else {
            name = message.from_email || 'Okänd';
        }
    }

    return fixSwedishEncoding(decodeQuotedPrintable(name));
};

// ============================================
// KOMPONENT: MessageRow - En rad i listan
// ============================================

const MessageRow = ({ message, onClick, isUnread }) => {
    const senderName = extractSenderName(message);
    const subject = fixSwedishEncoding(decodeQuotedPrintable(message.subject || 'Inget ämne'));
    const preview = cleanPreview(message.body_preview || message.body_full || '');
    const isOutbound = message.direction === 'outbound';

    // Formatera datum
    let dateStr = '';
    if (message.received_at) {
        try {
            const date = new Date(message.received_at);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                dateStr = format(date, 'HH:mm', { locale: sv });
            } else if (diffDays < 7) {
                dateStr = format(date, 'EEE', { locale: sv });
            } else {
                dateStr = format(date, 'd MMM', { locale: sv });
            }
        } catch (e) { }
    }

    return (
        <div
            className={`relative w-full text-left p-4 transition-all duration-150 hover:bg-muted/50 group cursor-pointer ${isUnread
                ? 'bg-primary/5'
                : 'bg-card'
                }`}
            onClick={onClick}
        >
            <div className="flex items-start gap-3">
                {/* Avatar / Ikon */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isOutbound
                    ? 'bg-primary/10 text-primary'
                    : isUnread
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                    {isOutbound ? (
                        <Send className="h-5 w-5" />
                    ) : (
                        <User className="h-5 w-5" />
                    )}
                </div>

                {/* Innehåll */}
                <div className="flex-1 min-w-0">
                    {/* Rad 1: Avsändare + Datum */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                            {isUnread && (
                                <span className="h-2 w-2 bg-primary rounded-full shrink-0" />
                            )}
                            <span className={`truncate ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                {isOutbound ? `Till: ${message.to_email?.split('@')[0] || 'Okänd'}` : senderName}
                            </span>
                            {message.customers && !isOutbound && (
                                <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                    Kund
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                            {dateStr}
                        </span>
                    </div>

                    {/* Rad 2: Ämne */}
                    <p className={`text-sm truncate mb-0.5 ${isUnread ? 'text-foreground' : 'text-foreground/80'}`}>
                        {subject}
                    </p>

                    {/* Rad 3: Förhandsgranskning */}
                    <p className="text-xs text-muted-foreground truncate">
                        {preview || '(Inget innehåll)'}
                    </p>
                </div>
            </div>
        </div>
    );
};

// ============================================
// HUVUDKOMPONENT: Messages
// ============================================

export const Messages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState('received_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [directionFilter, setDirectionFilter] = useState('all');

    // Modal states
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyToMessage, setReplyToMessage] = useState(null);

    // Undoable delete state - needs to be declared before filteredMessages
    const [hiddenMessageIds, setHiddenMessageIds] = useState(new Set());

    const { toast } = useToast();

    // Hämta meddelanden - definieras som vanlig function för hoisting
    async function fetchMessages() {
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
                    seen,
                    status,
                    customers!messages_customer_id_fkey (
                        id,
                        name,
                        email
                    )
                `)
                .is('deleted_at', null)
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
    }

    useEffect(() => {
        fetchMessages();
    }, [sortField, sortDirection]);

    // Pull-to-refresh
    const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
        onRefresh: fetchMessages,
        threshold: 80
    });

    // Beräkna statistik
    const unreadCount = useMemo(() => {
        return messages.filter(m => m.direction === 'inbound' && !m.seen).length;
    }, [messages]);

    const outboundCount = messages.filter(m => m.direction === 'outbound').length;

    // Filtrera meddelanden
    const filteredMessages = useMemo(() => {
        let result = messages;

        // Hide messages that are pending deletion
        result = result.filter(msg => !hiddenMessageIds.has(msg.id));

        if (directionFilter !== 'all') {
            result = result.filter(msg => msg.direction === directionFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(msg =>
                (msg.subject || '').toLowerCase().includes(query) ||
                (msg.from_name || '').toLowerCase().includes(query) ||
                (msg.from_email || '').toLowerCase().includes(query) ||
                (msg.body_preview || '').toLowerCase().includes(query) ||
                (msg.customers?.name || '').toLowerCase().includes(query)
            );
        }

        return result;
    }, [messages, searchQuery, directionFilter, hiddenMessageIds]);

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await messagesAPI.markAllAsSeen();
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

    const handleMessageClick = async (message) => {
        setSelectedMessage(message);
        setShowMessageModal(true);

        // Markera som läst
        if (message.direction === 'inbound' && !message.seen) {
            try {
                await messagesAPI.markAsSeen(message.id);
                setMessages(prev => prev.map(m =>
                    m.id === message.id ? { ...m, seen: true } : m
                ));
            } catch (err) {
                console.error('Error marking as seen:', err);
            }
        }
    };

    const handleReply = (message) => {
        setShowMessageModal(false);
        setReplyToMessage(message);
        setShowReplyModal(true);
    };

    // Undoable delete functionality
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const executeDelete = useCallback(async (messageId) => {
        try {
            // Actually delete (soft delete) the message
            const { error } = await supabase
                .from('messages')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', messageId);

            if (error) throw error;

            // Remove from the hidden set and the actual list
            setHiddenMessageIds(prev => {
                const next = new Set(prev);
                next.delete(messageId);
                return next;
            });
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (err) {
            console.error('Error deleting message:', err);
            // Restore visibility if delete failed
            setHiddenMessageIds(prev => {
                const next = new Set(prev);
                next.delete(messageId);
                return next;
            });
            toast({
                title: 'Fel',
                description: 'Kunde inte radera meddelandet',
                variant: 'destructive',
            });
        }
    }, [toast]);

    const handleUndo = useCallback((messageId) => {
        // Just restore visibility - the message was never actually deleted
        setPendingDeleteId(null);
        setHiddenMessageIds(prev => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
        });
        toast({
            title: 'Ångrad',
            description: 'Meddelandet återställdes',
        });
    }, [toast]);

    const {
        initiateAction: initiateDelete,
        cancelAction: cancelDelete,
        isPending: isDeletePending,
        remainingTime,
        progress,
        pendingData: pendingDeleteData,
    } = useUndoableAction({
        timeout: 5000,
        onExecute: executeDelete,
        onUndo: handleUndo,
    });

    const handleDelete = (messageId) => {
        setPendingDeleteId(messageId);
        // Hide the message immediately for better UX
        setHiddenMessageIds(prev => new Set(prev).add(messageId));
        // Close modals if open
        setShowMessageModal(false);
        setSelectedMessage(null);
        // Start the undoable delete
        initiateDelete(messageId);
    };

    const SortButton = ({ field, label }) => (
        <Button
            variant={sortField === field ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSort(field)}
            className="text-xs h-8"
        >
            {label}
            {sortField === field && (
                sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />
            )}
        </Button>
    );

    return (
        <div className="min-h-screen bg-background flex flex-col pb-24 md:pb-0" {...handlers}>
            <Header />
            <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

            <main className="flex-1 container mx-auto px-4 py-4 sm:py-6">
                <div className="flex flex-col gap-4 sm:gap-6">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Mail className="h-6 w-6 text-primary" />
                            <h1 className="text-xl sm:text-2xl font-bold">Meddelanden</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs h-8"
                                >
                                    <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="hidden sm:inline">Markera lästa</span>
                                    <span className="sm:hidden">{unreadCount}</span>
                                </Button>
                            )}
                            <span className="text-xs text-muted-foreground">
                                {filteredMessages.length} st
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 border-b">
                        <button
                            onClick={() => setDirectionFilter('all')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${directionFilter === 'all'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Mail className="h-4 w-4" />
                            Alla
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{messages.length}</span>
                        </button>
                        <button
                            onClick={() => setDirectionFilter('inbound')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${directionFilter === 'inbound'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Inbox className="h-4 w-4" />
                            Inbox
                            {unreadCount > 0 && (
                                <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setDirectionFilter('outbound')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${directionFilter === 'outbound'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Send className="h-4 w-4" />
                            Skickat
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{outboundCount}</span>
                        </button>
                    </div>

                    {/* Sök + Sortering */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Sök meddelanden..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            <SortButton field="received_at" label="Datum" />
                            <SortButton field="from_email" label="Avsändare" />
                        </div>
                    </div>

                    {/* Meddelandelista */}
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
                            <CardContent className="py-12 text-center">
                                <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'Inga meddelanden matchade sökningen' : 'Inga meddelanden'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-0 rounded-lg border overflow-hidden">
                            {filteredMessages.map((message) => (
                                <SwipeableCard
                                    key={message.id}
                                    onSwipeRight={() => handleDelete(message.id)}
                                    rightLabel="Radera"
                                    rightColor="bg-red-500 hover:bg-red-600"
                                    disabled={isDeletePending}
                                    className="border-b last:border-b-0"
                                >
                                    <MessageRow
                                        message={message}
                                        onClick={() => handleMessageClick(message)}
                                        isUnread={message.direction === 'inbound' && !message.seen}
                                    />
                                </SwipeableCard>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Message Modal */}
            <MessageModal
                message={selectedMessage}
                isOpen={showMessageModal}
                onClose={() => {
                    setShowMessageModal(false);
                    setSelectedMessage(null);
                }}
                onReply={handleReply}
                onDelete={handleDelete}
            />

            {/* Reply Modal */}
            <ReplyModal
                isOpen={showReplyModal}
                onClose={() => {
                    setShowReplyModal(false);
                    setReplyToMessage(null);
                }}
                originalMessage={replyToMessage ? {
                    id: replyToMessage.id,
                    title: replyToMessage.subject || 'Inget ämne',
                    from_label: replyToMessage.from_name || replyToMessage.from_email || 'Okänd',
                    from_email: replyToMessage.from_email,
                    to_email: replyToMessage.to_email,
                    preview: replyToMessage.body_preview || '',
                    direction: replyToMessage.direction,
                    lead_id: replyToMessage.lead_id,
                    thread_id: replyToMessage.thread_id,
                    customer_id: replyToMessage.customer_id
                } : null}
                customer={replyToMessage?.customers || null}
                onReplySent={() => {
                    fetchMessages();
                    toast({
                        title: 'Skickat!',
                        description: 'Ditt svar har skickats',
                    });
                }}
            />

            {/* Undo Toast for delete actions */}
            <UndoToast
                message="Meddelande raderas..."
                progress={progress}
                remainingTime={remainingTime}
                onUndo={cancelDelete}
                isVisible={isDeletePending}
            />
        </div>
    );
};
