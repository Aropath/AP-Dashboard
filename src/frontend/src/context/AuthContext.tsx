import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Plan {
  name: string;
  displayName: string;
  features: string[];
  limits: {
    maxClients: number;
    maxReports: number;
    dataRetentionDays: number;
    apiCallsPerDay: number;
  };
}

export interface Subscription {
  status: "ACTIVE" | "TRIALING" | "CANCELLED" | "EXPIRED" | "PAST_DUE";
  billingCycle: "MONTHLY" | "YEARLY";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  picture?: string;
  subscription: Subscription | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasFeature: (key: string) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  googleAuth: (idToken: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000/api";

async function apiPost(path: string, body: object, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Token storage ──
  const getToken = () => localStorage.getItem("access_token");
  const getRefresh = () => localStorage.getItem("refresh_token");

  const storeTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  };

  // ── Fetch user profile ──
  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const me = await apiGet("/auth/me", token);
      setUser(me);
    } catch {
      // Try refresh
      const refresh = getRefresh();
      if (refresh) {
        try {
          const { accessToken, refreshToken } = await apiPost("/auth/refresh", {
            refreshToken: refresh,
          });
          storeTokens(accessToken, refreshToken);
          const me = await apiGet("/auth/me", accessToken);
          setUser(me);
        } catch {
          clearTokens();
          setUser(null);
        }
      } else {
        clearTokens();
        setUser(null);
      }
    }
  }, []);

  // ── On mount: restore session ──
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  // ── Auth actions ──
  const signIn = async (email: string, password: string) => {
    const { accessToken, refreshToken, user: me } = await apiPost("/auth/signin", {
      email, password,
    });
    storeTokens(accessToken, refreshToken);
    setUser(me);
    // fetch full profile (includes subscription)
    const full = await apiGet("/auth/me", accessToken);
    setUser(full);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const { accessToken, refreshToken } = await apiPost("/auth/signup", {
      name, email, password,
    });
    storeTokens(accessToken, refreshToken);
    const full = await apiGet("/auth/me", accessToken);
    setUser(full);
  };

  const googleAuth = async (idToken: string) => {
    const { accessToken, refreshToken } = await apiPost("/auth/google", { idToken });
    storeTokens(accessToken, refreshToken);
    const full = await apiGet("/auth/me", accessToken);
    setUser(full);
  };

  const signOut = () => {
    const refresh = getRefresh();
    if (refresh) {
      apiPost("/auth/logout", { refreshToken: refresh }).catch(() => {});
    }
    clearTokens();
    setUser(null);
  };

  // ── Feature gate helper ──
  const hasFeature = (key: string): boolean => {
    return user?.subscription?.plan?.features?.includes(key) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasFeature,
        signIn,
        signUp,
        googleAuth,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
