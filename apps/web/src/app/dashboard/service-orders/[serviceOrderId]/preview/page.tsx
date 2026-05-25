'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import A4PreviewShell from '../../../../../components/ui/A4PreviewShell';

export default function ServiceOrderA4PreviewPage() {
  const params = useParams();
  const serviceOrderId = params.serviceOrderId as string;

  return (
    <A4PreviewShell
      title="Preview A4 da O.S."
      subtitle="Visualização do documento de relatório de execução técnica oficial."
      documentType="ORDEM DE SERVIÇO"
      documentNumber="OS-2026-0043"
      dateLabel="Execução"
      dateValue="24/05/2026"
      clientName="Acme Corporation LTDA"
      clientDocument="10.432.891/0001-44"
      clientEmail="suporte@acme.com.br"
      statusBadge={
        <span className="text-[9px] bg-green-500/10 border border-green-500/20 text-green-700 px-2 py-0.5 rounded font-bold uppercase">
          Concluída
        </span>
      }
      backPath={`/dashboard/service-orders/${serviceOrderId}`}
    >
      <div className="flex flex-col gap-md text-black select-text">
        <h3 className="font-bold text-xs uppercase text-black/50 border-b border-black/10 pb-1 tracking-wider mt-md">
          Relatório de Atendimento Técnico Presencial
        </h3>

        {/* Technical Data Grid */}
        <div className="grid grid-cols-2 gap-sm text-xs font-mono mb-md">
          <div className="flex flex-col">
            <span className="text-black/50 font-sans font-bold uppercase text-[9px]">Técnico Executor</span>
            <span className="font-bold text-black mt-0.5">Carlos Henrique (Analista de Suporte Sr.)</span>
          </div>
          <div className="flex flex-col">
            <span className="text-black/50 font-sans font-bold uppercase text-[9px]">Chamado Vinculado</span>
            <span className="font-bold text-black mt-0.5">#TKT-10892 (Lentidão Geral na Rede Local)</span>
          </div>
        </div>

        {/* Description of Service */}
        <div className="flex flex-col gap-xs mb-md">
          <span className="text-[10px] text-black/50 uppercase font-bold tracking-wider">Descrição dos Serviços Realizados</span>
          <p className="text-xs text-black/80 leading-relaxed font-body-sm bg-black/[0.01] border border-black/5 p-sm rounded-lg">
            Realizada vistoria no rack central do cliente. Detectado loop de rede físico na porta 12 do Switch HP do rack secundário. Feita readequação física do cabeamento, isolamento do switch secundário danificado por sobrecarga elétrica e substituição preventiva por patch cord Cat6 de homologação Peanut OS. Testes de conectividade lógica e latência interna reestabelecidos aos padrões nominais normais.
          </p>
        </div>

        <h3 className="font-bold text-xs uppercase text-black/50 border-b border-black/10 pb-1 tracking-wider">
          Materiais & Peças Utilizadas
        </h3>
        
        {/* Table of items */}
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-black/20 text-black/60 font-mono">
              <th className="py-2">Item / Equipamento</th>
              <th className="py-2 text-center w-12">Qtd</th>
              <th className="py-2 text-center w-12">Un</th>
              <th className="py-2 text-right w-36 font-sans">Status Peça</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 font-mono">
            <tr>
              <td className="py-2">
                <span className="font-bold block text-black">Cabo de Rede Patch Cord Cat6 Azul - 2.0m</span>
                <span className="text-[10px] text-black/50 block">Conexão lógica gigabit do switch principal.</span>
              </td>
              <td className="py-2 text-center">1</td>
              <td className="py-2 text-center">UN</td>
              <td className="py-2 text-right font-sans text-[11px] font-bold text-green-700">Consumido / Contrato</td>
            </tr>
            <tr>
              <td className="py-2">
                <span className="font-bold block text-black">Conector RJ45 blindado de alta blindagem</span>
                <span className="text-[10px] text-black/50 block">Crimpage técnica emergencial no rack secundário.</span>
              </td>
              <td className="py-2 text-center">2</td>
              <td className="py-2 text-center">UN</td>
              <td className="py-2 text-right font-sans text-[11px] font-bold text-green-700">Consumido / Contrato</td>
            </tr>
          </tbody>
        </table>

        {/* Signature Area */}
        <div className="mt-xl grid grid-cols-2 gap-xl pt-lg border-t border-black/10 font-sans text-[11px]">
          <div className="flex flex-col items-center gap-1.5 text-center mt-md">
            <div className="w-48 h-[1px] bg-black/40"></div>
            <span className="font-bold text-black">Assinatura do Técnico Executor</span>
            <span className="text-black/50 text-[10px]">Peanut OS Central de TI</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center mt-md">
            <div className="w-48 h-[1px] bg-black/40"></div>
            <span className="font-bold text-black">Aceite e Assinatura do Cliente</span>
            <span className="text-black/50 text-[10px]">Acme Corporation LTDA</span>
          </div>
        </div>
      </div>
    </A4PreviewShell>
  );
}
