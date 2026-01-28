import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsAPI, jobItemsAPI, jobImagesAPI } from '../lib/api';
import { Breadcrumbs } from '../components/Breadcrumbs';
import JobImageGallery from '../components/JobImageGallery';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Import modular job components
import {
    JobDetailHeader,
    JobInfoCard,
    JobItemsTable,
    JobSidebar
} from '../components/job';

/**
 * JobDetail page component
 * Displays and manages a single job with all its details, items, and images
 * 
 * Refactored from 882 lines to ~180 lines by extracting:
 * - JobDetailHeader: Title, status, quick actions, edit controls
 * - JobInfoCard: Job information with view/edit modes
 * - JobItemsTable: Articles and labor table
 * - JobSidebar: Customer, boat, metadata, delete action
 * - jobConstants.js: Shared labels and utility functions
 */
export const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Core state
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Job items and images state
    const [items, setItems] = useState([]);
    const [images, setImages] = useState([]);

    // ===== Data Fetching =====

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await jobsAPI.getById(id);
            const jobData = response.data;
            setJob(jobData);
            setEditForm(jobData);
            setItems(jobData.items || []);

            const imagesResponse = await jobImagesAPI.getByJobId(id);
            setImages(imagesResponse.data || []);
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

    // ===== Event Handlers =====

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
            toast.success('Jobb sparat');
        } catch (err) {
            console.error('Error saving job:', err);
            toast.error('Kunde inte spara ändringar');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditForm(job);
        setIsEditing(false);
    };

    const handleQuickStatus = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await jobsAPI.update(id, { status: newStatus });
            setJob({ ...job, status: newStatus });
            setEditForm({ ...editForm, status: newStatus });
            toast.success('Status uppdaterad');
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('Kunde inte uppdatera status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleAddItem = async (newItem) => {
        try {
            const itemData = {
                job_id: id,
                ...newItem,
                total_price: (parseFloat(newItem.quantity) || 0) * (parseFloat(newItem.unit_price) || 0)
            };
            const response = await jobItemsAPI.create(itemData);
            setItems([...items, response.data]);
            return true;
        } catch (err) {
            console.error('Error adding item:', err);
            toast.error('Kunde inte lägga till rad');
            return false;
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Är du säker på att du vill ta bort denna rad?')) return;
        try {
            await jobItemsAPI.delete(itemId);
            setItems(items.filter(i => i.id !== itemId));
        } catch (err) {
            console.error('Error deleting item:', err);
            toast.error('Kunde inte ta bort rad');
        }
    };

    const handleDeleteImage = async (imageId) => {
        try {
            await jobImagesAPI.delete(imageId);
            setImages(images.filter(img => img.id !== imageId));
            toast.success('Bilden har tagits bort');
        } catch (err) {
            console.error('Error deleting image:', err);
            toast.error('Kunde inte ta bort bilden');
            throw err;
        }
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

    // ===== Loading & Error States =====

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

    // ===== Main Render =====

    return (
        <div className="container mx-auto p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Jobb', href: '/jobb' },
                    { label: job.title || 'Jobb' }
                ]}
            />

            {/* Header with title, status, actions */}
            <JobDetailHeader
                job={job}
                isEditing={isEditing}
                saving={saving}
                updatingStatus={updatingStatus}
                onEdit={() => setIsEditing(true)}
                onSave={handleSave}
                onCancel={handleCancel}
                onQuickStatus={handleQuickStatus}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left column - Job details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Job Information */}
                    <JobInfoCard
                        job={job}
                        isEditing={isEditing}
                        editForm={editForm}
                        onEditChange={handleEditChange}
                    />

                    {/* Job Items Table */}
                    <JobItemsTable
                        items={items}
                        onAddItem={handleAddItem}
                        onDeleteItem={handleDeleteItem}
                    />

                    {/* Job Images */}
                    <JobImageGallery
                        jobId={id}
                        images={images}
                        onImagesChange={setImages}
                        onDeleteImage={handleDeleteImage}
                    />
                </div>

                {/* Right column - Sidebar */}
                <JobSidebar
                    job={job}
                    onDeleteJob={handleDeleteJob}
                />
            </div>
        </div>
    );
};
