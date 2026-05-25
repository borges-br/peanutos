'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import { formatDateTime } from '../../../i18n/formatters';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';

export default function DocumentosPage() {
  const { t } = useI18n();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');

  // Selected Detail States
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const fetchDocuments = async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(pageNum));
      queryParams.append('limit', String(limit));

      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }
      if (documentTypeFilter) {
        queryParams.append('documentType', documentTypeFilter);
      }
      if (entityTypeFilter) {
        queryParams.append('entityType', entityTypeFilter);
      }
      if (visibilityFilter) {
        queryParams.append('visibility', visibilityFilter);
      }

      const response = await apiRequest(`/documents?${queryParams.toString()}`);
      setDocuments(response.data || []);
      setTotal(response.meta?.total || 0);
      setTotalPages(response.meta?.totalPages || 1);
      setPage(response.meta?.page || pageNum);
      setSummary(response.summary || null);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id: string) => {
    setLoadingDetails(true);
    setDetailsError(null);
    setSelectedDoc(null);
    try {
      const response = await apiRequest(`/documents/${id}`);
      setSelectedDoc(response);
    } catch (err: any) {
      setDetailsError(err.message || 'Falha ao carregar detalhes do documento');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchDocuments(1);
  }, [documentTypeFilter, entityTypeFilter, visibilityFilter]);

  useEffect(() => {
    if (selectedDocId) {
      fetchDetails(selectedDocId);
    } else {
      setSelectedDoc(null);
      setDetailsError(null);
    }
  }, [selectedDocId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchDocuments(newPage);
    }
  };

  const toggleFolderFilter = (type: 'CONTRACT' | 'REPORT' | 'TICKET') => {
    if (type === 'CONTRACT') {
      if (documentTypeFilter === 'CONTRACT') {
        setDocumentTypeFilter('');
      } else {
        setDocumentTypeFilter('CONTRACT');
        setEntityTypeFilter('');
      }
    } else if (type === 'REPORT') {
      if (documentTypeFilter === 'REPORT') {
        setDocumentTypeFilter('');
      } else {
        setDocumentTypeFilter('REPORT');
        setEntityTypeFilter('');
      }
    } else if (type === 'TICKET') {
      if (entityTypeFilter === 'TICKET') {
        setEntityTypeFilter('');
      } else {
        setEntityTypeFilter('TICKET');
        setDocumentTypeFilter('');
      }
    }
    setPage(1);
  };

  const formatBytes = (bytesStr: string | number | undefined) => {
    if (bytesStr === undefined || bytesStr === null) return '--';
    const bytes = Number(bytesStr);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getShortId = (id: string) => {
    if (!id) return '';
    return id.length > 8 ? id.substring(0, 8) + '...' : id;
  };

  const getDocumentTypeBadge = (type: string) => {
    const label = t.documents.types[type as keyof typeof t.documents.types] || type;
    switch (type) {
      case 'CONTRACT':
        return <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[11px] font-semibold">{label}</span>;
      case 'REPORT':
        return <span className="bg-tertiary/10 text-tertiary border border-tertiary/20 px-2 py-0.5 rounded text-[11px] font-semibold">{label}</span>;
      case 'INVOICE':
        return <span className="bg-success-container/20 text-success-container border border-success-container/30 px-2 py-0.5 rounded text-[11px] font-semibold">{label}</span>;
      case 'QUOTE':
        return <span className="bg-info-container/20 text-info-container border border-info-container/30 px-2 py-0.5 rounded text-[11px] font-semibold">{label}</span>;
      default:
        return <span className="bg-surface-container-high text-on-surface-variant border border-outline-variant/30 px-2 py-0.5 rounded text-[11px] font-semibold">{label}</span>;
    }
  };

  return (
    <main className="max-w-[1600px] mx-auto p-md space-y-lg animate-fade-in pb-xl select-none select-text">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/30 pb-md">
        <div className="space-y-xs">
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">
            {t.documents.title}
          </h1>
          <p className="font-body-md text-[14px] text-on-surface-variant max-w-2xl">
            {t.documents.subtitle}
          </p>
        </div>
        <div className="flex gap-sm">
          <Button variant="primary" disabled title={t.documents.uploadTooltip}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">upload</span>
            {t.documents.uploadBtn}
          </Button>
        </div>
      </header>

      {/* Dynamic Summary Metrics and Quick-Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Left Interactive Folders */}
        <div className="lg:col-span-2 space-y-md">
          <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Pastas e Filtros Rápidos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {[
              {
                type: 'CONTRACT',
                icon: 'folder_open',
                title: 'Contratos e Termos',
                desc: 'Minutas e aceites contratuais.',
                active: documentTypeFilter === 'CONTRACT',
              },
              {
                type: 'REPORT',
                icon: 'analytics',
                title: 'Relatórios Técnicos',
                desc: 'Auditorias e laudos de NOC.',
                active: documentTypeFilter === 'REPORT',
              },
              {
                type: 'TICKET',
                icon: 'support_agent',
                title: 'Anexos de Chamados',
                desc: 'Comprovações de visitas técnicas.',
                active: entityTypeFilter === 'TICKET',
              },
            ].map((folder, i) => (
              <div
                key={i}
                onClick={() => toggleFolderFilter(folder.type as any)}
                className={`border rounded-xl p-md flex items-start gap-sm cursor-pointer transition-all duration-200 select-none hover:shadow-md ${
                  folder.active
                    ? 'bg-primary/5 border-primary shadow-sm shadow-primary/10'
                    : 'bg-surface border-outline-variant hover:border-outline'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl transition-colors ${
                    folder.active ? 'text-primary' : 'text-on-surface-variant/70'
                  }`}
                >
                  {folder.icon}
                </span>
                <div>
                  <h4 className="font-title-sm text-sm font-semibold text-on-surface flex items-center gap-xs">
                    {folder.title}
                    {folder.active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    )}
                  </h4>
                  <p className="text-body-sm text-[12px] text-on-surface-variant mt-1 leading-normal">
                    {folder.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Cotas Info */}
        <div className="space-y-md">
          <h3 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Status da Infraestrutura
          </h3>
          <Card className="!p-0 border-outline-variant/60 shadow-sm">
            <div className="p-md px-lg border-b border-outline-variant bg-surface-container-high flex justify-between items-center">
              <h3 className="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">
                {t.documents.quotaCardTitle}
              </h3>
            </div>
            <div className="p-md space-y-sm text-[12px]">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-xs">
                <span className="text-on-surface-variant">{t.documents.storageTotal}</span>
                <span className="font-mono text-on-surface font-semibold bg-surface-container px-2 py-0.5 rounded">
                  {t.documents.quotaNotConfigured}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-xs">
                <span className="text-on-surface-variant">{t.documents.storageUsed}</span>
                <span className="font-mono text-primary font-bold">
                  {summary ? formatBytes(summary.totalSizeBytes) : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-xs">
                <span className="text-on-surface-variant">{t.documents.infraStatus}</span>
                <span className="font-mono text-success-container bg-success-container/10 border border-success-container/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
                  {t.documents.infraStatusValue}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Advanced Filter and Search Bar */}
      <div className="bg-surface-container/30 border border-outline-variant p-md rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              Busca Textual
            </label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-[16px] text-outline">search</span>
              <input
                className="w-full bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded pl-8 pr-sm py-1.5 outline-none transition-colors"
                placeholder={t.documents.searchPlaceholder}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              Tipo do Documento
            </label>
            <select
              value={documentTypeFilter}
              onChange={(e) => {
                setDocumentTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none"
            >
              <option value="">Todos os tipos</option>
              <option value="QUOTE">{t.documents.types.QUOTE}</option>
              <option value="INVOICE">{t.documents.types.INVOICE}</option>
              <option value="TICKET_CLOSURE">{t.documents.types.TICKET_CLOSURE}</option>
              <option value="CONTRACT">{t.documents.types.CONTRACT}</option>
              <option value="REPORT">{t.documents.types.REPORT}</option>
            </select>
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
              Visibilidade
            </label>
            <select
              value={visibilityFilter}
              onChange={(e) => {
                setVisibilityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-background border border-outline-variant focus:border-primary text-body-sm text-[13px] rounded px-sm py-1.5 outline-none"
            >
              <option value="">Todas</option>
              <option value="PRIVATE">{t.documents.visibilities.PRIVATE}</option>
              <option value="PUBLIC">{t.documents.visibilities.PUBLIC}</option>
            </select>
          </div>

          <div className="flex flex-col gap-xs justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setDocumentTypeFilter('');
                setEntityTypeFilter('');
                setVisibilityFilter('');
                setPage(1);
                setTimeout(() => fetchDocuments(1), 50);
              }}
              className="w-full py-1.5 text-[12px] font-semibold"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">filter_alt_off</span>
              {t.common.clearFilters}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Table + Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Document List Table */}
        <div className="lg:col-span-8 bg-surface border border-outline-variant rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColName}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColType}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColEntity}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColVersion}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColVisibility}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColSize}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap">
                    {t.documents.tableColGeneratedAt}
                  </th>
                  <th className="p-md font-label-caps text-on-surface-variant uppercase font-semibold whitespace-nowrap text-right">
                    {t.documents.tableColActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-xl text-center">
                      <div className="flex flex-col justify-center items-center py-lg gap-sm text-on-surface-variant font-body-sm select-none">
                        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
                        <p>{t.common.loading}</p>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="p-xl text-center">
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
                          <Button variant="outline" className="mt-md py-1 px-4 text-xs font-semibold" onClick={() => fetchDocuments(page)}>
                            {t.common.retry}
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-xl text-center">
                      <EmptyState
                        title={t.documents.emptyTitle}
                        description={t.documents.emptyDescription}
                      />
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const isSelected = selectedDocId === doc.id;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={`hover:bg-surface-container/60 cursor-pointer transition-colors group ${
                          isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                      >
                        <td className="p-md font-medium text-on-surface flex items-center gap-xs">
                          <span className="material-symbols-outlined text-primary/80 text-[18px]">
                            description
                          </span>
                          <span className="max-w-[180px] truncate" title={doc.file?.originalFilename}>
                            {doc.file?.originalFilename}
                          </span>
                        </td>
                        <td className="p-md whitespace-nowrap">
                          {getDocumentTypeBadge(doc.documentType)}
                        </td>
                        <td className="p-md text-on-surface-variant">
                          <span className="bg-surface-container px-2 py-0.5 border border-outline-variant/30 rounded text-[11px] font-mono text-on-surface font-semibold mr-1">
                            {doc.entityType}
                          </span>
                          <span className="font-mono text-[10px] text-on-surface-variant/80">
                            {getShortId(doc.entityId)}
                          </span>
                        </td>
                        <td className="p-md font-mono text-on-surface-variant/80">
                          v{doc.version}
                        </td>
                        <td className="p-md">
                          <span
                            className={`inline-flex items-center gap-xs text-[11px] px-2 py-0.5 rounded font-medium ${
                              doc.file?.visibility === 'PUBLIC'
                                ? 'bg-success-container/10 text-success-container border border-success-container/20'
                                : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                doc.file?.visibility === 'PUBLIC' ? 'bg-success-container' : 'bg-outline'
                              }`}
                            />
                            {t.documents.visibilities[doc.file?.visibility as keyof typeof t.documents.visibilities] ||
                              doc.file?.visibility}
                          </span>
                        </td>
                        <td className="p-md font-mono text-on-surface-variant/80 whitespace-nowrap">
                          {formatBytes(doc.file?.sizeBytes)}
                        </td>
                        <td className="p-md font-mono text-on-surface-variant/80 whitespace-nowrap">
                          {formatDateTime(doc.generatedAt)}
                        </td>
                        <td className="p-md text-right whitespace-nowrap">
                          <button className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
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

          {/* Table Footer Controls */}
          <div className="p-md bg-surface-container-low/40 border-t border-outline-variant flex justify-between items-center text-[12px]">
            <p className="text-on-surface-variant opacity-60">
              Mostrando {documents.length} de {total} documentos
            </p>
            <div className="flex gap-xs items-center select-none">
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

        {/* Selected Document Details Panel */}
        <aside className="lg:col-span-4 flex flex-col gap-lg select-text">
          {selectedDocId ? (
            loadingDetails ? (
              <div className="bg-surface border border-outline-variant rounded-lg p-xl flex flex-col items-center justify-center text-center space-y-md min-h-[300px] shadow-lg animate-pulse">
                <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
                <p className="text-body-sm text-on-surface-variant">{t.common.loading}</p>
              </div>
            ) : detailsError ? (
              <Card
                title={t.documents.detailPanelTitle}
                headerAction={
                  <button
                    onClick={() => {
                      setSelectedDocId(null);
                      setSelectedDoc(null);
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
            ) : selectedDoc ? (
              <Card
                title={t.documents.detailPanelTitle}
                headerAction={
                  <button
                    onClick={() => {
                      setSelectedDocId(null);
                      setSelectedDoc(null);
                    }}
                    className="material-symbols-outlined text-outline hover:text-error transition-colors"
                  >
                    close
                  </button>
                }
              >
                <div className="space-y-md animate-fade-in text-[13px]">
                  {/* Role warnings for redacted S3/cryptographic data */}
                  {user?.role === 'READ_ONLY' && (
                    <div className="bg-surface-container border border-outline-variant text-on-surface-variant p-md rounded-lg text-body-sm flex gap-sm items-start">
                      <span className="material-symbols-outlined text-outline shrink-0">lock</span>
                      <p className="text-[12px] leading-normal">{t.documents.roleReadOnlyNotice}</p>
                    </div>
                  )}

                  {(user?.role === 'FINANCIAL' || user?.role === 'TECHNICIAN') && (
                    <div className="bg-surface-container border border-outline-variant text-on-surface-variant p-md rounded-lg text-body-sm flex gap-sm items-start">
                      <span className="material-symbols-outlined text-outline shrink-0">lock</span>
                      <p className="text-[12px] leading-normal">{t.documents.roleStaffNotice}</p>
                    </div>
                  )}

                  {/* Metadados Básicos */}
                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.documents.detailPanelId}
                    </span>
                    <span className="font-mono text-primary font-bold mt-0.5 select-all">
                      {selectedDoc.id}
                    </span>
                  </div>

                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.documents.detailPanelFilename}
                    </span>
                    <span className="font-semibold text-on-surface mt-0.5 break-all">
                      {selectedDoc.file?.originalFilename}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-sm border-b border-outline-variant/20 pb-sm">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelType}
                      </span>
                      <span className="mt-0.5 font-semibold text-on-surface">
                        {t.documents.types[selectedDoc.documentType as keyof typeof t.documents.types] ||
                          selectedDoc.documentType}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelVersion}
                      </span>
                      <span className="font-mono mt-0.5 text-on-surface font-semibold">
                        v{selectedDoc.version}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      Entidade Vinculada
                    </span>
                    <span className="font-mono text-[12px] text-on-surface mt-0.5 break-all">
                      {selectedDoc.entityType} ({selectedDoc.entityId})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-sm border-b border-outline-variant/20 pb-sm">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelSize}
                      </span>
                      <span className="font-mono mt-0.5 text-on-surface font-semibold">
                        {formatBytes(selectedDoc.file?.sizeBytes)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelVisibility}
                      </span>
                      <span className="mt-0.5 font-semibold text-on-surface">
                        {t.documents.visibilities[selectedDoc.file?.visibility as keyof typeof t.documents.visibilities] ||
                          selectedDoc.file?.visibility}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                    <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                      {t.documents.detailPanelMimetype}
                    </span>
                    <span className="font-mono text-[12px] text-on-surface mt-0.5">
                      {selectedDoc.file?.mimeType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-sm border-b border-outline-variant/20 pb-sm">
                    <div className="flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelGeneratedBy}
                      </span>
                      <span className="font-mono mt-0.5 text-on-surface-variant text-[11px] truncate">
                        {selectedDoc.generatedById || 'Sistema'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelGeneratedAt}
                      </span>
                      <span className="font-mono mt-0.5 text-on-surface-variant text-[11px]">
                        {formatDateTime(selectedDoc.generatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Sanitized secure keys displayed based on RBAC */}
                  {selectedDoc.sha256 && (
                    <div className="flex flex-col border-b border-outline-variant/20 pb-sm">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                        {t.documents.detailPanelHash}
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-variant/80 mt-0.5 break-all select-all bg-surface-container px-1 py-0.5 rounded border border-outline-variant/20">
                        {selectedDoc.sha256}
                      </span>
                    </div>
                  )}

                  {selectedDoc.file?.bucket && (
                    <div className="grid grid-cols-2 gap-sm border-b border-outline-variant/20 pb-sm">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                          {t.documents.detailPanelBucket}
                        </span>
                        <span className="font-mono mt-0.5 text-[11px] text-on-surface-variant truncate">
                          {selectedDoc.file?.bucket}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                          {t.documents.detailPanelKey}
                        </span>
                        <span className="font-mono mt-0.5 text-[11px] text-on-surface-variant truncate" title={selectedDoc.file?.key}>
                          {selectedDoc.file?.key}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Renderizado de Metadados JSON parsed e sanitizado */}
                  {selectedDoc.metadata && (
                    <div className="pt-sm">
                      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold block mb-1">
                        {t.documents.detailPanelMetadata}
                      </span>
                      <pre className="bg-surface-container-lowest p-sm rounded font-mono text-[11px] text-tertiary border border-outline-variant overflow-x-auto max-h-[160px] whitespace-pre-wrap select-text">
                        {JSON.stringify(selectedDoc.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Botões Planejados/Desabilitados de Operações de Arquivo */}
                  <div className="pt-md grid grid-cols-2 gap-sm">
                    <Button variant="outline" planned>
                      Download
                    </Button>
                    <Button variant="outline" planned>
                      Visualizar
                    </Button>
                  </div>
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
                  Nenhum arquivo selecionado
                </h4>
                <p className="font-body-sm text-[13px] text-on-surface-variant mt-xs leading-relaxed max-w-[220px] mx-auto">
                  Selecione um arquivo na listagem para visualizar seus metadados técnicos e metadados de auditoria do Peanut OS.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Helpful Guidelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg pt-md">
        <div className="bg-surface-container/20 border border-outline-variant/30 p-md rounded-lg flex gap-md">
          <div className="p-sm bg-primary/10 rounded-lg self-start shrink-0 text-primary">
            <span className="material-symbols-outlined">shield</span>
          </div>
          <div className="space-y-xs">
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">
              Segurança do Catálogo (RBAC)
            </h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              O acesso aos metadados estruturados de S3 (Bucket, Key) e verificação criptográfica (SHA256)
              é concedido restritamente com base no papel do usuário para assegurar a soberania dos dados do tenant.
            </p>
          </div>
        </div>
        <div className="bg-surface-container/20 border border-outline-variant/30 p-md rounded-lg flex gap-md">
          <div className="p-sm bg-tertiary/10 rounded-lg self-start shrink-0 text-tertiary">
            <span className="material-symbols-outlined">history</span>
          </div>
          <div className="space-y-xs">
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">
              Auditoria Integrada
            </h3>
            <p className="font-body-sm text-[13px] text-on-surface-variant leading-relaxed">
              Toda vez que os metadados de um documento são consultados detalhadamente, um registro de segurança
              permanente com a ação &apos;document.viewed&apos; é gravado no módulo de auditoria.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
