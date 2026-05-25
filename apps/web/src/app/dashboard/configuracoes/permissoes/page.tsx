'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../../components/ui/Button';

type RoleId = 'OWNER' | 'ADMIN' | 'FINANCIAL' | 'TECHNICIAN' | 'READ_ONLY';

interface PermissionRule {
  module: string;
  action: string;
  scope: string;
  description: string;
  owner: boolean;
  admin: boolean;
  financial: boolean;
  tech: boolean;
  readonly: boolean;
}

const humanPermissionsMatrix: PermissionRule[] = [
  {
    module: 'Clientes',
    action: 'Visualizar dossiê',
    scope: 'Geral',
    description: 'Visualizar dados cadastrais, contatos e histórico do cliente.',
    owner: true, admin: true, financial: true, tech: true, readonly: true
  },
  {
    module: 'Clientes',
    action: 'Gerenciar cadastro',
    scope: 'Geral',
    description: 'Criar, alterar e inativar cadastros de clientes.',
    owner: true, admin: true, financial: false, tech: false, readonly: false
  },
  {
    module: 'Inventário',
    action: 'Visualizar ativos',
    scope: 'Operação',
    description: 'Visualizar computadores, servidores, licenças e roteadores.',
    owner: true, admin: true, financial: false, tech: true, readonly: true
  },
  {
    module: 'Inventário',
    action: 'Gerenciar ativos',
    scope: 'Operação',
    description: 'Cadastrar, modificar e alterar status de equipamentos técnicos.',
    owner: true, admin: true, financial: false, tech: true, readonly: false
  },
  {
    module: 'Chamados (Tickets)',
    action: 'Visualizar chamados',
    scope: 'Operação',
    description: 'Ver tickets de suporte técnico e SLAs operacionais.',
    owner: true, admin: true, financial: false, tech: true, readonly: true
  },
  {
    module: 'Chamados (Tickets)',
    action: 'Atender e atualizar',
    scope: 'Operação',
    description: 'Registrar tempos, comentários técnicos e alterar status do ticket.',
    owner: true, admin: true, financial: false, tech: true, readonly: false
  },
  {
    module: 'Contratos',
    action: 'Contratos — visualizar',
    scope: 'Comercial',
    description: 'Consultar quotas operacionais e termos contratuais de clientes.',
    owner: true, admin: true, financial: true, tech: false, readonly: true
  },
  {
    module: 'Contratos',
    action: 'Contratos — gerenciar',
    scope: 'Comercial',
    description: 'Cadastrar, reajustar e rescindir termos contratuais recorrentes.',
    owner: true, admin: false, financial: true, tech: false, readonly: false
  },
  {
    module: 'Configurações',
    action: 'Usuários internos — gerenciar',
    scope: 'Sistema',
    description: 'Convidar, desativar e alterar dados de operadores do Peanut OS.',
    owner: true, admin: true, financial: false, tech: false, readonly: false
  },
  {
    module: 'Configurações',
    action: 'Permissões — alterar',
    scope: 'Sistema',
    description: 'Modificar a matriz de privilégios e papéis administrativos.',
    owner: true, admin: false, financial: false, tech: false, readonly: false
  }
];

