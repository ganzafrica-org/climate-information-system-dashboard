import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    Bell,
    Check,
    ChevronDown,
    Database,
    Globe,
    HelpCircle,
    InfoIcon,
    Lock,
    LogOut,
    Mail,
    Moon,
    RefreshCw,
    Save,
    Settings as SettingsIcon,
    Shield,
    Sun,
    User,
    Send, Trash
} from 'lucide-react';

const Settings: NextPage = () => {
    const { t, locale, changeLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('general');

    return (
        <AppLayout>
            <Head>
                <title>{t('settings')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-ganz-primary" />
                    <h2 className="text-xl font-medium">{t('settings')}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="lg:col-span-1">
                        <CardContent className="p-4">
                            <nav className="space-y-1">
                                <Button
                                    variant={activeTab === 'general' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('general')}
                                >
                                    <SettingsIcon className="h-4 w-4 mr-2" />
                                    {t('general')}
                                </Button>
                                <Button
                                    variant={activeTab === 'account' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('account')}
                                >
                                    <User className="h-4 w-4 mr-2" />
                                    {t('account')}
                                </Button>
                                <Button
                                    variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('notifications')}
                                >
                                    <Bell className="h-4 w-4 mr-2" />
                                    {t('notifications')}
                                </Button>
                                <Button
                                    variant={activeTab === 'dataManagement' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('dataManagement')}
                                >
                                    <Database className="h-4 w-4 mr-2" />
                                    {t('dataManagement')}
                                </Button>
                                <Button
                                    variant={activeTab === 'security' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('security')}
                                >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('security')}
                                </Button>
                                <Button
                                    variant={activeTab === 'about' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('about')}
                                >
                                    <InfoIcon className="h-4 w-4 mr-2" />
                                    {t('about')}
                                </Button>
                                <Button
                                    variant={activeTab === 'help' ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveTab('help')}
                                >
                                    <HelpCircle className="h-4 w-4 mr-2" />
                                    {t('help')}
                                </Button>
                                <Separator className="my-2" />
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {t('logout')}
                                </Button>
                            </nav>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        {activeTab === 'general' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('generalSettings')}</CardTitle>
                                    <CardDescription>{t('generalSettingsDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('language')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('languageSettingDesc')}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 ${
                                                    locale === 'en' ? 'bg-muted/50 border-primary' : ''
                                                }`}
                                                role="button"
                                                onClick={() => changeLanguage('en')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span>English</span>
                                                </div>
                                                {locale === 'en' && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 ${
                                                    locale === 'rw' ? 'bg-muted/50 border-primary' : ''
                                                }`}
                                                role="button"
                                                onClick={() => changeLanguage('rw')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span>Kinyarwanda</span>
                                                </div>
                                                {locale === 'rw' && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />
                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('appearance')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('themeSettingDesc')}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 ${
                                                    theme === 'light' ? 'bg-muted/50 border-primary' : ''
                                                }`}
                                                role="button"
                                                onClick={() => setTheme('light')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Sun className="h-4 w-4" />
                                                    <span>{t('lightMode')}</span>
                                                </div>
                                                {theme === 'light' && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 ${
                                                    theme === 'dark' ? 'bg-muted/50 border-primary' : ''
                                                }`}
                                                role="button"
                                                onClick={() => setTheme('dark')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Moon className="h-4 w-4" />
                                                    <span>{t('darkMode')}</span>
                                                </div>
                                                {theme === 'dark' && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 ${
                                                    theme === 'system' ? 'bg-muted/50 border-primary' : ''
                                                }`}
                                                role="button"
                                                onClick={() => setTheme('system')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <DesktopIcon className="h-4 w-4" />
                                                    <span>{t('systemDefault')}</span>
                                                </div>
                                                {theme === 'system' && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />
                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('defaultValues')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('defaultValuesDesc')}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('defaultLocation')}</label>
                                                <div className="flex items-center">
                                                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                                        <option value="all">{t('allSectors')}</option>
                                                        {['Kinigi', 'Muhoza', 'Cyuve', 'Gataraga'].map(sector => (
                                                            <option key={sector} value={sector}>{sector}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('defaultCrop')}</label>
                                                <div className="flex items-center">
                                                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                                        <option value="all">{t('allCrops')}</option>
                                                        {['Maize', 'Potatoes', 'Beans', 'Vegetables'].map(crop => (
                                                            <option key={crop} value={crop}>{crop}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="ml-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        {t('saveChanges')}
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                        {activeTab === 'account' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('accountSettings')}</CardTitle>
                                    <CardDescription>{t('accountSettingsDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Profile information */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-muted rounded-full h-16 w-16 flex items-center justify-center">
                                                <User className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-medium">Admin User</h3>
                                                <p className="text-sm text-muted-foreground">admin@ganzafrica.org</p>
                                            </div>
                                            <Button variant="outline" size="sm" className="ml-auto">
                                                {t('editProfile')}
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('fullName')}</label>
                                                <Input value="Admin User" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('email')}</label>
                                                <Input value="admin@ganzafrica.org" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('phone')}</label>
                                                <Input value="+250 78XXXXXXX" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('role')}</label>
                                                <Input value="System Administrator" disabled />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />
                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('changePassword')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('changePasswordDesc')}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('currentPassword')}</label>
                                                <Input type="password" placeholder="••••••••" />
                                            </div>
                                            <div className="space-y-2 col-span-1 md:col-span-2">
                                                <Separator />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('newPassword')}</label>
                                                <Input type="password" placeholder="••••••••" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('confirmNewPassword')}</label>
                                                <Input type="password" placeholder="••••••••" />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <Button>
                                                <Lock className="h-4 w-4 mr-2" />
                                                {t('updatePassword')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}
                        {activeTab === 'notifications' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('notificationSettings')}</CardTitle>
                                    <CardDescription>{t('notificationSettingsDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-base font-medium">{t('emailNotifications')}</h3>

                                        <div className="space-y-2">
                                            {[
                                                'systemAlerts',
                                                'weeklyReports',
                                                'farmerRegistrations',
                                                'messageDeliveryReports'
                                            ].map(notification => (
                                                <div key={notification} className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">{t(notification)}</div>
                                                        <div className="text-sm text-muted-foreground">{t(`${notification}Desc`)}</div>
                                                    </div>
                                                    <div className="h-6 w-12 rounded-full bg-muted p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                        <div className="h-4 w-4 rounded-full bg-primary transform translate-x-6"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                        <h3 className="text-base font-medium">{t('inAppNotifications')}</h3>

                                        <div className="space-y-2">
                                            {[
                                                'weatherAlerts',
                                                'systemUpdates',
                                                'userActions',
                                                'dataUpdates'
                                            ].map(notification => (
                                                <div key={notification} className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium">{t(notification)}</div>
                                                        <div className="text-sm text-muted-foreground">{t(`${notification}Desc`)}</div>
                                                    </div>
                                                    <div className="h-6 w-12 rounded-full bg-muted p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                        <div className={`h-4 w-4 rounded-full ${notification === 'userActions' ? 'bg-muted transform translate-x-0' : 'bg-primary transform translate-x-6'}`}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="ml-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        {t('saveChanges')}
                                    </Button>
                                </CardFooter>
                            </>
                        )}

                        {activeTab === 'dataManagement' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('dataManagement')}</CardTitle>
                                    <CardDescription>{t('dataManagementDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('dataSources')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('dataSourcesDesc')}
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-3 rounded-md border">
                                                <div>
                                                    <div className="font-medium">OpenWeatherMap API</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {t('weatherDataProvider')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="h-4 w-4" />
                              {t('connected')}
                          </span>
                                                    <Button variant="outline" size="sm">
                                                        {t('configure')}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-md border">
                                                <div>
                                                    <div className="font-medium">Rwanda Agricultural Board</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {t('agriculturalDataProvider')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600 flex items-center gap-1">
                            <Check className="h-4 w-4" />
                              {t('connected')}
                          </span>
                                                    <Button variant="outline" size="sm">
                                                        {t('configure')}
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-md border">
                                                <div>
                                                    <div className="font-medium">Local Weather Stations</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {t('localWeatherStations')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                              {t('partialConnection')}
                          </span>
                                                    <Button variant="outline" size="sm">
                                                        {t('configure')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('dataUpdateSettings')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('dataUpdateSettingsDesc')}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('weatherUpdateFrequency')}</label>
                                                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                                    <option value="15min">{t('every15Minutes')}</option>
                                                    <option value="30min">{t('every30Minutes')}</option>
                                                    <option value="1hour" selected>{t('hourly')}</option>
                                                    <option value="3hours">{t('every3Hours')}</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">{t('forecastHorizon')}</label>
                                                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                                                    <option value="3days">{t('3days')}</option>
                                                    <option value="7days" selected>{t('7days')}</option>
                                                    <option value="14days">{t('14days')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('dataMaintenance')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('dataMaintenanceDesc')}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline">
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                {t('syncAllData')}
                                            </Button>
                                            <Button variant="outline">
                                                <Database className="h-4 w-4 mr-2" />
                                                {t('exportSystemData')}
                                            </Button>
                                            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20">
                                                <Trash className="h-4 w-4 mr-2" />
                                                {t('clearCachedData')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="ml-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        {t('saveChanges')}
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                        {activeTab === 'security' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('security')}</CardTitle>
                                    <CardDescription>{t('securitySettingsDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('twoFactorAuthentication')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('twoFactorAuthDesc')}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium">{t('enableTwoFactor')}</div>
                                                <div className="text-sm text-muted-foreground">{t('twoFactorExplanation')}</div>
                                            </div>
                                            <div className="h-6 w-12 rounded-full bg-muted p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                <div className="h-4 w-4 rounded-full bg-primary transform translate-x-6"></div>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="mt-2">
                                            <Shield className="h-4 w-4 mr-2" />
                                            {t('configureTwoFactor')}
                                        </Button>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('sessionManagement')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('sessionManagementDesc')}
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{t('currentSession')}</div>
                                                    <div className="text-sm text-muted-foreground">Kigali, Rwanda • Chrome • Windows</div>
                                                </div>
                                                <div className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                                    {t('active')}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium">{t('mobileSession')}</div>
                                                    <div className="text-sm text-muted-foreground">Kigali, Rwanda • Mobile App • Android</div>
                                                </div>
                                                <div className="text-xs px-2 py-1 bg-muted rounded-full">
                                                    {t('inactive')}
                                                </div>
                                            </div>

                                            <Button variant="outline" className="mt-2">
                                                <LogOut className="h-4 w-4 mr-2" />
                                                {t('logoutAllSessions')}
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('apiAccess')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('apiAccessDesc')}
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium">{t('enableApiAccess')}</div>
                                                <div className="h-6 w-12 rounded-full bg-muted p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                    <div className="h-4 w-4 rounded-full bg-primary transform translate-x-6"></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-md border">
                                                <div>
                                                    <div className="font-medium">{t('apiKey')}</div>
                                                    <div className="font-mono text-sm mt-1">
                                                        ••••••••••••••••••••••••••
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm">
                                                        {t('copy')}
                                                    </Button>
                                                    <Button variant="outline" size="sm">
                                                        {t('regenerate')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button className="ml-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        {t('saveChanges')}
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                        {activeTab === 'about' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('about')}</CardTitle>
                                    <CardDescription>{t('aboutSystemDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex flex-col items-center justify-center py-6">
                                        <div className="h-16 w-16 rounded-full bg-ganz-primary flex items-center justify-center mb-4">
                                            <div className="h-10 w-10 text-white">
                                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M7 17.9999C11.5714 17.9999 19 15.9999 19 6.99994C19 6.99994 14.5 12.9999 7 12.9999V17.9999Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <path d="M7 13C7 13 3 10 3 7C3 7 8.5 5 12 3C12 3 12.5 8.5 7 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </div>
                                        <h2 className="text-2xl font-bold">GanzAfrica</h2>
                                        <p className="text-muted-foreground">{t('climateInformationSystem')}</p>
                                        <div className="mt-2 text-sm">
                                            v1.0.0
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('aboutSystem')}</h3>
                                        <p className="text-sm mb-2">
                                            {t('systemDescription')}
                                        </p>
                                        <p className="text-sm mb-4">
                                            {t('systemPurpose')}
                                        </p>

                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('contact')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('contactDesc')}
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span>support@ganzafrica.org</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span>+250 788 XXX XXX</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-4 w-4 text-muted-foreground" />
                                                <span>www.ganzafrica.org</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}
                        {activeTab === 'help' && (
                            <>
                                <CardHeader>
                                    <CardTitle>{t('help')}</CardTitle>
                                    <CardDescription>{t('helpAndSupportDesc')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-base font-medium">{t('frequentlyAskedQuestions')}</h3>

                                        <div className="space-y-3">
                                            {[
                                                {
                                                    question: 'faqQuestion1',
                                                    answer: 'faqAnswer1'
                                                },
                                                {
                                                    question: 'faqQuestion2',
                                                    answer: 'faqAnswer2'
                                                },
                                                {
                                                    question: 'faqQuestion3',
                                                    answer: 'faqAnswer3'
                                                },
                                                {
                                                    question: 'faqQuestion4',
                                                    answer: 'faqAnswer4'
                                                }
                                            ].map((faq, index) => (
                                                <div key={index} className="border rounded-md p-4">
                                                    <button className="flex w-full items-start justify-between text-left">
                                                        <span className="font-medium">{t(faq.question)}</span>
                                                        <ChevronDown className="h-4 w-4" />
                                                    </button>
                                                    <div className="mt-2 text-sm text-muted-foreground">
                                                        {t(faq.answer)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('userManual')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('userManualDesc')}
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline">
                                                <FileIcon className="h-4 w-4 mr-2" />
                                                {t('downloadUserManual')}
                                            </Button>
                                            <Button variant="outline">
                                                <BookOpen className="h-4 w-4 mr-2" />
                                                {t('viewOnlineDocumentation')}
                                            </Button>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-2">
                                        <h3 className="text-base font-medium">{t('contactSupport')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('contactSupportDesc')}
                                        </p>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('name')}</label>
                                                    <Input placeholder={t('yourName')} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">{t('email')}</label>
                                                    <Input placeholder={t('yourEmail')} />
                                                </div>
                                                <div className="col-span-1 md:col-span-2 space-y-2">
                                                    <label className="text-sm font-medium">{t('subject')}</label>
                                                    <Input placeholder={t('subject')} />
                                                </div>
                                                <div className="col-span-1 md:col-span-2 space-y-2">
                                                    <label className="text-sm font-medium">{t('message')}</label>
                                                    <textarea
                                                        className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                        placeholder={t('describeYourIssue')}
                                                    ></textarea>
                                                </div>
                                            </div>
                                            <Button>
                                                <Send className="h-4 w-4 mr-2" />
                                                {t('sendMessage')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </Card>
                </div>

                <div className="text-xs text-muted-foreground text-center mt-4">
                    © 2025 GanzAfrica. {t('allRightsReserved')}
                </div>
            </div>
        </AppLayout>
    );
};

const DesktopIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

const FileIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);

const BookOpen = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

const Phone = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
);

export default Settings;