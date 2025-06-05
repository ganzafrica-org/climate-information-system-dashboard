import { AppProps } from 'next/app';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/lib/queryProvider';
import { AuthProvider } from '@/hooks/useAuth';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <QueryProvider>
            <AuthProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Component {...pageProps} />
                    <Toaster position="top-right" richColors closeButton />
                </ThemeProvider>
            </AuthProvider>
        </QueryProvider>
    );
}