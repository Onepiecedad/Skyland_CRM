import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Wrench, Mail, Users } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Idag', icon: Home },
    { path: '/leads', label: 'Leads', icon: Search },
    { path: '/jobb', label: 'Jobb', icon: Wrench },
    { path: '/meddelanden', label: 'Meddelanden', icon: Mail },
    { path: '/kunder', label: 'Kunder', icon: Users },
];

export function BottomNav() {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50 safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
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
            </div>
        </nav>
    );
}
