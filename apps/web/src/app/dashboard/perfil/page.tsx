'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest, apiBlobRequest } from '../../../lib/api';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function useAuthImage(apiPath: string | null | undefined) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!apiPath) {
      setObjectUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    let currentUrl: string | null = null;
    let cancelled = false;
    apiBlobRequest(apiPath)
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        setObjectUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [apiPath]);
  return objectUrl;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  phone: string | null;
  documentDisplayName: string | null;
  documentSignatureEnabled: boolean;
  avatarUrl: string | null;
  signatureUrl: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [documentDisplayName, setDocumentDisplayName] = useState('');
  const [documentSignatureEnabled, setDocumentSignatureEnabled] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const avatarObjectUrl = useAuthImage(avatarPath);
  const signatureObjectUrl = useAuthImage(signaturePath);

  useEffect(() => {
    apiRequest<ProfileData>('/users/me/profile')
      .then(data => {
        setProfile(data);
        setName(data.name);
        setJobTitle(data.jobTitle || '');
        setPhone(data.phone || '');
        setDocumentDisplayName(data.documentDisplayName || '');
        setDocumentSignatureEnabled(data.documentSignatureEnabled);
        setAvatarPath(data.avatarUrl || null);
        setSignaturePath(data.signatureUrl || null);
      })
      .catch(err => setError(err.message || 'Erro ao carregar perfil.'))
      .finally(() => setLoadingProfile(false));
  }, []);

  function markChanged() {
    setHasChanges(true);
    setError(null);
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  }

  async function handleSave() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return; }
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          jobTitle: jobTitle || null,
          phone: phone || null,
          documentDisplayName: documentDisplayName || null,
          documentSignatureEnabled,
        }),
      });
      setHasChanges(false);
      showSuccess('Perfil salvo com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (!profile) return;
    setName(profile.name);
    setJobTitle(profile.jobTitle || '');
    setPhone(profile.phone || '');
    setDocumentDisplayName(profile.documentDisplayName || '');
    setDocumentSignatureEnabled(profile.documentSignatureEnabled);
    setHasChanges(false);
    setError(null);
  }

  async function handleImageUpload(
    file: File,
    endpoint: string,
    setUploading: (v: boolean) => void,
    setPath: (v: string | null) => void,
    resultKey: 'avatarUrl' | 'signatureUrl',
  ) {
    if (file.size > MAX_IMAGE_SIZE) { setError('Imagem muito grande. Máximo: 2 MB.'); return; }
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) { setError('Formato não suportado. Use PNG, JPEG ou WebP.'); return; }

    setUploading(true);
    setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const parts = res.split(',');
          resolve(parts[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await apiRequest<Record<string, string | null>>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ data: base64, mimeType: file.type, filename: file.name }),
      });

      setPath(result[resultKey] ?? null);
      showSuccess('Imagem enviada com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(endpoint: string, setPath: (v: string | null) => void) {
    setError(null);
    try {
      await apiRequest(endpoint, { method: 'DELETE' });
      setPath(null);
      showSuccess('Imagem removida.');
    } catch (err: any) {
      setError(err.message || 'Erro ao remover imagem.');
    }
  }

  const userInitials = name ? name.substring(0, 2).toUpperCase() : (user?.name || 'U').substring(0, 2).toUpperCase();
  const displaySignatureName = documentDisplayName || name;

  if (loadingProfile) {
    return (
      <main className="max-w-[1200px] mx-auto p-md flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </main>
    );
  }

  return (
    <main className="max-w-[1200px] mx-auto p-md space-y-lg animate-fade-in pb-xl">
      {/* Unsaved banner */}
      {hasChanges && (
        <div className="sticky top-[10px] z-40 bg-primary-container text-on-primary-container px-lg py-sm flex flex-col sm:flex-row items-center justify-between shadow-lg border border-outline-variant rounded-xl animate-fade-in gap-md">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-[20px]">info</span>
            <span className="font-title-sm text-sm font-semibold">Existem alterações não salvas no seu perfil.</span>
          </div>
          <div className="flex gap-md shrink-0">
            <Button variant="ghost" className="text-on-primary-container hover:bg-on-primary-container/10 text-xs px-md py-1" onClick={handleDiscard} disabled={saving}>
              Descartar
            </Button>
            <Button variant="primary" className="bg-on-primary-container text-primary-container hover:opacity-90 text-xs px-lg py-1 border-none shadow-none" onClick={handleSave} loading={saving}>
              Salvar alterações
            </Button>
          </div>
        </div>
      )}

      {/* Success */}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-md rounded-lg flex items-center gap-sm animate-fade-in text-[13px]">
          <span className="material-symbols-outlined">check_circle</span>
          <p>{successMsg}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg flex items-center gap-sm text-[13px]">
          <span className="material-symbols-outlined">error</span>
          <p>{error}</p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-outline-variant/30 pb-lg gap-md">
        <div className="flex items-center gap-lg">
          <div className="w-16 h-16 rounded-lg border border-outline-variant overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
            {avatarObjectUrl ? (
              <img src={avatarObjectUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-xl select-none">{userInitials}</span>
            )}
          </div>
          <div className="space-y-xs">
            <h1 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">Meu Perfil</h1>
            <p className="font-body-sm text-[13px] text-on-surface-variant">Gerencie suas informações, foto de perfil e identidade documental.</p>
          </div>
        </div>
        <span className="font-mono text-[11px] bg-secondary-container px-sm py-xs rounded text-on-secondary-container font-semibold uppercase self-start md:self-center">
          {profile?.role || user?.role || 'USER'}
        </span>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-outline-variant gap-lg overflow-x-auto whitespace-nowrap scrollbar-hide text-[13px]">
        <button className="pb-sm border-b-2 border-primary text-primary font-bold">Geral</button>
        <button disabled className="pb-sm border-b-2 border-transparent text-on-surface-variant/40 cursor-not-allowed">Segurança — Planejado</button>
        <button disabled className="pb-sm border-b-2 border-transparent text-on-surface-variant/40 cursor-not-allowed">Notificações — Planejado</button>
      </nav>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Main form */}
        <section className="lg:col-span-8 space-y-lg">

          {/* Personal info */}
          <Card title="Informações Pessoais">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md text-[13px]">
              <div className="flex flex-col gap-xs md:col-span-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome Completo *</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); markChanged(); }}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Cargo</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="text"
                  placeholder="Ex.: Técnico de TI"
                  value={jobTitle}
                  onChange={e => { setJobTitle(e.target.value); markChanged(); }}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Telefone</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); markChanged(); }}
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">E-mail</label>
                <input
                  className="bg-background border border-outline-variant/50 outline-none px-md py-sm rounded text-on-surface-variant/60 font-body-sm cursor-not-allowed"
                  type="email"
                  value={profile?.email || ''}
                  readOnly
                  disabled
                />
              </div>
              <div className="flex flex-col gap-xs md:col-span-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">ID do Usuário</label>
                <input
                  className="bg-background border border-outline-variant/50 outline-none px-md py-sm rounded text-on-surface-variant/60 font-mono text-[11px] cursor-not-allowed"
                  type="text"
                  value={profile?.id || ''}
                  readOnly
                  disabled
                />
              </div>
            </div>
          </Card>

          {/* Document identity */}
          <Card title="Identidade Documental">
            <div className="space-y-md text-[13px]">
              <p className="text-on-surface-variant text-[12px] bg-surface-container/30 border border-outline-variant/30 p-sm rounded">
                Estas informações aparecem em documentos gerados (faturas, orçamentos, ordens de serviço) quando você for o responsável pelo documento.
              </p>

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome exibido em documentos</label>
                <input
                  className="bg-background border border-outline-variant focus:border-primary outline-none px-md py-sm rounded text-on-surface font-body-sm"
                  type="text"
                  placeholder={`Padrão: ${name || 'Seu nome'}`}
                  value={documentDisplayName}
                  onChange={e => { setDocumentDisplayName(e.target.value); markChanged(); }}
                />
                <span className="text-[11px] text-on-surface-variant/60">Se vazio, usa o nome completo da conta.</span>
              </div>

              <div className="flex items-center justify-between p-md bg-surface-container/20 rounded border border-outline-variant/30 gap-md">
                <div className="flex flex-col gap-xs flex-1">
                  <span className="font-title-sm text-[13px] font-semibold text-on-surface">Usar minha assinatura em documentos</span>
                  <span className="font-body-sm text-[12px] text-on-surface-variant">Quando você for o responsável, sua imagem de assinatura será exibida no rodapé do documento.</span>
                </div>
                <button
                  onClick={() => { setDocumentSignatureEnabled(v => !v); markChanged(); }}
                  className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${documentSignatureEnabled ? 'bg-primary' : 'bg-outline-variant/50'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${documentSignatureEnabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              {/* Signature preview */}
              <div className="border border-outline-variant/30 rounded-lg p-md bg-surface-container/10">
                <p className="text-[10px] uppercase font-semibold text-on-surface-variant mb-sm tracking-wider">Prévia — Bloco de assinatura em documentos</p>
                <div className="bg-white text-black p-md rounded border border-black/10 flex flex-col items-center max-w-[280px]">
                  <div className="h-12 mb-xs flex items-end justify-center w-full">
                    {documentSignatureEnabled && signatureObjectUrl ? (
                      <img src={signatureObjectUrl} alt="Assinatura" className="max-h-12 object-contain" />
                    ) : documentSignatureEnabled ? (
                      <span className="text-[10px] text-black/30 italic">[sem imagem de assinatura]</span>
                    ) : null}
                  </div>
                  <div className="w-full border-t border-black/30 mb-xs" />
                  <span className="font-bold text-black text-xs">{displaySignatureName || 'Nome do Responsável'}</span>
                  {jobTitle && <span className="text-[10px] text-black/50">{jobTitle}</span>}
                  <span className="text-[10px] text-black/40">Responsável Autorizado</span>
                </div>
              </div>

              <div className="flex justify-end gap-md pt-xs">
                {hasChanges && (
                  <Button variant="ghost" onClick={handleDiscard} disabled={saving} className="text-xs">
                    Descartar
                  </Button>
                )}
                <Button variant="primary" onClick={handleSave} loading={saving} disabled={!hasChanges} className="text-xs">
                  Salvar perfil
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Sidebar — images */}
        <aside className="lg:col-span-4 space-y-lg">

          {/* Avatar */}
          <Card title="Foto de Perfil">
            <div className="space-y-md text-[13px]">
              <div className="flex flex-col items-center gap-md">
                <div className="w-24 h-24 rounded-full border-2 border-outline-variant overflow-hidden bg-surface-container flex items-center justify-center">
                  {avatarObjectUrl ? (
                    <img src={avatarObjectUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-3xl select-none">{userInitials}</span>
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, '/users/me/avatar', setAvatarUploading, setAvatarPath, 'avatarUrl');
                    e.target.value = '';
                  }}
                />

                <div className="flex gap-sm">
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-md"
                    onClick={() => avatarInputRef.current?.click()}
                    loading={avatarUploading}
                    disabled={avatarUploading}
                  >
                    {avatarObjectUrl ? 'Trocar foto' : 'Enviar foto'}
                  </Button>
                  {avatarObjectUrl && (
                    <Button
                      variant="danger"
                      className="text-xs py-1 px-md"
                      onClick={() => handleDeleteImage('/users/me/avatar', setAvatarPath)}
                      disabled={avatarUploading}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant/60 text-center">PNG, JPEG ou WebP · Máx. 2 MB</p>
            </div>
          </Card>

          {/* Signature image */}
          <Card title="Imagem de Assinatura">
            <div className="space-y-md text-[13px]">
              <p className="text-[12px] text-on-surface-variant">
                Imagem exibida no bloco de assinatura quando o toggle acima estiver ativado e você for o responsável pelo documento.
              </p>

              <div className="border border-outline-variant/30 rounded-lg p-md bg-surface-container/10 min-h-[80px] flex items-center justify-center">
                {signatureObjectUrl ? (
                  <img src={signatureObjectUrl} alt="Assinatura" className="max-h-20 object-contain" />
                ) : (
                  <span className="text-[11px] text-on-surface-variant/40 italic">Nenhuma imagem de assinatura</span>
                )}
              </div>

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, '/users/me/signature', setSignatureUploading, setSignaturePath, 'signatureUrl');
                  e.target.value = '';
                }}
              />

              <div className="flex gap-sm">
                <Button
                  variant="outline"
                  className="text-xs py-1 px-md"
                  onClick={() => signatureInputRef.current?.click()}
                  loading={signatureUploading}
                  disabled={signatureUploading}
                >
                  {signatureObjectUrl ? 'Trocar imagem' : 'Enviar imagem'}
                </Button>
                {signatureObjectUrl && (
                  <Button
                    variant="danger"
                    className="text-xs py-1 px-md"
                    onClick={() => handleDeleteImage('/users/me/signature', setSignaturePath)}
                    disabled={signatureUploading}
                  >
                    Remover
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-on-surface-variant/60">PNG, JPEG ou WebP · Máx. 2 MB · Recomendado: fundo transparente</p>
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
}
