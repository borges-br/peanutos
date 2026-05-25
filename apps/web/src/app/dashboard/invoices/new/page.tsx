'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { extractArray } from '../../../../lib/api-shape';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Card from '../../../../components/ui/Card';

interface InvoiceItemInput {
  type: 'SERVICE' | 'MATERIAL';
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { t } = useI18n();

  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [pixKey, setPixKey] = useState('');
  const [items, setItems] = useState<InvoiceItemInput[]>([
    { type: 'SERVICE', description: '', quantity: 1, unit: 'UN', unitPrice: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load clients list
  useEffect(() => {
    async function loadClients() {
      setLoading(true);
      try {
        const res = await apiRequest<unknown>('/clients?limit=100');
        setClients(extractArray(res));
      } catch (err: any) {
        setError(t.invoices.errorCreate || 'Falha ao carregar lista de clientes.');
      } finally {
        setLoading(false);
      }
    }
    loadClients();

    const tenDaysLater = new Date();
    tenDaysLater.setDate(tenDaysLater.getDate() + 10);
    const defaultDate = tenDaysLater.toISOString().split('T')[0] || '';
    setDueDate(defaultDate);
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      { type: 'SERVICE', description: '', quantity: 1, unit: 'UN', unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };
    if (field === 'quantity' || field === 'unitPrice') {
      (item as any)[field] = parseFloat(value) || 0;
    } else {
      (item as any)[field] = value;
    }
    updated[index] = item as InvoiceItemInput;
    setItems(updated);
  };

  const calculateSubtotal = (type: 'SERVICE' | 'MATERIAL') => {
    return items
      .filter((item) => item.type === type)
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const servicesSubtotal = calculateSubtotal('SERVICE');
  const materialsSubtotal = calculateSubtotal('MATERIAL');
  const grandTotal = servicesSubtotal + materialsSubtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError(t.invoices.errorSelectClient || 'Selecione um cliente.');
      return;
    }
    if (!dueDate) {
      setError(t.invoices.errorSelectDueDate || 'Selecione uma data de vencimento.');
      return;
    }
    if (items.some((item) => !item.description.trim() || item.unitPrice < 0 || item.quantity <= 0)) {
      setError(t.invoices.errorFillItems || 'Preencha todos os campos dos itens com valores maiores que zero.');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      clientId,
      dueDate: new Date(dueDate).toISOString(),
      paymentMethod,
      pixKey: paymentMethod === 'PIX' && pixKey.trim() !== '' ? pixKey : undefined,
      items: items.map((item) => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      })),
    };

    try {
      const response = await apiRequest<any>('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (response && response.id) {
        router.push(`/dashboard/invoices/${response.id}`);
      } else {
        router.push('/dashboard/invoices');
      }
    } catch (err: any) {
      setError(err.message || t.invoices.errorCreate || 'Falha ao emitir fatura.');
    } finally {
      setSaving(false);
    }
  };

  const clientOptions = [
    { value: '', label: t.invoices.selectClient || 'Selecione um cliente...' },
    ...clients.map((c) => ({ value: c.id, label: c.tradeName })),
  ];

  const methodOptions = [
    { value: 'PIX', label: t.invoices.paymentMethods.PIX || 'PIX (Chave Pix)' },
    { value: 'TRANSFER', label: t.invoices.paymentMethods.TRANSFER || 'Transferência Bancária (TED/DOC)' },
    { value: 'CASH', label: t.invoices.paymentMethods.CASH || 'Dinheiro / Espécie' },
    { value: 'OTHER', label: t.invoices.paymentMethods.OTHER || 'Outros' },
    { value: 'BOLETO', label: 'Boleto Bancário (Planejado)', disabled: true }
  ];

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.invoices.newInvoice}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.invoices.newInvoiceSubtitle}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/invoices')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
          {t.invoices.backBtn || t.common.back}
        </Button>
      </header>

      {error && (
        <div className="bg-error-container/10 border border-error-container/20 text-error p-md rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        {/* Basic settings */}
        <Card title={t.clients.contextSections.cadastralData || "Identificação & Datas"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Select
              label={t.invoices.clientLabel || "Cliente *"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clientOptions}
              disabled={loading || saving}
              required
            />

            <Input
              label={t.invoices.dueDateLabel || "Data de Vencimento *"}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={saving}
              required
            />

            <Select
              label={t.invoices.paymentMethodLabel || "Método de Pagamento principal *"}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={methodOptions}
              disabled={saving}
              required
            />

            {paymentMethod === 'PIX' && (
              <Input
                label={t.invoices.pixKeyLabel || "Chave Pix para recebimento"}
                type="text"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                disabled={saving}
                placeholder={t.invoices.pixKeyPlaceholder || "Ex: CNPJ ou E-mail"}
              />
            )}
          </div>
        </Card>

        {/* Dynamic Items Table */}
        <Card
          title={t.invoices.itemsSection || "Itens da Fatura"}
          headerAction={
            <Button variant="secondary" type="button" onClick={handleAddItem} disabled={saving} className="py-1">
              {t.invoices.addItemBtn || '+ Adicionar Item'}
            </Button>
          }
        >
          <div className="flex flex-col gap-sm">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-md bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col md:flex-row gap-md items-end"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-sm w-full">
                  <div className="md:col-span-2">
                    <Select
                      label={t.invoices.itemTypeLabel || "Tipo"}
                      value={item.type}
                      onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                      options={[
                        { value: 'SERVICE', label: 'Serviço' },
                        { value: 'MATERIAL', label: 'Material' },
                      ]}
                      disabled={saving}
                    />
                  </div>

                  <div className="md:col-span-5">
                    <Input
                      label={t.invoices.itemDescriptionLabel || "Descrição do item *"}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder={t.invoices.itemDescriptionPlaceholder || "Ex: Licença mensal Office 365 ou horas de consultoria"}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Input
                      label={t.invoices.itemQuantityLabel || "Qtd"}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Input
                      label={t.invoices.itemUnitLabel || "Un."}
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Input
                      label={t.invoices.itemPriceLabel || "Unit. (R$) *"}
                      type="number"
                      step="0.01"
                      min="0.00"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                </div>

                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={saving}
                    className="text-error/80 hover:text-error hover:bg-error-container/10 p-2 border border-transparent rounded-lg"
                    title="Remover item"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Totalizing block */}
        <div className="flex flex-col md:flex-row gap-md justify-between items-start md:items-center bg-surface border border-outline-variant p-lg rounded-xl shadow-xl">
          <div className="flex flex-col gap-xs font-mono text-xs text-on-surface-variant">
            <span>{t.invoices.servicesSubtotal || "Serviços"}: R$ {servicesSubtotal.toFixed(2)}</span>
            <span>{t.invoices.materialsSubtotal || "Materiais"}: R$ {materialsSubtotal.toFixed(2)}</span>
            <span className="text-sm font-bold text-primary mt-1 border-t border-outline-variant/35 pt-1">
              {t.invoices.grandTotal || "Valor Total Geral"}: R$ {grandTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-sm self-end md:self-center">
            <Button variant="outline" type="button" onClick={() => router.push('/dashboard/invoices')} disabled={saving}>
              {t.invoices.cancelBtn || t.common.cancel}
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {t.invoices.createBtn || "Emitir Fatura"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

