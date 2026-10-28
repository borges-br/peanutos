'use client';

import { useWorkspaceFormatters } from '../../../i18n/useWorkspaceFormatters';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

export default function AuditoriaPage() {
  const { formatDateTime } = useWorkspaceFormatters();
  const { t } = useI18n();
  const { user } = useAuth();

  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [apiFilters, setApiFilters] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Active filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Selected Event Details States
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isDetailsRestricted, setIsDetailsRestricted] = useState(false);

  const fetchLogs = async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(pageNum));
      queryParams.append('limit', String(limit));

      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }
      if (moduleFilter) {
        queryParams.append('entityType', moduleFilter);
      }
      if (actionFilter) {
        queryParams.append('action', actionFilter);
      }
      if (severityFilter) {
        queryParams.append('severity', severityFilter);
      }

      if (periodFilter !== 'all') {
        const now = new Date();
        let dateFromStr = '';
        if (periodFilter === 'last24h') {
          dateFromStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        } else if (periodFilter === 'last7days') {
          dateFromStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (periodFilter === 'last30days') {
          dateFromStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        if (dateFromStr) {
          queryParams.append('dateFrom', dateFromStr);
        }
      }

      const response = await apiRequest(`/audit-logs?${queryParams.toString()}`);
      setLogs(response.data || []);
      setTotal(response.meta?.total || 0);
      setTotalPages(response.meta?.totalPages || 1);
      setPage(response.meta?.page || pageNum);
      setSummary(response.summary || null);
      setApiFilters(response.filters || null);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    if (user?.role === 'READ_ONLY') {
      setIsDetailsRestricted(true);
      setSelectedEvent(null);
      return;
    }
    setLoadingDetails(true);
    setDetailsError(null);
    setIsDetailsRestricted(false);
    setSelectedEvent(null);
    try {
      const response = await apiRequest(`/audit-logs/${id}`);
      setSelectedEvent(response);
    } catch (err: any) {
      const errMsg = String(err.message || '').toLowerCase();
      if (
        errMsg.includes('forbidden') ||
        errMsg.includes('unauthorized') ||
        errMsg.includes('negado') ||
        errMsg.includes('restrito') ||
        errMsg.includes('403')
      ) {
        setIsDetailsRestricted(true);
      } else {
        setDetailsError(err.message || 'Falha ao carregar detalhes');
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [moduleFilter, actionFilter, severityFilter, periodFilter]);

  useEffect(() => {
    if (selectedEventId) {
      fetchDetails(selectedEventId);
    } else {
      setSelectedEvent(null);
      setIsDetailsRestricted(false);
      setDetailsError(null);
    }
  }, [selectedEventId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchLogs(newPage);
    }
  };

  const getShortId = (id: string) => {
    if (!id) return '';
    return id.length > 8 ? `ID: ${id.substring(0, 8)}` : `ID: ${id}`;
  };

  const getCriticalityBadge = (level: string) => {
    switch (level) {
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-primary bg-primary/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>{' '}
            {t.audit.severities.INFO}
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>{' '}
            {t.audit.severities.WARN}
          </span>
        );
      case 'SECURITY_ALERT':
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-error bg-error/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>{' '}
            {t.audit.severities.SECURITY_ALERT}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-xs text-[11px] font-label-caps text-on-surface-variant bg-on-surface-variant/10 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant"></span>{' '}
            {level}
          </span>
        );
    }
  };

  return (
    <main className="max-w-[1600px] mx-auto space-y-lg p-md animate-fade-in select-none select-text">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl pb-md border-b border-outline-variant/30">
        <div className="space-y-xs">
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">
            {t.audit.title}
          </h1>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl">
            {t.audit.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedEventId(null);
              fetchLogs(page);
            }}
          >
            <span className="material-symbols-outlined text-[18px] mr-1">refresh</span>
            {t.audit.refresh}
          </Button>
          <Button
            variant="secondary"
            disabled
            title={t.audit.exportPlannedTitle}
          >
            <span className="material-symbols-outlined text-[18px] mr-1">download</span>
            {t.audit.exportPlanned}
          </Button>
        </div>
      </header>

      {/* Bento Grid Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between hover:border-primary/30 transition-colors shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-primary">history_edu</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60">
              {t.audit.metrics.monthly}
            </span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
              {t.audit.metrics.totalLogs}
            </h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">
              {summary?.totalLogs !== undefined ? summary.totalLogs : '--'}
            </p>
          </div>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between hover:border-error/30 transition-colors shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-error">security_update_warning</span>
            <span className="font-label-caps text-[10px] text-error opacity-60 uppercase font-semibold">
              {t.audit.metrics.alert}
            </span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
              {t.audit.metrics.sensitiveActions}
            </h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">
              {summary?.sensitiveActions !== undefined ? summary.sensitiveActions : '--'}
            </p>
          </div>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between hover:border-tertiary/30 transition-colors shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-tertiary">rule</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60">
              {t.audit.metrics.pending}
            </span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
              {t.audit.metrics.securityAlerts}
            </h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">
              {summary?.securityAlerts !== undefined ? summary.securityAlerts : '--'}
            </p>
          </div>
        </div>

        <div className="bg-surface-container/20 border border-outline-variant/40 p-md rounded-lg flex flex-col justify-between shadow">
          <div className="flex justify-between items-start">
            <span className="material-symbols-outlined text-on-surface-variant">storage</span>
            <span className="font-label-caps text-[10px] text-on-surface-variant opacity-60">
              {t.audit.metrics.status}
            </span>
          </div>
          <div className="mt-md">
            <h3 className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
              {t.audit.metrics.last24h}
            </h3>
            <p className="font-headline-md text-xl mt-xs font-semibold text-on-surface">
              {summary?.last24h !== undefined ? summary.last24h : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-surface-container/30 border border-outline-variant p-md rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              {t.audit.filters.search}
            </label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-[16px] text-outline">search</span>
              <input
                className="w-full bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded pl-8 pr-sm py-1.5 outline-none transition-colors"
                placeholder={t.audit.filters.searchPlaceholder}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              {t.audit.filters.modules}
            </label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none"
            >
              <option value="">{t.audit.filters.allModules}</option>
              {apiFilters?.entityTypes?.map((mod: string) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              {t.audit.filters.actions}
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none"
            >
              <option value="">{t.audit.filters.allActions}</option>
              {apiFilters?.actions?.map((act: string) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              {t.audit.filters.criticality}
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none"
            >
              <option value="">{t.audit.filters.anyCriticality}</option>
              {apiFilters?.severities?.map((sev: string) => (
                <option key={sev} value={sev}>
                  {t.audit.severities[sev as keyof typeof t.audit.severities] || sev}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              {t.audit.filters.period}
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none cursor-pointer"
            >
              <option value="all">Qualquer Período</option>
              <option value="last24h">{t.audit.filters.last24h}</option>
              <option value="last7days">{t.audit.filters.last7days}</option>
              <option value="last30days">{t.audit.filters.last30days}</option>
            </select>
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
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.audit.table.datetime}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.audit.table.action}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.audit.table.module}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.audit.table.user}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.audit.table.target}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.audit.table.criticality}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap text-right">
                    {t.audit.table.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-xl text-center">
                      <div className="flex flex-col justify-center items-center py-lg gap-sm text-on-surface-variant font-body-sm select-none">
                        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
                        <p>{t.common.loading}</p>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="p-xl text-center">
                      <div className="flex flex-col items-center justify-center space-y-md py-lg select-none">
                        <div className="w-12 h-12 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-error">
                          <span className="material-symbols-outlined text-[28px]">error</span>
                        </div>
                        <div>
                          <h4 className="font-title-sm text-sm font-semibold text-error">
                            {t.states.errorTitle}
                          </h4>
                          <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs leading-relaxed max-w-[280px] mx-auto">
                            {error}
                          </p>
                          <Button variant="outline" className="mt-md py-1 px-4 text-xs font-semibold" onClick={() => fetchLogs(page)}>
                            {t.common.retry}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-xl text-center">
                      <div className="flex flex-col items-center justify-center space-y-md py-lg select-none">
                        <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                          <span className="material-symbols-outlined text-outline text-[28px]">search_off</span>
                        </div>
                        <div>
                          <h4 className="font-title-sm text-sm font-semibold text-on-surface">
                            {t.states.emptyTitle}
                          </h4>
                          <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs leading-relaxed max-w-[280px] mx-auto">
                            {t.states.emptyDescription}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((event) => {
                    const isSelected = selectedEventId === event.id;
                    return (
                      <tr
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        className={`hover:bg-surface-container/60 cursor-pointer transition-colors group ${
                          isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                      >
                        <td className="p-md font-mono text-on-surface-variant/80">
                          {formatDateTime(event.createdAt)}
                        </td>
                        <td className="p-md text-on-surface font-medium">{event.action}</td>
                        <td className="p-md">
                          <span className="px-1.5 py-0.5 bg-surface-container-high text-on-surface-variant rounded text-[10px] font-label-caps uppercase font-bold">
                            {event.entityType}
                          </span>
                        </td>
                        <td className="p-md text-on-surface-variant">
                          {event.actor?.name || 'Sistema'}
                        </td>
                        <td className="p-md text-on-surface-variant font-mono text-[12px]">
                          {getShortId(event.entityId)}
                        </td>
                        <td className="p-md">{getCriticalityBadge(event.severity)}</td>
                        <td className="p-md text-right">
                          <button aria-label="Ver detalhes da atividade" onClick={(e)=>{e.stopPropagation();setSelectedEventId(event.id);}} className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                            visibility
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Footer Table Control */}
          <div className="p-md bg-surface-container-low/40 border-t border-outline-variant flex justify-between items-center text-[12px]">
            <p className="text-on-surface-variant opacity-60">
              {t.audit.table.pagination
                .replace('{count}', String(logs.length))
                .replace('{total}', String(total))}
            </p>
            <div className="flex gap-xs items-center">
              <span className="text-on-surface-variant mr-sm opacity-60">
                Pág. {page} de {totalPages}
              </span>
              <Button
                variant="ghost"
                className={`p-1 rounded ${page <= 1 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-outline-variant/20'}`}
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </Button>
              <Button
                variant="ghost"
                className={`p-1 rounded ${page >= totalPages ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-outline-variant/20'}`}
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Side Panel Column */}
        <aside className="lg:col-span-4 flex flex-col gap-lg">
          {selectedEventId ? (
            loadingDetails ? (
              <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center text-center space-y-md min-h-[300px] shadow-lg animate-pulse">
                <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
                <p className="text-body-sm text-on-surface-variant">{t.common.loading}</p>
              </div>
            ) : isDetailsRestricted ? (
              <Card
                title={t.audit.details.title}
                headerAction={
                  <button
                    onClick={() => {
                      setSelectedEventId(null);
                      setSelectedEvent(null);
                      setIsDetailsRestricted(false);
                    }}
                    className="material-symbols-outlined text-outline hover:text-error transition-colors"
                  >
                    close
                  </button>
                }
              >
                <div className="space-y-md animate-fade-in text-[13px]">
                  <div className="bg-error-container/10 border border-error-container/20 text-error p-md rounded-lg text-body-sm flex gap-sm items-start">
                    <span className="material-symbols-outlined text-error shrink-0">lock</span>
                    <div>
                      <h4 className="font-bold text-sm text-error">{t.audit.details.restrictedAccess}</h4>
                      <p className="text-[12px] text-on-surface-variant mt-xs leading-relaxed leading-normal">
                        {t.audit.details.restrictedAccessDetail}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : detailsError ? (
              <Card
                title={t.audit.details.title}
                headerAction={
                  <button
                    onClick={() => {
                      setSelectedEventId(null);
                      setSelectedEvent(null);
                      setDetailsError(null);
                    }}
                    className="material-symbols-outlined text-outline hover:text-error transition-colors"
                  >
                    close
                  </button>
                }
              >
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
                  {detailsError}
                </div>
              </Card>
            ) : selectedEvent ? (
              <Card
                title={t.audit.details.title}
                headerAction={
                  <button
                    onClick={() => {
                      setSelectedEventId(null);
                      setSelectedEvent(null);
                    }}
                    className="material-symbols-outlined text-outline hover:text-error transition-colors"
                  >
                    close
                  </button>
                }
              >
                <div className="space-y-md animate-fade-in text-[13px]">
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.audit.details.eventId}
                    </span>
                    <span className="font-mono text-primary font-bold mt-0.5 select-all">
                      {selectedEvent.id}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.audit.table.datetime}
                    </span>
                    <span className="font-mono text-on-surface mt-0.5">
                      {formatDateTime(selectedEvent.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.audit.table.action}
                    </span>
                    <span className="font-medium text-on-surface mt-0.5">
                      {selectedEvent.action}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      Módulo / Entidade
                    </span>
                    <span className="font-medium text-on-surface mt-0.5">
                      {selectedEvent.entityType} ({getShortId(selectedEvent.entityId)})
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.audit.table.user}
                    </span>
                    <span className="font-medium text-on-surface mt-0.5">
                      {selectedEvent.actor
                        ? `${selectedEvent.actor.name} (${selectedEvent.actor.role})`
                        : 'Sistema'}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.audit.details.ipAddress}
                    </span>
                    <span className="font-mono text-on-surface mt-0.5">
                      {selectedEvent.ipAddress || '--'}
                    </span>
                  </div>
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.audit.details.userAgent}
                    </span>
                    <span className="text-on-surface-variant mt-0.5 break-words font-mono text-[11px]">
                      {selectedEvent.userAgent || '--'}
                    </span>
                  </div>

                  {selectedEvent.beforeJson ? (
                    <div className="pt-sm">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                        Payload Anterior
                      </span>
                      <pre className="bg-surface-container-lowest p-sm rounded font-mono text-[11px] text-tertiary border border-outline-variant overflow-x-auto max-h-[160px] whitespace-pre-wrap select-text">
                        {JSON.stringify(selectedEvent.beforeJson, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  {selectedEvent.afterJson ? (
                    <div className="pt-sm">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                        Payload Posterior
                      </span>
                      <pre className="bg-surface-container-lowest p-sm rounded font-mono text-[11px] text-tertiary border border-outline-variant overflow-x-auto max-h-[160px] whitespace-pre-wrap select-text">
                        {JSON.stringify(selectedEvent.afterJson, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : null
          ) : (
            <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center text-center space-y-md min-h-[300px] shadow-lg">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-outline text-[28px]">info</span>
              </div>
              <div>
                <h4 className="font-title-sm text-sm font-semibold text-on-surface">
                  {t.audit.details.noEventSelected}
                </h4>
                <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs leading-relaxed max-w-[220px] mx-auto">
                  {t.audit.details.selectEventPrompt}
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
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">
              Eventos auditáveis
            </h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              O Peanut OS monitora login, criação de registros, alteração de privilégios e
              visualizações de dados sensíveis em todos os módulos para garantir total rastreabilidade.
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
              Recomendamos a revisão semanal de eventos com criticidade &apos;Crítico&apos;.
              Certifique-se de que cada operador utiliza sua própria conta nominal protegida.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
