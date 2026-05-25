'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '../../../../../lib/api';
import { extractArray, extractRecord } from '../../../../../lib/api-shape';
import { useI18n } from '../../../../../i18n/useI18n';
import Button from '../../../../../components/ui/Button';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import DataTable from '../../../../../components/ui/DataTable';
import EmptyState from '../../../../../components/ui/EmptyState';
import ErrorState from '../../../../../components/ui/ErrorState';
import ClientContextTabs from '../../../../../components/layout/ClientContextTabs';
import ClientPageHeader from '../../../../../components/layout/ClientPageHeader';

export default function ClientUsersPage() {
  const params = useParams();
  const { t } = useI18n();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

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

      const response = await apiRequest<unknown>(
        `/clients/${clientId}/users?page=${page}&limit=10${statusParam}${searchParam}`
      );
      const responseRecord = extractRecord(response);
      const usersData = extractArray(response);
      setUsers(usersData);
      setMeta(responseRecord.meta || { page: 1, totalPages: 1, total: usersData.length });
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
    const nextStatusLabel = clientUserStatuses.find(s => s.value === nextStatus)?.label || nextStatus;
    if (!window.confirm(t.clientUsers.confirmStatusChange.replace('{name}', user.fullName).replace('{status}', nextStatusLabel))) {
      return;
    }

    try {
      await apiRequest(`/clients/${clientId}/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchUsers();
    } catch (err: any) {
      console.error(err.message || t.clientUsers.statusChangeError);
    }
  };

  const clientUserStatuses = [
    { value: 'ACTIVE', label: t.clientUsers.statuses.ACTIVE },
    { value: 'INACTIVE', label: t.clientUsers.statuses.INACTIVE },
    { value: 'ON_LEAVE', label: t.clientUsers.statuses.ON_LEAVE },
    { value: 'TERMINATED', label: t.clientUsers.statuses.TERMINATED },
    { value: 'PENDING_REVIEW', label: t.clientUsers.statuses.PENDING_REVIEW },
  ];

  const getStatusVariant = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'error';
      case 'ON_LEAVE':
      case 'PENDING_REVIEW':
        return 'warning';
      default:
        return 'neutral';
    }
  };

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
        return <Badge variant={getStatusVariant(clientUser.status)}>{badgeLabel}</Badge>;
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
      className: 'text-right',
      render: (clientUser: any) => (
        <div className="flex flex-wrap justify-end gap-sm">
          <Button variant="outline" onClick={() => openEditModal(clientUser)} className="py-1 px-3 text-xs">
            {t.common.edit}
          </Button>
          <Button
            variant={clientUser.status === 'ACTIVE' ? 'danger' : 'outline'}
            onClick={() => handleToggleStatus(clientUser)}
            className="py-1 px-3 text-xs"
          >
            {clientUser.status === 'ACTIVE' ? t.clientUsers.deactivate : t.clientUsers.activate}
          </Button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (clientUser: any) => {
    const badgeLabel = clientUserStatuses.find(s => s.value === clientUser.status)?.label || clientUser.status;

    return (
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-start gap-sm">
          <div className="flex min-w-0 flex-col">
            <span className="font-bold text-on-surface truncate">{clientUser.fullName}</span>
            {clientUser.jobTitle && <span className="text-[11px] text-on-surface-variant/70">{clientUser.jobTitle}</span>}
          </div>
          <Badge variant={getStatusVariant(clientUser.status)}>{badgeLabel}</Badge>
        </div>
        <div className="h-[1px] bg-outline-variant/30 my-xs" />
        <div className="grid grid-cols-2 gap-xs text-[12px]">
          <div className="flex min-w-0 flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Contato</span>
            <span className="truncate mt-0.5 font-mono">{clientUser.email || '--'}</span>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Setor</span>
            <span className="truncate mt-0.5 text-on-surface">{clientUser.department || '--'}</span>
          </div>
        </div>
        <div className="flex flex-col gap-sm sm:flex-row">
          <Button variant="outline" onClick={() => openEditModal(clientUser)} className="w-full mt-sm justify-center py-2">
            {t.common.edit}
          </Button>
          <Button
            variant={clientUser.status === 'ACTIVE' ? 'danger' : 'outline'}
            onClick={() => handleToggleStatus(clientUser)}
            className="w-full mt-sm justify-center py-2"
          >
            {clientUser.status === 'ACTIVE' ? t.clientUsers.deactivate : t.clientUsers.activate}
          </Button>
        </div>
      </div>
    );
  };

  const statusOptions = [
    { value: '', label: t.clientUsers.allStatuses },
    ...clientUserStatuses.map(s => ({ value: s.value, label: s.label })),
  ];
  const clientName = client?.tradeName || client?.legalName || t.clients.title;
  const breadcrumbs = [
    { label: t.clients.title, href: '/dashboard/clients' },
    { label: clientName, href: `/dashboard/clients/${clientId}` },
    { label: t.clients.tabs.users },
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={breadcrumbs}
        title={t.clients.pages.usersTitle}
        description={t.clients.pages.usersDescription.replace('{name}', clientName)}
        primaryActions={
          <Button variant="primary" onClick={openCreateModal}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">person_add</span>
            {t.clients.actions.newUser}
          </Button>
        }
        tabs={<ClientContextTabs clientId={clientId} />}
      />

      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-sm flex-1 sm:flex-row sm:max-w-xl">
          <Input
            type="text"
            placeholder={t.clientUsers.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            {t.common.searchAction}
          </Button>
        </form>

        <div className="flex flex-col gap-sm sm:flex-row sm:items-center">
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
                {t.clients.actions.firstUser}
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

            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                {t.clientUsers.pagination
                  .replace('{count}', String(users.length))
                  .replace('{total}', String(meta.total))
                  .replace('{page}', String(meta.page))
                  .replace('{totalPages}', String(meta.totalPages))}
              </span>
              <div className="flex gap-sm">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="py-1 px-4 text-xs"
                >
                  {t.common.previous}
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="py-1 px-4 text-xs"
                >
                  {t.common.next}
                </Button>
              </div>
            </div>
          </div>
        )
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-200 p-md">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-xl p-lg shadow-2xl relative flex flex-col gap-md animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-sm">
              <h3 className="font-title-sm text-sm font-bold text-on-surface">
                {isEditing ? t.clientUsers.editTitle : t.clientUsers.newTitle}
              </h3>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 px-0 py-0 text-xl leading-none"
              >
                &times;
              </Button>
            </header>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-md">
              {formError && (
                <div className="bg-error-container/10 border border-error-container/20 text-error p-sm rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <Input
                  label="Nome Completo *"
                  type="text"
                  required
                  placeholder="Ex: Maria Souza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="Ex: maria.souza@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Telefone"
                  type="text"
                  placeholder="Ex: (11) 98888-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Departamento"
                  type="text"
                  placeholder="Ex: Financeiro"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
                <Input
                  label="Cargo / Função"
                  type="text"
                  placeholder="Ex: Analista Fiscal"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
                <Select
                  label="Status"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  options={clientUserStatuses}
                />
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
                  {t.common.cancel}
                </Button>
                <Button type="submit" variant="primary" disabled={formSubmitting}>
                  {formSubmitting ? t.common.saving : t.common.save}
                </Button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
