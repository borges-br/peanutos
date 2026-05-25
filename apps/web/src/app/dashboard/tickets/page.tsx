'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../i18n/useI18n';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import DataTable from '../../../components/ui/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';

export default function TicketsPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [page, setPage] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial clients and internal users for filters
  useEffect(() => {
    async function fetchFilterData() {
      try {
        const clientsRes = await apiRequest('/clients?limit=100');
        setClients(clientsRes.data || []);
        
        const usersRes = await apiRequest('/users');
        setUsers(usersRes || []);
      } catch (err) {
        console.warn('Erro ao carregar dados auxiliares de filtros:', err);
      }
    }
    fetchFilterData();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const qParams = new URLSearchParams();
      qParams.append('page', String(page));
      qParams.append('limit', '10');
      if (search) qParams.append('search', search);
      if (clientId) qParams.append('clientId', clientId);
      if (status) qParams.append('status', status);
      if (priority) qParams.append('priority', priority);
      if (assignedToId) qParams.append('assignedToId', assignedToId);

      const response = await apiRequest(`/tickets?${qParams.toString()}`);
      setTickets(response.items || []);
      setMeta({
        page: response.page || 1,
        totalPages: response.totalPages || 1,
        total: response.total || 0,
      });
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, clientId, status, priority, assignedToId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleClearFilters = () => {
    setSearch('');
    setClientId('');
    setStatus('');
    setPriority('');
    setAssignedToId('');
    setPage(1);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper calculating SLA and returning a static styled text
  const renderSlaInfo = (dueStr: string | null, completedAtStr: string | null, label: string) => {
    if (completedAtStr) {
      return (
        <span className="text-[11px] text-success font-medium block">
          {label}: Concluído
        </span>
      );
    }

    if (!dueStr) {
      return (
        <span className="text-[11px] text-on-surface-variant/40 block">
          {label}: --
        </span>
      );
    }

    const due = new Date(dueStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffMin = Math.ceil(diffMs / 60000);

    if (diffMin < 0) {
      return (
        <span className="text-[11px] text-error font-semibold block">
          {label}: Vencido
        </span>
      );
    }

    if (diffMin <= 30) {
      return (
        <span className="text-[11px] text-warning font-medium block">
          {label}: Em atenção
        </span>
      );
    }

    return (
      <span className="text-[11px] text-success/80 font-medium block">
        {label}: Dentro do prazo
      </span>
    );
  };

  // DataTable column definitions
  const columns = [
    {
      header: t.tickets.number + " / " + t.tickets.ticketTitle,
      render: (ticket: any) => (
        <div className="flex flex-col py-0.5 max-w-[280px]">
          <span className="font-mono text-xs font-bold text-primary">{ticket.number}</span>
          <span className="font-semibold text-on-surface truncate mt-0.5">{ticket.title}</span>
        </div>
      ),
    },
    {
      header: t.tickets.clientLabel + " / " + t.tickets.assetLabel,
      render: (ticket: any) => (
        <div className="flex flex-col py-0.5 max-w-[220px]">
          <span className="font-semibold text-on-surface">{ticket.client?.tradeName || ticket.client?.legalName || '--'}</span>
          <span className="text-[11px] text-on-surface-variant/70 mt-0.5 truncate">
            {ticket.asset ? `${ticket.asset.name} (${t.enums.assetType[ticket.asset.type as keyof typeof t.enums.assetType] || ticket.asset.type})` : '--'}
          </span>
        </div>
      ),
    },
    {
      header: t.tickets.priority,
      render: (ticket: any) => {
        const badgeVariant =
          ticket.priority === 'CRITICAL' || ticket.priority === 'URGENT'
            ? 'error'
            : ticket.priority === 'HIGH'
            ? 'warning'
            : ticket.priority === 'MEDIUM'
            ? 'info'
            : 'neutral';
        const label = t.enums.ticketPriority[ticket.priority as keyof typeof t.enums.ticketPriority] || ticket.priority;
        return <Badge variant={badgeVariant}>{label}</Badge>;
      },
    },
    {
      header: t.tickets.status,
      render: (ticket: any) => {
        const badgeVariant =
          ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
            ? 'success'
            : ticket.status === 'OPEN' || ticket.status === 'TRIAGE'
            ? 'info'
            : ticket.status === 'IN_PROGRESS'
            ? 'info'
            : 'warning';
        const label = t.enums.ticketStatus[ticket.status as keyof typeof t.enums.ticketStatus] || ticket.status;
        return <Badge variant={badgeVariant}>{label}</Badge>;
      },
    },
    {
      header: t.tickets.tech,
      render: (ticket: any) => (
        <span className="text-on-surface-variant font-medium">{ticket.assignedTo?.name || '--'}</span>
      ),
    },
    {
      header: t.tickets.sla,
      render: (ticket: any) => (
        <div className="flex flex-col gap-0.5 py-0.5">
          {renderSlaInfo(ticket.slaDueFirstResponseAt, ticket.firstResponseAt, 'Resp')}
          {renderSlaInfo(ticket.slaDueResolutionAt, ticket.resolvedAt, 'Resol')}
        </div>
      ),
    },
    {
      header: t.tickets.updated,
      render: (ticket: any) => (
        <span className="font-mono text-xs text-on-surface-variant">{formatDateTime(ticket.updatedAt)}</span>
      ),
    },
    {
      header: t.tickets.actions,
      className: "text-right",
      render: (ticket: any) => (
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
          className="py-1 px-3"
        >
          {t.common.details}
        </Button>
      ),
    },
  ];

  // Mobile stacked cards renderer
  const renderMobileCard = (ticket: any) => {
    const priorityVariant =
      ticket.priority === 'CRITICAL' || ticket.priority === 'URGENT'
        ? 'error'
        : ticket.priority === 'HIGH'
        ? 'warning'
        : ticket.priority === 'MEDIUM'
        ? 'info'
        : 'neutral';
    const statusVariant =
      ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
        ? 'success'
        : ticket.status === 'OPEN' || ticket.status === 'TRIAGE'
        ? 'info'
        : ticket.status === 'IN_PROGRESS'
        ? 'info'
        : 'warning';

    return (
      <div className="flex flex-col gap-sm">
        <div className="flex justify-between items-start">
          <div className="flex flex-col max-w-[70%]">
            <span className="font-mono text-xs font-bold text-primary">{ticket.number}</span>
            <span className="font-bold text-on-surface truncate mt-0.5">{ticket.title}</span>
          </div>
          <div className="flex flex-col gap-xs items-end">
            <Badge variant={statusVariant}>
              {t.enums.ticketStatus[ticket.status as keyof typeof t.enums.ticketStatus] || ticket.status}
            </Badge>
            <Badge variant={priorityVariant}>
              {t.enums.ticketPriority[ticket.priority as keyof typeof t.enums.ticketPriority] || ticket.priority}
            </Badge>
          </div>
        </div>
        <div className="h-[1px] bg-outline-variant/30 my-xs"></div>
        <div className="grid grid-cols-2 gap-xs text-[12px]">
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Cliente</span>
            <span className="truncate mt-0.5 font-semibold text-on-surface">
              {ticket.client?.tradeName || ticket.client?.legalName || '--'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">Responsável</span>
            <span className="truncate mt-0.5 text-on-surface">{ticket.assignedTo?.name || '--'}</span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">SLA Primeira Resposta</span>
            <span className="mt-0.5">{renderSlaInfo(ticket.slaDueFirstResponseAt, ticket.firstResponseAt, 'Resp')}</span>
          </div>
          <div className="flex flex-col mt-1">
            <span className="text-on-surface-variant font-medium uppercase text-[10px] tracking-wider">SLA Resolução</span>
            <span className="mt-0.5">{renderSlaInfo(ticket.slaDueResolutionAt, ticket.resolvedAt, 'Resol')}</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
          className="w-full mt-sm justify-center py-2"
        >
          {t.common.details}
        </Button>
      </div>
    );
  };

  const clientOptions = [
    { value: '', label: t.tickets.filterClient },
    ...clients.map(c => ({ value: c.id, label: c.tradeName || c.legalName }))
  ];

  const statusOptions = [
    { value: '', label: t.tickets.filterStatus },
    { value: 'OPEN', label: t.enums.ticketStatus.OPEN },
    { value: 'TRIAGE', label: t.enums.ticketStatus.TRIAGE },
    { value: 'IN_PROGRESS', label: t.enums.ticketStatus.IN_PROGRESS },
    { value: 'WAITING_CLIENT', label: t.enums.ticketStatus.WAITING_CLIENT },
    { value: 'WAITING_THIRD_PARTY', label: t.enums.ticketStatus.WAITING_THIRD_PARTY },
    { value: 'RESOLVED', label: t.enums.ticketStatus.RESOLVED },
    { value: 'CLOSED', label: t.enums.ticketStatus.CLOSED },
    { value: 'CANCELLED', label: t.enums.ticketStatus.CANCELLED }
  ];

  const priorityOptions = [
    { value: '', label: t.tickets.filterPriority },
    { value: 'LOW', label: t.enums.ticketPriority.LOW },
    { value: 'MEDIUM', label: t.enums.ticketPriority.MEDIUM },
    { value: 'HIGH', label: t.enums.ticketPriority.HIGH },
    { value: 'URGENT', label: t.enums.ticketPriority.URGENT },
    { value: 'CRITICAL', label: t.enums.ticketPriority.CRITICAL }
  ];

  const techOptions = [
    { value: '', label: t.tickets.filterTech },
    ...users.map(u => ({ value: u.id, label: u.name }))
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.tickets.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.tickets.subtitle}
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/tickets/new')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5">add_circle</span>
          {t.tickets.createBtn}
        </Button>
      </header>

      {/* Advanced Filters */}
      <div className="flex flex-col gap-md bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm w-full">
          <Input
            type="text"
            placeholder="Buscar por número, título, descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            Buscar
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-sm items-center">
          <Select
            value={clientId}
            onChange={(e) => { setClientId(e.target.value); setPage(1); }}
            options={clientOptions}
          />
          <Select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={statusOptions}
          />
          <Select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            options={priorityOptions}
          />
          <Select
            value={assignedToId}
            onChange={(e) => { setAssignedToId(e.target.value); setPage(1); }}
            options={techOptions}
          />
        </div>

        {(search || clientId || status || priority || assignedToId) && (
          <div className="flex justify-end mt-1">
            <Button variant="ghost" onClick={handleClearFilters} className="text-error/80 hover:text-error py-1">
              {t.common.clearFilters}
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorState onRetry={fetchTickets} />}

      {/* Data Section */}
      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title={t.tickets.emptyList}
            description={t.states.emptyDescription}
            action={
              <Button variant="primary" onClick={() => router.push('/dashboard/tickets/new')}>
                {t.tickets.emptyListBtn}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={tickets}
              mobileRender={renderMobileCard}
              rowKey={(ticket) => ticket.id}
            />

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                Mostrando {tickets.length} de {meta.total} chamados (Pág. {meta.page} de {meta.totalPages})
              </span>
              <div className="flex gap-sm">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="py-1 px-4 text-xs"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="py-1 px-4 text-xs"
                >
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
