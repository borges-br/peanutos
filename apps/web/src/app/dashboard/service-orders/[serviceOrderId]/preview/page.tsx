'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiBlobRequest, apiRequest } from '../../../../../lib/api';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';

export default function ServiceOrderPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const serviceOrderId = params.serviceOrderId as string;
  const [serviceOrder, setServiceOrder] = useState<any>(null);
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
      try {
        const data = await apiRequest<any>(`/service-orders/${serviceOrderId}`);
        setServiceOrder(data);

        const token = localStorage.getItem('peanut_token');
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const url = `${baseUrl.replace(/\/$/, '')}/service-orders/${serviceOrderId}/preview`;
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) setPreviewHtml(await response.text());

        const docs = await apiRequest<any>(`/documents?entityType=SERVICE_ORDER&entityId=${serviceOrderId}&limit=1`);
        setExistingDoc(docs.data?.[0] || null);
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar preview.');
      } finally {
        setLoading(false);
      }
    }
    if (serviceOrderId) load();
  }, [serviceOrderId]);

  async function generatePdf() {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await apiRequest<any>(`/documents/service-orders/${serviceOrderId}/generate-pdf`, { method: 'POST' });
      const interval = window.setInterval(async () => {
        const status = await apiRequest<any>(`/documents/jobs/${response.jobId}`);
        if (status.status === 'completed') {
          window.clearInterval(interval);
          const docs = await apiRequest<any>(`/documents?entityType=SERVICE_ORDER&entityId=${serviceOrderId}&limit=1`);
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
      link.download = existingDoc.file?.originalFilename || `os-${serviceOrder?.number}.pdf`;
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

  if (loading) return <div className="p-xl text-center text-on-surface-variant">Carregando preview...</div>;

  return (
    <A4PreviewShell
      title="Preview A4 da Ordem de Serviço"
      subtitle="Documento técnico para execução, aceite e histórico operacional."
      documentType="ORDEM DE SERVIÇO"
      documentNumber={serviceOrder?.number}
      dateLabel="Agendamento"
      dateValue={serviceOrder?.scheduledFor ? new Date(serviceOrder.scheduledFor).toLocaleString('pt-BR') : '--'}
      clientName={serviceOrder?.client?.tradeName || serviceOrder?.clientName}
      clientDocument={serviceOrder?.client?.document || serviceOrder?.clientDocument}
      clientEmail={serviceOrder?.client?.email || serviceOrder?.clientEmail}
      backPath={`/dashboard/service-orders/${serviceOrderId}`}
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
          onClick: () => router.push(`/dashboard/documentos?search=${serviceOrder?.number || ''}`),
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
          <iframe
            srcDoc={previewHtml}
            className="w-full min-h-[920px] border border-outline-variant/30 rounded-lg shadow-inner bg-white"
            title="Preview A4 da O.S."
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="py-xl text-center text-on-surface-variant">Preview indisponível.</div>
        )}
      </div>
    </A4PreviewShell>
  );
}
