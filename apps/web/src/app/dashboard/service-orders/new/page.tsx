'use client';

import { useWorkspaceFormatters } from '../../../../i18n/useWorkspaceFormatters';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../../../lib/api';
import { extractArray } from '../../../../lib/api-shape';
import Button from '../../../../components/ui/Button';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { ClientPicker, QuickClientModal } from '../../../../components/clients/ClientPicker';

interface ServiceOrderItemInput {
  type: 'SERVICE' | 'MATERIAL';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
}

export default function NewServiceOrderPage() {
  const { localDateTimeToIso, timeZone } = useWorkspaceFormatters();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [laborMinutes, setLaborMinutes] = useState(0);
  const [clientNotes, setClientNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<ServiceOrderItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientPromptOpen, setClientPromptOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const [clientsRes, usersRes] = await Promise.all([
          apiRequest<unknown>('/clients?limit=100'),
          apiRequest<unknown>('/users?limit=100'),
        ]);
        setClients(extractArray(clientsRes));
        setUsers(extractArray(usersRes));
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar opções.');
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  const updateItem = (index: number, field: keyof ServiceOrderItemInput, value: any) => {
    const next = [...items];
    const item = { ...next[index] } as ServiceOrderItemInput;
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
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitServiceOrder = async (payload: any) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<any>('/service-orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/dashboard/service-orders/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Falha ao criar O.S.');
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
    if (!title.trim() || !description.trim()) {
      setError('Informe título e descrição da O.S.');
      return;
    }
    if (items.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.unitCost < 0)) {
      setError('Preencha os itens com descrição, quantidade positiva e valores válidos.');
      return;
    }

    let scheduledInstant: string | undefined;
    try {
      scheduledInstant = scheduledFor ? localDateTimeToIso(scheduledFor) : undefined;
    } catch (error: any) {
      setError(error.message || 'Agendamento inválido no fuso selecionado.');
      return;
    }
    const payload = {
      clientId: clientId || undefined,
      clientName: clientId ? undefined : trimmedClientName,
      responsibleUserId: responsibleUserId || undefined,
      title,
      description,
      scheduledFor: scheduledInstant,
      laborMinutes,
      clientNotes: clientNotes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
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

    await submitServiceOrder(payload);
  }

  return (
    <div className="flex flex-col gap-lg max-w-5xl mx-auto select-none">
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            Nova ordem de serviço
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            Registre a execução técnica e os materiais usados.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/service-orders')}>
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
        <Card title="Dados principais">
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
            <Select
              label="Responsável"
              value={responsibleUserId}
              onChange={(event) => setResponsibleUserId(event.target.value)}
              options={[
                { value: '', label: 'Não definido' },
                ...users.map((user) => ({ value: user.id, label: `${user.name} (${user.role})` })),
              ]}
              disabled={loading || saving}
            />
            <Input
              label="Título *"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={saving}
              required
            />
            <Input
              label={`Agendamento (${timeZone})`}
              aria-label={`Agendamento (${timeZone})`}
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              disabled={saving}
            />
            <Input
              label="Tempo estimado/real (min)"
              type="number"
              min="0"
              value={laborMinutes}
              onChange={(event) => setLaborMinutes(parseInt(event.target.value || '0', 10))}
              disabled={saving}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant mt-md">
            Descrição técnica *
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              rows={5}
              className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
              required
            />
          </label>
        </Card>

        <Card
          title="Atividades e materiais"
          headerAction={
            <Button type="button" variant="secondary" onClick={addItem} disabled={saving} className="py-1 px-3 text-xs">
              <span className="material-symbols-outlined text-[14px] mr-1">add</span>
              Adicionar item
            </Button>
          }
        >
          {items.length === 0 ? (
            <div className="border border-dashed border-outline-variant rounded-lg p-lg text-center text-sm text-on-surface-variant">
              Nenhum item adicional. A descrição técnica será usada no documento.
            </div>
          ) : (
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
                        label="Descrição"
                        value={item.description}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                        disabled={saving}
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
                        label="Venda unit. (R$)"
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
                  <Button type="button" variant="ghost" onClick={() => removeItem(index)} disabled={saving} className="text-error py-1 px-2 text-xs self-end">
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Observações">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant">
              Observações para o cliente
              <textarea
                value={clientNotes}
                onChange={(event) => setClientNotes(event.target.value)}
                disabled={saving}
                rows={5}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-on-surface-variant">
              Notas internas
              <textarea
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                disabled={saving}
                rows={5}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all resize-y"
              />
            </label>
          </div>
        </Card>

        <div className="flex justify-end gap-sm bg-surface border border-outline-variant p-lg rounded-xl shadow-xl">
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/service-orders')} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Salvar O.S.
          </Button>
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
          await submitServiceOrder(payload);
        }}
        onSkip={async () => {
          setClientPromptOpen(false);
          const payload = pendingPayload;
          setPendingPayload(null);
          if (payload) await submitServiceOrder(payload);
        }}
      />
    </div>
  );
}
