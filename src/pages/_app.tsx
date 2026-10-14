import { useEffect } from "react";
import { DM_Sans } from "next/font/google";
import { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/lib/queryProvider';
import { AuthProvider } from '@/hooks/useAuth';
import '@/styles/globals.css';
import 'leaflet/dist/leaflet.css';

const GA_MEASUREMENT_ID = "G-VYFK4ESLSQ";

const dmSans = DM_Sans({
    subsets: ["latin"],
});

export default function MyApp({ Component, pageProps }: AppProps) {
    const router = useRouter();

    useEffect(() => {
        const onRoute = (url: string) => {
            window.gtag?.("config", GA_MEASUREMENT_ID, { page_path: url });
        };
        router.events.on("routeChangeComplete", onRoute);
        return () => router.events.off("routeChangeComplete", onRoute);
    }, [router.events]);

    return (
        <main className={dmSans.className}>
            <Head>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=4" />
                <link rel="alternate icon" type="image/x-icon" href="/favicon.ico?v=4" />
            </Head>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}');
                `}
            </Script>
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

declare global {
    interface Window {
        dataLayer: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}