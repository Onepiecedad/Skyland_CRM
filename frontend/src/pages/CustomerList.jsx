import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    AlertCircle,
    RefreshCw,
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Trash2,
    Mail
} from 'lucide-react';

export const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleting, setDeleting] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch customers with message count
            const { data, error: fetchError } = await supabase
                .from('customers')
                .select(`
                    *,
                    messages:messages(count)
                `);

            if (fetchError) throw fetchError;

            // Transform to include message count
            const customersWithCount = (data || []).map(customer => ({
                ...customer,
                message_count: customer.messages?.[0]?.count || 0
            }));

            setCustomers(customersWithCount);
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('Kunde inte ladda kundlistan. Försök igen.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // Filter and sort
    const filteredAndSorted = useMemo(() => {
        let result = [...customers];

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(c =>
                (c.name || '').toLowerCase().includes(query) ||
                (c.email || '').toLowerCase().includes(query) ||
                (c.phone || '').toLowerCase().includes(query)
            );
        }

        // Sort
        result.sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            // Handle nulls
            if (aVal == null) aVal = '';
            if (bVal == null) bVal = '';

            // Special handling for dates
            if (sortField === 'created_at') {
                aVal = new Date(aVal || 0).getTime();
                bVal = new Date(bVal || 0).getTime();
            }

            // Special handling for message count (numeric)
            if (sortField === 'message_count') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }

            // Compare
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [customers, searchQuery, sortField, sortDirection]);

    const toggleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAndSorted.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAndSorted.map(c => c.id)));
        }
    };

    const handleDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmMessage = `Är du säker på att du vill ta bort ${selectedIds.size} kund${selectedIds.size > 1 ? 'er' : ''}? Detta tar även bort alla meddelanden kopplade till dessa kunder.`;

        if (!window.confirm(confirmMessage)) return;

        setDeleting(true);
        try {
            const idsArray = Array.from(selectedIds);

            // Delete messages first (foreign key constraint)
            const { error: messagesError } = await supabase
                .from('messages')
                .delete()
                .in('customer_id', idsArray);

            if (messagesError) throw messagesError;

            // Delete customers
            const { error: customersError } = await supabase
                .from('customers')
                .delete()
                .in('id', idsArray);

            if (customersError) throw customersError;

            // Update local state
            setCustomers(prev => prev.filter(c => !selectedIds.has(c.id)));
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Error deleting customers:', err);
            alert('Kunde inte ta bort kunder. Försök igen.');
        } finally {
            setDeleting(false);
        }
    };

    const SortableHeader = ({ field, children, className = '' }) => (
        <TableHead
            className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
            onClick={() => toggleSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortField === field ? (
                    sortDirection === 'asc' ?
                        <ArrowUp className="h-3 w-3" /> :
                        <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                )}
            </div>
        </TableHead>
    );

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
                <div className="text-sm text-muted-foreground">
                    {filteredAndSorted.length} av {customers.length} kunder
                </div>
            </div>

            {/* Search and actions bar */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Sök på namn, email eller telefon..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {selectedIds.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Ta bort ({selectedIds.size})
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                    <Checkbox
                                        checked={filteredAndSorted.length > 0 && selectedIds.size === filteredAndSorted.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <SortableHeader field="name">Namn</SortableHeader>
                                <SortableHeader field="email">Email</SortableHeader>
                                <SortableHeader field="phone">Telefon</SortableHeader>
                                <SortableHeader field="message_count" className="w-[100px]">
                                    <Mail className="h-4 w-4" />
                                </SortableHeader>
                                <SortableHeader field="created_at" className="w-[120px]">Skapad</SortableHeader>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSorted.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        {searchQuery ? 'Inga kunder matchar sökningen' : 'Inga kunder ännu'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSorted.map((customer) => (
                                    <TableRow
                                        key={customer.id}
                                        className={`group hover:bg-muted/50 ${selectedIds.has(customer.id) ? 'bg-muted/30' : ''}`}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.has(customer.id)}
                                                onCheckedChange={() => toggleSelect(customer.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <Link
                                                to={`/kund/${customer.id}`}
                                                className="hover:text-primary hover:underline"
                                            >
                                                {customer.name || 'Okänd'}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {customer.email || '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {customer.phone || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {customer.message_count > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    {customer.message_count}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {customer.created_at ?
                                                format(new Date(customer.created_at), 'd MMM yyyy', { locale: sv })
                                                : '-'
                                            }
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
