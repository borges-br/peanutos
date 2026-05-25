'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import ErrorState from '../../../../components/ui/ErrorState';
import RestrictedState from '../../../../components/ui/RestrictedState';

type TabType = 'summary' | 'items' | 'quotas' | 'recurrence' | 'history';

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const contractId = params?.contractId as string;

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [contract, setContract] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchContractDetails = async () => {
    try {
      const data = await apiRequest(`/contracts/${contractId}`);
      setContract(data);
      
      // Fetch dynamic quota if this is an active support/hybrid contract
      if (['RECURRING_SUPPORT', 'HYBRID'].includes(data.type)) {
        try {
          const quotaData = await apiRequest(`/contracts-quota/client/${data.clientId}`);
          setQuota(quotaData);
        } catch {
          // Ignore failed quota fetch (e.g. no quota model setup for this client)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar detalhes do contrato.');
    }
  };

  useEffect(() => {
    if (!contractId) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      await fetchContractDetails();
      setLoading(false);
    }

    loadData();
  }, [contractId]);

  const formatCurrency = (amountCents: number) => {
    if (!hasFinancialPrivilege) return t.contracts.protectedValue;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  const getStatusVariant = (contractStatus: string) => {
    switch (contractStatus) {
      case 'ACTIVE':
        return 'success';
      case 'SUSPENDED':
      case 'EXPIRED':
        return 'warning';
      case 'CANCELLED':
      case 'TERMINATED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-md select-none">
        <div className="h-10 bg-surface border border-outline-variant/30 rounded-xl animate-pulse w-[40%]" />
        <div className="h-12 bg-surface border border-outline-variant/30 rounded-xl animate-pulse" />
        <div className="h-64 bg-surface border border-outline-variant/30 rounded-xl animate-pulse mt-md" />
      </div>
    );
  }

  if (error || !contract) {
    return <ErrorState onRetry={fetchContractDetails} title="Não foi possível carregar o contrato" description={error || undefined} />;
  }

  const tabItems = [
    { id: 'summary', label: t.contracts.tabSummary },
    { id: 'items', label: t.contracts.tabItems },
    { id: 'quotas', label: t.contracts.tabQuotas },
    { id: 'recurrence', label: t.contracts.tabRecurrence },
    { id: 'history', label: t.contracts.tabHistory }
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Top Banner Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs max-w-xl">
          <div className="flex items-center gap-xs text-[13px] text-on-surface-variant font-mono">
            <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
              {contract.number}
            </span>
            <span>&bull;</span>
            <span>De {new Date(contract.startDate).toLocaleDateString('pt-BR')} {contract.endDate ? `até ${new Date(contract.endDate).toLocaleDateString('pt-BR')}` : '(Vigência indeterminada)'}</span>
          </div>
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight mt-1">
            {contract.title}
          </h2>
        </div>

        <div className="flex items-center gap-sm">
          <Badge variant={getStatusVariant(contract.status)}>
            {t.enums.contractStatus[contract.status as keyof typeof t.enums.contractStatus] || contract.status}
          </Badge>
          <Button variant="outline" onClick={() => router.push('/dashboard/contracts')} className="py-1 px-4">
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
            {t.common.back}
          </Button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-outline-variant/30 flex gap-sm overflow-x-auto">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`py-2 px-md border-b-2 text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Card Canvas */}
      <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-lg min-h-[350px] flex flex-col gap-md">
        
        {/* Tab Content: Summary */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div className="md:col-span-2 flex flex-col gap-md">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                {t.tickets.description}
              </h3>
              <p className="text-sm font-body text-on-surface leading-relaxed whitespace-pre-wrap">
                {contract.description || 'Nenhuma descrição fornecida.'}
              </p>
            </div>
            
            <div className="flex flex-col gap-md bg-surface-container-low border border-outline-variant p-md rounded-xl">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
                Resumo Geral
              </h3>
              <div className="flex flex-col gap-sm text-xs">
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="font-semibold text-on-surface-variant">{t.contracts.client}</span>
                  <span className="text-on-surface font-medium">{contract.client?.tradeName || 'Cliente'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="font-semibold text-on-surface-variant">Tipo de Contrato</span>
                  <span className="text-on-surface font-medium">
                    {t.enums.contractType[contract.type as keyof typeof t.enums.contractType] || contract.type}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="font-semibold text-on-surface-variant">{t.contracts.monthlyAmount}</span>
                  <span className="text-primary font-bold font-mono">{formatCurrency(contract.monthlyAmountCents)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="font-semibold text-on-surface-variant">{t.contracts.billingDay}</span>
                  <span className="text-on-surface font-semibold font-mono">{contract.billingDay}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Items */}
        {activeTab === 'items' && (
          <div className="flex flex-col gap-md">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
              {t.contracts.contractItems}
            </h3>

            {(!contract.lineItems || contract.lineItems.length === 0) ? (
              <p className="text-sm font-medium text-on-surface-variant/50 text-center py-6">Nenhum item registrado para este contrato.</p>
            ) : (
              <div className="overflow-x-auto border border-outline-variant rounded-xl shadow">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low font-sans text-on-surface-variant">
                      <th className="p-sm px-md font-semibold">Descrição</th>
                      <th className="p-sm px-md font-semibold">Tipo</th>
                      <th className="p-sm px-md font-semibold text-right">Qtd</th>
                      <th className="p-sm px-md font-semibold text-right">Valor Unitário</th>
                      <th className="p-sm px-md font-semibold text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-on-surface font-medium">
                    {contract.lineItems.map((item: any) => (
                      <tr key={item.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                        <td className="p-sm px-md font-sans text-sm">{item.description}</td>
                        <td className="p-sm px-md font-sans text-xs">
                          <Badge variant="neutral" className="text-[10px] py-0 px-2">
                            {item.itemType}
                          </Badge>
                        </td>
                        <td className="p-sm px-md text-right">{item.quantity}</td>
                        <td className="p-sm px-md text-right">{formatCurrency(item.unitPriceCents)}</td>
                        <td className="p-sm px-md text-right text-primary font-bold">{formatCurrency(item.totalPriceCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Quotas */}
        {activeTab === 'quotas' && (
          <div className="flex flex-col gap-md">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
              {t.contracts.tabQuotas}
            </h3>

            {(!quota || (contract.maxUsers === null && contract.maxAssets === null)) ? (
              <p className="text-sm font-medium text-on-surface-variant/50 text-center py-6">{t.contracts.noQuotas}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mt-2">
                {contract.maxUsers !== null && quota.usedUsers !== undefined && (
                  <div className="flex flex-col gap-sm bg-surface-container-low border border-outline-variant p-md rounded-xl shadow">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-on-surface-variant">{t.contracts.usersQuota}</span>
                      <span className="font-mono text-on-surface">
                        {quota.usedUsers} / {contract.maxUsers}
                      </span>
                    </div>
                    <div className="h-2 bg-surface border border-outline-variant rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          (quota.usedUsers / contract.maxUsers) >= 0.9 ? 'bg-error' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(100, (quota.usedUsers / contract.maxUsers) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant/65 mt-1 font-sans">
                      Controle dinâmico de contas ativas vinculadas a este cliente.
                    </span>
                  </div>
                )}

                {contract.maxAssets !== null && quota.usedAssets !== undefined && (
                  <div className="flex flex-col gap-sm bg-surface-container-low border border-outline-variant p-md rounded-xl shadow">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-on-surface-variant">{t.contracts.assetsQuota}</span>
                      <span className="font-mono text-on-surface">
                        {quota.usedAssets} / {contract.maxAssets}
                      </span>
                    </div>
                    <div className="h-2 bg-surface border border-outline-variant rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          (quota.usedAssets / contract.maxAssets) >= 0.9 ? 'bg-error' : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(100, (quota.usedAssets / contract.maxAssets) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant/65 mt-1 font-sans">
                      Quantidade de computadores, servidores e ativos de rede monitorados.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Recurrence (Financial Schedule) */}
        {activeTab === 'recurrence' && (
          <div className="flex flex-col gap-md">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
              {t.contracts.tabRecurrence}
            </h3>

            {!hasFinancialPrivilege ? (
              <RestrictedState />
            ) : (!contract.billingScheduleEvents || contract.billingScheduleEvents.length === 0) ? (
              <p className="text-sm font-medium text-on-surface-variant/50 text-center py-6">Nenhum agendamento recorrente gerado.</p>
            ) : (
              <div className="overflow-x-auto border border-outline-variant rounded-xl shadow">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low font-sans text-on-surface-variant">
                      <th className="p-sm px-md font-semibold">Data Planejada</th>
                      <th className="p-sm px-md font-semibold">Chave de Período</th>
                      <th className="p-sm px-md font-semibold">Descrição</th>
                      <th className="p-sm px-md font-semibold text-right">Valor Agendado</th>
                      <th className="p-sm px-md font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-on-surface font-medium">
                    {contract.billingScheduleEvents.map((evt: any) => (
                      <tr key={evt.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                        <td className="p-sm px-md font-sans text-sm">{new Date(evt.scheduledFor).toLocaleDateString('pt-BR')}</td>
                        <td className="p-sm px-md font-bold">{evt.periodKey}</td>
                        <td className="p-sm px-md font-sans text-[11px] text-on-surface-variant">{evt.description || '--'}</td>
                        <td className="p-sm px-md text-right text-primary font-bold">{formatCurrency(evt.amountCents)}</td>
                        <td className="p-sm px-md text-right font-sans">
                          <Badge variant={evt.status === 'PENDING' ? 'warning' : 'success'} className="text-[10px] py-0 px-2 uppercase font-semibold">
                            {evt.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: History */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-md">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
              {t.contracts.tabHistory}
            </h3>

            <div className="relative pl-6 border-l border-outline-variant/50 flex flex-col gap-md py-2">
              {(!contract.history || contract.history.length === 0) ? (
                <p className="text-sm font-medium text-on-surface-variant/50 text-left pl-2">{t.inventory.details.noHistory}</p>
              ) : (
                contract.history.map((h: any) => (
                  <div key={h.id} className="relative flex flex-col gap-0.5">
                    <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-primary border-4 border-background" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-primary">{h.event}</span>
                      <span className="text-on-surface-variant font-mono">{new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-sm font-body text-on-surface mt-0.5">{h.description}</p>
                    <span className="text-[11px] text-on-surface-variant/70 font-mono mt-0.5">Por: {h.actorUser?.name || 'Sistema'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
