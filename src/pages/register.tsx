import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, User, Lock, Phone, Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Register: NextPage = () => {
    const { t, locale, changeLanguage } = useLanguage();
    const { register, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        phone: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (error) setError('');
    };

    const validateForm = () => {
        if (!formData.username || !formData.password || !formData.confirmPassword || !formData.phone) {
            setError(t('pleaseEnterAllFields') || 'Please fill in all fields');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t('passwordsDoNotMatch') || 'Passwords do not match');
            return false;
        }

        if (formData.password.length < 6) {
            setError(t('passwordTooShort') || 'Password must be at least 6 characters long');
            return false;
        }

        const phoneRegex = /^\+250\d{9}$/;
        if (!phoneRegex.test(formData.phone)) {
            setError(t('invalidPhoneFormat') || 'Phone number must be in format +250XXXXXXXXX');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        try {
            await register(formData.username, formData.password, formData.phone);
        } catch (err: any) {
            setError(err.message || t('registrationFailed') || 'Registration failed');
        }
    };

    return (
        <>
            <Head>
                <title>{t('register')} | {t('climateInformationSystem')}</title>
            </Head>

            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="flex items-center">
                                    <Globe className="h-4 w-4 mr-1" />
                                    {locale === 'en' ? 'English' : 'Kinyarwanda'}
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

                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-ganz-primary flex items-center justify-center">
                                <div className="h-10 w-10 text-white">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7 17.9999C11.5714 17.9999 19 15.9999 19 6.99994C19 6.99994 14.5 12.9999 7 12.9999V17.9999Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M7 13C7 13 3 10 3 7C3 7 8.5 5 12 3C12 3 12.5 8.5 7 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-ganz-primary">GanzAfrica</h1>
                            <p className="text-muted-foreground">{t('climateInformationSystem')}</p>
                        </div>
                    </div>

                    <Card>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-center">{t('createAccount') || 'Create Account'}</CardTitle>
                            <CardDescription className="text-center">
                                {t('enterYourDetails') || 'Enter your details to create your account'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive">
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="username">{t('username')}</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="username"
                                            name="username"
                                            type="text"
                                            placeholder={t('enterUsername') || 'Enter your username'}
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="pl-10"
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">{t('phone')}</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="+250788123456"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="pl-10"
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {t('phoneFormat') || 'Format: +250XXXXXXXXX'}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('password')}</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder={t('enterPassword') || 'Enter your password'}
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            className="pl-10 pr-10"
                                            disabled={isLoading}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                            disabled={isLoading}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">{t('confirmPassword') || 'Confirm Password'}</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            placeholder={t('confirmYourPassword') || 'Confirm your password'}
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="pl-10 pr-10"
                                            disabled={isLoading}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                            disabled={isLoading}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('creatingAccount') || 'Creating account...'}
                                        </>
                                    ) : (
                                        t('createAccount') || 'Create Account'
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
                                    <Link href="/login" className="text-ganz-primary hover:underline font-medium">
                                        {t('signIn') || 'Sign in'}
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-center text-xs text-muted-foreground">
                        © 2025 GanzAfrica. {t('allRightsReserved')}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;