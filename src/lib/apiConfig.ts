/**
 * Get the API base URL based on environment configuration.
 * 
 * Priority order:
 * 1. NEXT_PUBLIC_API_URL environment variable (if set) - REQUIRED for production
 * 2. In browser: use current origin (window.location.origin) - works for same-domain APIs
 * 3. Fallback to localhost:3000 ONLY in development mode
 * 
 * IMPORTANT: For production, always set NEXT_PUBLIC_API_URL with the full URL including port.
 * Example: http://10.10.100.52:3002
 */
export function getApiBaseUrl(): string {
    // Check if NEXT_PUBLIC_API_URL is explicitly set - this is the preferred method
    if (process.env.NEXT_PUBLIC_API_URL) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL.trim();
        // Ensure URL doesn't end with /api - that's added by endpoint paths
        const cleanUrl = apiUrl.replace(/\/api\/?$/, '');
        return cleanUrl;
    }

    // In browser environment, use the current origin (same domain as the app)
    // This works for production when API is on the same domain
    if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        return origin;
    }

    // Fallback ONLY for server-side rendering in development
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
    }

    // Production SSR fallback - should not happen
    // Return empty string to fail fast in production if not configured
    return '';
}

