'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';
import { ticketCreateSchema } from '@peanut/validators';

export default function NewTicketPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Cascading client data states
  const [contacts, setContacts] = useState<any[]>([]);
  const [clientUsers, setClientUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  // Form Fields State
  const [clientId, setClientId] = useState('');
  const [contactId, setContactId] = useState('');
  const [clientUserId, setClientUserId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [channel, setChannel] = useState('EMAIL');
  const [category, setCategory] = useState('');
  const subcategory = '';

  const [loading, setLoading] = useState(false);
  const [fetchingCascades, setFetchingCascades] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial clients and internal technicians
  useEffect(() => {
    async function loadInitialData() {
      try {
        const clientsRes = await apiRequest('/clients?limit=100');
        setClients(clientsRes.data || []);
        
        const usersRes = await apiRequest('/users');
        setUsers(usersRes || []);
      } catch (err: any) {
        setError('Erro ao carregar dados iniciais do formulário.');
      }
    }
    loadInitialData();
  }, []);

  // Fetch cascading data whenever Client changes
  useEffect(() => {
    if (!clientId) {
      setContacts([]);
      setClientUsers([]);
      setAssets([]);
      setContactId('');
      setClientUserId('');
      setAssetId('');
      return;
    }

    async function loadCascadingData() {
      setFetchingCascades(true);
      try {
        const [contactsRes, usersRes, assetsRes] = await Promise.all([
          apiRequest(`/clients/${clientId}/contacts`),
          apiRequest(`/clients/${clientId}/users`),
          apiRequest(`/clients/${clientId}/assets?limit=100`),
        ]);

        setContacts(contactsRes || []);
        setClientUsers(usersRes || []);
        setAssets(assetsRes.data || []);
        
        // Auto-select primary contact if available
        const primary = (contactsRes || []).find((c: any) => c.isPrimary);
        if (primary) {
          setContactId(primary.id);
        } else if (contactsRes && contactsRes.length > 0) {
          setContactId(contactsRes[0].id);
        } else {
          setContactId('');
        }

        // Default resets
        setClientUserId('');
        setAssetId('');
      } catch (err: any) {
        console.error('Erro ao buscar dados do cliente selecionado:', err);
      } finally {
        setFetchingCascades(false);
      }
    }

    loadCascadingData();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      title,
      description,
      priority,
      channel,
      clientId,
      contactId: contactId || null,
      clientUserId: clientUserId || null,
      assetId: assetId || null,
      assignedToId: assignedToId || null,
      category: category || null,
      subcategory: subcategory || null,
    };

    // Zod Client validation
    const validation = ticketCreateSchema.safeParse(payload);
    if (!validation.success) {
      const messages = validation.error.errors.map((err) => err.message).join(', ');
      setError(messages);
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/dashboard/tickets/${response.id}`);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar chamado técnico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <h1 style={styles.title}>Novo Chamado Técnico</h1>
          <p style={styles.subtitle}>Registre um novo incidente ou requisição de suporte.</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/tickets')}>
          Voltar
        </Button>
      </header>

      {error && <div style={styles.errorAlert}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.formCard}>
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>1. Informações do Cliente</h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cliente *</label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                style={styles.select}
              >
                <option value="">Selecione o cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.tradeName || c.legalName}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Ponto de Contato</label>
              <select
                disabled={fetchingCascades || !clientId}
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                style={styles.select}
              >
                <option value="">Selecione o contato...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Usuário Final Afetado</label>
              <select
                disabled={fetchingCascades || !clientId}
                value={clientUserId}
                onChange={(e) => setClientUserId(e.target.value)}
                style={styles.select}
              >
                <option value="">Selecione o usuário final...</option>
                {clientUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.department || 'Sem setor'})</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Ativo Técnico Relacionado</label>
              <select
                disabled={fetchingCascades || !clientId}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                style={styles.select}
              >
                <option value="">Nenhum ativo (Sem ativo vinculado)</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type} - S/N: {a.serialNumber || 'N/A'})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>2. Detalhes do Chamado</h3>
          
          <div style={styles.formGroupFull}>
            <label style={styles.label}>Título do Chamado *</label>
            <input
              type="text"
              required
              placeholder="Ex: Notebook não conecta no Wi-Fi corporativo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroupFull}>
            <label style={styles.label}>Descrição Detalhada do Problema *</label>
            <textarea
              required
              rows={6}
              placeholder="Descreva detalhadamente o incidente, sintomas observados, etapas para reproduzir e mensagens de erro..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Prioridade (SLA) *</label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={styles.select}
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Canal de Entrada *</label>
              <select
                required
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                style={styles.select}
              >
                <option value="EMAIL">E-mail</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHONE">Telefone</option>
                <option value="PORTAL">Portal do Cliente</option>
                <option value="MANUAL">Abertura Manual</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Categoria</label>
              <input
                type="text"
                placeholder="Ex: Hardware, Software, Rede"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Técnico Responsável</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                style={styles.select}
              >
                <option value="">Não atribuído (Aguardando triagem)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => router.push('/dashboard/tickets')}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar Chamado'}
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
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleArea: {
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
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
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
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#3b82f6',
    marginBottom: '8px',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
    width: '100%',
  },
  label: {
    fontSize: '13px',
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
  select: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
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
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
  },
};
