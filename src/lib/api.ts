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

class ApiClient {
    private instance: AxiosInstance;
    private maxRetries: number;
    private retryDelay: number;

    constructor(config: ApiClientConfig = {}) {
        this.maxRetries = config.maxRetries || 3;
        this.retryDelay = config.retryDelay || 1000;
        
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

                // Handle 404 errors specifically
                if (error.response?.status === 404) {
                    console.error(`404 Not Found: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
                    const notFoundError = new Error(`Endpoint not found: ${error.config?.url}`);
                    notFoundError.name = 'NotFoundError';
                    (notFoundError as any).status = 404;
                    return Promise.reject(notFoundError);
                }

                // Handle 429 rate limiting with retry
                if (error.response?.status === 429 && !error.config._retry && !error.config.skipRetry) {
                    const retryAfter = error.response.headers['retry-after'];
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay;
                    
                    console.log(`Rate limited. Retrying after ${delay}ms...`);
                    
                    error.config._retry = true;
                    await this.delay(delay);
                    
                    return this.instance(error.config);
                }

                if (error.response?.status === 401) {
                    console.error('Unauthorized access - token may be expired');
                    this.setAuthToken(null);
                }

                if (error.response?.status === 403) {
                    console.error('Forbidden - insufficient permissions');
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
            // Don't retry on 404 errors
            if (error.response?.status === 404) {
                throw error;
            }

            if (retries > 0 && (error.response?.status === 429 || error.code === 'ECONNABORTED')) {
                const retryAfter = error.response?.headers?.['retry-after'];
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
                
                console.log(`Retrying request in ${waitTime}ms... (${retries} retries left)`);
                await this.delay(waitTime);
                
                return this.retryRequest(requestFn, retries - 1, delay * 2); // Exponential backoff
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

        if (options.skipRetry) {
            const response = await this.instance.get<T>(cleanUrl, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.get<T>(cleanUrl, config);
            return response.data;
        });
    }

    async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        if (options.skipRetry) {
            const response = await this.instance.post<T>(cleanUrl, data, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.post<T>(cleanUrl, data, config);
            return response.data;
        });
    }

    async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        if (options.skipRetry) {
            const response = await this.instance.put<T>(cleanUrl, data, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.put<T>(cleanUrl, data, config);
            return response.data;
        });
    }

    async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        if (options.skipRetry) {
            const response = await this.instance.patch<T>(cleanUrl, data, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.patch<T>(cleanUrl, data, config);
            return response.data;
        });
    }

    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        const cleanUrl = this.buildUrl(url);
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        if (options.skipRetry) {
            const response = await this.instance.delete<T>(cleanUrl, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.delete<T>(cleanUrl, config);
            return response.data;
        });
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

        if (options.skipRetry) {
            const response = await this.instance.post<T>(cleanUrl, formData, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.post<T>(cleanUrl, formData, config);
            return response.data;
        });
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
}

// Create instance with retry configuration
const api = new ApiClient({
    maxRetries: 3,
    retryDelay: 1000, 
});

export default api;
export type { RequestOptions };
export { ApiClient };