'use client';

import React, { useState } from 'react';
import { apiRequest } from '../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';
import { clientSchema } from '@peanut/validators';

export default function NewClientPage() {
  const router = useRouter();
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
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Novo Cliente</h1>
        <p style={styles.subtitle}>Insira as informações cadastrais básicas da empresa.</p>
      </header>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.formCard}>
        <div style={styles.grid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Razão Social *</label>
            <input
              type="text"
              placeholder="Razão Social completa"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nome Fantasia *</label>
            <input
              type="text"
              placeholder="Nome comercial do cliente"
              value={tradeName}
              onChange={(e) => setTradeName(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>CNPJ ou CPF (Apenas números) *</label>
            <input
              type="text"
              placeholder="12345678000199"
              value={documentVal}
              onChange={(e) => setDocumentVal(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>E-mail Principal *</label>
            <input
              type="email"
              placeholder="financeiro@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Telefone de Contato *</label>
            <input
              type="text"
              placeholder="1155550199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Website (Opcional)</label>
            <input
              type="text"
              placeholder="https://empresa.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={styles.input}
              disabled={loading}
            />
          </div>
        </div>

        <div style={styles.formGroupFull}>
          <label style={styles.label}>Observações Internas (Opcional)</label>
          <textarea
            rows={4}
            placeholder="Anotações comerciais, SLAs acordados ou observações de faturamento."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.textarea}
            disabled={loading}
          />
        </div>

        <div style={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/clients')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Cadastro'}
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
    maxWidth: '800px',
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
  formCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
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
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#d1d5db',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  textarea: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '20px',
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
