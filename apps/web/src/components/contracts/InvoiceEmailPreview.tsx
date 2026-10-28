'use client';
import React, { useState } from 'react';
import { apiRequest } from '../../lib/api';
import Button from '../ui/Button';
export default function InvoiceEmailPreview({ invoiceId }: { invoiceId: string }) {
  const [preview, setPreview] = useState<any>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function load() { setBusy(true); setError(''); try { setPreview(await apiRequest(`/financials/invoices/${invoiceId}/email-preview`)); } catch (cause: any) { setError(cause.message); } finally { setBusy(false); } }
  return <section className="space-y-sm"><div className="flex flex-wrap gap-sm"><Button variant="secondary" onClick={load} loading={busy} disabled={busy}>Visualizar email antes do envio</Button>{preview && <Button variant="ghost" onClick={() => setPreview(null)}>Fechar prévia</Button>}</div>{error && <p role="alert" className="text-error">{error}</p>}{preview && <div className="border border-outline-variant p-md rounded-xl space-y-sm"><p className="text-sm"><strong>Assunto:</strong> {preview.subject}</p><p className="text-xs text-on-surface-variant">Modelo: {preview.templateName} · {preview.frozen ? 'Conteúdo preservado na conferência' : 'Será preservado ao conferir e agendar'}</p><p className="text-xs">Para: {preview.recipients.join(', ') || 'Nenhum destinatário configurado'} · Anexo: PDF desta fatura</p><iframe title="Prévia do email da fatura" sandbox="" srcDoc={preview.html} className="w-full h-[620px] rounded border border-outline-variant bg-white" /><p className="text-xs text-on-surface-variant">Visualizar não envia a mensagem. Salve alterações da fatura antes de atualizar esta prévia. Se houver cobrança bancária programada, o link aparece após a geração no provedor.</p></div>}</section>;
}
