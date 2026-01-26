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
    Minimize2
} from 'lucide-react';

// System prompt för AI:n med CRM-kontext
const getSystemPrompt = (context) => `Du är en hjälpsam AI-assistent för Skyland CRM - ett kundhanteringssystem för marinmekaniker Thomas Guldager.

DINA ROLLER:
1. Svara på frågor om kunder, leads, jobb och meddelanden
2. Hjälpa till att formulera professionella mail och svar
3. Ge översikter och statistik
4. Söka och hitta information i ALL data

REGLER:
- Svara ALLTID på svenska
- Var koncis och hjälpsam
- Om du hittar en match, ge detaljerad info
- Om du inte hittar något, var ärlig och föreslå alternativ
- Formatera svar med emojis för att göra dem lättlästa
- När någon frågar om en person, sök i ALLA tabeller (kunder, leads, meddelanden)

NUVARANDE DATA I CRM:
- Totalt ${context?.stats?.leads || 0} leads, ${context?.stats?.customers || 0} kunder, ${context?.stats?.jobs || 0} jobb, ${context?.stats?.messages || 0} meddelanden

SENASTE LEADS (förfrågningar att svara på):
${context?.recentLeads?.length > 0
        ? context.recentLeads.map(l => `• ${l.name || 'Okänd'} (${l.email || 'ingen email'}): "${l.ai_summary || l.subject || 'Ingen beskrivning'}" [${l.ai_category || 'Okategoriserad'}]`).join('\n')
        : '(Inga leads)'}

KUNDER I SYSTEMET:
${context?.recentCustomers?.length > 0
        ? context.recentCustomers.map(c => `• ${c.name || 'Okänd'}: Båt: ${c.boat_model || 'Okänd'}, Motor: ${c.engine_brand || 'Okänd'}, Tel: ${c.phone || 'Saknas'}, Email: ${c.email || 'Saknas'}`).join('\n')
        : '(Inga kunder)'}

AKTIVA JOBB:
${context?.activeJobs?.length > 0
        ? context.activeJobs.map(j => `• ${j.title || 'Utan titel'}: Status ${j.status}, Schemalagt: ${j.scheduled_date || 'Ej schemalagt'}`).join('\n')
        : '(Inga aktiva jobb)'}

SENASTE MEDDELANDEN (mail-korrespondens):
${context?.recentMessages?.length > 0
        ? context.recentMessages.map(m => `• ${m.direction === 'inbound' ? '📥' : '📤'} Från: ${m.from_name || m.from_email || 'Okänd'} | Ämne: "${m.subject || 'Inget ämne'}" | Förhandsvisning: "${(m.body_preview || '').substring(0, 100)}..." | Datum: ${m.received_at ? new Date(m.received_at).toLocaleDateString('sv-SE') : 'Okänt'}`).join('\n')
        : '(Inga meddelanden)'}

Nuvarande datum: ${new Date().toLocaleDateString('sv-SE')}`;

export function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hej! 👋 Jag är din AI-assistent för CRM:et. Fråga mig om kunder, leads, jobb eller be mig hjälpa dig formulera mail!\n\nExempel:\n• "Berätta om Jan Gustafsson"\n• "Visa nya leads"\n• "Hur många kunder har vi?"\n• "Skriv ett mail till..."'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [crmContext, setCrmContext] = useState(null);
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

            // Hämta senaste meddelanden
            const { data: messagesData } = await supabase
                .from('messages')
                .select('id, subject, from_email, from_name, to_email, direction, received_at, body_preview, customer_id')
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
                recentMessages: messagesData || []
            };

            setCrmContext(context);
            return context;
        } catch (error) {
            console.error('Error fetching CRM context:', error);
            return null;
        }
    };

    // Anropa AI via Supabase Edge Function (säker - API-nyckel på servern)
    const callAI = async (messages, context) => {
        const systemMessage = { role: 'system', content: getSystemPrompt(context) };
        const allMessages = [systemMessage, ...messages.map(m => ({ role: m.role, content: m.content }))];

        const { data, error } = await supabase.functions.invoke('ai-assistant', {
            body: { messages: allMessages }
        });

        if (error) {
            throw new Error(error.message || 'AI-funktion fel');
        }

        if (data?.error) {
            throw new Error(data.error);
        }


        return data?.message || 'Kunde inte generera svar.';
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
            const assistantMessage = await callAI(
                newMessages.filter(m => m.role !== 'system').slice(-10),
                context
            );

            setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
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
