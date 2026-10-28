'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/useI18n';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { apiRequest } from '../../lib/api';
import logoImg from '../../../images/layout/logo.webp';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expiredByQuery = params.get('session') === 'expired';
    const expiredByStorage = sessionStorage.getItem('peanut_session_expired') === 'true';
    if (expiredByQuery || expiredByStorage) {
      setError('Sua sessão expirou. Faça login novamente para continuar.');
      sessionStorage.removeItem('peanut_session_expired');
      if (expiredByQuery) {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, []);

  useEffect(() => {
    async function checkSetup() {
      try {
        const { requiresSetup } = await apiRequest<{ requiresSetup: boolean }>(
          '/setup/status',
        );
        if (requiresSetup) {
          router.replace('/setup');
        }
      } catch {
        // If API is unreachable, stay on login page
      }
    }
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha ao realizar login. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col justify-center items-center p-md relative overflow-hidden select-none">
      {/* Subtle background ambient light */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(157,183,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[radial-gradient(circle,rgba(157,183,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      {/* Main Login Card Container */}
      <section className="w-full max-w-[440px] bg-surface border border-outline-variant/30 rounded-xl p-lg md:p-xl shadow-2xl shadow-black/80 z-10 animate-in fade-in duration-300">
        
        {/* Header Branding */}
        <div className="text-center mb-xl">
          <div className="flex justify-center items-center gap-xs mb-sm">
            <div className="w-6 h-6 flex items-center justify-center rounded overflow-hidden">
              <img src={logoImg.src} alt="Peanut OS Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-headline-md text-base font-bold text-primary tracking-tight">Peanut OS</span>
          </div>
          
          <h2 className="font-display-lg text-xl text-on-surface font-semibold mt-2">
            {t.auth.loginTitle}
          </h2>
          <p className="text-[13px] text-on-surface-variant/80 mt-1">
            {t.auth.loginSubtitle}
          </p>
        </div>

        {/* Error alert banner */}
        {error && (
          <div className="mb-md bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm text-center animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* Form elements */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <Input
            id="email"
            type="email"
            label={t.auth.email}
            placeholder="exemplo@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <Input
            id="password"
            type="password"
            label={t.auth.password}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 py-2"
            loading={loading}
          >
            {loading ? t.auth.signingIn : t.auth.signIn}
          </Button>
        </form>
      </section>

      {/* Simplified Localized Footer */}
      <footer className="mt-xl text-[11px] text-on-surface-variant/40 z-10 pointer-events-none text-center">
        {t.auth.copyright}
      </footer>
    </main>
  );
}
