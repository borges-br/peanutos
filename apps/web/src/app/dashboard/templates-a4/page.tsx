'use client';

import React, { useState, useEffect } from 'react';
import A4PreviewShell from '../../../components/ui/A4PreviewShell';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { apiRequest } from '../../../lib/api';

type DocumentType = 'INVOICE' | 'QUOTE' | 'SERVICE_ORDER' | 'CONTRACT' | 'REPORT';

const DOC_TYPES: { id: DocumentType; label: string }[] = [
  { id: 'INVOICE', label: 'Fatura' },
  { id: 'QUOTE', label: 'Orçamento' },
  { id: 'SERVICE_ORDER', label: 'Ordem de Serviço' },
  { id: 'CONTRACT', label: 'Contrato' },
  { id: 'REPORT', label: 'Relatório' },
];

const ALL_BLOCKS = [
  'header', 'logo', 'companyInfo', 'clientInfo', 'documentTitle',
  'itemsTable', 'financialSummary', 'paymentInfo', 'terms',
  'observations', 'responsibleSignature', 'clientSignature', 'qrCode', 'footer',
] as const;

type Block = typeof ALL_BLOCKS[number];

const BLOCK_LABELS: Record<Block, string> = {
  header: 'Cabeçalho',
  logo: 'Logo da empresa',
  companyInfo: 'Dados da empresa',
  clientInfo: 'Dados do cliente',
  documentTitle: 'Título do documento',
  itemsTable: 'Tabela de itens',
  financialSummary: 'Resumo financeiro',
  paymentInfo: 'Dados de pagamento',
  terms: 'Termos e condições',
  observations: 'Observações',
  responsibleSignature: 'Assinatura do responsável',
  clientSignature: 'Assinatura do cliente',
  qrCode: 'QR Code',
  footer: 'Rodapé',
};

interface TemplateSetting {
  documentType: string;
  enabledBlocks: Record<Block, boolean>;
  blockOrder: Block[];
}

