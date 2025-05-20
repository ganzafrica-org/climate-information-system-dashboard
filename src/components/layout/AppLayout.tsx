import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    Cloud,
    History,
    Bell,
    Users,
    MessageSquare,
    Settings,
    Globe,
    Menu,
    ChevronLeft,
    ChevronRight,
    LogOut,
    BookOpen
} from 'lucide-react';
import { useLanguage } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; // Import Sheet components

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { t, locale, changeLanguage } = useLanguage();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Set to false by default
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
        { href: '/alerts', icon: <Bell size={20} />, label: t('alerts') },
        { href: '/farmers', icon: <Users size={20} />, label: t('farmers') },
        { href: '/messages', icon: <MessageSquare size={20} />, label: t('messages') },
        { href: '/training', icon: <BookOpen size={20} />, label: t('training') },
        { href: '/settings', icon: <Settings size={20} />, label: t('settings') }
    ];

    if (!isMounted) {
        return null;
    }

    const DesktopSidebar = () => (
        <div
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground border-r border-border transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } ${!sidebarOpen && !isMobile ? 'md:w-20' : ''}`}
        >
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
                    {(sidebarOpen || isMobile) && <span className="font-bold text-lg text-ganz-primary">GanzAfrica</span>}
                </div>
                {!isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden md:flex"
                        aria-label={sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
                    >
                        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </Button>
                )}
            </div>

            <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto py-4">
                <nav className="flex-1 px-2 space-y-1">
                    <TooltipProvider delayDuration={300}>
                        {navItems.map((item) => {
                            const isActive = router.pathname === item.href;
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        <Link href={item.href}>
                                            <Button
                                                variant={isActive ? "secondary" : "ghost"}
                                                className={`w-full justify-start ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
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
                    <Separator className="my-2" />
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start ${!sidebarOpen && !isMobile ? 'justify-center' : ''}`}
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
                    className="md:hidden mr-2"
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
                                <div className="h-6 w-6 text-black dark:text-white">
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
                            <Separator className="my-2" />
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
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
        <div className="flex h-screen overflow-hidden bg-background">
            {!isMobile && <DesktopSidebar />}

            <div className="flex flex-col flex-1 overflow-hidden">
                <header className="sticky top-0 z-30 bg-background border-b h-16 flex items-center justify-between px-4">
                    <div className="flex items-center">
                        {isMobile && <MobileSidebar />}
                        <h1 className="text-lg md:text-xl font-semibold truncate max-w-[180px] md:max-w-xs">
                            {t('climateInformationSystem')}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="flex items-center">
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

                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="container mx-auto p-3 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}