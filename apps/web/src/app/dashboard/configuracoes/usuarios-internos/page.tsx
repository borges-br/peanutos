'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { apiRequest } from '../../../../lib/api';
import Button from '../../../../components/ui/Button';

type UserRole = 'OWNER' | 'ADMIN' | 'FINANCIAL' | 'TECHNICIAN' | 'READ_ONLY';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface InternalUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
}

const ROLE_STYLE: Record<UserRole, string> = {
  OWNER: 'bg-primary/10 text-primary border-primary/20',
  ADMIN: 'bg-primary/10 text-primary border-primary/20',
  FINANCIAL: 'bg-tertiary/10 text-tertiary border-tertiary/20',
  TECHNICIAN: 'bg-secondary-container text-on-secondary-container border-outline-variant',
  READ_ONLY: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant/40',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  if (parts.length >= 2 && first && last) return (first[0]! + last[0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function InternalUsersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const canManage = currentUser && ['OWNER', 'ADMIN'].includes(currentUser.role);
  const isOwner = currentUser?.role === 'OWNER';

  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<string>('TECHNICIAN');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Status change state
  const [statusActionLoading, setStatusActionLoading] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setFetchError(null);
    try {
      const data = await apiRequest<InternalUser[]>('/users');
      setUsers(data);
    } catch (err: any) {
      setFetchError(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName || !createEmail || !createPassword || !createRole) {
      setCreateError('Preencha todos os campos.');
      return;
    }

    setCreateLoading(true);
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
        }),
      });
      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreateRole('TECHNICIAN');
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Erro ao criar usuário.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStatusChange = async (
    userId: string,
    newStatus: UserStatus,
  ) => {
    setStatusActionLoading(userId);
    try {
      await apiRequest(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, status: newStatus } : prev,
        );
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiRequest(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      await loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, role: newRole as UserRole } : prev,
        );
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar papel.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? u.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: UserRole) => (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${ROLE_STYLE[role]}`}
    >
      {role}
    </span>
  );

  const getStatusIndicator = (status: UserStatus) => {
    const map: Record<UserStatus, { dot: string; label: string; cls: string }> = {
      ACTIVE: { dot: 'bg-emerald-500', label: 'Ativo', cls: 'text-on-surface' },
      INACTIVE: { dot: 'bg-on-surface-variant/40', label: 'Inativo', cls: 'text-on-surface-variant opacity-60' },
      SUSPENDED: { dot: 'bg-amber-500', label: 'Suspenso', cls: 'text-on-surface-variant' },
    };
    const s = map[status] || map.INACTIVE;
    return (
      <div className={`flex items-center gap-1.5 text-[13px] ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </div>
    );
  };

  return (
    <main className="flex flex-col lg:flex-row min-h-[calc(100vh-var(--topbar-height))] w-full gap-lg p-md animate-fade-in">
      {/* Left Content */}
      <div className="flex-1 flex flex-col gap-xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/30 pb-md">
          <div className="space-y-xs">
            <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">
              Usuários internos
            </h1>
            <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl">
              Gerencie as pessoas da sua equipe que acessam o Peanut OS, seus
              papéis de acesso e status.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard/configuracoes/permissoes')}
            >
              <span className="material-symbols-outlined text-[18px] mr-1">security</span>
              Ver Permissões
            </Button>
            {canManage && (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <span className="material-symbols-outlined text-[18px] mr-1">person_add</span>
                Adicionar usuário
              </Button>
            )}
          </div>
        </header>

        {/* Error */}
        {fetchError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-[13px]">
            {fetchError}
          </div>
        )}

        {/* Operators list */}
        <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xl">
          {/* Filter Bar */}
          <div className="p-md flex flex-wrap items-center gap-md border-b border-outline-variant bg-surface-container-low/20">
            <div className="flex-1 min-w-[240px] relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                className="w-full bg-background border border-outline-variant rounded pl-10 pr-md py-1.5 font-body-sm text-[13px] focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/40"
                placeholder="Buscar por nome ou e-mail..."
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
                {(['OWNER', 'ADMIN', 'FINANCIAL', 'TECHNICIAN', 'READ_ONLY'] as const).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                className="bg-background border border-outline-variant rounded px-sm py-1.5 font-body-sm text-[13px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="SUSPENDED">Suspenso</option>
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
            {loadingUsers ? (
              <div className="flex items-center justify-center p-xl gap-sm text-on-surface-variant">
                <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <span className="text-[13px]">Carregando usuários...</span>
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Usuário</th>
                    <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Papel</th>
                    <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                    <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold">Criado em</th>
                    {canManage && (
                      <th className="p-md font-label-caps text-on-surface-variant uppercase tracking-wider font-semibold text-right">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUser?.id === u.id;
                      const isMe = currentUser?.id === u.id;
                      const isBusy = statusActionLoading === u.id;
                      return (
                        <tr
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`hover:bg-surface-container-high/40 transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                          }`}
                        >
                          <td className="p-md">
                            <div className="flex items-center gap-sm">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs select-none">
                                {getInitials(u.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-on-surface font-semibold">
                                  {u.name}
                                  {isMe && (
                                    <span className="ml-2 text-[10px] text-primary font-normal">(você)</span>
                                  )}
                                </span>
                                <span className="text-on-surface-variant font-mono text-[11px] opacity-70">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-md">{getRoleBadge(u.role)}</td>
                          <td className="p-md">{getStatusIndicator(u.status)}</td>
                          <td className="p-md text-on-surface-variant text-[12px]">
                            {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          {canManage && (
                            <td className="p-md text-right">
                              {!isMe && (
                                <div className="flex items-center justify-end gap-xs" onClick={(e) => e.stopPropagation()}>
                                  {u.status === 'ACTIVE' ? (
                                    <button
                                      className="px-2 py-1 text-[11px] border border-outline-variant/40 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-40"
                                      onClick={() => handleStatusChange(u.id, 'INACTIVE')}
                                      disabled={isBusy}
                                      title="Desativar usuário"
                                    >
                                      {isBusy ? '...' : 'Desativar'}
                                    </button>
                                  ) : (
                                    <button
                                      className="px-2 py-1 text-[11px] border border-emerald-500/30 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors disabled:opacity-40"
                                      onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                                      disabled={isBusy}
                                      title="Reativar usuário"
                                    >
                                      {isBusy ? '...' : 'Reativar'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="text-center p-xl text-on-surface-variant opacity-60">
                        {users.length === 0
                          ? 'Nenhum usuário cadastrado.'
                          : 'Nenhum usuário corresponde aos filtros aplicados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-md border-t border-outline-variant flex items-center justify-between bg-surface-container-low/40 text-[12px]">
            <span className="font-body-sm text-on-surface-variant opacity-60">
              {loadingUsers
                ? 'Carregando...'
                : `Exibindo ${filteredUsers.length} de ${users.length} usuários`}
            </span>
          </div>
        </section>
      </div>

      {/* Right: Details Panel */}
      <aside className="w-full lg:w-[320px] bg-surface border border-outline-variant rounded-xl flex flex-col shrink-0 h-fit min-h-[400px] shadow-2xl">
        <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40">
          <h2 className="font-title-sm text-sm font-semibold text-on-surface">Detalhes do usuário</h2>
          {selectedUser && (
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {selectedUser ? (
          <div className="p-lg flex flex-col gap-lg flex-grow text-[13px] animate-fade-in">
            <div className="flex flex-col items-center text-center gap-xs border-b border-outline-variant/20 pb-md">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary text-lg font-bold border border-primary/20">
                {getInitials(selectedUser.name)}
              </div>
              <h3 className="font-title-sm text-sm font-semibold text-on-surface mt-1">
                {selectedUser.name}
              </h3>
              <span className="font-mono text-on-surface-variant text-[11px]">
                {selectedUser.email}
              </span>
            </div>

            <div className="space-y-md">
              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Papel de acesso
                </span>
                <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                {canManage && selectedUser.id !== currentUser?.id && selectedUser.role !== 'OWNER' && (
                  <select
                    className="mt-2 w-full bg-background border border-outline-variant rounded px-sm py-1 font-body-sm text-[12px] text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                    value={selectedUser.role}
                    onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="FINANCIAL">FINANCIAL</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="READ_ONLY">READ_ONLY</option>
                  </select>
                )}
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Status da conta
                </span>
                <div className="mt-1">{getStatusIndicator(selectedUser.status)}</div>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Criado em
                </span>
                <span className="text-on-surface">
                  {new Date(selectedUser.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div>
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Último login
                </span>
                <span className="text-on-surface">
                  {selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleDateString('pt-BR')
                    : 'Nunca'}
                </span>
              </div>
            </div>

            {canManage && selectedUser.id !== currentUser?.id && (
              <div className="pt-md border-t border-outline-variant/20 flex flex-col gap-sm mt-auto">
                {selectedUser.status === 'ACTIVE' ? (
                  <Button
                    variant="danger"
                    className="text-xs"
                    onClick={() => handleStatusChange(selectedUser.id, 'INACTIVE')}
                    loading={statusActionLoading === selectedUser.id}
                  >
                    Desativar usuário
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => handleStatusChange(selectedUser.id, 'ACTIVE')}
                    loading={statusActionLoading === selectedUser.id}
                  >
                    Reativar usuário
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-xl text-center gap-md my-auto">
            <div className="w-16 h-16 rounded-full bg-surface-container-high/40 flex items-center justify-center border border-outline-variant border-dashed">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant/40">
                person_search
              </span>
            </div>
            <div className="space-y-sm">
              <p className="font-title-sm text-sm font-semibold text-on-surface">
                Nenhum usuário selecionado
              </p>
              <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed max-w-[200px] mx-auto">
                Selecione uma linha na tabela para ver os detalhes e ações disponíveis.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-md animate-in fade-in duration-200">
          <div className="bg-surface border border-outline-variant rounded-xl w-full max-w-md shadow-2xl shadow-black/80">
            <div className="p-md border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-title-sm text-sm font-semibold text-on-surface">
                Adicionar usuário interno
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                className="p-1 hover:bg-surface-container-highest rounded text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-lg flex flex-col gap-md">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-sm rounded text-[12px]">
                  {createError}
                </div>
              )}

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Nome completo
                </label>
                <input
                  className="bg-background border border-outline-variant rounded px-md py-sm h-10 font-body-sm text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="João Silva"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  E-mail
                </label>
                <input
                  className="bg-background border border-outline-variant rounded px-md py-sm h-10 font-body-sm text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="usuario@empresa.com"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Senha inicial
                </label>
                <input
                  className="bg-background border border-outline-variant rounded px-md py-sm h-10 font-body-sm text-[13px] text-on-surface focus:outline-none focus:border-primary"
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Papel de acesso
                </label>
                <select
                  className="bg-background border border-outline-variant text-on-surface rounded px-md py-sm h-10 font-body-sm text-[13px] focus:outline-none focus:border-primary cursor-pointer"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                >
                  {isOwner && <option value="ADMIN">Administrador (ADMIN)</option>}
                  <option value="FINANCIAL">Financeiro (FINANCIAL)</option>
                  <option value="TECHNICIAN">Técnico (TECHNICIAN)</option>
                  <option value="READ_ONLY">Somente leitura (READ_ONLY)</option>
                </select>
              </div>

              <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant/20">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs h-9"
                  onClick={() => { setShowCreateModal(false); setCreateError(null); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs h-9"
                  loading={createLoading}
                >
                  Criar usuário
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
