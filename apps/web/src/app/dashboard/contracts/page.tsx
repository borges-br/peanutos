'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { extractArray, extractRecord } from '../../../lib/api-shape';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import DataTable from '../../../components/ui/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';

export default function ContractsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // We will cache quota details to display progress bars for each active support contract
  const [quotas, setQuotas] = useState<Record<string, any>>({});

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const qParams = new URLSearchParams();
      qParams.append('page', String(page));
      qParams.append('limit', '10');
      if (status) qParams.append('status', status);
      if (type) qParams.append('type', type);
      if (clientId) qParams.append('clientId', clientId);
      if (search) qParams.append('search', search);

      const response = await apiRequest<unknown>(`/contracts?${qParams.toString()}`);
      const responseRecord = extractRecord(response);
      const dataList = extractArray<any>(response);
      setContracts(dataList);
      setMeta(responseRecord.meta || { page: 1, totalPages: 1, total: dataList.length });

      // Fetch quota details for each unique client in the list
      const clientIds = Array.from(new Set(dataList.map((c: any) => c.clientId))) as string[];
      const quotaMap: Record<string, any> = {};
      
      await Promise.all(
        clientIds.map(async (cId) => {
          try {
            const quotaData = await apiRequest(`/contracts-quota/client/${cId}`);
            quotaMap[cId] = quotaData;
          } catch (e) {
            // Ignore if quota lookup fails for some client (e.g. no active contract)
          }
        })
      );
      setQuotas(quotaMap);
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [page, status, type, clientId]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await apiRequest<unknown>('/clients?limit=100');
        setClients(extractArray(response));
      } catch {
        setClients([]);
      }
    };
    fetchClients();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContracts();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setType('');
    setClientId('');
    setPage(1);
  };

  const formatCurrency = (amountCents: number) => {
    if (!hasFinancialPrivilege) return t.contracts.protectedValue;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  const getStatusVariant = (contractStatus: string) => {
    switch (contractStatus) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
      case 'EXPIRED':
        return 'warning';
      case 'CANCELLED':
      case 'TERMINATED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  // DataTable column definitions
  const columns = [
    {
      header: t.contracts.numberTitle,
      render: (contract: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-mono text-xs font-bold text-primary">{contract.number}</span>
          <span className="font-semibold text-on-surface mt-0.5">{contract.title}</span>
        </div>
      ),
    },
    {
      header: t.contracts.client,
      render: (contract: any) => (
        <span className="font-semibold text-on-surface">{contract.client?.tradeName || 'Cliente'}</span>
      ),
    },
    {
      header: t.contracts.typeStatus,
      render: (contract: any) => {
        const statusLabel = t.enums.contractStatus[contract.status as keyof typeof t.enums.contractStatus] || contract.status;
        const typeLabel = t.enums.contractType[contract.type as keyof typeof t.enums.contractType] || contract.type;
        return (
          <div className="flex flex-col gap-1 py-0.5">
            <span className="text-xs text-on-surface-variant font-medium">{typeLabel}</span>
            <Badge variant={getStatusVariant(contract.status)} className="w-fit text-[10px] py-0 px-2 uppercase">
              {statusLabel}
            </Badge>
          </div>
        );
      },
    },
    {
      header: t.contracts.billing,
      render: (contract: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-on-surface font-mono">{formatCurrency(contract.monthlyAmountCents)}</span>
          <span className="text-[11px] text-on-surface-variant/70 mt-0.5 font-sans">
            {t.contracts.billingDay}: {contract.billingDay}
          </span>
        </div>
      ),
    },
    {
      header: t.contracts.quotas,
      render: (contract: any) => {
        const quota = quotas[contract.clientId];
        const isRecurring = ['RECURRING_SUPPORT', 'HYBRID'].includes(contract.type);
        const hasValidQuotas = isRecurring && contract.status === 'ACTIVE' && quota && (contract.maxUsers !== null || contract.maxAssets !== null);

        if (!hasValidQuotas) {
          return <span className="text-xs text-on-surface-variant/40 italic">{t.contracts.noQuotas}</span>;
        }

        return (
          <div className="flex flex-col gap-2 w-44 py-0.5">
            {contract.maxUsers !== null && quota.usedUsers !== undefined && (
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-on-surface-variant">{t.contracts.usersQuota}</span>
                  <span className="font-bold text-on-surface">
                    {quota.usedUsers} / {contract.maxUsers}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-container-low border border-outline-variant/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (quota.usedUsers / contract.maxUsers) >= 0.9 ? 'bg-error' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, (quota.usedUsers / contract.maxUsers) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {contract.maxAssets !== null && quota.usedAssets !== undefined && (
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-on-surface-variant">{t.contracts.assetsQuota}</span>
                  <span className="font-bold text-on-surface">
                    {quota.usedAssets} / {contract.maxAssets}
                  </span>
                </div>
                <div className="h-1.5 bg-surface-container-low border border-outline-variant/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (quota.usedAssets / contract.maxAssets) >= 0.9 ? 'bg-error' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(100, (quota.usedAssets / contract.maxAssets) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: t.common.actions,
      className: "text-right",
      render: (contract: any) => (
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
          className="py-1 px-3"
        >
          {t.common.details}
        </Button>
      ),
    },
  ];

  // Mobile stacked cards renderer
  const renderMobileCard = (contract: any) => {
    const statusLabel = t.enums.contractStatus[contract.status as keyof typeof t.enums.contractStatus] || contract.status;
    const typeLabel = t.enums.contractType[contract.type as keyof typeof t.enums.contractType] || contract.type;
    const quota = quotas[contract.clientId];
    const isRecurring = ['RECURRING_SUPPORT', 'HYBRID'].includes(contract.type);
    const hasValidQuotas = isRecurring && contract.status === 'ACTIVE' && quota && (contract.maxUsers !== null || contract.maxAssets !== null);

    return (
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col max-w-[70%]">
            <span className="font-mono text-xs font-bold text-primary">{contract.number}</span>
            <span className="font-bold text-on-surface truncate mt-0.5">{contract.title}</span>
          </div>
          <Badge variant={getStatusVariant(contract.status)} className="uppercase text-[10px] py-0 px-2">
            {statusLabel}
          </Badge>
        </div>
        <div className="h-[1px] bg-outline-variant/30 my-xs"></div>
        <div className="grid grid-cols-2 gap-xs text-[12px]">
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Cliente</span>
            <span className="truncate mt-0.5 font-semibold text-on-surface">
              {contract.client?.tradeName || 'Cliente'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Tipo</span>
            <span className="truncate mt-0.5 text-on-surface">{typeLabel}</span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Faturamento</span>
            <span className="font-mono font-semibold text-primary mt-0.5">{formatCurrency(contract.monthlyAmountCents)}</span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Cota Ativos</span>
            <span className="font-semibold text-on-surface mt-0.5">
              {hasValidQuotas && contract.maxAssets !== null ? `${quota.usedAssets} / ${contract.maxAssets}` : '--'}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
          className="w-full mt-sm justify-center py-2"
        >
          {t.common.details}
        </Button>
      </div>
    );
  };

  const clientOptions = [
    { value: '', label: 'Todos os clientes' },
    ...clients.map(c => ({ value: c.id, label: c.tradeName || c.legalName }))
  ];

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'DRAFT', label: t.enums.contractStatus.DRAFT },
    { value: 'ACTIVE', label: t.enums.contractStatus.ACTIVE },
    { value: 'SUSPENDED', label: t.enums.contractStatus.SUSPENDED },
    { value: 'EXPIRED', label: t.enums.contractStatus.EXPIRED },
    { value: 'CANCELLED', label: t.enums.contractStatus.CANCELLED },
    { value: 'TERMINATED', label: t.enums.contractStatus.TERMINATED }
  ];

  const typeOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'RECURRING_SUPPORT', label: t.enums.contractType.RECURRING_SUPPORT },
    { value: 'PROJECT', label: t.enums.contractType.PROJECT },
    { value: 'ON_DEMAND', label: t.enums.contractType.ON_DEMAND },
    { value: 'HYBRID', label: t.enums.contractType.HYBRID }
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.contracts.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.contracts.subtitle}
          </p>
        </div>
        {hasFinancialPrivilege && (
          <Button variant="primary" onClick={() => router.push('/dashboard/contracts/new')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
            {t.contracts.createBtn}
          </Button>
        )}
      </header>

      {/* Advanced Filters */}
      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm flex-1 max-w-xl">
          <Input
            type="text"
            placeholder="Buscar por título, número de contrato ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            Buscar
          </Button>
        </form>

        <div className="flex flex-wrap gap-sm items-center">
          <Select
            value={clientId}
            onChange={(e) => { setClientId(e.target.value); setPage(1); }}
            options={clientOptions}
            className="min-w-[150px]"
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={statusOptions}
            className="min-w-[130px]"
          />
          <Select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            options={typeOptions}
            className="min-w-[150px]"
          />
          {(search || clientId || status || type) && (
            <Button variant="ghost" onClick={handleClearFilters} className="text-error/80 hover:text-error py-1">
              {t.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState onRetry={fetchContracts} />}

      {/* Data Section */}
      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState
            title={t.contracts.emptyList}
            description={t.states.emptyDescription}
            action={
              hasFinancialPrivilege ? (
                <Button variant="primary" onClick={() => router.push('/dashboard/contracts/new')}>
                  {t.contracts.emptyListBtn}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={contracts}
              mobileRender={renderMobileCard}
              rowKey={(contract) => contract.id}
            />

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                Mostrando {contracts.length} de {meta.total} contratos (Pág. {meta.page} de {meta.totalPages})
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
