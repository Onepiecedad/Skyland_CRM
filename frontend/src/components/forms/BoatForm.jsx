import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { boatsAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Ship, Save, X } from 'lucide-react';

export function BoatForm({ boat, customerId, onSuccess, children }) {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: boat?.name || '',
        model: boat?.model || '',
        year: boat?.year || '',
        registration_number: boat?.registration_number || '',
        engine_type: boat?.engine_type || '',
        engine_hours: boat?.engine_hours || '',
        length_meters: boat?.length_meters || '',
        notes: boat?.notes || '',
    });

    const isEditing = !!boat;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name.trim()) {
            toast.error('Båtnamn krävs');
            return;
        }

        setSaving(true);
        try {
            const boatData = {
                ...form,
                customer_id: customerId,
                year: form.year ? parseInt(form.year) : null,
                engine_hours: form.engine_hours ? parseInt(form.engine_hours) : null,
                length_meters: form.length_meters ? parseFloat(form.length_meters) : null,
            };

            if (isEditing) {
                await boatsAPI.update(boat.id, boatData);
                toast.success('Båt uppdaterad');
            } else {
                await boatsAPI.create(boatData);
                toast.success('Båt tillagd');
            }

            setOpen(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error saving boat:', error);
            toast.error('Kunde inte spara båt');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field) => (e) => {
        setForm({ ...form, [field]: e.target.value });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant={isEditing ? "ghost" : "outline"} size={isEditing ? "icon" : "sm"}>
                        {isEditing ? <Pencil className="h-4 w-4" /> : (
                            <>
                                <Plus className="h-4 w-4 mr-1" />
                                Lägg till båt
                            </>
                        )}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ship className="h-5 w-5" />
                        {isEditing ? 'Redigera båt' : 'Lägg till båt'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label htmlFor="name">Båtnamn *</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={handleChange('name')}
                                placeholder="t.ex. Havanna"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="model">Modell</Label>
                            <Input
                                id="model"
                                value={form.model}
                                onChange={handleChange('model')}
                                placeholder="t.ex. Nimbus 365"
                            />
                        </div>
                        <div>
                            <Label htmlFor="year">Årsmodell</Label>
                            <Input
                                id="year"
                                type="number"
                                value={form.year}
                                onChange={handleChange('year')}
                                placeholder="t.ex. 2019"
                            />
                        </div>
                        <div>
                            <Label htmlFor="registration_number">Reg.nummer</Label>
                            <Input
                                id="registration_number"
                                value={form.registration_number}
                                onChange={handleChange('registration_number')}
                                placeholder="t.ex. ABC123"
                            />
                        </div>
                        <div>
                            <Label htmlFor="length_meters">Längd (m)</Label>
                            <Input
                                id="length_meters"
                                type="number"
                                step="0.1"
                                value={form.length_meters}
                                onChange={handleChange('length_meters')}
                                placeholder="t.ex. 10.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="engine_type">Motortyp</Label>
                            <Input
                                id="engine_type"
                                value={form.engine_type}
                                onChange={handleChange('engine_type')}
                                placeholder="t.ex. Volvo Penta D4"
                            />
                        </div>
                        <div>
                            <Label htmlFor="engine_hours">Motortimmar</Label>
                            <Input
                                id="engine_hours"
                                type="number"
                                value={form.engine_hours}
                                onChange={handleChange('engine_hours')}
                                placeholder="t.ex. 450"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="notes">Anteckningar</Label>
                            <Input
                                id="notes"
                                value={form.notes}
                                onChange={handleChange('notes')}
                                placeholder="Eventuella anteckningar..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                            <X className="h-4 w-4 mr-1" />
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={saving}>
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? 'Sparar...' : (isEditing ? 'Uppdatera' : 'Lägg till')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
