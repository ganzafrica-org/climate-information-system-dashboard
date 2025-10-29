import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, User, Lock, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';

const useLanguage = () => {
    const [locale, setLocale] = useState('en');
    
    const translations = {
        en: {
            login: 'Login',
            climateInformationSystem: 'Teganyamuhinzi',
            enterYourCredentials: 'Enter your credentials to access your account',
            username: 'Username',
            enterUsername: 'Enter your username',
            password: 'Password',
            enterPassword: 'Enter your password',
            signingIn: 'Signing in...',
            signIn: 'Sign In',
            dontHaveAccount: "Don't have an account?",
            signUp: 'Sign up',
            allRightsReserved: 'All rights reserved.',
            pleaseEnterUsernameAndPassword: 'Please enter username and password',
            loginFailed: 'Login failed'
        },
        rw: {
            login: 'Kwinjira',
            climateInformationSystem: 'Sisitemu y\'Amakuru y\'Ikirere',
            enterYourCredentials: 'Injiza ibimenyetso byawe kugira ngo ubone konti yawe',
            username: 'Izina ry\'ukoresha',
            enterUsername: 'Injiza izina ryawe ry\'ukoresha',
            password: 'Ijambo ry\'ibanga',
            enterPassword: 'Injiza ijambo ryawe ry\'ibanga',
            signingIn: 'Urinjira...',
            signIn: 'Injira',
            dontHaveAccount: 'Ntufite konti?',
            signUp: 'Iyandikishe',
            allRightsReserved: 'Uburenganzira bwose burahagarikwa.',
            pleaseEnterUsernameAndPassword: 'Nyamuneka injiza izina ry\'ukoresha n\'ijambo ry\'ibanga',
            loginFailed: 'Kwinjira byanze'
        }
    };
    
    const t = (key: string) => translations[locale as keyof typeof translations][key as keyof typeof translations.en] || key;
    
    const changeLanguage = (newLocale: string) => {
        setLocale(newLocale);
    };
    
    return { t, locale, changeLanguage };
};

// Weather Icon Components
const SunIcon = ({ className = "", style = {} }) => (
    <img 
        src="/sun.png" 
        alt="Sun Icon" 
        className={`w-24 h-24 ${className}`} 
        style={{
            filter: 'brightness(1.8) contrast(1.3) saturate(1.2)',
            ...style
        }}
    />
);

const SunRainIcon = ({ className = "", style = {} }) => (
    <img 
        src="/sunrain.png" 
        alt="Sun Rain Icon" 
        className={`w-24 h-24 ${className}`} 
        style={{
            filter: 'brightness(1.8) contrast(1.3) saturate(1.2)',
            ...style
        }}
    />
);

const CloudIcon = ({ className = "", style = {} }) => (
    <img 
        src="/weather.png" 
        alt="Cloud Icon" 
        className={`w-24 h-24 ${className}`} 
        style={{
            filter: 'brightness(1.8) contrast(1.3) saturate(1.2)',
            ...style
        }}
    />
);

const WeatherIcon = ({ className = "", style = {} }) => (
    <img 
        src="/cloud.png " 
        alt="Weather Icon" 
        className={`w-24 h-24 ${className}`} 
        style={{
            filter: 'brightness(1.8) contrast(1.3) saturate(1.2)',
            ...style
        }}
    />
);

// UI Components
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-xl border shadow-lg ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
        {children}
    </h3>
);

const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <p className={`text-sm text-gray-600 ${className}`}>
        {children}
    </p>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`p-6 pt-0 ${className}`}>
        {children}
    </div>
);

const Button = ({ 
    children, 
    variant = 'default', 
    size = 'default', 
    className = '', 
    disabled = false,
    type = 'button',
    onClick,
    asChild = false
}: { 
    children: React.ReactNode; 
    variant?: 'default' | 'outline'; 
    size?: 'default' | 'sm'; 
    className?: string;
    disabled?: boolean;
    type?: 'button' | 'submit';
    onClick?: () => void;
    asChild?: boolean;
}) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    const variants = {
        default: 'bg-[#147677] text-white hover:bg-[#147677]/90',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50'
    };
    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3'
    };
    
    return (
        <button
            type={type}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

const Input = ({ 
    className = '', 
    type = 'text',
    ...props 
}: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        type={type}
        className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147677] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
    />
);

const Label = ({ children, htmlFor, className = '' }: { children: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label htmlFor={htmlFor} className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>
        {children}
    </label>
);

const Alert = ({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default' | 'destructive'; className?: string }) => {
    const variants = {
        default: 'bg-white border-gray-200',
        destructive: 'bg-red-50 border-red-200 text-red-800'
    };
    
    return (
        <div className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};

const AlertDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`text-sm ${className}`}>
        {children}
    </div>
);

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative inline-block text-left">
            <div onClick={() => setIsOpen(!isOpen)}>
                {React.Children.map(children, (child, index) => {
                    if (index === 0) return child;
                    return isOpen ? child : null;
                })}
            </div>
        </div>
    );
};

const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    return <div>{children}</div>;
};

