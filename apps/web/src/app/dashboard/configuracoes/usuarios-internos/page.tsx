'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../components/ui/Button';


interface InternalUser {

  id: string;
  initials: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'FINANCIAL' | 'TECHNICIAN' | 'READ_ONLY';
  status: 'Ativo' | 'Convite pendente' | 'Desativado';
  scope: string;
  lastActivity: string;
  mfaActive: boolean;
}

const mockUsers: InternalUser[] = [
  {
    id: 'USR_001',
    initials: 'AP',
    name: 'Administrador Principal',
    email: 'admin@exemplo.local',
    role: 'OWNER',
    status: 'Ativo',
    scope: 'Global (Root)',
    lastActivity: '--',
    mfaActive: true
  },
  {
    id: 'USR_002',
    initials: 'CF',
    name: 'Colaborador Financeiro',
    email: 'financeiro@exemplo.local',
    role: 'FINANCIAL',
    status: 'Convite pendente',
    scope: 'Faturamento',
    lastActivity: '--',
    mfaActive: false
  },
  {
    id: 'USR_003',
    initials: 'CT',
    name: 'Colaborador Técnico',
    email: 'tecnico@exemplo.local',
    role: 'TECHNICIAN',
    status: 'Ativo',
    scope: 'Operações TI',
    lastActivity: '--',
    mfaActive: true
  },
  {
    id: 'USR_004',
    initials: 'AO',
    name: 'Administrador Observador',
    email: 'leitura@exemplo.local',
    role: 'READ_ONLY',
    status: 'Desativado',
    scope: 'Relatórios',
    lastActivity: '--',
    mfaActive: false
  }
];

