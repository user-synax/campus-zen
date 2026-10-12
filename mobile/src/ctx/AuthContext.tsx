import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { ApiError, api, type AuthUser } from "../lib/api";
import { tokens } from "../lib/tokens";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: { username: string; password: string; remember: boolean }) => Promise<void>;
  signup: (input: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useSession must be wrapped in <SessionProvider />");
  return value;
}

function persistFrom(data: { user: AuthUser; accessToken?: string; refreshToken?: string }) {
  return tokens.save(data.accessToken ?? null, data.refreshToken ?? null);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on boot: refresh (rotates) first, fall back to /me.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await tokens.load();
        if (!tokens.refresh && !tokens.access) return;
        try {
          const me = await api.me();
          if (alive) setUser(me.data.user);
        } catch (e) {
          if (alive) setUser(null);
          if (e instanceof ApiError && !e.offline) await tokens.clear();
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login: AuthContextValue["login"] = useCallback(async (input) => {
    const res = await api.login(input);
    await persistFrom(res.data);
    setUser(res.data.user);
  }, []);

  const signup: AuthContextValue["signup"] = useCallback(async (input) => {
    const res = await api.signup(input);
    await persistFrom(res.data);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // best-effort: session ends locally even if the network fails
    }
    await tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, signup, logout }),
    [user, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
