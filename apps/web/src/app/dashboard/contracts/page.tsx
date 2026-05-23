'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function ContractsPage() {
  const router = useRouter();
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
      const statusParam = status ? `&status=${status}` : '';
      const typeParam = type ? `&type=${type}` : '';
      const clientParam = clientId ? `&clientId=${clientId}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await apiRequest(`/contracts?page=${page}&limit=10${statusParam}${typeParam}${clientParam}${searchParam}`);
      setContracts(response.data);
      setMeta(response.meta);

      // Fetch quota details for each unique client in the list
      const clientIds = Array.from(new Set(response.data.map((c: any) => c.clientId))) as string[];
      const quotaMap: Record<string, any> = {};
      
      await Promise.all(
        clientIds.map(async (clientId) => {
          try {
            const quotaData = await apiRequest(`/contracts-quota/client/${clientId}`);
            quotaMap[clientId] = quotaData;
          } catch (e) {
            // Ignore if quota lookup fails for some client (e.g. no active contract)
          }
        })
      );
      setQuotas(quotaMap);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar dados dos contratos.');
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
        const response = await apiRequest('/clients?limit=100');
        setClients(response.data || []);
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

  const formatCurrency = (amountCents: number) => {
    if (!hasFinancialPrivilege) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  const getStatusStyle = (contractStatus: string) => {
    switch (contractStatus) {
      case 'ACTIVE':
        return { bg: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: 'rgba(16, 185, 129, 0.2)', label: 'Ativo' };
      case 'DRAFT':
        return { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.2)', label: 'Rascunho' };
      case 'SUSPENDED':
        return { bg: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.2)', label: 'Suspenso' };
      case 'EXPIRED':
        return { bg: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'rgba(239, 68, 68, 0.2)', label: 'Expirado' };
      case 'CANCELLED':
        return { bg: 'rgba(220, 38, 38, 0.15)', color: '#ef4444', border: 'rgba(220, 38, 38, 0.25)', label: 'Cancelado' };
      case 'TERMINATED':
        return { bg: 'rgba(185, 28, 28, 0.15)', color: '#b91c1c', border: 'rgba(185, 28, 28, 0.25)', label: 'Rescindido' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: 'rgba(255, 255, 255, 0.1)', label: contractStatus };
    }
  };

  const getTypeLabel = (contractType: string) => {
    switch (contractType) {
      case 'RECURRING_SUPPORT':
        return 'Suporte Recorrente';
      case 'PROJECT':
        return 'Projeto Fechado';
      case 'ON_DEMAND':
        return 'Sob Demanda';
      case 'HYBRID':
        return 'Híbrido (Mensal + Projeto)';
      default:
        return contractType;
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.title}>Contratos de Clientes</h1>
          <p style={styles.subtitle}>Gerencie escopo, limites operacionais e recorrência financeira dos clientes.</p>
        </div>
        {hasFinancialPrivilege && (
          <Button variant="primary" onClick={() => router.push('/dashboard/contracts/new')}>
            + Novo Contrato
          </Button>
        )}
      </header>

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Buscar por título, número de contrato ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <Button type="submit" variant="secondary" style={styles.searchBtn}>
            Buscar
          </Button>
        </form>

        <div style={styles.selectGroup}>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="EXPIRED">Expirado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="TERMINATED">Rescindido</option>
          </select>

          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setPage(1);
            }}
            style={styles.filterSelect}
          >
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.tradeName}
              </option>
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
            <option value="">Todos os tipos</option>
            <option value="RECURRING_SUPPORT">Suporte Recorrente</option>
            <option value="PROJECT">Projeto</option>
            <option value="ON_DEMAND">Sob Demanda</option>
            <option value="HYBRID">Híbrido</option>
          </select>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* Table grid */}
      {loading ? (
        <div style={styles.loadingArea}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={styles.skeletonRow} />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Nenhum contrato cadastrado ou encontrado.</p>
          {hasFinancialPrivilege && (
            <Button variant="outline" onClick={() => router.push('/dashboard/contracts/new')}>
              Cadastrar primeiro contrato
            </Button>
          )}
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Número / Título</th>
                <th style={styles.th}>Cliente</th>
                <th style={styles.th}>Tipo / Status</th>
                <th style={styles.th}>Faturamento</th>
                <th style={styles.th}>Limites de Quotas (Uso/Total)</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const statusInfo = getStatusStyle(contract.status);
                const quota = quotas[contract.clientId];
                const showQuotas = ['RECURRING_SUPPORT', 'HYBRID'].includes(contract.type) && contract.status === 'ACTIVE' && quota;

                return (
                  <tr key={contract.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.contractTitleBlock}>
                        <span style={styles.contractNumber}>{contract.number}</span>
                        <span style={styles.contractTitle}>{contract.title}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.clientName}>{contract.client?.tradeName || 'Cliente'}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.typeStatusBlock}>
                        <span style={styles.typeLabel}>{getTypeLabel(contract.type)}</span>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            borderColor: statusInfo.border,
                          }}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.billingBlock}>
                        <span style={styles.monthlyAmount}>{formatCurrency(contract.monthlyAmountCents)}</span>
                        <span style={styles.billingDay}>Dia de cobrança: {contract.billingDay}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {showQuotas ? (
                        <div style={styles.quotasContainer}>
                          {contract.maxUsers !== null && (
                            <div style={styles.quotaItem}>
                              <div style={styles.quotaLabelRow}>
                                <span style={styles.quotaLabel}>Usuários</span>
                                <span style={styles.quotaPercent}>
                                  {quota.usedUsers} / {contract.maxUsers}
                                </span>
                              </div>
                              <div style={styles.progressBarBg}>
                                <div
                                  style={{
                                    ...styles.progressBarFill,
                                    width: `${Math.min(100, (quota.usedUsers / contract.maxUsers) * 100)}%`,
                                    backgroundColor: (quota.usedUsers / contract.maxUsers) >= 0.9 ? '#ef4444' : '#3b82f6',
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {contract.maxAssets !== null && (
                            <div style={styles.quotaItem}>
                              <div style={styles.quotaLabelRow}>
                                <span style={styles.quotaLabel}>Ativos</span>
                                <span style={styles.quotaPercent}>
                                  {quota.usedAssets} / {contract.maxAssets}
                                </span>
                              </div>
                              <div style={styles.progressBarBg}>
                                <div
                                  style={{
                                    ...styles.progressBarFill,
                                    width: `${Math.min(100, (quota.usedAssets / contract.maxAssets) * 100)}%`,
                                    backgroundColor: (quota.usedAssets / contract.maxAssets) >= 0.9 ? '#ef4444' : '#10b981',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={styles.noQuotasText}>Sem quotas dinâmicas</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}>
                        Ver Detalhes
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
              Mostrando {contracts.length} de {meta.total} contratos (Pág. {meta.page} de {meta.totalPages})
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
    maxWidth: '500px',
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
  selectGroup: {
    display: 'flex',
    gap: '12px',
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
  contractTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  contractNumber: {
    fontWeight: 700,
    color: '#3b82f6',
    fontSize: '13px',
  },
  contractTitle: {
    fontWeight: 600,
    color: '#f9fafb',
    fontSize: '14px',
    marginTop: '2px',
  },
  clientName: {
    fontWeight: 500,
    color: '#f9fafb',
  },
  typeStatusBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  typeLabel: {
    fontSize: '13px',
    color: '#e5e7eb',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    border: '1px solid',
    width: 'fit-content',
    display: 'inline-block',
  },
  billingBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  monthlyAmount: {
    fontWeight: 600,
    color: '#60a5fa',
    fontSize: '15px',
  },
  billingDay: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  quotasContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '180px',
  },
  quotaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  quotaLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
  },
  quotaLabel: {
    color: '#9ca3af',
  },
  quotaPercent: {
    fontWeight: 600,
    color: '#f9fafb',
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease-out',
  },
  noQuotasText: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic',
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
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonRow: {
    height: '75px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
};
