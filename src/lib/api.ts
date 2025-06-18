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
        
        this.instance = axios.create({
            baseURL: config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
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

                console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
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
<<<<<<< HEAD
            async (error) => {
                const originalRequest = error.config;
                
=======
            (error) => {

                if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                    console.error('Request timeout:', error.message);

                    const timeoutError = new Error('Request timeout');
                    timeoutError.name = 'TimeoutError';
                    (timeoutError as any).code = 'ECONNABORTED';
                    (timeoutError as any).isTimeout = true;
                    return Promise.reject(timeoutError);
                }

>>>>>>> e06dfd6f0b35f24563c5663ebeed006b33d1207b
                console.error(`✗ API Error:`, error.response?.status, error.response?.data || error.message);

                // Handle 429 rate limiting with retry
                if (error.response?.status === 429 && !originalRequest._retry && !originalRequest.skipRetry) {
                    const retryAfter = error.response.headers['retry-after'];
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.retryDelay;
                    
                    console.log(`Rate limited. Retrying after ${delay}ms...`);
                    
                    originalRequest._retry = true;
                    await this.delay(delay);
                    
                    return this.instance(originalRequest);
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
            if (retries > 0 && error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
                
                console.log(`Rate limited. Retrying in ${waitTime}ms... (${retries} retries left)`);
                await this.delay(waitTime);
                
                return this.retryRequest(requestFn, retries - 1, delay * 2); // Exponential backoff
            }
            throw error;
        }
    }

    async get<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
<<<<<<< HEAD
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
            skipRetry: options.skipRetry,
        };

        if (options.skipRetry) {
            const response = await this.instance.get<T>(url, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.get<T>(url, config);
            return response.data;
        });
    }

    async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
            skipRetry: options.skipRetry,
        };

        if (options.skipRetry) {
            const response = await this.instance.post<T>(url, data, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.post<T>(url, data, config);
            return response.data;
        });
    }

    async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
            skipRetry: options.skipRetry,
        };

        if (options.skipRetry) {
            const response = await this.instance.put<T>(url, data, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.put<T>(url, data, config);
            return response.data;
        });
    }

    async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
            skipRetry: options.skipRetry,
        };

        if (options.skipRetry) {
            const response = await this.instance.patch<T>(url, data, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.patch<T>(url, data, config);
            return response.data;
        });
    }

    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
            skipRetry: options.skipRetry,
        };

        if (options.skipRetry) {
            const response = await this.instance.delete<T>(url, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.delete<T>(url, config);
            return response.data;
        });
=======
        try {
            const config: AxiosRequestConfig = {
                params: options.params,
                headers: options.headers,
                timeout: options.timeout,
            };

            const response = await this.instance.get<T>(url, config);
            return response.data;
        } catch (error: any) {

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                const timeoutError = new Error('Request timeout');
                (timeoutError as any).code = 'ECONNABORTED';
                (timeoutError as any).isTimeout = true;
                throw timeoutError;
            }
            throw error;
        }
    }

    async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        try {
            const config: AxiosRequestConfig = {
                params: options.params,
                headers: options.headers,
                timeout: options.timeout,
            };

            const response = await this.instance.post<T>(url, data, config);
            return response.data;
        } catch (error: any) {

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                const timeoutError = new Error('Request timeout');
                (timeoutError as any).code = 'ECONNABORTED';
                (timeoutError as any).isTimeout = true;
                throw timeoutError;
            }
            throw error;
        }
    }

    async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        try {
            const config: AxiosRequestConfig = {
                params: options.params,
                headers: options.headers,
                timeout: options.timeout,
            };

            const response = await this.instance.put<T>(url, data, config);
            return response.data;
        } catch (error: any) {

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                const timeoutError = new Error('Request timeout');
                (timeoutError as any).code = 'ECONNABORTED';
                (timeoutError as any).isTimeout = true;
                throw timeoutError;
            }
            throw error;
        }
    }

    async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        try {
            const config: AxiosRequestConfig = {
                params: options.params,
                headers: options.headers,
                timeout: options.timeout,
            };

            const response = await this.instance.patch<T>(url, data, config);
            return response.data;
        } catch (error: any) {

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                const timeoutError = new Error('Request timeout');
                (timeoutError as any).code = 'ECONNABORTED';
                (timeoutError as any).isTimeout = true;
                throw timeoutError;
            }
            throw error;
        }
    }

    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        try {
            const config: AxiosRequestConfig = {
                params: options.params,
                headers: options.headers,
                timeout: options.timeout,
            };

            const response = await this.instance.delete<T>(url, config);
            return response.data;
        } catch (error: any) {

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                const timeoutError = new Error('Request timeout');
                (timeoutError as any).code = 'ECONNABORTED';
                (timeoutError as any).isTimeout = true;
                throw timeoutError;
            }
            throw error;
        }
>>>>>>> e06dfd6f0b35f24563c5663ebeed006b33d1207b
    }

    async uploadFile<T = any>(url: string, file: File, options: RequestOptions = {}): Promise<T> {
        try {
            const formData = new FormData();
            formData.append('file', file);

<<<<<<< HEAD
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...options.headers,
            },
            timeout: options.timeout || 60000,
            skipRetry: options.skipRetry,
        };

        if (options.skipRetry) {
            const response = await this.instance.post<T>(url, formData, config);
            return response.data;
        }

        return this.retryRequest(async () => {
            const response = await this.instance.post<T>(url, formData, config);
            return response.data;
        });
    }

=======
            const config: AxiosRequestConfig = {
                params: options.params,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...options.headers,
                },
                timeout: options.timeout || 60000,
            };

            const response = await this.instance.post<T>(url, formData, config);
            return response.data;
        } catch (error: any) {

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                const timeoutError = new Error('Request timeout');
                (timeoutError as any).code = 'ECONNABORTED';
                (timeoutError as any).isTimeout = true;
                throw timeoutError;
            }
            throw error;
        }
    }

>>>>>>> e06dfd6f0b35f24563c5663ebeed006b33d1207b
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
}

// Create instance with retry configuration
const api = new ApiClient({
    maxRetries: 3,
    retryDelay: 1000, 
});

export default api;
export type { RequestOptions };
export { ApiClient };