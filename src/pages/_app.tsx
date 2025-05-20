import { AppProps } from 'next/app';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/lib/queryProvider';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <QueryProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <Component {...pageProps} />
                <Toaster position="top-right" richColors closeButton />
            </ThemeProvider>
        </QueryProvider>
    );
}