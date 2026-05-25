'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import { useI18n } from '../../../../../i18n/useI18n';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';
import RestrictedState from '../../../../../components/ui/RestrictedState';

export default function InvoiceA4PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState<any>(null);

  // PDF Generation States
  const [existingDoc, setExistingDoc] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    async function loadBrand() {
      try {
        const data = await apiRequest('/settings/brand');
        setBrandSettings(data);
      } catch (err) {
        console.error("Failed to load brand settings:", err);
      }
    }
    loadBrand();
  }, []);

  useEffect(() => {
    async function loadInvoice() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest(`/invoices/${invoiceId}`);
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || t.invoices.notFound || 'Fatura não encontrada.');
      } finally {
        setLoading(false);
      }
    }
    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  useEffect(() => {
    async function checkExistingDoc() {
      try {
        const response = await apiRequest(`/documents?entityType=INVOICE&entityId=${invoiceId}&limit=1`);
        if (response?.data && response.data.length > 0) {
          setExistingDoc(response.data[0]);
        }
      } catch (err) {
        console.error("Failed to check existing document:", err);
      }
    }
    if (invoiceId && hasFinancialPrivilege) {
      checkExistingDoc();
    }
  }, [invoiceId, hasFinancialPrivilege]);

  const handleGeneratePdf = async () => {
    if (!hasFinancialPrivilege || generating) return;
    setGenerating(true);
    setGenError(null);
    setGenSuccess(false);

    try {
      const response = await apiRequest<any>(`/documents/invoices/${invoiceId}/generate-pdf`, {
        method: 'POST',
      });
      const jobId = response.jobId;
      
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await apiRequest<any>(`/documents/jobs/${jobId}`);
          if (jobStatus.status === 'completed') {
            clearInterval(pollInterval);
            setGenerating(false);
            setGenSuccess(true);
            
            // Reload existing doc
            const updatedDocResponse = await apiRequest(`/documents?entityType=INVOICE&entityId=${invoiceId}&limit=1`);
            if (updatedDocResponse?.data && updatedDocResponse.data.length > 0) {
              setExistingDoc(updatedDocResponse.data[0]);
            }
          } else if (jobStatus.status === 'failed') {
            clearInterval(pollInterval);
            setGenerating(false);
            setGenError(jobStatus.failedReason || t.invoices.pdf?.failure || 'Falha ao gerar PDF.');
          }
        } catch (pollErr) {
          console.error("Failed polling job status:", pollErr);
        }
      }, 1500);
    } catch (err: any) {
      setGenerating(false);
      setGenError(err.message || t.invoices.pdf?.failure || 'Falha ao iniciar geração de PDF.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[200px] gap-sm text-on-surface-variant font-body-sm">
        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p>{t.invoices.loadingDetails || 'Carregando preview da fatura...'}</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-center gap-md">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
          {error || t.invoices.notFound || 'Fatura não encontrada'}
        </div>
        <button
          onClick={() => router.push(`/dashboard/invoices`)}
          className="text-primary hover:underline font-semibold text-body-sm"
        >
          {t.invoices.backToList || 'Voltar para Lista'}
        </button>
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
    .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice || 0), 0);

  const materialsSubtotal = (invoice.items || [])
    .filter((i: any) => i.type === 'MATERIAL')
    .reduce((sum: number, i: any) => sum + parseFloat(i.totalPrice || 0), 0);

  // Dynamic A4PreviewShell PDF Button props
  let pdfActionLabel = t.invoices.pdf?.generate || "Gerar PDF";
  let onPdfAction: (() => void) | undefined = undefined;
  let pdfActionLoading = false;
  let pdfActionDisabled = false;
  const showPdfAction = hasFinancialPrivilege;

  if (hasFinancialPrivilege) {
    if (generating) {
      pdfActionLabel = t.invoices.pdf?.generating || "PDF em geração";
      pdfActionLoading = true;
      pdfActionDisabled = true;
    } else if (existingDoc) {
      pdfActionLabel = "Ver Documento Gerado";
      onPdfAction = () => {
        router.push(`/dashboard/documentos?search=${invoice.number}`);
      };
    } else {
      pdfActionLabel = t.invoices.pdf?.generate || "Gerar PDF";
      onPdfAction = handleGeneratePdf;
    }
  }

  return (
    <A4PreviewShell
      title={t.invoices.previewA4Title || "Preview A4 da Fatura"}
      subtitle={t.invoices.previewA4Subtitle || "Visualização do documento de cobrança oficial para impressão."}
      documentType={t.invoices.documentType || "FATURA COMERCIAL"}
      documentNumber={invoice.number}
      dateLabel={t.invoices.dueDate || "Vencimento"}
      dateValue={new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
      clientName={invoice.client?.tradeName}
      clientDocument={invoice.client?.document}
      clientEmail={invoice.client?.email}
      statusBadge={getStatusBadge(invoice.status)}
      backPath={`/dashboard/invoices/${invoiceId}`}
      companyName={brandSettings?.brandName}
      companySub={brandSettings?.brandSubtitle}
      companyDocument={brandSettings?.companyDocument}
      companyEmail={brandSettings?.companyEmail}
      documentFooterText={brandSettings?.documentFooterText}
      signatureName={brandSettings?.signatureName}
      primaryColorHex={brandSettings?.primaryColorHex}
      pdfActionLabel={pdfActionLabel}
      onPdfAction={onPdfAction}
      pdfActionDisabled={pdfActionDisabled}
      pdfActionLoading={pdfActionLoading}
      showPdfAction={showPdfAction}
    >
      {!hasFinancialPrivilege ? (
        <div className="my-auto">
          <RestrictedState />
        </div>
      ) : (
        <div className="flex flex-col gap-md text-black select-text">
          {/* Success Banner */}
          {genSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-800 p-md rounded-lg text-body-sm flex justify-between items-center mb-md font-sans">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                <span>{t.invoices.pdf?.registered || "Documento gerado e registrado na Central de Documentos"}</span>
              </div>
              <button
                onClick={() => router.push('/dashboard/documentos')}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition"
              >
                {t.invoices.pdf?.openCentral || "Abrir Central de Documentos"}
              </button>
            </div>
          )}

          {/* Error Banner */}
          {genError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-700 p-md rounded-lg text-body-sm flex items-center gap-sm mb-md font-sans">
              <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
              <span>{genError}</span>
            </div>
          )}

          {/* Existing Document Notice */}
          {existingDoc && !genSuccess && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-800 p-md rounded-lg text-body-sm flex justify-between items-center mb-md font-sans">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">info</span>
                <span>Esta fatura já possui uma versão em PDF gerada na Central de Documentos.</span>
              </div>
              <button
                onClick={() => router.push(`/dashboard/documentos?search=${invoice.number}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded transition"
              >
                Ver na Central
              </button>
            </div>
          )}

          <h3 className="font-bold text-xs uppercase text-black/50 border-b border-black/10 pb-1 tracking-wider mt-md">
            {t.invoices.previewSectionTitle || "Detalhamento de Serviços e Recursos Cobrados"}
          </h3>

          {/* Table of Items */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/20 text-black/60 font-mono">
                <th className="py-2">{t.invoices.tableDescription || "Item / Descrição"}</th>
                <th className="py-2 text-center w-12">{t.invoices.tableQty || "Qtd"}</th>
                <th className="py-2 text-center w-12">{t.invoices.tableUnit || "Un"}</th>
                <th className="py-2 text-right w-24">{t.invoices.tableUnitPrice || "Valor Unit."}</th>
                <th className="py-2 text-right w-24">{t.invoices.tableTotal || "Total"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-mono">
              {(invoice.items || []).map((item: any) => (
                <tr key={item.id}>
                  <td className="py-2">
                    <span className="font-bold block text-black">{item.description}</span>
                    <span className="text-[9px] text-black/50 block">{t.invoices.mappingDescription || "Mapeamento operacional faturado"}</span>
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
              <span>{t.invoices.servicesSubtotalA4 || "Subtotal de Serviços:"}</span>
              <span>{formatCurrency(servicesSubtotal)}</span>
            </div>
            <div className="flex gap-md text-xs text-black/60">
              <span>{t.invoices.materialsSubtotalA4 || "Subtotal de Materiais:"}</span>
              <span>{formatCurrency(materialsSubtotal)}</span>
            </div>
            <div className="flex gap-md text-sm font-bold text-black mt-xs border-t border-black/15 pt-xs w-48 justify-end">
              <span>{t.invoices.totalA4 || "Total Liquidado:"}</span>
              <span>{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>

          {/* Payments Instructions */}
          <div className="mt-xl border border-black/15 bg-black/[0.01] p-md rounded-lg flex flex-col gap-2 font-mono text-[11px] text-black/70">
            <span className="font-bold text-black text-[10px] uppercase tracking-wide">
              {t.invoices.instructionsTitle || "Instruções de Pagamento e Recebimento"}
            </span>
            <div className="flex flex-col gap-0.5">
              <span>
                {t.invoices.favoredLabel?.replace(
                  '{favored}',
                  brandSettings?.legalName || brandSettings?.brandName || 'Dados do favorecido configuráveis'
                ) || `Favorecido: ${brandSettings?.legalName || brandSettings?.brandName || 'Dados do favorecido configuráveis'}`}
              </span>
              <span>{t.invoices.preferentialMethod || "Método preferencial: PIX (Chave Pix abaixo)"}</span>
              <span className="font-bold text-black">
                {t.invoices.pixKeyLabelA4?.replace('{key}', invoice.pixKey || 'Chave Pix não configurada') || `Chave PIX: ${invoice.pixKey || 'Chave Pix não configurada'}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </A4PreviewShell>
  );
}
