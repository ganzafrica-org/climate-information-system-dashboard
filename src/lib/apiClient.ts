import { useEffect } from 'react';
import { useQuery, useMutation, QueryKey, UseQueryOptions } from '@tanstack/react-query';
import axios, { AxiosError, AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            console.error('Unauthorized access');
        }
        return Promise.reject(error);
    }
);

export interface ApiResponse<T = any> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
}

export interface PaginationParams {
    page?: number;
    pageSize?: number;
}

interface BaseRequestParams {
    params?: Record<string, any>;
    pagination?: PaginationParams;
}

type GetRequestParams = BaseRequestParams;

interface MutationRequestParams extends BaseRequestParams {
    data?: any;
}

const buildQueryParams = (
    params: Record<string, any> = {},
    pagination?: PaginationParams
): Record<string, any> => {
    const queryParams = { ...params };

    if (pagination) {
        queryParams.page = pagination.page || 1;
        queryParams.pageSize = pagination.pageSize || 10;
    }

    return queryParams;
};

const buildQueryKey = (
    endpoint: string,
    params?: Record<string, any>,
    pagination?: PaginationParams
): QueryKey => {
    if (!params && !pagination) {
        return [endpoint];
    }

    return [endpoint, params, pagination];
};

export function useApiGet<T = any>(
    endpoint: string,
    options: GetRequestParams = {}
): ApiResponse<T> {
    const { params, pagination } = options;
    const queryParams = buildQueryParams(params, pagination);
    const queryKey = buildQueryKey(endpoint, params, pagination);

    const queryOptions: UseQueryOptions<T, Error, T> = {
        staleTime: 1000 * 60 * 5, // 5 minutes
        placeholderData: !!pagination ? (prevData: any) => prevData : undefined,
        retry: 1,
        queryKey
    };

    const { data, isLoading, error } = useQuery<T, Error, T, QueryKey>({
        queryFn: async () => {
            const response = await axiosInstance.get(endpoint, { params: queryParams });
            return response.data;
        },
        ...queryOptions,
    });

    return { data: data || null, isLoading, error };
}

export function useApiPost<T = any>(
    endpoint: string,
    options: MutationRequestParams = {}
): ApiResponse<T> {
    const { data: mutationData, params } = options;

    const mutation = useMutation<T, Error, any>({
        mutationFn: async (variables) => {
            const response = await axiosInstance.post(endpoint, variables, { params });
            return response.data;
        },
    });

    useEffect(() => {
        if (mutationData !== undefined) {
            mutation.mutate(mutationData);
        }
    }, [mutation, mutationData]);

    return {
        data: mutation.data || null,
        isLoading: mutation.isPending,
        error: mutation.error
    };
}

export function useApiPut<T = any>(
    endpoint: string,
    options: MutationRequestParams = {}
): ApiResponse<T> {
    const { data: mutationData, params } = options;

    const mutation = useMutation<T, Error, any>({
        mutationFn: async (variables) => {
            const response = await axiosInstance.put(endpoint, variables, { params });
            return response.data;
        },
    });

    useEffect(() => {
        if (mutationData !== undefined) {
            mutation.mutate(mutationData);
        }
    }, [mutation, mutationData]);

    return {
        data: mutation.data || null,
        isLoading: mutation.isPending,
        error: mutation.error
    };
}

export function useApiDelete<T = any>(
    endpoint: string,
    options: MutationRequestParams = {}
): ApiResponse<T> {
    const { data: triggerData, params } = options;

    const mutation = useMutation<T, Error, void>({
        mutationFn: async () => {
            const response = await axiosInstance.delete(endpoint, { params });
            return response.data;
        },
    });

    useEffect(() => {
        if (triggerData) {
            mutation.mutate();
        }
    }, [mutation, triggerData]);

    return {
        data: mutation.data || null,
        isLoading: mutation.isPending,
        error: mutation.error
    };
}

export const apiClient = {
    get: useApiGet,
    post: useApiPost,
    put: useApiPut,
    delete: useApiDelete,
};

export default apiClient;