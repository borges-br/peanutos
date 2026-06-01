'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { extractArray, extractRecord } from '../../../lib/api-shape';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../i18n/useI18n';
import { formatCpfCnpj, formatPhoneNumber } from '@peanut/validators';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import DataTable from '../../../components/ui/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';

export default function ClientsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [clients, setClients] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status ? `&status=${status}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await apiRequest<unknown>(`/clients?page=${page}&limit=10${statusParam}${searchParam}`);
      const responseRecord = extractRecord(response);
      const clientsData = extractArray(response);
      setClients(clientsData);
      setMeta(responseRecord.meta || { page: 1, totalPages: 1, total: clientsData.length });
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  const clientDisplayName = (client: any) => client.tradeName || client.legalName || '--';

  // DataTable column definitions
  const columns = [
    {
      header: `${t.clients.tradeName} / ${t.clients.legalName}`,
      render: (client: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-on-surface">{clientDisplayName(client)}</span>
          <span className="text-[11px] text-on-surface-variant/70 mt-0.5">
            {client.type === 'NATURAL_PERSON' ? 'Pessoa fisica' : client.legalName}
          </span>
        </div>
      ),
    },
    {
      header: t.clients.document,
      render: (client: any) => (
        <span className="font-mono text-technical-data text-on-surface-variant">
          {client.document ? formatCpfCnpj(client.document) : '--'}
        </span>
      ),
    },
    {
      header: t.clients.emailPhone,
      render: (client: any) => (
        <div className="flex flex-col py-0.5">
          <span className="text-on-surface">{client.email || '--'}</span>
          <span className="text-[11px] text-on-surface-variant/70 mt-0.5 font-mono">{client.phone ? formatPhoneNumber(client.phone) : '--'}</span>
        </div>
      ),
    },
    {
      header: t.common.status,
      render: (client: any) => {
        const badgeVariant =
          client.status === 'ACTIVE'
            ? 'success'
            : client.status === 'PROSPECT'
            ? 'warning'
            : 'neutral';
        const label =
          t.enums.clientStatus[client.status as keyof typeof t.enums.clientStatus] || client.status;
        return <Badge variant={badgeVariant}>{label}</Badge>;
      },
    },
    {
      header: t.common.actions,
      className: "text-right",
      render: (client: any) => (
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
          className="py-1 px-3"
        >
          {t.common.details}
        </Button>
      ),
    },
  ];

  // Mobile stacked cards renderer
  const renderMobileCard = (client: any) => {
    const badgeVariant =
      client.status === 'ACTIVE'
        ? 'success'
        : client.status === 'PROSPECT'
        ? 'warning'
        : 'neutral';
    const label =
      t.enums.clientStatus[client.status as keyof typeof t.enums.clientStatus] || client.status;

    return (
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-bold text-on-surface">{clientDisplayName(client)}</span>
            <span className="text-[11px] text-on-surface-variant/70">{client.type === 'NATURAL_PERSON' ? 'Pessoa fisica' : client.legalName}</span>
          </div>
          <Badge variant={badgeVariant}>{label}</Badge>
        </div>
        <div className="h-[1px] bg-outline-variant/30 my-xs"></div>
        <div className="grid grid-cols-2 gap-xs text-[12px]">
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Documento</span>
            <span className="font-mono mt-0.5">{client.document ? formatCpfCnpj(client.document) : '--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Contato</span>
            <span className="truncate mt-0.5">{client.email || '--'}</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
          className="w-full mt-sm justify-center py-2"
        >
          {t.common.details}
        </Button>
      </div>
    );
  };

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'ACTIVE', label: t.enums.clientStatus.ACTIVE },
    { value: 'INACTIVE', label: t.enums.clientStatus.INACTIVE },
    { value: 'PROSPECT', label: t.enums.clientStatus.PROSPECT },
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.clients.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.clients.subtitle}
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/clients/new')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5">person_add</span>
          {t.navigation.newClient}
        </Button>
      </header>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm flex-1 max-w-xl">
          <Input
            type="text"
            placeholder={t.common.search}
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
            <Button variant="ghost" onClick={handleClearFilters} className="text-error/80 hover:text-error">
              {t.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState onRetry={fetchClients} />}

      {/* Data Section */}
      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            title={t.states.emptyTitle}
            description={t.states.emptyDescription}
            action={
              <Button variant="primary" onClick={() => router.push('/dashboard/clients/new')}>
                {t.navigation.newClient}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={clients}
              mobileRender={renderMobileCard}
              rowKey={(client) => client.id}
            />

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                Mostrando {clients.length} de {meta.total} clientes (Pág. {meta.page} de {meta.totalPages})
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
    </div>
  );
}
