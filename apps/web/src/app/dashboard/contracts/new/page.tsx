'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';

type LineItemDraft = {
  description: string;
  itemType: string;
  quantity: string;
  unitPriceReais: string;
  recurring: boolean;
};

export default function NewContractPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Picklists
  const [clients, setClients] = useState<any[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<any[]>([]);

  // Form Fields
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('RECURRING_SUPPORT');
  const [status, setStatus] = useState('DRAFT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [renewalMode, setRenewalMode] = useState('MONTHLY');
  const [billingDay, setBillingDay] = useState(5);
  const [monthlyAmountReais, setMonthlyAmountReais] = useState('0.00');
  const [currency, setCurrency] = useState('BRL');
  const [slaPolicyId, setSlaPolicyId] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [maxAssets, setMaxAssets] = useState('');
  const [includedRemoteTickets, setIncludedRemoteTickets] = useState('');
  const [includedOnsiteVisits, setIncludedOnsiteVisits] = useState('');
  const [includedRemoteHours, setIncludedRemoteHours] = useState('');
  const [includedOnsiteHours, setIncludedOnsiteHours] = useState('');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { description: '', itemType: 'SUPPORT', quantity: '1', unitPriceReais: '0.00', recurring: true },
  ]);

  // States
  const [loading, setLoading] = useState(false);
  const [fetchingPicklists, setFetchingPicklists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security Gate
  const hasFinancialPrivilege = user ? ['OWNER', 'ADMIN', 'FINANCIAL'].includes(user.role) : false;

  useEffect(() => {
    if (user && !hasFinancialPrivilege) {
      router.push('/dashboard/contracts');
    }
  }, [user, hasFinancialPrivilege, router]);

  useEffect(() => {
    const initialClientId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('clientId')
        : null;
    if (initialClientId) {
      setClientId(initialClientId);
    }
  }, []);

  useEffect(() => {
    const fetchPicklists = async () => {
      setFetchingPicklists(true);
      try {
        const [clientsResult, slaResult] = await Promise.allSettled([
          apiRequest('/clients?limit=100'),
          apiRequest('/tickets/sla-policies'),
        ]);
        if (clientsResult.status === 'fulfilled') {
          setClients(clientsResult.value.data || []);
        }
        if (slaResult.status === 'fulfilled') {
          setSlaPolicies(slaResult.value || []);
        }
      } finally {
        setFetchingPicklists(false);
      }
    };
    if (hasFinancialPrivilege) {
      fetchPicklists();
    }
  }, [hasFinancialPrivilege]);

  const updateLineItem = (index: number, patch: Partial<LineItemDraft>) => {
    setLineItems((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const addLineItemDraft = () => {
    setLineItems((items) => [
      ...items,
      { description: '', itemType: 'SERVICE', quantity: '1', unitPriceReais: '0.00', recurring: true },
    ]);
  };

  const removeLineItemDraft = (index: number) => {
    setLineItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Basic validations
      if (!clientId) throw new Error('Selecione um cliente.');
      if (!title) throw new Error('O título do contrato é obrigatório.');
      if (!startDate) throw new Error('Selecione a data de início do contrato.');

      // Convert monthly amount from Reais to Cents
      const amountCents = Math.round(parseFloat(monthlyAmountReais.replace(',', '.')) * 100);
      if (isNaN(amountCents) || amountCents < 0) {
        throw new Error('Valor mensal inválido.');
      }

      const payload = {
        clientId,
        title,
        description,
        type,
        status,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        renewalMode,
        billingDay: Number(billingDay),
        monthlyAmountCents: amountCents,
        currency,
        slaPolicyId: slaPolicyId || null,
        maxUsers: maxUsers ? Number(maxUsers) : null,
        maxAssets: maxAssets ? Number(maxAssets) : null,
        includedRemoteTickets: includedRemoteTickets ? Number(includedRemoteTickets) : null,
        includedOnsiteVisits: includedOnsiteVisits ? Number(includedOnsiteVisits) : null,
        includedRemoteHours: includedRemoteHours ? Number(includedRemoteHours) : null,
        includedOnsiteHours: includedOnsiteHours ? Number(includedOnsiteHours) : null,
        notes,
      };

      const contract = await apiRequest<{ id: string }>('/contracts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const validLineItems = lineItems.filter((item) => item.description.trim());
      await Promise.all(
        validLineItems.map((item) => {
          const quantity = Number(item.quantity.replace(',', '.'));
          const unitPriceCents = Math.round(Number(item.unitPriceReais.replace(',', '.')) * 100);
          if (Number.isNaN(quantity) || quantity <= 0) {
            throw new Error('A quantidade dos itens deve ser positiva.');
          }
          if (Number.isNaN(unitPriceCents) || unitPriceCents < 0) {
            throw new Error('O valor dos itens deve ser válido.');
          }

          return apiRequest(`/contracts/${contract.id}/line-items`, {
            method: 'POST',
            body: JSON.stringify({
              description: item.description,
              itemType: item.itemType,
              quantity,
              unitPriceCents,
              recurring: item.recurring,
            }),
          });
        }),
      );

      router.push('/dashboard/contracts');
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar dados do contrato. Certifique-se de que os limites e restrições estão corretos.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasFinancialPrivilege) {
    return null;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Novo Contrato</h1>
        <p style={styles.subtitle}>Registre os termos operacionais e comerciais de um novo contrato recorrente ou de projeto.</p>
      </header>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Section 1: Basic Contract Metadata */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>1. Identificação Geral</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cliente *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={styles.select}
                required
                disabled={fetchingPicklists}
              >
                <option value="">Selecione o Cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.tradeName} ({c.legalName})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Título do Contrato *</label>
              <input
                type="text"
                placeholder="Ex: Suporte Técnico Mensal Acme - Nível Bronze"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Contrato</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select}>
                <option value="RECURRING_SUPPORT">Suporte Recorrente</option>
                <option value="PROJECT">Projeto Fechado</option>
                <option value="ON_DEMAND">Sob Demanda</option>
                <option value="HYBRID">Híbrido</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status Inicial</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
                <option value="DRAFT">Rascunho (Draft)</option>
                <option value="ACTIVE">Ativo (Active)</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroupFull}>
            <label style={styles.label}>Descrição do Escopo</label>
            <textarea
              rows={3}
              placeholder="Descreva detalhadamente o escopo do contrato..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Section 2: Financial Terms & Dates */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>2. Vigência e Faturamento</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Início *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Fim (Opcional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Modo de Renovação</label>
              <select value={renewalMode} onChange={(e) => setRenewalMode(e.target.value)} style={styles.select}>
                <option value="MONTHLY">Mensal Automático</option>
                <option value="ANNUAL">Anual Automático</option>
                <option value="NONE">Sem Renovação Automática</option>
                <option value="MANUAL">Renovação Manual</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Dia de Cobrança (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={(e) => setBillingDay(Number(e.target.value))}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Valor Mensal (R$)</label>
              <input
                type="text"
                placeholder="0.00"
                value={monthlyAmountReais}
                onChange={(e) => setMonthlyAmountReais(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Moeda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={styles.select}>
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Limits & Quotas */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>3. SLA & Limites Operacionais (Quotas)</h2>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Política de SLA Associada</label>
              <select
                value={slaPolicyId}
                onChange={(e) => setSlaPolicyId(e.target.value)}
                style={styles.select}
              >
                <option value="">Nenhuma (Usa prioridade padrão)</option>
                {slaPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.priority})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Limite Máximo de Usuários (maxUsers)</label>
              <input
                type="number"
                placeholder="Sem limites se em branco"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Limite Máximo de Ativos (maxAssets)</label>
              <input
                type="number"
                placeholder="Sem limites se em branco"
                value={maxAssets}
                onChange={(e) => setMaxAssets(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Chamados Remotos Inclusos/mês</label>
              <input
                type="number"
                placeholder="Ilimitados se em branco"
                value={includedRemoteTickets}
                onChange={(e) => setIncludedRemoteTickets(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Visitas Presenciais Inclusas/mês</label>
              <input
                type="number"
                placeholder="Sem visitas inclusas se em branco"
                value={includedOnsiteVisits}
                onChange={(e) => setIncludedOnsiteVisits(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Horas Remotas Inclusas/mÃªs</label>
              <input
                type="number"
                placeholder="Ilimitadas se em branco"
                value={includedRemoteHours}
                onChange={(e) => setIncludedRemoteHours(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Horas Presenciais Inclusas/mÃªs</label>
              <input
                type="number"
                placeholder="Sem horas presenciais se em branco"
                value={includedOnsiteHours}
                onChange={(e) => setIncludedOnsiteHours(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroupFull}>
            <label style={styles.label}>Observações Internas</label>
            <textarea
              rows={3}
              placeholder="Adicione observações comerciais, fiscais ou observações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
            />
          </div>
        </div>

        <div style={styles.formSection}>
          <div style={styles.sectionHeaderRow}>
            <h2 style={styles.sectionTitle}>4. Itens do Contrato</h2>
            <Button variant="outline" type="button" onClick={addLineItemDraft}>
              + Item
            </Button>
          </div>

          {lineItems.map((item, index) => (
            <div key={index} style={styles.lineItemRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>DescriÃ§Ã£o</label>
                <input
                  type="text"
                  placeholder="Ex: Suporte tÃ©cnico recorrente"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, { description: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo</label>
                <select
                  value={item.itemType}
                  onChange={(e) => updateLineItem(index, { itemType: e.target.value })}
                  style={styles.select}
                >
                  <option value="SERVICE">ServiÃ§o</option>
                  <option value="LICENSE">LicenÃ§a</option>
                  <option value="STORAGE">Storage</option>
                  <option value="SUPPORT">Suporte</option>
                  <option value="MONITORING">Monitoramento</option>
                  <option value="BACKUP">Backup</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Quantidade</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, { quantity: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>UnitÃ¡rio (R$)</label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={item.unitPriceReais}
                  onChange={(e) => updateLineItem(index, { unitPriceReais: e.target.value })}
                  style={styles.input}
                />
              </div>

              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={item.recurring}
                  onChange={(e) => updateLineItem(index, { recurring: e.target.checked })}
                />
                Recorrente
              </label>

              {lineItems.length > 1 && (
                <Button variant="outline" type="button" onClick={() => removeLineItemDraft(index)}>
                  Remover
                </Button>
              )}
            </div>
          ))}
        </div>

        <div style={styles.actionButtons}>
          <Button variant="outline" type="button" onClick={() => router.push('/dashboard/contracts')} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Contrato'}
          </Button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formSection: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#60a5fa',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '8px',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
  },
  lineItemRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 2fr) minmax(140px, 1fr) minmax(90px, 0.7fr) minmax(120px, 0.8fr) auto auto',
    gap: '12px',
    alignItems: 'end',
    padding: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formGroupFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#d1d5db',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#d1d5db',
    fontSize: '13px',
    paddingBottom: '10px',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  select: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
  },
};
