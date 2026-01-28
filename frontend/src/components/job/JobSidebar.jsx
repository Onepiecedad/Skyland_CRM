import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { Phone, Mail as MailIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { formatCustomerName } from '../../lib/formatName';

/**
 * Sidebar component for JobDetail page
 * Contains customer info, boat info, metadata, and delete action
 */
export const JobSidebar = ({
    job,
    onDeleteJob
}) => {
    return (
        <div className="space-y-6">
            {/* Customer */}
            {job.customer && <CustomerCard customer={job.customer} />}

            {/* Boat */}
            {job.boat && <BoatCard boat={job.boat} />}

            {/* Metadata */}
            <MetadataCard job={job} />

            {/* Delete Job */}
            <DeleteJobCard job={job} onDeleteJob={onDeleteJob} />
        </div>
    );
};

/**
 * Customer information card
 */
const CustomerCard = ({ customer }) => (
    <Card>
        <CardHeader>
            <CardTitle>Kund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div>
                <Link
                    to={`/kund/${customer.id}`}
                    className="text-lg font-medium text-primary hover:underline"
                >
                    {formatCustomerName(customer.name)}
                </Link>
            </div>
            {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="hover:underline">
                        {customer.email}
                    </a>
                </div>
            )}
            {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${customer.phone}`} className="hover:underline">
                        {customer.phone}
                    </a>
                </div>
            )}
            {customer.address && (
                <div className="text-sm text-muted-foreground">
                    {customer.address}
                    {customer.postal_code && customer.city && (
                        <><br />{customer.postal_code} {customer.city}</>
                    )}
                </div>
            )}
        </CardContent>
    </Card>
);

/**
 * Boat information card
 */
const BoatCard = ({ boat }) => (
    <Card>
        <CardHeader>
            <CardTitle>Båt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <div>
                <p className="font-medium">
                    {boat.make} {boat.model}
                </p>
                {boat.year && (
                    <p className="text-sm text-muted-foreground">Årsmodell {boat.year}</p>
                )}
            </div>
            {boat.registration_number && (
                <div>
                    <Label className="text-muted-foreground">Registreringsnummer</Label>
                    <p className="mt-1 font-mono">{boat.registration_number}</p>
                </div>
            )}
            {(boat.engine_make || boat.engine_model) && (
                <div>
                    <Label className="text-muted-foreground">Motor</Label>
                    <p className="mt-1">
                        {boat.engine_make} {boat.engine_model}
                    </p>
                </div>
            )}
        </CardContent>
    </Card>
);

/**
 * Metadata card showing creation and update dates
 */
const MetadataCard = ({ job }) => (
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
);

/**
 * Danger zone card with delete job action
 */
const DeleteJobCard = ({ job, onDeleteJob }) => (
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
                onConfirm={onDeleteJob}
            >
                <Button variant="destructive" className="w-full">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ta bort jobb
                </Button>
            </DeleteConfirmDialog>
        </CardContent>
    </Card>
);
