import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Wrench, Mail, Users, Plus, StickyNote, UserPlus, Ship, X, Trash2, MessageSquarePlus, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { messagesAPI, trashAPI } from '../lib/api';
import { QuickNoteModal } from './QuickNoteModal';

const navItems = [
    { path: '/', label: 'Idag', icon: Home },
    { path: '/kalender', label: 'Kalender', icon: Calendar },
    // Center button will be inserted here
    { path: '/meddelanden', label: 'Inkorg', icon: Mail },
    { path: '/anteckningar', label: 'Anteckn.', icon: StickyNote },
];

// Quick action menu items
const quickActions = [
    { id: 'note', label: 'Ny anteckning', icon: StickyNote, color: 'bg-blue-500' },
    { id: 'message', label: 'Nytt meddelande', icon: MessageSquarePlus, color: 'bg-emerald-500', path: '/meddelanden?compose=true' },
    { id: 'customer', label: 'Ny kund', icon: UserPlus, color: 'bg-purple-500', path: '/kunder?new=true' },
    { id: 'job', label: 'Nytt jobb', icon: Wrench, color: 'bg-green-500', path: '/jobb/nytt' },
    { id: 'boat', label: 'Ny båt', icon: Ship, color: 'bg-cyan-500' },
];

export function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [trashCount, setTrashCount] = useState(0);
    const [showQuickMenu, setShowQuickMenu] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);

    // Long press handling
    const longPressTimer = useRef(null);
    const [isLongPressing, setIsLongPressing] = useState(false);

    // Haptic feedback (if supported)
    const vibrate = useCallback(() => {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }, []);

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

    // Center button handlers - open menu directly on tap
    const handleCenterPress = () => {
        vibrate();
        setShowQuickMenu(true);
    };

    const handleCenterTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            setIsLongPressing(true);
            vibrate();
            setShowQuickMenu(true);
        }, 500); // 500ms for long press
    };

    const handleCenterTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }

        // If it was a quick tap (not long press), trigger the tap action
        if (!isLongPressing) {
            handleCenterPress();
        }

        // Reset long press state after a brief delay
        setTimeout(() => setIsLongPressing(false), 100);
    };

    const handleCenterTouchCancel = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
        setIsLongPressing(false);
    };

    const handleQuickAction = (action) => {
        vibrate();
        setShowQuickMenu(false);

        if (action.id === 'note') {
            setShowNoteModal(true);
        } else if (action.path) {
            navigate(action.path);
        }
        // Additional actions can be handled here
    };

    const handleNoteSuccess = () => {
        // Could refresh notes list or show on dashboard
        setShowNoteModal(false);
    };

    // Close quick menu when clicking outside
    useEffect(() => {
        if (showQuickMenu) {
            const handleClickOutside = () => setShowQuickMenu(false);
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showQuickMenu]);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50 safe-area-bottom">
                <div className="flex justify-around items-center h-16 relative">
                    {/* First two nav items */}
                    {navItems.slice(0, 2).map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path));

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative ${isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                                <span className="text-[10px] mt-1 font-medium">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Center Button - Prominent action button */}
                    <div className="flex-1 flex justify-center relative">
                        <button
                            onTouchStart={handleCenterTouchStart}
                            onTouchEnd={handleCenterTouchEnd}
                            onTouchCancel={handleCenterTouchCancel}
                            onMouseDown={handleCenterTouchStart}
                            onMouseUp={handleCenterTouchEnd}
                            onMouseLeave={handleCenterTouchCancel}
                            onClick={(e) => e.preventDefault()}
                            className={`
                                -mt-5 w-14 h-14 rounded-full 
                                bg-gradient-to-br from-blue-500 to-blue-600 
                                shadow-lg shadow-blue-500/30
                                flex items-center justify-center
                                transform transition-all duration-150
                                active:scale-95 active:shadow-md
                                ${isLongPressing ? 'scale-110 shadow-xl' : ''}
                            `}
                            aria-label="Snabbåtgärder"
                        >
                            <Plus className="h-7 w-7 text-white stroke-[2.5]" />
                        </button>

                        {/* Quick action menu (appears on long press) */}
                        {showQuickMenu && (
                            <div
                                className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border p-3 min-w-[200px] animate-in fade-in slide-in-from-bottom-4 duration-200">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-xs font-medium text-muted-foreground">Snabbåtgärder</span>
                                        <button
                                            onClick={() => setShowQuickMenu(false)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {quickActions.map((action) => {
                                            const ActionIcon = action.icon;
                                            return (
                                                <button
                                                    key={action.id}
                                                    onClick={() => handleQuickAction(action)}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                                                >
                                                    <div className={`w-8 h-8 ${action.color} rounded-full flex items-center justify-center`}>
                                                        <ActionIcon className="h-4 w-4 text-white" />
                                                    </div>
                                                    <span className="font-medium text-sm">{action.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                {/* Arrow pointer */}
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-b border-r rotate-45 shadow-lg" />
                            </div>
                        )}
                    </div>

                    {/* Last two nav items */}
                    {navItems.slice(2).map((item) => {
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

            {/* Quick Note Modal */}
            <QuickNoteModal
                isOpen={showNoteModal}
                onClose={() => setShowNoteModal(false)}
                onSuccess={handleNoteSuccess}
            />
        </>
    );
}
