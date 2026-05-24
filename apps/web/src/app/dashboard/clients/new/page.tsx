'use client';

import React, { useState } from 'react';
import { apiRequest } from '../../../../lib/api';
import { useRouter } from 'next/navigation';
import { clientSchema } from '@peanut/validators';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Card from '../../../../components/ui/Card';

export default function NewClientPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [documentVal, setDocumentVal] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      legalName,
      tradeName,
      document: documentVal,
      email,
      phone,
      website: website || undefined,
      notes: notes || undefined,
    };

    const validation = clientSchema.safeParse(payload);
    if (!validation.success) {
      const messages = validation.error.errors.map(e => e.message).join(', ');
      setError(messages);
      setLoading(false);
      return;
    }

    try {
      await apiRequest('/clients', {
        method: 'POST',
        body: JSON.stringify(validation.data),
      });
      router.push('/dashboard/clients');
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar cliente.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] flex flex-col gap-lg select-none select-text">
      {/* Page Header */}
      <header className="flex flex-col gap-xs mb-md">
        <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
          {t.navigation.newClient}
        </h2>
        <p className="text-[14px] text-on-surface-variant">
          {t.clients.subtitle}
        </p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm text-center animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        {/* Section 1: Identification */}
        <Card title={t.clients.sections.identification}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Input
              id="legalName"
              type="text"
              label="Razão Social *"
              placeholder="Razão Social completa"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              id="tradeName"
              type="text"
              label="Nome Fantasia *"
              placeholder="Nome comercial do cliente"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              required
              disabled={loading}
            />

            <div className="md:col-span-2">
              <Input
                id="document"
                type="text"
                label="CNPJ ou CPF (Apenas números) *"
                placeholder="12345678000199"
                value={documentVal}
                onChange={(e) => setDocumentVal(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Contact */}
        <Card title={t.clients.sections.contact}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Input
              id="email"
              type="email"
              label="E-mail Principal *"
              placeholder="financeiro@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <Input
              id="phone"
              type="text"
              label="Telefone de Contato *"
              placeholder="1155550199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
            />

            <div className="md:col-span-2">
              <Input
                id="website"
                type="text"
                label="Website (Opcional)"
                placeholder="https://empresa.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </Card>

        {/* Section 3: Internals */}
        <Card title={t.clients.sections.observations}>
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="notes" className="text-[12px] font-medium text-on-surface-variant tracking-wide">
              Observações Internas (Opcional)
            </label>
            <textarea
              id="notes"
              rows={4}
              placeholder="Anotações comerciais, SLAs acordados ou observações de faturamento."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed resize-none"
              disabled={loading}
            />
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex justify-end gap-md pt-md border-t border-outline-variant/30 mt-md">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/clients')}
            disabled={loading}
            className="px-6 py-2"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="px-6 py-2"
          >
            {t.clients.saveClient}
          </Button>
        </div>
      </form>
    </div>
  );
}
