'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../i18n/useI18n';
import { useAuth } from '../../../../context/AuthContext';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Card from '../../../../components/ui/Card';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import RestrictedState from '../../../../components/ui/RestrictedState';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'items' | 'totals' | 'history'>('summary');
  const [statusSaving, setStatusSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/invoices/${invoiceId}`);
      setInvoice(data);
      setEditItems(normalizeItemsForEdit(data.items || []));
    } catch (err: any) {
      setError(err.message || t.invoices.notFound || 'Fatura não encontrada.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await apiRequest<any>(`/audit-logs?search=${invoiceId}&entityType=INVOICE`);
      if (data && data.data) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error('Falha ao carregar histórico real da fatura:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
      fetchHistory();
    }
  }, [invoiceId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!hasFinancialPrivilege) return;
    let confirmMsg = '';
    if (newStatus === 'ISSUED') {
      confirmMsg = t.invoices.confirmIssueText || 'Deseja emitir esta fatura? Após emitida, ela poderá ser marcada como paga, atrasada ou cancelada.';
    } else if (newStatus === 'PAID') {
      confirmMsg = t.invoices.confirmPaidText || 'Deseja realmente marcar esta fatura como PAGA?';
    } else if (newStatus === 'OVERDUE') {
      confirmMsg = t.invoices.confirmOverdueText || 'Tem certeza que deseja marcar esta fatura como ATRASADA?';
    } else if (newStatus === 'CANCELLED') {
      confirmMsg = t.invoices.confirmCancelText || 'ATENÇÃO: Deseja realmente CANCELAR esta fatura?';
    }

    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }

    setStatusSaving(true);
    try {
      const updated = await apiRequest<any>(`/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setInvoice((prev: any) => ({ ...prev, status: updated.status }));
      fetchHistory();
    } catch (err: any) {
      alert(err.message || t.invoices.errorStatusChange || 'Falha ao alterar status da fatura.');
    } finally {
      setStatusSaving(false);
    }
  };

  const normalizeItemsForEdit = (items: any[]) =>
    items.map((item) => ({
      type: item.type || 'SERVICE',
      description: item.description || '',
      quantity: Number(item.quantity || 1),
      unit: item.unit || 'UN',
      unitPrice: Number(item.unitPrice || 0),
      unitCost: Number(item.unitCost || 0),
    }));

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const next = [...editItems];
    const item = { ...next[index] };
    if (['quantity', 'unitPrice', 'unitCost'].includes(field)) {
      item[field] = parseFloat(value) || 0;
    } else {
      item[field] = value;
    }
    if (field === 'type' && value !== 'MATERIAL') {
      item.unitCost = 0;
    }
    next[index] = item;
    setEditItems(next);
  };

  const handleAddEditItem = () => {
    setEditItems([
      ...editItems,
      { type: 'SERVICE', description: '', quantity: 1, unit: 'UN', unitPrice: 0, unitCost: 0 },
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    if (editItems.length <= 1) return;
    setEditItems(editItems.filter((_, idx) => idx !== index));
  };

  const handleCancelEditItems = () => {
    setEditItems(normalizeItemsForEdit(invoice.items || []));
    setEditingItems(false);
  };

  const handleSaveEditItems = async () => {
    if (!hasFinancialPrivilege || invoice.status !== 'DRAFT') return;
    if (editItems.some((item) => !item.description.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.unitCost < 0)) {
      alert('Preencha os itens com descrição, quantidade positiva e valores válidos.');
      return;
    }

    setEditSaving(true);
    try {
      const updated = await apiRequest<any>(`/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: editItems.map((item) => ({
            type: item.type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            unitCost: item.type === 'MATERIAL' ? item.unitCost : 0,
          })),
        }),
      });
      setInvoice(updated);
      setEditItems(normalizeItemsForEdit(updated.items || []));
      setEditingItems(false);
      fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Falha ao salvar itens da fatura.');
    } finally {
      setEditSaving(false);
    }
  };

  const isTransitionDisabled = (targetStatus: string) => {
    if (statusSaving || !invoice) return true;
    const currentStatus = invoice.status;
    if (currentStatus === targetStatus) return true;

    if (currentStatus === 'CANCELLED') return true;

    if (currentStatus === 'DRAFT') {
      return !['ISSUED', 'CANCELLED'].includes(targetStatus);
    }
    if (currentStatus === 'ISSUED') {
      return !['PAID', 'OVERDUE', 'CANCELLED'].includes(targetStatus);
    }
    if (currentStatus === 'OVERDUE') {
      return !['PAID', 'CANCELLED'].includes(targetStatus);
    }
    if (currentStatus === 'PAID') {
      return targetStatus !== 'CANCELLED' || !['OWNER', 'ADMIN'].includes(user?.role || '');
    }

    return true;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[200px] gap-sm text-on-surface-variant font-body-sm">
        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p>{t.invoices.loadingDetails || 'Carregando fatura...'}</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-center gap-md">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
          {error || t.invoices.notFound || 'Fatura não encontrada'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/invoices')}>
          {t.invoices.backToList || 'Voltar para Lista'}
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: any) => {
    if (amount === null || amount === undefined) {
      return t.invoices.protectedValue || 'Valor protegido';
    }
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericAmount);
  };

  const getStatusBadgeVariant = (statusValue: string) => {
    switch (statusValue) {
      case 'PAID': return 'success';
      case 'OVERDUE': return 'error';
      case 'ISSUED': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusLabel = (statusValue: string) => {
    const statuses = (t.invoices.statuses || {}) as Record<string, string>;
    return statuses[statusValue] || statusValue;
  };

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              {t.invoices.title.replace('s Comerciais', '')} {invoice.number}
            </h2>
            <Badge variant={getStatusBadgeVariant(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="text-[12px] text-on-surface-variant font-mono">
            {t.invoices.client}: {invoice.client?.tradeName || invoice.clientName || '--'} &bull; {t.invoices.issueDate || 'Emissão'}: {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        
        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/invoices')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
            {t.invoices.backBtn || t.common.back}
          </Button>

          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/invoices/${invoiceId}/preview`)}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
            {t.invoices.visualizeA4 || 'Visualizar A4'}
          </Button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex gap-xs border-b border-outline-variant/20 -mt-md">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'summary'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          {t.invoices.tabSummary || 'Resumo'}
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'items'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          {t.invoices.tabItems || 'Itens'}
        </button>
        <button
          onClick={() => setActiveTab('totals')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'totals'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          {t.invoices.tabTotals || 'Totais'}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'history'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          {t.invoices.tabHistory || 'Histórico'}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'summary' && (
        <div className="flex flex-col gap-lg animate-in fade-in duration-150">
          <Card title="Resumo do Faturamento">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md text-[13px] text-on-surface">
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60">{t.invoices.client}</span>
                <span className="font-semibold text-on-surface">{invoice.client?.tradeName || invoice.clientName || '--'}</span>
                <span className="text-[11px] text-on-surface-variant/70 font-mono">{invoice.client?.legalName || (!invoice.clientId ? 'Cliente avulso' : '')}</span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60">{t.invoices.dueDate}</span>
                <span className="font-semibold text-on-surface font-mono">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60">Método de Recebimento</span>
                <span className="font-semibold text-on-surface">{((t.invoices.paymentMethods || {}) as Record<string, string>)[invoice.paymentMethod] || invoice.paymentMethod}</span>
                {invoice.pixKey && <span className="text-[11px] text-on-surface-variant/70 font-mono">Pix: {invoice.pixKey}</span>}
              </div>
            </div>
          </Card>

          {hasFinancialPrivilege && (
            <Card title={t.invoices.actionsSection || 'Ações de Status Financeiro'}>
              <div className="flex flex-wrap gap-sm items-center">
                {invoice.status === 'DRAFT' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange('ISSUED')}
                      disabled={isTransitionDisabled('ISSUED')}
                      className="px-5 py-2"
                    >
                      {t.invoices.issueInvoiceBtn || 'Emitir Fatura'}
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={isTransitionDisabled('CANCELLED')}
                      className="px-5 py-2"
                    >
                      {t.invoices.cancelInvoiceBtn || 'Cancelar Fatura'}
                    </Button>
                  </>
                )}

                {invoice.status === 'ISSUED' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange('PAID')}
                      disabled={isTransitionDisabled('PAID')}
                      className="px-5 py-2"
                    >
                      {t.invoices.confirmPaidBtn || 'Confirmar Pagamento'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange('OVERDUE')}
                      disabled={isTransitionDisabled('OVERDUE')}
                      className="px-5 py-2"
                    >
                      {t.invoices.markOverdueBtn || 'Marcar como Atrasado'}
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={isTransitionDisabled('CANCELLED')}
                      className="px-5 py-2"
                    >
                      {t.invoices.cancelInvoiceBtn || 'Cancelar Fatura'}
                    </Button>
                  </>
                )}

                {invoice.status === 'OVERDUE' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange('PAID')}
                      disabled={isTransitionDisabled('PAID')}
                      className="px-5 py-2"
                    >
                      {t.invoices.confirmPaidBtn || 'Confirmar Pagamento'}
                    </Button>

                    <Button
                      variant="danger"
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={isTransitionDisabled('CANCELLED')}
                      className="px-5 py-2"
                    >
                      {t.invoices.cancelInvoiceBtn || 'Cancelar Fatura'}
                    </Button>
                  </>
                )}

                {invoice.status === 'PAID' && (
                  ['OWNER', 'ADMIN'].includes(user?.role || '') ? (
                    <Button
                      variant="danger"
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={isTransitionDisabled('CANCELLED')}
                      className="px-5 py-2"
                    >
                      {t.invoices.cancelInvoiceBtn || 'Cancelar Fatura'}
                    </Button>
                  ) : (
                    <div className="text-[13px] text-on-surface-variant italic">
                      {t.invoices.paidCancelRestricted || 'Somente administradores podem cancelar uma fatura paga.'}
                    </div>
                  )
                )}

                {invoice.status === 'CANCELLED' && (
                  <div className="text-[13px] text-on-surface-variant font-medium">
                    {t.invoices.noStatusTransitions || 'Fatura cancelada. Nenhuma nova transição de status está disponível.'}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="flex flex-col gap-md animate-in fade-in duration-150 select-text">
          <Card
            title="Detalhamento dos Itens Cobrados"
            headerAction={
              hasFinancialPrivilege && invoice.status === 'DRAFT' ? (
                editingItems ? (
                  <div className="flex gap-xs">
                    <Button variant="ghost" onClick={handleCancelEditItems} disabled={editSaving} className="py-1 px-3 text-xs">
                      Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSaveEditItems} loading={editSaving} disabled={editSaving} className="py-1 px-3 text-xs">
                      Salvar itens
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setEditingItems(true)} className="py-1 px-3 text-xs">
                    <span className="material-symbols-outlined text-[14px] mr-1">edit</span>
                    Editar itens
                  </Button>
                )
              ) : null
            }
          >
            {editingItems ? (
              <div className="flex flex-col gap-sm">
                {editItems.map((item, index) => (
                  <div key={index} className="p-md bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col gap-md">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-sm w-full">
                      <div className="md:col-span-2">
                        <Select
                          label="Tipo"
                          value={item.type}
                          onChange={(e) => handleEditItemChange(index, 'type', e.target.value)}
                          options={[
                            { value: 'SERVICE', label: 'Serviço' },
                            { value: 'MATERIAL', label: 'Material' },
                          ]}
                          disabled={editSaving}
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Input
                          label="Descrição"
                          value={item.description}
                          onChange={(e) => handleEditItemChange(index, 'description', e.target.value)}
                          disabled={editSaving}
                          required
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          label="Qtd"
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleEditItemChange(index, 'quantity', e.target.value)}
                          disabled={editSaving}
                          required
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          label="Un."
                          value={item.unit}
                          onChange={(e) => handleEditItemChange(index, 'unit', e.target.value)}
                          disabled={editSaving}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label={item.type === 'MATERIAL' ? 'Venda unit. (R$)' : 'Unit. (R$)'}
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleEditItemChange(index, 'unitPrice', e.target.value)}
                          disabled={editSaving}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="Custo unit. (R$)"
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleEditItemChange(index, 'unitCost', e.target.value)}
                          disabled={editSaving || item.type !== 'MATERIAL'}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                      <span>Total venda: {formatCurrency(item.quantity * item.unitPrice)}</span>
                      <span>Custo interno: {formatCurrency(item.type === 'MATERIAL' ? item.quantity * item.unitCost : 0)}</span>
                      {editItems.length > 1 && (
                        <Button variant="ghost" onClick={() => handleRemoveEditItem(index)} disabled={editSaving} className="text-error py-1 px-2 text-xs">
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={handleAddEditItem} disabled={editSaving} className="w-fit py-1 px-3 text-xs">
                  <span className="material-symbols-outlined text-[14px] mr-1">add</span>
                  Adicionar item
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant/70">
                    <th className="py-2.5 font-semibold">Tipo</th>
                    <th className="py-2.5 font-semibold">Descrição</th>
                    <th className="py-2.5 font-semibold text-center w-12">Qtd</th>
                    <th className="py-2.5 font-semibold text-center w-12">Un</th>
                    <th className="py-2.5 font-semibold text-right w-24">Valor Unit.</th>
                    {hasFinancialPrivilege && <th className="py-2.5 font-semibold text-right w-24">Custo Unit.</th>}
                    <th className="py-2.5 font-semibold text-right w-24">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {(invoice.items || []).map((item: any) => (
                    <tr key={item.id} className="text-on-surface">
                      <td className="py-3.5">
                        <Badge variant={item.type === 'SERVICE' ? 'info' : 'purple'} className="text-[9px] py-0 px-1">
                          {item.type === 'SERVICE' ? 'Serviço' : 'Material'}
                        </Badge>
                      </td>
                      <td className="py-3.5 max-w-[250px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3.5 text-center font-mono">{parseFloat(item.quantity)}</td>
                      <td className="py-3.5 text-center font-mono">{item.unit || 'UN'}</td>
                      <td className="py-3.5 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                      {hasFinancialPrivilege && <td className="py-3.5 text-right font-mono">{formatCurrency(item.unitCost || 0)}</td>}
                      <td className="py-3.5 text-right font-mono font-semibold">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'totals' && (
        <div className="flex flex-col gap-md animate-in fade-in duration-150 select-text">
          {!hasFinancialPrivilege ? (
            <RestrictedState />
          ) : (
            <Card title="Resumo de Valores da Cobrança">
              <div className="flex flex-col gap-sm max-w-md font-mono text-sm text-on-surface mt-sm">
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant font-sans">{t.invoices.servicesSubtotal}:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (invoice.items || [])
                        .filter((i: any) => i.type === 'SERVICE')
                        .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant font-sans">{t.invoices.materialsSubtotal}:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (invoice.items || [])
                        .filter((i: any) => i.type === 'MATERIAL')
                        .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice || 0), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant font-sans">Custo interno de materiais:</span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(invoice.subtotalMaterialCost || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 text-lg font-bold text-primary border-t-2 border-outline-variant mt-sm">
                  <span className="font-sans">{t.invoices.grandTotal}:</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-sm font-bold text-success">
                  <span className="font-sans">Líquido estimado:</span>
                  <span>{formatCurrency(invoice.netAmount ?? invoice.totalAmount)}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex flex-col gap-md animate-in fade-in duration-150">
          <Card title="Histórico de Auditoria & Alterações">
            <div className="flex flex-col gap-sm mt-sm">
              {loadingHistory ? (
                <div className="flex justify-center items-center py-4 text-xs font-mono text-on-surface-variant animate-pulse">
                  Carregando histórico real...
                </div>
              ) : history.length === 0 ? (
                <div className="p-md bg-surface-container-low border border-outline-variant/30 rounded-xl flex items-center justify-between text-[12px] text-on-surface-variant font-mono">
                  <span>Sem dados no histórico da fatura.</span>
                </div>
              ) : (
                history.map((log: any) => {
                  let eventLabel = log.action === 'invoice.created' ? (t.invoices.historyCreated || 'Fatura criada no sistema') : '';
                  
                  if (log.action === 'invoice.status_changed') {
                    const nextStatus = log.afterJson?.status;
                    if (nextStatus === 'PAID') {
                      eventLabel = t.invoices.historyPaid || 'Pagamento confirmado (Fatura liquidada)';
                    } else if (nextStatus === 'OVERDUE') {
                      eventLabel = t.invoices.historyOverdue || 'Status de atraso configurado';
                    } else if (nextStatus === 'CANCELLED') {
                      eventLabel = t.invoices.historyCancelled || 'Fatura CANCELADA permanentemente';
                    } else {
                      eventLabel = (t.invoices.statusUpdatedTo || 'Status atualizado para {status}').replace('{status}', getStatusLabel(nextStatus));
                    }
                  } else if (!eventLabel) {
                    eventLabel = log.action;
                  }

                  return (
                    <div key={log.id} className="p-md bg-surface-container-low border border-outline-variant/30 rounded-xl flex items-center justify-between text-[12px] text-on-surface-variant font-mono">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{eventLabel}</span>
                        <span>{t.invoices.byUser?.replace('{user}', log.actor?.name || 'Sistema') || `Por: ${log.actor?.name || 'Sistema'}`}</span>
                      </div>
                      <span className="text-on-surface-variant">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
