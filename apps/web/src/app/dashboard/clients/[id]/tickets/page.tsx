'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../../../lib/api';
import { useI18n } from '../../../../../i18n/useI18n';
import Button from '../../../../../components/ui/Button';
import Badge from '../../../../../components/ui/Badge';
import Input from '../../../../../components/ui/Input';
import Select from '../../../../../components/ui/Select';
import DataTable from '../../../../../components/ui/DataTable';
import EmptyState from '../../../../../components/ui/EmptyState';
import ClientContextTabs from '../../../../../components/layout/ClientContextTabs';
import ClientPageHeader from '../../../../../components/layout/ClientPageHeader';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

export default function ClientTicketsPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
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

  const getPriorityVariant = (ticketPriority: string): BadgeVariant => {
    switch (ticketPriority) {
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

  const getStatusVariant = (ticketStatus: string): BadgeVariant => {
    switch (ticketStatus) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'success';
      case 'OPEN':
      case 'TRIAGE':
        return 'info';
      case 'IN_PROGRESS':
        return 'purple';
      case 'WAITING_CLIENT':
      case 'WAITING_THIRD_PARTY':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getPriorityLabel = (ticketPriority: string) =>
    t.enums.ticketPriority[ticketPriority as keyof typeof t.enums.ticketPriority] || ticketPriority;

  const getStatusLabel = (ticketStatus: string) =>
    t.enums.ticketStatus[ticketStatus as keyof typeof t.enums.ticketStatus] || ticketStatus;

  const columns = [
    {
      header: t.tickets.number,
      render: (ticket: any) => (
        <div className="flex max-w-[320px] flex-col py-0.5">
          <span className="font-mono text-[11px] font-bold text-primary">{ticket.number}</span>
          <span className="mt-0.5 truncate font-semibold text-on-surface">{ticket.title}</span>
        </div>
      ),
    },
    {
      header: 'Ativo',
      render: (ticket: any) => (
        <span className="text-[13px] text-on-surface-variant">
          {ticket.asset ? `${ticket.asset.name} (${ticket.asset.type})` : '--'}
        </span>
      ),
    },
    {
      header: t.tickets.priority,
      render: (ticket: any) => (
        <Badge variant={getPriorityVariant(ticket.priority)}>{getPriorityLabel(ticket.priority)}</Badge>
      ),
    },
    {
      header: t.tickets.status,
      render: (ticket: any) => (
        <Badge variant={getStatusVariant(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
      ),
    },
    {
      header: t.tickets.tech,
      render: (ticket: any) => <span className="text-[13px] text-on-surface">{ticket.assignedTo?.name || '--'}</span>,
    },
    {
      header: t.common.actions,
      className: 'text-right',
      render: (ticket: any) => (
        <Button variant="outline" onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)} className="py-1 px-3 text-xs">
          {t.common.manage}
        </Button>
      ),
    },
  ];

  const renderMobileTicket = (ticket: any) => (
    <div className="flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <span className="font-mono text-[11px] font-bold text-primary">{ticket.number}</span>
          <span className="block truncate font-semibold text-on-surface">{ticket.title}</span>
        </div>
        <Badge variant={getStatusVariant(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-xs border-y border-outline-variant/30 py-sm text-[12px]">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{t.tickets.priority}</span>
          <span className="text-on-surface">{getPriorityLabel(ticket.priority)}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{t.tickets.tech}</span>
          <span className="truncate text-on-surface">{ticket.assignedTo?.name || '--'}</span>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Ativo</span>
          <span className="truncate text-on-surface">{ticket.asset ? `${ticket.asset.name} (${ticket.asset.type})` : '--'}</span>
        </div>
      </div>
      <Button variant="outline" onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)} className="w-full py-2">
        {t.common.manage}
      </Button>
    </div>
  );

  const clientName = client?.tradeName || client?.legalName || t.clients.title;
  const breadcrumbs = [
    { label: t.clients.title, href: '/dashboard/clients' },
    { label: clientName, href: `/dashboard/clients/${clientId}` },
    { label: t.clients.tabs.tickets },
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
    { value: 'CANCELLED', label: t.enums.ticketStatus.CANCELLED },
  ];
  const priorityOptions = [
    { value: '', label: t.tickets.filterPriority },
    { value: 'LOW', label: t.enums.ticketPriority.LOW },
    { value: 'MEDIUM', label: t.enums.ticketPriority.MEDIUM },
    { value: 'HIGH', label: t.enums.ticketPriority.HIGH },
    { value: 'URGENT', label: t.enums.ticketPriority.URGENT },
    { value: 'CRITICAL', label: t.enums.ticketPriority.CRITICAL },
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={breadcrumbs}
        title={t.clients.pages.ticketsTitle.replace('{name}', clientName)}
        description={t.clients.pages.ticketsDescription}
        primaryActions={
          <Button variant="primary" onClick={() => router.push('/dashboard/tickets/new')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
            {t.clients.actions.newTicket}
          </Button>
        }
        tabs={<ClientContextTabs clientId={clientId} />}
      />

      <div className="flex flex-col gap-md rounded-xl border border-outline-variant bg-surface p-md shadow-lg md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-col gap-sm sm:flex-row md:max-w-xl">
          <Input
            type="text"
            placeholder="Buscar por número, título, descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            {t.common.searchAction}
          </Button>
        </form>

        <div className="flex flex-col gap-sm sm:flex-row">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={statusOptions}
            className="min-w-[190px]"
          />
          <Select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            options={priorityOptions}
            className="min-w-[180px]"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error-container/20 bg-error-container/10 p-md text-sm text-error">
          {error}
        </div>
      )}

      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl border border-outline-variant/30 bg-surface-container-low animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState
            title={t.clients.empty.tickets}
            description={t.states.emptyDescription}
            action={
              <Button variant="outline" onClick={() => router.push('/dashboard/tickets/new')}>
                {t.clients.actions.firstTicket}
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={tickets}
              mobileRender={renderMobileTicket}
              rowKey={(ticket) => ticket.id}
            />

            <div className="flex flex-col items-center justify-between gap-md border-t border-outline-variant/30 px-md pt-md sm:flex-row">
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
                  {t.common.previous}
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="py-1 px-4 text-xs"
                >
                  {t.common.next}
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
