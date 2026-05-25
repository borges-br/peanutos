'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { extractArray, extractRecord } from '../../../lib/api-shape';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../../i18n/useI18n';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import DataTable from '../../../components/ui/DataTable';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';

export default function InvoicesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status ? `&status=${status}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await apiRequest<unknown>(`/invoices?page=${page}&limit=10${statusParam}${searchParam}`);
      const responseRecord = extractRecord(response);
      const invoicesData = extractArray(response);
      setInvoices(invoicesData);
      setMeta(responseRecord.meta || { page: 1, totalPages: 1, total: invoicesData.length });
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  const formatCurrency = (amount: any) => {
    if (amount === null || amount === undefined) {
      return t.invoices.protectedValue || 'Valor protegido';
    }
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericAmount);
  };

  const getStatusBadge = (statusValue: string) => {
    switch (statusValue) {
      case 'PAID':
        return <Badge variant="success">{t.invoices.statuses.PAID}</Badge>;
      case 'OVERDUE':
        return <Badge variant="error">{t.invoices.statuses.OVERDUE}</Badge>;
      case 'ISSUED':
        return <Badge variant="info">{t.invoices.statuses.ISSUED}</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">{t.invoices.statuses.CANCELLED}</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="neutral">{t.invoices.statuses.DRAFT}</Badge>;
    }
  };

  // DataTable column definitions
  const columns = [
    {
      header: t.invoices.number || 'Número / Fatura',
      render: (invoice: any) => (
        <div className="flex flex-col py-0.5">
          <span className="font-semibold text-on-surface">{invoice.number}</span>
          <span className="text-[11px] text-on-surface-variant/70 mt-0.5 font-mono">ID: {invoice.id.substring(0, 8)}</span>
        </div>
      ),
    },
    {
      header: t.invoices.client || 'Cliente',
      render: (invoice: any) => (
        <span className="text-on-surface font-medium">
          {invoice.client?.tradeName || '--'}
        </span>
      ),
    },
    {
      header: t.invoices.dueDate || 'Vencimento',
      render: (invoice: any) => (
        <span className="font-mono text-on-surface-variant">
          {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      header: t.invoices.total || 'Total',
      render: (invoice: any) => (
        <span className={`font-mono font-semibold ${invoice.totalAmount !== null && invoice.totalAmount !== undefined ? 'text-primary' : 'text-on-surface-variant/60'}`}>
          {formatCurrency(invoice.totalAmount)}
        </span>
      ),
    },
    {
      header: t.invoices.status || t.common.status,
      render: (invoice: any) => getStatusBadge(invoice.status),
    },
    {
      header: t.common.actions,
      className: "text-right",
      render: (invoice: any) => (
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
          className="py-1 px-3 text-xs"
        >
          {t.common.details || 'Detalhes'}
        </Button>
      ),
    },
  ];

  // Mobile rendering card
  const renderMobileCard = (invoice: any) => (
    <div className="flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="font-bold text-on-surface text-[14px]">{invoice.number}</span>
          <span className="text-[11px] text-on-surface-variant/70 font-medium mt-0.5">{invoice.client?.tradeName}</span>
        </div>
        {getStatusBadge(invoice.status)}
      </div>
      <div className="h-[1px] bg-outline-variant/30 my-xs"></div>
      <div className="grid grid-cols-2 gap-xs text-[12px] font-mono">
        <div className="flex flex-col">
          <span className="text-on-surface-variant/70 uppercase text-[9px] font-sans font-bold">{t.invoices.dueDate || 'Vencimento'}</span>
          <span className="mt-0.5 text-on-surface">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-on-surface-variant/70 uppercase text-[9px] font-sans font-bold">{t.invoices.total || 'Total'}</span>
          <span className={`mt-0.5 font-bold ${invoice.totalAmount !== null && invoice.totalAmount !== undefined ? 'text-primary' : 'text-on-surface-variant/60'}`}>
            {formatCurrency(invoice.totalAmount)}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
        className="w-full mt-sm justify-center py-2 text-xs"
      >
        {t.common.details || 'Ver Detalhes'}
      </Button>
    </div>
  );

  const statusOptions = [
    { value: '', label: t.invoices.allStatuses || 'Todos os status' },
    { value: 'DRAFT', label: t.invoices.statuses.DRAFT },
    { value: 'ISSUED', label: t.invoices.statuses.ISSUED },
    { value: 'PAID', label: t.invoices.statuses.PAID },
    { value: 'OVERDUE', label: t.invoices.statuses.OVERDUE },
    { value: 'CANCELLED', label: t.invoices.statuses.CANCELLED },
  ];

  return (
    <div className="flex flex-col gap-lg select-none">
      {/* Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.invoices.title}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.invoices.subtitle}
          </p>
        </div>
        {hasFinancialPrivilege && (
          <Button variant="primary" onClick={() => router.push('/dashboard/invoices/new')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">add_circle</span>
            {t.invoices.newInvoice}
          </Button>
        )}
      </header>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface border border-outline-variant p-md rounded-xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm flex-1 max-w-xl">
          <Input
            type="text"
            placeholder={t.invoices.searchPlaceholder || "Buscar por número ou cliente..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" className="px-5">
            {t.common.searchAction || 'Buscar'}
          </Button>
        </form>

        <div className="flex gap-sm items-center">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={statusOptions}
            className="min-w-[180px]"
          />
          {(search || status) && (
            <Button variant="ghost" onClick={handleClearFilters} className="text-error/80 hover:text-error py-1">
              {t.invoices.clearFilters || t.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorState onRetry={fetchInvoices} />}

      {/* Data Table / List */}
      {!error && (
        loading ? (
          <div className="flex flex-col gap-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-surface-container-low border border-outline-variant/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title={t.invoices.emptyTitle}
            description={t.invoices.emptyDescription}
            action={
              hasFinancialPrivilege && (
                <Button variant="outline" onClick={() => router.push('/dashboard/invoices/new')}>
                  {t.invoices.createFirst}
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-md">
            <DataTable
              columns={columns}
              data={invoices}
              mobileRender={renderMobileCard}
              rowKey={(invoice) => invoice.id}
            />

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-md border-t border-outline-variant/30 pt-md px-md">
              <span className="text-[13px] text-on-surface-variant font-mono">
                Mostrando {invoices.length} de {meta.total} faturas (Pág. {meta.page} de {meta.totalPages})
              </span>
              <div className="flex gap-sm">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="py-1 px-4 text-xs"
                >
                  {t.common.previous || 'Anterior'}
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="py-1 px-4 text-xs"
                >
                  {t.common.next || 'Próximo'}
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

