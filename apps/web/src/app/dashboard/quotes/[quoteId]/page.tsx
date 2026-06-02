'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';

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

type QuoteItemInput = {
  type: 'SERVICE' | 'MATERIAL';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
};

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.quoteId as string;
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [validUntil, setValidUntil] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [terms, setTerms] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<QuoteItemInput[]>([]);

  async function fetchQuote() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<any>(`/quotes/${quoteId}`);
      setQuote(response);
      resetEditForm(response);
    } catch (err: any) {
      setError(err.message || 'Orcamento nao encontrado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (quoteId) fetchQuote();
  }, [quoteId]);

  const canEdit = quote && !['REJECTED', 'CANCELLED'].includes(quote.status);

  function resetEditForm(source = quote) {
    if (!source) return;
    setValidUntil(source.validUntil ? new Date(source.validUntil).toISOString().split('T')[0] || '' : '');
    setDiscountAmount(Number(source.discountAmount || 0));
    setTerms(source.terms || '');
    setObservations(source.observations || '');
    setItems((source.items || []).map((item: any) => ({
      type: item.type || 'SERVICE',
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unit: item.unit || 'UN',
      unitPrice: Number(item.unitPrice || 0),
      unitCost: Number(item.unitCost || 0),
    })));
  }

  const formatCurrency = (value: any) => {
    if (value === null || value === undefined) return 'Valor protegido';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const servicesSubtotal = items
    .filter((item) => item.type === 'SERVICE')
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const materialsSubtotal = items
    .filter((item) => item.type === 'MATERIAL')
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const materialCost = items
    .filter((item) => item.type === 'MATERIAL')
    .reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const totalAmount = Math.max(0, servicesSubtotal + materialsSubtotal - discountAmount);
  const netAmount = totalAmount - materialCost;

  const updateItem = (index: number, field: keyof QuoteItemInput, value: any) => {
    const next = [...items];
    const item = { ...next[index] } as QuoteItemInput;
    if (field === 'quantity' || field === 'unitPrice' || field === 'unitCost') {
      (item as any)[field] = parseFloat(value) || 0;
    } else {
      (item as any)[field] = value;
    }
    if (field === 'type' && value !== 'MATERIAL') item.unitCost = 0;
    next[index] = item;
    setItems(next);
  };

  const addItem = () => {
    setItems([...items, { type: 'SERVICE', description: '', quantity: 1, unit: 'UN', unitPrice: 0, unitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
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

  async function saveQuote() {
    if (!canEdit || saving) return;
    if (!validUntil) {
      setError('Informe a validade do orcamento.');
      return;
    }
    if (items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.unitCost < 0)) {
      setError('Preencha os itens com descricao, quantidade positiva e valores validos.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<any>(`/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          validUntil: new Date(validUntil).toISOString(),
          discountAmount,
          terms: terms.trim() || null,
          observations: observations.trim() || null,
          items: items.map((item) => ({
            type: item.type,
            description: item.description.trim(),
            quantity: item.quantity,
            unit: item.unit || 'UN',
            unitPrice: item.unitPrice,
            unitCost: item.type === 'MATERIAL' ? item.unitCost : 0,
          })),
        }),
      });
      setQuote(updated);
      resetEditForm(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar alteracoes do orcamento.');
    } finally {
      setSaving(false);
    }
  }

  const waitForPdfJob = async (jobId: string) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const status = await apiRequest<any>(`/documents/jobs/${jobId}`);
      if (status.status === 'completed') return status.result;
      if (status.status === 'failed') {
        throw new Error(status.failedReason || 'Falha ao gerar nova versao do PDF.');
      }
    }
    throw new Error('A geracao foi enfileirada, mas ainda nao terminou. Tente abrir a Central de Documentos em alguns instantes.');
  };

  async function generatePdfVersion() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await apiRequest<any>(`/documents/quotes/${quoteId}/generate-pdf`, { method: 'POST' });
      await waitForPdfJob(response.jobId);
    } catch (err: any) {
      setError(err.message || 'Falha ao gerar nova versao do PDF.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px] text-on-surface-variant">
        Carregando orcamento...
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="flex flex-col items-center justify-center gap-md p-xl">
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg">
          {error || 'Orcamento nao encontrado.'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/quotes')}>
          Voltar para orcamentos
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
              Orcamento {quote.number}
            </h2>
            <Badge variant={STATUS_VARIANTS[quote.status] || 'neutral'}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Badge>
          </div>
          <p className="text-[12px] text-on-surface-variant font-mono">
            Cliente: {quote.client?.tradeName || quote.clientName || '--'} - Validade: {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/quotes')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
            Voltar
          </Button>
          {canEdit && (
            <Button
              variant={editing ? 'outline' : 'secondary'}
              onClick={() => {
                if (editing) resetEditForm();
                setEditing(!editing);
              }}
              disabled={saving}
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">edit</span>
              {editing ? 'Cancelar edicao' : 'Editar'}
            </Button>
          )}
          <Button variant="secondary" onClick={() => router.push(`/dashboard/quotes/${quoteId}/preview`)}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
            Visualizar A4
          </Button>
          <Button variant="primary" onClick={generatePdfVersion} loading={generating} disabled={saving || generating}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">autorenew</span>
            Gerar nova versao PDF
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card title="Resumo comercial">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md text-[13px]">
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Cliente</span>
            <span className="font-semibold">{quote.client?.tradeName || quote.clientName || '--'}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Servicos</span>
            <span className="font-mono">{formatCurrency(editing ? servicesSubtotal : quote.subtotalServices)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Materiais</span>
            <span className="font-mono">{formatCurrency(editing ? materialsSubtotal : quote.subtotalMaterials)}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-on-surface-variant font-bold">Total</span>
            <span className="font-mono text-primary font-bold">{formatCurrency(editing ? totalAmount : quote.totalAmount)}</span>
          </div>
        </div>
      </Card>

      <Card title="Acoes de status">
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
              Cancelar orcamento aprovado
            </Button>
          )}
          {['REJECTED', 'CANCELLED'].includes(quote.status) && (
            <span className="text-[13px] text-on-surface-variant">
              Este orcamento nao possui novas transicoes disponiveis.
            </span>
          )}
        </div>
      </Card>

      <Card
        title={editing ? 'Editar itens e valores' : 'Itens'}
        headerAction={editing ? (
          <Button type="button" variant="secondary" onClick={addItem} disabled={saving} className="py-1 px-3 text-xs">
            <span className="material-symbols-outlined text-[14px] mr-1">add</span>
            Adicionar item
          </Button>
        ) : null}
      >
        {editing ? (
          <div className="flex flex-col gap-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <Input
                label="Validade"
                type="date"
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
                disabled={saving}
              />
              <Input
                label="Desconto (R$)"
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(parseFloat(event.target.value) || 0)}
                disabled={saving}
              />
              <div className="flex flex-col justify-end text-xs font-mono text-on-surface-variant">
                <span>Total: <strong className="text-primary">{formatCurrency(totalAmount)}</strong></span>
                <span>Liquido estimado: <strong className="text-success">{formatCurrency(netAmount)}</strong></span>
              </div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="p-md bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col gap-md">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-sm w-full">
                  <div className="md:col-span-2">
                    <Select
                      label="Tipo"
                      value={item.type}
                      onChange={(event) => updateItem(index, 'type', event.target.value)}
                      options={[
                        { value: 'SERVICE', label: 'Servico' },
                        { value: 'MATERIAL', label: 'Material' },
                      ]}
                      disabled={saving}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Input
                      label="Descricao"
                      value={item.description}
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="Qtd"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="Un."
                      value={item.unit}
                      onChange={(event) => updateItem(index, 'unit', event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label={item.type === 'MATERIAL' ? 'Venda unit. (R$)' : 'Unit. (R$)'}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Custo unit. (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitCost}
                      onChange={(event) => updateItem(index, 'unitCost', event.target.value)}
                      disabled={saving || item.type !== 'MATERIAL'}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                  <span>Total venda: {formatCurrency(item.quantity * item.unitPrice)}</span>
                  <span>Custo interno: {formatCurrency(item.type === 'MATERIAL' ? item.quantity * item.unitCost : 0)}</span>
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => removeItem(index)} disabled={saving} className="text-error py-1 px-2 text-xs">
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant">
                Termos comerciais
                <textarea
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  disabled={saving}
                  rows={4}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant">
                Observacoes
                <textarea
                  value={observations}
                  onChange={(event) => setObservations(event.target.value)}
                  disabled={saving}
                  rows={4}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
                />
              </label>
            </div>

            <div className="flex justify-end gap-sm border-t border-outline-variant/30 pt-md">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetEditForm();
                  setEditing(false);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="button" variant="primary" onClick={saveQuote} loading={saving}>
                Salvar alteracoes
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant/70">
                  <th className="py-2.5">Tipo</th>
                  <th className="py-2.5">Descricao</th>
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
                        {item.type === 'SERVICE' ? 'Servico' : 'Material'}
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

      {!editing && (quote.terms || quote.observations) && (
        <Card title="Termos e observacoes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px] text-on-surface-variant whitespace-pre-wrap">
            <div>{quote.terms || 'Sem termos adicionais.'}</div>
            <div>{quote.observations || 'Sem observacoes.'}</div>
          </div>
        </Card>
      )}
    </div>
  );
}
