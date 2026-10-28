'use client';

import { useWorkspaceFormatters } from '../../../../../../i18n/useWorkspaceFormatters';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../../lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../../context/AuthContext';
import { useI18n } from '../../../../../../i18n/useI18n';
import Button from '../../../../../../components/ui/Button';
import Badge from '../../../../../../components/ui/Badge';
import Card from '../../../../../../components/ui/Card';

export default function AssetDetailPage() {
  const { formatDateTime } = useWorkspaceFormatters();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  
  const clientId = params.id as string;
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('INTERNAL');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Reveal secrets state
  const [revealedSecrets, setRevealedSecrets] = useState<any>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [showSecretsModal, setShowSecretsModal] = useState(false);

  const fetchAssetDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/clients/${clientId}/assets/${assetId}`);
      setAsset(response);
    } catch (err: any) {
      setError(err.message || t.inventory.details.revealError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetDetails();
    
    return () => {
      setRevealedSecrets(null);
    };
  }, [clientId, assetId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setNoteSubmitting(true);
    setNoteError(null);

    // Basic password rejection
    const lowerContent = noteContent.toLowerCase();
    const blockedKeywords = ['senha', 'password', 'token', 'secret', 'api_key', 'apikey'];
    if (blockedKeywords.some(kw => lowerContent.includes(kw))) {
      setNoteError(t.inventory.details.noteSafetyAlert);
      setNoteSubmitting(false);
      return;
    }

    try {
      await apiRequest(`/clients/${clientId}/assets/${assetId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          content: noteContent,
          visibility: noteVisibility,
        }),
      });
      setNoteContent('');
      
      // Refresh assets to load note list
      const freshAsset = await apiRequest(`/clients/${clientId}/assets/${assetId}`);
      setAsset(freshAsset);
    } catch (err: any) {
      setNoteError(err.message || 'Falha ao adicionar nota.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleRevealSecrets = async () => {
    if (!user || !['OWNER', 'ADMIN', 'TECHNICIAN'].includes(user.role)) {
      alert(t.states.restrictedTitle + ' ' + t.states.restrictedDescription);
      return;
    }

    setRevealing(true);
    setRevealError(null);
    try {
      const response = await apiRequest(`/clients/${clientId}/assets/${assetId}/reveal-sensitive-data`, {
        method: 'POST',
      });
      setRevealedSecrets(response.sensitiveData);
      setShowSecretsModal(true);
    } catch (err: any) {
      setRevealError(err.message || t.inventory.details.revealError);
    } finally {
      setRevealing(false);
    }
  };

  const handleCloseSecrets = () => {
    setRevealedSecrets(null);
    setShowSecretsModal(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[200px] gap-sm text-on-surface-variant font-body-sm select-none">
        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p>{t.common.loading}</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-center gap-md select-none">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
          {error || 'Não foi possível carregar os detalhes do ativo.'}
        </div>
        <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)}>
          {t.common.back}
        </Button>
      </div>
    );
  }

  const localizedType = t.enums.assetType[asset.type as keyof typeof t.enums.assetType] || asset.type;
  const localizedStatus = t.enums.assetStatus[asset.status as keyof typeof t.enums.assetStatus] || asset.status;
  
  const getStatusVariant = (val: string) => {
    switch (val) {
      case 'OPERATIONAL': return 'success';
      case 'MAINTENANCE': return 'warning';
      case 'OUT_OF_STANDARD': return 'error';
      case 'STOCK': return 'info';
      default: return 'neutral';
    }
  };

  const isPrivilegedUser = user && ['OWNER', 'ADMIN', 'TECHNICIAN'].includes(user.role);

  return (
    <div className="flex flex-col gap-lg select-none select-text">
      {/* Resumo Breadcrumbs & Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-start gap-md border-b border-outline-variant/30 pb-lg">
        <div className="flex flex-col gap-xs flex-1">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant/80 font-medium">
            <span onClick={() => router.push('/dashboard/clients')} className="cursor-pointer text-primary hover:underline">
              {t.navigation.clients}
            </span>
            <span className="opacity-40">/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} className="cursor-pointer text-primary hover:underline">
              {asset.client?.tradeName || 'Detalhes'}
            </span>
            <span className="opacity-40">/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)} className="cursor-pointer text-primary hover:underline">
              {t.clients.tabs.inventory}
            </span>
            <span className="opacity-40">/</span>
            <span className="text-on-surface-variant/60">{asset.name}</span>
          </div>

          {/* Title row */}
          <div className="flex items-center gap-md mt-sm">
            <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
              {asset.name}
            </h2>
            <Badge variant={getStatusVariant(asset.status)}>{localizedStatus}</Badge>
          </div>
          
          <p className="text-[13px] text-on-surface-variant mt-1">
            {t.inventory.details.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-sm">
          {isPrivilegedUser && asset.sensitiveDataEncrypted && (
            <Button
              variant="secondary"
              onClick={handleRevealSecrets}
              disabled={revealing}
              className="py-1 px-4 text-xs font-semibold bg-primary-container/10 border border-primary-container/20 text-primary hover:bg-primary-container/20"
            >
              {revealing ? t.inventory.details.decrypting : t.inventory.details.revealSecretsBtn}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)}
            className="py-1 px-4 text-xs"
          >
            {t.common.back}
          </Button>
        </div>
      </header>

      {revealError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm text-center animate-in fade-in duration-200">
          {revealError}
        </div>
      )}

      {/* Grid Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mt-sm">
        
        {/* Left Column: Specs and Notes */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Tech Specs */}
          <Card title={t.inventory.details.specs}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px] text-on-surface">
              
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Hostname
                </span>
                <span className="font-mono font-medium text-primary">{asset.hostname || 'Não configurado'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Tipo de Ativo
                </span>
                <span className="font-medium text-on-surface">{localizedType}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Fabricante / Marca
                </span>
                <span className="font-medium text-on-surface">{asset.manufacturer || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Modelo
                </span>
                <span className="font-medium text-on-surface">{asset.model || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Número de Série
                </span>
                <span className="font-mono font-medium text-on-surface">{asset.serialNumber || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Patrimônio / Asset Tag
                </span>
                <span className="font-mono font-medium text-on-surface">{asset.assetTag || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Endereço IP
                </span>
                <span className="font-mono font-medium text-on-surface">{asset.ipAddress || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Endereço MAC
                </span>
                <span className="font-mono font-medium text-on-surface">{asset.macAddress || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Sistema Operacional
                </span>
                <span className="font-medium text-on-surface">{asset.operatingSystem || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Localização / Setor
                </span>
                <span className="font-medium text-on-surface">{asset.location || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  ID Acesso Remoto
                </span>
                <span className="font-mono font-medium text-on-surface">{asset.remoteAccessId || '--'}</span>
              </div>

              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Usuário Vinculado
                </span>
                <span className={asset.assignedClientUser ? 'font-medium text-on-surface' : 'text-on-surface-variant/40 italic'}>
                  {asset.assignedClientUser ? asset.assignedClientUser.fullName : t.inventory.details.assignedUserNone}
                </span>
              </div>

            </div>

            {asset.notes && (
              <div className="border-t border-outline-variant/30 pt-md mt-md flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Observações Gerais do Ativo
                </span>
                <p className="text-[13px] text-on-surface-variant/80 font-body-sm leading-relaxed whitespace-pre-line">
                  {asset.notes}
                </p>
              </div>
            )}
          </Card>

          {/* Masked Sensitive Data component */}
          {isPrivilegedUser && asset.sensitiveDataEncrypted && !revealedSecrets && (
            <div className="p-lg bg-surface border border-outline-variant rounded-xl flex flex-col items-center justify-center text-center gap-xs shadow-xl shadow-black/25">
              <span className="material-symbols-outlined text-3xl text-primary mb-1">
                encrypted
              </span>
              <h4 className="font-semibold text-sm text-on-surface font-body-sm">
                {t.inventory.details.sensitiveMask.title}
              </h4>
              <p className="text-[12px] text-on-surface-variant/75 max-w-sm leading-relaxed mb-sm">
                {t.inventory.details.sensitiveMask.footer}
              </p>
              <Button
                variant="outline"
                onClick={handleRevealSecrets}
                disabled={revealing}
                className="py-1.5 px-4 font-semibold text-xs border border-primary text-primary hover:bg-primary-container/10 focus:outline-none"
              >
                {revealing ? t.inventory.details.decrypting : t.inventory.details.sensitiveMask.action}
              </Button>
            </div>
          )}

          {/* Internal Notes */}
          <Card title={t.inventory.details.notes}>
            <form onSubmit={handleCreateNote} className="mb-lg p-md bg-surface-container-low border border-outline-variant/40 rounded-xl flex flex-col gap-md">
              {noteError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-sm rounded text-[12px]">
                  {noteError}
                </div>
              )}
              
              <div className="flex flex-col gap-1 w-full">
                <textarea
                  required
                  placeholder={t.inventory.details.notePlaceholder}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed resize-none"
                  rows={3}
                  disabled={noteSubmitting}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-sm">
                <div className="flex gap-sm items-center self-start sm:self-center">
                  <label className="text-[12px] text-on-surface-variant">{t.inventory.details.visibilityLabel}</label>
                  <select
                    value={noteVisibility}
                    onChange={(e) => setNoteVisibility(e.target.value)}
                    className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1 text-[12px] text-on-surface outline-none cursor-pointer focus:border-primary"
                  >
                    <option value="INTERNAL">{t.inventory.details.visibilityInternal}</option>
                    <option value="CLIENT_VISIBLE_FUTURE">{t.inventory.details.visibilityPortal}</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" loading={noteSubmitting} className="py-1 px-4 text-xs w-full sm:w-auto">
                  {t.inventory.details.addNote}
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-sm">
              {(!asset.assetNotes || asset.assetNotes.length === 0) ? (
                <p className="text-[13px] italic text-on-surface-variant/60 text-center py-md">
                  {t.inventory.details.noNotes}
                </p>
              ) : (
                asset.assetNotes.map((note: any) => (
                  <div
                    key={note.id}
                    className="p-md bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col gap-xs hover:bg-surface-container transition-colors duration-150 relative"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-primary text-[13px]">{note.authorUser?.name || 'Técnico'}</span>
                      <span className="text-[11px] text-on-surface-variant/60 font-mono">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-wrap mt-0.5">
                      {note.content}
                    </p>
                    <span className="text-[9px] bg-outline-variant/20 border border-outline-variant/40 text-on-surface-variant px-1.5 py-0.2 rounded w-fit uppercase font-semibold mt-sm tracking-wider">
                      {note.visibility === 'INTERNAL' ? t.inventory.details.visibilityInternal : t.inventory.details.visibilityPortal}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Timeline Log */}
        <div className="lg:col-span-4 flex flex-col gap-lg">
          
          {/* History Log */}
          <Card title={t.inventory.details.history}>
            <div className="flex flex-col gap-md relative pl-md border-l border-outline-variant/30 ml-sm mt-xs">
              {(!asset.history || asset.history.length === 0) ? (
                <p className="text-[13px] italic text-on-surface-variant/60 py-xs -ml-md">
                  {t.inventory.details.noHistory}
                </p>
              ) : (
                asset.history.map((log: any) => (
                  <div key={log.id} className="relative flex flex-col gap-xs">
                    {/* Log Timeline bullet */}
                    <div className="absolute left-[-23px] top-[6px] w-[9px] h-[9px] rounded-full border-2 border-[#08090D] bg-primary" />
                    
                    <div className="flex justify-between items-center gap-sm">
                      <span className="text-[10px] bg-primary-container/10 border border-primary-container/20 text-primary px-1.5 py-0.2 rounded uppercase font-bold tracking-wider font-mono">
                        {log.event === 'SENSITIVE_DATA_REVEALED' ? t.inventory.details.timelineEventReveal : log.event}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50 font-mono">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-on-surface leading-normal">{log.description}</p>
                    {log.actorUser && (
                      <span className="text-[11px] text-on-surface-variant/60 font-medium">
                        {t.inventory.details.actorLabel} {log.actorUser.name}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Placeholders Card */}
          <Card title={t.inventory.details.integrations}>
            <div className="flex flex-col gap-md text-[13px] text-on-surface select-none">
              
              <div className="flex items-center gap-md p-sm bg-surface-container-low border border-outline-variant/20 rounded-xl">
                <span className="text-xl">🎫</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-on-surface">Chamados Relacionados</span>
                  <span className="text-[11px] text-on-surface-variant/70 mt-0.5">Equipamentos associados ao suporte (Fase 3).</span>
                </div>
              </div>

              <div className="flex items-center gap-md p-sm bg-surface-container-low border border-outline-variant/20 rounded-xl">
                <span className="text-xl">📅</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-on-surface">Manutenção Preventiva</span>
                  <span className="text-[11px] text-on-surface-variant/70 mt-0.5">Agendas e limpezas recorrentes planejadas.</span>
                </div>
              </div>

              <div className="flex items-center gap-md p-sm bg-surface-container-low border border-outline-variant/20 rounded-xl">
                <span className="text-xl">📂</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-on-surface">Anexos e Manuais</span>
                  <span className="text-[11px] text-on-surface-variant/70 mt-0.5">Notas fiscais, fotos e manuais técnicos.</span>
                </div>
              </div>

            </div>
          </Card>

        </div>

      </div>

      {/* Sensitive Credentials Reveal Overlay Modal */}
      {showSecretsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none">
          <div className="w-full max-w-[550px] bg-[#0b0f19] border border-error-container/40 rounded-xl p-lg md:p-xl shadow-2xl shadow-red-500/5 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-md">
              <h3 className="font-bold text-base text-red-300 flex items-center gap-sm">
                🔑 {t.inventory.details.sensitiveModal.title}
              </h3>
              <button onClick={handleCloseSecrets} className="text-on-surface-variant/70 hover:text-on-surface text-2xl font-light">×</button>
            </div>
            
            <div className="mb-md bg-error-container/10 border border-error-container/20 text-red-300 p-md rounded-lg text-body-sm leading-relaxed">
              {t.inventory.details.sensitiveModal.warning}
            </div>

            <div className="flex flex-col gap-sm bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-md mb-lg">
              <span className="text-[11px] font-semibold text-primary">{t.inventory.details.sensitiveModal.label}</span>
              <pre className="font-mono text-[12px] text-on-surface p-sm bg-black/40 rounded border border-outline-variant/20 overflow-auto max-h-[150px] whitespace-pre-wrap select-text">
                {typeof revealedSecrets === 'object'
                  ? JSON.stringify(revealedSecrets, null, 2)
                  : String(revealedSecrets || 'Sem dados')}
              </pre>
            </div>

            <div className="mt-md">
              <Button variant="outline" onClick={handleCloseSecrets} className="w-full justify-center py-2">
                {t.inventory.details.sensitiveModal.closeBtn}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
