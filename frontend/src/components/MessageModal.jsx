import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { decodeHTML } from '../lib/textUtils';
import {
    X,
    User,
    Mail,
    Calendar,
    Reply,
    Trash2,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Send
} from 'lucide-react';
import { useState } from 'react';

/**
 * Avancerad textrensning för email-innehåll
 * Tar bort citerad historik och behåller bara det senaste meddelandet
 */
const cleanEmailContent = (text) => {
    if (!text) return '';

    // 1. Avkoda ALLA HTML-entiteter korrekt via DOM-parsing
    // Detta hanterar &ouml;, &auml;, &aring; och alla andra entiteter
    let cleaned = decodeHTML(text);

    // 2. Ta bort HTML-taggar och style-block
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n');
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // 3. Fixa svenska tecken (mojibake som kan finnas efter avkodning)
    const swedishFixes = {
        'Ã¥': 'å', 'Ã¤': 'ä', 'Ã¶': 'ö',
        'Ã…': 'Å', 'Ã„': 'Ä', 'Ã–': 'Ö',
        'Ã©': 'é', 'â€™': "'", 'â€œ': '"', 'â€': '"'
    };
    for (const [wrong, correct] of Object.entries(swedishFixes)) {
        cleaned = cleaned.replace(new RegExp(wrong, 'g'), correct);
    }

    // 4. Lägg till radbrytningar för bättre läsbarhet
    // 4a. Bryt efter meningar (punkt följt av mellanslag och versal)
    cleaned = cleaned.replace(/\.(\s+)([A-ZÅÄÖ])/g, '.\n\n$2');

    // 4b. Lägg till radbrytningar före vanliga nyckelord om de saknas
    const breakBeforePatterns = [
        /(?<!\n)(Hej\s)/gi,
        /(?<!\n)(Vad:)/gi,
        /(?<!\n)(Var:)/gi,
        /(?<!\n)(När:)/gi,
        /(?<!\n)(Snarast möjligt)/gi,
        /(?<!\n)(Antal företag)/gi,
        /(?<!\n)(Frågor och svar)/gi,
        /(?<!\n)(Beskriv vad)/gi,
        /(?<!\n)(Om du inte)/gi,
        /(?<!\n)(Ändra bevakningsprofil)/gi,
        /(?<!\n)(Vänliga hälsningar)/gi,
        /(?<!\n)(Med vänlig hälsning)/gi,
        /(?<!\n)(Mvh)/gi,
        /(?<!\n)(KUNDSERVICE)/gi,
        /(?<!\n)(Offerta\.se\s*-+>)/gi,
        // Tradit och liknande finansmail
        /(?<!\n)(LADDA NER)/gi,
        /(?<!\n)(Tveka inte)/gi,
        /(?<!\n)(Du har fått)/gi,
        /(?<!\n)(Märk våra)/gi,
        /(?<!\n)(Du bör överväga)/gi,
        /(?<!\n)(Närhelst)/gi,
        /(?<!\n)(Tradit ber dig)/gi,
        /(?<!\n)(CFD:er är)/gi,
    ];

    for (const pattern of breakBeforePatterns) {
        cleaned = cleaned.replace(pattern, '\n\n$1');
    }

    // 5. Normalisera multipla mellanslag och radbrytningar
    cleaned = cleaned.replace(/[ \t]+/g, ' ');  // Multipla mellanslag -> ett
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 radbrytningar i rad
    cleaned = cleaned.trim();

    return cleaned;
};

/**
 * Separera huvudmeddelande från citerad historik
 */
