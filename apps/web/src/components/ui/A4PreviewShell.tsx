'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Button from './Button';
import { useI18n } from '../../i18n/useI18n';

interface A4PreviewShellProps {
  title: string;
  subtitle: string;
  documentType: string;
  documentNumber: string;
  dateLabel: string;
  dateValue: string;
  clientName: string;
  clientDocument?: string;
  clientEmail?: string;
  statusBadge?: React.ReactNode;
  backPath: string;
  children: React.ReactNode;
  companyName?: string;
  companySub?: string;
  companyDocument?: string;
  companyEmail?: string;
}

export const A4PreviewShell: React.FC<A4PreviewShellProps> = ({
  title,
  subtitle,
  documentType,
  documentNumber,
  dateLabel,
  dateValue,
  clientName,
  clientDocument,
  clientEmail,
  statusBadge,
  backPath,
  children,
  companyName,
  companySub,
  companyDocument,
  companyEmail,
}) => {
  const router = useRouter();
  const { t } = useI18n();

  const displayCompanyName = companyName || "Dados da empresa configuráveis";
  const displayCompanySub = companySub || "Configuração de marca pendente";
  const displayCompanyDocument = companyDocument ? `CNPJ: ${companyDocument}` : "CNPJ não configurado";
  const displayCompanyEmail = companyEmail || "E-mail não configurado";

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Top Preview Controls Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md border-b border-outline-variant/30 pb-md">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              {title}
            </h2>
            <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Preview A4
            </span>
          </div>
          <p className="text-[14px] text-on-surface-variant">
            {subtitle}
          </p>
        </div>

        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => router.push(backPath)}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
            {t.common.back}
          </Button>

          <Button variant="secondary" disabled title="A funcionalidade de impressão será liberada em breve">
            <span className="material-symbols-outlined text-[16px] mr-1.5">print</span>
            Imprimir — Planejado
          </Button>

          <Button variant="primary" disabled title="Exportação de PDF será liberada na próxima rodada">
            <span className="material-symbols-outlined text-[16px] mr-1.5">picture_as_pdf</span>
            PDF — Planejado
          </Button>
        </div>
      </header>

      {/* A4 Sheet Container Canvas */}
      <div className="flex justify-center items-center py-xl bg-surface-container-lowest/50 border border-outline-variant/20 rounded-2xl overflow-x-auto">
        <div className="w-[794px] h-[1123px] min-w-[794px] min-h-[1123px] bg-white text-black p-[50px] shadow-2xl relative flex flex-col font-sans select-text border border-black/10">
          
          {/* Header A4 */}
          <div className="flex justify-between items-start border-b-2 border-black pb-md mb-md">
            <div className="flex flex-col gap-1">
              <span className="text-xl font-bold tracking-tight text-black">{displayCompanyName}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-black/60">
                {displayCompanySub}
              </span>
              <span className="text-[11px] text-black/70 font-mono mt-xs leading-none">
                {displayCompanyDocument}
              </span>
              <span className="text-[11px] text-black/70 font-mono leading-none">
                {displayCompanyEmail}
              </span>
            </div>

            <div className="flex flex-col items-end text-right gap-1 font-mono">
              <span className="text-xs bg-black text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {documentType}
              </span>
              <span className="text-sm font-bold text-black mt-xs">
                #{documentNumber}
              </span>
              <div className="flex items-center gap-xs mt-xs text-[12px] text-black/70">
                <span>{dateLabel}:</span>
                <span className="font-bold">{dateValue}</span>
              </div>
            </div>
          </div>

          {/* Client Info Block */}
          <div className="bg-black/[0.03] border border-black/10 p-md rounded-lg flex flex-col gap-2 mb-lg">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Destinatário / Cliente
            </span>
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-bold text-sm text-black">{clientName}</span>
                {clientDocument && (
                  <span className="text-xs text-black/70 font-mono mt-0.5">CNPJ/CPF: {clientDocument}</span>
                )}
              </div>
              {clientEmail && (
                <span className="text-xs text-black/70 font-mono">{clientEmail}</span>
              )}
            </div>
            {statusBadge && (
              <div className="flex gap-sm items-center mt-xs">
                <span className="text-[10px] text-black/50 uppercase font-bold">Status Atual:</span>
                {statusBadge}
              </div>
            )}
          </div>

          {/* Document Dynamic Body */}
          <div className="flex-1 flex flex-col">
            {children}
          </div>

          {/* Footer A4 */}
          <div className="border-t border-black/10 pt-md mt-lg flex justify-between items-end text-[10px] text-black/50 font-mono">
            <span>Gerado automaticamente por Peanut OS</span>
            <span>Página 1 de 1</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default A4PreviewShell;
