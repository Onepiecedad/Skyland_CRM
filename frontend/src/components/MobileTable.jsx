import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * MobileTable - Responsive table that shows as cards on mobile
 * @param {Array} data - Array of objects to display
 * @param {Array} columns - Column definitions
 * @param {function} onRowClick - Click handler for rows
 * @param {string} keyField - Field to use as unique key
 * @param {ReactNode} emptyState - What to show when no data
 */
export function MobileTable({
    data = [],
    columns = [],
    onRowClick,
    keyField = 'id',
    emptyState = <p className="text-center text-muted-foreground py-8">Inga resultat</p>,
    className = '',
}) {
    if (data.length === 0) {
        return emptyState;
    }

    // Get primary, secondary and badge columns
    const primaryColumn = columns.find(c => c.primary) || columns[0];
    const secondaryColumns = columns.filter(c => c.secondary);
    const badgeColumn = columns.find(c => c.badge);
    const hiddenOnMobile = columns.filter(c => c.hideOnMobile);

    return (
        <div className={className}>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${column.className || ''}`}
                                    style={{ width: column.width }}
                                >
                                    {column.header}
                                </th>
                            ))}
                            {onRowClick && <th className="w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.map((row) => (
                            <tr
                                key={row[keyField]}
                                className={`hover:bg-muted/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`px-4 py-3 text-sm ${column.cellClassName || ''}`}
                                    >
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </td>
                                ))}
                                {onRowClick && (
                                    <td className="px-2 py-3">
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {data.map((row) => (
                    <Card
                        key={row[keyField]}
                        className={`${onRowClick ? 'cursor-pointer active:bg-muted/50' : ''}`}
                        onClick={() => onRowClick?.(row)}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    {/* Primary field */}
                                    <div className="font-medium text-sm">
                                        {primaryColumn.render
                                            ? primaryColumn.render(row[primaryColumn.key], row)
                                            : row[primaryColumn.key]
                                        }
                                    </div>

                                    {/* Secondary fields */}
                                    {secondaryColumns.map((column) => (
                                        <div
                                            key={column.key}
                                            className="text-xs text-muted-foreground mt-1"
                                        >
                                            {column.mobileLabel && (
                                                <span className="font-medium">{column.mobileLabel}: </span>
                                            )}
                                            {column.render
                                                ? column.render(row[column.key], row)
                                                : row[column.key]
                                            }
                                        </div>
                                    ))}
                                </div>

                                {/* Badge and arrow */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {badgeColumn && (
                                        <div>
                                            {badgeColumn.render
                                                ? badgeColumn.render(row[badgeColumn.key], row)
                                                : row[badgeColumn.key]
                                            }
                                        </div>
                                    )}
                                    {onRowClick && (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

/**
 * MobileTableRow - A single row that can be used standalone
 */
export function MobileTableRow({
    primary,
    secondary,
    tertiary,
    badge,
    onClick,
    className = '',
}) {
    return (
        <Card
            className={`${onClick ? 'cursor-pointer active:bg-muted/50' : ''} ${className}`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{primary}</div>
                        {secondary && (
                            <div className="text-xs text-muted-foreground mt-1">{secondary}</div>
                        )}
                        {tertiary && (
                            <div className="text-xs text-muted-foreground mt-0.5">{tertiary}</div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {badge}
                        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
