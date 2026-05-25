'use client';

import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

interface AuditLogEvent {
  id: string;
  datetime: string;
  action: string;
  module: string;
  user: string;
  target: string;
  criticality: 'info' | 'warn' | 'critical';
  ip: string;
  userAgent: string;
  payload: string;
}

const mockEvents: AuditLogEvent[] = [
  {
    id: 'TX_1001_AUDIT',
    datetime: '--/--/---- 00:00:00',
    action: 'Cliente cadastrado',
    module: 'CRM',
    user: 'Usuário interno',
    target: 'Registro relacionado',
    criticality: 'info',
    ip: '--.---.---.--',
    userAgent: 'Mozilla/5.0 (PeanutOS/1.0; Admin; Client-Desktop)',
    payload: JSON.stringify({
      action: "CREATE_CLIENT",
      resource: "CLIENT_REG_01",
      status: "ACTIVE",
      audit_source: "peanut_os_web"
    }, null, 2)
  },
  {
    id: 'TX_1002_AUDIT',
    datetime: '--/--/---- 00:00:00',
    action: 'Dado sensível visualizado',
    module: 'Segurança',
    user: 'Usuário interno',
    target: 'Dado protegido',
    criticality: 'warn',
    ip: '--.---.---.--',
    userAgent: 'Mozilla/5.0 (PeanutOS/1.0; Admin; Client-Desktop)',
    payload: JSON.stringify({
      action: "VIEW_SENSITIVE_DATA",
      resource: "CREDENTIAL_INVENTORY_05",
      reason: "Manutenção de roteador",
      event_audited: true
    }, null, 2)
  },
  {
    id: 'TX_1003_AUDIT',
    datetime: '--/--/---- 00:00:00',
    action: 'Regra de acesso alterada',
    module: 'Permissões',
    user: 'Usuário interno',
    target: 'Configurações RBAC',
    criticality: 'critical',
    ip: '--.---.---.--',
    userAgent: 'Mozilla/5.0 (PeanutOS/1.0; Admin; Client-Desktop)',
    payload: JSON.stringify({
      action: "UPDATE_PERMISSIONS",
      role: "TECHNICIAN",
      granted_nodes: ["tickets:assign", "assets:read"],
      revoked_nodes: ["assets:write"]
    }, null, 2)
  }
];

