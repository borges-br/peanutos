'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '../../../../../lib/api';
import { useAuth } from '../../../../../context/AuthContext';
import { useI18n } from '../../../../../i18n/useI18n';
import Button from '../../../../../components/ui/Button';
import Badge from '../../../../../components/ui/Badge';
import DataTable from '../../../../../components/ui/DataTable';
import EmptyState from '../../../../../components/ui/EmptyState';
import ClientContextTabs from '../../../../../components/layout/ClientContextTabs';
import ClientPageHeader from '../../../../../components/layout/ClientPageHeader';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';

export default function ClientContractsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { t } = useI18n();

  const [contracts, setContracts] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientData, contractsData] = await Promise.all([
          apiRequest(`/clients/${id}`),
          apiRequest(`/contracts?clientId=${id}&limit=50`),
        ]);
        setClient(clientData);
        setContracts(contractsData.data || []);
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar contratos do cliente.');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchData();
    }
  }, [id, user]);

  const formatCurrency = (amountCents: number) => {
    if (!hasFinancialPrivilege) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
  };

  const getStatusVariant = (contractStatus: string): BadgeVariant => {
    switch (contractStatus) {
      case 'ACTIVE':
        return 'success';
      case 'DRAFT':
        return 'neutral';
      case 'SUSPENDED':
        return 'warning';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'TERMINATED':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (contractStatus: string) =>
    t.enums.contractStatus[contractStatus as keyof typeof t.enums.contractStatus] || contractStatus;

  const getTypeLabel = (contractType: string) =>
    t.enums.contractType[contractType as keyof typeof t.enums.contractType] || contractType;

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-sm text-on-surface-variant">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/10 border-t-primary" />
        <p className="text-sm">{t.common.loading}</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col gap-md">
        <div className="rounded-xl border border-error-container/20 bg-error-container/10 p-md text-sm text-error">
          {error || 'Cliente não encontrado.'}
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/clients')} className="w-fit">
          {t.clients.actions.backToList}
        </Button>
      </div>
    );
  }

  const clientName = client.tradeName || client.legalName || t.clients.title;
  const breadcrumbs = [
    { label: t.clients.title, href: '/dashboard/clients' },
    { label: clientName, href: `/dashboard/clients/${id}` },
    { label: t.clients.tabs.contracts },
  ];
  const columns = [
    {
      header: t.contracts.numberTitle,
      render: (contract: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-mono text-[12px] font-bold text-primary">{contract.number}</span>
          <span className="mt-0.5 font-semibold text-on-surface">{contract.title}</span>
        </div>
      ),
    },
    {
      header: t.contracts.typeStatus,
      render: (contract: any) => (
        <span className="text-[13px] text-on-surface-variant">{getTypeLabel(contract.type)}</span>
      ),
    },
    {
      header: t.common.status,
      render: (contract: any) => (
        <Badge variant={getStatusVariant(contract.status)}>{getStatusLabel(contract.status)}</Badge>
      ),
    },
    {
      header: 'Início',
      render: (contract: any) => (
        <span className="font-mono text-[12px] text-on-surface">
          {new Date(contract.startDate).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      render: (contract: any) => (
        <span className="font-mono text-[12px] text-on-surface">
          {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado'}
        </span>
      ),
    },
    {
      header: t.contracts.monthlyAmount,
      render: (contract: any) => (
        <span className="font-semibold text-primary">{formatCurrency(contract.monthlyAmountCents)}</span>
      ),
    },
    {
      header: t.common.actions,
      className: 'text-right',
      render: (contract: any) => (
        <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contract.id}`)} className="py-1 px-3 text-xs">
          {t.common.manage}
        </Button>
      ),
    },
  ];

  const renderMobileContract = (contract: any) => (
    <div className="flex flex-col gap-sm">
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <span className="font-mono text-[12px] font-bold text-primary">{contract.number}</span>
          <span className="block truncate font-semibold text-on-surface">{contract.title}</span>
        </div>
        <Badge variant={getStatusVariant(contract.status)}>{getStatusLabel(contract.status)}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-xs border-y border-outline-variant/30 py-sm text-[12px]">
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Tipo</span>
          <span className="truncate text-on-surface">{getTypeLabel(contract.type)}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">{t.contracts.monthlyAmount}</span>
          <span className="truncate font-semibold text-primary">{formatCurrency(contract.monthlyAmountCents)}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Início</span>
          <span className="font-mono text-on-surface">{new Date(contract.startDate).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] uppercase tracking-wider text-on-surface-variant">Vencimento</span>
          <span className="font-mono text-on-surface">{contract.endDate ? new Date(contract.endDate).toLocaleDateString('pt-BR') : 'Indeterminado'}</span>
        </div>
      </div>
      <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contract.id}`)} className="w-full py-2">
        {t.common.manage}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={breadcrumbs}
        title={t.clients.pages.contractsTitle.replace('{name}', clientName)}
        description={t.clients.pages.contractsDescription.replace('{legalName}', client.legalName || clientName)}
        primaryActions={
          hasFinancialPrivilege ? (
            <Button variant="primary" onClick={() => router.push(`/dashboard/contracts/new?clientId=${id}`)}>
              <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
              {t.clients.actions.newContract}
            </Button>
          ) : undefined
        }
        tabs={<ClientContextTabs clientId={id} />}
      />

      {contracts.length === 0 ? (
        <EmptyState
          title={t.clients.empty.contracts}
          description={t.states.emptyDescription}
          action={
            hasFinancialPrivilege ? (
              <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/new?clientId=${id}`)}>
                {t.clients.actions.firstContract}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={contracts}
          mobileRender={renderMobileContract}
          rowKey={(contract) => contract.id}
        />
      )}
    </div>
  );
}
