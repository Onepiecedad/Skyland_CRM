import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    RefreshCw,
    Pencil,
    Save,
    X
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, JOB_TYPE_LABELS, getQuickActions } from '../../lib/jobConstants';

/**
 * Header component for JobDetail page
 * Displays title, status badges, quick actions, and edit controls
 */
export const JobDetailHeader = ({
    job,
    isEditing,
    saving,
    updatingStatus,
    onEdit,
    onSave,
    onCancel,
    onQuickStatus
}) => {
    const navigate = useNavigate();
    const quickActions = getQuickActions(job.status);

    return (
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
                {!isEditing && quickActions.map((action) => (
                    <Button
                        key={action.status}
                        variant={action.variant}
                        size="sm"
                        onClick={() => onQuickStatus(action.status)}
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
                        <Button variant="outline" onClick={onCancel} disabled={saving}>
                            <X className="h-4 w-4 mr-2" />
                            Avbryt
                        </Button>
                        <Button onClick={onSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Sparar...' : 'Spara'}
                        </Button>
                    </>
                ) : (
                    <Button variant="outline" onClick={onEdit}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Redigera
                    </Button>
                )}
            </div>
        </div>
    );
};
