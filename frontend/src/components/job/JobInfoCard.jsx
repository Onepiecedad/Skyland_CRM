import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
    STATUS_LABELS,
    JOB_TYPE_LABELS,
    LOCATION_LABELS
} from '../../lib/jobConstants';

/**
 * Job information card with view and edit modes
 */
export const JobInfoCard = ({
    job,
    isEditing,
    editForm,
    onEditChange
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Jobbinformation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isEditing ? (
                    <JobInfoEditMode editForm={editForm} onEditChange={onEditChange} />
                ) : (
                    <JobInfoViewMode job={job} />
                )}
            </CardContent>
        </Card>
    );
};

/**
 * Edit mode for job information
 */
const JobInfoEditMode = ({ editForm, onEditChange }) => (
    <>
        <div>
            <Label>Titel</Label>
            <Input
                value={editForm.title || ''}
                onChange={(e) => onEditChange('title', e.target.value)}
            />
        </div>
        <div>
            <Label>Beskrivning</Label>
            <Textarea
                value={editForm.description || ''}
                onChange={(e) => onEditChange('description', e.target.value)}
                rows={3}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Typ</Label>
                <Select
                    value={editForm.job_type || ''}
                    onValueChange={(value) => onEditChange('job_type', value)}
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
                    onValueChange={(value) => onEditChange('status', value)}
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
                    onChange={(e) => onEditChange('scheduled_date', e.target.value)}
                />
            </div>
            <div>
                <Label>Tid</Label>
                <Input
                    type="time"
                    value={editForm.scheduled_time || ''}
                    onChange={(e) => onEditChange('scheduled_time', e.target.value)}
                />
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Plats</Label>
                <Select
                    value={editForm.location || ''}
                    onValueChange={(value) => onEditChange('location', value)}
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
                    onChange={(e) => onEditChange('location_details', e.target.value)}
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
                    onChange={(e) => onEditChange('estimated_hours', e.target.value)}
                />
            </div>
            <div>
                <Label>Faktiska timmar</Label>
                <Input
                    type="number"
                    step="0.5"
                    value={editForm.actual_hours || ''}
                    onChange={(e) => onEditChange('actual_hours', e.target.value)}
                />
            </div>
            <div>
                <Label>Timpris (SEK)</Label>
                <Input
                    type="number"
                    value={editForm.hourly_rate || 850}
                    onChange={(e) => onEditChange('hourly_rate', e.target.value)}
                />
            </div>
        </div>
        <div>
            <Label>Anteckningar (synliga för kund)</Label>
            <Textarea
                value={editForm.notes || ''}
                onChange={(e) => onEditChange('notes', e.target.value)}
                rows={2}
            />
        </div>
        <div>
            <Label>Interna anteckningar</Label>
            <Textarea
                value={editForm.internal_notes || ''}
                onChange={(e) => onEditChange('internal_notes', e.target.value)}
                rows={2}
            />
        </div>
    </>
);

/**
 * View mode for job information
 */
const JobInfoViewMode = ({ job }) => (
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
);
