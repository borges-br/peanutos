'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';

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

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.quoteId as string;
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  async function fetchQuote() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/quotes/${quoteId}`);
      setQuote(response);
    } catch (err: any) {
      setError(err.message || 'Orçamento não encontrado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (quoteId) fetchQuote();
  }, [quoteId]);

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined) return 'Valor protegido';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  async function changeStatus(status: string) {
    if (!quote || statusSaving) return;
    setStatusSaving(true);
    try {
      const updated = await apiRequest<any>(`/quotes/${quoteId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setQuote((prev: any) => ({ ...prev, status: updated.status }));
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar status.');
    } finally {
      setStatusSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px] text-on-surface-variant">
        Carregando orçamento...
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex flex-col items-center justify-center gap-md p-xl">
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg">
          {error || 'Orçamento não encontrado.'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/quotes')}>
          Voltar para orçamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto select-none">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Orçamento {quote.number}
            </h2>
            <Badge variant={STATUS_VARIANTS[quote.status] || 'neutral'}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Badge>
          </div>
          <p className="text-[12px] text-on-surface-variant font-mono">
            Cliente: {quote.client?.tradeName || quote.clientName || '--'} · Validade: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/quotes')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
            Voltar
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/quotes/${quoteId}/preview`)}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
            Visualizar A4
          </Button>
        </div>
      </header>

      <Card title="Resumo comercial">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md text-[13px]">
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Cliente</span>
            <span className="font-semibold">{quote.client?.tradeName || quote.clientName || '--'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Serviços</span>
            <span className="font-mono">{formatCurrency(quote.subtotalServices)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Materiais</span>
            <span className="font-mono">{formatCurrency(quote.subtotalMaterials)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Total</span>
            <span className="font-mono text-primary font-bold">{formatCurrency(quote.totalAmount)}</span>
          </div>
        </div>
      </Card>

      <Card title="Ações de status">
        <div className="flex flex-wrap gap-sm">
          {quote.status === 'DRAFT' && (
            <>
              <Button variant="primary" onClick={() => changeStatus('SENT')} loading={statusSaving}>
                Enviar proposta
              </Button>
              <Button variant="danger" onClick={() => changeStatus('CANCELLED')} disabled={statusSaving}>
                Cancelar
              </Button>
            </>
          )}
          {quote.status === 'SENT' && (
            <>
              <Button variant="primary" onClick={() => changeStatus('ACCEPTED')} loading={statusSaving}>
                Aprovar
              </Button>
              <Button variant="outline" onClick={() => changeStatus('REJECTED')} disabled={statusSaving}>
                Recusar
              </Button>
              <Button variant="danger" onClick={() => changeStatus('CANCELLED')} disabled={statusSaving}>
                Cancelar
              </Button>
            </>
          )}
          {quote.status === 'ACCEPTED' && (
            <Button variant="danger" onClick={() => changeStatus('CANCELLED')} disabled={statusSaving}>
              Cancelar orçamento aprovado
            </Button>
          )}
          {['REJECTED', 'CANCELLED'].includes(quote.status) && (
            <span className="text-[13px] text-on-surface-variant">
              Este orçamento não possui novas transições disponíveis.
            </span>
          )}
        </div>
      </Card>

      <Card title="Itens">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant/70">
                <th className="py-2.5">Tipo</th>
                <th className="py-2.5">Descrição</th>
                <th className="py-2.5 text-center">Qtd</th>
                <th className="py-2.5 text-right">Unit.</th>
                <th className="py-2.5 text-right">Custo</th>
                <th className="py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {(quote.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3">
                    <Badge variant={item.type === 'SERVICE' ? 'info' : 'purple'}>
                      {item.type === 'SERVICE' ? 'Serviço' : 'Material'}
                    </Badge>
                  </td>
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-center font-mono">{Number(item.quantity)}</td>
                  <td className="py-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-right font-mono">{formatCurrency(item.unitCost || 0)}</td>
                  <td className="py-3 text-right font-mono font-bold">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {(quote.terms || quote.observations) && (
        <Card title="Termos e observações">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px] text-on-surface-variant whitespace-pre-wrap">
            <div>{quote.terms || 'Sem termos adicionais.'}</div>
            <div>{quote.observations || 'Sem observações.'}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
