// Client-side auth session (JWT from /auth/login|signup).
// Auth is NOT enforced anywhere — the token just identifies the user
// to the backend; pages stay accessible without logging in.

export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  role: string;
}

const TOKEN_KEY = "wf_token";
const USER_KEY = "wf_user";

type AuthListener = (user: AuthUser | null) => void;
const listeners = new Set<AuthListener>();

function notify(user: AuthUser | null) {
  listeners.forEach((l) => l(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notify(user);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notify(null);
}

/** Subscribe to login/logout; immediately invoked with current state. */
export function subscribeAuth(listener: AuthListener) {
  listeners.add(listener);
  listener(getUser());
  return () => {
    listeners.delete(listener);
  };
}
