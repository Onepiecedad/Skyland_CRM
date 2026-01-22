import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, leadsAPI } from '../lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Wrench, RefreshCw, ArrowRight } from 'lucide-react';

const JOB_TYPES = [
    { value: 'service', label: 'Service' },
    { value: 'repair', label: 'Reparation' },
    { value: 'installation', label: 'Installation' },
    { value: 'inspection', label: 'Besiktning' },
    { value: 'winterization', label: 'Förvintring' },
    { value: 'launch', label: 'Sjösättning' },
];

export function ConvertLeadToJobButton({ lead, onSuccess, variant = 'default', size = 'sm', className = '' }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        job_type: 'service',
        description: '',
        scheduled_date: '',
    });

    // Pre-fill form when lead changes
    const handleOpenChange = (isOpen) => {
        if (isOpen && lead) {
            // Generate a sensible title from lead info
            const title = lead.ai_summary || lead.summary || lead.subject || lead.name || 'Nytt jobb';
            const description = lead.message || lead.description || '';

            setFormData({
                title: title.substring(0, 100), // Limit title length
                job_type: mapCategoryToJobType(lead.ai_category),
                description: description,
                scheduled_date: '',
            });
        }
        setOpen(isOpen);
    };

    // Map AI category to job type
    const mapCategoryToJobType = (category) => {
        if (!category) return 'service';
        const mapping = {
            'SERVICE': 'service',
            'REPAIR': 'repair',
            'QUOTE': 'service',
            'BOOKING': 'service',
            'INQUIRY': 'service',
        };
        return mapping[category.toUpperCase()] || 'service';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Ange en titel för jobbet');
            return;
        }

        setLoading(true);
        try {
            // Create the job
            const jobData = {
                title: formData.title.trim(),
                job_type: formData.job_type,
                description: formData.description.trim() || null,
                customer_id: lead.customer_id,
                lead_id: lead.id || lead.lead_id,
                boat_id: lead.boat_id || null,
                status: formData.scheduled_date ? 'scheduled' : 'pending',
                scheduled_date: formData.scheduled_date || null,
            };

            const response = await jobsAPI.create(jobData);

            // Update lead status to 'won'
            await leadsAPI.update(lead.id || lead.lead_id, { status: 'won' });

            toast.success('Jobb skapat och förfrågan markerad som vunnen!');
            setOpen(false);

            if (onSuccess) {
                onSuccess(response.data);
            }

            // Navigate to the new job
            navigate(`/jobb/${response.data.id || response.data.job_id}`);
        } catch (err) {
            console.error('Error converting lead to job:', err);
            toast.error('Kunde inte skapa jobbet. Försök igen.');
        } finally {
            setLoading(false);
        }
    };

    if (!lead?.customer_id) {
        return null; // Can't create job without customer
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} className={className}>
                    <Wrench className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Skapa jobb</span>
                    <span className="sm:hidden">Jobb</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-green-600" />
                        Konvertera till jobb
                    </DialogTitle>
                    <DialogDescription>
                        Skapa ett nytt jobb från denna förfrågan. Förfrågan markeras automatiskt som vunnen.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="job-title">Jobbtitel *</Label>
                        <Input
                            id="job-title"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="T.ex. Service båtmotor"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="job-type">Jobbtyp</Label>
                        <Select
                            value={formData.job_type}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, job_type: value }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Välj typ" />
                            </SelectTrigger>
                            <SelectContent>
                                {JOB_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="job-date">Inbokningsdatum (valfritt)</Label>
                        <Input
                            id="job-date"
                            type="date"
                            value={formData.scheduled_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="job-description">Beskrivning</Label>
                        <Textarea
                            id="job-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Detaljer om arbetet..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                            className="w-full sm:w-auto"
                        >
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Skapar...
                                </>
                            ) : (
                                <>
                                    <Wrench className="h-4 w-4 mr-2" />
                                    Skapa jobb
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
