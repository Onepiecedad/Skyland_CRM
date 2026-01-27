import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    X,
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    ChevronDown,
    Minimize2,
    Mail,
    CheckCircle,
    XCircle
} from 'lucide-react';

// Helper function to clean email content for AI context
const cleanEmailForAI = (text) => {
    if (!text) return '';

    // Decode HTML entities
    let cleaned = text
        .replace(/&auml;/g, 'ä').replace(/&Auml;/g, 'Ä')
        .replace(/&ouml;/g, 'ö').replace(/&Ouml;/g, 'Ö')
        .replace(/&aring;/g, 'å').replace(/&Aring;/g, 'Å')
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

    // Strip HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // Fix Swedish encoding issues
    cleaned = cleaned
        .replace(/Ã¥/g, 'å').replace(/Ã…/g, 'Å')
        .replace(/Ã¤/g, 'ä').replace(/Ã„/g, 'Ä')
        .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö')
        .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è');

    // Remove quoted reply sections (common patterns)
    const cutoffPatterns = [
        /^Den \d{1,2} [a-zäöå]+ \d{4} .*skrev.*:/im,
        /^On .* wrote:/im,
        /^-{3,}\s*(Original|Ursprungligt)/im,
        /^From:.*?Sent:.*?To:/ims,
        /^_{3,}/m
    ];

    for (const pattern of cutoffPatterns) {
        const match = cleaned.match(pattern);
        if (match && match.index > 50) {
            cleaned = cleaned.substring(0, match.index).trim();
            break;
        }
    }

    // Remove lines starting with ">" (quoted text)
    cleaned = cleaned.split('\n')
        .filter(line => !line.trim().startsWith('>'))
        .join('\n');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Limit length for AI context (keep most important content)
    if (cleaned.length > 500) {
        cleaned = cleaned.substring(0, 500) + '...';
    }

    return cleaned || '(Tomt meddelande)';
};

