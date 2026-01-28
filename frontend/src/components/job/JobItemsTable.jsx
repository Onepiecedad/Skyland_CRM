import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { ITEM_TYPE_LABELS } from '../../lib/jobConstants';

/**
 * Table component for job items (articles and labor)
 */
export const JobItemsTable = ({
    items,
    onAddItem,
    onDeleteItem
}) => {
    const [addingItem, setAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        item_type: 'labor',
        description: '',
        quantity: 1,
        unit: 'st',
        unit_price: 0
    });

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    };

    const handleAddItemClick = async () => {
        if (!newItem.description.trim()) {
            alert('Beskrivning krävs');
            return;
        }

        const success = await onAddItem(newItem);
        if (success) {
            setNewItem({
                item_type: 'labor',
                description: '',
                quantity: 1,
                unit: 'st',
                unit_price: 0
            });
            setAddingItem(false);
        }
    };

    const handleCancelAdd = () => {
        setAddingItem(false);
        setNewItem({
            item_type: 'labor',
            description: '',
            quantity: 1,
            unit: 'st',
            unit_price: 0
        });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Artiklar & Timmar</CardTitle>
                    <Button size="sm" onClick={() => setAddingItem(true)} disabled={addingItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Lägg till rad
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {items.length === 0 && !addingItem ? (
                    <p className="text-center text-muted-foreground py-8">
                        Inga artiklar tillagda än
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Typ</TableHead>
                                    <TableHead>Beskrivning</TableHead>
                                    <TableHead className="text-right">Antal</TableHead>
                                    <TableHead className="text-right">Pris</TableHead>
                                    <TableHead className="text-right">Summa</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {ITEM_TYPE_LABELS[item.item_type]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">
                                            {item.quantity} {item.unit}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.unit_price?.toLocaleString('sv-SE')} kr
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {item.total_price?.toLocaleString('sv-SE')} kr
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteItem(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {addingItem && (
                                    <TableRow>
                                        <TableCell>
                                            <Select
                                                value={newItem.item_type}
                                                onValueChange={(value) => setNewItem({ ...newItem, item_type: value })}
                                            >
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(ITEM_TYPE_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                placeholder="Beskrivning"
                                                value={newItem.description}
                                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Input
                                                    type="number"
                                                    className="w-16 text-right"
                                                    value={newItem.quantity}
                                                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                                />
                                                <Input
                                                    className="w-16"
                                                    value={newItem.unit}
                                                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="w-24 text-right"
                                                value={newItem.unit_price}
                                                onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {((parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unit_price) || 0)).toLocaleString('sv-SE')} kr
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button size="sm" onClick={handleAddItemClick}>
                                                    <Save className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={handleCancelAdd}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {items.length > 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-right font-bold">
                                            Totalt:
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {calculateTotal().toLocaleString('sv-SE')} kr
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
