import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { retryUnlessSignedOut } from '@/lib/session';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: retryUnlessSignedOut,
            staleTime: 5 * 60 * 1000,
        },
    },
});

interface QueryProviderProps {
    children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

export default QueryProvider;