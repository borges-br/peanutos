'use client';

import { useWorkspaceFormatters } from '../../../../../i18n/useWorkspaceFormatters';

import React, { useState, useEffect } from 'react';
import { apiRequest, apiBlobRequest } from '../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../context/AuthContext';
import { useI18n } from '../../../../../i18n/useI18n';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';
import RestrictedState from '../../../../../components/ui/RestrictedState';

export default function InvoiceA4PreviewPage() {
  const { formatCalendarDate } = useWorkspaceFormatters();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState<any>(null);

  // PDF Generation & File Operations States
  const [existingDoc, setExistingDoc] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [genSuccess, setGenSuccess] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

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

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoice() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiRequest(`/invoices/${invoiceId}`);
        setInvoice(data);

        // Load dynamic HTML preview from API
        const token = localStorage.getItem('peanut_token');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const targetUrl = `${cleanBaseUrl}/invoices/${invoiceId}/preview`;

        const res = await fetch(targetUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const html = await res.text();
          setPreviewHtml(html);
        } else {
          console.error("Failed to load faithful preview:", res.statusText);
        }
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

  const handleDownloadPdf = async () => {
    if (!existingDoc || downloading) return;
    setDownloading(true);
    setGenError(null);
    try {
      const blob = await apiBlobRequest(`/documents/${existingDoc.id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeNumber = invoice.number.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `fatura-${safeNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setGenError(t.documents?.errors?.downloadFailed || "Falha ao baixar documento.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintPdf = async () => {
    if (!existingDoc || printing) return;
    setPrinting(true);
    setGenError(null);
    try {
      const blob = await apiBlobRequest(`/documents/${existingDoc.id}/inline`);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank', 'noopener,noreferrer');

      if (!printWindow) {
        setGenError(t.documents?.errors?.popupBlocked || "O navegador bloqueou a janela de impressão. Permita pop-ups para continuar.");
      } else {
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch (err: any) {
      setGenError(t.documents?.errors?.printFailed || "Falha ao abrir documento para impressão.");
    } finally {
      setPrinting(false);
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

  // Map generic documentActions list for A4PreviewShell header
  const documentActions: any[] = [];
  const showPdfAction = hasFinancialPrivilege;

  if (hasFinancialPrivilege) {
    if (!existingDoc) {
      documentActions.push({
        label: generating ? (t.invoices.pdf?.generating || "PDF em geração") : (t.invoices.pdf?.generate || "Gerar PDF"),
        icon: "picture_as_pdf",
        variant: "primary" as const,
        disabled: generating,
        loading: generating,
        onClick: handleGeneratePdf,
      });
    } else {
      documentActions.push({
        label: downloading ? "Baixando..." : (t.documents?.actions?.downloadPdf || "Baixar PDF"),
        icon: "download",
        variant: "primary" as const,
        disabled: downloading || printing,
        loading: downloading,
        onClick: handleDownloadPdf,
      });
      documentActions.push({
        label: printing ? "Carregando..." : (t.documents?.actions?.printPdf || "Imprimir PDF"),
        icon: "print",
        variant: "secondary" as const,
        disabled: downloading || printing,
        loading: printing,
        onClick: handlePrintPdf,
      });
      documentActions.push({
        label: t.invoices.pdf?.viewGenerated || "Ver Documento Gerado",
        icon: "folder_shared",
        variant: "outline" as const,
        disabled: downloading || printing,
        onClick: () => {
          router.push(`/dashboard/documentos?search=${invoice.number}`);
        },
      });
    }
  }

  return (
    <A4PreviewShell
      title={t.invoices.previewA4Title || "Preview A4 da Fatura"}
      subtitle={t.invoices.previewA4Subtitle || "Visualização do documento de cobrança oficial para impressão."}
      documentType={t.invoices.documentType || "FATURA COMERCIAL"}
      documentNumber={invoice.number}
      dateLabel={t.invoices.dueDate || "Vencimento"}
      dateValue={formatCalendarDate(invoice.dueDate)}
      clientName={invoice.client?.tradeName || invoice.clientName}
      clientDocument={invoice.client?.document || invoice.clientDocument}
      clientEmail={invoice.client?.email || invoice.clientEmail}
      statusBadge={getStatusBadge(invoice.status)}
      backPath={`/dashboard/invoices/${invoiceId}`}
      companyName={brandSettings?.brandName}
      companySub={brandSettings?.brandSubtitle}
      companyLogoUrl={brandSettings?.logoUrl}
      companyDocument={brandSettings?.companyDocument}
      companyEmail={brandSettings?.companyEmail}
      documentFooterText={brandSettings?.documentFooterText}
      signatureName={brandSettings?.signatureName}
      primaryColorHex={brandSettings?.primaryColorHex}
      showPdfAction={showPdfAction}
      documentActions={documentActions}
    >
      {!hasFinancialPrivilege ? (
        <div className="my-auto">
          <RestrictedState />
        </div>
      ) : (
        <div className="flex flex-col gap-md text-black select-text w-full">
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
          {(genError || error) && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-700 p-md rounded-lg text-body-sm flex items-center gap-sm mb-md font-sans">
              <span className="material-symbols-outlined text-red-600 text-[18px]">error</span>
              <span>{genError || error}</span>
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

          {previewHtml ? (
            <iframe
              srcDoc={previewHtml}
              className="w-full min-h-[920px] border border-outline-variant/30 rounded-lg shadow-inner bg-white"
              title="Faithful Invoice A4 Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="flex flex-col justify-center items-center py-xl gap-sm text-on-surface-variant font-body-sm">
              <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
              <p>Carregando layout fiel...</p>
            </div>
          )}
        </div>
      )}
    </A4PreviewShell>
  );
}
