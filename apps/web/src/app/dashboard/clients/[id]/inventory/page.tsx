'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { Button } from '@peanut/ui';
import { useParams, useRouter } from 'next/navigation';
import ClientContextTabs from '../../../../../components/layout/ClientContextTabs';

export default function ClientInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  
  // Search & filters
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  // Form fields
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
    setSensitiveDataEncrypted(''); // Never populate sensitives in standard editing form!
    setNotes(asset.notes || '');
    setAssignedClientUserId(asset.assignedClientUserId || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    // Validation
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
    { value: 'OPERATIONAL', label: 'Operacional', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { value: 'MAINTENANCE', label: 'Em Manutenção', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { value: 'OUT_OF_STANDARD', label: 'Fora de Padrão', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { value: 'STOCK', label: 'Em Estoque', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { value: 'IN_STOCK', label: 'Em Estoque (Novo)', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
    { value: 'RETIRED', label: 'Aposentado', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
    { value: 'SCRAPPED', label: 'Sucateado', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
    { value: 'LOST', label: 'Extraviado', color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)' },
    { value: 'PENDING_VALIDATION', label: 'Pendente Homologação', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { value: 'PENDING_REVIEW', label: 'Em Revisão', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.1)' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <div style={styles.breadcrumbs}>
            <span onClick={() => router.push('/dashboard/clients')} style={styles.breadcrumbLink}>Clientes</span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} style={styles.breadcrumbLink}>
              {client?.tradeName || 'Detalhes'}
            </span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span style={{ color: '#9ca3af' }}>Inventário</span>
          </div>
          <h1 style={styles.title}>Inventário do Cliente</h1>
          <p style={styles.subtitle}>
            Gerencie e organize a estrutura de hardware, ativos lógicos e licenças para <strong>{client?.tradeName || '...'}</strong>.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          + Novo Ativo
        </Button>
      </header>

      {/* Navigation tabs */}
      <div className="mb-lg select-text select-none">
        <ClientContextTabs clientId={clientId} />
      </div>

      {/* Filters & Search */}
      <div style={styles.filtersBar}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Buscar por nome, host, série, patrimônio ou local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <Button type="submit" variant="secondary" style={styles.searchBtn}>
            Buscar
          </Button>
        </form>

        <div style={styles.filtersSelects}>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Todos os tipos</option>
            {assetTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Todos os status</option>
            {assetStatuses.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={styles.loadingArea}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.skeletonRow} />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Nenhum equipamento ou licença cadastrado ou encontrado para este cliente.</p>
          <Button variant="outline" onClick={openCreateModal}>
            Cadastrar primeiro ativo
          </Button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Ativo / Hostname</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Usuário Vinculado</th>
                <th style={styles.th}>Nº Série / Tag</th>
                <th style={styles.th}>Localização</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const typeObj = assetTypes.find(t => t.value === asset.type);
                const statusObj = assetStatuses.find(s => s.value === asset.status);

                return (
                  <tr key={asset.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.assetNameArea}>
                        <span
                          onClick={() => router.push(`/dashboard/clients/${clientId}/assets/${asset.id}`)}
                          style={styles.assetLink}
                        >
                          {asset.name}
                        </span>
                        {asset.hostname && <span style={styles.assetHost}>{asset.hostname}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>{typeObj?.label || asset.type}</span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusObj?.bg || 'rgba(255, 255, 255, 0.05)',
                          color: statusObj?.color || '#f9fafb',
                          borderColor: statusObj?.bg || 'transparent',
                        }}
                      >
                        {statusObj?.label || asset.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {asset.assignedClientUser ? (
                        <span style={styles.assignedUser}>{asset.assignedClientUser.fullName}</span>
                      ) : (
                        <span style={styles.unassignedUser}>Não atribuído</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.serialTagArea}>
                        {asset.serialNumber ? (
                          <span style={styles.serial}>{asset.serialNumber}</span>
                        ) : (
                          <span style={styles.emptyTextField}>Sem serial</span>
                        )}
                        {asset.assetTag && <span style={styles.tag}>{asset.assetTag}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: '#9ca3af' }}>{asset.location || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/dashboard/clients/${clientId}/assets/${asset.id}`)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openEditModal(asset)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Editar
                        </Button>
                        {asset.status !== 'RETIRED' && (
                          <Button
                            variant="outline"
                            onClick={() => handleArchiveAsset(asset)}
                            style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
                          >
                            Arquivar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Mostrando {assets.length} de {meta.total} ativos (Pág. {meta.page} de {meta.totalPages})
            </span>
            <div style={styles.paginationBtns}>
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={styles.pageBtn}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={styles.pageBtn}
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Creating / Editing Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {isEditing ? 'Editar Ativo' : 'Novo Ativo'}
              </h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              {formError && <div style={styles.errorAlert}>{formError}</div>}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome do Ativo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NB-FIN-003 ou Licença Office365"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Hostname</label>
                  <input
                    type="text"
                    placeholder="Ex: nb-acme-financeiro"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tipo de Ativo *</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    style={styles.select}
                  >
                    {assetTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status *</label>
                  <select
                    value={assetStatus}
                    onChange={(e) => setAssetStatus(e.target.value)}
                    style={styles.select}
                  >
                    {assetStatuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fabricante</label>
                  <input
                    type="text"
                    placeholder="Ex: Dell"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Modelo</label>
                  <input
                    type="text"
                    placeholder="Ex: Latitude 3420"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Número de Série</label>
                  <input
                    type="text"
                    placeholder="Ex: 8XF8SD2"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Patrimônio / Asset Tag</label>
                  <input
                    type="text"
                    placeholder="Ex: ACME-0023"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Endereço IP</label>
                  <input
                    type="text"
                    placeholder="Ex: 192.168.1.50"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Endereço MAC</label>
                  <input
                    type="text"
                    placeholder="Ex: AA:BB:CC:DD:EE:FF"
                    value={macAddress}
                    onChange={(e) => setMacAddress(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Sistema Operacional</label>
                  <input
                    type="text"
                    placeholder="Ex: Windows 11 Pro"
                    value={operatingSystem}
                    onChange={(e) => setOperatingSystem(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Localização / Setor</label>
                  <input
                    type="text"
                    placeholder="Ex: Recepção ou Prédio A - Sala 3"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ID Acesso Remoto (RustDesk/AnyDesk)</label>
                  <input
                    type="text"
                    placeholder="Ex: RustDesk ID: 482 199 432"
                    value={remoteAccessId}
                    onChange={(e) => setRemoteAccessId(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Atribuir a Usuário Final</label>
                  <select
                    value={assignedClientUserId}
                    onChange={(e) => setAssignedClientUserId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Não atribuído</option>
                    {clientUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Dados Sensíveis Criptografados (Senhas, VPN, URLs de administração)
                </label>
                <textarea
                  placeholder="Credenciais de administração do switch, dados de conexão VPN ou chaves de licença confidenciais. Salvo sob criptografia AES-256-GCM real no servidor."
                  value={sensitiveDataEncrypted}
                  onChange={(e) => setSensitiveDataEncrypted(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Observações Gerais</label>
                <textarea
                  placeholder="Outras especificações técnicas não sigilosas."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalActions}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  breadcrumbs: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '4px',
  },
  breadcrumbLink: {
    cursor: 'pointer',
    color: '#3b82f6',
    transition: 'color 0.2s',
    fontWeight: 500,
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  tabsRow: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '2px',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#9ca3af',
    cursor: 'pointer',
    borderRadius: '6px 6px 0 0',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderBottom: '2px solid #3b82f6',
    fontWeight: 600,
  },
  filtersBar: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    flexGrow: 1,
    maxWidth: '600px',
  },
  searchInput: {
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 16px',
    fontSize: '14px',
  },
  filtersSelects: {
    display: 'flex',
    gap: '8px',
  },
  filterSelect: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  th: {
    padding: '16px 24px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#d1d5db',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'all 0.2s',
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  assetNameArea: {
    display: 'flex',
    flexDirection: 'column',
  },
  assetLink: {
    fontWeight: 600,
    color: '#3b82f6',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  assetHost: {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  typeBadge: {
    fontSize: '12px',
    color: '#9ca3af',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
    display: 'inline-block',
  },
  assignedUser: {
    fontWeight: 500,
    color: '#f3f4f6',
  },
  unassignedUser: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  serialTagArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  serial: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#f3f4f6',
  },
  tag: {
    fontSize: '11px',
    color: '#9ca3af',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '1px 4px',
    borderRadius: '2px',
    width: 'fit-content',
  },
  emptyTextField: {
    fontSize: '12px',
    color: '#6b7280',
  },
  actionBtns: {
    display: 'flex',
    gap: '8px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  paginationBtns: {
    display: 'flex',
    gap: '8px',
  },
  pageBtn: {
    padding: '6px 12px',
    fontSize: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    gap: '16px',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '15px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonRow: {
    height: '60px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    padding: '32px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f9fafb',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '28px',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1,
    width: '50%',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#d1d5db',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  select: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
};
