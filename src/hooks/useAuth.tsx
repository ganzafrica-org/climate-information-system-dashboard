import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface User {
    id: number;
    username: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    locations?: any[];
    assignmentLevel?: "district" | "sector" | null;
    sectorName?: string | null;
    districtName?: string | null;
    mustChangePassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, phone: string) => Promise<void>;
    logout: () => void;
    updateProfile: (phone: string) => Promise<void>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    setFirstPassword: (temporaryPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
    isLoading: boolean;
    isAuthenticated: boolean;
    mustChangePassword: boolean;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [mustChangePassword, setMustChangePassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const router = useRouter();

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const isAuthenticated = !!user && !!token;

    const persistMustChangePassword = (value: boolean) => {
        setMustChangePassword(value);
        if (typeof window !== 'undefined') {
            localStorage.setItem('mustChangePassword', value ? 'true' : 'false');
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedMustChange = localStorage.getItem('mustChangePassword') === 'true';
            if (storedMustChange) setMustChangePassword(true);
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
        const isFirstPasswordRoute = router.pathname === '/first-password';

        if (!isAuthenticated && !isPublicRoute) {
            router.replace('/login');
            return;
        }

        if (isAuthenticated && mustChangePassword && !isFirstPasswordRoute) {
            router.replace('/first-password');
            return;
        }

        if (isAuthenticated && !mustChangePassword && (isPublicRoute || isFirstPasswordRoute)) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, isInitialized, mustChangePassword, router.pathname, router]);

    const fetchUserProfile = async (authToken: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                const profile = result.data ?? result;
                setUser(profile);
                if (typeof profile?.mustChangePassword === 'boolean') {
                    persistMustChangePassword(profile.mustChangePassword);
                }
            } else {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
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
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (response.ok) {
                const data = result.data ?? result;
                const accessToken = data.accessToken || data.token;
                if (!accessToken) {
                    throw new Error(result.message || 'Login failed');
                }
                const { accessToken: _access, token: _token, ...rest } = data;
                const userData = data.user ?? rest;
                const mustChange = Boolean(
                    data.mustChangePassword ?? data.user?.mustChangePassword ?? userData?.mustChangePassword
                );
                setToken(accessToken);
                setUser(userData);
                persistMustChangePassword(mustChange);
                localStorage.setItem('token', accessToken);
            } else {
                throw new Error(result.message || 'Login failed');
            }
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username: string, password: string, phone: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, phone }),
            });

            const result = await response.json();

            if (response.ok) {
                await login(username, password);
            } else {
                throw new Error(result.message || 'Registration failed');
            }
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        persistMustChangePassword(false);
        localStorage.removeItem('token');
        localStorage.removeItem('mustChangePassword');
    };

    const updateProfile = async (phone: string) => {
        if (!token) throw new Error('No authentication token');

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
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
            } else {
                throw new Error(result.message || 'Profile update failed');
            }
        } catch (error) {
            throw error;
        }
    };

    const changePassword = async (oldPassword: string, newPassword: string) => {
        if (!token) throw new Error('No authentication token');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldPassword, newPassword }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Password change failed');
            }
        } catch (error) {
            throw error;
        }
    };

    const setFirstPassword = async (
        temporaryPassword: string,
        newPassword: string,
        confirmPassword: string
    ) => {
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`${API_BASE_URL}/api/auth/first-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ temporaryPassword, newPassword, confirmPassword }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                result.message ||
                result.error ||
                result.data?.message ||
                'Failed to set password';
            throw new Error(message);
        }

        persistMustChangePassword(false);
        setUser((current) => (current ? { ...current, mustChangePassword: false } : current));
        const nextToken = result.data?.accessToken || result.accessToken;
        if (nextToken) {
            setToken(nextToken);
            localStorage.setItem('token', nextToken);
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
        setFirstPassword,
        isLoading,
        isAuthenticated,
        mustChangePassword,
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