// System prompt för AI:n med CRM-kontext
const getSystemPrompt = (context) => `Du är en hjälpsam AI-assistent för Skyland CRM - ett kundhanteringssystem för marinmekaniker Thomas Guldager.

DINA ROLLER:
1. Svara på frågor om kunder, leads, jobb och meddelanden
2. Hjälpa till att formulera professionella mail och svar
3. Ge översikter och statistik
4. Söka och hitta information i ALL data
5. SKICKA MAIL på kommando - du kan skicka riktiga mail!
6. REDIGERA KUNDER - uppdatera telefonnummer, email, båtmodell etc.
7. REDIGERA JOBB - ändra status, datum, beskrivning
8. SKAPA JOBB - skapa nya jobb för kunder

REGLER:
- Svara ALLTID på svenska
- Var koncis och hjälpsam
- Om du hittar en match, ge detaljerad info
- Om du inte hittar något, var ärlig och föreslå alternativ
- Formatera svar med emojis för att göra dem lättlästa
- När någon frågar om en person, sök i ALLA tabeller (kunder, leads, meddelanden)
- ALLA ändringar kräver bekräftelse från användaren!

DINA FUNKTIONER:
- send_email: Skicka mail (professionellt, signera med "Med vänliga hälsningar, Thomas Guldager / Marinmekaniker AB")
- update_customer: Uppdatera kundinformation (behöver customer_id från kontexten)
- update_job: Uppdatera jobb (behöver job_id från kontexten)
- create_job: Skapa nytt jobb för en kund (behöver customer_id)

NUVARANDE DATA I CRM:
- Totalt ${context?.stats?.leads || 0} leads, ${context?.stats?.customers || 0} kunder, ${context?.stats?.jobs || 0} jobb, ${context?.stats?.messages || 0} meddelanden

SENASTE LEADS (förfrågningar att svara på):
${context?.recentLeads?.length > 0
        ? context.recentLeads.map(l => `• ${l.name || 'Okänd'} (${l.email || 'ingen email'}): "${l.ai_summary || l.subject || 'Ingen beskrivning'}" [${l.ai_category || 'Okategoriserad'}]`).join('\n')
        : '(Inga leads)'}

KUNDER I SYSTEMET (ID för update_customer):
${context?.recentCustomers?.length > 0
        ? context.recentCustomers.map(c => `• [ID: ${c.id}] ${c.name || 'Okänd'}: Båt: ${c.boat_model || 'Okänd'}, Motor: ${c.engine_brand || 'Okänd'}, Tel: ${c.phone || 'Saknas'}, Email: ${c.email || 'Saknas'}`).join('\n')
        : '(Inga kunder)'}

AKTIVA JOBB (ID för update_job):
${context?.activeJobs?.length > 0
        ? context.activeJobs.map(j => `• [ID: ${j.id}] [Kund-ID: ${j.customer_id}] ${j.title || 'Utan titel'}: Status ${j.status}, Schemalagt: ${j.scheduled_date || 'Ej schemalagt'}`).join('\n')
        : '(Inga aktiva jobb)'}

SENASTE MEDDELANDEN (mail-korrespondens):
${context?.recentMessages?.length > 0
        ? context.recentMessages.map(m => {
            const content = cleanEmailForAI(m.body_full || m.body_preview || '');
            return `• ${m.direction === 'inbound' ? '📥 INKOMMANDE' : '📤 SKICKAT'} | Från: ${m.from_name || m.from_email || 'Okänd'} | Till: ${m.to_email || 'Okänd'} | Ämne: "${m.subject || 'Inget ämne'}" | Datum: ${m.received_at ? new Date(m.received_at).toLocaleDateString('sv-SE') : 'Okänt'}\n  Innehåll: ${content}`;
        }).join('\n\n')
        : '(Inga meddelanden)'}

Nuvarande datum: ${new Date().toLocaleDateString('sv-SE')}
Användaren befinner sig på: ${context?.currentPage || 'okänd sida'}`;

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hej! 👋 Jag är din AI-assistent för CRM:et. Jag kan svara på frågor om kunder och leads, och **skicka mail** åt dig!\n\nExempel:\n• "Berätta om Jan Gustafsson"\n• "Visa nya leads"\n• "Skicka mail till test@example.com och tacka för förfrågan"\n• "Svara på senaste mailet från..."'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [crmContext, setCrmContext] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const location = useLocation();

    // Scrolla till botten när nya meddelanden kommer
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Fokusera input när chatten öppnas
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized]);

    // Ladda CRM-kontext vid öppning
    useEffect(() => {
        if (isOpen && !crmContext) {
            loadCrmContext();
        }
    }, [isOpen]);

    // Dölj på login-sidan
    if (location.pathname === '/login') {
        return null;
    }

    // Hämta CRM-kontext för AI:n
    const loadCrmContext = async () => {
        try {
            // Hämta senaste leads
            const { data: leads } = await supabase
                .from('leads')
                .select('id, name, email, subject, ai_summary, ai_category, created_at')
                .order('created_at', { ascending: false })
                .limit(30);

            // Hämta alla kunder
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name, email, phone, boat_model, engine_brand')
                .order('created_at', { ascending: false })
                .limit(100);

            // Hämta aktiva jobb
            const { data: jobs } = await supabase
                .from('jobs')
                .select('id, title, status, scheduled_date, customer_id')
                .order('created_at', { ascending: false })
                .limit(30);

            // Hämta senaste meddelanden (inkl. body_full för fullständig AI-kontext)
            const { data: messagesData } = await supabase
                .from('messages')
                .select('id, subject, from_email, from_name, to_email, direction, received_at, body_preview, body_full, customer_id')
                .order('received_at', { ascending: false })
                .limit(30);

            // Hämta statistik
            const { count: leadsCount } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true });

            const { count: customersCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true });

            const { count: jobsCount } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true });

            const { count: messagesCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true });

            // Map pathname to readable page name
            const getPageName = (pathname) => {
                const pageMap = {
                    '/': 'Idag (Dashboard)',
                    '/leads': 'Leads',
                    '/customers': 'Kunder',
                    '/jobs': 'Jobb',
                    '/messages': 'Meddelanden',
                    '/calendar': 'Kalender',
                    '/settings': 'Inställningar'
                };
                return pageMap[pathname] || pathname;
            };

            const context = {
                stats: {
                    leads: leadsCount || 0,
                    customers: customersCount || 0,
                    jobs: jobsCount || 0,
                    messages: messagesCount || 0
                },
                recentLeads: leads || [],
                recentCustomers: customers || [],
                activeJobs: jobs || [],
                recentMessages: messagesData || [],
                currentPage: getPageName(location.pathname)
            };

            setCrmContext(context);
            return context;
        } catch (error) {
            console.error('Error fetching CRM context:', error);
            return null;
        }
    };

    // Anropa AI via Supabase Edge Function (säker - API-nyckel på servern)
    const callAI = async (messages, context, confirmAction = null) => {
        const systemMessage = { role: 'system', content: getSystemPrompt(context) };
        const allMessages = [systemMessage, ...messages.map(m => ({ role: m.role, content: m.content }))];

        const { data, error } = await supabase.functions.invoke('ai-assistant', {
            body: { messages: allMessages, confirmAction }
        });

        if (error) {
            throw new Error(error.message || 'AI-funktion fel');
        }

        if (data?.error) {
            throw new Error(data.error);
        }

        // Return full data to handle pendingAction
        return data;
    };

    // Skicka meddelande till AI
    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Uppdatera kontext om det behövs
            let context = crmContext;
            if (!context) {
                context = await loadCrmContext();
            }

            // Anropa AI via Edge Function
            const response = await callAI(
                newMessages.filter(m => m.role !== 'system').slice(-10),
                context
            );

            // Check if AI wants to perform an action (needs confirmation)
            if (response.pendingAction) {
                setPendingAction(response.pendingAction);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: response.message || 'Kunde inte generera svar.' }]);
        } catch (error) {
            console.error('AI Assistant error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Ett fel uppstod: ${error.message}\n\nFörsök igen.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Confirm the pending action
    const confirmActionHandler = async () => {
        if (!pendingAction) return;

        setIsLoading(true);
        try {
            const response = await callAI([], crmContext, pendingAction);
            setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
            setPendingAction(null);
            // Refresh context after data changes
            if (pendingAction.action !== 'send_email') {
                loadCrmContext();
            }
        } catch (error) {
            console.error('Error executing action:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ Kunde inte utföra åtgärden: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Cancel the pending action
    const cancelActionHandler = () => {
        setPendingAction(null);
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '👍 Okej, åtgärden avbröts. Behöver du hjälp med något annat?'
        }]);
    };

    // Stängd knapp
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 md:bottom-4 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
                aria-label="Öppna AI Assistent"
            >
                <Sparkles className="h-6 w-6 group-hover:animate-pulse" />
            </button>
        );
    }

    // Minimerad vy
    if (isMinimized) {
        return (
            <div className="fixed bottom-24 right-4 md:bottom-4 z-50 flex items-center gap-2">
                <button
                    onClick={() => setIsMinimized(false)}
                    className="bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">AI Assistent</span>
                    <ChevronDown className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    // Fullständig chatvy
    return (
        <div className="fixed bottom-24 right-4 md:bottom-4 z-50 w-[calc(100vw-2rem)] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-200">
            <Card className="shadow-2xl border-2 border-purple-200 dark:border-purple-800 overflow-hidden">
                {/* Header */}
                <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        AI Assistent
                        {crmContext && (
                            <span className="text-xs opacity-75 font-normal">
                                ({crmContext.stats.customers} kunder)
                            </span>
                        )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsMinimized(true)}
                            className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                            aria-label="Minimera"
                        >
                            <Minimize2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                            aria-label="Stäng"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="p-0">
                    <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50/50 to-background dark:from-purple-950/20">
                        {messages.map((message, i) => (
                            <div
                                key={i}
                                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${message.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-md'
                                        : 'bg-muted rounded-bl-md'
                                        }`}
                                >
                                    {message.content}
                                </div>
                                {message.role === 'user' && (
                                    <div className="h-7 w-7 rounded-full bg-primary/80 flex items-center justify-center shrink-0">
                                        <User className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 justify-start">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}

                        {/* Action confirmation buttons */}
                        {pendingAction && !isLoading && (
                            <div className="flex gap-2 justify-center mt-2">
                                <Button
                                    onClick={confirmActionHandler}
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {pendingAction.action === 'send_email' ? 'Skicka mail' : 'Bekräfta'}
                                </Button>
                                <Button
                                    onClick={cancelActionHandler}
                                    size="sm"
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Avbryt
                                </Button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t bg-background">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Fråga om kunder, leads, jobb..."
                                className="flex-1 px-4 py-2 rounded-full border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className="rounded-full bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            Powered by GPT-4o • Tryck Enter för att skicka
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
