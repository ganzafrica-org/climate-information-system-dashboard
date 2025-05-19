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

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-ganz-primary animate-grow">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                      d="M7 17.9999C11.5714 17.9999 19 15.9999 19 6.99994C19 6.99994 14.5 12.9999 7 12.9999V17.9999Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-wave"
                  />
                  <path
                      d="M7 13C7 13 3 10 3 7C3 7 8.5 5 12 3C12 3 12.5 8.5 7 13Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-wave animation-delay-300"
                  />
                </svg>
              </div>
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
              <div className="absolute top-0 left-2/3 transform -translate-x-2/3 h-2.5 w-2.5 text-blue-500 animate-raindrop animation-delay-700">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.5C14.2091 21.5 16 19.7091 16 17.5C16 15.2909 12 9.5 12 9.5C12 9.5 8 15.2909 8 17.5C8 19.7091 9.79086 21.5 12 21.5Z" />
                </svg>
              </div>

              {/* Animated Sun */}
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