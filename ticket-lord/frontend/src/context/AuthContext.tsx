import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi, User } from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    setUser(null);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(logout, INACTIVITY_TIMEOUT);
  }, [logout]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.getProfile();
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Listen for forced logout
    const handleForcedLogout = () => { setUser(null); localStorage.removeItem('accessToken'); };
    window.addEventListener('auth:logout', handleForcedLogout);

    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [refreshUser]);

  // Inactivity tracking
  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
