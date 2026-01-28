import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Mail, FileText, RefreshCw, ChevronDown, ChevronUp, Clock, Reply, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReplyModal } from './ReplyModal';
import { DeleteMessageModal } from './DeleteMessageModal';
import {
    decodeHTML,
    decodeQuotedPrintable,
    fixSwedishEncoding,
    cleanEmailBody,
    extractQuotedContent
} from '../lib/textUtils';

/**
 * Timeline component that fetches and displays both emails (from messages)
 * and form submissions (from inbox via leads) for a customer.
 * 
 * Props:
 *   customerId: UUID of the customer to show timeline for
 *   customer: Customer object (for reply modal)
 */
export const Timeline = ({ customerId, customer }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Modal states
    const [replyModal, setReplyModal] = useState({ isOpen: false, message: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, message: null });

    const fetchTimeline = useCallback(async () => {
        if (!customerId) {
            setItems([]);
            setLoading(false);
            return;
        }

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
                const rawFullContent = email.body_full || email.content || email.body_preview || email.body || '';
                const rawPreviewContent = email.body_preview || email.content || email.body || email.body_full || '';

                // Decode in correct order: quoted-printable -> HTML entities -> Swedish encoding -> clean formatting
                const decodedFull = fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(rawFullContent)));
                const fullContent = cleanEmailBody(decodedFull);
                const previewContent = cleanEmailBody(fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(rawPreviewContent))));

                // Extract quoted content for collapsible display
                const quotedContent = extractQuotedContent(decodedFull);

                const fromLabel = fixSwedishEncoding(decodeQuotedPrintable(email.from_name || email.from_address || email.from_email || 'Okänd avsändare'));
                const subject = fixSwedishEncoding(decodeQuotedPrintable(email.subject || 'Inget ämne'));

                return {
                    id: email.id,
                    type: 'email',
                    title: subject,
                    from_label: fromLabel,
                    preview: previewContent.length > 300
                        ? previewContent.substring(0, 300)
                        : previewContent,
                    fullContent: fullContent,
                    quotedContent: quotedContent,
                    hasMore: fullContent.length > 300 || quotedContent,
                    ts: email.received_at || email.created_at || null,
                    direction: email.direction,
                };
            });

            const formItems = (formsData || []).map(form => {
                const decodedMessage = cleanEmailBody(fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(form.message || ''))));
                const fromLabel = fixSwedishEncoding(decodeQuotedPrintable(form.name || form.email || 'Okänd avsändare'));
                return {
                    id: form.id,
                    type: 'form',
                    title: 'Formulär',
                    from_label: fromLabel,
                    preview: decodedMessage.length > 500 ? decodedMessage.substring(0, 500) + '...' : decodedMessage,
                    fullContent: decodedMessage,
                    hasMore: decodedMessage.length > 500,
                    ts: form.created_at || null,
                };
            });

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
    }, [customerId]);

    useEffect(() => {
        fetchTimeline();
    }, [fetchTimeline]);

    // Handlers for reply and delete
    const handleReply = (message) => {
        setReplyModal({ isOpen: true, message });
    };

    const handleDelete = (message) => {
        setDeleteModal({ isOpen: true, message });
    };

    const handleReplySent = () => {
        fetchTimeline(); // Refresh to show the new outbound message
    };

    const handleDeleted = () => {
        fetchTimeline(); // Refresh to remove the deleted message
    };

    // Loading state
    if (loading) {
        return (
            <Card>
                <CardHeader
                    className="pb-2 sm:pb-4 cursor-pointer sm:cursor-default"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            Tidslinje
                        </div>
                        <button
                            className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(!isCollapsed);
                            }}
                        >
                            {isCollapsed ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronUp className="h-4 w-4" />
                            )}
                        </button>
                    </CardTitle>
                </CardHeader>
                {!isCollapsed && (
                    <CardContent>
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                )}
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <CardHeader
                    className="pb-2 sm:pb-4 cursor-pointer sm:cursor-default"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            Tidslinje
                        </div>
                        <button
                            className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(!isCollapsed);
                            }}
                        >
                            {isCollapsed ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronUp className="h-4 w-4" />
                            )}
                        </button>
                    </CardTitle>
                </CardHeader>
                {!isCollapsed && (
                    <CardContent>
                        <p className="text-destructive text-center py-4 text-sm">{error}</p>
                    </CardContent>
                )}
            </Card>
        );
    }

    // Empty state
    if (!items || items.length === 0) {
        return (
            <Card>
                <CardHeader
                    className="pb-2 sm:pb-4 cursor-pointer sm:cursor-default"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            Tidslinje
                        </div>
                        <button
                            className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsCollapsed(!isCollapsed);
                            }}
                        >
                            {isCollapsed ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronUp className="h-4 w-4" />
                            )}
                        </button>
                    </CardTitle>
                </CardHeader>
                {!isCollapsed && (
                    <CardContent>
                        <p className="text-muted-foreground text-center py-4 text-sm">Ingen kommunikation ännu</p>
                    </CardContent>
                )}
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader
                className="pb-2 sm:pb-4 cursor-pointer sm:cursor-default"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <CardTitle className="text-base sm:text-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        Tidslinje
                        <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1">
                            ({items.length})
                        </span>
                    </div>
                    <button
                        className="sm:hidden text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsCollapsed(!isCollapsed);
                        }}
                    >
                        {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronUp className="h-4 w-4" />
                        )}
                    </button>
                </CardTitle>
            </CardHeader>
            {!isCollapsed && (
                <CardContent>
                    <div className="space-y-4">
                        {items.map((item) => (
                            <TimelineItem
                                key={item.id}
                                item={item}
                                onReply={handleReply}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </CardContent>
            )}

            {/* Reply Modal */}
            <ReplyModal
                isOpen={replyModal.isOpen}
                onClose={() => setReplyModal({ isOpen: false, message: null })}
                originalMessage={replyModal.message}
                customer={customer}
                onReplySent={handleReplySent}
            />

            {/* Delete Modal */}
            <DeleteMessageModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, message: null })}
                message={deleteModal.message}
                onDeleted={handleDeleted}
            />
        </Card>
    );
};

