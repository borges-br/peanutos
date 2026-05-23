'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter, useParams } from 'next/navigation';

export default function ClientTicketsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [client, setClient] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    async function loadClient() {
      try {
        const data = await apiRequest(`/clients/${clientId}`);
        setClient(data);
      } catch (err) {
        console.warn('Erro ao carregar dados do cliente:', err);
      }
    }
    loadClient();
  }, [clientId]);

  const fetchClientTickets = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const qParams = new URLSearchParams();
      qParams.append('page', String(page));
      qParams.append('limit', '10');
      if (search) qParams.append('search', search);
      if (status) qParams.append('status', status);
      if (priority) qParams.append('priority', priority);

      const response = await apiRequest(`/clients/${clientId}/tickets?${qParams.toString()}`);
      setTickets(response.items || []);
      setMeta({
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        total: response.total || 0,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamados do cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientTickets();
  }, [clientId, page, status, priority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClientTickets();
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return { backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#ef4444', borderColor: 'rgba(220, 38, 38, 0.3)' };
      case 'URGENT': return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' };
      case 'HIGH': return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.2)' };
      case 'MEDIUM': return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)' };
      default: return { backgroundColor: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', borderColor: 'rgba(156, 163, 175, 0.2)' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aberto';
      case 'TRIAGE': return 'Triagem';
      case 'IN_PROGRESS': return 'Em Atendimento';
      case 'WAITING_CLIENT': return 'Aguardando Cliente';
      case 'WAITING_THIRD_PARTY': return 'Aguardando Terceiros';
      case 'RESOLVED': return 'Resolvido';
      case 'CLOSED': return 'Fechado';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.2)' };
      case 'OPEN':
      case 'TRIAGE':
        return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)' };
      case 'IN_PROGRESS':
        return { backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.2)' };
      case 'WAITING_CLIENT':
      case 'WAITING_THIRD_PARTY':
        return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.2)' };
      default:
        return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' };
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}`)}>
          &larr; Voltar ao Cliente
        </Button>
        <div style={styles.titleArea}>
          <h1 style={styles.title}>Chamados de {client?.tradeName || client?.legalName || 'Carregando...'}</h1>
          <p style={styles.subtitle}>Consulte a lista de chamados associados a este cliente.</p>
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/tickets/new')}>
          + Novo Chamado
        </Button>
      </header>

      {/* Filters & Search */}
      <div style={styles.filtersBar}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Buscar por número, título, descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <Button type="submit" variant="secondary" style={styles.searchBtn}>
            Buscar
          </Button>
        </form>

        <div style={styles.selectors}>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={styles.filterSelect}
          >
            <option value="">Todos os status</option>
            <option value="OPEN">Aberto</option>
            <option value="TRIAGE">Triagem</option>
            <option value="IN_PROGRESS">Em Atendimento</option>
            <option value="WAITING_CLIENT">Aguardando Cliente</option>
            <option value="WAITING_THIRD_PARTY">Aguardando Terceiros</option>
            <option value="RESOLVED">Resolvido</option>
            <option value="CLOSED">Fechado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>

          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            style={styles.filterSelect}
          >
            <option value="">Todas prioridades</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* Grid Table */}
      {loading ? (
        <div style={styles.loadingArea}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={styles.skeletonRow} />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Nenhum chamado encontrado para este cliente.</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/tickets/new')}>
            Registrar primeiro chamado
          </Button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Número / Título</th>
                <th style={styles.th}>Ativo</th>
                <th style={styles.th}>Prioridade</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Técnico</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={styles.ticketTitleArea}>
                      <span style={styles.ticketNumber}>{ticket.number}</span>
                      <span style={styles.ticketTitle}>{ticket.title}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.assetName}>
                      {ticket.asset ? `${ticket.asset.name} (${ticket.asset.type})` : '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...getPriorityStyle(ticket.priority) }}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...getStatusStyle(ticket.status) }}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.techName}>{ticket.assignedTo?.name || '-'}</span>
                  </td>
                  <td style={styles.td}>
                    <Button variant="outline" onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}>
                      Gerenciar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Mostrando {tickets.length} de {meta.total} chamados (Pág. {meta.page} de {meta.totalPages})
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
    alignItems: 'center',
    gap: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '24px',
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: '13px',
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
  selectors: {
    display: 'flex',
    gap: '12px',
  },
  filterSelect: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
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
  ticketTitleArea: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '300px',
  },
  ticketNumber: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  ticketTitle: {
    fontWeight: 600,
    color: '#f9fafb',
    marginTop: '2px',
  },
  assetName: {
    fontSize: '13px',
    color: '#e5e7eb',
  },
  techName: {
    fontSize: '13px',
    color: '#d1d5db',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
    display: 'inline-block',
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
    padding: '60px 24px',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    gap: '16px',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '14px',
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
  },
};
