import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, X, Users, Wrench, FileText, Mail } from 'lucide-react';

const actions = [
    {
        path: '/jobb/nytt',
        label: 'Nytt jobb',
        icon: Wrench,
        color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
        path: '/kunder',
        label: 'Ny kund',
        icon: Users,
        color: 'bg-green-600 hover:bg-green-700',
        search: '?new=true',
    },
    {
        path: '/leads',
        label: 'Ny förfrågan',
        icon: FileText,
        color: 'bg-orange-600 hover:bg-orange-700',
        search: '?new=true',
    },
];

export function FloatingActionButton() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Don't show on login page
    if (location.pathname === '/login') {
        return null;
    }

    return (
        <div className="fixed bottom-20 right-4 z-40 md:hidden">
            {/* Action buttons that appear when FAB is open */}
            <div
                className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
            >
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link
                            key={action.path}
                            to={action.path + (action.search || '')}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 group"
                        >
                            <span className="bg-background text-foreground text-sm px-3 py-1.5 rounded-lg shadow-lg border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {action.label}
                            </span>
                            <div
                                className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center text-white ${action.color}`}
                            >
                                <Icon className="h-5 w-5" />
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Main FAB button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-14 w-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-200 ${isOpen ? 'bg-gray-600 rotate-45' : 'bg-primary hover:bg-primary/90'
                    }`}
                aria-label={isOpen ? 'Stäng meny' : 'Öppna snabbmeny'}
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <Plus className="h-6 w-6" />
                )}
            </button>

            {/* Backdrop when open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 -z-10"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
