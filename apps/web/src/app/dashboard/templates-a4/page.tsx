'use client';

import React, { useState, useEffect } from 'react';
import A4PreviewShell from '../../../components/ui/A4PreviewShell';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { apiRequest } from '../../../lib/api';

type TemplateType = 'quote' | 'invoice' | 'so';

export default function TemplatesA4Page() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('quote');
  const [brandSettings, setBrandSettings] = useState<any>(null);

  useEffect(() => {
    async function loadBrand() {
      try {
        const data = await apiRequest('/settings/brand');
        setBrandSettings(data);
      } catch (err) {
        console.error('Failed to load brand settings:', err);
      }
    }
    loadBrand();
  }, []);

  const renderQuoteContent = () => (
    <div className="flex flex-col gap-lg text-black font-sans text-xs">
      <div className="border-b border-black/10 pb-sm">
        <h3 className="font-bold text-sm mb-xs uppercase">1. Escopo de Serviços</h3>
        <p className="text-black/70 leading-normal">
          Detalhamento de serviços de consultoria de rede, suporte técnico preventivo e licenciamento.
        </p>
      </div>

      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-black font-bold">
            <th className="py-sm">Descrição do Serviço</th>
            <th className="py-sm text-center">Quantidade</th>
            <th className="py-sm text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          <tr>
            <td className="py-sm">Serviço planejado — Consultoria</td>
            <td className="py-sm text-center">--</td>
            <td className="py-sm text-right">--</td>
          </tr>
          <tr>
            <td className="py-sm">Licenciamento de software previsto</td>
            <td className="py-sm text-center">--</td>
            <td className="py-sm text-right">--</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-auto border-t border-black pt-md flex justify-between items-center text-sm font-bold">
        <span>Valor Estimado Total</span>
        <span>--</span>
      </div>
    </div>
  );

  const renderInvoiceContent = () => (
    <div className="flex flex-col gap-lg text-black font-sans text-xs">
      <div className="border-b border-black/10 pb-sm">
        <h3 className="font-bold text-sm mb-xs uppercase">Detalhes da Cobrança</h3>
        <p className="text-black/70 leading-normal">
          Faturamento correspondente aos consumos de recursos e mensalidades.
        </p>
      </div>

      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-black font-bold">
            <th className="py-sm">Item de Faturamento</th>
            <th className="py-sm text-center">Referência</th>
            <th className="py-sm text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          <tr>
            <td className="py-sm">Mensalidade técnica padrão</td>
            <td className="py-sm text-center">--</td>
            <td className="py-sm text-right">--</td>
          </tr>
          <tr>
            <td className="py-sm">Consumo adicional de quotas</td>
            <td className="py-sm text-center">--</td>
            <td className="py-sm text-right">--</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-auto border-t border-black pt-md flex justify-between items-center text-sm font-bold">
        <span>Total da Fatura</span>
        <span>--</span>
      </div>
    </div>
  );

  const renderSOContent = () => (
    <div className="flex flex-col gap-lg text-black font-sans text-xs">
      <div className="border-b border-black/10 pb-sm">
        <h3 className="font-bold text-sm mb-xs uppercase">Relatório de Atendimento Técnico</h3>
        <p className="text-black/70 leading-normal">
          Visitas e manutenções em campo executadas na infraestrutura do cliente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-md border border-black/10 p-sm rounded-lg bg-black/[0.01]">
        <div>
          <span className="font-bold block uppercase text-[10px] text-black/50">Técnico Alocado</span>
          <span className="text-black font-medium">Usuário interno</span>
        </div>
        <div>
          <span className="font-bold block uppercase text-[10px] text-black/50">Canal de Abertura</span>
          <span className="text-black font-medium">--</span>
        </div>
      </div>

      <table className="w-full border-collapse text-left text-xs mt-md">
        <thead>
          <tr className="border-b border-black font-bold">
            <th className="py-sm">Atividade Realizada</th>
            <th className="py-sm text-right">Horas Lançadas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          <tr>
            <td className="py-sm">Verificação preventiva de infraestrutura</td>
            <td className="py-sm text-right">-- h</td>
          </tr>
          <tr>
            <td className="py-sm">Higienização lógica e backup</td>
            <td className="py-sm text-right">-- h</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-auto border-t border-black pt-md flex justify-between items-center text-sm font-bold">
        <span>Horas Totais Registradas</span>
        <span>-- h</span>
      </div>
    </div>
  );

  const getShellParams = () => {
    switch (activeTemplate) {
      case 'quote':
        return {
          title: 'Modelo de Orçamento',
          subtitle: 'Layout previsto para orçamentos comerciais de serviços.',
          documentType: 'Modelo de orçamento',
          documentNumber: '••••••••••••',
          dateLabel: 'Data planejada',
          dateValue: '--/--/----',
          children: renderQuoteContent(),
        };
      case 'invoice':
        return {
          title: 'Modelo de Fatura',
          subtitle: 'Layout previsto para faturas comerciais e mensalidades.',
          documentType: 'Modelo de fatura',
          documentNumber: '••••••••••••',
          dateLabel: 'Vencimento',
          dateValue: '--/--/----',
          children: renderInvoiceContent(),
        };
      case 'so':
        return {
          title: 'Modelo de Ordem de Serviço',
          subtitle: 'Layout previsto para registros de visitas técnicas.',
          documentType: 'Modelo de ordem de serviço',
          documentNumber: '••••••••••••',
          dateLabel: 'Data planejada',
          dateValue: '--/--/----',
          children: renderSOContent(),
        };
    }
  };

  const shellParams = getShellParams();

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Selector and Options Panel */}
      <Card title="Gabarito de Documentos A4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="space-y-xs">
            <p className="text-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              Selecione e visualize a estrutura de diagramação prevista para os relatórios e faturamento do Peanut OS:
            </p>
          </div>
          <div className="flex flex-wrap gap-xs">
            {([
              { id: 'quote', label: 'Orçamento' },
              { id: 'invoice', label: 'Fatura' },
              { id: 'so', label: 'Ordem de Serviço' },
            ] as const).map((tab) => (
              <Button
                key={tab.id}
                variant={activeTemplate === tab.id ? 'primary' : 'outline'}
                onClick={() => setActiveTemplate(tab.id)}
                className="text-xs px-md py-1"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* A4 Shell Rendering Section */}
      <section className="bg-surface border border-outline-variant rounded-2xl p-md shadow-2xl">
        <A4PreviewShell
          title={shellParams.title}
          subtitle={shellParams.subtitle}
          documentType={shellParams.documentType}
          documentNumber={shellParams.documentNumber}
          dateLabel={shellParams.dateLabel}
          dateValue={shellParams.dateValue}
          clientName="Usuário interno"
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
          {shellParams.children}
        </A4PreviewShell>
      </section>
    </main>
  );
}
