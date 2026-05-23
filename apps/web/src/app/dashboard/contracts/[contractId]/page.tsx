'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';

export default function ContractDetailPage() {
  const router = useRouter();
  const { contractId } = useParams() as { contractId: string };
  const { user } = useAuth();

  // State
  const [contract, setContract] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [billingEvents, setBillingEvents] = useState<any[]>([]);
  const [quotaDetails, setQuotaDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Line Item Form Modal States
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [itemType, setItemType] = useState('SERVICE');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitPriceCents, setItemUnitPriceCents] = useState('0');
  const [itemRecurring, setItemRecurring] = useState(true);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemLoading, setItemLoading] = useState(false);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchContractDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const contractData = await apiRequest(`/contracts/${contractId}`);
      setContract(contractData);

      // Fetch quota utilization details
      try {
        const qData = await apiRequest(`/contracts-quota/client/${contractData.clientId}`);
        setQuotaDetails(qData);
      } catch (err) {
        // Safe bypass if not recurring
      }

      // Fetch billing events associated with this contract if role permits
      if (hasFinancialPrivilege) {
        try {
          const eventsData = await apiRequest(`/financials/billing-schedule?contractId=${contractId}`);
          setBillingEvents(eventsData.data || []);
        } catch (e) {
          // Safe bypass
        }

        try {
          const historyData = await apiRequest(`/contracts/${contractId}/history`);
          setHistory(historyData || []);
        } catch (e) {
          // Safe bypass
        }
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar dados do contrato.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractId) {
      fetchContractDetails();
    }
  }, [contractId, user]);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Tem certeza de que deseja alterar o status deste contrato para "${newStatus}"?`)) return;
    try {
      await apiRequest(`/contracts/${contractId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchContractDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status.');
    }
  };

  // --- CRUD LINE ITEMS ---

  const handleOpenItemForm = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setItemDescription(item.description);
      setItemType(item.itemType);
      setItemQuantity(String(item.quantity));
      setItemUnitPriceCents(String(item.unitPriceCents));
      setItemRecurring(item.recurring);
    } else {
      setItemDescription('');
      setItemType('SERVICE');
      setItemQuantity('1');
      setItemUnitPriceCents('0');
      setItemRecurring(true);
    }
    setItemError(null);
    setShowItemForm(true);
  };

  const handleSaveLineItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemLoading(true);
    setItemError(null);

    try {
      if (!itemDescription) throw new Error('A descrição do item é obrigatória.');
      const q = parseFloat(itemQuantity);
      if (isNaN(q) || q <= 0) throw new Error('A quantidade deve ser um número positivo.');
      const p = parseInt(itemUnitPriceCents);
      if (isNaN(p) || p < 0) throw new Error('O valor unitário em centavos deve ser maior ou igual a zero.');

      const payload = {
        description: itemDescription,
        itemType,
        quantity: q,
        unitPriceCents: p,
        recurring: itemRecurring,
      };

      if (editingItem) {
        await apiRequest(`/contracts/${contractId}/line-items/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/contracts/${contractId}/line-items`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowItemForm(false);
      await fetchContractDetails();
    } catch (err: any) {
      setItemError(err.message || 'Erro ao salvar item.');
    } finally {
      setItemLoading(false);
    }
  };

  const handleDeleteLineItem = async (itemId: string) => {
    if (!confirm('Deseja realmente remover este item de serviço do contrato?')) return;
    try {
      await apiRequest(`/contracts/${contractId}/line-items/${itemId}`, {
        method: 'DELETE',
      });
      await fetchContractDetails();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar item.');
    }
  };

  // --- RENDERING HELPERS ---

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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ marginTop: '12px', color: '#9ca3af' }}>Carregando dados do contrato...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={styles.container}>
        <div style={styles.errorAlert}>{error || 'Contrato não encontrado.'}</div>
        <Button variant="outline" onClick={() => router.push('/dashboard/contracts')}>
          Voltar para Contratos
        </Button>
      </div>
    );
  }

  const badgeStyle = getStatusBadgeStyle(contract.status);

  return (
    <div style={styles.container}>
      {/* Header Block */}
      <header style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.numberRow}>
            <span style={styles.contractNum}>{contract.number}</span>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.color,
                borderColor: badgeStyle.border,
              }}
            >
              {badgeStyle.label}
            </span>
          </div>
          <h1 style={styles.title}>{contract.title}</h1>
          <p style={styles.subtitle}>Cliente: {contract.client?.tradeName}</p>
        </div>

        {hasFinancialPrivilege && (
          <div style={styles.statusActions}>
            {contract.status !== 'ACTIVE' && (
              <Button variant="primary" onClick={() => handleStatusChange('ACTIVE')}>
                Ativar Contrato
              </Button>
            )}
            {contract.status === 'ACTIVE' && (
              <Button variant="secondary" onClick={() => handleStatusChange('SUSPENDED')}>
                Suspender
              </Button>
            )}
            {['ACTIVE', 'SUSPENDED', 'DRAFT'].includes(contract.status) && (
              <Button variant="outline" onClick={() => handleStatusChange('CANCELLED')} style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                Cancelar
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Main Grid: Info Cards vs Quotas */}
      <div style={styles.mainGrid}>
        {/* Left Column: Details Cards */}
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Vigência e Informações de Cobrança</h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoField}>
                <span style={styles.infoLabel}>Valor Mensal Total</span>
                <span style={styles.monthlyValueText}>{formatCurrency(contract.monthlyAmountCents)}</span>
              </div>
              <div style={styles.infoField}>
                <span style={styles.infoLabel}>Dia de Vencimento</span>
                <span style={styles.infoValue}>Todo dia {contract.billingDay}</span>
              </div>
              <div style={styles.infoField}>
                <span style={styles.infoLabel}>Data de Início</span>
                <span style={styles.infoValue}>{new Date(contract.startDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={styles.infoField}>
                <span style={styles.infoLabel}>Data de Término</span>
                <span style={styles.infoValue}>
                  {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado'}
                </span>
              </div>
              <div style={styles.infoField}>
                <span style={styles.infoLabel}>Renovação</span>
                <span style={styles.infoValue}>{contract.renewalMode === 'MONTHLY' ? 'Mensal Automática' : contract.renewalMode}</span>
              </div>
              <div style={styles.infoField}>
                <span style={styles.infoLabel}>SLA Ativa Vinculada</span>
                <span style={styles.infoValue}>{contract.slaPolicy?.name || 'SLA Padrão do Workspace'}</span>
              </div>
            </div>

            {contract.description && (
              <div style={styles.notesBlock}>
                <span style={styles.infoLabel}>Descrição do Escopo</span>
                <p style={styles.notesText}>{contract.description}</p>
              </div>
            )}

            {contract.notes && (
              <div style={styles.notesBlock}>
                <span style={styles.infoLabel}>Observações Adicionais</span>
                <p style={styles.notesText}>{contract.notes}</p>
              </div>
            )}
          </div>

          {/* Line Items CRUD Section */}
          <div style={styles.card}>
            <div style={styles.cardHeaderWithBtn}>
              <h3 style={styles.cardTitle}>Itens de Serviço e Licenciamento</h3>
              {hasFinancialPrivilege && (
                <Button variant="outline" onClick={() => handleOpenItemForm()}>
                  + Adicionar Item
                </Button>
              )}
            </div>

            {contract.lineItems?.length === 0 ? (
              <p style={styles.emptyCardText}>Nenhum item de cobrança detalhado cadastrado.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.subTable}>
                  <thead>
                    <tr style={styles.subThRow}>
                      <th style={styles.subTh}>Descrição</th>
                      <th style={styles.subTh}>Tipo</th>
                      <th style={styles.subTh}>Quant.</th>
                      <th style={styles.subTh}>Unitário</th>
                      <th style={styles.subTh}>Total</th>
                      {hasFinancialPrivilege && <th style={styles.subTh}>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {contract.lineItems?.map((item: any) => (
                      <tr key={item.id} style={styles.subTr}>
                        <td style={styles.subTd}>{item.description}</td>
                        <td style={styles.subTd}>{item.itemType}</td>
                        <td style={styles.subTd}>{Number(item.quantity)}</td>
                        <td style={styles.subTd}>{formatCurrency(item.unitPriceCents)}</td>
                        <td style={{ ...styles.subTd, fontWeight: 600, color: '#3b82f6' }}>
                          {formatCurrency(item.totalPriceCents)}
                        </td>
                        {hasFinancialPrivilege && (
                          <td style={styles.subTd}>
                            <div style={styles.rowBtns}>
                              <button style={styles.editBtn} onClick={() => handleOpenItemForm(item)}>
                                Editar
                              </button>
                              <button style={styles.deleteBtn} onClick={() => handleDeleteLineItem(item.id)}>
                                Excluir
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quotas Progress & History Logs */}
        <div style={styles.rightCol}>
          {/* Quotas Card */}
          {quotaDetails ? (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Consumo das Quotas Ativas</h3>
              <div style={styles.quotasGrid}>
                {contract.maxUsers !== null && (
                  <div style={styles.progressItem}>
                    <div style={styles.progressLabelRow}>
                      <span style={styles.progressLabel}>Usuários Finais Ativos</span>
                      <span style={styles.progressValues}>
                        {quotaDetails.usedUsers} / {contract.maxUsers}
                      </span>
                    </div>
                    <div style={styles.barBg}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.min(100, (quotaDetails.usedUsers / contract.maxUsers) * 100)}%`,
                          backgroundColor: (quotaDetails.usedUsers / contract.maxUsers) >= 0.9 ? '#ef4444' : '#3b82f6',
                        }}
                      />
                    </div>
                  </div>
                )}

                {contract.maxAssets !== null && (
                  <div style={styles.progressItem}>
                    <div style={styles.progressLabelRow}>
                      <span style={styles.progressLabel}>Equipamentos/Ativos</span>
                      <span style={styles.progressValues}>
                        {quotaDetails.usedAssets} / {contract.maxAssets}
                      </span>
                    </div>
                    <div style={styles.barBg}>
                      <div
                        style={{
                          ...styles.barFill,
                          width: `${Math.min(100, (quotaDetails.usedAssets / contract.maxAssets) * 100)}%`,
                          backgroundColor: (quotaDetails.usedAssets / contract.maxAssets) >= 0.9 ? '#ef4444' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Consumo das Quotas</h3>
              <p style={styles.noQuotasText}>Quotas e limites operacionais não se aplicam a este tipo de contrato.</p>
            </div>
          )}

          {/* Billing Events Scheduled Agenda */}
          {hasFinancialPrivilege && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Próximas Cobranças Agendadas</h3>
              {billingEvents.length === 0 ? (
                <p style={styles.emptyCardText}>Nenhuma cobrança pendente gerada pelo worker.</p>
              ) : (
                <div style={styles.eventsStream}>
                  {billingEvents.map((evt) => (
                    <div key={evt.id} style={styles.eventItem}>
                      <div style={styles.eventDot} />
                      <div style={styles.eventBody}>
                        <div style={styles.eventHeader}>
                          <span style={styles.eventDate}>
                            {new Date(evt.scheduledFor).toLocaleDateString('pt-BR')}
                          </span>
                          <span style={styles.eventStatusBadge}>{evt.status}</span>
                        </div>
                        <span style={styles.eventAmount}>{formatCurrency(evt.amountCents)}</span>
                        <p style={styles.eventDesc}>{evt.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contract History Audit Timeline */}
          {hasFinancialPrivilege && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Histórico de Alterações</h3>
              {history.length === 0 ? (
                <p style={styles.emptyCardText}>Nenhuma alteração registrada neste contrato.</p>
              ) : (
                <div style={styles.timelineStream}>
                  {history.map((log) => (
                    <div key={log.id} style={styles.timelineItem}>
                      <span style={styles.timelineDate}>
                        {new Date(log.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span style={styles.timelineActor}>por: {log.actorUser?.name || 'Sistema'}</span>
                      <p style={styles.timelineDesc}>{log.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* --- ADD/EDIT LINE ITEM FORM MODAL DIALOG --- */}
      {showItemForm && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{editingItem ? 'Editar Item de Serviço' : 'Novo Item de Serviço'}</h3>
            {itemError && <div style={styles.itemError}>{itemError}</div>}
            
            <form onSubmit={handleSaveLineItem} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Descrição do Serviço *</label>
                <input
                  type="text"
                  placeholder="Ex: Licença Microsoft 365 Business Standard"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  style={styles.modalInput}
                  required
                />
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Tipo do Item</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    style={styles.modalSelect}
                  >
                    <option value="SERVICE">Serviço Técnico</option>
                    <option value="LICENSE">Licença de Software</option>
                    <option value="SUPPORT">Suporte Operacional</option>
                    <option value="MONITORING">Monitoramento Ativo</option>
                    <option value="BACKUP">Backup Cloud</option>
                    <option value="STORAGE">Armazenamento Cloud</option>
                    <option value="OTHER">Outros</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    style={styles.modalInput}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Valor Unitário (em centavos) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 1500 para R$ 15,00"
                    value={itemUnitPriceCents}
                    onChange={(e) => setItemUnitPriceCents(e.target.value)}
                    style={styles.modalInput}
                    required
                  />
                </div>

                <div style={{ ...styles.formGroup, justifyContent: 'center', display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                  <input
                    type="checkbox"
                    checked={itemRecurring}
                    onChange={(e) => setItemRecurring(e.target.checked)}
                    id="chk-recurring"
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <label htmlFor="chk-recurring" style={{ ...styles.formLabel, cursor: 'pointer', marginBottom: 0 }}>Item Recorrente</label>
                </div>
              </div>

              <div style={styles.modalActions}>
                <Button variant="outline" type="button" onClick={() => setShowItemForm(false)} disabled={itemLoading}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={itemLoading}>
                  {itemLoading ? 'Salvando...' : 'Salvar Item'}
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
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '20px',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  numberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  contractNum: {
    fontWeight: 800,
    color: '#3b82f6',
    fontSize: '15px',
    letterSpacing: '0.5px',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid',
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  statusActions: {
    display: 'flex',
    gap: '8px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '24px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardHeaderWithBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  infoField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#f9fafb',
  },
  monthlyValueText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#60a5fa',
  },
  notesBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    paddingTop: '12px',
  },
  notesText: {
    fontSize: '13px',
    color: '#d1d5db',
    lineHeight: 1.5,
  },
  emptyCardText: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  noQuotasText: {
    fontSize: '13px',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  tableWrapper: {
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  subThRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  subTh: {
    padding: '10px 14px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#9ca3af',
  },
  subTr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  subTd: {
    padding: '10px 14px',
    fontSize: '13px',
  },
  rowBtns: {
    display: 'flex',
    gap: '12px',
  },
  editBtn: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    outline: 'none',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    outline: 'none',
  },
  quotasGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  progressItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  progressLabel: {
    color: '#d1d5db',
  },
  progressValues: {
    fontWeight: 700,
    color: '#f9fafb',
  },
  barBg: {
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.4s ease-out',
  },
  timelineStream: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  timelineItem: {
    borderLeft: '1px solid rgba(59, 130, 246, 0.3)',
    paddingLeft: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timelineDate: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  timelineActor: {
    fontSize: '10px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  timelineDesc: {
    fontSize: '12px',
    color: '#e5e7eb',
    marginTop: '2px',
  },
  eventsStream: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  eventItem: {
    display: 'flex',
    gap: '12px',
  },
  eventDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    marginTop: '6px',
    flexShrink: 0,
  },
  eventBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexGrow: 1,
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventDate: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
  },
  eventStatusBadge: {
    fontSize: '9px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#60a5fa',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600,
  },
  eventAmount: {
    fontSize: '13px',
    color: '#34d399',
    fontWeight: 600,
  },
  eventDesc: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    width: '500px',
    backgroundColor: '#0b0f19',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 500,
    marginBottom: '4px',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#fff',
    outline: 'none',
    width: '100%',
  },
  modalSelect: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#fff',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  formGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  itemError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#fca5a5',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '12px',
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
