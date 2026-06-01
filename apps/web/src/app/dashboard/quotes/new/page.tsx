'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import { extractArray } from '../../../../lib/api-shape';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { ClientPicker, QuickClientModal } from '../../../../components/clients/ClientPicker';

interface QuoteItemInput {
  type: 'SERVICE' | 'MATERIAL';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [terms, setTerms] = useState('');
  const [observations, setObservations] = useState('');
  const [items, setItems] = useState<QuoteItemInput[]>([
    { type: 'SERVICE', description: '', quantity: 1, unit: 'UN', unitPrice: 0, unitCost: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientPromptOpen, setClientPromptOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);

  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      try {
        const response = await apiRequest<unknown>('/clients?limit=100');
        setClients(extractArray(response));
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar clientes.');
      } finally {
        setLoading(false);
      }
    }
    loadClients();

    const tenDaysLater = new Date();
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    setValidUntil(tenDaysLater.toISOString().split('T')[0] || '');
  }, []);

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const submitQuote = async (payload: any) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<any>('/quotes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/dashboard/quotes/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Falha ao criar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedClientName = clientName.trim();
    if (!clientId && !trimmedClientName) {
      setError('Selecione um cliente ou informe o nome do cliente.');
      return;
    }
    if (!validUntil) {
      setError('Informe a validade do orçamento.');
      return;
    }
    if (items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.unitCost < 0)) {
      setError('Preencha os itens com descrição, quantidade positiva e valores válidos.');
      return;
    }

    const payload = {
      clientId: clientId || undefined,
      clientName: clientId ? undefined : trimmedClientName,
      validUntil: new Date(validUntil).toISOString(),
      discountAmount,
      terms: terms.trim() || undefined,
      observations: observations.trim() || undefined,
      items: items.map((item) => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        unitCost: item.type === 'MATERIAL' ? item.unitCost : 0,
      })),
    };

    if (!clientId) {
      setPendingPayload(payload);
      setClientPromptOpen(true);
      return;
    }

    await submitQuote(payload);
  }

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto select-none">
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            Novo orçamento
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            Monte a proposta com preço de venda e custo interno de materiais.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/quotes')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
          Voltar
        </Button>
      </header>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        <Card title="Identificação">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <ClientPicker
              clients={clients}
              clientId={clientId}
              clientName={clientName}
              onChange={(choice) => {
                setClientId(choice.clientId);
                setClientName(choice.clientName);
              }}
              loading={loading}
              disabled={loading || saving}
            />
            <Input
              label="Validade *"
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
              disabled={saving}
              required
            />
          </div>
        </Card>

        <Card
          title="Itens da proposta"
          headerAction={
            <Button type="button" variant="secondary" onClick={addItem} disabled={saving} className="py-1 px-3 text-xs">
              <span className="material-symbols-outlined text-[14px] mr-1">add</span>
              Adicionar item
            </Button>
          }
        >
          <div className="flex flex-col gap-sm">
            {items.map((item, index) => (
              <div key={index} className="p-md bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col gap-md">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-sm w-full">
                  <div className="md:col-span-2">
                    <Select
                      label="Tipo"
                      value={item.type}
                      onChange={(event) => updateItem(index, 'type', event.target.value)}
                      options={[
                        { value: 'SERVICE', label: 'Serviço' },
                        { value: 'MATERIAL', label: 'Material' },
                      ]}
                      disabled={saving}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Input
                      label="Descrição *"
                      value={item.description}
                      onChange={(event) => updateItem(index, 'description', event.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Input
                      label="Qtd"
                      type="number"
                      min="1"
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
          </div>
        </Card>

        <Card title="Condições e observações">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant">
              Termos comerciais
              <textarea
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
                disabled={saving}
                rows={5}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
                placeholder="Ex: proposta válida por 10 dias, pagamento 50/50..."
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant">
              Observações internas/cliente
              <textarea
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                disabled={saving}
                rows={5}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
              />
            </label>
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-md justify-between items-start md:items-center bg-surface border border-outline-variant p-lg rounded-xl shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-xl gap-y-xs font-mono text-sm">
            <span>Serviços: {formatCurrency(servicesSubtotal)}</span>
            <span>Materiais venda: {formatCurrency(materialsSubtotal)}</span>
            <span>Custo de materiais: {formatCurrency(materialCost)}</span>
            <label className="flex items-center gap-sm">
              Desconto:
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(parseFloat(event.target.value) || 0)}
                className="w-28 bg-background border border-outline-variant rounded px-2 py-1 text-right"
              />
            </label>
            <span className="font-bold text-primary">Total: {formatCurrency(totalAmount)}</span>
            <span className="font-bold text-success">Líquido estimado: {formatCurrency(netAmount)}</span>
          </div>
          <div className="flex gap-sm self-end md:self-center">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/quotes')} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Salvar orçamento
            </Button>
          </div>
        </div>
      </form>

      <QuickClientModal
        open={clientPromptOpen}
        initialName={clientName}
        onClose={() => setClientPromptOpen(false)}
        onCreated={async (client) => {
          const name = client.tradeName || client.legalName || clientName;
          setClients((current) => [client, ...current]);
          setClientId(client.id);
          setClientName(name);
          setClientPromptOpen(false);
          const payload = { ...pendingPayload, clientId: client.id, clientName: undefined };
          setPendingPayload(null);
          await submitQuote(payload);
        }}
        onSkip={async () => {
          setClientPromptOpen(false);
          const payload = pendingPayload;
          setPendingPayload(null);
          if (payload) await submitQuote(payload);
        }}
      />
    </div>
  );
}