// Separate component for each timeline item - Chat bubble style
const TimelineItem = ({ item, onReply, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [showQuoted, setShowQuoted] = useState(false);

    const isEmail = item.type === 'email';
    const isOutbound = item.direction === 'outbound';
    const Icon = isEmail ? Mail : FileText;

    // Format timestamp
    let formattedDate = 'Okänt datum';
    let shortDate = '';
    if (item.ts) {
        try {
            formattedDate = format(new Date(item.ts), 'd MMM yyyy HH:mm', { locale: sv });
            shortDate = format(new Date(item.ts), 'd MMM HH:mm', { locale: sv });
        } catch (e) {
            console.warn('Invalid timestamp:', item.ts);
        }
    }

    const displayContent = expanded ? item.fullContent : item.preview;
    const canExpand = item.fullContent && item.fullContent.length > 300;
    const hasQuoted = item.quotedContent && item.quotedContent.length > 20;

    // Chat bubble styles based on direction
    const bubbleClasses = isOutbound
        ? 'ml-auto bg-primary/10 border-primary/30'
        : 'mr-auto bg-muted/50 border-border';

    return (
        <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} w-full`}>
            {/* Sender info and timestamp */}
            <div className={`flex items-center gap-2 mb-1.5 text-xs ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex items-center gap-1.5 font-medium ${isOutbound ? 'text-primary' : 'text-foreground'}`}>
                    {isOutbound ? (
                        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Du</span>
                    ) : (
                        <>
                            <Icon className="h-3.5 w-3.5" />
                            <span>{item.from_label}</span>
                        </>
                    )}
                </div>
                <span className="text-muted-foreground">
                    {shortDate}
                </span>
            </div>

            {/* Chat bubble */}
            <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl border p-3 sm:p-4 ${bubbleClasses} ${isOutbound ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                {/* Subject line for emails */}
                {item.title && item.type === 'email' && (
                    <div className="font-semibold text-sm mb-2 pb-2 border-b border-foreground/10">
                        {item.title}
                    </div>
                )}

                {/* Message content */}
                {displayContent && (
                    <p className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${!expanded ? 'line-clamp-6' : ''}`}>
                        {displayContent}
                    </p>
                )}

                {/* Expand button if content is long */}
                {canExpand && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                    >
                        {expanded ? (
                            <><ChevronUp className="h-3 w-3" /> Visa mindre</>
                        ) : (
                            <><ChevronDown className="h-3 w-3" /> Visa mer</>
                        )}
                    </button>
                )}

                {/* Collapsible quoted content section */}
                {hasQuoted && expanded && (
                    <div className="mt-3 pt-2 border-t border-foreground/10">
                        <button
                            onClick={() => setShowQuoted(!showQuoted)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showQuoted ? (
                                <><ChevronUp className="h-3 w-3" /> Dölj tidigare</>
                            ) : (
                                <><ChevronDown className="h-3 w-3" /> Visa tidigare meddelanden</>
                            )}
                        </button>
                        {showQuoted && (
                            <div className="mt-2 pl-3 border-l-2 border-muted-foreground/30 text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-[150px] overflow-y-auto">
                                {item.quotedContent}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Action buttons below bubble */}
            <div className={`flex items-center gap-3 mt-1 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                {item.type === 'email' && !isOutbound && (
                    <button
                        onClick={() => onReply?.(item)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                        <Reply className="h-3 w-3" />
                        Svara
                    </button>
                )}
                {item.type === 'email' && (
                    <button
                        onClick={() => onDelete?.(item)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    );
};
