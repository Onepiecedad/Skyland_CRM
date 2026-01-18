import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft,
    Save,
    RefreshCw
} from 'lucide-react';

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

export const JobCreate = () => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [boats, setBoats] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        job_type: '',
        status: 'pending',
        customer_id: '',
        boat_id: '',
        scheduled_date: '',
        scheduled_time: '',
        location: '',
        location_details: '',
        estimated_hours: '',
        hourly_rate: 850,
        notes: '',
        internal_notes: ''
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (formData.customer_id) {
            fetchBoats(formData.customer_id);
        } else {
            setBoats([]);
        }
    }, [formData.customer_id]);

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, email')
                .order('name');

            if (error) throw error;
            setCustomers(data || []);
        } catch (err) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const fetchBoats = async (customerId) => {
        try {
            const { data, error } = await supabase
                .from('boats')
                .select('id, make, model, year')
                .eq('customer_id', customerId);

            if (error) throw error;
            setBoats(data || []);
        } catch (err) {
            console.error('Error fetching boats:', err);
            setBoats([]);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            alert('Titel krävs');
            return;
        }

        if (!formData.customer_id) {
            alert('Kund krävs');
            return;
        }

        setSaving(true);
        try {
            const jobData = {
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                job_type: formData.job_type || null,
                status: formData.status,
                customer_id: formData.customer_id,
                boat_id: formData.boat_id || null,
                scheduled_date: formData.scheduled_date || null,
                scheduled_time: formData.scheduled_time || null,
                location: formData.location || null,
                location_details: formData.location_details.trim() || null,
                estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
                hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 850,
                notes: formData.notes.trim() || null,
                internal_notes: formData.internal_notes.trim() || null
            };

            const response = await jobsAPI.create(jobData);

            if (response.data && response.data.id) {
                navigate(`/jobb/${response.data.id}`);
            } else {
                navigate('/jobb');
            }
        } catch (err) {
            console.error('Error creating job:', err);
            alert('Kunde inte skapa jobb. Försök igen.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/jobb')}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl sm:text-3xl font-bold">Nytt jobb</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => navigate('/jobb')} disabled={saving}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Skapar...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Skapa jobb
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Jobbinformation</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="title">Titel *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="T.ex. Motorservice Volvo Penta"
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="description">Beskrivning</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Detaljerad beskrivning av jobbet..."
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="job_type">Typ</Label>
                                        <Select value={formData.job_type} onValueChange={(value) => handleChange('job_type', value)}>
                                            <SelectTrigger id="job_type">
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
                                        <Label htmlFor="status">Status</Label>
                                        <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                                            <SelectTrigger id="status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Väntande</SelectItem>
                                                <SelectItem value="scheduled">Inbokad</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="scheduled_date">Inbokad datum</Label>
                                        <Input
                                            id="scheduled_date"
                                            type="date"
                                            value={formData.scheduled_date}
                                            onChange={(e) => handleChange('scheduled_date', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="scheduled_time">Tid</Label>
                                        <Input
                                            id="scheduled_time"
                                            type="time"
                                            value={formData.scheduled_time}
                                            onChange={(e) => handleChange('scheduled_time', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="location">Plats</Label>
                                        <Select value={formData.location} onValueChange={(value) => handleChange('location', value)}>
                                            <SelectTrigger id="location">
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
                                        <Label htmlFor="location_details">Platsdetaljer</Label>
                                        <Input
                                            id="location_details"
                                            value={formData.location_details}
                                            onChange={(e) => handleChange('location_details', e.target.value)}
                                            placeholder="T.ex. Brygga 5"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="estimated_hours">Uppskattade timmar</Label>
                                        <Input
                                            id="estimated_hours"
                                            type="number"
                                            step="0.5"
                                            value={formData.estimated_hours}
                                            onChange={(e) => handleChange('estimated_hours', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="hourly_rate">Timpris (SEK)</Label>
                                        <Input
                                            id="hourly_rate"
                                            type="number"
                                            value={formData.hourly_rate}
                                            onChange={(e) => handleChange('hourly_rate', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="notes">Anteckningar (synliga för kund)</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => handleChange('notes', e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="internal_notes">Interna anteckningar</Label>
                                    <Textarea
                                        id="internal_notes"
                                        value={formData.internal_notes}
                                        onChange={(e) => handleChange('internal_notes', e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Customer & Boat selection */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Kund *</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingCustomers ? (
                                    <div className="flex items-center justify-center py-4">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : (
                                    <Select value={formData.customer_id} onValueChange={(value) => handleChange('customer_id', value)} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Välj kund" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map((customer) => (
                                                <SelectItem key={customer.id} value={customer.id}>
                                                    {customer.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </CardContent>
                        </Card>

                        {formData.customer_id && boats.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Båt</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Select value={formData.boat_id} onValueChange={(value) => handleChange('boat_id', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Välj båt (valfritt)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boats.map((boat) => (
                                                <SelectItem key={boat.id} value={boat.id}>
                                                    {boat.make} {boat.model} {boat.year && `(${boat.year})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};
