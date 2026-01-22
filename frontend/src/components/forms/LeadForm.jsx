import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { leadsAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, FileText, Save, X } from 'lucide-react';

export function LeadForm({ lead = null, customerId = null, onSuccess, children }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: customerId || lead?.customer_id || '',
    subject: lead?.subject || '',
    message: lead?.message || '',
    ai_category: lead?.ai_category || '',
    status: lead?.status || 'new',
  });

  const isEditing = !!lead;

  const categories = [
    { value: 'QUOTE', label: 'Offert' },
    { value: 'SERVICE', label: 'Service' },
    { value: 'REPAIR', label: 'Reparation' },
    { value: 'INQUIRY', label: 'Förfrågan' },
    { value: 'BOOKING', label: 'Bokning' },
    { value: 'COMPLAINT', label: 'Reklamation' },
    { value: 'OTHER', label: 'Övrigt' },
  ];

  const statuses = [
    { value: 'new', label: 'Ny' },
    { value: 'open', label: 'Öppen' },
    { value: 'in_progress', label: 'Pågående' },
    { value: 'resolved', label: 'Löst' },
    { value: 'closed', label: 'Stängd' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject?.trim()) {
      toast.error('Ämne krävs');
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        customer_id: customerId || formData.customer_id,
        subject: formData.subject,
        message: formData.message,
        ai_category: formData.ai_category || null,
        status: formData.status,
      };

      if (isEditing) {
        await leadsAPI.update(lead.id || lead.lead_id, dataToSave);
        toast.success('Ärende uppdaterat');
      } else {
        await leadsAPI.create(dataToSave);
        toast.success('Ärende skapat');
      }

      if (onSuccess) {
        onSuccess();
      }

      setOpen(false);

      // Reset form if creating new lead
      if (!isEditing) {
        setFormData({
          customer_id: customerId || '',
          subject: '',
          message: '',
          ai_category: '',
          status: 'new',
        });
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error(isEditing ? 'Kunde inte uppdatera ärende' : 'Kunde inte skapa ärende');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleSelectChange = (field) => (value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={isEditing ? "ghost" : "outline"} size={isEditing ? "icon" : "sm"}>
            {isEditing ? <Pencil className="h-4 w-4" /> : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Nytt ärende
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? 'Redigera ärende' : 'Nytt ärende'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Ämne *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={handleInputChange('subject')}
              placeholder="t.ex. Service av utombordare"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ai_category">Kategori</Label>
              <Select value={formData.ai_category} onValueChange={handleSelectChange('ai_category')}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={handleSelectChange('status')}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="message">Beskrivning</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={handleInputChange('message')}
              placeholder="Beskriv ärendet..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Avbryt
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-1" />
              {loading ? 'Sparar...' : (isEditing ? 'Uppdatera' : 'Skapa')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}