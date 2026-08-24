import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { loginRequest, registerRequest, type RegisterInput } from '../api/auth.api';
import { setApiAccessToken, type User } from '../api/client';

interface StoredAuth {
  user: User;
  token: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AUTH_KEY = 'lastMileAuth';
const TOKEN_KEY = 'lastMileToken';

function readStoredAuth(): StoredAuth | null {
  try {
    const value = localStorage.getItem(AUTH_KEY);
    return value ? (JSON.parse(value) as StoredAuth) : null;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

const initialAuth = readStoredAuth();
setApiAccessToken(initialAuth?.token ?? null);

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(initialAuth);

  const persist = (next: StoredAuth | null) => {
    setAuth(next);
    setApiAccessToken(next?.token ?? null);
    if (next) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(next));
      localStorage.setItem(TOKEN_KEY, next.token);
    } else {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const value = useMemo<AuthContextValue>(() => ({
    user: auth?.user ?? null,
    token: auth?.token ?? null,
    login: async (email, password) => {
      const result = await loginRequest(email, password);
      persist(result);
      return result.user;
    },
    register: async (input) => {
      const result = await registerRequest(input);
      persist(result);
      return result.user;
    },
    logout: () => persist(null),
  }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function getRoleHome(role: User['role']) {
  if (role === 'admin') return '/admin';
  if (role === 'agent') return '/agent';
  return '/customer/orders';
}
