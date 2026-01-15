import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MessageSquare, Mail, FileText } from 'lucide-react';

const SOURCE_MAP = {
    'website_form': { label: 'Formulär', icon: FileText },
    'email': { label: 'Email', icon: Mail },
    'form': { label: 'Formulär', icon: FileText },
};

export const Timeline = ({ items }) => {
    if (!items || items.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tidslinje</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">Ingen kommunikation ännu</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tidslinje</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6 border-l-2 border-muted pl-6 relative">
                    {items.map((item) => {
                        const sourceKey = (item.source || '').toLowerCase();
                        const sourceInfo = SOURCE_MAP[sourceKey] || { label: item.source || 'Okänd källa', icon: MessageSquare };
                        const Icon = sourceInfo.icon;

                        return (
                            <div key={item.id} className="relative">
                                <span className="absolute -left-[31px] top-1 bg-background border-2 border-primary rounded-full w-4 h-4" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-muted-foreground">
                                        {item.created_at
                                            ? format(new Date(item.created_at), 'd MMM yyyy HH:mm', { locale: sv })
                                            : 'Okänt datum'}
                                    </span>
                                    <div className="font-semibold flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        {sourceInfo.label}
                                    </div>
                                    <div className="text-sm text-foreground">
                                        {item.name || 'Okänd avsändare'}
                                        {item.email && <span className="text-muted-foreground"> ({item.email})</span>}
                                    </div>
                                    {item.message && (
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                                            {item.message.length > 200
                                                ? `${item.message.substring(0, 200)}...`
                                                : item.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
