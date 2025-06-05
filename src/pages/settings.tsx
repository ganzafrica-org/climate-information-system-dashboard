import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
    Bell,
    Check,
    ChevronDown,
    Database,
    Globe,
    HelpCircle,
    InfoIcon,
    Lock,
    Mail,
    RefreshCw,
    Save,
    Settings as SettingsIcon,
    Shield,
    User,
    Send,
    Trash,
    LogOut,
    Eye,
    EyeOff,
    Loader2
} from 'lucide-react';

const Settings: NextPage = () => {
    const { t, locale, changeLanguage } = useLanguage();
    const { user, updateProfile, changePassword } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    const [profileData, setProfileData] = useState({
        phone: user?.phone || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState('');

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileLoading(true);

        const phoneRegex = /^\+250\d{9}$/;
        if (!phoneRegex.test(profileData.phone)) {
            setProfileError(t('invalidPhoneFormat') || 'Phone number must be in format +250XXXXXXXXX');
            setProfileLoading(false);
            return;
        }

        try {
            await updateProfile(profileData.phone);
            toast.success(t('profileUpdated') || 'Profile updated successfully');
        } catch (error: any) {
            setProfileError(error.message || t('profileUpdateFailed') || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordLoading(true);

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError(t('pleaseEnterAllFields') || 'Please fill in all fields');
            setPasswordLoading(false);
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError(t('passwordsDoNotMatch') || 'New passwords do not match');
            setPasswordLoading(false);
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setPasswordError(t('passwordTooShort') || 'New password must be at least 6 characters long');
            setPasswordLoading(false);
            return;
        }

        try {
            await changePassword(passwordData.currentPassword, passwordData.newPassword);
            toast.success(t('passwordChanged') || 'Password changed successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
        } catch (error: any) {
            setPasswordError(error.message || t('passwordChangeFailed') || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

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
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 cursor-pointer ${
                                                    locale === 'en' ? 'bg-muted/50 border-primary' : ''
                                                }`}
                                                onClick={() => changeLanguage('en')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span>English</span>
                                                </div>
                                                {locale === 'en' && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div
                                                className={`flex items-center justify-between rounded-md border px-3 py-2 w-48 cursor-pointer ${
                                                    locale === 'rw' ? 'bg-muted/50 border-primary' : ''
                                                }`}
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
                                        <h3 className="text-base font-medium">{t('defaultValues')}</h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {t('defaultValuesDesc')}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="defaultLocation">{t('defaultLocation')}</Label>
                                                <select
                                                    id="defaultLocation"
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <option value="all">{t('allSectors')}</option>
                                                    {['Kinigi', 'Muhoza', 'Cyuve', 'Gataraga'].map(sector => (
                                                        <option key={sector} value={sector}>{sector}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="defaultCrop">{t('defaultCrop')}</Label>
                                                <select
                                                    id="defaultCrop"
                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <option value="all">{t('allCrops')}</option>
                                                    {['Maize', 'Potatoes', 'Beans', 'Vegetables'].map(crop => (
                                                        <option key={crop} value={crop}>{crop}</option>
                                                    ))}
                                                </select>
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
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-ganz-primary rounded-full h-16 w-16 flex items-center justify-center">
                                                <User className="h-8 w-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-medium">{user?.username}</h3>
                                                <p className="text-sm text-muted-foreground">{user?.phone}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                                            {profileError && (
                                                <Alert variant="destructive">
                                                    <AlertDescription>{profileError}</AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="username">{t('username')}</Label>
                                                    <Input
                                                        id="username"
                                                        value={user?.username || ''}
                                                        disabled
                                                        className="bg-muted"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('usernameCannotBeChanged') || 'Username cannot be changed'}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="role">{t('role')}</Label>
                                                    <Input
                                                        id="role"
                                                        value={user?.role || ''}
                                                        disabled
                                                        className="bg-muted capitalize"
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="phone">{t('phone')}</Label>
                                                    <Input
                                                        id="phone"
                                                        type="tel"
                                                        placeholder="+250788123456"
                                                        value={profileData.phone}
                                                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                                        disabled={profileLoading}
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('phoneFormat') || 'Format: +250XXXXXXXXX'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <Button type="submit" disabled={profileLoading}>
                                                    {profileLoading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            {t('updating') || 'Updating...'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-4 w-4 mr-2" />
                                                            {t('updateProfile') || 'Update Profile'}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                        <h3 className="text-base font-medium">{t('changePassword')}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {t('changePasswordDesc')}
                                        </p>

                                        <form onSubmit={handlePasswordChange} className="space-y-4">
                                            {passwordError && (
                                                <Alert variant="destructive">
                                                    <AlertDescription>{passwordError}</AlertDescription>
                                                </Alert>
                                            )}

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="currentPassword"
                                                            type={showCurrentPassword ? 'text' : 'password'}
                                                            placeholder="••••••••"
                                                            value={passwordData.currentPassword}
                                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                                            disabled={passwordLoading}
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                            disabled={passwordLoading}
                                                        >
                                                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="newPassword">{t('newPassword')}</Label>
                                                        <div className="relative">
                                                            <Input
                                                                id="newPassword"
                                                                type={showNewPassword ? 'text' : 'password'}
                                                                placeholder="••••••••"
                                                                value={passwordData.newPassword}
                                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                                disabled={passwordLoading}
                                                                className="pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                                disabled={passwordLoading}
                                                            >
                                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="confirmPassword">{t('confirmNewPassword')}</Label>
                                                        <div className="relative">
                                                            <Input
                                                                id="confirmPassword"
                                                                type={showConfirmPassword ? 'text' : 'password'}
                                                                placeholder="••••••••"
                                                                value={passwordData.confirmPassword}
                                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                                disabled={passwordLoading}
                                                                className="pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                                disabled={passwordLoading}
                                                            >
                                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <Button type="submit" disabled={passwordLoading}>
                                                    {passwordLoading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            {t('changingPassword') || 'Changing Password...'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Lock className="h-4 w-4 mr-2" />
                                                            {t('changePassword')}
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
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
                    </Card>
                </div>

                <div className="text-xs text-muted-foreground text-center mt-4">
                    © 2025 GanzAfrica. {t('allRightsReserved')}
                </div>
            </div>
        </AppLayout>
    );
};

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