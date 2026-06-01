'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { clientSchema, formatCpfCnpj, formatPhoneNumber } from '@peanut/validators';
import { apiRequest } from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

type ClientRecord = {
  id: string;
  type?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ClientChoice = {
  clientId: string;
  clientName: string;
};

const getClientName = (client: ClientRecord) =>
  client.tradeName || client.legalName || 'Cliente sem nome';

export function ClientPicker({
  clients,
  clientId,
  clientName,
  onChange,
  disabled,
  loading,
  label = 'Cliente *',
}: {
  clients: ClientRecord[];
  clientId: string;
  clientName: string;
  onChange: (choice: ClientChoice) => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}) {
  const [query, setQuery] = useState(clientName);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(clientName);
  }, [clientName]);

  const filteredClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients.slice(0, 8);
    return clients
      .filter((client) => {
        const haystack = [
          client.tradeName,
          client.legalName,
          client.document,
          client.email,
          client.phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalized);
      })
      .slice(0, 8);
  }, [clients, query]);

  const selectedClient = clients.find((client) => client.id === clientId);

  return (
    <div className="relative flex flex-col gap-1.5 w-full">
      <label className="text-[12px] font-medium text-on-surface-variant tracking-wide">
        {label}
      </label>
      <input
        value={query}
        disabled={disabled}
        placeholder={loading ? 'Carregando clientes...' : 'Digite para buscar ou criar avulso'}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          onChange({ clientId: '', clientName: value });
          setOpen(true);
        }}
        className="bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface placeholder-on-surface-variant/40 outline-none focus:border-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
      />

      {selectedClient && (
        <span className="text-[11px] text-on-surface-variant">
          Usando cadastro existente: {getClientName(selectedClient)}
        </span>
      )}

      {open && !disabled && (
        <div className="absolute z-30 top-[68px] left-0 right-0 bg-surface border border-outline-variant rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <button
                type="button"
                key={client.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const name = getClientName(client);
                  setQuery(name);
                  onChange({ clientId: client.id, clientName: name });
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-container-low border-b border-outline-variant/20 last:border-b-0"
              >
                <span className="block text-sm font-semibold text-on-surface">{getClientName(client)}</span>
                <span className="block text-[11px] text-on-surface-variant">
                  {[client.legalName && client.legalName !== client.tradeName ? client.legalName : null, formatCpfCnpj(client.document || '')]
                    .filter(Boolean)
                    .join(' - ') || 'Sem documento'}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-on-surface-variant">
              Nenhum cliente cadastrado encontrado. O nome digitado sera usado como cliente avulso.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuickClientModal({
  open,
  initialName,
  onClose,
  onCreated,
  onSkip,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (client: ClientRecord) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  const [type, setType] = useState<'LEGAL_PERSON' | 'NATURAL_PERSON'>('LEGAL_PERSON');
  const [legalName, setLegalName] = useState(initialName);
  const [tradeName, setTradeName] = useState('');
  const [documentValue, setDocumentValue] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLegalName(initialName);
    setTradeName('');
    setDocumentValue('');
    setEmail('');
    setPhone('');
    setError(null);
  }, [initialName, open]);

  if (!open) return null;

  const handleCreate = async () => {
    const payload = {
      type,
      legalName,
      tradeName: type === 'LEGAL_PERSON' ? tradeName || undefined : undefined,
      document: documentValue || undefined,
      email: email || undefined,
      phone: phone || undefined,
    };
    const validation = clientSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.errors.map((item) => item.message).join(', '));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const client = await apiRequest<ClientRecord>('/clients', {
        method: 'POST',
        body: JSON.stringify(validation.data),
      });
      await onCreated(client);
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar cliente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-md">
      <div className="w-full max-w-2xl bg-surface border border-outline-variant rounded-lg shadow-2xl p-lg flex flex-col gap-md">
        <div className="flex items-start justify-between gap-md border-b border-outline-variant/30 pb-md">
          <div>
            <h3 className="text-lg font-semibold text-on-surface">Cadastrar cliente?</h3>
            <p className="text-sm text-on-surface-variant">
              Voce pode salvar este cliente no banco agora ou continuar com nome avulso neste documento.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="px-2 py-1">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </Button>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/20 text-error p-sm rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <Select
            label="Tipo"
            value={type}
            onChange={(event) => setType(event.target.value as 'LEGAL_PERSON' | 'NATURAL_PERSON')}
            options={[
              { value: 'LEGAL_PERSON', label: 'Empresa' },
              { value: 'NATURAL_PERSON', label: 'Pessoa fisica' },
            ]}
            disabled={saving}
          />
          <Input
            label={type === 'LEGAL_PERSON' ? 'Razao social / Nome *' : 'Nome *'}
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            disabled={saving}
          />
          {type === 'LEGAL_PERSON' && (
            <Input
              label="Nome fantasia"
              value={tradeName}
              onChange={(event) => setTradeName(event.target.value)}
              disabled={saving}
            />
          )}
          <Input
            label={type === 'LEGAL_PERSON' ? 'CNPJ' : 'CPF'}
            value={documentValue}
            onChange={(event) => setDocumentValue(event.target.value)}
            onBlur={() => setDocumentValue(formatCpfCnpj(documentValue))}
            disabled={saving}
          />
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={saving}
          />
          <Input
            label="Telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setPhone(formatPhoneNumber(phone))}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-sm border-t border-outline-variant/30 pt-md">
          <Button type="button" variant="outline" onClick={onSkip} disabled={saving}>
            Continuar sem cadastrar
          </Button>
          <Button type="button" variant="primary" onClick={handleCreate} loading={saving}>
            Cadastrar e usar
          </Button>
        </div>
      </div>
    </div>
  );
}
