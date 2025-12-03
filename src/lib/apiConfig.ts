/**
 * Get the API base URL based on environment configuration.
 * 
 * Priority order:
 * 1. NEXT_PUBLIC_API_URL environment variable (if set)
 * 2. In browser: use current origin (window.location.origin) - works for same-domain APIs
 * 3. Fallback to localhost:3000 for development
 */
export function getApiBaseUrl(): string {
    // Check if NEXT_PUBLIC_API_URL is explicitly set
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // In browser environment, use the current origin (same domain as the app)
    // This works for production when API is on the same domain
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // Fallback for server-side rendering during development
    // You should set NEXT_PUBLIC_API_URL for production builds
    return 'http://localhost:3000';
}

