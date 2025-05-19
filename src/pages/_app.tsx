import { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Component {...pageProps} />
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
  );
}