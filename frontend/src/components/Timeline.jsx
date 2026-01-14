import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const Timeline = ({ items }) => {
    if (!items || items.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tidslinje</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Ingen kommunikation ännu</p>
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
                    {items.map((item) => (
                        <div key={item.id} className="relative">
                            <span className="absolute -left-[31px] top-1 bg-background border-2 border-primary rounded-full w-4 h-4" />
                            <div className="flex flex-col gap-1">
                                <span className="text-sm text-muted-foreground capitalize">
                                    {item.created_at
                                        ? format(new Date(item.created_at), 'd MMM yyyy HH:mm', { locale: sv })
                                        : 'Okänt datum'}
                                </span>
                                <div className="font-semibold">
                                    {item.source === 'website_form' ? 'Formulär' : item.source}
                                </div>
                                <div className="text-sm text-foreground">
                                    {item.name} {item.email && `(${item.email})`}
                                </div>
                                {item.message && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {item.message.length > 100
                                            ? `${item.message.substring(0, 100)}...`
                                            : item.message}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
