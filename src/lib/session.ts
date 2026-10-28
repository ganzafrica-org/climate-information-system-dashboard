const EXPIRED_KEY = "session-expired";

let redirecting = false;

export function markSessionExpired() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(EXPIRED_KEY, "1");
}

export function consumeSessionExpired() {
  if (typeof window === "undefined") return false;
  const expired = sessionStorage.getItem(EXPIRED_KEY) === "1";
  if (expired) sessionStorage.removeItem(EXPIRED_KEY);
  return expired;
}

export function tokenIsExpired(token: string | null) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length < 2) return false;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function isUnauthorized(error: unknown) {
  const err = error as { response?: { status?: number }; status?: number } | null;
  const status = err?.response?.status ?? err?.status;
  return status === 401;
}

export function retryUnlessSignedOut(failureCount: number, error: unknown) {
  if (isUnauthorized(error)) return false;
  return failureCount < 1;
}

export function isSigningInAgain() {
  return redirecting;
}

/** Leave the current page and ask the person to sign in again. Runs once. */
export function redirectToSignIn() {
  if (typeof window === "undefined" || redirecting) return;
  const path = window.location.pathname;
  if (path === "/login" || path === "/forgot-password" || path === "/register" || path === "/first-password") return;
  redirecting = true;
  markSessionExpired();
  localStorage.removeItem("token");
  window.location.assign("/login");
}
