'use client';

import { useWorkspaceFormatters } from '../../../i18n/useWorkspaceFormatters';

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
  SENT: 'Enviado',
  ACCEPTED: 'Aprovado',
  REJECTED: 'Recusado',
  CANCELLED: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DRAFT: 'neutral',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'error',
  CANCELLED: 'warning',
};

export default function QuotesPage() {
  const { formatCalendarDate } = useWorkspaceFormatters();
  const router = useRouter();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchQuotes() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      const response = await apiRequest<any>(`/quotes?${params.toString()}`);
      setQuotes(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar orçamentos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuotes();
  }, [status]);

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined) return 'Valor protegido';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value));
  };

  return (
    <div className="flex flex-col gap-lg select-none">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            Orçamentos
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            Propostas comerciais com serviços, materiais, custo interno e aceite.
          </p>
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/quotes/new')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
          Novo orçamento
        </Button>
      </header>

      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-end bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetchQuotes();
          }}
          className="flex gap-sm flex-1 max-w-2xl"
        >
          <Input
            type="text"
            placeholder="Buscar por número ou cliente..."
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
            { value: 'SENT', label: 'Enviado' },
            { value: 'ACCEPTED', label: 'Aprovado' },
            { value: 'REJECTED', label: 'Recusado' },
            { value: 'CANCELLED', label: 'Cancelado' },
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
                <th className="p-md font-label-caps uppercase">Cliente</th>
                <th className="p-md font-label-caps uppercase">Validade</th>
                <th className="p-md font-label-caps uppercase">Status</th>
                <th className="p-md font-label-caps uppercase text-right">Total</th>
                <th className="p-md font-label-caps uppercase text-right">Líquido</th>
                <th className="p-md font-label-caps uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-xl text-center text-on-surface-variant">
                    Carregando orçamentos...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-xl">
                    <EmptyState
                      title="Nenhum orçamento encontrado"
                      description="Crie uma proposta para serviços, equipamentos ou materiais antes de emitir a fatura."
                    />
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-surface-container/20 transition-colors">
                    <td className="p-md font-mono font-semibold text-primary">{quote.number}</td>
                    <td className="p-md">
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">{quote.client?.tradeName || quote.clientName || '--'}</span>
                        <span className="text-[11px] text-on-surface-variant">{quote.client?.legalName || (!quote.clientId ? 'Cliente avulso' : '')}</span>
                      </div>
                    </td>
                    <td className="p-md font-mono text-on-surface-variant">
                      {formatCalendarDate(quote.validUntil)}
                    </td>
                    <td className="p-md">
                      <Badge variant={STATUS_VARIANTS[quote.status] || 'neutral'}>
                        {STATUS_LABELS[quote.status] || quote.status}
                      </Badge>
                    </td>
                    <td className="p-md text-right font-mono font-semibold">
                      {formatCurrency(quote.totalAmount)}
                    </td>
                    <td className="p-md text-right font-mono text-success font-semibold">
                      {formatCurrency(quote.netAmount)}
                    </td>
                    <td className="p-md text-right">
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/quotes/${quote.id}`)}
                        className="py-1 px-2"
                        title="Abrir orçamento"
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
