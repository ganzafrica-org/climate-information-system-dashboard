import { useEffect, useState } from 'react';
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useLanguage } from '@/i18n';
import { useTheme } from 'next-themes';
import {
    LayoutDashboard,
    Cloud,
    History,
    Bell,
    Users,
    MessageSquare,
    Settings,
    Sun,
    Moon,
    Globe
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const { t, locale, changeLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);

    // Hydration fix
    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen bg-background">
                <Sidebar variant="sidebar" collapsible="icon" side="left">
                    <SidebarHeader className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-2">
                            <div className="rounded-full bg-green-600 p-1">
                                <img
                                    src="/logo.svg"
                                    alt="GanzAfrica Logo"
                                    className="h-8 w-8"
                                />
                            </div>
                            <span className="font-bold text-lg text-green-600">GanzAfrica</span>
                        </div>
                    </SidebarHeader>
                    <SidebarContent className="p-2">
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/dashboard">
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    <span>{t('dashboard')}</span>
                                </a>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/forecasts">
                                    <Cloud className="mr-2 h-4 w-4" />
                                    <span>{t('forecasts')}</span>
                                </a>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/historical">
                                    <History className="mr-2 h-4 w-4" />
                                    <span>{t('historical')}</span>
                                </a>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/alerts">
                                    <Bell className="mr-2 h-4 w-4" />
                                    <span>{t('alerts')}</span>
                                </a>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/farmers">
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>{t('farmers')}</span>
                                </a>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/messages">
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    <span>{t('messages')}</span>
                                </a>
                            </Button>
                            <Button variant="ghost" className="w-full justify-start" asChild>
                                <a href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>{t('settings')}</span>
                                </a>
                            </Button>
                        </div>
                    </SidebarContent>
                    <SidebarFooter className="p-4 border-t flex flex-col gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <Globe className="mr-2 h-4 w-4" />
                                    {locale === 'en' ? 'English' : 'Kinyarwanda'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => changeLanguage('en')}>
                                    English
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => changeLanguage('rw')}>
                                    Kinyarwanda
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="ghost"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="justify-start"
                        >
                            {theme === 'dark' ? (
                                <>
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>{t('lightMode')}</span>
                                </>
                            ) : (
                                <>
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>{t('darkMode')}</span>
                                </>
                            )}
                        </Button>
                    </SidebarFooter>
                </Sidebar>

                <main className="flex-1 overflow-auto">
                    <SidebarInset>
                        <div className="flex flex-col min-h-screen">
                            <header className="border-b p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <SidebarTrigger />
                                    <h1 className="ml-4 text-xl font-bold">{t('climateInformationSystem')}</h1>
                                </div>
                            </header>
                            <div className="flex-1 p-6">
                                {children}
                            </div>
                        </div>
                    </SidebarInset>
                </main>
            </div>
            <Toaster position="top-right" richColors closeButton />
        </SidebarProvider>
    );
}