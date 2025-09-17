import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface ApiClientConfig {
    baseURL?: string;
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
}

interface RequestOptions {
    params?: Record<string, any>;
    headers?: Record<string, string>;
    timeout?: number;
    skipRetry?: boolean;
}

// User types
interface User {
    id: string;
    username: string;
    email: string;
    role: "admin" | "agronomist";
    status?: "active" | "pending" | "suspended";
    phone?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
    lastLogin?: string;
    emailVerified?: boolean;
}

interface CreateUserInput {
    username: string;
    email: string;
    role: "admin" | "agronomist";
    status?: "active" | "pending" | "suspended";
    phone?: string;
    password?: string;
}

interface UpdateUserInput {
    username?: string;
    email?: string;
    role?: "admin" | "agronomist";
    status?: "active" | "pending" | "suspended";
    phone?: string;
    password?: string;
    isActive?: boolean;
}

class ApiClient {
    private instance: AxiosInstance;
    private maxRetries: number;
    private retryDelay: number;

    constructor(config: ApiClientConfig = {}) {
        this.maxRetries = config.maxRetries || 6;
        this.retryDelay = config.retryDelay || 500;
        
        // Ensure baseURL ends without trailing slash
        const baseURL = config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const cleanBaseURL = baseURL.replace(/\/$/, '');
        
        this.instance = axios.create({
            baseURL: cleanBaseURL,
            timeout: config.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.instance.interceptors.request.use(
            (config) => {
                const token = this.getAuthToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                // Clean URL path - remove double slashes
                if (config.url) {
                    config.url = config.url.replace(/\/+/g, '/');
                    if (config.url.startsWith('/')) {
                        config.url = config.url.substring(1);
                    }
                }

                console.log(`Making ${config.method?.toUpperCase()} request to:`, `${config.baseURL}/${config.url}`);
                return config;
            },
            (error) => {
                console.error('Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                console.log(`✓ ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status);
                return response;
            },
            async (error) => {
                if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    console.error('Request timeout:', error.message);

                    const timeoutError = new Error('Request timeout');
                    timeoutError.name = 'TimeoutError';
                    (timeoutError as any).code = 'ECONNABORTED';
                    (timeoutError as any).isTimeout = true;
                    return Promise.reject(timeoutError);
                }

                // Log the full error details for debugging
                console.error(`✗ API Error:`, {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.response?.data,
                    message: error.message
                });

                // Handle 429 rate limiting with bounded retries here (in addition to service-level retries)
                if (error.response?.status === 429 && !error.config.skipRetry) {
                    const retryCount = (error.config._retryCount || 0);
                    const maxInterceptorRetries = Math.min(2, this.maxRetries - 1);
                    if (retryCount < maxInterceptorRetries) {
                        const retryAfter = error.response.headers?.['retry-after'];
                        const baseDelay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay;
                        const backoff = baseDelay * Math.pow(2, retryCount);
                        const jitter = Math.floor(Math.random() * 150);
                        const wait = backoff + jitter;
                        console.log(`Rate limited (429). Interceptor retry ${retryCount + 1}/${maxInterceptorRetries} in ${wait}ms`);
                        error.config._retryCount = retryCount + 1;
                        await this.delay(wait);
                        return this.instance(error.config);
                    }
                }

                if (error.response?.status === 401) {
                    console.error('Unauthorized access - token may be expired');
                    this.setAuthToken(null);
                }

                if (error.response?.status === 403) {
                    console.error('Forbidden - insufficient permissions');
                }

                // Don't transform the error here - let the service layer handle it
                // Just ensure we have the response data attached for proper error handling
                if (error.response) {
                    error.status = error.response.status;
                    error.data = error.response.data;
                }

                return Promise.reject(error);
            }
        );
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        retries: number = this.maxRetries,
        delay: number = this.retryDelay
    ): Promise<T> {
        try {
            return await requestFn();
        } catch (error: any) {
            // Don't retry on client errors (4xx) except 429
            if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
                throw error;
            }

            if (retries > 0 && (error.response?.status === 429 || error.code === 'ECONNABORTED')) {
                const retryAfter = error.response?.headers?.['retry-after'];
                const base = retryAfter ? parseInt(retryAfter) * 1000 : delay;
                const jitter = Math.floor(Math.random() * 200);
                const waitTime = base + jitter;
                console.log(`Retrying request in ${waitTime}ms... (${retries} retries left)`);
                await this.delay(waitTime);
                return this.retryRequest(requestFn, retries - 1, Math.min(delay * 2, 8000)); // Cap backoff
            }
            throw error;
        }
    }

    // Helper method to build clean URLs
    private buildUrl(url: string): string {
        // Remove leading slash if present
        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        return cleanUrl;
    }

    async get<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        try {
            if (options.skipRetry) {
                const response = await this.instance.get<T>(cleanUrl, config);
                return response.data;
            }

            return await this.retryRequest(async () => {
                const response = await this.instance.get<T>(cleanUrl, config);
                return response.data;
            });
        } catch (error: any) {
            // Ensure error has proper structure for service layer
            throw this.normalizeError(error);
        }
    }

