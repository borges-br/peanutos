'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useI18n } from '../../../i18n/useI18n';

type TabId = 'geral' | 'empresa' | 'seguranca' | 'usuarios' | 'notificacoes' | 'integracoes' | 'modulos';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('geral');
  const [successSaved, setSuccessSaved] = useState(false);

  // Generic toggles
  const [logSensitiveViews, setLogSensitiveViews] = useState(true);
  const [confirmCriticalActions, setConfirmCriticalActions] = useState(true);

  const handleSave = () => {
    setSuccessSaved(true);
    setTimeout(() => setSuccessSaved(false), 3000);
  };

  const renderGeral = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg animate-fade-in">
      <Card title="Workspace">
        <div className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome do Workspace</label>
            <input
              className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors"
              type="text"
              defaultValue="Borges TI"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Ambiente</label>
            <select className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
              <option>Produção (Main Node)</option>
              <option>Homologação</option>
              <option>Desenvolvimento</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Preferências Gerais">
        <div className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Idioma do Sistema</label>
            <select className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors appearance-none">
              <option>Português (Brasil)</option>
              <option>English (US)</option>
              <option>Español</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Fuso Horário</label>
              <select className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors appearance-none">
                <option>GMT-03:00 Brasilia</option>
                <option>UTC 00:00</option>
              </select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Moeda Padrão</label>
              <select className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors appearance-none">
                <option>BRL (R$)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEmpresa = () => (
    <div className="space-y-gutter animate-fade-in">
      <Card title="Dados da Organização" headerAction={
        <span className="px-2 py-0.5 bg-tertiary/10 border border-tertiary/20 text-tertiary font-label-caps text-[10px] rounded uppercase font-bold tracking-wider">Beta</span>
      }>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-md" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-xs md:col-span-2">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Razão Social</label>
            <input
              className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
              placeholder="Informe o dado"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">CNPJ / Tax ID</label>
            <input
              className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface font-mono"
              placeholder="--"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">E-mail Financeiro</label>
            <input
              className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
              placeholder="Dado protegido"
              type="email"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Telefone</label>
            <input
              className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface"
              placeholder="--"
              type="text"
            />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Website</label>
            <input
              className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface"
              placeholder="https://..."
              type="text"
            />
          </div>
        </form>
      </Card>

      <div className="bg-surface border border-outline-variant rounded-xl p-lg opacity-60 shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-on-surface-variant">palette</span>
            <h2 className="font-title-sm text-sm font-semibold text-on-surface">Identidade Visual</h2>
          </div>
          <span className="px-2 py-0.5 bg-secondary-container/30 border border-outline-variant/30 text-on-surface-variant font-label-caps text-[9px] rounded uppercase font-bold tracking-wider">
            {t.common.planned}
          </span>
        </div>
        <p className="mt-md font-body-sm text-[13px] text-on-surface-variant italic">
          Módulo de customização de marca (White-label) em desenvolvimento para uma próxima fase.
        </p>
      </div>
    </div>
  );

  const renderSeguranca = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-lg animate-fade-in">
      <div className="md:col-span-2 space-y-gutter">
        <Card title="Políticas de Acesso Seguras">
          <div className="space-y-md">
            {/* Generic Active Toggles */}
            <div className="flex items-center justify-between p-sm hover:bg-surface-container/30 transition-colors rounded border border-outline-variant/10">
              <div>
                <p className="font-body-md text-[13px] font-semibold text-on-surface">Registrar Visualização de Dados Sensíveis</p>
                <p className="font-body-sm text-[12px] text-on-surface-variant">Auditar visualizações de credenciais criptografadas de forma permanente.</p>
              </div>
              <button
                onClick={() => setLogSensitiveViews(!logSensitiveViews)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none ${logSensitiveViews ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-surface transition-all duration-200 ${logSensitiveViews ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between p-sm hover:bg-surface-container/30 transition-colors rounded border border-outline-variant/10">
              <div>
                <p className="font-body-md text-[13px] font-semibold text-on-surface">Confirmação para Ações Críticas</p>
                <p className="font-body-sm text-[12px] text-on-surface-variant">Exigir senha ou confirmação para exclusão de registros ou redefinições.</p>
              </div>
              <button
                onClick={() => setConfirmCriticalActions(!confirmCriticalActions)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none ${confirmCriticalActions ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-surface transition-all duration-200 ${confirmCriticalActions ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Clearly Marked Planned Toggles */}
            <div className="flex items-center justify-between p-sm hover:bg-surface-container/20 transition-colors rounded border border-outline-variant/10 opacity-60">
              <div>
                <p className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-sm">
                  Autenticação de Dois Fatores (MFA)
                  <span className="text-[8px] bg-secondary-container/40 border border-outline-variant/30 text-on-secondary-container px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                    {t.common.planned}
                  </span>
                </p>
                <p className="font-body-sm text-[12px] text-on-surface-variant/70">Exigir MFA para todos os operadores administrativos do workspace.</p>
              </div>
              <div className="w-10 h-5 bg-outline-variant/30 rounded-full relative cursor-not-allowed">
                <div className="absolute left-1 top-1 w-3 h-3 bg-on-surface-variant/40 rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between p-sm hover:bg-surface-container/20 transition-colors rounded border border-outline-variant/10 opacity-60">
              <div>
                <p className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-sm">
                  Expiração de Senha (90 dias)
                  <span className="text-[8px] bg-secondary-container/40 border border-outline-variant/30 text-on-secondary-container px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                    {t.common.planned}
                  </span>
                </p>
                <p className="font-body-sm text-[12px] text-on-surface-variant/70">Forçar troca de credenciais de login trimestralmente.</p>
              </div>
              <div className="w-10 h-5 bg-outline-variant/30 rounded-full relative cursor-not-allowed">
                <div className="absolute left-1 top-1 w-3 h-3 bg-on-surface-variant/40 rounded-full"></div>
              </div>
            </div>

            <div className="flex items-center justify-between p-sm hover:bg-surface-container/20 transition-colors rounded border border-outline-variant/10 opacity-60">
              <div>
                <p className="font-body-md text-[13px] text-on-surface-variant flex items-center gap-sm">
                  Restrição por IP
                  <span className="text-[8px] bg-secondary-container/40 border border-outline-variant/30 text-on-secondary-container px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                    {t.common.planned}
                  </span>
                </p>
                <p className="font-body-sm text-[12px] text-on-surface-variant/70">Permitir acesso operacional apenas de blocos de IPs corporativos autorizados.</p>
              </div>
              <div className="w-10 h-5 bg-outline-variant/30 rounded-full relative cursor-not-allowed">
                <div className="absolute left-1 top-1 w-3 h-3 bg-on-surface-variant/40 rounded-full"></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-gutter">
        <div className="bg-error-container/10 border border-error/20 p-lg rounded-xl flex flex-col gap-md shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-sm text-error">
              <span className="material-symbols-outlined">lock</span>
              <h2 className="font-title-sm text-sm font-semibold">Chave de Assinatura</h2>
            </div>
            <span className="px-2 py-0.5 bg-secondary-container/40 border border-outline-variant/30 text-on-secondary-container font-label-caps text-[8px] rounded uppercase font-bold tracking-wider">
              {t.common.planned}
            </span>
          </div>
          <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
            Chave criptográfica prevista para validação de integridade. A rotação de chave manual está indisponível na fase atual.
          </p>
          <div className="bg-black/40 p-sm rounded font-mono text-center text-primary-fixed-dim text-[12px] select-all">
            ••••••••••••
          </div>
          <Button variant="ghost" disabled className="w-full border border-outline-variant/40 hover:bg-surface-container text-xs cursor-not-allowed opacity-50">
            REVELAR CHAVE
          </Button>
        </div>
      </div>
    </div>
  );

  const renderUsuarios = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg animate-fade-in">
      <div className="md:col-span-8 bg-surface border border-outline-variant rounded-xl overflow-hidden shadow shadow-black/20">
        <div className="p-md border-b border-outline-variant bg-surface-container-high/60 flex items-center justify-between">
          <h2 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Atalhos Administrativos</h2>
        </div>
        <div className="p-lg space-y-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-md border border-outline-variant/30 hover:border-primary/40 rounded-xl bg-surface-container/20 transition-all gap-md">
            <div>
              <h4 className="font-title-sm text-[14px] text-on-surface font-semibold">Gerenciar Usuários Internos</h4>
              <p className="text-body-sm text-[12px] text-on-surface-variant mt-1 leading-relaxed">Convide novos membros para o Peanut OS e configure seus status de acesso.</p>
            </div>
            <Button variant="outline" className="text-xs self-start sm:self-auto" onClick={() => router.push('/dashboard/configuracoes/usuarios-internos')}>
              Acessar Usuários
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-md border border-outline-variant/30 hover:border-primary/40 rounded-xl bg-surface-container/20 transition-all gap-md">
            <div>
              <h4 className="font-title-sm text-[14px] text-on-surface font-semibold">Matriz de Permissões (RBAC)</h4>
              <p className="text-body-sm text-[12px] text-on-surface-variant mt-1 leading-relaxed">Visualize e parametrize papéis (OWNER, ADMIN, FINANCIAL, TECHNICIAN, READ_ONLY).</p>
            </div>
            <Button variant="outline" className="text-xs self-start sm:self-auto" onClick={() => router.push('/dashboard/configuracoes/permissoes')}>
              Acessar RBAC
            </Button>
          </div>
        </div>
      </div>

      <div className="md:col-span-4">
        <Card title="Resumo das Contas">
          <div className="space-y-sm text-[13px]">
            <div className="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Proprietário (OWNER)</span>
              <span className="font-mono text-primary font-bold">1</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Administradores</span>
              <span className="font-mono text-primary font-bold">--</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-outline-variant/20">
              <span className="text-on-surface-variant">Técnicos Operacionais</span>
              <span className="font-mono text-primary font-bold">--</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-on-surface-variant">Contas Desativadas</span>
              <span className="font-mono text-primary font-bold">--</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderNotificacoes = () => (
    <div className="bg-surface border border-outline-variant p-xl rounded-xl text-center space-y-md shadow animate-fade-in max-w-xl mx-auto">
      <span className="material-symbols-outlined text-5xl text-outline-variant">notifications_active</span>
      <h2 className="font-headline-md text-lg text-on-surface font-semibold">Canais de Alerta e Notificação</h2>
      <p className="text-on-surface-variant text-[13px] leading-relaxed">
        Personalize como e onde sua equipe administrativa recebe alertas operacionais. Você poderá habilitar e configurar regras granulares baseadas nos canais abaixo:
      </p>

      {/* Verified Channels List */}
      <div className="grid grid-cols-3 gap-sm pt-md text-left">
        {['Sistema', 'E-mail', 'Webhook'].map((canal) => (
          <div key={canal} className="bg-surface-container border border-outline-variant p-sm rounded-lg flex items-center justify-between">
            <span className="font-body-md text-xs text-on-surface font-semibold">{canal}</span>
            <span className="text-[8px] bg-secondary-container/40 border border-outline-variant/30 text-on-secondary-container px-1 py-0.5 rounded uppercase font-bold tracking-widest">
              Previsto
            </span>
          </div>
        ))}
      </div>

      <div className="pt-md">
        <Button variant="outline" className="text-xs" onClick={() => router.push('/dashboard/configuracoes/preferencias/notificacoes')}>
          Configurar Regras Previstas
        </Button>
      </div>
    </div>
  );

  const renderIntegracoes = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md animate-fade-in">
      <div className="bg-surface border border-outline-variant p-md rounded-xl flex items-center gap-md relative overflow-hidden group shadow">
        <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-3xl">hub</span>
        </div>
        <div>
          <h3 className="font-title-sm text-sm font-semibold text-on-surface">Diretório Azure AD</h3>
          <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Sincronização de operadores.</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-bold rounded uppercase tracking-wider">ATIVO</span>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant p-md rounded-xl flex items-center gap-md opacity-60 shadow">
        <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-3xl">mail</span>
        </div>
        <div>
          <h3 className="font-title-sm text-sm font-semibold text-on-surface">Serviço de Envio SMTP</h3>
          <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Disparo de emails operacionais.</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-secondary-container/30 border border-outline-variant/30 text-on-surface-variant text-[9px] font-bold rounded uppercase tracking-wider">
            {t.common.planned}
          </span>
        </div>
      </div>

      <div className="bg-surface border border-outline-variant p-md rounded-xl flex items-center gap-md relative overflow-hidden group opacity-60 shadow">
        <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-3xl">api</span>
        </div>
        <div>
          <h3 className="font-title-sm text-sm font-semibold text-on-surface">Disparador de Webhooks</h3>
          <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">Integrações JSON em tempo real.</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-secondary-container/30 border border-outline-variant/30 text-on-surface-variant text-[9px] font-bold rounded uppercase tracking-wider">
            {t.common.planned}
          </span>
        </div>
      </div>
    </div>
  );

  const renderModulos = () => (
    <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow animate-fade-in">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead className="bg-surface-container font-label-caps text-label-caps text-on-surface-variant border-b border-outline-variant">
          <tr>
            <th className="p-md font-semibold">MÓDULO</th>
            <th className="p-md font-semibold">STATUS DE IMPLANTAÇÃO</th>
            <th className="p-md font-semibold">VERSÃO</th>
            <th className="p-md font-semibold text-right">LICENÇA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          <tr className="hover:bg-surface-container/20 transition-colors">
            <td className="p-md font-medium text-on-surface">Core Engine System</td>
            <td className="p-md">
              <div className="flex items-center gap-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span>Operacional</span>
              </div>
            </td>
            <td className="p-md font-mono text-on-surface-variant/80 text-[11px]">v2.4.0-stable</td>
            <td className="p-md text-right text-[11px] font-bold text-primary">CORPORATIVO</td>
          </tr>
          <tr className="hover:bg-surface-container/20 transition-colors">
            <td className="p-md text-on-surface-variant">Automation Robot v2</td>
            <td className="p-md text-on-surface-variant/70">
              <div className="flex items-center gap-xs">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                <span>Planejado (Fase 2)</span>
              </div>
            </td>
            <td className="p-md font-mono text-[11px] text-on-surface-variant/40">---</td>
            <td className="p-md text-right text-[11px] font-bold text-on-surface-variant/40">PENDENTE</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'geral': return renderGeral();
      case 'empresa': return renderEmpresa();
      case 'seguranca': return renderSeguranca();
      case 'usuarios': return renderUsuarios();
      case 'notificacoes': return renderNotificacoes();
      case 'integracoes': return renderIntegracoes();
      case 'modulos': return renderModulos();
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl pb-md border-b border-outline-variant/30">
        <div>
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Configurações</h1>
          <p className="font-body-md text-[14px] text-on-surface-variant mt-1">
            Gerencie as preferências globais, segurança e integrações do Peanut OS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-sm mt-md md:mt-0">
          <Button variant="secondary" onClick={() => router.push('/dashboard/auditoria')}>
            <span className="material-symbols-outlined text-[18px] mr-1">history</span>
            Ver Auditoria
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <span className="material-symbols-outlined text-[18px] mr-1">save</span>
            Salvar Alterações
          </Button>
        </div>
      </header>

      {/* Success Notification */}
      {successSaved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-md rounded-lg flex items-center gap-sm animate-fade-in">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="font-body-md text-[13px]">Configurações simuladas salvas com sucesso!</p>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="flex border-b border-outline-variant mb-xl overflow-x-auto whitespace-nowrap scrollbar-hide gap-lg">
        {([
          { id: 'geral', label: 'GERAL' },
          { id: 'empresa', label: 'EMPRESA' },
          { id: 'seguranca', label: 'SEGURANÇA' },
          { id: 'usuarios', label: 'USUÁRIOS E PERMISSÕES' },
          { id: 'notificacoes', label: 'NOTIFICAÇÕES' },
          { id: 'integracoes', label: 'INTEGRAÇÕES' },
          { id: 'modulos', label: 'MÓDULOS' }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-sm font-label-caps text-xs tracking-wider font-semibold transition-all ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant opacity-60 hover:opacity-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <section className="mt-md">
        {renderTabContent()}
      </section>
    </main>
  );
}
