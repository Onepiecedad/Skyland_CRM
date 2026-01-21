import { Inbox, Users, Wrench, Search, FileText, Ship, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

const illustrations = {
    messages: { icon: Inbox, title: 'Inga meddelanden', description: 'Du har inga meddelanden ännu.' },
    customers: { icon: Users, title: 'Inga kunder', description: 'Lägg till din första kund för att komma igång.' },
    jobs: { icon: Wrench, title: 'Inga jobb', description: 'Inga jobb matchar din sökning.' },
    leads: { icon: Briefcase, title: 'Inga leads', description: 'Inga leads hittades.' },
    boats: { icon: Ship, title: 'Inga båtar', description: 'Denna kund har inga registrerade båtar.' },
    search: { icon: Search, title: 'Inga resultat', description: 'Inga resultat matchade din sökning.' },
    default: { icon: FileText, title: 'Inget att visa', description: 'Det finns inget innehåll här ännu.' },
};

/**
 * Empty state component with illustration, title, description and optional action
 */
export function EmptyState({
    type = 'default',
    title,
    description,
    actionLabel,
    onAction,
    icon: CustomIcon,
    className = ''
}) {
    const config = illustrations[type] || illustrations.default;
    const Icon = CustomIcon || config.icon;
    const displayTitle = title || config.title;
    const displayDescription = description || config.description;

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            <div className="rounded-full bg-muted p-4 mb-4">
                <Icon className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{displayTitle}</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">
                {displayDescription}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
