'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';

export default function FinancialsOverviewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security Verification
  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && !hasFinancialPrivilege) {
      router.push('/dashboard');
    }
  }, [user, authLoading, hasFinancialPrivilege, router]);

  const fetchFinancialMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/financials/mrr');
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar métricas financeiras. Verifique suas permissões de acesso.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFinancialPrivilege) {
      fetchFinancialMetrics();
    }
  }, [hasFinancialPrivilege]);

  const formatCurrency = (amountCents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  if (authLoading || loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ marginTop: '12px', color: '#9ca3af' }}>Carregando dados financeiros...</p>
      </div>
    );
  }

  if (!hasFinancialPrivilege) {
    return null;
  }

  if (error || !metrics) {
    return (
      <div style={styles.container}>
        <div style={styles.errorAlert}>{error || 'Falha ao buscar dados.'}</div>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Voltar para Painel Principal
        </Button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.title}>Painel Financeiro</h1>
          <p style={styles.subtitle}>Visão geral sobre Receita Recorrente Mensal (MRR) e agenda de faturamento.</p>
        </div>
      </header>

      {/* Main MRR highlight card */}
      <div style={styles.mrrHighlightCard}>
        <div style={styles.mrrLeft}>
          <span style={styles.mrrLabel}>Receita Recorrente Mensal (MRR)</span>
          <h2 style={styles.mrrValue}>{formatCurrency(metrics.totalMrrCents)}</h2>
          <p style={styles.mrrSubText}>Soma de todos os contratos recorrentes ativos no workspace.</p>
        </div>
        <div style={styles.mrrRight}>
          <div style={styles.badgeLabel}>Faturamento Recorrente</div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Contratos Ativos</span>
          <span style={styles.kpiValue}>{metrics.activeContracts}</span>
          <span style={styles.kpiSubText}>Vigência recorrente principal</span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Ticket Médio por Contrato</span>
          <span style={{ ...styles.kpiValue, color: '#60a5fa', fontSize: '24px', fontWeight: 800 }}>
            {formatCurrency(metrics.averageContractValueCents)}
          </span>
          <span style={styles.kpiSubText}>Valor médio por cliente ativo</span>
        </div>

        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>Próximo Vencimento Estimado</span>
          <span style={{ ...styles.kpiValue, fontSize: '18px', fontWeight: 700, color: '#f59e0b' }}>
            Dia 10/mês
          </span>
          <span style={styles.kpiSubText}>Agrupamento padrão</span>
        </div>
      </div>

      {/* Secondary split: Contracts status chart vs Billing events schedule */}
      <div style={styles.splitSection}>
        {/* Left Card: Events schedule */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>Agenda de Eventos de Faturamento Pendentes</h3>
          {metrics.nextBillingEvents?.length === 0 ? (
            <p style={styles.emptyText}>Nenhum evento de faturamento pendente encontrado.</p>
          ) : (
            <div style={styles.eventsTableWrapper}>
              <table style={styles.eventsTable}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Data Planejada</th>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>Contrato</th>
                    <th style={styles.th}>Moeda / Valor</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.nextBillingEvents.map((evt: any) => (
                    <tr key={evt.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 600 }}>
                        {new Date(evt.scheduledFor).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={styles.td}>{evt.client?.tradeName}</td>
                      <td style={styles.td}>{evt.contract?.number}</td>
                      <td style={{ ...styles.td, color: '#34d399', fontWeight: 600 }}>
                        {formatCurrency(evt.amountCents)}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.pendingBadge}>{evt.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Card: Status Distribution */}
        <div style={styles.statusCard}>
          <h3 style={styles.sectionTitle}>Contratos por Status</h3>
          <div style={styles.statusList}>
            {Object.keys(metrics.contractsByStatus).length === 0 ? (
              <p style={styles.emptyText}>Sem dados de distribuição.</p>
            ) : (
              Object.entries(metrics.contractsByStatus).map(([statusName, count]: any) => (
                <div key={statusName} style={styles.statusRow}>
                  <span style={styles.statusLabel}>{statusName}</span>
                  <div style={styles.progressBarWrapper}>
                    <div
                      style={{
                        ...styles.statusProgressFill,
                        width: `${Math.min(100, (count / Math.max(1, metrics.activeContracts)) * 100)}%`,
                        backgroundColor: statusName === 'ACTIVE' ? '#10b981' : statusName === 'SUSPENDED' ? '#f59e0b' : '#6b7280',
                      }}
                    />
                  </div>
                  <span style={styles.statusCount}>{count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
  mrrHighlightCard: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    borderRadius: '16px',
    padding: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
  },
  mrrLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  mrrLabel: {
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: '#60a5fa',
    letterSpacing: '1px',
  },
  mrrValue: {
    fontSize: '40px',
    fontWeight: 950,
    color: '#fff',
    letterSpacing: '-1px',
  },
  mrrSubText: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  mrrRight: {},
  badgeLabel: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#60a5fa',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
  },
  kpiCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#f9fafb',
  },
  kpiSubText: {
    fontSize: '12px',
    color: '#6b7280',
  },
  splitSection: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '24px',
  },
  sectionCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statusCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#d1d5db',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '8px',
  },
  eventsTableWrapper: {
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  eventsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#9ca3af',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
  },
  pendingBadge: {
    fontSize: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#fbbf24',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(245, 158, 11, 0.15)',
    fontWeight: 600,
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  statusLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#d1d5db',
    width: '90px',
  },
  progressBarWrapper: {
    flexGrow: 1,
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  statusProgressFill: {
    height: '100%',
    borderRadius: '4px',
  },
  statusCount: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    width: '20px',
    textAlign: 'right',
  },
  emptyText: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(59, 130, 246, 0.1)',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
};
