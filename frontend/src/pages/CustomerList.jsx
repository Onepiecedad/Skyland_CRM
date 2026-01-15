import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCustomers = async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .order('updated_at', { ascending: false });

        if (fetchError) {
            console.error('Error fetching customers:', fetchError);
            setError('Kunde inte ladda kundlistan. Försök igen.');
        } else {
            setCustomers(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <AlertCircle className="h-10 w-10 text-destructive" />
                            <p className="text-muted-foreground">{error}</p>
                            <Button onClick={fetchCustomers}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Försök igen
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Kunder</h1>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Namn</TableHead>
                                <TableHead>Telefon</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Inga kunder ännu
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer) => (
                                    <TableRow key={customer.id} className="group cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium">
                                            <Link to={`/kund/${customer.id}`} className="block w-full h-full">
                                                {customer.name || 'Okänd'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link to={`/kund/${customer.id}`} className="block w-full h-full">
                                                {customer.phone || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Link to={`/kund/${customer.id}`} className="block w-full h-full">
                                                {customer.email || '-'}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link to={`/kund/${customer.id}`}>Visa</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};
