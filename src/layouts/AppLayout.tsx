import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Users,
    ClipboardList,
    FileText,
    Settings,
    LogOut,
    CreditCard,
    UserCircle,
    Car
} from 'lucide-react';

export default function AppLayout() {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();

    const menuItems = [
        {
            title: 'Visitor Management',
            items: [
                { name: 'Add Visit', path: '/visits/create', icon: ClipboardList, show: true },
                { name: 'Active Visitors', path: '/visits', icon: Users, show: true },
                { name: 'Report', path: '/visits/report', icon: FileText, show: true },
            ]
        },
        {
            title: 'Master Data',
            items: [
                { name: 'Staffs', path: '/master/staffs', icon: Users, show: true },
                { name: 'Visitor Cards', path: '/master/cards', icon: CreditCard, show: true },
                { name: 'Vehicle Cards', path: '/master/vehicle-cards', icon: Car, show: true },
            ]
        },
        {
            title: 'System Settings',
            items: [
                { name: 'System Users', path: '/settings/users', icon: Settings, show: hasRole('administrator') },
                { name: 'My Profile', path: '/settings/profile', icon: UserCircle, show: true },
            ]
        }
    ];

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-900">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 flex flex-col">
                <div className="flex h-14 items-center border-b border-zinc-200 dark:border-zinc-800 px-6 font-semibold text-lg">
                    VMS Core
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    {menuItems.map((group, i) => {
                        const visibleItems = group.items.filter(item => item.show);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={i} className="mb-6 px-4">
                                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {visibleItems.map((item, j) => {
                                        const Icon = item.icon;
                                        // Simple active state check
                                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                                        return (
                                            <Link
                                                key={j}
                                                to={item.path}
                                                className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors ${isActive
                                                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                                                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50'
                                                    }`}
                                            >
                                                <Icon className="h-4 w-4" />
                                                {item.name}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-white">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{user?.name}</span>
                            <span className="truncate text-xs text-zinc-500 max-w-[150px]">{user?.email}</span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto p-6 max-w-10xl">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
