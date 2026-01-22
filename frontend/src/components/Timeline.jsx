import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Mail, FileText, RefreshCw, ChevronDown, ChevronUp, Clock, Reply, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReplyModal } from './ReplyModal';
import { DeleteMessageModal } from './DeleteMessageModal';

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

// Utility to clean email body text - AGGRESSIVELY removes quoted replies
const cleanEmailBody = (text) => {
    if (!text) return '';

    let cleaned = text;

    // First pass: Remove entire quoted sections that start with common reply headers
    // These patterns match the start of a quoted reply chain and everything after
    const replyHeaderPatterns = [
        /Den (\d{1,2}|tors|fre|mån|tis|ons|lör|sön)[^\n]*\d{4}[^\n]*skrev/gi,  // "Den 6 januari 2026... skrev" or "Den tors 8 jan..."
        /\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4}/gi, // Full Swedish month
        /\d{1,2}\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\.?\s+\d{4}/gi, // Abbreviated Swedish month
        /\d{1,2}\s+\w+\.?\s+\d{4}\s+\d{1,2}:\d{2}.*?skrev/gis,     // "6 jan. 2026 kl. 18:59 skrev..."
        /On\s+\w+\s+\d{1,2},?\s+\d{4}.*?wrote:/gis,                 // "On Mon Jan 6, 2024... wrote:"
        /From:.*?<.*?>.*?Subject:/gis,                              // Email headers
        /Från:.*?Ämne:/gis,                                         // Swedish email headers
        /centraleuropeisk\s+(normal)?tid/gi,                        // "centraleuropeisk normaltid" timezone indicator
    ];

    // Find the earliest match of any reply header and truncate there
    let earliestCutoff = cleaned.length;
    for (const pattern of replyHeaderPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index !== undefined && match.index < earliestCutoff) {
            earliestCutoff = match.index;
        }
    }

    if (earliestCutoff < cleaned.length) {
        cleaned = cleaned.substring(0, earliestCutoff);
    }

    // STEP 2: Remove inline "> > > >" patterns that appear within text
    // These often appear when email clients don't properly format quotes
    cleaned = cleaned.replace(/(\s*>\s*){2,}/g, ' '); // Multiple consecutive > markers
    cleaned = cleaned.replace(/\s*>\s*>/g, ' '); // " > >" patterns
    cleaned = cleaned.replace(/>\s+/g, ' '); // Single > followed by space

    // Also remove email addresses with angle brackets that indicate quote chains
    cleaned = cleaned.replace(/<[^>]+@[^>]+>:?\s*/g, '');

    // STEP 3: Cut at "skrev" patterns followed by names/emails (quote attributions)
    const skrevMatch = cleaned.match(/,?\s*skrev\s+[A-Za-zÀ-ÿ\s]+[<@]/i);
    if (skrevMatch && skrevMatch.index && skrevMatch.index > 50) {
        cleaned = cleaned.substring(0, skrevMatch.index);
    }

    // Cut at "centraleuropeisk" timezone patterns
    const timezoneMatch = cleaned.match(/centraleuropeisk/i);
    if (timezoneMatch && timezoneMatch.index && timezoneMatch.index > 50) {
        cleaned = cleaned.substring(0, timezoneMatch.index);
    }

    // Remove date patterns that start quote attributions
    cleaned = cleaned.replace(/\d{1,2}\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)\.?\s+\d{4},?\s+\d{1,2}:\d{2}[^.!?]*/gi, '');

    // Clean "Skickat från min iPhone" and similar inline
    cleaned = cleaned.replace(/Skickat från min iPhone[^.!?]*/gi, '');
    cleaned = cleaned.replace(/Sent from my [^.!?]*/gi, '');

    // Split into lines for line-by-line processing
    const lines = cleaned.split('\n');
    const cleanedLines = [];
    let consecutiveQuotedLines = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Skip empty lines at the start
        if (cleanedLines.length === 0 && trimmedLine === '') continue;

        // Count leading '>' characters - handles "> > > >" style quotes
        const quoteMatch = trimmedLine.match(/^[>\s]+/);
        const quoteDepth = quoteMatch ? (quoteMatch[0].match(/>/g) || []).length : 0;

        // Skip any line that has quote markers
        if (quoteDepth > 0) {
            consecutiveQuotedLines++;
            continue;
        }

        // Detect email headers that indicate start of quoted content
        if (/^Den\s+\d/.test(trimmedLine) && trimmedLine.includes('skrev')) {
            break; // Stop processing, rest is quoted content
        }
        if (/^\d{1,2}\s+\w+\.?\s+\d{4}/.test(trimmedLine) && (trimmedLine.includes('skrev') || trimmedLine.includes('kl.'))) {
            break; // Stop processing
        }
        if (/^On\s+\w/.test(trimmedLine) && /wrote:?$/i.test(trimmedLine)) {
            break; // Stop processing
        }

        // "Skickat från min iPhone" - skip and stop
        if (/^Skickat från min iPhone/i.test(trimmedLine) ||
            /^Sent from my/i.test(trimmedLine) ||
            /^Skickat från /i.test(trimmedLine)) {
            continue;
        }

        // Skip lines that are just email formatting/separators
        if (/^[>\s_\-=]{10,}$/.test(trimmedLine)) continue;

        // Skip email addresses in angle brackets patterns like "<email@domain.com>:"
        if (/^<[^>]+>:?\s*$/.test(trimmedLine)) continue;

        // Skip lines that look like quoted email addresses with ">" prefix pattern
        if (/^[>\s]*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[>\s:]*$/.test(trimmedLine)) continue;

        // After several consecutive quoted lines, be more aggressive about what follows
        if (consecutiveQuotedLines > 2) {
            // If this non-quoted line follows many quoted lines and looks like continuation
            if (trimmedLine.includes('@') && trimmedLine.length < 80) {
                continue; // Skip email addresses after quotes
            }
            if (/^[A-Za-zÀ-ÿ]+ [A-Za-zÀ-ÿ]+\s*$/.test(trimmedLine) && trimmedLine.length < 40) {
                continue; // Skip name-only lines after quotes
            }
        }

        consecutiveQuotedLines = 0;
        cleanedLines.push(line);
    }

    cleaned = cleanedLines.join('\n');

    // Remove multiple consecutive blank lines
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remove trailing whitespace from each line
    cleaned = cleaned.split('\n').map(l => l.trimEnd()).join('\n');

    // Trim overall
    cleaned = cleaned.trim();

    // If we ended up with very little content, return something meaningful
    if (cleaned.length < 10) {
        // Try to extract at least the first meaningful sentence from original
        const original = text.split('\n').find(l => l.trim().length > 20 && !l.trim().startsWith('>'));
        if (original) {
            return original.trim().substring(0, 300);
        }
    }

    return cleaned;
};

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
                const fullContent = cleanEmailBody(fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(rawFullContent))));
                const previewContent = cleanEmailBody(fixSwedishEncoding(decodeHTML(decodeQuotedPrintable(rawPreviewContent))));

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
                    hasMore: fullContent.length > 300,
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
                    <div className="space-y-4 sm:space-y-6 border-l-2 border-muted pl-4 sm:pl-6 relative">
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

