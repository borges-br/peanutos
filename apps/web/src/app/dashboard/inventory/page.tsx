'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { extractArray, extractRecord } from '../../../lib/api-shape';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../i18n/useI18n';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import DataTable from '../../../components/ui/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import ClientPageHeader from '../../../components/layout/ClientPageHeader';
import AssetCsvImportModal from '../../../components/inventory/AssetCsvImportModal';

export default function InventoryPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [assets, setAssets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  
  // Filters state
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const fetchClients = async () => {
    try {
      const response = await apiRequest<unknown>('/clients?limit=500');
      setClients(extractArray(response));
    } catch (err) {
      console.error('Falha ao buscar clientes para filtros', err);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = type ? `&type=${type}` : '';
      const statusParam = status ? `&status=${status}` : '';
      const clientParam = clientId ? `&clientId=${clientId}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      
      const response = await apiRequest<unknown>(
        `/assets?page=${page}&limit=10${typeParam}${statusParam}${clientParam}${searchParam}`
      );
      const responseRecord = extractRecord(response);
      const assetsData = extractArray(response);
      setAssets(assetsData);
      setMeta(responseRecord.meta || { page: 1, totalPages: 1, total: assetsData.length });
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page, clientId, type, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const handleClearFilters = () => {
    setSearch('');
    setClientId('');
    setType('');
    setStatus('');
    setPage(1);
  };

  // Convert raw status & type values to localized labels
  const getLocalizedType = (val: string) => {
    return t.enums.assetType[val as keyof typeof t.enums.assetType] || val;
  };

  const getLocalizedStatus = (val: string) => {
    return t.enums.assetStatus[val as keyof typeof t.enums.assetStatus] || val;
  };

  const getStatusVariant = (val: string) => {
    switch (val) {
      case 'OPERATIONAL': return 'success';
      case 'MAINTENANCE': return 'warning';
      case 'OUT_OF_STANDARD': return 'error';
      case 'STOCK': return 'info';
      case 'LOST': return 'purple';
      default: return 'neutral';
    }
  };

  // DataTable column definitions
  const columns = [
    {
      header: `${t.inventory.title} / ${t.inventory.hostname}`,
      render: (asset: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-on-surface">{asset.name}</span>
          {asset.hostname && (
            <span className="text-[11px] text-primary font-mono mt-0.5">
              {asset.hostname}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t.inventory.client,
      render: (asset: any) => (
        <span className="font-medium text-on-surface">
          {asset.client?.tradeName || '--'}
        </span>
      ),
    },
    {
      header: t.inventory.type,
      render: (asset: any) => (
        <Badge variant="neutral">
          {getLocalizedType(asset.type)}
        </Badge>
      ),
    },
    {
      header: t.common.status,
      render: (asset: any) => (
        <Badge variant={getStatusVariant(asset.status)}>
          {getLocalizedStatus(asset.status)}
        </Badge>
      ),
    },
    {
      header: t.inventory.assignedUser,
      render: (asset: any) => (
        <span className={asset.assignedClientUser ? 'text-on-surface font-medium' : 'text-on-surface-variant/50 italic text-[12px]'}>
          {asset.assignedClientUser?.fullName || t.common.notAssigned}
        </span>
      ),
    },
    {
      header: t.inventory.serialAssetTag,
      render: (asset: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-mono text-technical-data text-on-surface">
            {asset.serialNumber || '--'}
          </span>
          {asset.assetTag && (
            <span className="text-[10px] bg-surface-container-highest text-on-surface-variant px-1.5 py-0.2 rounded w-fit mt-0.5 font-mono">
              {asset.assetTag}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t.inventory.location,
      render: (asset: any) => (
        <span className="text-on-surface-variant font-body-sm">
          {asset.location || '--'}
        </span>
      ),
    },
    {
      header: t.common.actions,
      className: "text-right",
      render: (asset: any) => (
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clients/${asset.clientId}/assets/${asset.id}`)}
          className="py-1 px-3"
        >
          {t.common.details}
        </Button>
      ),
    },
  ];

  // Mobile stacked cards renderer
  const renderMobileCard = (asset: any) => {
    return (
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="font-bold text-on-surface">{asset.name}</span>
            {asset.hostname && <span className="text-[11px] text-primary font-mono">{asset.hostname}</span>}
          </div>
          <Badge variant={getStatusVariant(asset.status)}>
            {getLocalizedStatus(asset.status)}
          </Badge>
        </div>
        <div className="h-[1px] bg-outline-variant/30 my-xs"></div>
        <div className="grid grid-cols-2 gap-xs text-[12px]">
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">{t.inventory.client}</span>
            <span className="mt-0.5 font-medium">{asset.client?.tradeName || '--'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">{t.inventory.type}</span>
            <span className="mt-0.5 truncate">{getLocalizedType(asset.type)}</span>
          </div>
          <div className="flex flex-col mt-xs">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">{t.inventory.assignedUserShort}</span>
            <span className="truncate mt-0.5 italic text-on-surface-variant/80">
              {asset.assignedClientUser?.fullName || t.common.notAssigned}
            </span>
          </div>
          <div className="flex flex-col mt-xs">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">{t.inventory.serialShort}</span>
            <span className="font-mono mt-0.5">{asset.serialNumber || '--'}</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clients/${asset.clientId}/assets/${asset.id}`)}
          className="w-full mt-sm justify-center py-2"
        >
          {t.common.details}
        </Button>
      </div>
    );
  };

  const clientOptions = [
    { value: '', label: t.inventory.filters.allClients },
    ...clients.map(c => ({ value: c.id, label: c.tradeName || c.legalName })),
  ];

  const typeOptions = [
    { value: '', label: t.inventory.filters.allTypes },
    ...Object.entries(t.enums.assetType).map(([key, label]) => ({ value: key, label })),
  ];

  const statusOptions = [
    { value: '', label: t.inventory.filters.allStatuses },
    ...Object.entries(t.enums.assetStatus).map(([key, label]) => ({ value: key, label })),
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={[
          { label: t.navigation.home, href: '/dashboard' },
          { label: t.navigation.technicalInventory },
        ]}
        title={t.navigation.technicalInventory}
        description={t.inventory.subtitle}
        primaryActions={
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">upload_file</span>
            Importar CSV
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-md bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm w-full">
          <Input
            type="text"
            placeholder={t.inventory.filters.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-6">
            {t.common.searchAction}
          </Button>
        </form>

        <div className="flex flex-wrap gap-md items-center justify-between w-full">
          <div className="flex flex-wrap gap-sm items-center flex-1">
            <SearchableSelect
              value={clientId}
              onChange={(value) => {
                setClientId(value);
                setPage(1);
              }}
              options={clientOptions}
              className="min-w-[160px]"
              searchPlaceholder="Buscar cliente..."
            />

            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              options={typeOptions}
              className="min-w-[160px]"
            />

            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={statusOptions}
              className="min-w-[160px]"
            />
          </div>

          {(search || clientId || type || status) && (
            <Button variant="ghost" onClick={handleClearFilters} className="text-error/80 hover:text-error py-1 px-3">
              {t.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState onRetry={fetchAssets} />}

      {/* Data Section */}
      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState
            title={t.states.emptyTitle}
            description={t.inventory.emptyDescription}
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={assets}
              mobileRender={renderMobileCard}
              rowKey={(asset) => asset.id}
            />

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                {t.inventory.pagination
                  .replace('{count}', String(assets.length))
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

      {showImportModal && (
        <AssetCsvImportModal
          clients={clients.map((client) => ({
            id: client.id,
            label: client.tradeName || client.legalName,
          }))}
          onClose={() => setShowImportModal(false)}
          onImported={fetchAssets}
        />
      )}
    </div>
  );
}
