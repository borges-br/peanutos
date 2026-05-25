'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';

interface AuthContextType {
  user: any;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  const refreshUser = async () => {
    try {
      const userData = await apiRequest('/auth/me');
      setUser(userData);
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('peanut_token', data.accessToken);
      setToken(data.accessToken);
      setUser(data.user);
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
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
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
