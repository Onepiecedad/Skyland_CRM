import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs component for navigation
 * @param {Array} items - Array of { label: string, href?: string }
 * Items without href are rendered as plain text (current page)
 */
export function Breadcrumbs({ items = [] }) {
    return (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <Link
                to="/"
                className="hover:text-foreground transition-colors flex items-center gap-1"
            >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Hem</span>
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    {item.href ? (
                        <Link
                            to={item.href}
                            className="hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-foreground font-medium truncate max-w-[200px]">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
}
