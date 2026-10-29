import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../api';

export type Role = 'INSTRUCTOR' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  login: string;
  email: string | null;
  role: Role;
  mustChangePassword: boolean;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface AuthState {
  user: User | null;
  loading: boolean; // true enquanto confirma o token salvo com a API
  login: (login: string, password: string) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// Para onde cada usuário deve ir depois de entrar
export function homeFor(user: User): string {
  if (user.mustChangePassword) return '/trocar-senha';
  return user.role === 'INSTRUCTOR' ? '/instrutor' : '/aluno';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<{ user: User }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => tokenStore.clear()) // token expirado ou inválido
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const r = await api<AuthResponse>('/auth/login', { body: { login: loginValue, password } });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const r = await api<AuthResponse>('/auth/change-password', { body: { currentPassword, newPassword } });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, changePassword, logout }),
    [user, loading, login, changePassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
