import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jobsAPI, jobItemsAPI } from '../lib/api';
import { formatCustomerName } from '../lib/formatName';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    AlertCircle,
    RefreshCw,
    Pencil,
    Save,
    X,
    ArrowLeft,
    Phone,
    Mail as MailIcon,
    Calendar,
    Wrench,
    Plus,
    Trash2
} from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Väntande',
    scheduled: 'Inbokad',
    in_progress: 'Pågående',
    waiting_parts: 'Väntar reservdelar',
    completed: 'Klar',
    invoiced: 'Fakturerad',
    cancelled: 'Avbruten'
};

const STATUS_COLORS = {
    pending: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_parts: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    invoiced: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
};

const JOB_TYPE_LABELS = {
    service: 'Service',
    repair: 'Reparation',
    installation: 'Installation',
    inspection: 'Besiktning',
    winterization: 'Förvintring',
    launch: 'Sjösättning'
};

const LOCATION_LABELS = {
    workshop: 'Verkstad',
    marina: 'Marina',
    customer_location: 'Kundens plats',
    sea_trial: 'Provtur'
};

const ITEM_TYPE_LABELS = {
    labor: 'Arbete',
    part: 'Reservdel',
    material: 'Material',
    other: 'Övrigt'
};

export const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    // Job items state
    const [items, setItems] = useState([]);
    const [addingItem, setAddingItem] = useState(false);
    const [newItem, setNewItem] = useState({
        item_type: 'labor',
        description: '',
        quantity: 1,
        unit: 'st',
        unit_price: 0
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await jobsAPI.getById(id);
            const jobData = response.data;
            setJob(jobData);
            setEditForm(jobData);
            setItems(jobData.items || []);
        } catch (err) {
            console.error('Error fetching job details:', err);
            setError('Kunde inte ladda jobbdata. Försök igen.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const handleEditChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await jobsAPI.update(id, {
                title: editForm.title,
                description: editForm.description,
                job_type: editForm.job_type,
                status: editForm.status,
                scheduled_date: editForm.scheduled_date,
                scheduled_time: editForm.scheduled_time,
                location: editForm.location,
                location_details: editForm.location_details,
                estimated_hours: editForm.estimated_hours,
                actual_hours: editForm.actual_hours,
                hourly_rate: editForm.hourly_rate,
                notes: editForm.notes,
                internal_notes: editForm.internal_notes
            });

            setJob(editForm);
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving job:', err);
            alert('Kunde inte spara ändringar. Försök igen.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditForm(job);
        setIsEditing(false);
    };

    // Quick status change without entering edit mode
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const handleQuickStatus = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await jobsAPI.update(id, { status: newStatus });
            setJob({ ...job, status: newStatus });
            setEditForm({ ...editForm, status: newStatus });
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Kunde inte uppdatera status. Försök igen.');
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Get the next logical status for quick actions
    const getQuickActions = () => {
        const actions = [];
        switch (job.status) {
            case 'pending':
                actions.push({ status: 'scheduled', label: 'Boka in', variant: 'outline' });
                actions.push({ status: 'in_progress', label: 'Starta', variant: 'default' });
                break;
            case 'scheduled':
                actions.push({ status: 'in_progress', label: 'Starta', variant: 'default' });
                break;
            case 'in_progress':
                actions.push({ status: 'waiting_parts', label: 'Väntar delar', variant: 'outline' });
                actions.push({ status: 'completed', label: 'Markera klar', variant: 'default' });
                break;
            case 'waiting_parts':
                actions.push({ status: 'in_progress', label: 'Fortsätt', variant: 'default' });
                break;
            case 'completed':
                actions.push({ status: 'invoiced', label: 'Fakturera', variant: 'default' });
                break;
            default:
                break;
        }
        return actions;
    };

    const handleAddItem = async () => {
        if (!newItem.description.trim()) {
            alert('Beskrivning krävs');
            return;
        }

        try {
            const itemData = {
                job_id: id,
                ...newItem,
                total_price: (parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unit_price) || 0)
            };

            const response = await jobItemsAPI.create(itemData);
            setItems([...items, response.data]);
            setNewItem({
                item_type: 'labor',
                description: '',
                quantity: 1,
                unit: 'st',
                unit_price: 0
            });
            setAddingItem(false);
        } catch (err) {
            console.error('Error adding item:', err);
            alert('Kunde inte lägga till rad. Försök igen.');
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Är du säker på att du vill ta bort denna rad?')) return;

        try {
            await jobItemsAPI.delete(itemId);
            setItems(items.filter(i => i.id !== itemId));
        } catch (err) {
            console.error('Error deleting item:', err);
            alert('Kunde inte ta bort rad. Försök igen.');
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    };

    const handleDeleteJob = async () => {
        try {
            await jobsAPI.delete(id);
            toast.success('Jobbet har tagits bort');
            navigate('/jobb');
        } catch (err) {
            console.error('Error deleting job:', err);
            toast.error('Kunde inte ta bort jobbet');
            throw err;
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4 sm:p-6">
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="container mx-auto p-4 sm:p-6">
                <Card className="max-w-md mx-auto">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <AlertCircle className="h-10 w-10 text-destructive" />
                            <p className="text-muted-foreground">{error || 'Jobbet kunde inte hittas'}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => navigate('/jobb')}>
                                    Tillbaka till jobb
                                </Button>
                                {error && (
                                    <Button onClick={fetchData}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Försök igen
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Jobb', href: '/jobb' },
                    { label: job.title || 'Jobb' }
                ]}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{job.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className={STATUS_COLORS[job.status]}>
                                {STATUS_LABELS[job.status]}
                            </Badge>
                            {job.job_type && (
                                <Badge variant="outline">
                                    {JOB_TYPE_LABELS[job.job_type]}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Quick status actions */}
                    {!isEditing && getQuickActions().map((action) => (
                        <Button
                            key={action.status}
                            variant={action.variant}
                            size="sm"
                            onClick={() => handleQuickStatus(action.status)}
                            disabled={updatingStatus}
                        >
                            {updatingStatus ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            {action.label}
                        </Button>
                    ))}

                    {/* Edit buttons */}
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={handleCancel} disabled={saving}>
                                <X className="h-4 w-4 mr-2" />
                                Avbryt
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Sparar...' : 'Spara'}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Redigera
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Job details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Jobbinformation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div>
                                        <Label>Titel</Label>
                                        <Input
                                            value={editForm.title || ''}
                                            onChange={(e) => handleEditChange('title', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label>Beskrivning</Label>
                                        <Textarea
                                            value={editForm.description || ''}
                                            onChange={(e) => handleEditChange('description', e.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Typ</Label>
                                            <Select
                                                value={editForm.job_type || ''}
                                                onValueChange={(value) => handleEditChange('job_type', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Välj typ" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(JOB_TYPE_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Status</Label>
                                            <Select
                                                value={editForm.status || 'pending'}
                                                onValueChange={(value) => handleEditChange('status', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Inbokad datum</Label>
                                            <Input
                                                type="date"
                                                value={editForm.scheduled_date || ''}
                                                onChange={(e) => handleEditChange('scheduled_date', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Tid</Label>
                                            <Input
                                                type="time"
                                                value={editForm.scheduled_time || ''}
                                                onChange={(e) => handleEditChange('scheduled_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Plats</Label>
                                            <Select
                                                value={editForm.location || ''}
                                                onValueChange={(value) => handleEditChange('location', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Välj plats" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(LOCATION_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Platsdetaljer</Label>
                                            <Input
                                                value={editForm.location_details || ''}
                                                onChange={(e) => handleEditChange('location_details', e.target.value)}
                                                placeholder="T.ex. Brygga 5"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>Uppskattade timmar</Label>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                value={editForm.estimated_hours || ''}
                                                onChange={(e) => handleEditChange('estimated_hours', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Faktiska timmar</Label>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                value={editForm.actual_hours || ''}
                                                onChange={(e) => handleEditChange('actual_hours', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <Label>Timpris (SEK)</Label>
                                            <Input
                                                type="number"
                                                value={editForm.hourly_rate || 850}
                                                onChange={(e) => handleEditChange('hourly_rate', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Anteckningar (synliga för kund)</Label>
                                        <Textarea
                                            value={editForm.notes || ''}
                                            onChange={(e) => handleEditChange('notes', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <Label>Interna anteckningar</Label>
                                        <Textarea
                                            value={editForm.internal_notes || ''}
                                            onChange={(e) => handleEditChange('internal_notes', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {job.description && (
                                        <div>
                                            <Label className="text-muted-foreground">Beskrivning</Label>
                                            <p className="mt-1">{job.description}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        {job.scheduled_date && (
                                            <div>
                                                <Label className="text-muted-foreground">Inbokad</Label>
                                                <p className="mt-1 flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    {format(new Date(job.scheduled_date), 'PPP', { locale: sv })}
                                                    {job.scheduled_time && ` kl ${job.scheduled_time}`}
                                                </p>
                                            </div>
                                        )}
                                        {job.location && (
                                            <div>
                                                <Label className="text-muted-foreground">Plats</Label>
                                                <p className="mt-1">
                                                    {LOCATION_LABELS[job.location]}
                                                    {job.location_details && ` - ${job.location_details}`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {(job.estimated_hours || job.actual_hours) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {job.estimated_hours && (
                                                <div>
                                                    <Label className="text-muted-foreground">Uppskattade timmar</Label>
                                                    <p className="mt-1">{job.estimated_hours} tim</p>
                                                </div>
                                            )}
                                            {job.actual_hours && (
                                                <div>
                                                    <Label className="text-muted-foreground">Faktiska timmar</Label>
                                                    <p className="mt-1">{job.actual_hours} tim</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {job.notes && (
                                        <div>
                                            <Label className="text-muted-foreground">Anteckningar</Label>
                                            <p className="mt-1 whitespace-pre-wrap">{job.notes}</p>
                                        </div>
                                    )}
                                    {job.internal_notes && (
                                        <div className="bg-yellow-50 p-3 rounded-md">
                                            <Label className="text-muted-foreground">Interna anteckningar</Label>
                                            <p className="mt-1 whitespace-pre-wrap text-sm">{job.internal_notes}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Job Items */}
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
                                                            onClick={() => handleDeleteItem(item.id)}
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
                                                            <Button size="sm" onClick={handleAddItem}>
                                                                <Save className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setAddingItem(false);
                                                                    setNewItem({
                                                                        item_type: 'labor',
                                                                        description: '',
                                                                        quantity: 1,
                                                                        unit: 'st',
                                                                        unit_price: 0
                                                                    });
                                                                }}
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
                </div>

                {/* Right column - Customer & Boat info */}
                <div className="space-y-6">
                    {/* Customer */}
                    {job.customer && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Kund</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Link
                                        to={`/kund/${job.customer.id}`}
                                        className="text-lg font-medium text-primary hover:underline"
                                    >
                                        {formatCustomerName(job.customer.name)}
                                    </Link>
                                </div>
                                {job.customer.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <MailIcon className="h-4 w-4 text-muted-foreground" />
                                        <a href={`mailto:${job.customer.email}`} className="hover:underline">
                                            {job.customer.email}
                                        </a>
                                    </div>
                                )}
                                {job.customer.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${job.customer.phone}`} className="hover:underline">
                                            {job.customer.phone}
                                        </a>
                                    </div>
                                )}
                                {job.customer.address && (
                                    <div className="text-sm text-muted-foreground">
                                        {job.customer.address}
                                        {job.customer.postal_code && job.customer.city && (
                                            <><br />{job.customer.postal_code} {job.customer.city}</>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Boat */}
                    {job.boat && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Båt</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <p className="font-medium">
                                        {job.boat.make} {job.boat.model}
                                    </p>
                                    {job.boat.year && (
                                        <p className="text-sm text-muted-foreground">Årsmodell {job.boat.year}</p>
                                    )}
                                </div>
                                {job.boat.registration_number && (
                                    <div>
                                        <Label className="text-muted-foreground">Registreringsnummer</Label>
                                        <p className="mt-1 font-mono">{job.boat.registration_number}</p>
                                    </div>
                                )}
                                {(job.boat.engine_make || job.boat.engine_model) && (
                                    <div>
                                        <Label className="text-muted-foreground">Motor</Label>
                                        <p className="mt-1">
                                            {job.boat.engine_make} {job.boat.engine_model}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div>
                                <Label className="text-muted-foreground">Skapad</Label>
                                <p className="mt-1">
                                    {format(new Date(job.created_at), 'PPP', { locale: sv })}
                                </p>
                            </div>
                            {job.updated_at && job.updated_at !== job.created_at && (
                                <div>
                                    <Label className="text-muted-foreground">Uppdaterad</Label>
                                    <p className="mt-1">
                                        {format(new Date(job.updated_at), 'PPP', { locale: sv })}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Delete Job */}
                    <Card className="border-destructive/30">
                        <CardHeader>
                            <CardTitle className="text-destructive">Farozon</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Att ta bort ett jobb är permanent och kan inte ångras. Alla tillhörande artiklar och timmar tas också bort.
                            </p>
                            <DeleteConfirmDialog
                                title="Ta bort jobb"
                                description={`Är du säker på att du vill ta bort "${job.title}"? Detta inkluderar alla artiklar och timmar. Åtgärden kan inte ångras.`}
                                onConfirm={handleDeleteJob}
                            >
                                <Button variant="destructive" className="w-full">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Ta bort jobb
                                </Button>
                            </DeleteConfirmDialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
