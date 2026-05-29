'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';

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

export default function ServiceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceOrderId = params.serviceOrderId as string;
  const [serviceOrder, setServiceOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  async function fetchServiceOrder() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/service-orders/${serviceOrderId}`);
      setServiceOrder(response);
    } catch (err: any) {
      setError(err.message || 'O.S. não encontrada.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (serviceOrderId) fetchServiceOrder();
  }, [serviceOrderId]);

  const formatCurrency = (value: any) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  async function changeStatus(status: string) {
    if (!serviceOrder || statusSaving) return;
    setStatusSaving(true);
    try {
      const updated = await apiRequest<any>(`/service-orders/${serviceOrderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setServiceOrder((prev: any) => ({
        ...prev,
        status: updated.status,
        startedAt: updated.startedAt || prev.startedAt,
        completedAt: updated.completedAt || prev.completedAt,
      }));
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar status.');
    } finally {
      setStatusSaving(false);
    }
  }

  if (loading) return <div className="p-xl text-center text-on-surface-variant">Carregando O.S...</div>;

  if (error || !serviceOrder) {
    return (
      <div className="flex flex-col items-center justify-center gap-md p-xl">
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg">
          {error || 'O.S. não encontrada.'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/service-orders')}>
          Voltar para O.S.
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
              O.S. {serviceOrder.number}
            </h2>
            <Badge variant={STATUS_VARIANTS[serviceOrder.status] || 'neutral'}>
              {STATUS_LABELS[serviceOrder.status] || serviceOrder.status}
            </Badge>
          </div>
          <p className="text-[12px] text-on-surface-variant font-mono">
            {serviceOrder.title} · Cliente: {serviceOrder.client?.tradeName}
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/service-orders')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
            Voltar
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/dashboard/service-orders/${serviceOrderId}/preview`)}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
            Visualizar A4
          </Button>
        </div>
      </header>

      <Card title="Resumo da execução">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md text-[13px]">
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Cliente</span>
            <span className="font-semibold">{serviceOrder.client?.tradeName}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Responsável</span>
            <span>{serviceOrder.responsibleUser?.name || 'Não definido'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Agendamento</span>
            <span className="font-mono">
              {serviceOrder.scheduledFor ? new Date(serviceOrder.scheduledFor).toLocaleString('pt-BR') : '--'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Tempo</span>
            <span className="font-mono">{serviceOrder.laborMinutes || 0} min</span>
          </div>
        </div>
      </Card>

      <Card title="Ações de status">
        <div className="flex flex-wrap gap-sm">
          {serviceOrder.status === 'DRAFT' && (
            <>
              <Button variant="primary" onClick={() => changeStatus('SCHEDULED')} loading={statusSaving}>
                Agendar
              </Button>
              <Button variant="secondary" onClick={() => changeStatus('IN_PROGRESS')} disabled={statusSaving}>
                Iniciar agora
              </Button>
              <Button variant="danger" onClick={() => changeStatus('CANCELLED')} disabled={statusSaving}>
                Cancelar
              </Button>
            </>
          )}
          {serviceOrder.status === 'SCHEDULED' && (
            <>
              <Button variant="primary" onClick={() => changeStatus('IN_PROGRESS')} loading={statusSaving}>
                Iniciar execução
              </Button>
              <Button variant="secondary" onClick={() => changeStatus('COMPLETED')} disabled={statusSaving}>
                Concluir
              </Button>
              <Button variant="danger" onClick={() => changeStatus('CANCELLED')} disabled={statusSaving}>
                Cancelar
              </Button>
            </>
          )}
          {serviceOrder.status === 'IN_PROGRESS' && (
            <>
              <Button variant="primary" onClick={() => changeStatus('COMPLETED')} loading={statusSaving}>
                Concluir O.S.
              </Button>
              <Button variant="danger" onClick={() => changeStatus('CANCELLED')} disabled={statusSaving}>
                Cancelar
              </Button>
            </>
          )}
          {['COMPLETED', 'CANCELLED'].includes(serviceOrder.status) && (
            <span className="text-[13px] text-on-surface-variant">
              Esta ordem de serviço está finalizada para novas transições.
            </span>
          )}
        </div>
      </Card>

      <Card title="Descrição técnica">
        <p className="text-[13px] text-on-surface-variant whitespace-pre-wrap">{serviceOrder.description}</p>
      </Card>

      <Card title="Itens e materiais">
        {(serviceOrder.items || []).length === 0 ? (
          <div className="text-[13px] text-on-surface-variant">
            Nenhum item adicional registrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant/70">
                  <th className="py-2.5">Tipo</th>
                  <th className="py-2.5">Descrição</th>
                  <th className="py-2.5 text-center">Qtd</th>
                  <th className="py-2.5 text-right">Venda</th>
                  <th className="py-2.5 text-right">Custo</th>
                  <th className="py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {serviceOrder.items.map((item: any) => (
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
        )}
      </Card>

      {(serviceOrder.clientNotes || serviceOrder.internalNotes) && (
        <Card title="Notas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px] text-on-surface-variant whitespace-pre-wrap">
            <div>{serviceOrder.clientNotes || 'Sem observações ao cliente.'}</div>
            <div>{serviceOrder.internalNotes || 'Sem notas internas.'}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
