'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import { useAuth } from '../../../context/AuthContext';
import { apiRequest } from '../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type TabId = 'geral' | 'empresa' | 'seguranca' | 'usuarios' | 'notificacoes' | 'integracoes' | 'modulos';

const BRAND_FIELDS = [
  'brandName', 'brandSubtitle', 'legalName', 'companyDocument',
  'companyEmail', 'financialEmail', 'companyPhone', 'companyWebsite',
  'companyAddress', 'primaryColorHex', 'documentSecondaryColor',
  'documentAccentColor', 'documentFooterText', 'defaultInvoiceNotes',
  'defaultQuoteTerms', 'defaultServiceOrderTerms', 'defaultContractTerms',
  'signatureName',
] as const;

function ColorField({
  label, field, value, onChange, disabled,
}: { label: string; field: string; value: string; onChange: (f: string, v: string) => void; disabled: boolean }) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value);
  return (
    <div className="flex flex-col gap-xs">
      <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">{label}</label>
      <div className="flex gap-xs items-center">
        <input
          className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface font-mono focus:border-primary outline-none flex-1"
          placeholder="#1a56db"
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
          maxLength={7}
        />
        <div className="relative w-10 h-10 rounded border border-outline-variant shrink-0 overflow-hidden">
          <input
            type="color"
            value={isValid ? value : '#000000'}
            onChange={(e) => onChange(field, e.target.value)}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div
            className="w-full h-full transition-colors"
            style={{ backgroundColor: isValid ? value : '#000000' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('geral');
  const [successSaved, setSuccessSaved] = useState(false);

  const [logSensitiveViews, setLogSensitiveViews] = useState(true);
  const [confirmCriticalActions, setConfirmCriticalActions] = useState(true);

  const [brandSettings, setBrandSettings] = useState<any>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const isEditable = user ? ['OWNER', 'ADMIN'].includes(user.role) : false;

  useEffect(() => {
    if (activeTab === 'empresa') loadSettings();
  }, [activeTab]);

  async function loadSettings() {
    setLoadingSettings(true);
    setSaveError(null);
    try {
      const data = await apiRequest('/settings/brand');
      const normalized: any = {};
      for (const key of BRAND_FIELDS) {
        normalized[key] = data[key] == null ? '' : data[key];
      }
      setBrandSettings(normalized);
      setLogoUrl(data.logoUrl || null);
    } catch (err: any) {
      setSaveError('Falha ao carregar configurações da empresa.');
    } finally {
      setLoadingSettings(false);
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setBrandSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = async () => {
    if (!isEditable) return;
    setSaveError(null);
    setSaveSuccess(false);
    setLoadingSettings(true);
    try {
      const response = await apiRequest('/settings/brand', {
        method: 'PATCH',
        body: JSON.stringify(brandSettings),
      });
      const normalized: any = {};
      for (const key of BRAND_FIELDS) {
        normalized[key] = response[key] == null ? '' : response[key];
      }
      setBrandSettings(normalized);
      setLogoUrl(response.logoUrl || null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao salvar configurações.');
    } finally {
      setLoadingSettings(false);
    }
  };

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      setSaveError('Tipo de arquivo não permitido. Use PNG, JPEG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Arquivo muito grande. Máximo 2 MB.');
      return;
    }

    setUploadingLogo(true);
    setSaveError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.replace(/^data:[^;]+;base64,/, ''));
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await apiRequest('/settings/brand/logo', {
        method: 'POST',
        body: JSON.stringify({ data: base64, mimeType: file.type, filename: file.name }),
      });
      setLogoUrl(response.logoUrl);
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao enviar logo.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleLogoDelete() {
    if (!confirm('Remover a logo atual?')) return;
    setUploadingLogo(true);
    try {
      await apiRequest('/settings/brand/logo', { method: 'DELETE' });
      setLogoUrl(null);
    } catch (err: any) {
      setSaveError(err.message || 'Erro ao remover logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  const handleSave = () => {
    if (activeTab === 'empresa') handleSaveSettings();
    else { setSuccessSaved(true); setTimeout(() => setSuccessSaved(false), 3000); }
  };

  const renderGeral = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg animate-fade-in">
      <Card title="Workspace">
        <div className="space-y-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome do Workspace</label>
            <input className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors" type="text" defaultValue="Borges TI" />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Ambiente</label>
            <select className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none transition-colors appearance-none cursor-pointer">
              <option>Produção (Main Node)</option>
              <option>Homologação</option>
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
              </select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEmpresa = () => {
    if (loadingSettings && !brandSettings.brandName) {
      return (
        <div className="flex flex-col justify-center items-center py-xl gap-sm text-on-surface-variant font-body-sm">
          <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
          <p>Carregando configurações...</p>
        </div>
      );
    }

    return (
      <div className="space-y-gutter animate-fade-in">
        {!isEditable && (
          <div className="bg-surface-container/60 border border-outline-variant/30 text-on-surface-variant p-md rounded-lg flex items-center gap-sm">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <p className="font-body-sm text-[13px]">Você não tem permissão para editar configurações da empresa.</p>
          </div>
        )}

        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-md rounded-lg flex items-center gap-sm animate-fade-in">
            <span className="material-symbols-outlined">check_circle</span>
            <p className="font-body-md text-[13px]">Configurações salvas com sucesso.</p>
          </div>
        )}

        {saveError && (
          <div className="bg-error-container/10 border border-error/20 text-error p-md rounded-lg flex items-center gap-sm animate-fade-in">
            <span className="material-symbols-outlined">error</span>
            <p className="font-body-md text-[13px]">{saveError}</p>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-gutter">

          {/* A. Dados da organização */}
          <Card title="A. Dados da Organização" headerAction={
            <span className="px-2 py-0.5 bg-tertiary/10 border border-tertiary/20 text-tertiary font-label-caps text-[10px] rounded uppercase font-bold">Beta</span>
          }>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              {[
                { key: 'brandName', label: 'Nome Público', placeholder: 'Nome público da empresa', type: 'text' },
                { key: 'brandSubtitle', label: 'Subtítulo', placeholder: 'Subtítulo descritivo', type: 'text' },
                { key: 'legalName', label: 'Razão Social', placeholder: 'Razão social oficial', type: 'text' },
                { key: 'companyDocument', label: 'CNPJ / Tax ID', placeholder: 'CNPJ / CPF / Tax ID', type: 'text', mono: true },
                { key: 'companyEmail', label: 'E-mail Principal', placeholder: 'email@empresa.com', type: 'email' },
                { key: 'financialEmail', label: 'E-mail Financeiro', placeholder: 'financeiro@empresa.com', type: 'email' },
                { key: 'companyPhone', label: 'Telefone', placeholder: '(11) 9999-9999', type: 'text' },
                { key: 'companyWebsite', label: 'Website', placeholder: 'https://suaempresa.com', type: 'text' },
              ].map(({ key, label, placeholder, type, mono }) => (
                <div key={key} className="flex flex-col gap-xs">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">{label}</label>
                  <input
                    className={`bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none ${mono ? 'font-mono' : ''}`}
                    placeholder={placeholder}
                    type={type}
                    value={brandSettings[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    disabled={loadingSettings || !isEditable}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-xs md:col-span-3">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Endereço</label>
                <textarea
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none min-h-[60px]"
                  placeholder="Rua, Número, Bairro, Cidade – Estado, CEP"
                  value={brandSettings.companyAddress || ''}
                  onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                  disabled={loadingSettings || !isEditable}
                />
              </div>
            </div>
          </Card>

          {/* B. Identidade documental */}
          <Card title="B. Identidade Documental — Logo e Cores">
            <div className="space-y-lg">
              <div className="bg-amber-500/5 border border-amber-500/20 text-amber-400 p-sm rounded text-[12px] flex items-start gap-sm">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                <span>Essas cores e a logo serão aplicadas <strong>exclusivamente em documentos gerados</strong> (faturas, orçamentos, O.S., contratos). A interface do Peanut OS permanece no tema dark atual.</span>
              </div>

              {/* Logo upload */}
              <div className="flex flex-col gap-sm">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Logo da empresa</label>
                <div className="flex items-center gap-md flex-wrap">
                  {logoUrl ? (
                    <div className="relative w-24 h-16 border border-outline-variant rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
                      <img
                        src={`${API_URL}${logoUrl}`}
                        alt="Logo"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-16 border border-dashed border-outline-variant rounded-lg bg-surface-container/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant text-2xl">image</span>
                    </div>
                  )}
                  {isEditable && (
                    <div className="flex gap-sm flex-wrap">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-xs"
                        onClick={() => logoInputRef.current?.click()}
                        loading={uploadingLogo}
                        disabled={uploadingLogo}
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">upload</span>
                        {logoUrl ? 'Substituir Logo' : 'Enviar Logo'}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-xs text-error border border-error/30 hover:bg-error/10"
                          onClick={handleLogoDelete}
                          disabled={uploadingLogo}
                        >
                          <span className="material-symbols-outlined text-[16px] mr-1">delete</span>
                          Remover
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-on-surface-variant/60 w-full">PNG, JPEG ou WebP. Máximo 2 MB. Recomendado: fundo transparente.</p>
                </div>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <ColorField label="Cor Primária Documental" field="primaryColorHex" value={brandSettings.primaryColorHex || ''} onChange={handleInputChange} disabled={loadingSettings || !isEditable} />
                <ColorField label="Cor Secundária Documental" field="documentSecondaryColor" value={brandSettings.documentSecondaryColor || ''} onChange={handleInputChange} disabled={loadingSettings || !isEditable} />
                <ColorField label="Cor de Destaque" field="documentAccentColor" value={brandSettings.documentAccentColor || ''} onChange={handleInputChange} disabled={loadingSettings || !isEditable} />
              </div>
            </div>
          </Card>

          {/* C. Textos padrão */}
          <Card title="C. Textos Padrão de Documentos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs md:col-span-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Rodapé padrão dos documentos</label>
                <textarea
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none min-h-[60px]"
                  placeholder="Ex: Peanut OS — Central de TI. CNPJ 00.000.000/0001-00"
                  value={brandSettings.documentFooterText || ''}
                  onChange={(e) => handleInputChange('documentFooterText', e.target.value)}
                  disabled={loadingSettings || !isEditable}
                />
              </div>
              {[
                { key: 'defaultInvoiceNotes', label: 'Observações padrão de Fatura', placeholder: 'Observações que aparecem em todas as faturas...' },
                { key: 'defaultQuoteTerms', label: 'Termos padrão de Orçamento', placeholder: 'Termos e condições de orçamentos...' },
                { key: 'defaultServiceOrderTerms', label: 'Termos padrão de Ordem de Serviço', placeholder: 'Termos de O.S...' },
                { key: 'defaultContractTerms', label: 'Termos padrão de Contrato', placeholder: 'Cláusulas contratuais padrão...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="flex flex-col gap-xs">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">{label}</label>
                  <textarea
                    className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none min-h-[80px]"
                    placeholder={placeholder}
                    value={brandSettings[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    disabled={loadingSettings || !isEditable}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-xs md:col-span-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">Nome do responsável para assinatura (legado)</label>
                <input
                  className="bg-background border border-outline-variant rounded p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none"
                  placeholder="Ex: João Silva — Responsável Técnico"
                  type="text"
                  value={brandSettings.signatureName || ''}
                  onChange={(e) => handleInputChange('signatureName', e.target.value)}
                  disabled={loadingSettings || !isEditable}
                />
                <p className="text-[11px] text-on-surface-variant/60">Campo legado. Para assinaturas individuais, configure no Perfil do Usuário.</p>
              </div>
            </div>
          </Card>

          {/* D. Preview A4 */}
          <div className="bg-surface border border-outline-variant rounded-xl p-lg">
            <div className="flex items-center justify-between mb-md">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-on-surface-variant">preview</span>
                <h2 className="font-title-sm text-sm font-semibold text-on-surface">D. Preview A4 — Templates</h2>
              </div>
              <Button variant="outline" className="text-xs" onClick={() => router.push('/dashboard/templates-a4')}>
                Abrir Preview Completo
              </Button>
            </div>
            <p className="font-body-sm text-[12px] text-on-surface-variant">
              Configure os blocos e a estrutura dos documentos A4 na página de Templates. O preview reflete as cores e logo configuradas acima.
            </p>
          </div>
        </form>
      </div>
    );
  };

  const renderSeguranca = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-lg animate-fade-in">
      <div className="md:col-span-2 space-y-gutter">
        <Card title="Políticas de Acesso Seguras">
          <div className="space-y-md">
            {[
              { key: 'log', label: 'Registrar Visualização de Dados Sensíveis', desc: 'Auditar visualizações de credenciais criptografadas.', value: logSensitiveViews, set: setLogSensitiveViews },
              { key: 'confirm', label: 'Confirmação para Ações Críticas', desc: 'Exigir confirmação para exclusão ou redefinições.', value: confirmCriticalActions, set: setConfirmCriticalActions },
            ].map(({ key, label, desc, value, set }) => (
              <div key={key} className="flex items-center justify-between p-sm hover:bg-surface-container/30 transition-colors rounded border border-outline-variant/10">
                <div>
                  <p className="font-body-md text-[13px] font-semibold text-on-surface">{label}</p>
                  <p className="font-body-sm text-[12px] text-on-surface-variant">{desc}</p>
                </div>
                <button onClick={() => set(!value)} className={`w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none ${value ? 'bg-primary' : 'bg-outline-variant'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-surface transition-all duration-200 ${value ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div>
        <div className="bg-error-container/10 border border-error/20 p-lg rounded-xl flex flex-col gap-md shadow">
          <div className="flex items-center gap-sm text-error">
            <span className="material-symbols-outlined">lock</span>
            <h2 className="font-title-sm text-sm font-semibold">Chave de Assinatura</h2>
          </div>
          <p className="font-body-sm text-[12px] text-on-surface-variant">Previsto para rotação de chave criptográfica.</p>
          <div className="bg-black/40 p-sm rounded font-mono text-center text-primary-fixed-dim text-[12px]">••••••••••••</div>
        </div>
      </div>
    </div>
  );

  const renderUsuarios = () => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg animate-fade-in">
      <div className="md:col-span-8 bg-surface border border-outline-variant rounded-xl overflow-hidden shadow shadow-black/20">
        <div className="p-md border-b border-outline-variant bg-surface-container-high/60">
          <h2 className="font-label-caps text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Atalhos Administrativos</h2>
        </div>
        <div className="p-lg space-y-md">
          {[
            { title: 'Gerenciar Usuários Internos', desc: 'Convide novos membros e configure acessos.', path: '/dashboard/configuracoes/usuarios-internos', label: 'Acessar Usuários' },
            { title: 'Matriz de Permissões (RBAC)', desc: 'Visualize papéis: OWNER, ADMIN, FINANCIAL, TECHNICIAN, READ_ONLY.', path: '/dashboard/configuracoes/permissoes', label: 'Acessar RBAC' },
          ].map(({ title, desc, path, label }) => (
            <div key={path} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-md border border-outline-variant/30 hover:border-primary/40 rounded-xl bg-surface-container/20 transition-all gap-md">
              <div>
                <h4 className="font-title-sm text-[14px] text-on-surface font-semibold">{title}</h4>
                <p className="text-body-sm text-[12px] text-on-surface-variant mt-1">{desc}</p>
              </div>
              <Button variant="outline" className="text-xs self-start sm:self-auto" onClick={() => router.push(path)}>{label}</Button>
            </div>
          ))}
        </div>
      </div>
      <div className="md:col-span-4">
        <Card title="Resumo das Contas">
          <div className="space-y-sm text-[13px]">
            {['Proprietário (OWNER)', 'Administradores', 'Técnicos', 'Desativadas'].map((label, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-outline-variant/20 last:border-0">
                <span className="text-on-surface-variant">{label}</span>
                <span className="font-mono text-primary font-bold">{i === 0 ? '1' : '--'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderNotificacoes = () => (
    <div className="bg-surface border border-outline-variant p-xl rounded-xl text-center space-y-md shadow animate-fade-in max-w-xl mx-auto">
      <span className="material-symbols-outlined text-5xl text-outline-variant">notifications_active</span>
      <h2 className="font-headline-md text-lg text-on-surface font-semibold">Canais de Alerta e Notificação</h2>
      <p className="text-on-surface-variant text-[13px] leading-relaxed">Previsto: regras granulares por canal (Sistema, E-mail, Webhook).</p>
    </div>
  );

  const renderIntegracoes = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md animate-fade-in">
      {[
        { title: 'Diretório Azure AD', desc: 'Sincronização de operadores.', status: 'ATIVO', active: true, icon: 'hub', path: '' },
        { title: 'Serviço de Envio SMTP', desc: 'Disparo de emails operacionais.', status: 'Previsto', active: false, icon: 'mail', path: '' },
        { title: 'Disparador de Webhooks', desc: 'Integrações JSON em tempo real.', status: 'ATIVO', active: true, icon: 'api', path: '/dashboard/configuracoes/webhooks' },
      ].map(({ title, desc, status, active, icon, path }) => (
        <div
          key={title}
          onClick={() => path && router.push(path)}
          className={`bg-surface border border-outline-variant p-md rounded-xl flex items-center gap-md shadow transition-colors ${!active ? 'opacity-60' : 'cursor-pointer hover:border-primary/40'}`}
        >
          <div className="w-12 h-12 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0">
            <span className={`material-symbols-outlined text-primary text-3xl`}>{icon}</span>
          </div>
          <div>
            <h3 className="font-title-sm text-sm font-semibold text-on-surface">{title}</h3>
            <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">{desc}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary-container/30 border border-outline-variant/30 text-on-surface-variant'}`}>
              {status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderModulos = () => (
    <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow animate-fade-in">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead className="bg-surface-container font-label-caps text-on-surface-variant border-b border-outline-variant">
          <tr>
            {['MÓDULO', 'STATUS', 'VERSÃO', 'LICENÇA'].map(h => <th key={h} className="p-md font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          <tr className="hover:bg-surface-container/20">
            <td className="p-md font-medium text-on-surface">Core Engine System</td>
            <td className="p-md"><div className="flex items-center gap-xs"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span>Operacional</span></div></td>
            <td className="p-md font-mono text-on-surface-variant/80 text-[11px]">v2.4.0</td>
            <td className="p-md text-right text-[11px] font-bold text-primary">CORPORATIVO</td>
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl pb-md border-b border-outline-variant/30">
        <div>
          <h1 className="font-display-lg text-3xl text-on-surface font-semibold tracking-tight">Configurações</h1>
          <p className="font-body-md text-[14px] text-on-surface-variant mt-1">Gerencie preferências globais, segurança e integrações do Peanut OS.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm mt-md md:mt-0">
          <Button variant="secondary" onClick={() => router.push('/dashboard/auditoria')}>
            <span className="material-symbols-outlined text-[18px] mr-1">history</span>
            Ver Auditoria
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={activeTab === 'empresa' ? (loadingSettings || !isEditable) : false}>
            <span className="material-symbols-outlined text-[18px] mr-1">save</span>
            {activeTab === 'empresa' && loadingSettings ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>

      {successSaved && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-md rounded-lg flex items-center gap-sm animate-fade-in">
          <span className="material-symbols-outlined">check_circle</span>
          <p className="font-body-md text-[13px]">Configurações salvas!</p>
        </div>
      )}

      <nav className="flex border-b border-outline-variant mb-xl overflow-x-auto whitespace-nowrap scrollbar-hide gap-lg">
        {([
          { id: 'geral', label: 'GERAL' },
          { id: 'empresa', label: 'EMPRESA' },
          { id: 'seguranca', label: 'SEGURANÇA' },
          { id: 'usuarios', label: 'USUÁRIOS E PERMISSÕES' },
          { id: 'notificacoes', label: 'NOTIFICAÇÕES' },
          { id: 'integracoes', label: 'INTEGRAÇÕES' },
          { id: 'modulos', label: 'MÓDULOS' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-sm font-label-caps text-xs tracking-wider font-semibold transition-all ${activeTab === tab.id ? 'text-primary border-b-2 border-primary font-bold' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <section className="mt-md">{renderTabContent()}</section>
    </main>
  );
}