export default function InternalUsersPage() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Email invitation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@') || inviteEmail.length < 5) {
      setInviteError('Informe um e-mail corporativo válido');
      setInviteSuccess(false);
      return;
    }
    if (!inviteRole) {
      setInviteError('Selecione um papel de acesso');
      setInviteSuccess(false);
      return;
    }
    setInviteError('');
    setInviteSuccess(true);
    setInviteEmail('');
    setInviteRole('');
    setTimeout(() => setInviteSuccess(false), 3000);
  };

  const getRoleBadge = (role: InternalUser['role']) => {
    const styles = {
      OWNER: 'bg-primary/10 text-primary border-primary/20',
      ADMIN: 'bg-primary/10 text-primary border-primary/20',
      FINANCIAL: 'bg-tertiary/10 text-tertiary border-tertiary/20',
      TECHNICIAN: 'bg-secondary-container text-on-secondary-container border-outline-variant',
      READ_ONLY: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant/40'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${styles[role]}`}>
        {role}
      </span>
    );
  };

  const getStatusIndicator = (status: InternalUser['status']) => {
    switch (status) {
      case 'Ativo':
        return (
          <div className="flex items-center gap-1.5 text-body-sm text-[13px] text-on-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Ativo
          </div>
        );
      case 'Convite pendente':
        return (
          <div className="flex items-center gap-1.5 text-body-sm text-[13px] text-on-surface">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Convite pendente
          </div>
        );
      case 'Desativado':
        return (
          <div className="flex items-center gap-1.5 text-body-sm text-[13px] text-on-surface-variant opacity-60">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/40"></span>
            Desativado
          </div>
        );
    }
  };

  const filteredUsers = mockUsers.filter((usr) => {
    const matchesSearch =
      usr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usr.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? usr.role === roleFilter : true;
    const matchesStatus = statusFilter ? usr.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <main className="flex flex-col lg:flex-row min-h-[calc(100vh-var(--topbar-height))] w-full gap-lg p-md animate-fade-in">
      {/* Left Content Area */}
      <div className="flex-1 flex flex-col gap-xl max-w-full lg:max-w-[calc(100vw-SidebarWidth-400px)]">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/30 pb-md">
          <div className="space-y-xs">
            <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Usuários internos</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl">
              Gerencie as pessoas da sua equipe que acessam o Peanut OS, seus papéis de acesso e configurações de segurança.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <Button variant="secondary" onClick={() => router.push('/dashboard/configuracoes/permissoes')}>
              <span className="material-symbols-outlined text-[18px] mr-1">security</span>
              Ver Permissões
            </Button>
          </div>
        </header>

        {/* Info Grid Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="bg-surface-container/20 border border-outline-variant p-md rounded flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-primary">hub</span>
              <span className="font-mono text-on-surface-variant text-[10px]">INFO-01</span>
            </div>
            <div className="space-y-xs">
              <h3 className="font-title-sm text-sm font-semibold text-on-surface">Acesso ao sistema</h3>
              <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">Configurações globais de autenticação e contas da equipe.</p>
            </div>
          </div>
          <div className="bg-surface-container/20 border border-outline-variant p-md rounded flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-tertiary">admin_panel_settings</span>
              <span className="font-mono text-on-surface-variant text-[10px]">RBAC</span>
            </div>
            <div className="space-y-xs">
              <h3 className="font-title-sm text-sm font-semibold text-on-surface">Papéis de acesso</h3>
              <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">Atribua permissões administrativas baseadas em papéis operacionais.</p>
            </div>
          </div>
          <div className="bg-surface-container/20 border border-outline-variant p-md rounded flex flex-col gap-sm border-l-2 border-l-error">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-error">policy</span>
              <span className="font-mono text-on-surface-variant text-[10px]">LOGS</span>
            </div>
            <div className="space-y-xs">
              <h3 className="font-title-sm text-sm font-semibold text-on-surface">Auditoria ativa</h3>
              <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">Ações cruciais e alterações de acesso são permanentemente auditadas.</p>
            </div>
          </div>
          <div className="bg-surface-container/20 border border-outline-variant p-md rounded flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <span className="material-symbols-outlined text-primary">groups</span>
              <span className="font-mono text-on-surface-variant text-[10px]">REQUISITO</span>
            </div>
            <div className="space-y-xs">
              <h3 className="font-title-sm text-sm font-semibold text-on-surface">Equipe Peanut OS</h3>
              <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">Gerencie apenas operadores internos. Usuários de clientes são configurados à parte.</p>
            </div>
          </div>
        </section>

        {/* Invite operator card */}
        <section className="bg-surface-container/30 border border-outline-variant p-lg rounded-xl shadow">
          <div className="flex items-center gap-sm mb-md pb-xs border-b border-outline-variant/20">
            <span className="material-symbols-outlined text-primary">person_add</span>
            <h2 className="font-title-sm text-sm font-semibold text-on-surface">Convidar operador interno</h2>
          </div>

          {inviteSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-sm rounded-lg flex items-center gap-sm mb-md animate-fade-in text-[13px]">
              <span className="material-symbols-outlined">check_circle</span>
              <p>Convite operacional simulado enviado com sucesso!</p>
            </div>
          )}

          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-md items-start">
            <div className="space-y-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">E-mail Corporativo</label>
              <input
                className={`w-full bg-background border rounded px-md py-sm h-10 font-body-sm text-[13px] text-on-surface focus:outline-none transition-all ${
                  inviteError ? 'border-error focus:ring-1 focus:ring-error' : 'border-outline-variant focus:border-primary'
                }`}
                placeholder="Ex.: operador@empresa.local"
                type="text"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              {inviteError && (
                <p className="text-error text-[11px] flex items-center gap-xs mt-1 animate-fade-in">
                  <span className="material-symbols-outlined !text-[12px]">error</span>
                  {inviteError}
                </p>
              )}
            </div>

            <div className="space-y-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Papel / Acesso</label>
              <select
                className="w-full bg-background border border-outline-variant text-on-surface rounded px-md py-sm h-10 font-body-sm text-[13px] focus:outline-none focus:border-primary cursor-pointer"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="">Selecione um papel...</option>
                <option value="ADMIN">Administrador</option>
                <option value="FINANCIAL">Financeiro</option>
                <option value="TECHNICIAN">Técnico</option>
                <option value="READ_ONLY">Somente Leitura</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end gap-sm pt-sm border-t border-outline-variant/10 mt-1">
              <Button type="button" variant="outline" className="text-xs h-9" onClick={() => { setInviteEmail(''); setInviteRole(''); setInviteError(''); }}>
                Limpar
              </Button>
              <Button type="submit" variant="primary" className="text-xs h-9">
                Enviar convite
              </Button>
            </div>
          </form>
        </section>

        {/* Operators list Section */}
        <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xl">
          {/* Filter Bar */}
          <div className="p-md flex flex-wrap items-center gap-md border-b border-outline-variant bg-surface-container-low/20">
            <div className="flex-1 min-w-[240px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                className="w-full bg-background border border-outline-variant rounded pl-10 pr-md py-1.5 font-body-sm text-[13px] focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                placeholder="Buscar usuário por nome ou e-mail..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-sm">
              <select
                className="bg-background border border-outline-variant rounded px-sm py-1.5 font-body-sm text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Todos os Papéis</option>
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="FINANCIAL">FINANCIAL</option>
                <option value="TECHNICIAN">TECHNICIAN</option>
                <option value="READ_ONLY">READ_ONLY</option>
              </select>
              <select
                className="bg-background border border-outline-variant rounded px-sm py-1.5 font-body-sm text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Convite pendente">Convite pendente</option>
                <option value="Desativado">Desativado</option>
              </select>
              <Button
                variant="ghost"
                className="text-xs text-on-surface-variant hover:text-on-surface"
                onClick={() => { setSearchTerm(''); setRoleFilter(''); setStatusFilter(''); }}
              >
                Limpar
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Usuário</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Papel</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Escopo</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Segurança</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((usr) => {
                    const isSelected = selectedUser?.id === usr.id;
                    return (
                      <tr
                        key={usr.id}
                        onClick={() => setSelectedUser(usr)}
                        className={`hover:bg-surface-container-high/40 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-primary/5 border-l-2 border-primary font-medium' : ''
                        }`}
                      >
                        <td className="p-md">
                          <div className="flex items-center gap-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs select-none">
                              {usr.initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-on-surface font-semibold">{usr.name}</span>
                              <span className="text-on-surface-variant font-mono text-[11px] opacity-70">{usr.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-md">{getRoleBadge(usr.role)}</td>
                        <td className="p-md">{getStatusIndicator(usr.status)}</td>
                        <td className="p-md text-on-surface-variant">{usr.scope}</td>
                        <td className="p-md">
                          {usr.mfaActive ? (
                            <span className="material-symbols-outlined text-emerald-500 text-[18px]">verified_user</span>
                          ) : (
                            <span className="material-symbols-outlined text-on-surface-variant opacity-30 text-[18px]">gpp_maybe</span>
                          )}
                        </td>
                        <td className="p-md text-right">
                          <button className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant">
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-xl text-on-surface-variant opacity-60">
                      Nenhum operador interno corresponde aos filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination Mock */}
          <div className="p-md border-t border-outline-variant flex items-center justify-between bg-surface-container-low/40 text-[12px]">
            <span className="font-body-sm text-on-surface-variant opacity-60">
              Exibindo {filteredUsers.length} de {mockUsers.length} operadores
            </span>
            <div className="flex items-center gap-xs">
              <Button variant="ghost" className="p-1 rounded opacity-40 cursor-not-allowed" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </Button>
              <Button variant="ghost" className="p-1 rounded opacity-40 cursor-not-allowed" disabled>
                <span className="material-symbols-outlined">chevron_right</span>
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Dynamic Right Side Details Panel */}
      <aside className="w-full lg:w-[320px] bg-surface border border-outline-variant rounded-xl flex flex-col shrink-0 h-fit min-h-[400px] shadow-2xl">
        <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40">
          <h2 className="font-title-sm text-sm font-semibold text-on-surface">Detalhes do operador</h2>
          {selectedUser && (
            <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {selectedUser ? (
          <div className="p-lg flex flex-col gap-lg flex-grow text-[13px] animate-fade-in">
            <div className="flex flex-col items-center text-center gap-xs border-b border-outline-variant/20 pb-md">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary text-lg font-bold border border-primary/20">
                {selectedUser.initials}
              </div>
              <h3 className="font-title-sm text-sm font-semibold text-on-surface mt-1">{selectedUser.name}</h3>
              <span className="font-mono text-on-surface-variant text-[11px]">{selectedUser.email}</span>
            </div>

            <div className="space-y-md">
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">Identificação ID</span>
                <span className="font-mono text-on-surface">{selectedUser.id}</span>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">Perfil e Acesso</span>
                <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">Status da Conta</span>
                <div className="mt-1">{getStatusIndicator(selectedUser.status)}</div>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">Limites e Escopo</span>
                <span className="text-on-surface">{selectedUser.scope}</span>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">Segurança MFA</span>
                <span className="text-on-surface">{selectedUser.mfaActive ? 'Ativo e autenticado via Token' : 'Inativo / Pendente de ativação'}</span>
              </div>
            </div>

            <div className="pt-md border-t border-outline-variant/20 flex flex-col gap-sm mt-auto">
              <Button variant="outline" className="text-xs" disabled title="Redefinição disponível na implantação final">
                Redefinir Senha
              </Button>
              <Button variant="danger" className="text-xs" disabled title="Exclusão operacional disponível na implantação final">
                Desativar Operador
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-xl text-center gap-md my-auto">
            <div className="w-16 h-16 rounded-full bg-surface-container-high/40 flex items-center justify-center border border-outline-variant border-dashed">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40">person_search</span>
            </div>
            <div className="space-y-sm">
              <p className="font-title-sm text-sm font-semibold text-on-surface">Nenhum operador selecionado</p>
              <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed max-w-[200px] mx-auto">
                Selecione uma linha na tabela acima para visualizar dados de segurança e auditoria detalhados.
              </p>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}
