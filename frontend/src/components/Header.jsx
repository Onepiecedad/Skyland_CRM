import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Menu, X, Home, Mail, Users, Wrench, LogOut } from 'lucide-react';

export const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/', label: 'Idag', icon: Home },
        { path: '/jobb', label: 'Jobb', icon: Wrench },
        { path: '/meddelanden', label: 'Meddelanden', icon: Mail },
        { path: '/kunder', label: 'Kunder', icon: Users },
    ];

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <header className="border-b bg-background sticky top-0 z-50">
            <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="text-lg sm:text-xl font-bold hover:text-primary transition-colors shrink-0">
                    Marinmekaniker
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6">
                    {navItems.map(({ path, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`text-sm font-medium transition-colors hover:text-primary ${isActive(path) ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            {label}
                        </Link>
                    ))}
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        Logga ut
                    </Button>
                </nav>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 -mr-2 hover:bg-muted rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Meny"
                >
                    {mobileMenuOpen ? (
                        <X className="h-5 w-5" />
                    ) : (
                        <Menu className="h-5 w-5" />
                    )}
                </button>
            </div>

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
