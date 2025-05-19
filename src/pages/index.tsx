import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/dashboard');
    }, 5000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
      <>
        <Head>
          <title>GanzAfrica | Climate Information System</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative h-24 w-24">
              <div className="absolute h-24 w-24 rounded-full bg-ganz-primary/10 animate-pulse"></div>

              {/* Leaf 1 - Top Left */}
              <div className="absolute top-1/4 left-1/4 h-10 w-6 text-ganz-primary animate-sway">
                <svg viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                      d="M15 5 C8 15, 8 35, 15 45 C22 35, 22 15, 15 5 Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                  />
                  <circle cx="15" cy="5" r="3" fill="currentColor" />
                  <circle cx="15" cy="45" r="3" fill="currentColor" />
                </svg>
              </div>

              {/* Leaf 2 - Top Right */}
              <div className="absolute top-1/4 right-1/4 h-10 w-6 text-ganz-primary animate-sway animation-delay-300">
                <svg viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                      d="M15 5 C8 15, 8 35, 15 45 C22 35, 22 15, 15 5 Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                  />
                  <circle cx="15" cy="5" r="3" fill="currentColor" />
                  <circle cx="15" cy="45" r="3" fill="currentColor" />
                </svg>
              </div>

              {/* Leaf 3 - Bottom Left */}
              <div className="absolute bottom-1/4 left-1/4 h-10 w-6 text-ganz-primary animate-sway animation-delay-600">
                <svg viewBox="0 0 30 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                      d="M15 5 C8 15, 8 35, 15 45 C22 35, 22 15, 15 5 Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                  />
                  <circle cx="15" cy="5" r="3" fill="currentColor" />
                  <circle cx="15" cy="45" r="3" fill="currentColor" />
                </svg>
              </div>

              {/* Raindrops - optional, kept from your original design */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-3 w-3 text-blue-500 animate-raindrop">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.5C14.2091 21.5 16 19.7091 16 17.5C16 15.2909 12 9.5 12 9.5C12 9.5 8 15.2909 8 17.5C8 19.7091 9.79086 21.5 12 21.5Z" />
                </svg>
              </div>
              <div className="absolute top-0 left-1/3 transform -translate-x-1/3 h-2 w-2 text-blue-500 animate-raindrop animation-delay-500">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.5C14.2091 21.5 16 19.7091 16 17.5C16 15.2909 12 9.5 12 9.5C12 9.5 8 15.2909 8 17.5C8 19.7091 9.79086 21.5 12 21.5Z" />
                </svg>
              </div>

              {/* Sun - optional, kept from your original design */}
              <div className="absolute bottom-1 right-1 h-8 w-8 text-yellow-500 animate-spin-slow">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 2V4M12 20V22M4 12H2M6.31 6.31L4.9 4.9M17.69 6.31L19.1 4.9M6.31 17.69L4.9 19.1M17.69 17.69L19.1 19.1M22 12H20" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-ganz-primary">GanzAfrica</h1>
            <p className="text-muted-foreground">Climate Information System</p>
          </div>
        </div>
      </>
  );
}