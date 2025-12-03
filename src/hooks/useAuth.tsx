import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { toast } from 'sonner';

interface User {
    id: number;
    username: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    locations?: any[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, phone: string) => Promise<void>;
    logout: () => void;
    updateProfile: (phone: string) => Promise<void>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const router = useRouter();

    // Get API base URL - always evaluate at runtime to ensure correct URL in production
    const getApiUrl = () => getApiBaseUrl();

    const isAuthenticated = !!user && !!token;

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                setToken(storedToken);
                await fetchUserProfile(storedToken);
            }
            setIsLoading(false);
            setIsInitialized(true);
        };

        initAuth();
    }, []);

    useEffect(() => {
        if (!isInitialized) return;

        const isPublicRoute = router.pathname === '/login' || router.pathname === '/register';

        if (isAuthenticated && isPublicRoute) {
            router.push('/dashboard');
        } else if (!isAuthenticated && !isPublicRoute) {
            router.push('/login');
        }
    }, [isAuthenticated, isInitialized, router.pathname, router]);

    const fetchUserProfile = async (authToken: string) => {
        try {
            const response = await fetch(`${getApiUrl()}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                setUser(result.data);
            } else {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
                toast.error('Session expired. Please login again.');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        }
    };

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            // Handle response errors (non-200 status)
            if (!response.ok) {
                let errorMsg = 'Login failed. Please check your credentials and try again.';
                try {
                    const result = await response.json();
                    const serverMsg = (result.message || result.error || '').toLowerCase();
                    
                    if (serverMsg) {
                        // Check if user doesn't exist
                        if (response.status === 404 || 
                            serverMsg.includes('user not found') || 
                            serverMsg.includes('user doesn\'t exist') || 
                            serverMsg.includes('user does not exist') ||
                            serverMsg.includes('no user found') ||
                            serverMsg.includes('user not registered') ||
                            serverMsg.includes('account not found')) {
                            errorMsg = 'The user doesn\'t exist. If you\'re sure you are supposed to login, contact admin to give you access to the project.';
                        }
                        // Check if password/email is wrong
                        else if (response.status === 401 || 
                                 serverMsg.includes('invalid') || 
                                 serverMsg.includes('incorrect') ||
                                 serverMsg.includes('wrong password') ||
                                 serverMsg.includes('wrong email') ||
                                 serverMsg.includes('password incorrect') ||
                                 serverMsg.includes('email incorrect') ||
                                 serverMsg.includes('credentials') ||
                                 serverMsg.includes('authentication failed')) {
                            errorMsg = 'Your email or password is wrong. Please check and login again.';
                        }
                        // Check for access denied
                        else if (response.status === 403 || serverMsg.includes('forbidden') || serverMsg.includes('access denied')) {
                            errorMsg = 'Access denied. Your account may be inactive. Please contact your administrator.';
                        }
                        // Check for too many attempts
                        else if (response.status === 429 || serverMsg.includes('too many')) {
                            errorMsg = 'Too many login attempts. Please wait a few minutes and try again.';
                        }
                        // Generic error with server message
                        else {
                            errorMsg = result.message || result.error || 'Please try again or contact support if the problem persists.';
                        }
                    } else {
                        // No server message - use status code to determine error
                        if (response.status === 401) {
                            errorMsg = 'Your email or password is wrong. Please check and login again.';
                        } else if (response.status === 404) {
                            errorMsg = 'The user doesn\'t exist. If you\'re sure you are supposed to login, contact admin to give you access to the project.';
                        } else if (response.status === 403) {
                            errorMsg = 'Access denied. Your account may be inactive. Please contact your administrator.';
                        } else if (response.status === 429) {
                            errorMsg = 'Too many login attempts. Please wait a few minutes and try again.';
                        } else if (response.status >= 500) {
                            errorMsg = 'Server is temporarily unavailable. Please try again in a few moments.';
                        } else {
                            errorMsg = `Unable to login (Error ${response.status}). Please try again or contact support.`;
                        }
                    }
                } catch (parseError) {
                    // If response is not JSON, provide helpful message based on status
                    if (response.status === 401) {
                        errorMsg = 'Your email or password is wrong. Please check and login again.';
                    } else if (response.status === 404) {
                        errorMsg = 'The user doesn\'t exist. If you\'re sure you are supposed to login, contact admin to give you access to the project.';
                    } else if (response.status >= 500) {
                        errorMsg = 'Server is temporarily unavailable. Please try again in a few moments.';
                    } else {
                        errorMsg = 'Unable to complete login. Please try again or contact support.';
                    }
                }
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Parse successful response
            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                const errorMsg = 'Received an invalid response from the server. Please refresh the page and try logging in again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Check if response has valid data
            if (result.data && result.data.accessToken) {
                const { accessToken, ...userData } = result.data;
                setToken(accessToken);
                setUser(userData);
                localStorage.setItem('token', accessToken);
                toast.success('Login successful! Redirecting to dashboard...');
            } else {
                const errorMsg = result.message || 'The server response was incomplete. Please try logging in again, or contact support if the issue continues.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error: any) {
            // Handle network errors and other fetch failures
            if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
                const errorMsg = 'Unable to connect to the server. Please check your internet connection and ensure you are online, then try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            // Handle connection refused errors
            if (error.message && (error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('Connection refused'))) {
                const errorMsg = 'Cannot reach the server. Please verify you have an active internet connection and try again. If the problem persists, contact your system administrator.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            // Handle timeout errors
            if (error.message && (error.message.includes('timeout') || error.message.includes('Timeout'))) {
                const errorMsg = 'The login request timed out. This may be due to a slow connection. Please check your internet speed and try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            // If error already has a message (from above), it means toast was already shown
            // But ensure we always show toast for any unhandled error
            if (!error.message || error.message === 'Login failed') {
                const errorMsg = 'An unexpected error occurred during login. Please try again in a moment. If the problem continues, contact support for assistance.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            // Re-throw error with message (toast already shown above)
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, password: string, phone: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, phone }),
            });

            if (!response.ok) {
                let errorMsg = 'Registration failed. Please check your information and try again.';
                try {
                    const result = await response.json();
                    const serverMsg = result.message || result.error;
                    if (serverMsg) {
                        if (response.status === 409 || serverMsg.toLowerCase().includes('already exists') || serverMsg.toLowerCase().includes('duplicate')) {
                            errorMsg = 'This username or email is already registered. Please use a different one or try logging in instead.';
                        } else if (response.status === 400 || serverMsg.toLowerCase().includes('invalid') || serverMsg.toLowerCase().includes('required')) {
                            errorMsg = serverMsg + ' Please check your information and try again.';
                        } else {
                            errorMsg = serverMsg + ' Please try again or contact support if the problem persists.';
                        }
                    } else {
                        if (response.status === 409) {
                            errorMsg = 'This account already exists. Please try logging in instead.';
                        } else if (response.status === 400) {
                            errorMsg = 'Invalid registration information. Please check all fields and try again.';
                        } else {
                            errorMsg = 'Unable to complete registration. Please try again or contact support.';
                        }
                    }
                } catch (parseError) {
                    errorMsg = 'Unable to process registration. Please try again or contact support.';
                }
                toast.error(errorMsg);
                setIsLoading(false);
                throw new Error(errorMsg);
            }

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                const errorMsg = 'Registration completed but received an invalid response. Please try logging in manually.';
                toast.error(errorMsg);
                setIsLoading(false);
                throw new Error(errorMsg);
            }

            if (response.ok) {
                toast.success('Registration successful! Logging you in...');
                await login(username, password);
            }
        } catch (error: any) {
            setIsLoading(false);
            // Handle network errors
            if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
                const errorMsg = 'Unable to connect to the server. Please check your internet connection and try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            // If error already has a message (from above), toast was already shown
            if (!error.message || error.message === 'Registration failed') {
                const errorMsg = 'An unexpected error occurred during registration. Please try again in a moment.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        toast.success('Logged out successfully');
    };

    const updateProfile = async (phone: string) => {
        if (!token) throw new Error('No authentication token');

        try {
            const response = await fetch(`${getApiUrl()}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone }),
            });

            const result = await response.json();

            if (response.ok) {
                setUser(result.data);
                toast.success('Profile updated successfully!');
            } else {
                let errorMsg = result.message || 'Unable to update profile. Please try again.';
                if (result.message && (result.message.toLowerCase().includes('invalid') || result.message.toLowerCase().includes('format'))) {
                    errorMsg = result.message + ' Please check the phone number format and try again.';
                } else if (result.message) {
                    errorMsg = result.message + ' Please try again or contact support if the issue continues.';
                }
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
        } catch (error: any) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                const errorMsg = 'Unable to connect to the server. Please check your internet connection and try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            if (!error.message || error.message === 'Profile update failed') {
                const errorMsg = 'Failed to update profile. Please check your internet connection and try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            throw error;
        }
    };

    const changePassword = async (oldPassword: string, newPassword: string) => {
        if (!token) throw new Error('No authentication token');

        try {
            const response = await fetch(`${getApiUrl()}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldPassword, newPassword }),
            });

            const result = await response.json();

            if (!response.ok) {
                let errorMsg = result.message || 'Unable to change password. Please try again.';
                if (result.message) {
                    if (result.message.toLowerCase().includes('incorrect') || result.message.toLowerCase().includes('wrong') || result.message.toLowerCase().includes('current')) {
                        errorMsg = 'Current password is incorrect. Please enter the correct current password and try again.';
                    } else if (result.message.toLowerCase().includes('same') || result.message.toLowerCase().includes('match')) {
                        errorMsg = 'New password cannot be the same as your current password. Please choose a different password.';
                    } else if (result.message.toLowerCase().includes('weak') || result.message.toLowerCase().includes('short') || result.message.toLowerCase().includes('length')) {
                        errorMsg = result.message + ' Please choose a stronger password (at least 6 characters) and try again.';
                    } else {
                        errorMsg = result.message + ' Please try again or contact support if the issue continues.';
                    }
                }
                toast.error(errorMsg);
                throw new Error(errorMsg);
            } else {
                toast.success('Password changed successfully! You can now use your new password for future logins.');
            }
        } catch (error: any) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                const errorMsg = 'Unable to connect to the server. Please check your internet connection and try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            if (!error.message || error.message === 'Password change failed') {
                const errorMsg = 'Failed to change password. Please check your internet connection and try again.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }
            throw error;
        }
    };

    const value = {
        user,
        token,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        isLoading,
        isAuthenticated,
        setUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}