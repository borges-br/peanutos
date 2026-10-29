'use client';

import { useWorkspaceFormatters } from '../../../../../i18n/useWorkspaceFormatters';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiBlobRequest, apiRequest } from '../../../../../lib/api';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';
import HtmlDocumentPreview from '../../../../../components/ui/HtmlDocumentPreview';

export default function QuotePreviewPage() {
  const { formatCalendarDate } = useWorkspaceFormatters();
  const params = useParams();
  const router = useRouter();
  const quoteId = params.quoteId as string;

  const [quote, setQuote] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [existingDoc, setExistingDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      setPreviewHtml(null);
      try {
        const data = await apiRequest<any>(`/quotes/${quoteId}`);
        setQuote(data);

        const preview = await apiBlobRequest(`/quotes/${quoteId}/preview`);
        setPreviewHtml(await preview.text());

        const docs = await apiRequest<any>(`/documents?entityType=QUOTE&entityId=${quoteId}&limit=1`);
        setExistingDoc(docs.data?.[0] || null);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar preview.');
      } finally {
        setLoading(false);
      }
    }
    if (quoteId) load();
  }, [quoteId]);

  async function generatePdf() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await apiRequest<any>(`/documents/quotes/${quoteId}/generate-pdf`, { method: 'POST' });
      const interval = window.setInterval(async () => {
        const status = await apiRequest<any>(`/documents/jobs/${response.jobId}`);
        if (status.status === 'completed') {
          window.clearInterval(interval);
          const docs = await apiRequest<any>(`/documents?entityType=QUOTE&entityId=${quoteId}&limit=1`);
          setExistingDoc(docs.data?.[0] || null);
          setGenerating(false);
        } else if (status.status === 'failed') {
          window.clearInterval(interval);
          setError(status.failedReason || 'Falha ao gerar PDF.');
          setGenerating(false);
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Falha ao iniciar geração de PDF.');
      setGenerating(false);
    }
  }

  async function downloadPdf() {
    if (!existingDoc || downloading) return;
    setDownloading(true);
    try {
      const blob = await apiBlobRequest(`/documents/${existingDoc.id}/download`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = existingDoc.file?.originalFilename || `orcamento-${quote?.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Falha ao baixar PDF.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div className="p-xl text-center text-on-surface-variant">Carregando preview...</div>;
  }

  if (error && !quote) {
    return (
      <div className="p-xl text-center">
        <div className="bg-error/10 border border-error/20 text-error p-md rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <A4PreviewShell
      fullDocument
      title="Preview A4 do Orçamento"
      subtitle="Proposta comercial com valores de venda; custos internos não aparecem no documento."
      documentType="ORÇAMENTO"
      documentNumber={quote?.number}
      dateLabel="Validade"
      dateValue={quote ? formatCalendarDate(quote.validUntil) : '--'}
      clientName={quote?.client?.tradeName || quote?.clientName}
      clientDocument={quote?.client?.document || quote?.clientDocument}
      clientEmail={quote?.client?.email || quote?.clientEmail}
      backPath={`/dashboard/quotes/${quoteId}`}
      documentActions={[
        existingDoc
          ? {
              label: downloading ? 'Baixando...' : 'Baixar PDF',
              icon: 'download',
              variant: 'primary' as const,
              loading: downloading,
              onClick: downloadPdf,
            }
          : {
              label: generating ? 'Gerando PDF...' : 'Gerar PDF',
              icon: 'picture_as_pdf',
              variant: 'primary' as const,
              loading: generating,
              onClick: generatePdf,
            },
        {
          label: 'Central',
          icon: 'folder_shared',
          variant: 'outline' as const,
          onClick: () => router.push(`/dashboard/documentos?search=${quote?.number || ''}`),
        },
      ]}
    >
      <div className="flex flex-col gap-md text-black select-text w-full">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-700 p-md rounded-lg text-body-sm">
            {error}
          </div>
        )}
        {previewHtml ? (
          <HtmlDocumentPreview html={previewHtml} title="Prévia do orçamento" />
        ) : (
          <div className="py-xl text-center text-on-surface-variant">Prévia indisponível.</div>
        )}
      </div>
    </A4PreviewShell>
  );
}