    async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        try {
            if (options.skipRetry) {
                const response = await this.instance.post<T>(cleanUrl, data, config);
                return response.data;
            }

            return await this.retryRequest(async () => {
                const response = await this.instance.post<T>(cleanUrl, data, config);
                return response.data;
            });
        } catch (error: any) {
            // Ensure error has proper structure for service layer
            throw this.normalizeError(error);
        }
    }

    async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        try {
            if (options.skipRetry) {
                const response = await this.instance.put<T>(cleanUrl, data, config);
                return response.data;
            }

            return await this.retryRequest(async () => {
                const response = await this.instance.put<T>(cleanUrl, data, config);
                return response.data;
            });
        } catch (error: any) {
            throw this.normalizeError(error);
        }
    }

    async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        try {
            if (options.skipRetry) {
                const response = await this.instance.patch<T>(cleanUrl, data, config);
                return response.data;
            }

            return await this.retryRequest(async () => {
                const response = await this.instance.patch<T>(cleanUrl, data, config);
                return response.data;
            });
        } catch (error: any) {
            throw this.normalizeError(error);
        }
    }

    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        try {
            if (options.skipRetry) {
                const response = await this.instance.delete<T>(cleanUrl, config);
                return response.data;
            }

            return await this.retryRequest(async () => {
                const response = await this.instance.delete<T>(cleanUrl, config);
                return response.data;
            });
        } catch (error: any) {
            throw this.normalizeError(error);
        }
    }

    async uploadFile<T = any>(url: string, file: File, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const formData = new FormData();
        formData.append('file', file);

        const config: AxiosRequestConfig = {
            params: options.params,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...options.headers,
            },
            timeout: options.timeout || 60000,
        };

        try {
            if (options.skipRetry) {
                const response = await this.instance.post<T>(cleanUrl, formData, config);
                return response.data;
            }

            return await this.retryRequest(async () => {
                const response = await this.instance.post<T>(cleanUrl, formData, config);
                return response.data;
            });
        } catch (error: any) {
            throw this.normalizeError(error);
        }
    }

    // Normalize error to ensure consistent structure for service layer
    private normalizeError(error: any): any {
        if (error.response) {
            // Axios error with response
            return {
                ...error,
                response: {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    headers: error.response.headers,
                },
                message: error.message,
                status: error.response.status,
            };
        } else if (error.request) {
            // Network error
            return {
                ...error,
                message: error.message || 'Network error',
                isNetworkError: true,
            };
        } else {
            // Other error
            return error;
        }
    }

    exportAsCSV(data: any[], filename: string, headers?: string[]): void {
        if (data.length === 0) {
            throw new Error('No data to export');
        }

        const csvHeaders = headers || Object.keys(data[0]);

        const csvContent = [
            csvHeaders.join(','),
            ...data.map(row =>
                csvHeaders.map(header => {
                    const value = row[header];

                    if (Array.isArray(value)) {
                        return `"${value.join('; ')}"`;
                    }
                    if (typeof value === 'object' && value !== null) {
                        return `"${JSON.stringify(value)}"`;
                    }

                    const stringValue = String(value || '');
                    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    setAuthToken(token: string | null) {
        if (token) {
            this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (typeof window !== 'undefined') {
                localStorage.setItem('token', token);
            }
        } else {
            delete this.instance.defaults.headers.common['Authorization'];
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
            }
        }
    }

    getAuthToken(): string | null {
        return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    }

    // Helper method to check if an endpoint exists
    async checkEndpoint(url: string): Promise<boolean> {
        try {
            await this.get(url, { skipRetry: true });
            return true;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return false;
            }
            // For other errors, we assume the endpoint exists but has other issues
            return true;
        }
    }

    // Get the base URL for debugging
    getBaseURL(): string {
        return this.instance.defaults.baseURL || '';
    }

    // User service methods
    async listUsers(): Promise<User[]> {
        const data: any = await this.get("/api/admin/users");
        const users: User[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.users)
                ? data.users
                : Array.isArray(data?.data)
                    ? data.data
                    : Array.isArray(data?.data?.users)
                        ? data.data.users
                        : [];
        return users;
    }

    async getUser(userId: string | number): Promise<User> {
        const data = await this.get<User>(`/api/admin/users/${userId}`);
        return data;
    }

    async createUser(input: CreateUserInput): Promise<User> {
        const data = await this.post<User>("/api/admin/users", input);
        return data;
    }

    async updateUserRole(userId: string | number, role: User["role"]): Promise<User> {
        const data = await this.patch<User>(`/api/admin/users/${userId}/role`, { role });
        return data;
    }

    async deleteUser(userId: string | number): Promise<{ success: boolean }> {
        const data = await this.delete<{ success: boolean }>(`/api/admin/users/${userId}`);
        return data;
    }
}

// Create instance with retry configuration
const api = new ApiClient({
    maxRetries: 3,
    retryDelay: 1000, 
});

// User service functions as named exports
export async function listUsers(): Promise<User[]> {
    const data: any = await api.get("/api/admin/users");
    const users: User[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
            ? data.users
            : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.data?.users)
                    ? data.data.users
                    : [];
    return users;
}

export async function getUser(userId: string | number): Promise<User> {
    const data = await api.get<User>(`/api/admin/users/${userId}`);
    return data;
}

export async function createUser(input: CreateUserInput): Promise<User> {
    const data = await api.post<User>("/api/admin/users", input);
    return data;
}

export async function updateUserRole(userId: string | number, role: User["role"]): Promise<User> {
    const data = await api.patch<User>(`/api/admin/users/${userId}/role`, { role });
    return data;
}

export async function deleteUser(userId: string | number): Promise<{ success: boolean }> {
    const data = await api.delete<{ success: boolean }>(`/api/admin/users/${userId}`);
    return data;
}

// Default export and other exports
export default api;
export type { RequestOptions, User, CreateUserInput, UpdateUserInput };
export { ApiClient };