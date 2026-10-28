'use client';

import { useWorkspaceFormatters } from '../../../i18n/useWorkspaceFormatters';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import ErrorState from '../../../components/ui/ErrorState';
import RestrictedState from '../../../components/ui/RestrictedState';

export default function FinancialsOverviewPage() {
  const { formatDate } = useWorkspaceFormatters();
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();

  // Metrics state
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security Verification
  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchFinancialMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/financials/mrr');
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && hasFinancialPrivilege) {
      fetchFinancialMetrics();
    } else if (!authLoading && !hasFinancialPrivilege) {
      setLoading(false);
    }
  }, [hasFinancialPrivilege, authLoading]);

  const formatCurrency = (amountCents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col gap-md select-none">
        <div className="h-10 bg-surface border border-outline-variant/30 rounded-xl animate-pulse w-[40%]" />
        <div className="h-32 bg-surface border border-outline-variant/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface border border-outline-variant/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Unauthorized display
  if (!hasFinancialPrivilege) {
    return (
      <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
        <RestrictedState
          title={t.states.restrictedTitle}
          description="Você não tem permissão para visualizar informações financeiras do Peanut OS."
        />
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-fit">
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
          Voltar para Painel Principal
        </Button>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col gap-md select-none">
        <ErrorState onRetry={fetchFinancialMetrics} title="Não foi possível carregar dados financeiros" description={error || undefined} />
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-fit">
          {t.common.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.financials.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.financials.subtitle}
          </p>
        </div>
      </header>

      {/* Main MRR highlight card */}
      <div className="bg-gradient-to-br from-surface to-surface-container-low border border-primary/20 p-lg rounded-xl shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="flex flex-col gap-sm z-10">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest">{t.financials.mrrTitle}</span>
          <h3 className="text-4xl font-extrabold text-on-surface font-mono">{formatCurrency(metrics.totalMrrCents)}</h3>
          <p className="text-[13px] text-on-surface-variant/80">{t.financials.mrrDescription}</p>
        </div>
        <div className="z-10 hidden sm:block">
          <span className="inline-flex items-center gap-xs px-md py-sm rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-wider">
            {t.financials.badgeLabel}
          </span>
        </div>
        {/* Subtle decorative mesh background light */}
        <div className="absolute right-0 bottom-0 w-44 h-44 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-lg flex flex-col gap-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{t.financials.activeContracts}</span>
          <span className="text-2xl font-bold font-mono text-on-surface mt-1">{metrics.activeContracts}</span>
          <span className="text-[11px] text-on-surface-variant/60">{t.financials.activeContractsDesc}</span>
        </div>

        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-lg flex flex-col gap-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{t.financials.averageContract}</span>
          <span className="text-2xl font-bold font-mono text-primary mt-1">{formatCurrency(metrics.averageContractValueCents)}</span>
          <span className="text-[11px] text-on-surface-variant/60">{t.financials.averageContractDesc}</span>
        </div>

        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-lg flex flex-col gap-xs">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">{t.financials.nextBilling}</span>
          <span className="text-2xl font-bold font-mono text-warning mt-1">Dia 10/mês</span>
          <span className="text-[11px] text-on-surface-variant/60">{t.financials.nextBillingDesc}</span>
        </div>
      </div>

      {metrics.monthlyReceived && (
        <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-lg flex flex-col gap-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm border-b border-outline-variant/30 pb-md">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Recebido líquido do mês</h3>
              <p className="text-[12px] text-on-surface-variant">
                Faturas pagas em {metrics.monthlyReceived.period}. Custos de material são internos e não aparecem no PDF do cliente.
              </p>
            </div>
            <Badge variant="success" className="text-[10px] py-0 px-2 uppercase font-semibold">
              {metrics.monthlyReceived.paidInvoices} faturas pagas
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="bg-surface-container-low border border-outline-variant/40 rounded-lg p-md">
              <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Bruto recebido</span>
              <div className="text-2xl font-bold font-mono text-on-surface mt-xs">
                {formatCurrency(metrics.monthlyReceived.grossReceivedCents)}
              </div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/40 rounded-lg p-md">
              <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Custo de materiais</span>
              <div className="text-2xl font-bold font-mono text-warning mt-xs">
                {formatCurrency(metrics.monthlyReceived.materialCostCents)}
              </div>
            </div>
            <div className="bg-surface-container-low border border-primary/30 rounded-lg p-md">
              <span className="text-[11px] text-on-surface-variant uppercase font-semibold">Líquido estimado</span>
              <div className="text-2xl font-bold font-mono text-primary mt-xs">
                {formatCurrency(metrics.monthlyReceived.netReceivedCents)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary split: Contracts status chart vs Billing events schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Agenda Card */}
        <div className="lg:col-span-2 bg-surface border border-outline-variant p-lg rounded-xl shadow-lg flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-on-surface border-b border-outline-variant/30 pb-2">
            {t.financials.agendaTitle}
          </h3>
          
          {(!metrics.nextBillingEvents || metrics.nextBillingEvents.length === 0) ? (
            <p className="text-sm font-medium text-on-surface-variant/50 italic py-4">{t.financials.agendaEmpty}</p>
          ) : (
            <div className="overflow-x-auto border border-outline-variant/60 rounded-xl shadow">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-outline-variant/60 bg-surface-container-low font-sans text-on-surface-variant">
                    <th className="p-sm px-md font-semibold">{t.financials.colDate}</th>
                    <th className="p-sm px-md font-semibold">{t.financials.colClient}</th>
                    <th className="p-sm px-md font-semibold">{t.financials.colContract}</th>
                    <th className="p-sm px-md font-semibold text-right">{t.financials.colValue}</th>
                    <th className="p-sm px-md font-semibold text-right">{t.financials.colStatus}</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface font-medium">
                  {metrics.nextBillingEvents.map((evt: any) => (
                    <tr key={evt.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                      <td className="p-sm px-md font-sans text-sm font-semibold">{formatDate(evt.scheduledFor)}</td>
                      <td className="p-sm px-md font-sans text-sm">{evt.client?.tradeName || evt.client?.legalName || '--'}</td>
                      <td className="p-sm px-md">{evt.contract?.number || '--'}</td>
                      <td className="p-sm px-md text-right text-success font-bold">{formatCurrency(evt.amountCents)}</td>
                      <td className="p-sm px-md text-right font-sans">
                        <Badge variant="warning" className="text-[10px] py-0 px-2 uppercase font-semibold">
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

        {/* Status Breakdown Card */}
        <div className="bg-surface border border-outline-variant p-lg rounded-xl shadow-lg flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-on-surface border-b border-outline-variant/30 pb-2">
            {t.financials.statusTitle}
          </h3>

          <div className="flex flex-col gap-md mt-1">
            {(!metrics.contractsByStatus || Object.keys(metrics.contractsByStatus).length === 0) ? (
              <p className="text-sm font-medium text-on-surface-variant/50 italic py-4">{t.financials.statusEmpty}</p>
            ) : (
              Object.entries(metrics.contractsByStatus).map(([statusName, count]: any) => {
                const label = t.enums.contractStatus[statusName as keyof typeof t.enums.contractStatus] || statusName;
                const fillPercent = Math.min(100, (count / Math.max(1, metrics.activeContracts)) * 100);
                
                return (
                  <div key={statusName} className="flex items-center justify-between gap-sm text-xs font-mono">
                    <span className="font-semibold text-on-surface-variant w-24 font-sans">{label}</span>
                    <div className="flex-1 h-2 bg-surface-container-low border border-outline-variant/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          statusName === 'ACTIVE'
                            ? 'bg-success'
                            : statusName === 'SUSPENDED'
                            ? 'bg-warning'
                            : 'bg-on-surface-variant/40'
                        }`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                    <span className="font-bold text-on-surface text-right w-6">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