export default function AuditoriaPage() {
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEvent | null>(null);

  const getCriticalityBadge = (level: 'info' | 'warn' | 'critical') => {
    switch (level) {
      case 'info':
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-primary bg-primary/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Informativo
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Moderado
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-error bg-error/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span> Crítico
          </span>
        );
    }
  };

  return (
    <main className="max-w-[1600px] mx-auto space-y-lg p-md animate-fade-in">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl pb-md border-b border-outline-variant/30">
        <div className="space-y-xs">
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Auditoria</h1>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl">
            Consulte atividades relevantes, alterações administrativas e acessos sensíveis registrados no Peanut OS.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
            <span className="material-symbols-outlined text-[18px] mr-1">refresh</span>
            Atualizar
          </Button>
          <Button variant="secondary" disabled title="Módulo de exportação de logs em desenvolvimento">
            <span className="material-symbols-outlined text-[18px] mr-1">download</span>
            Exportar — Planejado
          </Button>
        </div>
      </header>

      {/* Bento Grid Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between hover:border-primary/30 transition-colors shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-primary">history_edu</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60">Mensal</span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">Registro de alterações</h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">--</p>
          </div>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between hover:border-error/30 transition-colors shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-error">security_update_warning</span>
            <span className="font-label-caps text-[10px] text-error opacity-60 uppercase font-semibold">Alerta</span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">Ações sensíveis</h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">--</p>
          </div>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between hover:border-tertiary/30 transition-colors shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-tertiary">rule</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60">Pendentes</span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">Filtros de revisão</h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">Ativos</p>
          </div>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-on-surface-variant">storage</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60">Status</span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">Retenção de histórico</h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">90 Dias</p>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-surface-container/30 border border-outline-variant p-md rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Busca</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-[16px] text-outline">search</span>
              <input
                className="w-full bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded pl-8 pr-sm py-1.5 outline-none transition-colors"
                placeholder="ID, Recurso..."
                type="text"
                disabled
              />
            </div>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Módulos</label>
            <select disabled className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none opacity-50 cursor-not-allowed">
              <option>Todos os Módulos</option>
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Ações</label>
            <select disabled className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none opacity-50 cursor-not-allowed">
              <option>Todas as Ações</option>
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Criticidade</label>
            <select disabled className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none opacity-50 cursor-not-allowed">
              <option>Qualquer Nível</option>
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Período</label>
            <div className="flex items-center gap-xs bg-background border border-outline-variant rounded px-sm py-1.5 opacity-50 cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
              <span className="text-body-sm text-[13px]">Últimas 24h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Logs Table + Details panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Table Column */}
        <div className="lg:col-span-8 bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">Data / Hora</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">Ação</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">Módulo</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">Usuário</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">Alvo</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">Criticidade</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {mockEvents.map((event) => {
                  const isSelected = selectedEvent?.id === event.id;
                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`hover:bg-surface-container/60 cursor-pointer transition-colors group ${
                        isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                      }`}
                    >
                      <td className="p-md font-mono text-on-surface-variant/80">{event.datetime}</td>
                      <td className="p-md text-on-surface font-medium">{event.action}</td>
                      <td className="p-md">
                        <span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] font-label-caps uppercase font-bold">
                          {event.module}
                        </span>
                      </td>
                      <td className="p-md text-on-surface-variant">{event.user}</td>
                      <td className="p-md text-on-surface-variant">{event.target}</td>
                      <td className="p-md">{getCriticalityBadge(event.criticality)}</td>
                      <td className="p-md text-right">
                        <button className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                          visibility
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Footer Table Control */}
          <div className="p-md bg-surface-container-low/40 border-t border-outline-variant flex justify-between items-center text-[12px]">
            <p className="text-on-surface-variant opacity-60">
              Exibindo {mockEvents.length} de {mockEvents.length} registros encontrados
            </p>
            <div className="flex gap-xs">
              <Button variant="ghost" className="p-1 rounded cursor-not-allowed opacity-40" disabled>
                <span className="material-symbols-outlined">chevron_left</span>
              </Button>
              <Button variant="ghost" className="p-1 rounded cursor-not-allowed opacity-40" disabled>
                <span className="material-symbols-outlined">chevron_right</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel Column */}
        <aside className="lg:col-span-4 flex flex-col gap-lg">
          {selectedEvent ? (
            <Card
              title="Detalhes do Evento"
              headerAction={
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="material-symbols-outlined text-outline hover:text-error transition-colors"
                >
                  close
                </button>
              }
            >
              <div className="space-y-md animate-fade-in text-[13px]">
                <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">ID do Evento</span>
                  <span className="font-mono text-primary font-bold mt-0.5">{selectedEvent.id}</span>
                </div>
                <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Endereço IP</span>
                  <span className="font-mono text-on-surface mt-0.5">{selectedEvent.ip}</span>
                </div>
                <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Navegador / Dispositivo</span>
                  <span className="text-on-surface-variant mt-0.5 break-words font-mono text-[11px]">
                    {selectedEvent.userAgent}
                  </span>
                </div>
                <div className="pt-sm">
                  <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-2">Payload Raw</span>
                  <pre className="bg-surface-container-lowest p-sm rounded font-mono text-[11px] text-tertiary border border-outline-variant overflow-x-auto">
                    {selectedEvent.payload}
                  </pre>
                </div>
              </div>
            </Card>
          ) : (
            <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center text-center space-y-md min-h-[300px] shadow-lg">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-[28px]">info</span>
              </div>
              <div>
                <h4 className="font-title-sm text-sm font-semibold text-on-surface">Nenhum evento selecionado</h4>
                <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs leading-relaxed max-w-[220px] mx-auto">
                  Selecione uma linha na tabela para visualizar o payload completo e metadados de auditoria.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg pt-md">
        <div className="bg-surface-container/20 border border-outline-variant/30 p-md rounded-lg flex gap-md">
          <div className="p-sm bg-primary/10 rounded-lg self-start shrink-0 text-primary">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div className="space-y-xs">
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">Eventos auditáveis</h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              O Peanut OS monitora login, criação de registros, alteração de privilégios e visualizações de dados sensíveis em todos os módulos para garantir total rastreabilidade.
            </p>
          </div>
        </div>
        <div className="bg-surface-container/20 border border-outline-variant/30 p-md rounded-lg flex gap-md">
          <div className="p-sm bg-tertiary/10 rounded-lg self-start shrink-0 text-tertiary">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <div className="space-y-xs">
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">Boas práticas</h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              Recomendamos a revisão semanal de eventos com criticidade &apos;Crítico&apos;. Certifique-se de que cada operador utiliza sua própria conta nominal protegida.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