export default function TemplatesA4Page() {
  const [activeType, setActiveType] = useState<DocumentType>('INVOICE');
  const [settings, setSettings] = useState<Partial<Record<DocumentType, TemplateSetting>>>({});
  const [loaded, setLoaded] = useState<Set<DocumentType>>(new Set());
  const [brandSettings, setBrandSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dirtyTypes, setDirtyTypes] = useState<Set<DocumentType>>(new Set());

  useEffect(() => {
    apiRequest('/settings/brand')
      .then(data => setBrandSettings(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loaded.has(activeType)) return;
    setLoading(true);
    setError(null);
    apiRequest<TemplateSetting>(`/document-templates/${activeType}`)
      .then(data => {
        setSettings(prev => ({ ...prev, [activeType]: data }));
        setLoaded(prev => {
          const next = new Set(prev);
          next.add(activeType);
          return next;
        });
      })
      .catch(err => setError(err.message || 'Erro ao carregar configurações.'))
      .finally(() => setLoading(false));
  }, [activeType, loaded]);

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  const currentSetting = settings[activeType];

  function toggleBlock(block: Block) {
    if (!currentSetting) return;
    setSettings(prev => ({
      ...prev,
      [activeType]: {
        ...currentSetting,
        enabledBlocks: { ...currentSetting.enabledBlocks, [block]: !currentSetting.enabledBlocks[block] },
      },
    }));
    setDirtyTypes(prev => {
      const next = new Set(prev);
      next.add(activeType);
      return next;
    });
  }

  function moveBlock(block: Block, direction: 'up' | 'down') {
    if (!currentSetting) return;
    const order = [...currentSetting.blockOrder];
    const idx = order.indexOf(block);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;
    
    const itemA = order[idx];
    const itemB = order[newIdx];
    if (itemA && itemB) {
      order[idx] = itemB;
      order[newIdx] = itemA;
    }

    setSettings(prev => ({
      ...prev,
      [activeType]: { ...currentSetting, blockOrder: order },
    }));
    setDirtyTypes(prev => {
      const next = new Set(prev);
      next.add(activeType);
      return next;
    });
  }

  async function handleSave() {
    if (!currentSetting) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/document-templates/${activeType}`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabledBlocks: currentSetting.enabledBlocks,
          blockOrder: currentSetting.blockOrder,
        }),
      });
      setDirtyTypes(prev => { const next = new Set(prev); next.delete(activeType); return next; });
      showSuccess('Configurações salvas.');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      const data = await apiRequest<TemplateSetting>(`/document-templates/${activeType}/reset`, { method: 'POST' });
      setSettings(prev => ({ ...prev, [activeType]: data }));
      setDirtyTypes(prev => { const next = new Set(prev); next.delete(activeType); return next; });
      showSuccess('Configurações restauradas para o padrão.');
    } catch (err: any) {
      setError(err.message || 'Erro ao restaurar.');
    } finally {
      setResetting(false);
    }
  }

  const isDirty = dirtyTypes.has(activeType);
  const activeLabel = DOC_TYPES.find(d => d.id === activeType)?.label || activeType;

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-md rounded-lg flex items-center gap-sm animate-fade-in text-[13px]">
          <span className="material-symbols-outlined">check_circle</span>
          <p>{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg flex items-center gap-sm text-[13px]">
          <span className="material-symbols-outlined">error</span>
          <p>{error}</p>
        </div>
      )}

      {/* Type selector */}
      <Card title="Templates de Documentos A4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <p className="text-[13px] text-on-surface-variant leading-relaxed">
            Configure os blocos exibidos em cada tipo de documento. Ative, desative e reordene os blocos conforme necessário.
          </p>
          <div className="flex flex-wrap gap-xs">
            {DOC_TYPES.map(tab => (
              <Button
                key={tab.id}
                variant={activeType === tab.id ? 'primary' : 'outline'}
                onClick={() => setActiveType(tab.id)}
                className="text-xs px-md py-1 relative"
              >
                {tab.label}
                {dirtyTypes.has(tab.id) && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block align-middle" />
                )}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">

        {/* Block config panel */}
        <aside className="lg:col-span-4 space-y-md">
          <Card title={`Blocos — ${activeLabel}`}>
            {loading || !currentSetting ? (
              <div className="flex items-center justify-center py-xl">
                <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-xs text-[13px]">
                <p className="text-[11px] text-on-surface-variant/60 pb-xs">
                  Arraste com as setas ou use os botões para reordenar. Blocos desativados não aparecem no PDF gerado.
                </p>

                {currentSetting.blockOrder.map((block, idx) => {
                  const enabled = currentSetting.enabledBlocks[block];
                  return (
                    <div
                      key={block}
                      className={`flex items-center gap-sm p-sm rounded border transition-opacity ${enabled ? 'border-outline-variant/40 bg-surface-container/10' : 'border-outline-variant/20 bg-surface-container/5 opacity-50'}`}
                    >
                      {/* Toggle */}
                      <button
                        onClick={() => toggleBlock(block)}
                        className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${enabled ? 'bg-primary' : 'bg-outline-variant/40'}`}
                        title={enabled ? 'Desativar bloco' : 'Ativar bloco'}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
                      </button>

                      {/* Label */}
                      <span className={`flex-1 text-[12px] truncate ${enabled ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                        {BLOCK_LABELS[block]}
                      </span>

                      {/* Order controls */}
                      <div className="flex gap-0.5 shrink-0">
                        <button
                          onClick={() => moveBlock(block, 'up')}
                          disabled={idx === 0}
                          className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        </button>
                        <button
                          onClick={() => moveBlock(block, 'down')}
                          disabled={idx === currentSetting.blockOrder.length - 1}
                          className="w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-sm pt-md border-t border-outline-variant/20 mt-md">
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    loading={resetting}
                    disabled={saving || resetting}
                    className="text-xs py-1 px-md text-on-surface-variant"
                  >
                    Restaurar padrão
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={saving}
                    disabled={!isDirty || saving || resetting}
                    className="text-xs py-1 flex-1"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </aside>

        {/* A4 Preview */}
        <section className="lg:col-span-8 bg-surface border border-outline-variant rounded-2xl p-md shadow-2xl">
          <A4PreviewShell
            title={`Template — ${activeLabel}`}
            subtitle="Prévia conceitual dos blocos habilitados. O PDF gerado reflete a configuração salva."
            documentType={activeLabel}
            documentNumber="••••••••••••"
            dateLabel="Data"
            dateValue="--/--/----"
            clientName="Cliente Exemplo"
            clientDocument="Dado protegido"
            clientEmail="--"
            backPath="/dashboard"
            companyName={brandSettings?.brandName}
            companySub={brandSettings?.brandSubtitle}
            companyDocument={brandSettings?.companyDocument}
            companyEmail={brandSettings?.companyEmail}
            documentFooterText={brandSettings?.documentFooterText}
            signatureName={brandSettings?.signatureName}
            primaryColorHex={brandSettings?.primaryColorHex}
          >
            <div className="flex flex-col gap-xs flex-1">
              {currentSetting ? (
                currentSetting.blockOrder
                  .filter(b => currentSetting.enabledBlocks[b])
                  .map(block => <BlockPreview key={block} block={block} />)
              ) : (
                <div className="flex items-center justify-center flex-1 text-black/30 text-xs">
                  Carregando configuração...
                </div>
              )}
            </div>
          </A4PreviewShell>
        </section>
      </div>
    </main>
  );
}

function BlockPreview({ block }: { block: Block }) {
  switch (block) {
    case 'header':
      return <div className="h-7 bg-black/5 rounded flex items-center px-sm text-[10px] text-black/40 uppercase font-bold tracking-wider">Cabeçalho</div>;
    case 'logo':
      return (
        <div className="h-10 bg-black/5 rounded flex items-center px-sm gap-sm">
          <div className="w-8 h-8 bg-black/10 rounded flex items-center justify-center text-[8px] text-black/30">IMG</div>
          <span className="text-[10px] text-black/40">Logo</span>
        </div>
      );
    case 'companyInfo':
      return <div className="h-8 bg-black/5 rounded flex items-center px-sm text-[10px] text-black/40">Razão Social · CNPJ · E-mail</div>;
    case 'clientInfo':
      return (
        <div className="h-14 bg-black/[0.03] border border-black/10 rounded flex flex-col justify-center px-sm gap-0.5">
          <span className="text-[9px] text-black/30 uppercase font-bold">Destinatário</span>
          <span className="text-[10px] text-black/50 font-bold">Cliente Exemplo</span>
          <span className="text-[9px] text-black/30 font-mono">CNPJ: --</span>
        </div>
      );
    case 'documentTitle':
      return <div className="h-7 flex items-center"><span className="font-bold text-sm text-black/70 uppercase">Título do Documento</span></div>;
    case 'itemsTable':
      return (
        <div className="border border-black/10 rounded overflow-hidden">
          <div className="bg-black/10 h-6 flex items-center px-sm gap-lg">
            <span className="text-[9px] text-black/50 font-bold flex-1">Descrição</span>
            <span className="text-[9px] text-black/50 font-bold w-8 text-center">Qtd</span>
            <span className="text-[9px] text-black/50 font-bold w-12 text-right">Valor</span>
          </div>
          {[1, 2].map(i => (
            <div key={i} className="h-5 flex items-center px-sm gap-lg border-t border-black/5">
              <span className="flex-1 text-[9px] text-black/30">Item {i}</span>
              <span className="text-[9px] text-black/30 w-8 text-center">--</span>
              <span className="text-[9px] text-black/30 w-12 text-right">--</span>
            </div>
          ))}
        </div>
      );
    case 'financialSummary':
      return (
        <div className="flex justify-end">
          <div className="space-y-0.5 text-[10px] w-36">
            <div className="flex justify-between text-black/40"><span>Subtotal</span><span>--</span></div>
            <div className="flex justify-between text-black/40"><span>Impostos</span><span>--</span></div>
            <div className="flex justify-between font-bold text-black/70 border-t border-black/10 pt-0.5"><span>Total</span><span>--</span></div>
          </div>
        </div>
      );
    case 'paymentInfo':
      return <div className="h-8 bg-black/5 rounded flex items-center px-sm text-[10px] text-black/40">Dados bancários / Chave PIX</div>;
    case 'terms':
      return <div className="h-10 bg-black/5 rounded flex items-center px-sm text-[10px] text-black/40 leading-relaxed italic">Termos e condições (texto configurável)</div>;
    case 'observations':
      return <div className="h-8 bg-black/5 rounded flex items-center px-sm text-[10px] text-black/40 italic">Observações adicionais</div>;
    case 'responsibleSignature':
      return (
        <div className="flex justify-start">
          <div className="flex flex-col items-center w-36">
            <div className="w-full border-t border-black/30 mb-0.5" />
            <span className="text-[9px] font-bold text-black/50">Responsável Autorizado</span>
          </div>
        </div>
      );
    case 'clientSignature':
      return (
        <div className="flex justify-end">
          <div className="flex flex-col items-center w-36">
            <div className="w-full border-t border-black/30 mb-0.5" />
            <span className="text-[9px] font-bold text-black/50">Assinatura do Cliente</span>
          </div>
        </div>
      );
    case 'qrCode':
      return (
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-black/10 rounded flex items-center justify-center text-[8px] text-black/30 font-bold">QR</div>
        </div>
      );
    case 'footer':
      return (
        <div className="h-6 border-t border-black/10 flex items-center justify-between px-xs text-[9px] text-black/30">
          <span>Gerado automaticamente</span>
          <span>Pág. 1 / 1</span>
        </div>
      );
    default:
      return null;
  }
}
