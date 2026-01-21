import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { messagesAPI } from '../lib/api';
import { formatCustomerName } from '../lib/formatName';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Menu, X, Home, Mail, Users, Wrench, LogOut, Search, User, FileText } from 'lucide-react';

export const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Global search state
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ customers: [], messages: [] });
    const [searching, setSearching] = useState(false);
    const searchRef = useRef(null);
    const inputRef = useRef(null);

    // Unread messages count
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Idag', icon: Home },
        { path: '/leads', label: 'Förfrågningar', icon: Search },
        { path: '/jobb', label: 'Jobb', icon: Wrench },
        { path: '/meddelanden', label: 'Meddelanden', icon: Mail },
        { path: '/kunder', label: 'Kunder', icon: Users },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

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
            .channel('messages-unread')
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

    // Search functionality
    useEffect(() => {
        const handleSearch = async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setSearchResults({ customers: [], messages: [] });
                return;
            }

            setSearching(true);
            try {
                const query = searchQuery.toLowerCase();

                // Search customers
                const { data: customers } = await supabase
                    .from('customers')
                    .select('id, name, email, phone')
                    .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                    .limit(5);

                // Search messages
                const { data: messages } = await supabase
                    .from('messages')
                    .select('id, subject, from_name, from_email, customer_id')
                    .or(`subject.ilike.%${query}%,from_name.ilike.%${query}%,from_email.ilike.%${query}%`)
                    .limit(5);

                setSearchResults({
                    customers: customers || [],
                    messages: messages || []
                });
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(handleSearch, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    // Close search on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when search opens
    useEffect(() => {
        if (searchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [searchOpen]);

    // Close search on navigation
    useEffect(() => {
        setSearchOpen(false);
        setSearchQuery('');
    }, [location.pathname]);

    const handleResultClick = (path) => {
        navigate(path);
        setSearchOpen(false);
        setSearchQuery('');
    };

    const totalResults = searchResults.customers.length + searchResults.messages.length;

    return (
        <header className="border-b bg-background sticky top-0 z-50">
            <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 gap-4">
                {/* Logo */}
                <Link to="/" className="text-lg sm:text-xl font-bold hover:text-primary transition-colors shrink-0">
                    Marinmekaniker
                </Link>

                {/* Desktop Search */}
                <div className="hidden md:block flex-1 max-w-md relative" ref={searchRef}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            placeholder="Sök kunder, meddelanden..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchOpen(true)}
                            className="pl-9 h-9"
                        />
                    </div>

                    {/* Search Results Dropdown */}
                    {searchOpen && searchQuery.length >= 2 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-[400px] overflow-auto z-50">
                            {searching ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Söker...
                                </div>
                            ) : totalResults === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Inga resultat för "{searchQuery}"
                                </div>
                            ) : (
                                <>
                                    {searchResults.customers.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                                                Kunder
                                            </div>
                                            {searchResults.customers.map((customer) => (
                                                <button
                                                    key={customer.id}
                                                    onClick={() => handleResultClick(`/kund/${customer.id}`)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                                                >
                                                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">
                                                            {formatCustomerName(customer.name, customer.email)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {customer.email || customer.phone || ''}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchResults.messages.length > 0 && (
                                        <div>
                                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                                                Meddelanden
                                            </div>
                                            {searchResults.messages.map((msg) => (
                                                <button
                                                    key={msg.id}
                                                    onClick={() => handleResultClick(msg.customer_id ? `/kund/${msg.customer_id}` : '/meddelanden')}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left transition-colors"
                                                >
                                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">
                                                            {msg.subject || 'Inget ämne'}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {msg.from_name || msg.from_email || ''}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {navItems.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`text-sm font-medium transition-colors hover:text-primary relative ${isActive(path) ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            {label}
                            {path === '/meddelanden' && unreadCount > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-4 h-5 min-w-[20px] text-[10px] px-1.5"
                                >
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Badge>
                            )}
                        </Link>
                    ))}
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        Logga ut
                    </Button>
                </nav>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center gap-2">
                    <button
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        onClick={() => {
                            setSearchOpen(!searchOpen);
                            setMobileMenuOpen(false);
                        }}
                        aria-label="Sök"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    <button
                        className="p-2 -mr-2 hover:bg-muted rounded-md transition-colors"
                        onClick={() => {
                            setMobileMenuOpen(!mobileMenuOpen);
                            setSearchOpen(false);
                        }}
                        aria-label="Meny"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Search */}
            {searchOpen && (
                <div className="md:hidden border-t bg-background p-4" ref={searchRef}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            placeholder="Sök kunder, meddelanden..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>

                    {searchQuery.length >= 2 && (
                        <div className="mt-2 max-h-[300px] overflow-auto">
                            {searching ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Söker...
                                </div>
                            ) : totalResults === 0 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Inga resultat
                                </div>
                            ) : (
                                <>
                                    {searchResults.customers.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleResultClick(`/kund/${customer.id}`)}
                                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted text-left border-b transition-colors"
                                        >
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">
                                                    {formatCustomerName(customer.name, customer.email)}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {searchResults.messages.map((msg) => (
                                        <button
                                            key={msg.id}
                                            onClick={() => handleResultClick(msg.customer_id ? `/kund/${msg.customer_id}` : '/meddelanden')}
                                            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted text-left border-b transition-colors"
                                        >
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">
                                                    {msg.subject || 'Inget ämne'}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t bg-background">
                    <nav className="container mx-auto px-4 py-2 flex flex-col">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <Link
                                key={path}
                                to={path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 py-3 px-2 rounded-md transition-colors ${isActive(path)
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-foreground hover:bg-muted'
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                {label}
                            </Link>
                        ))}
                        <button
                            onClick={() => {
                                setMobileMenuOpen(false);
                                handleLogout();
                            }}
                            className="flex items-center gap-3 py-3 px-2 rounded-md text-foreground hover:bg-muted transition-colors text-left"
                        >
                            <LogOut className="h-5 w-5" />
                            Logga ut
                        </button>
                    </nav>
                </div>
            )}
        </header>
    );
};