export default function PermissionsPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleId>('ADMIN');

  const getRoleInfo = (role: RoleId) => {
    switch (role) {
      case 'OWNER':
        return {
          title: 'Proprietário (OWNER)',
          badge: 'ACESSO TOTAL',
          badgeStyle: 'bg-primary/10 text-primary border-primary/20',
          desc: 'Acesso absoluto a todas as configurações de infraestrutura, faturamento global, chaves de criptografia e gerenciamento de permissões administrativas.',
          highlights: ['Permissões — alterar', 'Contratos — gerenciar', 'Usuários internos — gerenciar']
        };
      case 'ADMIN':
        return {
          title: 'Administrador (ADMIN)',
          badge: 'GERENCIAL',
          badgeStyle: 'bg-primary/10 text-primary border-primary/20',
          desc: 'Gestão de usuários internos, acompanhamento de SLAs operacionais, alterações cadastrais de clientes e configurações gerais do Peanut OS.',
          highlights: ['Usuários internos — gerenciar', 'Clientes — gerenciar cadastro', 'Inventário — gerenciar']
        };
      case 'FINANCIAL':
        return {
          title: 'Financeiro (FINANCIAL)',
          badge: 'CONTÁBIL',
          badgeStyle: 'bg-tertiary/10 text-tertiary border-tertiary/20',
          desc: 'Acesso restrito ao painel financeiro comercial, controle de contratos vigentes, agenda de faturamento e exportação de faturas e recibos.',
          highlights: ['Contratos — gerenciar', 'Contratos — visualizar', 'Clientes — visualizar dossiê']
        };
      case 'TECHNICIAN':
        return {
          title: 'Técnico (TECHNICIAN)',
          badge: 'OPERACIONAL',
          badgeStyle: 'bg-secondary-container text-on-secondary-container border-outline-variant',
          desc: 'Atendimento operacional e de campo. Gerenciamento do inventário de ativos técnicos, encerramento de chamados de suporte e lançamento de tempos.',
          highlights: ['Inventário — gerenciar', 'Chamados — atender e atualizar', 'Clientes — visualizar dossiê']
        };
      case 'READ_ONLY':
        return {
          title: 'Somente Leitura (READ_ONLY)',
          badge: 'OBSERVADOR',
          badgeStyle: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant/40',
          desc: 'Acesso global de observador no workspace Peanut OS. Permissões estritas de consulta, sem qualquer permissão de gravação, salvamento ou exclusão.',
          highlights: ['Clientes — visualizar dossiê', 'Inventário — visualizar ativos', 'Contratos — visualizar']
        };
    }
  };

  const currentRoleInfo = getRoleInfo(selectedRole);

  return (
    <main className="max-w-[1600px] mx-auto space-y-lg p-md animate-fade-in pb-xl">
      {/* Inner Header */}
      <header className="mb-xl flex flex-col md:flex-row md:items-center justify-between gap-md pb-md border-b border-outline-variant/30">
        <div>
          <h1 className="font-headline-md text-3xl text-on-surface font-semibold tracking-tight">Permissões / RBAC</h1>
          <p className="font-body-sm text-[14px] text-on-surface-variant opacity-70 mt-1">
            Gerencie privilégios operacionais, matrizes de acesso de papéis e regras de segurança de forma clara e humana.
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Button variant="secondary" onClick={() => router.push('/dashboard/configuracoes/usuarios-internos')}>
            <span className="material-symbols-outlined text-[18px] mr-1">group</span>
            Ver usuários internos
          </Button>
        </div>
      </header>

      {/* Top Bento Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-xl">
        <div className="bg-surface-container/20 border border-outline-variant p-md flex flex-col gap-xs rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Papéis do sistema</span>
            <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface">05</div>
          <div className="font-technical-data text-[12px] text-primary">Configurações RBAC Ativas</div>
        </div>
        <div className="bg-surface-container/20 border border-outline-variant p-md flex flex-col gap-xs rounded-lg border-l-2 border-l-error">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Sensibilidade</span>
            <span className="material-symbols-outlined text-error text-[20px]">security</span>
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface">Moderada</div>
          <div className="font-technical-data text-[12px] text-error">Registro de Ações Ativo</div>
        </div>
        <div className="bg-surface-container/20 border border-outline-variant p-md flex flex-col gap-xs rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Rastreabilidade</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">history_edu</span>
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface">100%</div>
          <div className="font-technical-data text-[12px] text-tertiary">Logs de Atividade Humanos</div>
        </div>
        <div className="bg-surface-container/20 border border-outline-variant p-md flex flex-col gap-xs rounded-lg">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60 uppercase font-semibold">Escopo Administrativo</span>
            <span className="material-symbols-outlined text-surface-tint text-[20px]">person_check</span>
          </div>
          <div className="font-display-lg text-2xl font-bold text-on-surface">Centralizado</div>
          <div className="font-technical-data text-[12px] text-surface-tint">Segurança de Workspace</div>
        </div>
      </div>

      {/* Role Tabs */}
      <nav className="flex items-center gap-lg border-b border-outline-variant mb-lg overflow-x-auto scrollbar-hide">
        {([
          { id: 'OWNER', label: 'Proprietário (OWNER)' },
          { id: 'ADMIN', label: 'Administrador (ADMIN)' },
          { id: 'FINANCIAL', label: 'Financeiro (FINANCIAL)' },
          { id: 'TECHNICIAN', label: 'Técnico (TECHNICIAN)' },
          { id: 'READ_ONLY', label: 'Somente Leitura' }
        ] as const).map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`pb-md px-xs text-[13px] transition-all whitespace-nowrap ${
              selectedRole === role.id
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100'
            }`}
          >
            {role.label}
          </button>
        ))}
      </nav>

      {/* Grid: Role Details Panel + Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Role Details Card */}
        <div className="lg:col-span-4 space-y-md">
          <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-lg space-y-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-title-sm text-sm font-semibold text-on-surface">{currentRoleInfo.title}</h3>
                <p className="font-mono text-[10px] text-on-surface-variant opacity-60 uppercase">Perfil administrativo</p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${currentRoleInfo.badgeStyle}`}>
                {currentRoleInfo.badge}
              </span>
            </div>

            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              {currentRoleInfo.desc}
            </p>

            <div className="space-y-sm pt-md border-t border-outline-variant/20">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Exemplos de Privilégios</span>
              <div className="flex flex-wrap gap-xs">
                {currentRoleInfo.highlights.map((h) => (
                  <span key={h} className="font-body-sm text-[11px] bg-surface-container border border-outline-variant/40 px-2 py-0.5 rounded text-on-surface">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-8 bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-xl">
          <div className="p-md bg-surface-container border-b border-outline-variant">
            <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
              Matriz Geral de Módulos e Ações
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold">Módulo</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold">Ação Administrativa</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold text-center">OWNER</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold text-center">ADMIN</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold text-center">FIN</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold text-center">TECH</th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold text-center">READ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {humanPermissionsMatrix.map((perm, idx) => (
                  <tr key={idx} className="hover:bg-surface-container/30 transition-colors">
                    <td className="p-md font-semibold text-on-surface">{perm.module}</td>
                    <td className="p-md text-on-surface-variant">
                      <span className="text-on-surface font-semibold block">{perm.action}</span>
                      <span className="text-[11px] block mt-0.5 opacity-70 leading-normal">{perm.description}</span>
                    </td>
                    {[
                      { role: 'OWNER', allowed: perm.owner },
                      { role: 'ADMIN', allowed: perm.admin },
                      { role: 'FINANCIAL', allowed: perm.financial },
                      { role: 'TECHNICIAN', allowed: perm.tech },
                      { role: 'READ_ONLY', allowed: perm.readonly }
                    ].map((cell, cidx) => {
                      const isHighlighted = selectedRole === cell.role;
                      return (
                        <td key={cidx} className={`p-md text-center ${isHighlighted ? 'bg-primary/5' : ''}`}>
                          {cell.allowed ? (
                            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'wght' 600" }}>check</span>
                          ) : (
                            <span className="material-symbols-outlined text-outline-variant/30 text-[18px]">lock</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
