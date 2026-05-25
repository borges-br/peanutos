'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';
import RestrictedState from '../../../../../components/ui/RestrictedState';

export default function InvoiceA4PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    async function loadInvoice() {
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
    }
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[200px] gap-sm text-on-surface-variant font-body-sm">
        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p>Carregando preview da fatura...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-center gap-md">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
          {error || 'Fatura não encontrada'}
        </div>
        <button
          onClick={() => router.push(`/dashboard/invoices`)}
          className="text-primary hover:underline font-semibold text-body-sm"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: any) => {
    if (!hasFinancialPrivilege) return 'Valor protegido';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericAmount);
  };

  const getStatusBadge = (statusValue: string) => {
    switch (statusValue) {
      case 'PAID':
        return <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-700 px-2.5 py-0.5 rounded font-bold uppercase">Liquidada</span>;
      case 'OVERDUE':
        return <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-700 px-2.5 py-0.5 rounded font-bold uppercase">Atrasada</span>;
      default:
        return <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 px-2.5 py-0.5 rounded font-bold uppercase">Pendente</span>;
    }
  };

  const servicesSubtotal = (invoice.items || [])
    .filter((i: any) => i.type === 'SERVICE')
    .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice), 0);

  const materialsSubtotal = (invoice.items || [])
    .filter((i: any) => i.type === 'MATERIAL')
    .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice), 0);

  return (
    <A4PreviewShell
      title="Preview A4 da Fatura"
      subtitle="Visualização do documento de cobrança oficial para impressão."
      documentType="FATURA COMERCIAL"
      documentNumber={invoice.number}
      dateLabel="Vencimento"
      dateValue={new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
      clientName={invoice.client?.tradeName}
      clientDocument={invoice.client?.document}
      clientEmail={invoice.client?.email}
      statusBadge={getStatusBadge(invoice.status)}
      backPath={`/dashboard/invoices/${invoiceId}`}
    >
      {!hasFinancialPrivilege ? (
        <div className="my-auto">
          <RestrictedState />
        </div>
      ) : (
        <div className="flex flex-col gap-md text-black select-text">
          <h3 className="font-bold text-xs uppercase text-black/50 border-b border-black/10 pb-1 tracking-wider mt-md">
            Detalhamento de Serviços e Recursos Cobrados
          </h3>

          {/* Table of Items */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/20 text-black/60 font-mono">
                <th className="py-2">Item / Descrição</th>
                <th className="py-2 text-center w-12">Qtd</th>
                <th className="py-2 text-center w-12">Un</th>
                <th className="py-2 text-right w-24">Valor Unit.</th>
                <th className="py-2 text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-mono">
              {(invoice.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2">
                    <span className="font-bold block text-black">{item.description}</span>
                    <span className="text-[9px] text-black/50 block">Mapeamento operacional faturado</span>
                  </td>
                  <td className="py-2 text-center">{parseFloat(item.quantity)}</td>
                  <td className="py-2 text-center">{item.unit || 'UN'}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-right font-bold">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="border-t-2 border-black pt-md mt-lg flex flex-col gap-1 items-end text-right font-mono">
            <div className="flex gap-md text-xs text-black/60">
              <span>Subtotal de Serviços:</span>
              <span>{formatCurrency(servicesSubtotal)}</span>
            </div>
            <div className="flex gap-md text-xs text-black/60">
              <span>Subtotal de Materiais:</span>
              <span>{formatCurrency(materialsSubtotal)}</span>
            </div>
            <div className="flex gap-md text-sm font-bold text-black mt-xs border-t border-black/15 pt-xs w-48 justify-end">
              <span>Total Liquidado:</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>

          {/* Payments Instructions */}
          <div className="mt-xl border border-black/15 bg-black/[0.01] p-md rounded-lg flex flex-col gap-2 font-mono text-[11px] text-black/70">
            <span className="font-bold text-black text-[10px] uppercase tracking-wide">
              Instruções de Pagamento e Recebimento
            </span>
            <div className="flex flex-col gap-0.5">
              <span>Favorecido: Peanut OS Central de TI LTDA</span>
              <span>Método preferencial: PIX (Chave Pix abaixo)</span>
              <span className="font-bold text-black">Chave PIX: {invoice.pixKey || 'financeiro@peanut.os.br'}</span>
            </div>
          </div>
        </div>
      )}
    </A4PreviewShell>
  );
}
