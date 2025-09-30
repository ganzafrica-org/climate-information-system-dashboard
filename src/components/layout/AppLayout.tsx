import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    Cloud,
    History,
    Users,
    MessageSquare,
    Settings,
    Globe,
    Menu,
    LogOut,
    BookOpen,
    HelpCircle, MapPin, Loader2, TreePine,
} from 'lucide-react';
import { useLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { t, locale, changeLanguage } = useLanguage();
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const checkIsMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const navItems = [
        { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: t('dashboard') },
        { href: '/forecasts', icon: <Cloud size={20} />, label: t('forecasts') },
        { href: '/historical', icon: <History size={20} />, label: t('historical') },
        { href: '/communications', icon: <MessageSquare size={20} />, label: t('communications')},
        { href: '/farmers', icon: <Users size={20} />, label: t('farmers') },
        { href: '/locations', icon: <MapPin size={20} />, label: t('locations') },
        { href: '/soil-suitability', icon: <TreePine size={20} />, label: t('soilAnalysis') },
        { href: '/training', icon: <BookOpen size={20} />, label: t('training') },
    ];

    const getUserInitials = (username: string) => {
        return username
            .split(' ')
            .map(name => name.charAt(0).toUpperCase())
            .join('')
            .slice(0, 2);
    };

    const handleLogout = () => {
        logout();
    };

    if (!isMounted || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin h-24 w-24" />
            </div>
        );
    }

    const DesktopSidebar = () => (
        <div
            className={`fixed inset-y-0 left-0 top-16 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } ${!sidebarOpen && !isMobile ? 'md:w-20' : ''}`}
        >
            <div className="flex flex-col h-full overflow-y-auto py-4">
                <nav className="flex-1 px-2 space-y-1">
                    <TooltipProvider delayDuration={300}>
                        {navItems.map((item) => {
                            const isActive = router.pathname === item.href;
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link href={item.href}>
                                            <Button
                                                variant="ghost"
                                                className={`w-full justify-start mb-1 text-gray-700 hover:bg-blue-100 hover:text-black ${isActive ? 'bg-blue-600 text-white' : ''} ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                                            >
                                                {item.icon}
                                                {(sidebarOpen || isMobile) && <span className="ml-3">{item.label}</span>}
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    {!sidebarOpen && !isMobile && (
                                        <TooltipContent side="right">
                                            {item.label}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </nav>
                <div className="mt-auto px-2 py-4">
                    {/* Admin section */}
                    {user?.role === 'admin' && (
                        <div className="mb-4">
                            <Separator className="mb-3" />
                            <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link href="/admin/users">
                                            <Button
                                                variant="ghost"
                                                className={`w-full justify-start mb-1 text-gray-700 hover:bg-blue-100 hover:text-black ${router.pathname === '/admin/users' ? 'bg-blue-600 text-white' : ''} ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                                            >
                                                <Users size={20} />
                                                {(sidebarOpen || isMobile) && <span className="ml-3">Admin</span>}
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    {!sidebarOpen && !isMobile && (
                                        <TooltipContent side="right">
                                            Admin
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                    
                    {/* Logout section */}
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start text-gray-700 hover:bg-blue-900 hover:text-white ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
                                    onClick={handleLogout}
                                >
                                    <LogOut size={20} />
                                    {(sidebarOpen || isMobile) && <span className="ml-3">{t('logout')}</span>}
                                </Button>
                            </TooltipTrigger>
                            {!sidebarOpen && !isMobile && (
                                <TooltipContent side="right">
                                    {t('logout')}
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    );

    const MobileSidebar = () => (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden mr-2 text-white hover:bg-white/10"
                    aria-label={t('toggleSidebar')}
                >
                    <Menu size={20} />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
                <div className="h-full">
                    <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-full bg-ganz-primary flex items-center justify-center">
                                <div className="h-6 w-6 text-white">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7 17.9999C11.5714 17.9999 19 15.9999 19 6.99994C19 6.99994 14.5 12.9999 7 12.9999V17.9999Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7 13C7 13 3 10 3 7C3 7 8.5 5 12 3C12 3 12.5 8.5 7 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                            <span className="font-bold text-lg text-ganz-primary">GanzAfrica</span>
                        </div>
                    </div>

                    <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto py-4">
                        <nav className="flex-1 px-2 space-y-1">
                            {navItems.map((item) => {
                                const isActive = router.pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant={isActive ? "secondary" : "ghost"}
                                            className="w-full justify-start"
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            {item.icon}
                                            <span className="ml-3">{item.label}</span>
                                        </Button>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="mt-auto px-2 py-4">
                            {/* Admin section for mobile */}
                            {user?.role === 'admin' && (
                                <div className="mb-4">
                                    <Separator className="mb-3" />
                                    <Link href="/admin/users">
                                        <Button
                                            variant={router.pathname === '/admin/users' ? "secondary" : "ghost"}
                                            className="w-full justify-start"
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <Users size={20} />
                                            <span className="ml-3">Admin</span>
                                        </Button>
                                    </Link>
                                </div>
                            )}
                            
                            <Separator className="my-2" />
                            <Button
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={handleLogout}
                            >
                                <LogOut size={20} />
                                <span className="ml-3">{t('logout')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#f9fafb]">
            
            <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white border-b h-16 flex items-center justify-between px-4 md:px-6">
                <div className="flex items-center">
                    {isMobile && <MobileSidebar />}
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                            <div className="h-6 w-6 text-white">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 17.9999C11.5714 17.9999 19 15.9999 19 6.99994C19 6.99994 14.5 12.9999 7 12.9999V17.9999Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M7 13C7 13 3 10 3 7C3 7 8.5 5 12 3C12 3 12.5 8.5 7 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <span className="font-bold text-lg text-white">GanzAfrica</span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Link href="/help">
                        <Button variant="ghost" size="sm" className="flex items-center text-white hover:bg-white/10">
                            <HelpCircle className="h-4 w-4 mr-1" />
                            <span className="hidden md:inline">{t('help')}</span>
                        </Button>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex items-center text-white hover:bg-white/10">
                                <Globe className="h-4 w-4 mr-1" />
                                <span className="hidden md:inline">{locale === 'en' ? 'English' : 'Kinyarwanda'}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => changeLanguage('en')}>
                                English
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => changeLanguage('rw')}>
                                Kinyarwanda
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center space-x-2 px-2 text-white hover:bg-white/10">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-white/20 text-white text-sm">
                                            {getUserInitials(user.username)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="hidden md:flex flex-col items-start">
                                        <span className="text-sm font-medium">{user.username}</span>
                                        <span className="text-xs text-white/70 capitalize">{user.role}</span>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="flex items-center space-x-2 p-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-ganz-primary text-white text-sm">
                                            {getUserInitials(user.username)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.username}</span>
                                        <span className="text-xs text-muted-foreground">{user.phone}</span>
                                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="flex items-center">
                                        <Settings className="mr-2 h-4 w-4" />
                                        {t('settings')}
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {t('logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </header>

            
            {!isMobile && <DesktopSidebar />}

            
            <div className="flex flex-col flex-1 overflow-hidden pt-16">
                <main className="flex-1 overflow-auto bg-[#f9fafb]">
                    <div className="container mx-auto p-3 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}