'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useI18n } from '../../../i18n/useI18n';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useI18n();

  // Basic form states
  const [fullName, setFullName] = useState(user?.name || 'Operador Peanut OS');
  const [username, setUsername] = useState('operador_peanut');
  const [email, setEmail] = useState(user?.email || 'operador@exemplo.local');
  const [password, setPassword] = useState('••••••••');
  const [confirmPassword, setConfirmPassword] = useState('••••••••');

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    setSaveSuccess(true);
    setHasChanges(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDiscard = () => {
    setFullName(user?.name || 'Operador Peanut OS');
    setUsername('operador_peanut');
    setEmail(user?.email || 'operador@exemplo.local');
    setPassword('••••••••');
    setConfirmPassword('••••••••');
    setHasChanges(false);
  };

  const userInitials = fullName.substring(0, 2).toUpperCase();

  return (
    <main className="max-w-[1200px] mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="sticky top-[10px] z-40 bg-primary-container text-on-primary-container px-lg py-sm flex flex-col sm:flex-row items-center justify-between shadow-lg border border-outline-variant rounded-xl animate-fade-in gap-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[20px]">info</span>
            <span className="font-title-sm text-sm font-semibold">Existem alterações não salvas no seu perfil.</span>
          </div>
          <div className="flex gap-md shrink-0">
            <Button variant="ghost" className="text-on-primary-container hover:bg-on-primary-container/10 text-xs px-md py-1" onClick={handleDiscard}>
              Descartar
            </Button>
            <Button variant="primary" className="bg-on-primary-container text-primary-container hover:opacity-90 text-xs px-lg py-1 border-none shadow-none" onClick={handleSaveChanges}>
              Salvar alterações
            </Button>
          </div>
        </div>
      )}

      {/* Success banner */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-md rounded-lg flex items-center gap-sm animate-fade-in text-[13px]">
          <span className="material-symbols-outlined">check_circle</span>
          <p>Alterações de perfil salvas com sucesso!</p>
        </div>
      )}

      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant/30 pb-lg gap-md">
        <div className="flex items-center gap-lg">
          <div className="w-16 h-16 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-center text-primary font-bold text-xl select-none shrink-0">
            {userInitials}
          </div>
          <div className="space-y-xs">
            <h1 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">Configurações de Conta</h1>
            <p className="font-body-sm text-[13px] text-on-surface-variant">Gerencie suas informações pessoais e preferências de segurança.</p>
          </div>
        </div>
        <div className="flex gap-sm">
          <span className="font-mono text-[11px] bg-secondary-container px-sm py-xs rounded text-on-secondary-container font-semibold">
            ID: {user?.id || 'USR-PEANUT-OPERATOR'}
          </span>
        </div>
      </header>

      {/* Profile Details Navigation Tabs */}
      <nav className="flex border-b border-outline-variant gap-lg overflow-x-auto whitespace-nowrap scrollbar-hide text-[13px]">
        <button className="pb-sm border-b-2 border-primary text-primary font-bold">Geral</button>
        <button disabled className="pb-sm border-b-2 border-transparent text-on-surface-variant/40 cursor-not-allowed">Segurança — Planejado</button>
        <button disabled className="pb-sm border-b-2 border-transparent text-on-surface-variant/40 cursor-not-allowed">Notificações — Planejado</button>
        <button disabled className="pb-sm border-b-2 border-transparent text-on-surface-variant/40 cursor-not-allowed">API &amp; Chaves — Planejado</button>
      </nav>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Main profile form */}
        <section className="lg:col-span-8 space-y-lg">
          <Card title="Informações Básicas">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px]">
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome Completo</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="text"
                  value={fullName}
                  onChange={(e) => handleInputChange(setFullName, e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome de Usuário</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="text"
                  value={username}
                  onChange={(e) => handleInputChange(setUsername, e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-xs col-span-1 md:col-span-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">E-mail Corporativo</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="email"
                  value={email}
                  onChange={(e) => handleInputChange(setEmail, e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nova Senha</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="password"
                  value={password}
                  onChange={(e) => handleInputChange(setPassword, e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Confirmar Senha</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleInputChange(setConfirmPassword, e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card title="Preferências de Sistema">
            <div className="space-y-md text-[13px]">
              <div className="flex items-center justify-between p-md bg-surface-container/20 rounded border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-title-sm text-[13px] font-semibold text-on-surface">Modo Escuro Forçado</span>
                  <span className="font-body-sm text-[12px] text-on-surface-variant mt-1">Otimiza a interface do Peanut OS para monitoramento contínuo.</span>
                </div>
                <div className="w-10 h-5 bg-primary rounded-full relative">
                  <div className="absolute right-1 top-1 w-3 h-3 bg-on-primary rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-md bg-surface-container/20 rounded border border-outline-variant/30">
                <div className="flex flex-col">
                  <span className="font-title-sm text-[13px] font-semibold text-on-surface">Notificações por Email</span>
                  <span className="font-body-sm text-[12px] text-on-surface-variant mt-1">Receber resumos operacionais periódicos.</span>
                </div>
                <div className="w-10 h-5 bg-outline-variant/30 rounded-full relative">
                  <div className="absolute left-1 top-1 w-3 h-3 bg-on-surface-variant/40 rounded-full"></div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Sidebar info */}
        <aside className="lg:col-span-4 space-y-lg">
          <Card title="Sessão Atual">
            <div className="space-y-sm text-[12px]">
              <div className="flex justify-between font-mono">
                <span className="text-on-surface-variant">IP de Origem:</span>
                <span className="text-on-surface">--</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-on-surface-variant">Navegador:</span>
                <span className="text-on-surface">Navegador do Usuário</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-on-surface-variant">Expira em:</span>
                <span className="text-tertiary">--:--:--</span>
              </div>
              <div className="pt-sm border-t border-outline-variant/20 mt-lg">
                <Button variant="ghost" disabled className="w-full border border-error/40 text-error hover:bg-error/10 text-xs py-1.5 cursor-not-allowed opacity-50">
                  Encerrar todas as sessões
                </Button>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
