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

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
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
                const { accessToken, ...userData } = result.data;
                setToken(accessToken);
                setUser(userData);
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
        localStorage.removeItem('token');
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