const separateMessageParts = (text) => {
    if (!text) return { main: '', history: '' };

    const cleaned = cleanEmailContent(text);

    // Mönster som indikerar start av citerad historik
    const historyPatterns = [
        // Svenska
        /Den\s+(mån|tis|ons|tors|fre|lör|sön)\.?\s+\d{1,2}\s+(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i,
        /\d{1,2}\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4},?\s+\d{1,2}:\d{2}/i,
        /centraleuropeisk\s+(normal)?tid/i,
        /skrev\s*:/i,
        // Engelska
        /On\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
        /wrote\s*:/i,
        // Generella
        /^-{3,}.*Original\s*Message/im,
        /^>{2,}/m,
        /^From:\s*.*@/im,
    ];

    let splitIndex = cleaned.length;

    for (const pattern of historyPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index !== undefined && match.index > 50 && match.index < splitIndex) {
            splitIndex = match.index;
        }
    }

    // Hitta rader som börjar med ">"
    const lines = cleaned.split('\n');
    let firstQuoteLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('>') && i > 3) {
            firstQuoteLine = i;
            break;
        }
    }

    if (firstQuoteLine > 0) {
        const charsBefore = lines.slice(0, firstQuoteLine).join('\n').length;
        if (charsBefore < splitIndex) {
            splitIndex = charsBefore;
        }
    }

    let main = cleaned.substring(0, splitIndex).trim();
    let history = cleaned.substring(splitIndex).trim();

    // Ta bort "Skickat från min iPhone" etc från main
    main = main.replace(/\n\s*(Skickat från min|Sent from my|Get Outlook).*/gi, '');

    // Rensa upp historyken - ta bort ledande ">" och extra whitespace
    if (history) {
        history = history
            .split('\n')
            .map(line => line.replace(/^>\s*/, ''))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // Ta bort multipla tomrader
    main = main.replace(/\n{3,}/g, '\n\n').trim();

    return { main, history };
};

/**
 * MessageModal - Apple-inspirerad modal för att visa email
 */
export function MessageModal({
    message,
    isOpen,
    onClose,
    onReply,
    onDelete,
    formatSenderName
}) {
    const [showHistory, setShowHistory] = useState(false);

    if (!message) return null;

    const content = message.body_full || message.body_preview || '';
    const { main: mainContent, history: historyContent } = separateMessageParts(content);

    // Format sender info
    let senderName = message.from_name;
    if (!senderName || senderName.trim() === '') {
        const emailMatch = message.from_email?.match(/^([^<]+)\s*<[^>]+>$/);
        if (emailMatch) {
            senderName = emailMatch[1].trim();
        } else if (message.customers?.name) {
            senderName = message.customers.name;
        } else {
            senderName = message.from_email || 'Okänd avsändare';
        }
    }

    // Clean up sender name from encoding issues
    senderName = cleanEmailContent(senderName);

    // Extract clean email
    let senderEmail = message.from_email || '';
    const emailExtract = senderEmail.match(/<([^>]+)>/);
    if (emailExtract) {
        senderEmail = emailExtract[1];
    }

    // Format date
    let formattedDate = 'Okänt datum';
    if (message.received_at) {
        try {
            formattedDate = format(
                new Date(message.received_at),
                "d MMMM yyyy 'kl' HH:mm",
                { locale: sv }
            );
        } catch (e) { }
    }

    // Subject
    const subject = cleanEmailContent(message.subject || 'Inget ämne');

    const isOutbound = message.direction === 'outbound';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-background border-b p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            {/* Sender info */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isOutbound
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {isOutbound ? <Send className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        {message.customers ? (
                                            <Link
                                                to={`/kund/${message.customers.id}`}
                                                className="font-semibold text-lg hover:text-primary transition-colors truncate"
                                                onClick={() => onClose()}
                                            >
                                                {senderName}
                                            </Link>
                                        ) : (
                                            <span className="font-semibold text-lg truncate">{senderName}</span>
                                        )}
                                        {message.customers && (
                                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{senderEmail}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-13">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>{formattedDate}</span>
                                {isOutbound && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                        Skickat
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="mt-4 pt-4 border-t">
                        <h2 className="font-medium text-base sm:text-lg leading-snug">
                            {subject}
                        </h2>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 overflow-y-auto max-h-[50vh]">
                    {/* Main message */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                            {mainContent || '(Inget innehåll)'}
                        </p>
                    </div>

                    {/* History toggle */}
                    {historyContent && (
                        <div className="mt-6 pt-4 border-t">
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showHistory ? (
                                    <>
                                        <ChevronUp className="h-4 w-4" />
                                        Dölj tidigare meddelanden
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4" />
                                        Visa tidigare meddelanden
                                    </>
                                )}
                            </button>

                            {showHistory && (
                                <div className="mt-4 pl-4 border-l-2 border-muted">
                                    <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                                        {historyContent}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="sticky bottom-0 bg-background border-t p-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {message.customers && (
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <Link to={`/kund/${message.customers.id}`} onClick={() => onClose()}>
                                    <User className="h-4 w-4 mr-2" />
                                    Visa kundkort
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(message.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>

                        {!isOutbound && (
                            <Button
                                size="sm"
                                onClick={() => onReply(message)}
                            >
                                <Reply className="h-4 w-4 mr-2" />
                                Svara
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
