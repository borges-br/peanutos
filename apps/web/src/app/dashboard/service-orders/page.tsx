'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../lib/api';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em execução',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export default function ServiceOrdersPage() {
  const router = useRouter();
  const [serviceOrders, setServiceOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchServiceOrders() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const response = await apiRequest<any>(`/service-orders?${params.toString()}`);
      setServiceOrders(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar ordens de serviço.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServiceOrders();
  }, [status]);

  return (
    <div className="flex flex-col gap-lg select-none">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            Ordens de Serviço
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            Controle visitas, execuções técnicas, materiais usados e aceite do cliente.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/service-orders/new')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
          Nova O.S.
        </Button>
      </header>

      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-end bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetchServiceOrders();
          }}
          className="flex gap-sm flex-1 max-w-2xl"
        >
          <Input
            type="text"
            placeholder="Buscar por número, título, chamado ou cliente..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            Buscar
          </Button>
        </form>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: '', label: 'Todos os status' },
            { value: 'DRAFT', label: 'Rascunho' },
            { value: 'SCHEDULED', label: 'Agendada' },
            { value: 'IN_PROGRESS', label: 'Em execução' },
            { value: 'COMPLETED', label: 'Concluída' },
            { value: 'CANCELLED', label: 'Cancelada' },
          ]}
          className="md:min-w-[180px]"
        />
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant">
                <th className="p-md font-label-caps uppercase">Número</th>
                <th className="p-md font-label-caps uppercase">Título</th>
                <th className="p-md font-label-caps uppercase">Cliente</th>
                <th className="p-md font-label-caps uppercase">Agendamento</th>
                <th className="p-md font-label-caps uppercase">Responsável</th>
                <th className="p-md font-label-caps uppercase">Status</th>
                <th className="p-md font-label-caps uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-xl text-center text-on-surface-variant">
                    Carregando ordens de serviço...
                  </td>
                </tr>
              ) : serviceOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-xl">
                    <EmptyState
                      title="Nenhuma O.S. encontrada"
                      description="Crie uma ordem de serviço para uma visita, execução remota ou entrega técnica."
                    />
                  </td>
                </tr>
              ) : (
                serviceOrders.map((serviceOrder) => (
                  <tr key={serviceOrder.id} className="hover:bg-surface-container/20 transition-colors">
                    <td className="p-md font-mono font-semibold text-primary">{serviceOrder.number}</td>
                    <td className="p-md">
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">{serviceOrder.title}</span>
                        {serviceOrder.ticket && (
                          <span className="text-[11px] text-on-surface-variant">
                            Chamado {serviceOrder.ticket.number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-md">{serviceOrder.client?.tradeName || serviceOrder.clientName || '--'}</td>
                    <td className="p-md font-mono text-on-surface-variant">
                      {serviceOrder.scheduledFor
                        ? new Date(serviceOrder.scheduledFor).toLocaleString('pt-BR')
                        : '--'}
                    </td>
                    <td className="p-md">{serviceOrder.responsibleUser?.name || 'Não definido'}</td>
                    <td className="p-md">
                      <Badge variant={STATUS_VARIANTS[serviceOrder.status] || 'neutral'}>
                        {STATUS_LABELS[serviceOrder.status] || serviceOrder.status}
                      </Badge>
                    </td>
                    <td className="p-md text-right">
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/service-orders/${serviceOrder.id}`)}
                        className="py-1 px-2"
                        title="Abrir O.S."
                      >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