// Separate component for each timeline item to handle expand state
const TimelineItem = ({ item, onReply, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const isEmail = item.type === 'email';
    const Icon = isEmail ? Mail : FileText;
    const sourceLabel = isEmail ? 'Mejl' : 'Formulär';

    // Format timestamp with edge case handling
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
    const canExpand = item.hasMore && item.fullContent;

    return (
        <div className="relative">
            <span className="absolute -left-[21px] sm:-left-[31px] top-1 bg-background border-2 border-primary rounded-full w-3 h-3 sm:w-4 sm:h-4" />
            <div className="flex flex-col gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">
                    <span className="hidden sm:inline">{formattedDate}</span>
                    <span className="sm:hidden">{shortDate}</span>
                </span>
                <div className="font-semibold text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span>{sourceLabel}</span>
                    {isEmail && item.direction === 'outbound' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">skickat</span>
                    )}
                </div>
                {item.title && item.type === 'email' && (
                    <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {item.title}
                    </div>
                )}
                <div className="text-xs sm:text-sm text-foreground">
                    {item.from_label}
                </div>
                {displayContent && (
                    <p className={`text-xs sm:text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words ${!expanded ? 'line-clamp-4' : ''}`}>
                        {displayContent}
                    </p>
                )}
                {/* Action buttons row */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {canExpand && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline py-1"
                        >
                            {expanded ? (
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

                    {/* Reply button - only for emails */}
                    {item.type === 'email' && (
                        <button
                            onClick={() => onReply?.(item)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
                        >
                            <Reply className="h-3 w-3" />
                            Svara
                        </button>
                    )}

                    {/* Delete button - for emails only (form submissions should not be deleted from here) */}
                    {item.type === 'email' && (
                        <button
                            onClick={() => onDelete?.(item)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
                        >
                            <Trash2 className="h-3 w-3" />
                            Radera
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
