import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const TOKEN_KEY = "ntpc.auth.token";
const USER_KEY = "ntpc.auth.user";

export interface AuthUser {
  username: string;
  roles: string[];
  token: string;
  isOnShift: boolean;
  assignedShift: 1 | 2 | 3 | null;
}

export type DemoRole = "ROLE_OPERATOR" | "ROLE_SUPERVISOR";

export interface DemoAccount {
  username: string;
  password: string;
  role: DemoRole;
  label: string;
  description: string;
}

// Demo credentials — shown on the login screen so reviewers can sign in
// without a live backend. The backend is still called first; these are the
// offline fallback and also power the one-click "Demo Login" buttons.
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "operator",
    password: "operator",
    role: "ROLE_OPERATOR",
    label: "Operator",
    description: "Full control · Acknowledge, Suppress, Threshold Overrides",
  },
  {
    username: "supervisor",
    password: "supervisor",
    role: "ROLE_SUPERVISOR",
    label: "Supervisor",
    description: "Read-only dashboard · monitoring & analytics",
  },
];

interface SignupInput {
  username: string;
  password: string;
  email: string;
  role: DemoRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function storeSession(u: AuthUser) {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, u.token);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify({ username: u.username, roles: u.roles, isOnShift: u.isOnShift, assignedShift: u.assignedShift }));
  } catch { /* ignore */ }
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

function readSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const token = window.sessionStorage.getItem(TOKEN_KEY);
    const raw = window.sessionStorage.getItem(USER_KEY);
    if (!token || !raw) return null;
    const parsed = JSON.parse(raw) as { username: string; roles: string[]; isOnShift: boolean; assignedShift?: 1 | 2 | 3 | null };
    return { token, username: parsed.username, roles: parsed.roles, isOnShift: parsed.isOnShift ?? false, assignedShift: parsed.assignedShift ?? null };
  } catch { return null; }
}

function apiBase() {
  return typeof window === "undefined" ? "http://localhost:8080/api/v1" : "/api/v1";
}

function mockToken(username: string) {
  return `mock.${btoa(`${username}:${Date.now()}`).replace(/=+$/, "")}`;
}

function matchDemo(username: string, password: string): DemoAccount | null {
  return DEMO_ACCOUNTS.find((a) => a.username === username && a.password === password) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Try the real backend first.
    try {
      const res = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json() as { accessToken: string; username: string; roles: string[], isOnShift: boolean, assignedShift: 1 | 2 | 3 | null };
        const u: AuthUser = { token: data.accessToken, username: data.username, roles: data.roles ?? [], isOnShift: data.isOnShift ?? false, assignedShift: data.assignedShift ?? null };
        storeSession(u); setUser(u); return;
      }
      if (res.status !== 401 && res.status !== 403) {
        // Non-auth failure — fall through to demo fallback.
      } else {
        // Backend explicitly rejected — still allow demo credentials so the
        // UI is usable without a live gateway.
        const demo = matchDemo(username, password);
        if (!demo) {
          let msg = "Invalid credentials";
          try { const j = await res.json(); msg = j.message || msg; } catch { /* ignore */ }
          throw new Error(msg);
        }
      }
    } catch (e) {
      // Network error or non-auth failure — fall back to demo.
      if (e instanceof Error && e.message === "Invalid credentials") throw e;
    }

    const demo = matchDemo(username, password);
    if (!demo) throw new Error("Invalid credentials");
    // Hardcoded logic for demo accounts: operator is unassigned by default, supervisor is true.
    const u: AuthUser = { token: mockToken(demo.username), username: demo.username, roles: [demo.role], isOnShift: demo.role !== "ROLE_OPERATOR", assignedShift: demo.role === "ROLE_OPERATOR" ? null : 1 };
    storeSession(u); setUser(u);
  };

  const signup = async (input: SignupInput) => {
    // Attempt real endpoint but swallow errors — spec says mock success.
    try {
      await fetch(`${apiBase()}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    } catch { /* ignore — mocked success */ }
    return;
  };

  const logout = () => { clearSession(); setUser(null); };
  const hasRole = (role: string) => !!user?.roles?.includes(role);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
