'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const applySession = useCallback((data: any) => {
    localStorage.setItem('peanut_token', data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const expireSession = useCallback(() => {
    localStorage.removeItem('peanut_token');
    setToken(null);
    setUser(null);
    router.replace('/login?session=expired');
  }, [router]);

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('peanut_token');
      if (savedToken) {
        try {
          setToken(savedToken);
          const userData = await apiRequest('/auth/me');
          setUser(userData);
        } catch (e) {
          console.error('Failed to load user session', e);
          localStorage.removeItem('peanut_token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  useEffect(() => {
    const onExpired = () => expireSession();
    window.addEventListener('peanut-session-expired', onExpired);
    return () => window.removeEventListener('peanut-session-expired', onExpired);
  }, [expireSession]);

  const refreshUser = async () => {
    try {
      const userData = await apiRequest('/auth/me');
      setUser(userData);
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  const refreshSession = useCallback(async () => {
    const savedToken = localStorage.getItem('peanut_token');
    if (!savedToken) return;
    try {
      const data = await apiRequest('/auth/refresh', { method: 'POST' });
      applySession(data);
    } catch (e) {
      console.error('Failed to refresh session', e);
    }
  }, [applySession]);

  useEffect(() => {
    if (!token || !user) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    }, 5 * 60 * 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    window.addEventListener('focus', refreshSession);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshSession);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [token, user, refreshSession]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      sessionStorage.removeItem('peanut_session_expired');
      applySession(data);
      setLoading(false);
      router.refresh();
      router.replace('/dashboard');
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const logout = () => {
    localStorage.removeItem('peanut_token');
    sessionStorage.removeItem('peanut_session_expired');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
