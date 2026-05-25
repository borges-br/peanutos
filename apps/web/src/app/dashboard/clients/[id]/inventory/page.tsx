'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../../../lib/api';
import { useI18n } from '../../../../../i18n/useI18n';
import Button from '../../../../../components/ui/Button';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import DataTable from '../../../../../components/ui/DataTable';
import EmptyState from '../../../../../components/ui/EmptyState';
import ClientContextTabs from '../../../../../components/layout/ClientContextTabs';
import ClientPageHeader from '../../../../../components/layout/ClientPageHeader';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

export default function ClientInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('WORKSTATION');
  const [assetStatus, setAssetStatus] = useState('OPERATIONAL');
  const [hostname, setHostname] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [operatingSystem, setOperatingSystem] = useState('');
  const [location, setLocation] = useState('');
  const [remoteAccessId, setRemoteAccessId] = useState('');
  const [sensitiveDataEncrypted, setSensitiveDataEncrypted] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedClientUserId, setAssignedClientUserId] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const assetTypes = [
    { value: 'WORKSTATION', label: 'Estação de Trabalho' },
    { value: 'NOTEBOOK', label: 'Notebook' },
    { value: 'SERVER', label: 'Servidor' },
    { value: 'PRINTER', label: 'Impressora' },
    { value: 'ROUTER', label: 'Roteador' },
    { value: 'SWITCH', label: 'Switch' },
    { value: 'ACCESS_POINT', label: 'Access Point' },
    { value: 'FIREWALL', label: 'Firewall' },
    { value: 'CAMERA', label: 'Câmera IP' },
    { value: 'NVR', label: 'NVR / DVR' },
    { value: 'UPS', label: 'Nobreak (UPS)' },
    { value: 'RACK', label: 'Rack' },
    { value: 'NAS', label: 'Storage NAS' },
    { value: 'MOBILE_DEVICE', label: 'Dispositivo Móvel' },
    { value: 'VIRTUAL_MACHINE', label: 'Máquina Virtual' },
    { value: 'CLOUD_SERVICE', label: 'Serviço em Nuvem' },
    { value: 'LICENSE', label: 'Licença Geral' },
    { value: 'SOFTWARE_LICENSE', label: 'Licença de Software' },
    { value: 'VPN', label: 'Túnel VPN' },
    { value: 'STORAGE', label: 'Armazenamento' },
    { value: 'OTHER', label: 'Outro' },
  ];

  const assetStatuses = [
    { value: 'OPERATIONAL', label: 'Operacional' },
    { value: 'MAINTENANCE', label: 'Em Manutenção' },
    { value: 'OUT_OF_STANDARD', label: 'Fora de Padrão' },
    { value: 'STOCK', label: 'Em Estoque' },
    { value: 'IN_STOCK', label: 'Em Estoque (Novo)' },
    { value: 'RETIRED', label: 'Aposentado' },
    { value: 'SCRAPPED', label: 'Sucateado' },
    { value: 'LOST', label: 'Extraviado' },
    { value: 'PENDING_VALIDATION', label: 'Pendente Homologação' },
    { value: 'PENDING_REVIEW', label: 'Em Revisão' },
  ];

  const fetchClientDetails = async () => {
    try {
      const response = await apiRequest(`/clients/${clientId}`);
      setClient(response);
    } catch (err) {
      console.error('Falha ao buscar detalhes do cliente', err);
    }
  };

  const fetchClientUsers = async () => {
    try {
      const response = await apiRequest(`/clients/${clientId}/users?limit=100`);
      setClientUsers(response.data || []);
    } catch (err) {
      console.error('Falha ao buscar usuários para dropdown', err);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const typeParam = type ? `&type=${type}` : '';
      const statusParam = status ? `&status=${status}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';

      const response = await apiRequest(
        `/clients/${clientId}/assets?page=${page}&limit=10${typeParam}${statusParam}${searchParam}`
      );
      setAssets(response.data || []);
      setMeta(response.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar ativos do cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
    fetchClientUsers();
    fetchAssets();
  }, [page, type, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingAssetId(null);
    setName('');
    setAssetType('WORKSTATION');
    setAssetStatus('OPERATIONAL');
    setHostname('');
    setManufacturer('');
    setModel('');
    setSerialNumber('');
    setAssetTag('');
    setMacAddress('');
    setIpAddress('');
    setOperatingSystem('');
    setLocation('');
    setRemoteAccessId('');
    setSensitiveDataEncrypted('');
    setNotes('');
    setAssignedClientUserId('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (asset: any) => {
    setIsEditing(true);
    setEditingAssetId(asset.id);
    setName(asset.name);
    setAssetType(asset.type);
    setAssetStatus(asset.status);
    setHostname(asset.hostname || '');
    setManufacturer(asset.manufacturer || '');
    setModel(asset.model || '');
    setSerialNumber(asset.serialNumber || '');
    setAssetTag(asset.assetTag || '');
    setMacAddress(asset.macAddress || '');
    setIpAddress(asset.ipAddress || '');
    setOperatingSystem(asset.operatingSystem || '');
    setLocation(asset.location || '');
    setRemoteAccessId(asset.remoteAccessId || '');
    setSensitiveDataEncrypted('');
    setNotes(asset.notes || '');
    setAssignedClientUserId(asset.assignedClientUserId || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    if (!name.trim() || name.trim().length < 2) {
      setFormError('Nome do ativo é obrigatório (mínimo 2 caracteres)');
      setFormSubmitting(false);
      return;
    }

    if (ipAddress.trim() && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddress)) {
      setFormError('Endereço IP inválido');
      setFormSubmitting(false);
      return;
    }

    if (macAddress.trim() && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macAddress)) {
      setFormError('Endereço MAC inválido (use XX:XX:XX:XX:XX:XX)');
      setFormSubmitting(false);
      return;
    }

    const payload: any = {
      name,
      type: assetType,
      status: assetStatus,
      hostname: hostname || undefined,
      manufacturer: manufacturer || undefined,
      model: model || undefined,
      serialNumber: serialNumber || undefined,
      assetTag: assetTag || undefined,
      macAddress: macAddress || undefined,
      ipAddress: ipAddress || undefined,
      operatingSystem: operatingSystem || undefined,
      location: location || undefined,
      remoteAccessId: remoteAccessId || undefined,
      notes: notes || undefined,
      assignedClientUserId: assignedClientUserId || null,
    };

    if (sensitiveDataEncrypted) {
      payload.sensitiveDataEncrypted = sensitiveDataEncrypted;
    }

    try {
      if (isEditing && editingAssetId) {
        await apiRequest(`/clients/${clientId}/assets/${editingAssetId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/clients/${clientId}/assets`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchAssets();
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar ativo do cliente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchiveAsset = async (asset: any) => {
    if (!window.confirm(`Deseja realmente arquivar/desativar o ativo "${asset.name}"?`)) {
      return;
    }
    try {
      await apiRequest(`/clients/${clientId}/assets/${asset.id}`, {
        method: 'DELETE',
      });
      fetchAssets();
    } catch (err: any) {
      alert(err.message || 'Falha ao desativar ativo.');
    }
  };

  const getAssetStatusVariant = (assetStatusValue: string): BadgeVariant => {
    switch (assetStatusValue) {
      case 'OPERATIONAL':
        return 'success';
      case 'MAINTENANCE':
      case 'PENDING_VALIDATION':
      case 'PENDING_REVIEW':
        return 'warning';
      case 'OUT_OF_STANDARD':
      case 'SCRAPPED':
      case 'LOST':
        return 'error';
      case 'STOCK':
      case 'IN_STOCK':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getAssetStatusLabel = (assetStatusValue: string) =>
    assetStatuses.find(s => s.value === assetStatusValue)?.label || assetStatusValue;

  const getAssetTypeLabel = (assetTypeValue: string) =>
    assetTypes.find(item => item.value === assetTypeValue)?.label || assetTypeValue;

  const assetColumns = [
    {
      header: 'Ativo / Hostname',
      render: (asset: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-on-surface">{asset.name}</span>
          {asset.hostname && <span className="mt-0.5 font-mono text-[11px] text-on-surface-variant/70">{asset.hostname}</span>}
        </div>
      ),
    },
    {
      header: t.inventory.type,
      render: (asset: any) => <Badge variant="neutral">{getAssetTypeLabel(asset.type)}</Badge>,
    },
    {
      header: t.common.status,
      render: (asset: any) => (
        <Badge variant={getAssetStatusVariant(asset.status)}>{getAssetStatusLabel(asset.status)}</Badge>
      ),
    },
    {
      header: t.inventory.assignedUser,
      render: (asset: any) => (
        asset.assignedClientUser ? (
          <span className="font-medium text-on-surface">{asset.assignedClientUser.fullName}</span>
        ) : (
          <span className="text-[12px] italic text-on-surface-variant/60">{t.common.notAssigned}</span>
        )
      ),
    },
    {
      header: t.inventory.serialAssetTag,
      render: (asset: any) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[12px] text-on-surface">{asset.serialNumber || '--'}</span>
          {asset.assetTag && <span className="w-fit rounded bg-surface-container-highest px-1.5 py-0.5 text-[11px] text-on-surface-variant">{asset.assetTag}</span>}
        </div>
      ),
    },
    {
      header: t.inventory.location,
      render: (asset: any) => <span className="text-on-surface-variant">{asset.location || '--'}</span>,
    },
    {
      header: t.common.actions,
      className: 'text-right',
      render: (asset: any) => (
        <div className="flex flex-wrap justify-end gap-sm">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${clientId}/assets/${asset.id}`)}
            className="py-1 px-3 text-xs"
          >
            {t.common.details}
          </Button>
          <Button variant="outline" onClick={() => openEditModal(asset)} className="py-1 px-3 text-xs">
            {t.common.edit}
          </Button>
          {asset.status !== 'RETIRED' && (
            <Button variant="danger" onClick={() => handleArchiveAsset(asset)} className="py-1 px-3 text-xs">
              {t.common.archive}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const renderMobileAsset = (asset: any) => (
    <div className="flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <span className="block truncate font-bold text-on-surface">{asset.name}</span>
          {asset.hostname && <span className="font-mono text-[11px] text-on-surface-variant/70">{asset.hostname}</span>}
        </div>
        <Badge variant={getAssetStatusVariant(asset.status)}>{getAssetStatusLabel(asset.status)}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-xs border-y border-outline-variant/30 py-sm text-[12px]">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Tipo</span>
          <span className="truncate text-on-surface">{getAssetTypeLabel(asset.type)}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Usuário</span>
          <span className="truncate text-on-surface">{asset.assignedClientUser?.fullName || t.common.notAssigned}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Serial</span>
          <span className="truncate font-mono text-on-surface">{asset.serialNumber || '--'}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Local</span>
          <span className="truncate text-on-surface">{asset.location || '--'}</span>
        </div>
      </div>
      <div className="flex flex-col gap-sm sm:flex-row">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/clients/${clientId}/assets/${asset.id}`)}
          className="w-full py-2"
        >
          {t.common.details}
        </Button>
        <Button variant="outline" onClick={() => openEditModal(asset)} className="w-full py-2">
          {t.common.edit}
        </Button>
      </div>
    </div>
  );

  const clientName = client?.tradeName || client?.legalName || t.clients.title;
  const breadcrumbs = [
    { label: t.clients.title, href: '/dashboard/clients' },
    { label: clientName, href: `/dashboard/clients/${clientId}` },
    { label: t.clients.tabs.inventory },
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={breadcrumbs}
        title={t.clients.pages.inventoryTitle}
        description={t.clients.pages.inventoryDescription.replace('{name}', clientName)}
        primaryActions={
          <Button variant="primary" onClick={openCreateModal}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
            {t.clients.actions.newAsset}
          </Button>
        }
        tabs={<ClientContextTabs clientId={clientId} />}
      />

      <div className="flex flex-col gap-md rounded-xl border border-outline-variant bg-surface p-md shadow-lg md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-col gap-sm sm:flex-row md:max-w-2xl">
          <Input
            type="text"
            placeholder="Buscar por nome, host, série, patrimônio ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            {t.common.searchAction}
          </Button>
        </form>

        <div className="flex flex-col gap-sm sm:flex-row">
          <Select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'Todos os tipos' }, ...assetTypes]}
            className="min-w-[170px]"
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={[{ value: '', label: 'Todos os status' }, ...assetStatuses]}
            className="min-w-[170px]"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error-container/20 bg-error-container/10 p-md text-sm text-error">
          {error}
        </div>
      )}

      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl border border-outline-variant/30 bg-surface-container-low" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <EmptyState
            title={t.clients.empty.inventory}
            description={t.states.emptyDescription}
            action={
              <Button variant="outline" onClick={openCreateModal}>
                {t.clients.actions.firstAsset}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={assetColumns}
              data={assets}
              mobileRender={renderMobileAsset}
              rowKey={(asset) => asset.id}
            />

            <div className="flex flex-col items-center justify-between gap-md border-t border-outline-variant/30 px-md pt-md sm:flex-row">
              <span className="text-[13px] text-on-surface-variant font-mono">
                Mostrando {assets.length} de {meta.total} ativos (Pág. {meta.page} de {meta.totalPages})
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-md backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-md overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-lg shadow-2xl animate-in fade-in duration-200">
            <header className="flex items-center justify-between border-b border-outline-variant/30 pb-sm">
              <h3 className="font-title-sm text-sm font-bold text-on-surface">
                {isEditing ? 'Editar Ativo' : t.clients.actions.newAsset}
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
                <div className="rounded-xl border border-error-container/20 bg-error-container/10 p-sm text-xs font-semibold text-error">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <Input label="Nome do Ativo *" required placeholder="Ex: NB-FIN-003 ou Licença Office365" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label={t.inventory.hostname} placeholder="Ex: nb-acme-financeiro" value={hostname} onChange={(e) => setHostname(e.target.value)} />
                <Select label="Tipo de Ativo *" value={assetType} onChange={(e) => setAssetType(e.target.value)} options={assetTypes} />
                <Select label="Status *" value={assetStatus} onChange={(e) => setAssetStatus(e.target.value)} options={assetStatuses} />
                <Input label="Fabricante" placeholder="Ex: Dell" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
                <Input label="Modelo" placeholder="Ex: Latitude 3420" value={model} onChange={(e) => setModel(e.target.value)} />
                <Input label="Número de Série" placeholder="Ex: 8XF8SD2" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
                <Input label="Patrimônio / Asset Tag" placeholder="Ex: ACME-0023" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} />
                <Input label="Endereço IP" placeholder="Ex: 192.168.1.50" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} />
                <Input label="Endereço MAC" placeholder="Ex: AA:BB:CC:DD:EE:FF" value={macAddress} onChange={(e) => setMacAddress(e.target.value)} />
                <Input label="Sistema Operacional" placeholder="Ex: Windows 11 Pro" value={operatingSystem} onChange={(e) => setOperatingSystem(e.target.value)} />
                <Input label="Localização / Setor" placeholder="Ex: Recepção ou Prédio A - Sala 3" value={location} onChange={(e) => setLocation(e.target.value)} />
                <Input label="ID Acesso Remoto (RustDesk/AnyDesk)" placeholder="Ex: RustDesk ID: 482 199 432" value={remoteAccessId} onChange={(e) => setRemoteAccessId(e.target.value)} />
                <Select
                  label="Atribuir a Usuário"
                  value={assignedClientUserId}
                  onChange={(e) => setAssignedClientUserId(e.target.value)}
                  options={[
                    { value: '', label: t.common.notAssigned },
                    ...clientUsers.map(u => ({ value: u.id, label: u.fullName })),
                  ]}
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="text-[12px] font-semibold text-on-surface-variant">
                  Dados Sensíveis Criptografados (Senhas, VPN, URLs de administração)
                </label>
                <textarea
                  placeholder="Credenciais de administração do switch, dados de conexão VPN ou chaves de licença confidenciais. Salvo sob criptografia AES-256-GCM real no servidor."
                  value={sensitiveDataEncrypted}
                  onChange={(e) => setSensitiveDataEncrypted(e.target.value)}
                  className="min-h-[80px] resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface outline-none transition-all duration-200 focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="text-[12px] font-semibold text-on-surface-variant">Observações Gerais</label>
                <textarea
                  placeholder="Outras especificações técnicas não sigilosas."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm text-on-surface outline-none transition-all duration-200 focus:border-primary"
                />
              </div>

              <footer className="mt-sm flex justify-end gap-sm border-t border-outline-variant/30 pt-md">
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
