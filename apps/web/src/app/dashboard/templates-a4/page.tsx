'use client';

import React, { useState, useEffect } from 'react';
import A4PreviewShell from '../../../components/ui/A4PreviewShell';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { apiRequest } from '../../../lib/api';
import Breadcrumbs from '../../../components/layout/Breadcrumbs';

type DocumentType = 'INVOICE' | 'QUOTE' | 'SERVICE_ORDER' | 'REPORT';

const DOC_TYPES: { id: DocumentType; label: string }[] = [
  { id: 'INVOICE', label: 'Fatura' },
  { id: 'QUOTE', label: 'Orçamento' },
  { id: 'SERVICE_ORDER', label: 'Ordem de Serviço' },
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

interface MockItem {
  desc: string;
  qty: number | string;
  value: number | string;
}

interface MockData {
  documentNumber: string;
  dateValue: string;
  clientName: string;
  clientDocument: string;
  clientEmail: string;
  items: MockItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentInfo: string;
  terms: string;
  observations: string;
}

const MOCK_DATA_MAP: Record<DocumentType, MockData> = {
  INVOICE: {
    documentNumber: "FT-2026-0891",
    dateValue: "25/05/2026",
    clientName: "Acme Corporation Ltda",
    clientDocument: "12.345.678/0001-99",
    clientEmail: "financeiro@acme.com",
    items: [
      { desc: "Consultoria de Infraestrutura e DevOps Cloud (Horas)", qty: 40, value: 150.00 },
      { desc: "Licenciamento Mensal de Workspace SaaS Enterprise", qty: 1, value: 1200.00 }
    ],
    subtotal: 7200.00,
    tax: 576.00,
    total: 7776.00,
    paymentInfo: "Banco Cora (0403) · Agência 0001 · C/C 987654-3 · Chave PIX: financeiro@peanutos.com.br",
    terms: "Vencimento em 5 dias. Multa de 2% após o vencimento e juros de 1% ao mês.",
    observations: "Fatura gerada referente aos serviços prestados na competência de Maio/2026."
  },
  QUOTE: {
    documentNumber: "OR-2026-034",
    dateValue: "25/05/2026",
    clientName: "Galeria de Arte São Paulo",
    clientDocument: "98.765.432/0001-10",
    clientEmail: "contato@galeriasp.art.br",
    items: [
      { desc: "Implantação de Cabeamento Estruturado e Rede Wi-Fi 6", qty: 1, value: 4500.00 },
      { desc: "Configuração de Firewall Fortinet + Switch Gerenciável Ubiquiti", qty: 1, value: 2200.00 }
    ],
    subtotal: 6700.00,
    tax: 0.00,
    total: 6700.00,
    paymentInfo: "50% de sinal no aceite e 50% na entrega e homologação dos serviços.",
    terms: "Proposta válida por 10 dias úteis. Prazo de entrega estimado: 5 dias após o aceite.",
    observations: "Garantia de integridade do cabeamento de 1 ano. Equipamentos com garantia do fabricante."
  },
  SERVICE_ORDER: {
    documentNumber: "OS-2026-1049",
    dateValue: "25/05/2026",
    clientName: "Padaria Bella Vista Ltda",
    clientDocument: "55.444.333/0001-22",
    clientEmail: "suporte@bellavista.com.br",
    items: [
      { desc: "Manutenção Preventiva de Servidor e Backup Local", qty: 2, value: 250.00 },
      { desc: "Substituição de SSD 480GB e Instalação de Sistema Operacional", qty: 1, value: 450.00 }
    ],
    subtotal: 950.00,
    tax: 45.00,
    total: 995.00,
    paymentInfo: "Técnico responsável: Bruno Souza. OS aprovada pelo gerente no local.",
    terms: "Garantia de 90 dias sobre as peças substituídas e 30 dias sobre a mão de obra.",
    observations: "Backup executado com sucesso em mídia local e sincronizado com nuvem corporativa."
  },
  REPORT: {
    documentNumber: "RL-2026-004",
    dateValue: "25/05/2026",
    clientName: "Clínica Médica Viver Bem",
    clientDocument: "22.111.000/0001-55",
    clientEmail: "diretoria@clinicaviverbem.com.br",
    items: [
      { desc: "Auditoria de Vulnerabilidades de Segurança em Sistemas de Prontuário", qty: 1, value: 5000.00 },
      { desc: "Análise de Desempenho de Servidor SQL Server Local", qty: 1, value: 1800.00 }
    ],
    subtotal: 6800.00,
    tax: 544.00,
    total: 7344.00,
    paymentInfo: "Relatório de Auditoria Técnica de TI compilado e assinado digitalmente.",
    terms: "Classificação da informação: CONFIDENCIAL. Destinado apenas para uso interno.",
    observations: "Identificados 3 pontos críticos de correção imediata no acesso externo ao banco de dados."
  }
};

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
  const [useMockData, setUseMockData] = useState(false);

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
  const activeMockData = MOCK_DATA_MAP[activeType];

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      <Breadcrumbs
        items={[
          { label: 'Início', href: '/dashboard' },
          { label: 'Configurações', href: '/dashboard/configuracoes' },
          { label: 'Templates de Documentos' },
        ]}
        className="mb-sm"
      />
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
            documentNumber={useMockData ? activeMockData.documentNumber : "••••••••••••"}
            dateLabel="Data"
            dateValue={useMockData ? activeMockData.dateValue : "--/--/----"}
            clientName={useMockData ? activeMockData.clientName : "Cliente Exemplo"}
            clientDocument={useMockData ? activeMockData.clientDocument : "Dado protegido"}
            clientEmail={useMockData ? activeMockData.clientEmail : "--"}
            backPath="/dashboard"
            companyName={brandSettings?.brandName}
            companySub={brandSettings?.brandSubtitle}
            companyLogoUrl={brandSettings?.logoUrl}
            companyDocument={brandSettings?.companyDocument}
            companyEmail={brandSettings?.companyEmail}
            documentFooterText={brandSettings?.documentFooterText}
            signatureName={brandSettings?.signatureName}
            primaryColorHex={brandSettings?.primaryColorHex}
            documentActions={[
              {
                label: useMockData ? "Limpar dados fictícios" : "Usar dados fictícios",
                icon: useMockData ? "clear_all" : "dynamic_feed",
                variant: useMockData ? "outline" : "primary",
                onClick: () => setUseMockData(!useMockData)
              }
            ]}
          >
            <div className="flex flex-col gap-xs flex-1">
              {currentSetting ? (
                currentSetting.blockOrder
                  .filter(b => currentSetting.enabledBlocks[b])
                  .map(block => (
                    <BlockPreview
                      key={block}
                      block={block}
                      useMockData={useMockData}
                      mockData={activeMockData}
                    />
                  ))
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

function BlockPreview({
  block,
  useMockData,
  mockData,
}: {
  block: Block;
  useMockData: boolean;
  mockData: MockData;
}) {
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
          <span className="text-[10px] text-black/50 font-bold">{useMockData ? mockData.clientName : "Cliente Exemplo"}</span>
          <span className="text-[9px] text-black/30 font-mono">
            {useMockData ? `CNPJ/CPF: ${mockData.clientDocument}` : "CNPJ: --"}
          </span>
        </div>
      );
    case 'documentTitle':
      return <div className="h-7 flex items-center"><span className="font-bold text-sm text-black/70 uppercase">Título do Documento</span></div>;
    case 'itemsTable': {
      const items = useMockData ? mockData.items : [
        { desc: 'Item 1', qty: '--', value: '--' },
        { desc: 'Item 2', qty: '--', value: '--' }
      ];
      return (
        <div className="border border-black/10 rounded overflow-hidden">
          <div className="bg-black/10 h-6 flex items-center px-sm gap-lg">
            <span className="text-[9px] text-black/50 font-bold flex-1">Descrição</span>
            <span className="text-[9px] text-black/50 font-bold w-12 text-center">Qtd</span>
            <span className="text-[9px] text-black/50 font-bold w-20 text-right">Valor Unitário</span>
          </div>
          {items.map((item, i) => {
            const valStr = typeof item.value === 'number' ? `R$ ${item.value.toFixed(2)}` : item.value;
            return (
              <div key={i} className="h-7 flex items-center px-sm gap-lg border-t border-black/5">
                <span className="flex-1 text-[9px] text-black/70 font-semibold truncate">{item.desc}</span>
                <span className="text-[9px] text-black/60 w-12 text-center">{item.qty}</span>
                <span className="text-[9px] text-black/60 w-20 text-right font-mono">{valStr}</span>
              </div>
            );
          })}
        </div>
      );
    }
    case 'financialSummary': {
      const subtotalStr = useMockData ? `R$ ${mockData.subtotal.toFixed(2)}` : '--';
      const taxStr = useMockData ? `R$ ${mockData.tax.toFixed(2)}` : '--';
      const totalStr = useMockData ? `R$ ${mockData.total.toFixed(2)}` : '--';
      return (
        <div className="flex justify-end">
          <div className="space-y-0.5 text-[10px] w-48 font-mono">
            <div className="flex justify-between text-black/50"><span>Subtotal:</span><span>{subtotalStr}</span></div>
            <div className="flex justify-between text-black/50"><span>Impostos:</span><span>{taxStr}</span></div>
            <div className="flex justify-between font-bold text-black/80 border-t border-black/10 pt-0.5 text-[11px]">
              <span>Total Geral:</span><span>{totalStr}</span>
            </div>
          </div>
        </div>
      );
    }
    case 'paymentInfo':
      return (
        <div className="p-sm bg-black/[0.02] border border-black/5 rounded flex flex-col gap-0.5">
          <span className="text-[8px] uppercase font-bold text-black/40">Informações de Cobrança / Pagamento</span>
          <span className="text-[9px] text-black/60 font-mono whitespace-pre-line leading-relaxed">
            {useMockData ? mockData.paymentInfo : 'Dados bancários / Chave PIX'}
          </span>
        </div>
      );
    case 'terms':
      return (
        <div className="p-sm bg-black/[0.02] border border-black/5 rounded flex flex-col gap-0.5">
          <span className="text-[8px] uppercase font-bold text-black/40">Termos e Condições</span>
          <span className="text-[9px] text-black/50 italic leading-relaxed">
            {useMockData ? mockData.terms : 'Termos e condições (texto configurável)'}
          </span>
        </div>
      );
    case 'observations':
      return (
        <div className="p-sm bg-black/[0.02] border border-black/5 rounded flex flex-col gap-0.5">
          <span className="text-[8px] uppercase font-bold text-black/40">Observações</span>
          <span className="text-[9px] text-black/50 italic leading-relaxed">
            {useMockData ? mockData.observations : 'Observações adicionais'}
          </span>
        </div>
      );
    case 'responsibleSignature':
      return (
        <div className="flex justify-start">
          <div className="flex flex-col items-center w-40">
            <div className="w-full border-t border-black/30 mb-0.5" />
            <span className="text-[8px] font-bold text-black/50">Responsável Autorizado</span>
          </div>
        </div>
      );
    case 'clientSignature':
      return (
        <div className="flex justify-end">
          <div className="flex flex-col items-center w-40">
            <div className="w-full border-t border-black/30 mb-0.5" />
            <span className="text-[8px] font-bold text-black/50">Assinatura do Cliente</span>
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
          <span>Gerado automaticamente pelo Peanut OS</span>
          <span>Pág. 1 / 1</span>
        </div>
      );
    default:
      return null;
  }
}
