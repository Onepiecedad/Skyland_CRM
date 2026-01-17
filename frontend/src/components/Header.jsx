import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';

export const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <header className="border-b bg-background">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-8">
                    <Link to="/" className="text-xl font-bold hover:text-primary transition-colors">
                        Marinmekaniker
                    </Link>
                    <nav className="flex gap-4">
                        <Link
                            to="/"
                            className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            Idag
                        </Link>
                        <Link
                            to="/meddelanden"
                            className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/meddelanden' ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            Meddelanden
                        </Link>
                        <Link
                            to="/kunder"
                            className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname.startsWith('/kunder') ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            Kunder
                        </Link>
                    </nav>
                </div>
                <Button variant="ghost" onClick={handleLogout}>
                    Logga ut
                </Button>
            </div>
        </header>
    );
};
