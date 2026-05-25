'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../../i18n/useI18n';
import Button from '../../../../../components/ui/Button';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import DataTable from '../../../../../components/ui/DataTable';
import EmptyState from '../../../../../components/ui/EmptyState';
import ErrorState from '../../../../../components/ui/ErrorState';

export default function ClientUsersPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  
  // Search & filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchClientDetails = async () => {
    try {
      const response = await apiRequest(`/clients/${clientId}`);
      setClient(response);
    } catch (err) {
      console.error('Falha ao buscar detalhes do cliente', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status ? `&status=${status}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      
      const response = await apiRequest(
        `/clients/${clientId}/users?page=${page}&limit=10${statusParam}${searchParam}`
      );
      setUsers(response.data || []);
      setMeta(response.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
    fetchUsers();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setJobTitle('');
    setFormStatus('ACTIVE');
    setNotes('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFullName(user.fullName);
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setJobTitle(user.jobTitle || '');
    setFormStatus(user.status);
    setNotes(user.notes || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    // Basic Validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Nome completo é obrigatório (mínimo 2 caracteres)');
      setFormSubmitting(false);
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('E-mail inválido');
      setFormSubmitting(false);
      return;
    }

    const payload = {
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      department: department || undefined,
      jobTitle: jobTitle || undefined,
      status: formStatus,
      notes: notes || undefined,
    };

    try {
      if (isEditing && editingUserId) {
        await apiRequest(`/clients/${clientId}/users/${editingUserId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/clients/${clientId}/users`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar usuário do cliente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/clients/${clientId}/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchUsers();
    } catch (err: any) {
      console.error(err.message || 'Falha ao alterar status.');
    }
  };

  const clientUserStatuses = [
    { value: 'ACTIVE', label: 'Ativo' },
    { value: 'INACTIVE', label: 'Inativo' },
    { value: 'ON_LEAVE', label: 'Licença' },
    { value: 'TERMINATED', label: 'Desligado' },
    { value: 'PENDING_REVIEW', label: 'Pendente Revisão' },
  ];

  const getStatusVariant = (st: string) => {
    switch (st) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'error';
      case 'ON_LEAVE':
      case 'PENDING_REVIEW': return 'warning';
      default: return 'neutral';
    }
  };

  // DataTable columns definition
  const columns = [
    {
      header: t.clientUsers.userCol,
      render: (clientUser: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-on-surface">{clientUser.fullName}</span>
          {clientUser.jobTitle && <span className="text-[11px] text-on-surface-variant/70 mt-0.5">{clientUser.jobTitle}</span>}
        </div>
      ),
    },
    {
      header: t.clientUsers.emailCol,
      render: (clientUser: any) => (
        <div className="flex flex-col py-0.5 font-mono text-xs">
          <span className="text-on-surface">{clientUser.email || '--'}</span>
          {clientUser.phone && <span className="text-[10px] text-on-surface-variant/70 mt-0.5">{clientUser.phone}</span>}
        </div>
      ),
    },
    {
      header: t.clientUsers.deptCol,
      render: (clientUser: any) => (
        <span className="text-on-surface font-medium">{clientUser.department || '--'}</span>
      ),
    },
    {
      header: t.clientUsers.statusCol,
      render: (clientUser: any) => {
        const badgeLabel = clientUserStatuses.find(s => s.value === clientUser.status)?.label || clientUser.status;
        return (
          <span
            onClick={() => handleToggleStatus(clientUser)}
            className="cursor-pointer active:scale-95 transition-transform"
            title="Clique para alternar rápido Ativo/Inativo"
          >
            <Badge variant={getStatusVariant(clientUser.status)}>{badgeLabel}</Badge>
          </span>
        );
      },
    },
    {
      header: t.clientUsers.equipmentCol,
      render: (clientUser: any) => (
        <span className="inline-flex items-center gap-xs px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary font-mono">
          {clientUser.assetsCount || 0} ativo(s)
        </span>
      ),
    },
    {
      header: t.clientUsers.actionsCol,
      className: "text-right",
      render: (clientUser: any) => (
        <Button
          variant="outline"
          onClick={() => openEditModal(clientUser)}
          className="py-1 px-3 text-xs"
        >
          {t.common.edit}
        </Button>
      ),
    },
  ];

  // Mobile rendering
  const renderMobileCard = (clientUser: any) => {
    const badgeLabel = clientUserStatuses.find(s => s.value === clientUser.status)?.label || clientUser.status;

    return (
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col max-w-[70%]">
            <span className="font-bold text-on-surface">{clientUser.fullName}</span>
            {clientUser.jobTitle && <span className="text-[11px] text-on-surface-variant/70">{clientUser.jobTitle}</span>}
          </div>
          <Badge variant={getStatusVariant(clientUser.status)}>{badgeLabel}</Badge>
        </div>
        <div className="h-[1px] bg-outline-variant/30 my-xs"></div>
        <div className="grid grid-cols-2 gap-xs text-[12px]">
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Contato</span>
            <span className="truncate mt-0.5 font-mono">{clientUser.email || '--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Setor</span>
            <span className="truncate mt-0.5 text-on-surface">{clientUser.department || '--'}</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => openEditModal(clientUser)}
          className="w-full mt-sm justify-center py-2"
        >
          {t.common.edit}
        </Button>
      </div>
    );
  };

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    ...clientUserStatuses.map(s => ({ value: s.value, label: s.label }))
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-xs text-[12px] text-on-surface-variant">
            <span onClick={() => router.push('/dashboard/clients')} className="cursor-pointer text-primary hover:underline font-medium">Clientes</span>
            <span>/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} className="cursor-pointer text-primary hover:underline font-medium">
              {client?.tradeName || 'Dossiê'}
            </span>
            <span>/</span>
            <span className="text-on-surface-variant/70">Usuários Finais</span>
          </div>
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight mt-1">
            {t.clientUsers.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.clientUsers.subtitle.replace('{name}', client?.tradeName || '...')}
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">person_add</span>
          Novo Usuário Final
        </Button>
      </header>

      {/* Navigation tabs */}
      <div className="border-b border-outline-variant/30 flex gap-sm overflow-x-auto">
        <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} className="py-2 px-md cursor-pointer border-b-2 border-transparent text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap">Geral / Contatos</span>
        <span onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)} className="py-2 px-md cursor-pointer border-b-2 border-transparent text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap">Inventário</span>
        <span className="py-2 px-md cursor-pointer border-b-2 border-primary text-sm font-semibold text-primary whitespace-nowrap">Usuários Finais</span>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm flex-1 max-w-xl">
          <Input
            type="text"
            placeholder="Buscar por nome, e-mail, departamento ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            Buscar
          </Button>
        </form>

        <div className="flex gap-sm items-center">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={statusOptions}
            className="min-w-[160px]"
          />
          {(search || status) && (
            <Button variant="ghost" onClick={handleClearFilters} className="text-error/80 hover:text-error py-1">
              {t.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState onRetry={fetchUsers} />}

      {/* Data table canvas */}
      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title={t.clientUsers.noRecords}
            description={t.states.emptyDescription}
            action={
              <Button variant="outline" onClick={openCreateModal}>
                Cadastrar primeiro usuário
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={users}
              mobileRender={renderMobileCard}
              rowKey={(user) => user.id}
            />

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                Mostrando {users.length} de {meta.total} usuários (Pág. {meta.page} de {meta.totalPages})
              </span>
              <div className="flex gap-sm">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="py-1 px-4 text-xs"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="py-1 px-4 text-xs"
                >
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Creating / Editing Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-200">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-xl p-lg shadow-2xl relative flex flex-col gap-md animate-in fade-in duration-200">
            <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-sm">
              <h3 className="font-title-sm text-sm font-bold text-on-surface">
                {isEditing ? 'Editar Usuário Final' : 'Novo Usuário Final'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-2xl font-light cursor-pointer select-none leading-none"
              >
                &times;
              </button>
            </header>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-md">
              {formError && (
                <div className="bg-error-container/10 border border-error-container/20 text-error p-sm rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="text-[12px] font-semibold text-on-surface-variant">Nome Completo *</label>
                  <Input
                    type="text"
                    required
                    placeholder="Ex: Maria Souza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-[12px] font-semibold text-on-surface-variant">E-mail</label>
                  <Input
                    type="email"
                    placeholder="Ex: maria.souza@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-[12px] font-semibold text-on-surface-variant">Telefone</label>
                  <Input
                    type="text"
                    placeholder="Ex: (11) 98888-8888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-[12px] font-semibold text-on-surface-variant">Departamento</label>
                  <Input
                    type="text"
                    placeholder="Ex: Financeiro"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-[12px] font-semibold text-on-surface-variant">Cargo / Função</label>
                  <Input
                    type="text"
                    placeholder="Ex: Analista Fiscal"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="text-[12px] font-semibold text-on-surface-variant">Status</label>
                  <Select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    options={clientUserStatuses}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="text-[12px] font-semibold text-on-surface-variant">Observações Internas</label>
                <textarea
                  placeholder="Informações adicionais como horários de acesso específicos, quotas, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant focus:border-primary/50 text-on-surface rounded-xl p-md text-sm outline-none resize-none font-body transition-colors focus:ring-1 focus:ring-primary/20 min-h-[80px]"
                />
              </div>

              <footer className="flex justify-end gap-sm border-t border-outline-variant/30 pt-md mt-sm">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
