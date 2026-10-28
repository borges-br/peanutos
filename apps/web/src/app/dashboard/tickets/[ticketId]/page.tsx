'use client';

import { useWorkspaceFormatters } from '../../../../i18n/useWorkspaceFormatters';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { extractArray } from '../../../../lib/api-shape';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import ErrorState from '../../../../components/ui/ErrorState';

type TabType = 'summary' | 'comments' | 'time' | 'history' | 'related';

export default function TicketDetailPage() {
  const { formatDate, formatDateTime, formatTime } = useWorkspaceFormatters();
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { user: authUser } = useAuth();
  const ticketId = params?.ticketId as string;

  const [activeTab, setActiveTab] = useState<TabType>('summary');
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
      const data = await apiRequest<unknown>('/users');
      setTechnicians(extractArray(data));
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

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      default:
        return 'neutral';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'success';
      case 'OPEN':
      case 'TRIAGE':
        return 'info';
      case 'IN_PROGRESS':
        return 'info';
      case 'WAITING_CLIENT':
      case 'WAITING_THIRD_PARTY':
        return 'warning';
      default:
        return 'error';
    }
  };

  const renderSlaBadge = (dueStr: string | null, completedAtStr: string | null, label: string) => {
    if (completedAtStr) {
      return (
        <div className="flex flex-col gap-0.5 bg-surface border border-outline-variant p-md rounded-xl shadow">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/75">{label}</span>
          <span className="text-sm font-semibold font-mono text-success">Concluído</span>
        </div>
      );
    }

    if (!dueStr) {
      return (
        <div className="flex flex-col gap-0.5 bg-surface border border-outline-variant p-md rounded-xl shadow opacity-65">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/75">{label}</span>
          <span className="text-sm font-semibold font-mono text-on-surface-variant/40">Sem SLA definido</span>
        </div>
      );
    }

    const due = new Date(dueStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);

    if (diffMin < 0) {
      return (
        <div className="flex flex-col gap-0.5 bg-surface border border-error/20 p-md rounded-xl shadow bg-error/5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-error/85">{label}</span>
          <span className="text-sm font-bold font-mono text-error">Vencido</span>
        </div>
      );
    }

    if (diffMin <= 30) {
      return (
        <div className="flex flex-col gap-0.5 bg-surface border border-warning/20 p-md rounded-xl shadow bg-warning/5 animate-pulse">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-warning/85">{label}</span>
          <span className="text-sm font-semibold font-mono text-warning">Em atenção</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5 bg-surface border border-success/20 p-md rounded-xl shadow bg-success/5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-success/85">{label}</span>
        <span className="text-sm font-semibold font-mono text-success">Dentro do prazo</span>
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
      <div className="flex flex-col gap-md select-none">
        <div className="h-10 bg-surface border border-outline-variant/30 rounded-xl animate-pulse w-[40%]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface border border-outline-variant/30 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md h-[400px] mt-md">
          <div className="md:col-span-2 bg-surface border border-outline-variant/30 rounded-xl animate-pulse" />
          <div className="bg-surface border border-outline-variant/30 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return <ErrorState onRetry={fetchTicketDetails} title="Não foi possível carregar o chamado" description={error || undefined} />;
  }

  const isReadOnlyUser = authUser?.role === 'READ_ONLY' || authUser?.role === 'FINANCIAL';

  const tabItems = [
    { id: 'summary', label: t.clients.tabs.summary },
    { id: 'comments', label: t.tickets.commentsTitle },
    { id: 'time', label: t.tickets.timeEntriesTitle },
    { id: 'history', label: t.tickets.historyTitle },
    { id: 'related', label: 'Dados relacionados' }
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Top Banner Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs max-w-xl">
          <div className="flex items-center gap-xs text-[13px] text-on-surface-variant font-mono">
            <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
              {ticket.number}
            </span>
            <span>&bull;</span>
            <span>{t.tickets.openedAt} {formatDate(ticket.openedAt)}</span>
          </div>
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight mt-1">
            {ticket.title}
          </h2>
        </div>

        <div className="flex items-center gap-sm">
          <Badge variant={getPriorityVariant(ticket.priority)}>
            {t.enums.ticketPriority[ticket.priority as keyof typeof t.enums.ticketPriority] || ticket.priority}
          </Badge>
          <Badge variant={getStatusVariant(ticket.status)}>
            {t.enums.ticketStatus[ticket.status as keyof typeof t.enums.ticketStatus] || ticket.status}
          </Badge>
          <Button variant="outline" onClick={() => router.push('/dashboard/tickets')} className="py-1 px-4">
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
            {t.common.back}
          </Button>
        </div>
      </header>

      {/* SLA Alert Widgets Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {renderSlaBadge(ticket.slaDueFirstResponseAt, ticket.firstResponseAt, t.tickets.firstResponse)}
        {renderSlaBadge(ticket.slaDueStartAt, ticket.startedAt, t.tickets.startService)}
        {renderSlaBadge(ticket.slaDueResolutionAt, ticket.resolvedAt, t.tickets.resolution)}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-outline-variant/30 flex gap-sm overflow-x-auto">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`py-2 px-md border-b-2 text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Core Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        {/* Left Side Content Area */}
        <div className="lg:col-span-2 flex flex-col gap-lg bg-surface border border-outline-variant p-lg rounded-xl shadow-lg min-h-[300px]">
          
          {/* Tab Content: Summary */}
          {activeTab === 'summary' && (
            <div className="flex flex-col gap-md">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                {t.tickets.description}
              </h3>
              <p className="text-sm font-body text-on-surface leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Tab Content: Comments */}
          {activeTab === 'comments' && (
            <div className="flex flex-col gap-md">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                {t.tickets.commentsTitle}
              </h3>

              {!isReadOnlyUser && (
                <form onSubmit={handlePostComment} className="flex flex-col gap-sm bg-surface-container-low border border-outline-variant p-md rounded-xl">
                  <textarea
                    rows={3}
                    required
                    placeholder={t.tickets.commentPlaceholder}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-surface border border-outline-variant text-on-surface text-sm rounded-lg p-sm outline-none resize-none font-body transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-sm">
                    <div className="flex gap-xs items-center">
                      <span className="text-[12px] font-semibold text-on-surface-variant">Visibilidade:</span>
                      <Select
                        value={commentVisibility}
                        onChange={(e) => setCommentVisibility(e.target.value as any)}
                        options={[
                          { value: 'INTERNAL', label: t.tickets.commentInternal },
                          { value: 'CLIENT_VISIBLE_FUTURE', label: t.tickets.commentPublic }
                        ]}
                        className="py-1 text-xs"
                      />
                    </div>

                    <Button type="submit" variant="primary" disabled={commentLoading} className="py-1.5 px-4 text-xs justify-center">
                      {commentLoading ? 'Enviando...' : t.tickets.commentBtn}
                    </Button>
                  </div>
                  {commentError && <p className="text-xs text-error font-semibold">{commentError}</p>}
                </form>
              )}

              <div className="flex flex-col gap-sm mt-2">
                {(!ticket.comments || ticket.comments.length === 0) ? (
                  <p className="text-sm font-medium text-on-surface-variant/50 text-center py-6">{t.tickets.commentsEmpty}</p>
                ) : (
                  ticket.comments.map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-md border rounded-xl flex flex-col gap-xs ${
                        c.isInternal
                          ? 'bg-warning/5 border-warning/10'
                          : 'bg-surface-container-low border-outline-variant/40'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex gap-xs items-center font-mono">
                          <span className="font-semibold text-on-surface">{c.user?.name || 'Sistema'}</span>
                          <span className="text-[10px] bg-outline-variant border border-outline-variant/30 text-on-surface-variant px-1.5 py-0.5 rounded font-sans uppercase">
                            {c.user?.role || 'SYSTEM'}
                          </span>
                          {c.isInternal && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-warning/10 border border-warning/20 text-[10px] font-semibold text-warning font-sans">
                              Nota Interna
                            </span>
                          )}
                        </div>
                        <span className="text-on-surface-variant font-mono">
                          {formatDateTime(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-body text-on-surface mt-1 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Time Tracking */}
          {activeTab === 'time' && (
            <div className="flex flex-col gap-md">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                {t.tickets.timeEntriesTitle}
              </h3>
              
              {!isReadOnlyUser && (
                <form onSubmit={handleCreateTimeEntry} className="flex flex-col gap-sm bg-surface-container-low border border-outline-variant p-md rounded-xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
                    <div className="flex flex-col gap-xs">
                      <label className="text-[11px] font-semibold text-on-surface-variant">{t.tickets.timeStart} *</label>
                      <input
                        type="datetime-local"
                        required
                        value={timeStartedAt}
                        onChange={(e) => setTimeStartedAt(e.target.value)}
                        className="bg-surface border border-outline-variant text-on-surface text-xs rounded-lg p-sm outline-none w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <label className="text-[11px] font-semibold text-on-surface-variant">{t.tickets.timeEnd}</label>
                      <input
                        type="datetime-local"
                        value={timeEndedAt}
                        onChange={(e) => setTimeEndedAt(e.target.value)}
                        className="bg-surface border border-outline-variant text-on-surface text-xs rounded-lg p-sm outline-none w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <label className="text-[11px] font-semibold text-on-surface-variant">{t.tickets.timeBillable}</label>
                      <div className="flex items-center h-[34px] px-1">
                        <input
                          type="checkbox"
                          checked={timeBillable}
                          onChange={(e) => setTimeBillable(e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-primary bg-surface border-outline"
                        />
                        <span className="text-xs text-on-surface font-medium ml-2">{t.tickets.timeBillableBadge}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-sm items-center mt-1">
                    <Input
                      type="text"
                      required
                      placeholder={t.tickets.timeDescription}
                      value={timeDescription}
                      onChange={(e) => setTimeDescription(e.target.value)}
                      className="flex-1 text-xs py-1.5"
                    />
                    <Button type="submit" variant="secondary" disabled={timeLoading} className="py-1.5 px-4 text-xs justify-center">
                      {timeLoading ? 'Enviando...' : t.tickets.timeBtn}
                    </Button>
                  </div>
                  {timeError && <p className="text-xs text-error font-semibold">{timeError}</p>}
                </form>
              )}

              <div className="flex flex-col gap-sm mt-2">
                {(!ticket.timeEntries || ticket.timeEntries.length === 0) ? (
                  <p className="text-sm font-medium text-on-surface-variant/50 text-center py-6">{t.tickets.timeEmpty}</p>
                ) : (
                  ticket.timeEntries.map((entry: any) => (
                    <div key={entry.id} className="p-md bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col gap-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-on-surface font-mono">{entry.user?.name}</span>
                        <span className="text-on-surface-variant font-mono">
                          {formatDateTime(entry.startedAt)} {entry.endedAt ? `até ${formatTime(entry.endedAt)}` : ''}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface leading-relaxed mt-1 font-body">{entry.description}</p>
                      <div className="flex justify-between items-center mt-1 text-xs">
                        <span className="font-mono text-primary font-bold">{entry.durationMinutes || 0} {t.tickets.timeMinutes}</span>
                        {entry.billable && (
                          <Badge variant="info" className="text-[10px] py-0 px-2 uppercase">
                            {t.tickets.timeBillableBadge}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: History */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-md">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                {t.tickets.historyTitle}
              </h3>
              
              <div className="relative pl-6 border-l border-outline-variant/50 flex flex-col gap-md py-2">
                {(!ticket.history || ticket.history.length === 0) ? (
                  <p className="text-sm font-medium text-on-surface-variant/50 text-left pl-2">{t.inventory.details.noHistory}</p>
                ) : (
                  ticket.history.map((h: any) => (
                    <div key={h.id} className="relative flex flex-col gap-0.5">
                      <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-primary border-4 border-background" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-primary">{h.event}</span>
                        <span className="text-on-surface-variant font-mono">{formatDateTime(h.createdAt)}</span>
                      </div>
                      <p className="text-sm font-body text-on-surface mt-0.5">{h.description}</p>
                      <span className="text-[11px] text-on-surface-variant/70 font-mono mt-0.5">Por: {h.actorUser?.name || 'Sistema'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Related Data */}
          {activeTab === 'related' && (
            <div className="flex flex-col gap-md">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                Dados relacionados
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-sm">
                <div className="flex flex-col gap-xs bg-surface-container-low border border-outline-variant p-md rounded-xl">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider font-sans">Categoria</span>
                  <span className="text-on-surface font-semibold mt-0.5">{ticket.category || '--'}</span>
                </div>
                
                <div className="flex flex-col gap-xs bg-surface-container-low border border-outline-variant p-md rounded-xl">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider font-sans">Canal de Entrada</span>
                  <span className="text-on-surface font-semibold mt-0.5">
                    {ticket.channel === 'EMAIL' ? 'E-mail' : ticket.channel === 'WHATSAPP' ? 'WhatsApp' : ticket.channel === 'PHONE' ? 'Telefone' : ticket.channel === 'PORTAL' ? 'Portal do Cliente' : ticket.channel === 'MANUAL' ? 'Manual' : ticket.channel || '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side Sidebar Actions & Meta Info */}
        <div className="flex flex-col gap-lg">
          
          {/* Metadata Card Info */}
          <div className="flex flex-col gap-md bg-surface border border-outline-variant p-lg rounded-xl shadow-lg">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
              {t.tickets.associationTitle}
            </h3>
            
            <div className="flex flex-col gap-sm divide-y divide-outline-variant/30 text-sm">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-on-surface-variant">{t.tickets.clientLabel}</span>
                <span className="text-on-surface text-right font-medium">{ticket.client?.tradeName || ticket.client?.legalName || '--'}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-on-surface-variant">{t.tickets.contactLabel}</span>
                <span className="text-on-surface text-right truncate max-w-[180px] font-medium" title={ticket.contact?.email}>
                  {ticket.contact ? `${ticket.contact.name}` : '--'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-on-surface-variant">{t.tickets.clientUserLabel}</span>
                <span className="text-on-surface text-right truncate max-w-[180px] font-medium" title={ticket.clientUser?.email}>
                  {ticket.clientUser ? `${ticket.clientUser.fullName}` : '--'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-on-surface-variant">{t.tickets.assetLabel}</span>
                {ticket.asset ? (
                  <button
                    onClick={() => router.push(`/dashboard/clients/${ticket.clientId}/assets/${ticket.asset.id}`)}
                    className="text-primary hover:underline text-right font-mono font-bold text-xs"
                  >
                    🔗 {ticket.asset.name}
                  </button>
                ) : (
                  <span className="text-on-surface-variant/40 text-right italic font-medium">{t.tickets.assetNone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Control panel */}
          {!isReadOnlyUser && (
            <div className="flex flex-col gap-md bg-surface border border-outline-variant p-lg rounded-xl shadow-lg">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                {t.tickets.actionsTitle}
              </h3>

              {/* Assignment Controls */}
              <div className="flex flex-col gap-xs">
                <label className="text-[12px] font-semibold text-on-surface-variant">{t.tickets.assignedTech}</label>
                <Select
                  value={ticket.assignedToId || ''}
                  onChange={(e) => handleAssignTech(e.target.value)}
                  options={[
                    { value: '', label: 'Não atribuído' },
                    ...technicians.map((tech) => ({ value: tech.id, label: tech.name }))
                  ]}
                  className="w-full text-xs py-1"
                />
              </div>

              {/* Status Controls */}
              <div className="flex flex-col gap-xs mt-2 border-t border-outline-variant/30 pt-md">
                <label className="text-[12px] font-semibold text-on-surface-variant">{t.tickets.statusTransitions}</label>
                
                <div className="flex flex-col gap-sm">
                  <div className="flex flex-col bg-surface-container-low border border-outline-variant/50 p-2 rounded-lg items-center">
                    <span className="text-[10px] text-on-surface-variant uppercase font-semibold">{t.tickets.currentStatus}</span>
                    <Badge variant={getStatusVariant(ticket.status)} className="mt-1 uppercase text-[10px]">
                      {t.enums.ticketStatus[ticket.status as keyof typeof t.enums.ticketStatus] || ticket.status}
                    </Badge>
                  </div>

                  {/* Transition actions */}
                  <div className="flex flex-col gap-xs mt-1">
                    {getValidStatusTransitions(ticket.status).map((tStatus) => (
                      <Button
                        key={tStatus}
                        variant="outline"
                        onClick={() => handleStatusChange(tStatus)}
                        className="py-1 px-3 text-[11px] justify-center text-on-surface font-semibold hover:border-primary/50"
                      >
                        {t.tickets.transitionTo.replace('{status}', t.enums.ticketStatus[tStatus as keyof typeof t.enums.ticketStatus] || tStatus)}
                      </Button>
                    ))}
                    {getValidStatusTransitions(ticket.status).length === 0 && (
                      <p className="text-[11px] text-on-surface-variant/40 italic text-center py-2">
                        {t.tickets.noTransitions}
                      </p>
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
