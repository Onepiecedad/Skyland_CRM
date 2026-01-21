import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Wrench, Mail, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { messagesAPI } from '../lib/api';

const navItems = [
    { path: '/', label: 'Idag', icon: Home },
    { path: '/leads', label: 'Leads', icon: Search },
    { path: '/jobb', label: 'Jobb', icon: Wrench },
    { path: '/meddelanden', label: 'Meddelanden', icon: Mail },
    { path: '/kunder', label: 'Kunder', icon: Users },
];

export function BottomNav() {
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread messages count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const response = await messagesAPI.getUnreadCount();
                setUnreadCount(response.data.count);
            } catch (error) {
                console.error('Error fetching unread count:', error);
            }
        };

        fetchUnreadCount();

        // Subscribe to realtime changes on messages table
        const channel = supabase
            .channel('messages-unread-bottom')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50 safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                    const showBadge = item.path === '/meddelanden' && unreadCount > 0;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <div className="relative">
                                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                                {showBadge && (
                                    <span className="absolute -top-1.5 -right-2 h-4 min-w-[16px] bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] mt-1 font-medium">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
