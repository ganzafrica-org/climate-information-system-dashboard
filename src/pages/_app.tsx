import { DM_Sans } from "next/font/google";
import { AppProps } from 'next/app';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/lib/queryProvider';
import { AuthProvider } from '@/hooks/useAuth';
import '@/styles/globals.css';

const dmSans = DM_Sans({
    subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <main className={dmSans.className}>
            <QueryProvider>
                <AuthProvider>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="light"
                        forcedTheme="light"
                        disableTransitionOnChange
                    >
                        <Component {...pageProps} />
                        <Toaster position="top-right" richColors closeButton />
                    </ThemeProvider>
                </AuthProvider>
            </QueryProvider>
        </main>
    );
}