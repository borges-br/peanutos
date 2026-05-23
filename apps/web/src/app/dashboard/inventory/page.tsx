'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const router = useRouter();
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

  const fetchClients = async () => {
    try {
      const response = await apiRequest('/clients?limit=100');
      setClients(response.data || []);
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
      
      const response = await apiRequest(
        `/assets?page=${page}&limit=10${typeParam}${statusParam}${clientParam}${searchParam}`
      );
      setAssets(response.data || []);
      setMeta(response.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar dados do inventário.');
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
          <h1 style={styles.title}>Inventário Geral</h1>
          <p style={styles.subtitle}>Gerenciamento centralizado de hardware, licenças e ativos lógicos.</p>
        </div>
      </header>

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

        <div style={styles.selectsRow}>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Todos os Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.tradeName}</option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Todos os Tipos</option>
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
            <option value="">Todos os Status</option>
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
          <p style={styles.emptyText}>Nenhum equipamento cadastrado ou encontrado.</p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            Para cadastrar novos ativos, acesse a página de um cliente e vá para a aba Inventário.
          </p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Ativo / Hostname</th>
                <th style={styles.th}>Cliente</th>
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
                        <span style={styles.assetName}>{asset.name}</span>
                        {asset.hostname && <span style={styles.assetHost}>{asset.hostname}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 500 }}>{asset.client?.tradeName || 'N/A'}</span>
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
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/clients/${asset.clientId}/assets/${asset.id}`)}
                      >
                        Visualizar
                      </Button>
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
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  filtersBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    width: '100%',
  },
  searchInput: {
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  searchBtn: {
    padding: '10px 24px',
    fontSize: '14px',
  },
  selectsRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    flexWrap: 'wrap',
  },
  filterSelect: {
    flexGrow: 1,
    minWidth: '150px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 16px',
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
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    minWidth: '900px',
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  th: {
    padding: '16px 20px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#d1d5db',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'all 0.2s',
  },
  td: {
    padding: '16px 20px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  assetNameArea: {
    display: 'flex',
    flexDirection: 'column',
  },
  assetName: {
    fontWeight: 600,
    color: '#f9fafb',
  },
  assetHost: {
    fontSize: '12px',
    color: '#3b82f6',
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
    gap: '8px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '16px',
    fontWeight: 600,
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
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
};
