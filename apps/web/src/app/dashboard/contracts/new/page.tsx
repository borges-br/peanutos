'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import { contractCreateSchema } from '@peanut/validators';
import { useI18n } from '../../../../i18n/useI18n';
import { useAuth } from '../../../../context/AuthContext';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import RestrictedState from '../../../../components/ui/RestrictedState';

export default function NewContractPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields State
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('RECURRING_SUPPORT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [renewalMode, setRenewalMode] = useState('MONTHLY');
  const [billingDay, setBillingDay] = useState('5');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [maxAssets, setMaxAssets] = useState('');
  const [notes, setNotes] = useState('');

  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    async function loadClients() {
      try {
        const response = await apiRequest('/clients?limit=100');
        setClients(response.data || []);
      } catch (err) {
        console.error('Falha ao carregar lista de clientes:', err);
      }
    }
    if (hasFinancialPrivilege) {
      loadClients();
    }
  }, [hasFinancialPrivilege]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      description: description || null,
      status: 'DRAFT',
      type,
      startDate: startDate ? new Date(startDate).toISOString() : '',
      endDate: endDate ? new Date(endDate).toISOString() : null,
      renewalMode,
      billingDay: Number(billingDay),
      monthlyAmountCents: Math.round(parseFloat(monthlyAmount) * 100) || 0,
      currency: 'BRL',
      clientId,
      maxUsers: maxUsers ? Number(maxUsers) : null,
      maxAssets: maxAssets ? Number(maxAssets) : null,
      notes: notes || null,
    };

    // Zod Validation
    const validation = contractCreateSchema.safeParse(payload);
    if (!validation.success) {
      const messages = validation.error.errors.map((err) => err.message).join(', ');
      setError(messages);
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/contracts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/dashboard/contracts/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar contrato.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasFinancialPrivilege) {
    return (
      <div className="flex flex-col gap-lg max-w-4xl mx-auto">
        <RestrictedState />
        <Button variant="outline" onClick={() => router.push('/dashboard/contracts')} className="w-fit">
          {t.common.back}
        </Button>
      </div>
    );
  }

  const typeOptions = [
    { value: 'RECURRING_SUPPORT', label: t.enums.contractType.RECURRING_SUPPORT },
    { value: 'PROJECT', label: t.enums.contractType.PROJECT },
    { value: 'ON_DEMAND', label: t.enums.contractType.ON_DEMAND },
    { value: 'HYBRID', label: t.enums.contractType.HYBRID }
  ];

  const renewalOptions = [
    { value: 'NONE', label: 'Sem renovação' },
    { value: 'MONTHLY', label: 'Mensal automático' },
    { value: 'ANNUAL', label: 'Anual automático' },
    { value: 'MANUAL', label: 'Renovação manual' }
  ];

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      {/* Page Header */}
      <header className="flex justify-between items-center w-full">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
            {t.contracts.newContract}
          </h2>
          <p className="text-[14px] text-on-surface-variant">
            {t.contracts.newContractSubtitle}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/contracts')}>
          <span className="material-symbols-outlined text-[16px] mr-1.5 font-bold">arrow_back</span>
          {t.common.back}
        </Button>
      </header>

      {error && (
        <div className="bg-error-container/10 border border-error-container/20 text-error p-md rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Contract form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg bg-surface border border-outline-variant p-lg rounded-xl shadow-lg">
        
        {/* Section 1: Identification */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            1. {t.contracts.clientIdentification}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.contracts.client} *</label>
              <Select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={[
                  { value: '', label: 'Selecione o cliente...' },
                  ...clients.map(c => ({ value: c.id, label: c.tradeName || c.legalName }))
                ]}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">Título do Contrato *</label>
              <Input
                type="text"
                required
                placeholder="Ex: Suporte de Infraestrutura e Backup 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.description}</label>
            <textarea
              rows={3}
              placeholder="Ex: Escopo geral do contrato e serviços prestados..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface-container-low border border-outline-variant focus:border-primary/50 text-on-surface rounded-xl p-md text-sm outline-none resize-none font-body transition-colors focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Section 2: Validity */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            2. {t.contracts.validity}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
            <div className="flex flex-col gap-xs col-span-1">
              <label className="text-[13px] font-semibold text-on-surface-variant">Data Início *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface border border-outline-variant text-on-surface text-sm rounded-lg p-sm outline-none w-full"
              />
            </div>

            <div className="flex flex-col gap-xs col-span-1">
              <label className="text-[13px] font-semibold text-on-surface-variant">Data Fim (Opcional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-surface border border-outline-variant text-on-surface text-sm rounded-lg p-sm outline-none w-full"
              />
            </div>

            <div className="flex flex-col gap-xs col-span-1">
              <label className="text-[13px] font-semibold text-on-surface-variant">Tipo de Contrato *</label>
              <Select
                required
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={typeOptions}
              />
            </div>

            <div className="flex flex-col gap-xs col-span-1">
              <label className="text-[13px] font-semibold text-on-surface-variant">Renovação</label>
              <Select
                required
                value={renewalMode}
                onChange={(e) => setRenewalMode(e.target.value)}
                options={renewalOptions}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Recurrence & Financials */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            3. {t.contracts.recurrenceAndValue}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.contracts.monthlyAmount} (R$) *</label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.contracts.billingDay} *</label>
              <Input
                type="number"
                min="1"
                max="31"
                required
                placeholder="5"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Operational Quotas */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            4. {t.contracts.operationalQuotas}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">Limite de Usuários (Opcional)</label>
              <Input
                type="number"
                placeholder="Sem limite"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">Limite de Ativos (Opcional)</label>
              <Input
                type="number"
                placeholder="Sem limite"
                value={maxAssets}
                onChange={(e) => setMaxAssets(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Observations */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            5. {t.clients.sections.observations}
          </h3>

          <div className="flex flex-col gap-xs">
            <textarea
              rows={4}
              placeholder="Ex: Condições de reajuste, SLA acordado, observações técnicas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-surface-container-low border border-outline-variant focus:border-primary/50 text-on-surface rounded-xl p-md text-sm outline-none resize-none font-body transition-colors focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Actions buttons */}
        <div className="flex justify-end gap-sm border-t border-outline-variant/30 pt-lg mt-md">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => router.push('/dashboard/contracts')}
            className="px-5"
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="px-6">
            {loading ? t.common.saving : t.contracts.saveBtn}
          </Button>
        </div>
      </form>
    </div>
  );
}
