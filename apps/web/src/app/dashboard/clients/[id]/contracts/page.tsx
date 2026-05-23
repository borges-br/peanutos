'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';

export default function ClientContractsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string }; // Client ID
  const { user } = useAuth();

  const [contracts, setContracts] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, contractsData] = await Promise.all([
          apiRequest(`/clients/${id}`),
          apiRequest(`/contracts?clientId=${id}&limit=50`)
        ]);
        setClient(clientData);
        setContracts(contractsData.data || []);
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar contratos do cliente.');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id, user]);

  const formatCurrency = (amountCents: number) => {
    if (!hasFinancialPrivilege) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  const getStatusBadgeStyle = (contractStatus: string) => {
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
        return 'Híbrido';
      default:
        return contractType;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ marginTop: '12px', color: '#9ca3af' }}>Carregando contratos do cliente...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div style={styles.container}>
        <div style={styles.errorAlert}>{error || 'Cliente não encontrado.'}</div>
        <Button variant="outline" onClick={() => router.push('/dashboard/clients')}>
          Voltar para Clientes
        </Button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.title}>Contratos — {client.tradeName}</h1>
          <p style={styles.subtitle}>Listagem de contratos e acordos de níveis de serviço vigentes para {client.legalName}.</p>
        </div>
        <div style={styles.headerActions}>
          <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${id}`)}>
            Voltar ao Cadastro
          </Button>
          {hasFinancialPrivilege && (
            <Button variant="primary" onClick={() => router.push(`/dashboard/contracts/new?clientId=${id}`)}>
              + Novo Contrato
            </Button>
          )}
        </div>
      </header>

      {contracts.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Este cliente não possui nenhum contrato ativo ou registrado.</p>
          {hasFinancialPrivilege && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/new?clientId=${id}`)}>
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
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Início</th>
                <th style={styles.th}>Vencimento</th>
                <th style={styles.th}>Mensalidade</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const statusInfo = getStatusBadgeStyle(contract.status);

                return (
                  <tr key={contract.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.contractTitleBlock}>
                        <span style={styles.contractNumber}>{contract.number}</span>
                        <span style={styles.contractTitle}>{contract.title}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.typeLabel}>{getTypeLabel(contract.type)}</span>
                    </td>
                    <td style={styles.td}>
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
                    </td>
                    <td style={styles.td}>
                      {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={styles.td}>
                      {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado'}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.monthlyAmount}>{formatCurrency(contract.monthlyAmountCents)}</span>
                    </td>
                    <td style={styles.td}>
                      <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}>
                        Gerenciar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    fontSize: '24px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
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
    display: 'inline-block',
  },
  monthlyAmount: {
    fontWeight: 600,
    color: '#60a5fa',
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
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
