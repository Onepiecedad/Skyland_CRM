import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesAPI, customersAPI, jobsAPI, boatsAPI } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import {
    Camera,
    Image as ImageIcon,
    X,
    Loader2,
    User,
    Wrench,
    Ship,
    Calendar,
    Pin,
    Flag,
    Trash2
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

// Priority options
const PRIORITIES = [
    { value: 'low', label: 'Låg', color: 'bg-gray-100 text-gray-700' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'Hög', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'Brådskande', color: 'bg-red-100 text-red-700' },
];

// Common tags
const COMMON_TAGS = ['Uppföljning', 'Reservdel', 'Offert', 'Service', 'Reklamation', 'Påminnelse'];

export function QuickNoteModal({ isOpen, onClose, onSuccess, prefill = {} }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const textareaRef = useRef(null);

    // Form state
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('normal');
    const [selectedTags, setSelectedTags] = useState([]);
    const [reminderDate, setReminderDate] = useState('');
    const [isPinned, setIsPinned] = useState(false);

    // Entity linking
    const [customerId, setCustomerId] = useState(null);
    const [jobId, setJobId] = useState(null);
    const [boatId, setBoatId] = useState(null);

    // Entity options (for dropdowns)
    const [customers, setCustomers] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [boats, setBoats] = useState([]);
    const [loadingEntities, setLoadingEntities] = useState(false);

    // Images
    const [pendingImages, setPendingImages] = useState([]); // { file, preview }
    const [uploadingImages, setUploadingImages] = useState(false);

    // Saving
    const [saving, setSaving] = useState(false);

    // Load entities on open
    useEffect(() => {
        if (isOpen) {
            loadEntities();

            // Apply prefill values
            if (prefill.customer_id) setCustomerId(prefill.customer_id);
            if (prefill.job_id) setJobId(prefill.job_id);
            if (prefill.boat_id) setBoatId(prefill.boat_id);

            // Focus textarea after a short delay
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }, [isOpen, prefill]);

    // Reset form on close
    useEffect(() => {
        if (!isOpen) {
            setContent('');
            setPriority('normal');
            setSelectedTags([]);
            setReminderDate('');
            setIsPinned(false);
            setCustomerId(null);
            setJobId(null);
            setBoatId(null);
            setPendingImages([]);
        }
    }, [isOpen]);

    const loadEntities = async () => {
        setLoadingEntities(true);
        try {
            const [customersRes, jobsRes, boatsRes] = await Promise.all([
                customersAPI.getOverview({ limit: 100 }),
                jobsAPI.getAll({ limit: 100 }),
                boatsAPI.getAll({ limit: 100 }),
            ]);

            setCustomers(customersRes.data || []);
            setJobs(jobsRes.data || []);
            setBoats(boatsRes.data || []);
        } catch (error) {
            console.error('Error loading entities:', error);
        } finally {
            setLoadingEntities(false);
        }
    };

    // Image compression options
    const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            try {
                // Compress image
                const compressed = await imageCompression(file, compressionOptions);
                const preview = URL.createObjectURL(compressed);

                setPendingImages(prev => [...prev, { file: compressed, preview }]);
            } catch (error) {
                console.error('Error compressing image:', error);
                toast.error('Kunde inte bearbeta bilden');
            }
        }

        // Reset input
        e.target.value = '';
    };

    const removeImage = (index) => {
        setPendingImages(prev => {
            const newImages = [...prev];
            URL.revokeObjectURL(newImages[index].preview);
            newImages.splice(index, 1);
            return newImages;
        });
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleSave = async () => {
        if (!content.trim()) {
            toast.error('Skriv en anteckning');
            return;
        }

        setSaving(true);

        try {
            // Create note
            const noteData = {
                content: content.trim(),
                priority,
                tags: selectedTags,
                reminder_date: reminderDate || null,
                is_pinned: isPinned,
                customer_id: customerId || null,
                job_id: jobId || null,
                boat_id: boatId || null,
            };

            const { data: note, error: noteError } = await notesAPI.create(noteData);

            if (noteError) throw noteError;

            // Upload images if any
            if (pendingImages.length > 0) {
                setUploadingImages(true);

                for (const { file } of pendingImages) {
                    await notesAPI.uploadImage(note.id, file);
                }

                setUploadingImages(false);
            }

            toast.success('Anteckning sparad');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error saving note:', error);
            toast.error('Kunde inte spara anteckningen');
        } finally {
            setSaving(false);
            setUploadingImages(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-lg flex items-center gap-2">
                        📝 Ny anteckning
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Skapa en ny anteckning med text, bilder och länkningar
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Image buttons */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex-1"
                        >
                            <Camera className="h-4 w-4 mr-2" />
                            Ta bild
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1"
                        >
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Galleri
                        </Button>

                        {/* Hidden file inputs */}
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* Pending images preview */}
                    {pendingImages.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {pendingImages.map((img, idx) => (
                                <div key={idx} className="relative shrink-0">
                                    <img
                                        src={img.preview}
                                        alt={`Bild ${idx + 1}`}
                                        className="h-20 w-20 object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Content textarea */}
                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Skriv din anteckning här..."
                        className="min-h-[120px] resize-none"
                    />

                    {/* Entity linking */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Länka till:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Customer select */}
                            <Select value={customerId || 'none'} onValueChange={(val) => setCustomerId(val === 'none' ? null : val)}>
                                <SelectTrigger className="h-9 text-sm">
                                    <User className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                                    <SelectValue placeholder="Kund" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ingen kund</SelectItem>
                                    {customers.map((c) => (
                                        <SelectItem key={c.id || c.customer_id} value={c.id || c.customer_id}>
                                            {c.name || c.email || 'Okänd'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Job select */}
                            <Select value={jobId || 'none'} onValueChange={(val) => setJobId(val === 'none' ? null : val)}>
                                <SelectTrigger className="h-9 text-sm">
                                    <Wrench className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                                    <SelectValue placeholder="Jobb" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Inget jobb</SelectItem>
                                    {jobs.map((j) => (
                                        <SelectItem key={j.id} value={j.id}>
                                            {j.title || 'Utan titel'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Boat select */}
                            <Select value={boatId || 'none'} onValueChange={(val) => setBoatId(val === 'none' ? null : val)}>
                                <SelectTrigger className="h-9 text-sm">
                                    <Ship className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                                    <SelectValue placeholder="Båt" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ingen båt</SelectItem>
                                    {boats.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.make} {b.model} {b.year ? `(${b.year})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Taggar:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_TAGS.map((tag) => (
                                <Badge
                                    key={tag}
                                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                                    className="cursor-pointer text-xs"
                                    onClick={() => toggleTag(tag)}
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Priority & Reminder row */}
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Priority */}
                        <div className="flex items-center gap-2">
                            <Flag className="h-4 w-4 text-muted-foreground" />
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="h-8 w-[120px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map((p) => (
                                        <SelectItem key={p.value} value={p.value}>
                                            {p.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reminder date */}
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={reminderDate}
                                onChange={(e) => setReminderDate(e.target.value)}
                                className="h-8 px-2 text-xs border rounded-md bg-background"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Pin toggle */}
                        <Button
                            type="button"
                            variant={isPinned ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setIsPinned(!isPinned)}
                            className="h-8"
                        >
                            <Pin className={`h-3.5 w-3.5 ${isPinned ? '' : 'text-muted-foreground'}`} />
                        </Button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Avbryt
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSave}
                            disabled={saving || !content.trim()}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {uploadingImages ? 'Laddar bilder...' : 'Sparar...'}
                                </>
                            ) : (
                                '💾 Spara'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
