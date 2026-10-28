'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import logoImg from '../../../images/layout/logo.webp';

type Step = 1 | 2 | 3 | 4;

export default function SetupPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Admin config
  const [workspaceName, setWorkspaceName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Organisation details
  const [publicName, setPublicName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');

  // Step 3: Document identity
  const [documentPrimaryColor, setDocumentPrimaryColor] = useState('#1a56db');
  const [documentSecondaryColor, setDocumentSecondaryColor] = useState('#4b5563');
  const [documentAccentColor, setDocumentAccentColor] = useState('#e11d48');
  const [documentFooterText, setDocumentFooterText] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSetup() {
      try {
        const { requiresSetup } = await apiRequest<{ requiresSetup: boolean }>(
          '/setup/status',
        );
        if (!requiresSetup) {
          router.replace('/login');
          return;
        }
      } catch {
        router.replace('/login');
        return;
      }
      setChecking(false);
    }
    checkSetup();
  }, [router]);

  const validateStep1 = (): boolean => {
    if (!workspaceName.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError('Preencha todos os campos obrigatórios do administrador.');
      return false;
    }
    if (adminPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return false;
    }
    if (adminPassword.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return false;
    }
    if (!/[A-Z]/.test(adminPassword)) {
      setError('A senha deve conter pelo menos uma letra maiúscula.');
      return false;
    }
    if (!/[0-9]/.test(adminPassword)) {
      setError('A senha deve conter pelo menos um número.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (primaryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)) {
      setError('E-mail principal da organização inválido.');
      return false;
    }
    if (website && !/^https?:\/\//.test(website)) {
      setError('O website deve iniciar com http:// ou https://.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep3 = (): boolean => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (documentPrimaryColor && !hexRegex.test(documentPrimaryColor)) {
      setError('Cor primária inválida. Formato esperado: #RRGGBB');
      return false;
    }
    if (documentSecondaryColor && !hexRegex.test(documentSecondaryColor)) {
      setError('Cor secundária inválida. Formato esperado: #RRGGBB');
      return false;
    }
    if (documentAccentColor && !hexRegex.test(documentAccentColor)) {
      setError('Cor de destaque inválida. Formato esperado: #RRGGBB');
      return false;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    setCurrentStep((prev) => (prev + 1) as Step);
    setError(null);
  };

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1) as Step);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        workspaceName,
        adminName,
        adminEmail,
        adminPassword,
        brandName: publicName.trim() || workspaceName, // fallback to workspaceName per prompt
        legalName: legalName.trim() || null,
        companyDocument: taxId.trim() || null,
        companyEmail: primaryEmail.trim() || null,
        companyPhone: phone.trim() || null,
        companyWebsite: website.trim() || null,
        companyAddress: address.trim() || null,
        primaryColorHex: documentPrimaryColor || null,
        documentSecondaryColor: documentSecondaryColor || null,
        documentAccentColor: documentAccentColor || null,
        documentFooterText: documentFooterText.trim() || null,
      };

      await apiRequest('/setup/admin', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.replace('/login');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar o ambiente inicial. Tente novamente.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </main>
    );
  }

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: 'Admin' },
      { id: 2, label: 'Empresa' },
      { id: 3, label: 'Visual' },
      { id: 4, label: 'Revisão' },
    ];
    return (
      <div className="flex items-center justify-between mb-lg border-b border-outline-variant/20 pb-md">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-xs">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  currentStep === s.id
                    ? 'bg-primary text-on-primary ring-4 ring-primary/20'
                    : currentStep > s.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                }`}
              >
                {currentStep > s.id ? (
                  <span className="material-symbols-outlined text-[14px]">check</span>
                ) : (
                  s.id
                )}
              </div>
              <span
                className={`text-[12px] font-semibold hidden sm:inline ${
                  currentStep === s.id ? 'text-on-surface font-bold' : 'text-on-surface-variant/60'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-sm rounded transition-colors ${
                  currentStep > s.id ? 'bg-emerald-500/50' : 'bg-outline-variant/20'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderColorField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
  ) => {
    const isValid = /^#[0-9A-Fa-f]{6}$/.test(value);
    return (
      <div className="flex flex-col gap-xs">
        <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
          {label}
        </label>
        <div className="flex gap-xs items-center">
          <input
            className="bg-background border border-outline-variant rounded-lg p-sm font-mono text-[12px] text-on-surface focus:border-primary outline-none flex-1 transition-colors"
            placeholder="#1a56db"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={7}
          />
          <div className="relative w-10 h-10 rounded-lg border border-outline-variant shrink-0 overflow-hidden">
            <input
              type="color"
              value={isValid ? value : '#000000'}
              onChange={(e) => setValue(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="w-full h-full transition-colors"
              style={{ backgroundColor: isValid ? value : '#000000' }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background flex flex-col justify-center items-center p-md relative overflow-hidden select-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[radial-gradient(circle,rgba(157,183,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[radial-gradient(circle,rgba(157,183,255,0.05)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

      <section className="w-full max-w-[540px] bg-surface border border-outline-variant/30 rounded-2xl p-lg md:p-xl shadow-2xl shadow-black/80 z-10 transition-all duration-300">
        <div className="text-center mb-lg">
          <div className="flex justify-center items-center gap-xs mb-sm">
            <div className="w-6 h-6 flex items-center justify-center rounded overflow-hidden">
              <img src={logoImg.src} alt="Peanut OS Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-headline-md text-base font-bold text-primary tracking-tight">Peanut OS</span>
          </div>
          <h2 className="font-display-lg text-lg text-on-surface font-semibold mt-2">
            Configuração Inicial
          </h2>
          <p className="text-[12px] text-on-surface-variant/80 mt-1">
            Siga os passos para ativar seu ambiente de white-label.
          </p>
        </div>

        {renderStepIndicator()}

        {error && (
          <div className="mb-md bg-red-500/10 border border-red-500/20 text-red-400 p-sm rounded-lg text-[12px] text-center animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          {currentStep === 1 && (
            <div className="space-y-md animate-fade-in">
              <p className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-wider">
                Etapa 1 — Conta de Administrador
              </p>
              <Input
                id="workspaceName"
                type="text"
                label="Nome do Workspace / Organização *"
                placeholder="Ex.: Borges TI"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="adminName"
                type="text"
                label="Nome Completo *"
                placeholder="João Silva"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="adminEmail"
                type="email"
                label="E-mail Administrativo *"
                placeholder="admin@empresa.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="adminPassword"
                type="password"
                label="Senha *"
                placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Confirmar Senha *"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-md animate-fade-in">
              <p className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-wider">
                Etapa 2 — Dados da Empresa (Opcional)
              </p>
              <Input
                id="publicName"
                type="text"
                label="Nome Público"
                placeholder="Padrão: Nome do Workspace"
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                disabled={loading}
              />
              <Input
                id="legalName"
                type="text"
                label="Razão Social"
                placeholder="Ex.: Borges Serviços de TI Ltda"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={loading}
              />
              <Input
                id="taxId"
                type="text"
                label="CNPJ / Documento"
                placeholder="Ex.: 00.000.000/0001-00"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                disabled={loading}
              />
              <Input
                id="primaryEmail"
                type="email"
                label="E-mail Público / Comercial"
                placeholder="contato@empresa.com"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                disabled={loading}
              />
              <Input
                id="phone"
                type="text"
                label="Telefone de Contato"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
              <Input
                id="website"
                type="text"
                label="Website da Empresa"
                placeholder="https://suaempresa.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={loading}
              />
              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Endereço Físico
                </label>
                <textarea
                  className="bg-background border border-outline-variant rounded-lg p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none min-h-[60px] transition-colors"
                  placeholder="Rua, Número, Bairro, Cidade – Estado, CEP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-md animate-fade-in">
              <p className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-wider">
                Etapa 3 — Identidade Documental
              </p>
              <div className="bg-surface-container/40 border border-outline-variant/30 text-on-surface-variant p-sm rounded-lg text-[11px] leading-relaxed">
                Estas cores serão aplicadas <strong>exclusivamente aos documentos gerados</strong> (faturas, orçamentos, OS). A interface do Peanut OS permanece no tema dark.
              </div>

              {renderColorField('Cor Primária Documental', documentPrimaryColor, setDocumentPrimaryColor)}
              {renderColorField('Cor Secundária Documental', documentSecondaryColor, setDocumentSecondaryColor)}
              {renderColorField('Cor de Destaque', documentAccentColor, setDocumentAccentColor)}

              <div className="flex flex-col gap-xs">
                <label className="font-label-caps text-[10px] text-on-surface-variant uppercase font-semibold">
                  Texto de Rodapé Padrão
                </label>
                <textarea
                  className="bg-background border border-outline-variant rounded-lg p-sm font-body-sm text-[13px] text-on-surface focus:border-primary outline-none min-h-[60px] transition-colors"
                  placeholder="Ex: Peanut OS — Central de TI. CNPJ 00.000.000/0001-00"
                  value={documentFooterText}
                  onChange={(e) => setDocumentFooterText(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-md animate-fade-in text-[13px]">
              <p className="font-label-caps text-[10px] text-primary uppercase font-bold tracking-wider">
                Etapa 4 — Revisão Geral
              </p>

              <div className="space-y-sm bg-surface-container/30 border border-outline-variant/20 rounded-xl p-md">
                <h4 className="font-bold text-on-surface pb-xs border-b border-outline-variant/20 mb-xs">
                  Conta e Workspace
                </h4>
                <div className="flex justify-between"><span className="text-on-surface-variant">Workspace:</span><span className="font-semibold text-on-surface">{workspaceName}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Administrador:</span><span className="font-semibold text-on-surface">{adminName}</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">E-mail:</span><span className="font-semibold text-on-surface">{adminEmail}</span></div>

                <h4 className="font-bold text-on-surface pb-xs border-b border-outline-variant/20 mb-xs mt-md">
                  Marca Documental
                </h4>
                <div className="flex justify-between"><span className="text-on-surface-variant">Nome Público:</span><span className="font-semibold text-on-surface">{publicName || workspaceName}</span></div>
                {legalName && <div className="flex justify-between"><span className="text-on-surface-variant">Razão Social:</span><span className="font-semibold text-on-surface">{legalName}</span></div>}
                {taxId && <div className="flex justify-between"><span className="text-on-surface-variant">CNPJ:</span><span className="font-semibold text-on-surface">{taxId}</span></div>}

                <h4 className="font-bold text-on-surface pb-xs border-b border-outline-variant/20 mb-xs mt-md">
                  Cores do Documento
                </h4>
                <div className="flex items-center gap-md">
                  <div className="flex items-center gap-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: documentPrimaryColor }} />
                    <span className="font-mono text-[11px]">{documentPrimaryColor}</span>
                  </div>
                  <div className="flex items-center gap-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: documentSecondaryColor }} />
                    <span className="font-mono text-[11px]">{documentSecondaryColor}</span>
                  </div>
                  <div className="flex items-center gap-xs">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: documentAccentColor }} />
                    <span className="font-mono text-[11px]">{documentAccentColor}</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-sm rounded-lg text-[11px] leading-relaxed text-center">
                Tudo pronto! Clique em &quot;Criar ambiente&quot; para inicializar o banco de dados.
              </div>
            </div>
          )}

          <div className="flex gap-sm mt-lg">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-2 text-xs"
                onClick={prevStep}
                disabled={loading}
              >
                Voltar
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                className="flex-1 py-2 text-xs"
                onClick={nextStep}
                disabled={loading}
              >
                Continuar
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                className="flex-1 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Inicializando...' : 'Criar ambiente'}
              </Button>
            )}
          </div>
        </form>
      </section>

      <footer className="mt-xl text-[11px] text-on-surface-variant/40 z-10 pointer-events-none text-center">
        © {new Date().getFullYear()} Peanut OS — Configuração inicial
      </footer>
    </main>
  );
}
