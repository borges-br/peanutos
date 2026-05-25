'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';

export default function QuoteA4PreviewPage() {
  const params = useParams();
  const quoteId = params.quoteId as string;

  return (
    <A4PreviewShell
      title="Preview A4 do Orçamento"
      subtitle="Visualização do documento de proposta comercial técnica oficial."
      documentType="PROPOSTA COMERCIAL"
      documentNumber="ORC-2026-0812"
      dateLabel="Validade"
      dateValue="15 dias (até 09/06/2026)"
      clientName="Acme Corporation LTDA"
      clientDocument="10.432.891/0001-44"
      clientEmail="ti@acme.com.br"
      statusBadge={
        <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 px-2 py-0.5 rounded font-bold uppercase">
          Em Planejamento
        </span>
      }
      backPath={`/dashboard/quotes/${quoteId}`}
    >
      <div className="flex flex-col gap-md text-black select-text">
        <h3 className="font-bold text-xs uppercase text-black/50 border-b border-black/10 pb-1 tracking-wider mt-md">
          Especificação da Proposta Técnica
        </h3>
        
        {/* Table of Items */}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black/20 text-black/60 font-mono">
              <th className="py-2">Item / Descrição</th>
              <th className="py-2 text-center w-12">Qtd</th>
              <th className="py-2 text-right w-24">Valor Unit.</th>
              <th className="py-2 text-right w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 font-mono">
            <tr>
              <td className="py-2">
                <span className="font-bold block text-black">Implantação de Servidor Linux & AD Samba</span>
                <span className="text-[10px] text-black/50 block">Serviço de configuração de controlador de domínio local redundante.</span>
              </td>
              <td className="py-2 text-center">1</td>
              <td className="py-2 text-right">R$ 4.500,00</td>
              <td className="py-2 text-right font-bold">R$ 4.500,00</td>
            </tr>
            <tr>
              <td className="py-2">
                <span className="font-bold block text-black">Firewall Hardware Fortigate FG-40F</span>
                <span className="text-[10px] text-black/50 block">Equipamento de segurança de rede ativo com licença UTM por 1 ano.</span>
              </td>
              <td className="py-2 text-center">1</td>
              <td className="py-2 text-right">R$ 6.200,00</td>
              <td className="py-2 text-right font-bold">R$ 6.200,00</td>
            </tr>
            <tr>
              <td className="py-2">
                <span className="font-bold block text-black">Consultoria de Segurança e Políticas de TI</span>
                <span className="text-[10px] text-black/50 block">Auditoria e desenho de políticas internas de acesso a pastas e senhas.</span>
              </td>
              <td className="py-2 text-center">1</td>
              <td className="py-2 text-right">R$ 3.500,00</td>
              <td className="py-2 text-right font-bold">R$ 3.500,00</td>
            </tr>
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="border-t-2 border-black pt-md mt-lg flex flex-col gap-1 items-end text-right font-mono">
          <div className="flex gap-md text-xs text-black/60">
            <span>Subtotal de Serviços:</span>
            <span>R$ 8.000,00</span>
          </div>
          <div className="flex gap-md text-xs text-black/60">
            <span>Subtotal de Materiais:</span>
            <span>R$ 6.200,00</span>
          </div>
          <div className="flex gap-md text-sm font-bold text-black mt-xs border-t border-black/15 pt-xs w-48 justify-end">
            <span>Valor Geral:</span>
            <span>R$ 14.200,00</span>
          </div>
        </div>

        {/* Dynamic Notes */}
        <div className="mt-xl border-l-2 border-black/30 pl-md text-[11px] text-black/60 leading-relaxed">
          <span className="font-bold block text-black/80 uppercase tracking-wide mb-xs text-[10px]">
            Termos & Condições de Atendimento
          </span>
          Proposta válida por 15 dias corridos a contar da data de emissão. A implantação de rede e sistemas operacionais locais exige vistoria técnica presencial complementar para homologação final de infraestrutura lógica (cabeamento estruturado e energia estabilizada).
        </div>
      </div>
    </A4PreviewShell>
  );
}