const DropdownMenuContent = ({ children, align = 'start' }: { children: React.ReactNode; align?: 'start' | 'end' }) => (
    <div className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 shadow-md ${align === 'end' ? 'right-0' : 'left-0'} mt-1`}>
        {children}
    </div>
);

const DropdownMenuItem = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div 
        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100"
        onClick={onClick}
    >
        {children}
    </div>
);

const LoginPage = () => {
    const { t, locale, changeLanguage } = useLanguage();
    const { login, isLoading } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.username || !formData.password) {
            setError(t('pleaseEnterUsernameAndPassword') || 'Please enter username and password');
            return;
        }

        try {
            await login(formData.username, formData.password);
            // The AuthProvider will automatically redirect to dashboard after successful login
        } catch (err: any) {
            setError(err.message || t('loginFailed') || 'Login failed');
        }
    };

    return (
        <div 
            className="min-h-screen flex items-center justify-center p-8" 
            style={{ background: 'linear-gradient(135deg, #e5f3ff 0%, #d6e8fc 100%)' }}
        >
            {/* Centered Container with Two Sections */}
            <div className="w-full max-w-6xl flex rounded-3xl shadow-2xl overflow-hidden bg-white">
                {/* Left Panel - Teal Section */}
                <div className="flex-1 bg-[#147677] relative overflow-hidden flex items-center justify-center p-12">
                    {/* Background decorative elements with different weather icons */}
                    <div className="absolute inset-0">
                        <style jsx>{`
                            @keyframes float1 {
                                0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
                                25% { transform: translateY(-20px) translateX(10px) rotate(5deg); }
                                50% { transform: translateY(-10px) translateX(-5px) rotate(-3deg); }
                                75% { transform: translateY(-15px) translateX(8px) rotate(2deg); }
                            }
                            @keyframes float2 {
                                0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
                                33% { transform: translateY(-15px) translateX(-8px) rotate(-4deg); }
                                66% { transform: translateY(-25px) translateX(12px) rotate(6deg); }
                            }
                            @keyframes float3 {
                                0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
                                40% { transform: translateY(-18px) translateX(15px) rotate(8deg); }
                                80% { transform: translateY(-8px) translateX(-10px) rotate(-5deg); }
                            }
                            @keyframes float4 {
                                0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
                                30% { transform: translateY(-22px) translateX(-12px) rotate(-6deg); }
                                60% { transform: translateY(-12px) translateX(18px) rotate(4deg); }
                                90% { transform: translateY(-16px) translateX(-5px) rotate(-2deg); }
                            }
                            .float-1 { animation: float1 6s ease-in-out infinite; }
                            .float-2 { animation: float2 8s ease-in-out infinite; }
                            .float-3 { animation: float3 7s ease-in-out infinite; }
                            .float-4 { animation: float4 9s ease-in-out infinite; }
                        `}</style>
                        
                        <div className="absolute top-20 left-20 opacity-70 float-1">
                            <SunIcon />
                        </div>
                        <div className="absolute top-40 right-32 opacity-80 float-2" style={{ animationDelay: '1s' }}>
                            <SunRainIcon />
                        </div>
                        <div className="absolute bottom-32 left-32 opacity-75 float-3" style={{ animationDelay: '2s' }}>
                            <CloudIcon />
                        </div>
                        <div className="absolute bottom-20 right-20 opacity-70 float-4" style={{ animationDelay: '0.5s' }}>
                            <WeatherIcon />
                        </div>
                    </div>

                    <div className="relative z-10 max-w-md text-center">
                        {/* Logo/Icon */}
                        <div className="mb-8">
                            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17.9999C11.5714 17.9999 19 15.9999 19 6.99994C19 6.99994 14.5 12.9999 7 12.9999V17.9999Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 13C7 13 3 10 3 7C3 7 8.5 5 12 3C12 3 12.5 8.5 7 13Z" />
                                </svg>
                            </div>
                            <h2 className="text-white text-2xl font-bold mb-2">Menya System </h2>
                        </div>

                       <h1 className="text-white text-4xl font-bold mb-6 leading-tight">
                          Musanze <span className="text-white/80">District</span>
                          </h1>

                       
                    </div>
                </div>

                {/* Right Panel - Form Section */}
                <div className="flex-1 flex items-center justify-center p-12 bg-white">
                    <div className="w-full max-w-md">
                        {/* Language Dropdown */}
                        <div className="flex justify-end mb-6">
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

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2 text-center">
                                <h1 className="text-3xl font-bold text-gray-900">{t('login')}</h1>
                                <p className="text-gray-600">
                                    {t('enterYourCredentials') || 'Enter your credentials to access your account'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* Error Message */}
                                {error && (
                                    <Alert variant="destructive" className="flex items-center">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="ml-2">{error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Username Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="username">{t('username')}</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('password')}</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                            disabled={isLoading}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('signingIn') || 'Signing in...'}
                                        </>
                                    ) : (
                                        t('signIn') || 'Sign In'
                                    )}
                                </Button>
                            </div>

                        </form>

                        {/* Footer */}
                        <div className="text-center text-xs text-gray-500 mt-8">
                            © 2025 GanzAfrica. {t('allRightsReserved')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
