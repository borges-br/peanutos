'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const ticketId = params?.ticketId as string;

  const [ticket, setTicket] = useState<any>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comments State
  const [commentText, setCommentText] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'INTERNAL' | 'CLIENT_VISIBLE_FUTURE'>('INTERNAL');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(false);

  // Time Entry State
  const [timeDescription, setTimeDescription] = useState('');
  const [timeStartedAt, setTimeStartedAt] = useState('');
  const [timeEndedAt, setTimeEndedAt] = useState('');
  const [timeBillable, setTimeBillable] = useState(true);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [timeLoading, setTimeLoading] = useState(false);

  const fetchTicketDetails = async () => {
    try {
      const data = await apiRequest(`/tickets/${ticketId}`);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do chamado.');
    }
  };

  const fetchTechnicians = async () => {
    try {
      const data = await apiRequest('/users');
      setTechnicians(data || []);
    } catch (err) {
      console.warn('Erro ao carregar técnicos:', err);
    }
  };

  useEffect(() => {
    if (!ticketId) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      await Promise.all([fetchTicketDetails(), fetchTechnicians()]);
      setLoading(false);
    }

    loadData();
  }, [ticketId]);

  // Handle Technician Assignment
  const handleAssignTech = async (techId: string) => {
    try {
      setError(null);
      await apiRequest(`/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedToId: techId || null }),
      });
      await fetchTicketDetails();
    } catch (err: any) {
      setError(err.message || 'Falha ao reatribuir chamado.');
    }
  };

  // Handle Status Update
  const handleStatusChange = async (newStatus: string) => {
    try {
      setError(null);
      await apiRequest(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchTicketDetails();
    } catch (err: any) {
      setError(err.message || 'Falha ao alterar status do chamado.');
    }
  };

  // Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);
    if (!commentText.trim()) return;

    setCommentLoading(true);
    try {
      await apiRequest(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: commentText,
          visibility: commentVisibility,
        }),
      });
      setCommentText('');
      await fetchTicketDetails();
    } catch (err: any) {
      setCommentError(err.message || 'Erro ao publicar comentário.');
    } finally {
      setCommentLoading(false);
    }
  };

  // Create Time Entry
  const handleCreateTimeEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError(null);
    if (!timeDescription.trim() || !timeStartedAt) {
      setTimeError('Descrição e data de início são obrigatórias.');
      return;
    }

    setTimeLoading(true);
    try {
      const payload = {
        description: timeDescription,
        startedAt: new Date(timeStartedAt).toISOString(),
        endedAt: timeEndedAt ? new Date(timeEndedAt).toISOString() : null,
        billable: timeBillable,
      };

      await apiRequest(`/tickets/${ticketId}/time-entries`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTimeDescription('');
      setTimeStartedAt('');
      setTimeEndedAt('');
      await fetchTicketDetails();
    } catch (err: any) {
      setTimeError(err.message || 'Erro ao registrar tempo técnico.');
    } finally {
      setTimeLoading(false);
    }
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

  const renderSlaBadge = (dueStr: string | null, completedAtStr: string | null, label: string) => {
    if (completedAtStr) {
      return (
        <div style={{ ...styles.slaIndicatorCard, borderColor: 'rgba(16, 185, 129, 0.2)' }}>
          <span style={styles.slaIndicatorLabel}>{label}</span>
          <span style={{ ...styles.slaIndicatorTime, color: '#34d399' }}>✓ Concluído</span>
        </div>
      );
    }

    if (!dueStr) {
      return (
        <div style={styles.slaIndicatorCard}>
          <span style={styles.slaIndicatorLabel}>{label}</span>
          <span style={styles.slaIndicatorTime}>Não definido</span>
        </div>
      );
    }

    const due = new Date(dueStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);

    if (diffMin < 0) {
      return (
        <div style={{ ...styles.slaIndicatorCard, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <span style={styles.slaIndicatorLabel}>{label}</span>
          <span style={{ ...styles.slaIndicatorTime, color: '#ef4444', fontWeight: 'bold' }}>⚠️ Estourado ({Math.abs(diffMin)}m)</span>
        </div>
      );
    }

    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    let activeColor = '#60a5fa';
    if (diffMin <= 30) activeColor = '#ef4444';
    else if (diffMin <= 120) activeColor = '#fbbf24';

    return (
      <div style={{ ...styles.slaIndicatorCard, borderColor: activeColor + '33' }}>
        <span style={styles.slaIndicatorLabel}>{label}</span>
        <span style={{ ...styles.slaIndicatorTime, color: activeColor }}>{timeStr} restantes</span>
      </div>
    );
  };

  const getValidStatusTransitions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'OPEN': return ['TRIAGE', 'IN_PROGRESS', 'CANCELLED'];
      case 'TRIAGE': return ['IN_PROGRESS', 'CANCELLED'];
      case 'IN_PROGRESS': return ['WAITING_CLIENT', 'WAITING_THIRD_PARTY', 'RESOLVED', 'CANCELLED'];
      case 'WAITING_CLIENT': return ['IN_PROGRESS'];
      case 'WAITING_THIRD_PARTY': return ['IN_PROGRESS'];
      case 'RESOLVED': return ['CLOSED'];
      default: return [];
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={{ marginTop: '12px', color: '#9ca3af' }}>Carregando dados do chamado...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={{ color: '#f87171' }}>Ocorreu um erro</h2>
        <p style={{ margin: '12px 0', color: '#d1d5db' }}>{error || 'Não foi possível carregar o chamado técnico.'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/tickets')}>Voltar aos chamados</Button>
      </div>
    );
  }

  const isReadOnlyUser = authUser?.role === 'READ_ONLY' || authUser?.role === 'FINANCIAL';

  return (
    <div style={styles.container}>
      {/* Top Banner Header */}
      <header style={styles.ticketHeader}>
        <div style={styles.headerTitleArea}>
          <div style={styles.numBreadcrumb}>
            <span style={styles.numberMonospace}>{ticket.number}</span>
            <span style={styles.slashSep}>/</span>
            <span style={styles.openedDateStr}>Aberto em {new Date(ticket.openedAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <h1 style={styles.ticketTitle}>{ticket.title}</h1>
        </div>

        <div style={styles.headerBadges}>
          <span style={{ ...styles.badge, ...getPriorityStyle(ticket.priority) }}>
            Prioridade: {ticket.priority}
          </span>
          <span style={{ ...styles.badge, ...getStatusStyle(ticket.status) }}>
            Status: {getStatusLabel(ticket.status)}
          </span>
          <Button variant="outline" onClick={() => router.push('/dashboard/tickets')}>
            Voltar
          </Button>
        </div>
      </header>

      {/* SLA Alert Widgets Banner */}
      <div style={styles.slaPanelGrid}>
        {renderSlaBadge(ticket.slaDueFirstResponseAt, ticket.firstResponseAt, 'Primeira Resposta')}
        {renderSlaBadge(ticket.slaDueStartAt, ticket.startedAt, 'Início de Atendimento')}
        {renderSlaBadge(ticket.slaDueResolutionAt, ticket.resolvedAt, 'Resolução de Incidente')}
      </div>

      {/* Main Core Columns Grid */}
      <div style={styles.contentGrid}>
        {/* Left Side Content Area */}
        <div style={styles.leftCol}>
          {/* Incidente Description Card */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Descrição do Problema</h3>
            <p style={styles.descriptionText}>{ticket.description}</p>
          </div>

          {/* Time Tracking Entries section */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Apontamentos de Tempo Técnico</h3>
            
            {!isReadOnlyUser && (
              <form onSubmit={handleCreateTimeEntry} style={styles.timeForm}>
                <div style={styles.timeInputsGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.smallLabel}>Início *</label>
                    <input
                      type="datetime-local"
                      required
                      value={timeStartedAt}
                      onChange={(e) => setTimeStartedAt(e.target.value)}
                      style={styles.inputSmall}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.smallLabel}>Fim (Opcional)</label>
                    <input
                      type="datetime-local"
                      value={timeEndedAt}
                      onChange={(e) => setTimeEndedAt(e.target.value)}
                      style={styles.inputSmall}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.smallLabel}>Faturável</label>
                    <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
                      <input
                        type="checkbox"
                        checked={timeBillable}
                        onChange={(e) => setTimeBillable(e.target.checked)}
                        style={styles.checkbox}
                      />
                    </div>
                  </div>
                </div>
                <div style={styles.timeDescRow}>
                  <input
                    type="text"
                    required
                    placeholder="Descrição da atividade técnica realizada..."
                    value={timeDescription}
                    onChange={(e) => setTimeDescription(e.target.value)}
                    style={{ ...styles.input, flexGrow: 1 }}
                  />
                  <Button type="submit" variant="secondary" disabled={timeLoading}>
                    {timeLoading ? 'Registrando...' : 'Lançar'}
                  </Button>
                </div>
                {timeError && <p style={styles.timeErrorMsg}>{timeError}</p>}
              </form>
            )}

            {/* List logged entries */}
            <div style={styles.timeList}>
              {(!ticket.timeEntries || ticket.timeEntries.length === 0) ? (
                <p style={styles.emptyCardText}>Nenhum tempo lançado para este chamado.</p>
              ) : (
                ticket.timeEntries.map((entry: any) => (
                  <div key={entry.id} style={styles.timeEntryRow}>
                    <div style={styles.timeEntryHeader}>
                      <span style={styles.timeUser}>{entry.user?.name}</span>
                      <span style={styles.timeSpan}>
                        {new Date(entry.startedAt).toLocaleString('pt-BR')} {entry.endedAt ? `até ${new Date(entry.endedAt).toLocaleTimeString('pt-BR')}` : ''}
                      </span>
                    </div>
                    <p style={styles.timeDesc}>{entry.description}</p>
                    <div style={styles.timeMeta}>
                      <span style={styles.timeMinutes}>{entry.durationMinutes || 0} minutos</span>
                      {entry.billable && <span style={styles.billableBadge}>Faturável</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Internal / External chat comments thread */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Comunicação & Comentários</h3>

            {!isReadOnlyUser && (
              <form onSubmit={handlePostComment} style={styles.commentForm}>
                <textarea
                  rows={3}
                  required
                  placeholder="Escreva um comentário ou atualização técnica..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  style={styles.textarea}
                />
                
                <div style={styles.commentActionsRow}>
                  <div style={styles.visibilityToggle}>
                    <label style={styles.switchLabel}>Visibilidade:</label>
                    <select
                      value={commentVisibility}
                      onChange={(e) => setCommentVisibility(e.target.value as any)}
                      style={styles.selectSmall}
                    >
                      <option value="INTERNAL">🔒 Nota Técnica Interna</option>
                      <option value="CLIENT_VISIBLE_FUTURE">🌐 Visível para o Cliente</option>
                    </select>
                  </div>

                  <Button type="submit" variant="primary" disabled={commentLoading}>
                    {commentLoading ? 'Enviando...' : 'Comentar'}
                  </Button>
                </div>
                {commentError && <p style={styles.commentErrorMsg}>{commentError}</p>}
              </form>
            )}

            <div style={styles.commentsThread}>
              {(!ticket.comments || ticket.comments.length === 0) ? (
                <p style={styles.emptyCardText}>Nenhum comentário registrado.</p>
              ) : (
                ticket.comments.map((c: any) => (
                  <div
                    key={c.id}
                    style={{
                      ...styles.commentBox,
                      backgroundColor: c.isInternal ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                      borderColor: c.isInternal ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={styles.commentHeader}>
                      <div style={styles.commentAuthorArea}>
                        <span style={styles.commentAuthor}>{c.user?.name || 'Sistema'}</span>
                        <span style={styles.commentRoleBadge}>{c.user?.role || 'SYSTEM'}</span>
                        {c.isInternal && (
                          <span style={styles.internalBadge}>🔒 Nota Interna</span>
                        )}
                      </div>
                      <span style={styles.commentDate}>
                        {new Date(c.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p style={styles.commentTextContent}>{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ticket history audit change logs */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Histórico de Alterações</h3>
            <div style={styles.historyTimeline}>
              {(!ticket.history || ticket.history.length === 0) ? (
                <p style={styles.emptyCardText}>Nenhum histórico registrado.</p>
              ) : (
                ticket.history.map((h: any) => (
                  <div key={h.id} style={styles.historyItem}>
                    <div style={styles.historyDot} />
                    <div style={styles.historyContent}>
                      <div style={styles.historyHeader}>
                        <span style={styles.historyEvent}>{h.event}</span>
                        <span style={styles.historyTime}>{new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <p style={styles.historyDesc}>{h.description}</p>
                      <span style={styles.historyActor}>Por: {h.actorUser?.name || 'Sistema'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side Sidebar Actions & Meta Info */}
        <div style={styles.rightCol}>
          {/* Metadata Card Info */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Informações de Associação</h3>
            
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Cliente:</span>
              <span style={styles.metaValue}>{ticket.client?.tradeName || ticket.client?.legalName || '-'}</span>
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Contato:</span>
              <span style={styles.metaValue}>
                {ticket.contact ? `${ticket.contact.name} (${ticket.contact.email})` : '-'}
              </span>
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Usuário Afetado:</span>
              <span style={styles.metaValue}>
                {ticket.clientUser ? `${ticket.clientUser.fullName} (${ticket.clientUser.email})` : '-'}
              </span>
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Ativo Vinculado:</span>
              {ticket.asset ? (
                <button
                  onClick={() => router.push(`/dashboard/clients/${ticket.clientId}/assets/${ticket.asset.id}`)}
                  style={styles.assetLinkBtn}
                >
                  🔗 {ticket.asset.name} ({ticket.asset.type})
                </button>
              ) : (
                <span style={styles.metaValue}>Nenhum ativo vinculado</span>
              )}
            </div>
          </div>

          {/* Quick Actions Control panel */}
          {!isReadOnlyUser && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Ações de Atendimento</h3>

              {/* Assignment Controls */}
              <div style={styles.actionBlock}>
                <label style={styles.actionLabel}>Reatribuir Técnico</label>
                <select
                  value={ticket.assignedToId || ''}
                  onChange={(e) => handleAssignTech(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Não atribuído</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Controls */}
              <div style={styles.actionBlock}>
                <label style={styles.actionLabel}>Alterar Status</label>
                <div style={styles.statusTransitionsPanel}>
                  {/* Current Status display */}
                  <div style={styles.currentStatusWrapper}>
                    <span style={styles.statusLabelSmall}>Status Atual:</span>
                    <span style={{ ...styles.badge, ...getStatusStyle(ticket.status), marginTop: '4px' }}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>

                  {/* Transition actions */}
                  <div style={styles.actionButtonsCol}>
                    {getValidStatusTransitions(ticket.status).map((tStatus) => (
                      <button
                        key={tStatus}
                        onClick={() => handleStatusChange(tStatus)}
                        style={styles.transitionBtn}
                      >
                        Mudar para: {getStatusLabel(tStatus)}
                      </button>
                    ))}
                    {getValidStatusTransitions(ticket.status).length === 0 && (
                      <p style={styles.transitionTerminalText}>Sem transições permitidas para chamados encerrados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '20px',
  },
  headerTitleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  numBreadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  numberMonospace: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  slashSep: {
    color: '#4b5563',
  },
  openedDateStr: {
    color: '#9ca3af',
  },
  ticketTitle: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#f9fafb',
  },
  headerBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  badge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid',
    display: 'inline-block',
  },
  slaPanelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  slaIndicatorCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  slaIndicatorLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    fontWeight: 500,
  },
  slaIndicatorTime: {
    fontSize: '15px',
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#fff',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
    alignItems: 'start',
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
    fontSize: '16px',
    fontWeight: 600,
    color: '#3b82f6',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '8px',
  },
  descriptionText: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#e5e7eb',
    whiteSpace: 'pre-wrap',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '8px',
  },
  metaLabel: {
    color: '#9ca3af',
    fontWeight: 500,
  },
  metaValue: {
    color: '#f3f4f6',
    textAlign: 'right',
  },
  assetLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    textDecoration: 'underline',
    fontWeight: 500,
    textAlign: 'right',
  },
  actionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  actionLabel: {
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: 500,
  },
  select: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  selectSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  inputSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    color: '#f9fafb',
    outline: 'none',
  },
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    resize: 'vertical',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  statusTransitionsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    padding: '12px',
  },
  currentStatusWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statusLabelSmall: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  actionButtonsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '6px',
  },
  transitionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#e5e7eb',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
  },
  transitionTerminalText: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  commentForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '16px',
    borderRadius: '8px',
  },
  commentActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  switchLabel: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  commentErrorMsg: {
    fontSize: '12px',
    color: '#f87171',
    marginTop: '4px',
  },
  commentsThread: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  commentBox: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
  commentAuthorArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  commentAuthor: {
    fontWeight: 600,
    color: '#f3f4f6',
  },
  commentRoleBadge: {
    fontSize: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#9ca3af',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  internalBadge: {
    fontSize: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#fbbf24',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  commentDate: {
    color: '#6b7280',
  },
  commentTextContent: {
    fontSize: '14px',
    color: '#e5e7eb',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  emptyCardText: {
    color: '#9ca3af',
    fontSize: '13px',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '12px 0',
  },
  timeForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '16px',
    borderRadius: '8px',
  },
  timeInputsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 80px',
    gap: '12px',
  },
  smallLabel: {
    fontSize: '11px',
    color: '#9ca3af',
    fontWeight: 500,
  },
  timeDescRow: {
    display: 'flex',
    gap: '12px',
  },
  timeErrorMsg: {
    fontSize: '12px',
    color: '#f87171',
  },
  timeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
  },
  timeEntryRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  timeEntryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
  timeUser: {
    fontWeight: 600,
    color: '#e5e7eb',
  },
  timeSpan: {
    color: '#9ca3af',
  },
  timeDesc: {
    fontSize: '13px',
    color: '#d1d5db',
  },
  timeMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '11px',
    marginTop: '2px',
  },
  timeMinutes: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  billableBadge: {
    color: '#34d399',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  historyTimeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    paddingLeft: '16px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    margin: '8px 4px',
  },
  historyItem: {
    position: 'relative',
  },
  historyDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    position: 'absolute',
    left: '-21px',
    top: '4px',
    border: '2px solid #0b0f19',
  },
  historyContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
  },
  historyEvent: {
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  historyTime: {
    color: '#6b7280',
  },
  historyDesc: {
    fontSize: '13px',
    color: '#e5e7eb',
  },
  historyActor: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(59, 130, 246, 0.1)',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    padding: '24px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(239, 68, 68, 0.15)',
  },
};
