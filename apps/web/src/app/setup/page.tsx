'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import logoImg from '../../../images/layout/logo.webp';

export default function SetupPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const { requiresSetup } = await apiRequest<{ requiresSetup: boolean }>(
          '/setup/status',
        );
        if (!requiresSetup) {
          router.replace('/login');
          return;
        }
      } catch {
        router.replace('/login');
        return;
      }
      setChecking(false);
    }
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workspaceName || !adminName || !adminEmail || !adminPassword) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (adminPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/setup/admin', {
        method: 'POST',
        body: JSON.stringify({ workspaceName, adminName, adminEmail, adminPassword }),
      });
      router.replace('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar o administrador. Tente novamente.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-[#08090D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#08090D] flex flex-col justify-center items-center p-md relative overflow-hidden select-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(157,183,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[radial-gradient(circle,rgba(157,183,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      <section className="w-full max-w-[480px] bg-surface border border-outline-variant/30 rounded-xl p-lg md:p-xl shadow-2xl shadow-black/80 z-10 animate-in fade-in duration-300">
        <div className="text-center mb-xl">
          <div className="flex justify-center items-center gap-xs mb-sm">
            <div className="w-6 h-6 flex items-center justify-center rounded overflow-hidden">
              <img src={logoImg.src} alt="Peanut OS Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-headline-md text-base font-bold text-primary tracking-tight">Peanut OS</span>
          </div>
          <h2 className="font-display-lg text-xl text-on-surface font-semibold mt-2">
            Configuração inicial
          </h2>
          <p className="text-[13px] text-on-surface-variant/80 mt-1">
            Crie o workspace e o administrador principal para começar.
          </p>
        </div>

        {error && (
          <div className="mb-md bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm text-center animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="border-b border-outline-variant/20 pb-md mb-xs">
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold mb-md">Workspace</p>
            <Input
              id="workspaceName"
              type="text"
              label="Nome da empresa / workspace"
              placeholder="Ex.: Borges TI"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <p className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold mb-md">Administrador principal</p>
            <div className="flex flex-col gap-md">
              <Input
                id="adminName"
                type="text"
                label="Nome completo"
                placeholder="João Silva"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="adminEmail"
                type="email"
                label="E-mail"
                placeholder="admin@empresa.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="adminPassword"
                type="password"
                label="Senha"
                placeholder="Mínimo 8 caracteres, 1 maiúscula e 1 número"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirmar senha"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 py-2"
            loading={loading}
          >
            {loading ? 'Criando...' : 'Criar administrador'}
          </Button>
        </form>
      </section>

      <footer className="mt-xl text-[11px] text-on-surface-variant/40 z-10 pointer-events-none text-center">
        © {new Date().getFullYear()} Peanut OS — Configuração inicial
      </footer>
    </main>
  );
}
