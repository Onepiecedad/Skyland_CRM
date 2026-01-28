import { useState, useEffect } from 'react';
import { trashAPI } from '../lib/api';
import { Header } from '../components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Trash2,
    Mail,
    User,
    RotateCcw,
    AlertTriangle,
    RefreshCw,
    Trash as TrashIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

export const Trash = () => {
    const [messages, setMessages] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('messages');
    const [emptyingTrash, setEmptyingTrash] = useState(false);

    const fetchTrash = async () => {
        setLoading(true);
        try {
            const [messagesRes, customersRes] = await Promise.all([
                trashAPI.getMessages(),
                trashAPI.getCustomers()
            ]);
            setMessages(messagesRes.data || []);
            setCustomers(customersRes.data || []);
        } catch (error) {
            console.error('Error fetching trash:', error);
            toast.error('Kunde inte ladda papperskorgen');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, []);

    const handleRestoreMessage = async (messageId) => {
        try {
            await trashAPI.restoreMessage(messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));
            toast.success('Meddelande återställt');
        } catch (error) {
            toast.error('Kunde inte återställa meddelande');
        }
    };

    const handleRestoreCustomer = async (customerId) => {
        try {
            await trashAPI.restoreCustomer(customerId);
            setCustomers(prev => prev.filter(c => c.id !== customerId));
            toast.success('Kund återställd');
        } catch (error) {
            toast.error('Kunde inte återställa kund');
        }
    };

    const handlePermanentDeleteMessage = async (messageId) => {
        if (!window.confirm('Är du säker? Detta kan inte ångras.')) return;
        try {
            await trashAPI.permanentlyDeleteMessage(messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));
            toast.success('Meddelande raderat permanent');
        } catch (error) {
            toast.error('Kunde inte radera meddelande');
        }
    };

    const handlePermanentDeleteCustomer = async (customerId) => {
        if (!window.confirm('Är du säker? Detta kan inte ångras.')) return;
        try {
            await trashAPI.permanentlyDeleteCustomer(customerId);
            setCustomers(prev => prev.filter(c => c.id !== customerId));
            toast.success('Kund raderad permanent');
        } catch (error) {
            toast.error('Kunde inte radera kund');
        }
    };

    const handleEmptyTrash = async () => {
        if (!window.confirm('Töm hela papperskorgen? Detta raderar allt permanent och kan inte ångras.')) return;

        setEmptyingTrash(true);
        try {
            await trashAPI.emptyTrash();
            setMessages([]);
            setCustomers([]);
            toast.success('Papperskorgen tömd');
        } catch (error) {
            toast.error('Kunde inte tömma papperskorgen');
        } finally {
            setEmptyingTrash(false);
        }
    };

    const totalCount = messages.length + customers.length;

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col pb-24 md:pb-0">
            <Header />
            <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <Trash2 className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold">Papperskorg</h1>
                            <p className="text-sm text-muted-foreground">
                                {totalCount} {totalCount === 1 ? 'objekt' : 'objekt'}
                            </p>
                        </div>
                    </div>
                    {totalCount > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleEmptyTrash}
                            disabled={emptyingTrash}
                        >
                            {emptyingTrash ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <TrashIcon className="h-4 w-4 mr-2" />
                            )}
                            Töm papperskorg
                        </Button>
                    )}
                </div>

                {totalCount === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Trash2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">Papperskorgen är tom</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="messages" className="gap-2">
                                <Mail className="h-4 w-4" />
                                Meddelanden
                                {messages.length > 0 && (
                                    <Badge variant="secondary" className="ml-1">
                                        {messages.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="customers" className="gap-2">
                                <User className="h-4 w-4" />
                                Kunder
                                {customers.length > 0 && (
                                    <Badge variant="secondary" className="ml-1">
                                        {customers.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="messages">
                            <Card>
                                <CardContent className="divide-y p-0">
                                    {messages.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">
                                            Inga raderade meddelanden
                                        </p>
                                    ) : (
                                        messages.map((message) => (
                                            <div key={message.id} className="p-4 flex items-start gap-3">
                                                <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">
                                                        {message.subject || 'Inget ämne'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {message.from_name || message.from_email || 'Okänd avsändare'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Raderat {message.deleted_at && format(new Date(message.deleted_at), 'd MMM HH:mm', { locale: sv })}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRestoreMessage(message.id)}
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handlePermanentDeleteMessage(message.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="customers">
                            <Card>
                                <CardContent className="divide-y p-0">
                                    {customers.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-8">
                                            Inga raderade kunder
                                        </p>
                                    ) : (
                                        customers.map((customer) => (
                                            <div key={customer.id} className="p-4 flex items-start gap-3">
                                                <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">
                                                        {customer.name || 'Namnlös kund'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {customer.email || customer.phone || 'Ingen kontaktinfo'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Raderat {customer.deleted_at && format(new Date(customer.deleted_at), 'd MMM HH:mm', { locale: sv })}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRestoreCustomer(customer.id)}
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handlePermanentDeleteCustomer(customer.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {/* Warning */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                        <p className="font-medium">Observera</p>
                        <p>Objekt i papperskorgen raderas automatiskt efter 30 dagar. Permanent raderade objekt kan inte återställas.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};
