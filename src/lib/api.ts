
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface ApiClientConfig {
    baseURL?: string;
    timeout?: number;
}

interface RequestOptions {
    params?: Record<string, any>;
    headers?: Record<string, string>;
    timeout?: number;
}

class ApiClient {
    private instance: AxiosInstance;

    constructor(config: ApiClientConfig = {}) {
        this.instance = axios.create({
            baseURL: config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3000',
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
            (error) => {
                console.error(`✗ API Error:`, error.response?.status, error.response?.data || error.message);

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

    async get<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        const response = await this.instance.get<T>(url, config);
        return response.data;
    }

    async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        const response = await this.instance.post<T>(url, data, config);
        return response.data;
    }

    async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        const response = await this.instance.put<T>(url, data, config);
        return response.data;
    }

    async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        const response = await this.instance.patch<T>(url, data, config);
        return response.data;
    }

    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
        const config: AxiosRequestConfig = {
            params: options.params,
            headers: options.headers,
            timeout: options.timeout,
        };

        const response = await this.instance.delete<T>(url, config);
        return response.data;
    }

    async uploadFile<T = any>(url: string, file: File, options: RequestOptions = {}): Promise<T> {
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

        const response = await this.instance.post<T>(url, formData, config);
        return response.data;
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
}

const api = new ApiClient();

export default api;

export type { RequestOptions };
export { ApiClient };