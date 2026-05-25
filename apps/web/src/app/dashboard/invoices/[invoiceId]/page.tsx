'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../../i18n/useI18n';
import { useAuth } from '../../../../context/AuthContext';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Card from '../../../../components/ui/Card';
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

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/invoices/${invoiceId}`);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || 'Fatura não encontrada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!hasFinancialPrivilege) return;
    setStatusSaving(true);
    try {
      const updated = await apiRequest(`/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setInvoice((prev: any) => ({ ...prev, status: updated.status }));
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar status da fatura.');
    } finally {
      setStatusSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[200px] gap-sm text-on-surface-variant font-body-sm">
        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p>Carregando fatura...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-center gap-md">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
          {error || 'Fatura não encontrada'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/invoices')}>
          Voltar para Lista
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: any) => {
    if (!hasFinancialPrivilege) return 'Valor protegido';
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
    switch (statusValue) {
      case 'PAID': return 'Pago';
      case 'OVERDUE': return 'Atrasado';
      case 'ISSUED': return 'Emitido';
      default: return 'Rascunho';
    }
  };

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              Fatura {invoice.number}
            </h2>
            <Badge variant={getStatusBadgeVariant(invoice.status)}>
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="text-[12px] text-on-surface-variant font-mono">
            Cliente: {invoice.client?.tradeName} &bull; Emissão: {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}
          </p>
        </div>
        
        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push('/dashboard/invoices')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
            {t.common.back}
          </Button>

          <Button
            variant="secondary"
            onClick={() => router.push(`/dashboard/invoices/${invoiceId}/preview`)}
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">visibility</span>
            Visualizar A4
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
          Resumo
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'items'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Itens
        </button>
        <button
          onClick={() => setActiveTab('totals')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'totals'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Totais
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-md py-2 border-b-2 text-[13px] font-semibold transition-all duration-150 ${
            activeTab === 'history'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'summary' && (
        <div className="flex flex-col gap-lg animate-in fade-in duration-150">
          <Card title="Resumo do Faturamento">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md text-[13px] text-on-surface">
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60">Cliente</span>
                <span className="font-semibold text-on-surface">{invoice.client?.tradeName}</span>
                <span className="text-[11px] text-on-surface-variant/70 font-mono">{invoice.client?.legalName}</span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60">Vencimento</span>
                <span className="font-semibold text-on-surface font-mono">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant opacity-60">Método de Recebimento</span>
                <span className="font-semibold text-on-surface">{invoice.paymentMethod}</span>
                {invoice.pixKey && <span className="text-[11px] text-on-surface-variant/70 font-mono">Pix: {invoice.pixKey}</span>}
              </div>
            </div>
          </Card>

          {hasFinancialPrivilege && (
            <Card title="Ações de Status Financeiro">
              <div className="flex flex-wrap gap-sm">
                <Button
                  variant="primary"
                  onClick={() => handleStatusChange('PAID')}
                  disabled={statusSaving || invoice.status === 'PAID'}
                  className="px-5 py-2"
                >
                  Confirmar Pagamento (Pago)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('OVERDUE')}
                  disabled={statusSaving || invoice.status === 'OVERDUE'}
                  className="px-5 py-2"
                >
                  Marcar como Atrasado
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleStatusChange('CANCELLED')}
                  disabled={statusSaving || invoice.status === 'CANCELLED'}
                  className="px-5 py-2"
                >
                  Cancelar Fatura
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="flex flex-col gap-md animate-in fade-in duration-150 select-text">
          <Card title="Detalhamento dos Itens Cobrados">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant/70">
                    <th className="py-2.5 font-semibold">Tipo</th>
                    <th className="py-2.5 font-semibold">Descrição</th>
                    <th className="py-2.5 font-semibold text-center w-12">Qtd</th>
                    <th className="py-2.5 font-semibold text-center w-12">Un</th>
                    <th className="py-2.5 font-semibold text-right w-24">Valor Unit.</th>
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
                      <td className="py-3.5 text-right font-mono font-semibold">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  <span className="text-on-surface-variant font-sans">Subtotal de Serviços:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (invoice.items || [])
                        .filter((i: any) => i.type === 'SERVICE')
                        .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-on-surface-variant font-sans">Subtotal de Materiais:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (invoice.items || [])
                        .filter((i: any) => i.type === 'MATERIAL')
                        .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice), 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 text-lg font-bold text-primary border-t-2 border-outline-variant mt-sm">
                  <span className="font-sans">Valor Total Geral:</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
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
              <div className="p-md bg-surface-container-low border border-outline-variant/30 rounded-xl flex items-center justify-between text-[12px] text-on-surface-variant font-mono">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-on-surface">Fatura criada no sistema</span>
                  <span>Por: {user?.name || 'Administrador'}</span>
                </div>
                <span>{new Date(invoice.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              
              {invoice.status === 'PAID' && (
                <div className="p-md bg-green-500/5 border border-green-500/10 rounded-xl flex items-center justify-between text-[12px] text-green-400 font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Pagamento confirmado (Fatura liquidada)</span>
                    <span>Status atualizado para PAGO</span>
                  </div>
                  <span>{new Date(invoice.updatedAt).toLocaleString('pt-BR')}</span>
                </div>
              )}

              {invoice.status === 'OVERDUE' && (
                <div className="p-md bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-between text-[12px] text-red-400 font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Status de atraso configurado</span>
                    <span>Fatura marcada como INADIMPLENTE</span>
                  </div>
                  <span>{new Date(invoice.updatedAt).toLocaleString('pt-BR')}</span>
                </div>
              )}

              {invoice.status === 'CANCELLED' && (
                <div className="p-md bg-outline-variant/5 border border-outline-variant/10 rounded-xl flex items-center justify-between text-[12px] text-on-surface-variant/60 font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Fatura CANCELADA permanentemente</span>
                    <span>Cobrança desativada no workspace</span>
                  </div>
                  <span>{new Date(invoice.updatedAt).toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
