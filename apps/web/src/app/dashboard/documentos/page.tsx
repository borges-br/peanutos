'use client';

import React from 'react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import PlannedState from '../../../components/ui/PlannedState';
import EmptyState from '../../../components/ui/EmptyState';
import { useI18n } from '../../../i18n/useI18n';

export default function DocumentosPage() {
  const { t } = useI18n();

  return (
    <main className="max-w-7xl mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/30 pb-md">
        <div className="space-y-xs">
          <div className="flex items-center gap-sm">
            <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Central de Documentos</h1>
            <span className="bg-tertiary/10 border border-tertiary/30 text-tertiary px-2.5 py-0.5 font-label-caps text-[10px] rounded uppercase tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl">
            Armazene e gerencie com segurança contratos, termos de aceite, relatórios e arquivos anexados aos seus clientes.
          </p>
        </div>
        <div className="flex gap-sm">
          <Button variant="primary" disabled title="Upload de arquivos indisponível no momento">
            <span className="material-symbols-outlined text-[16px] mr-1.5">upload</span>
            Enviar Arquivo
          </Button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Planned State Banner */}
        <div className="lg:col-span-2 space-y-lg">
          <PlannedState
            title="Armazenamento Seguro de Documentos"
            description="Este módulo centralizará todos os anexos de clientes, relatórios gerados e contratos assinados digitalmente. A infraestrutura contará com criptografia em repouso e controle de acesso baseado em papéis (RBAC)."
          />

          {/* Folder placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md opacity-60">
            {[
              { icon: 'folder', title: 'Contratos e Termos', desc: 'Minutas e aceites contratuais.' },
              { icon: 'folder', title: 'Relatórios Técnicos', desc: 'Auditorias e laudos de NOC.' },
              { icon: 'folder', title: 'Anexos de Chamados', desc: 'Comprovações de visitas e diagnósticos.' }
            ].map((folder, i) => (
              <div key={i} className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-xl flex items-start gap-sm cursor-not-allowed">
                <span className="material-symbols-outlined text-primary text-2xl">{folder.icon}</span>
                <div>
                  <h4 className="font-title-sm text-sm font-semibold text-on-surface">{folder.title}</h4>
                  <p className="text-body-sm text-[12px] text-on-surface-variant mt-1 leading-normal">{folder.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-lg">
          <Card title="Cotas do Workspace">
            <div className="space-y-md text-[12px]">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-sm">
                <span className="text-on-surface-variant">Armazenamento Total</span>
                <span className="font-mono text-on-surface">--</span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-sm">
                <span className="text-on-surface-variant">Espaço Utilizado</span>
                <span className="font-mono text-on-surface">--</span>
              </div>
              <div className="flex justify-between items-center pb-xs">
                <span className="text-on-surface-variant">Status da Infraestrutura</span>
                <span className="font-mono text-tertiary font-bold uppercase">Aguardando Liberação</span>
              </div>
            </div>
          </Card>

          <Card title="Restrições de Formato">
            <div className="text-[12px] text-on-surface-variant leading-relaxed space-y-xs">
              <p>Formatos de arquivos previstos na homologação final:</p>
              <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-primary/80">
                <li>PDF (.pdf)</li>
                <li>Imagens (.png, .jpg)</li>
                <li>Documentos (.docx, .xlsx)</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>

      {/* Empty Table Section */}
      <section className="space-y-md pt-md">
        <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Arquivos Recentes</h3>
        <EmptyState
          title="Nenhum documento anexado"
          description="Quando você fizer o upload de arquivos de clientes ou chamados, eles serão listados de forma estruturada nesta seção."
        />
      </section>
    </main>
  );
}
