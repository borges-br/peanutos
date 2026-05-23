'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { Button } from '@peanut/ui';
import { useParams, useRouter } from 'next/navigation';
import { clientContactSchema } from '@peanut/validators';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contacts Form State
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMobile, setContactMobile] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactDept, setContactDept] = useState('');
  const [contactPrimary, setContactPrimary] = useState(false);
  const [contactNotes, setContactNotes] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSaving, setContactSaving] = useState(false);

  const fetchClientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientData = await apiRequest(`/clients/${clientId}`);
      setClient(clientData);
      setContacts(clientData.contacts || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados do cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await apiRequest(`/clients/${clientId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setClient((prev: any) => ({ ...prev, status: updated.status }));
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar status.');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSaving(true);

    const payload = {
      name: contactName,
      email: contactEmail,
      phone: contactPhone || undefined,
      mobile: contactMobile || undefined,
      role: contactRole || undefined,
      department: contactDept || undefined,
      isPrimary: contactPrimary,
      notes: contactNotes || undefined,
    };

    const validation = clientContactSchema.safeParse(payload);
    if (!validation.success) {
      setContactError(validation.error.errors.map(e => e.message).join(', '));
      setContactSaving(false);
      return;
    }

    try {
      if (editingContactId) {
        // Update contact
        await apiRequest(`/clients/${clientId}/contacts/${editingContactId}`, {
          method: 'PATCH',
          body: JSON.stringify(validation.data),
        });
      } else {
        // Create contact
        await apiRequest(`/clients/${clientId}/contacts`, {
          method: 'POST',
          body: JSON.stringify(validation.data),
        });
      }

      // Reset Form
      resetContactForm();
      // Reload Data
      const freshContacts = await apiRequest(`/clients/${clientId}/contacts`);
      setContacts(freshContacts);
    } catch (err: any) {
      setContactError(err.message || 'Erro ao salvar contato.');
    } finally {
      setContactSaving(false);
    }
  };

  const handleEditContact = (contact: any) => {
    setEditingContactId(contact.id);
    setContactName(contact.name);
    setContactEmail(contact.email);
    setContactPhone(contact.phone || '');
    setContactMobile(contact.mobile || '');
    setContactRole(contact.role || '');
    setContactDept(contact.department || '');
    setContactPrimary(contact.isPrimary);
    setContactNotes(contact.notes || '');
    setContactError(null);
    setShowContactForm(true);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Deseja realmente excluir este contato?')) return;
    try {
      await apiRequest(`/clients/${clientId}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      const freshContacts = await apiRequest(`/clients/${clientId}/contacts`);
      setContacts(freshContacts);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir contato.');
    }
  };

  const resetContactForm = () => {
    setShowContactForm(false);
    setEditingContactId(null);
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactMobile('');
    setContactRole('');
    setContactDept('');
    setContactPrimary(false);
    setContactNotes('');
    setContactError(null);
  };

  if (loading) {
    return <div style={styles.loading}>Carregando dados do cliente...</div>;
  }

  if (error || !client) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorAlert}>{error || 'Cliente não encontrado'}</div>
        <Button variant="primary" onClick={() => router.push('/dashboard/clients')}>
          Voltar para Lista
        </Button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Button variant="outline" onClick={() => router.push('/dashboard/clients')} style={styles.backBtn}>
          &larr; Voltar
        </Button>
        <div style={styles.titleArea}>
          <h1 style={styles.title}>{client.tradeName}</h1>
          <span style={styles.legalName}>{client.legalName}</span>
        </div>
        
        {/* Status Actions */}
        <div style={styles.statusActions}>
          <select
            value={client.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={styles.statusSelect}
          >
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="PROSPECT">Prospecto</option>
          </select>
        </div>
      </header>

      {/* Main Grid */}
      <div style={styles.layoutGrid}>
        {/* Left Column: Details & Contacts */}
        <div style={styles.leftCol}>
          {/* Company Details */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Dados Cadastrais</h2>
            <div style={styles.detailsList}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Documento (CNPJ/CPF)</span>
                <span style={styles.detailValue}>{client.document}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>E-mail Comercial</span>
                <span style={styles.detailValue}>{client.email}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Telefone Comercial</span>
                <span style={styles.detailValue}>{client.phone}</span>
              </div>
              {client.website && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Website</span>
                  <a href={client.website} target="_blank" rel="noreferrer" style={styles.detailLink}>
                    {client.website}
                  </a>
                </div>
              )}
            </div>
            {client.notes && (
              <div style={styles.notesSection}>
                <h3 style={styles.notesTitle}>Observações</h3>
                <p style={styles.notesText}>{client.notes}</p>
              </div>
            )}
          </section>

          {/* Contacts CRUD */}
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Contatos</h2>
              {!showContactForm && (
                <Button variant="secondary" onClick={() => setShowContactForm(true)}>
                  + Novo Contato
                </Button>
              )}
            </div>

            {showContactForm && (
              <form onSubmit={handleContactSubmit} style={styles.contactForm}>
                <h3 style={styles.formTitle}>
                  {editingContactId ? 'Editar Contato' : 'Cadastrar Novo Contato'}
                </h3>
                {contactError && <div style={styles.formError}>{contactError}</div>}

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Nome Completo *</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={styles.input}
                      required
                      disabled={contactSaving}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>E-mail *</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      style={styles.input}
                      required
                      disabled={contactSaving}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Telefone Fixo</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      style={styles.input}
                      disabled={contactSaving}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>WhatsApp / Celular</label>
                    <input
                      type="text"
                      value={contactMobile}
                      onChange={(e) => setContactMobile(e.target.value)}
                      style={styles.input}
                      disabled={contactSaving}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Cargo</label>
                    <input
                      type="text"
                      placeholder="Ex: Diretor de TI"
                      value={contactRole}
                      onChange={(e) => setContactRole(e.target.value)}
                      style={styles.input}
                      disabled={contactSaving}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Departamento</label>
                    <input
                      type="text"
                      placeholder="Ex: Tecnologia"
                      value={contactDept}
                      onChange={(e) => setContactDept(e.target.value)}
                      style={styles.input}
                      disabled={contactSaving}
                    />
                  </div>
                </div>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={contactPrimary}
                    onChange={(e) => setContactPrimary(e.target.checked)}
                    disabled={contactSaving}
                  />
                  <label htmlFor="isPrimary" style={styles.checkboxLabel}>
                    Este é o contato principal (SLA & Notificações de chamados)
                  </label>
                </div>

                <div style={styles.formActions}>
                  <Button type="button" variant="outline" onClick={resetContactForm} disabled={contactSaving}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" disabled={contactSaving}>
                    {contactSaving ? 'Salvando...' : 'Salvar Contato'}
                  </Button>
                </div>
              </form>
            )}

            {contacts.length === 0 ? (
              <div style={styles.emptyContacts}>Nenhum contato cadastrado para este cliente.</div>
            ) : (
              <div style={styles.contactsList}>
                {contacts.map((contact) => (
                  <div key={contact.id} style={styles.contactItem}>
                    <div style={styles.contactHeader}>
                      <div style={styles.contactMeta}>
                        <span style={styles.contactName}>{contact.name}</span>
                        {contact.isPrimary && <span style={styles.primaryBadge}>Principal</span>}
                      </div>
                      <div style={styles.contactActions}>
                        <span onClick={() => handleEditContact(contact)} style={styles.actionLink}>
                          Editar
                        </span>
                        <span onClick={() => handleDeleteContact(contact.id)} style={styles.deleteLink}>
                          Excluir
                        </span>
                      </div>
                    </div>

                    <div style={styles.contactSub}>
                      {contact.role && <span>{contact.role} &bull; </span>}
                      {contact.department && <span>{contact.department} &bull; </span>}
                      <span>{contact.email}</span>
                      {(contact.phone || contact.mobile) && (
                        <span> &bull; Tel: {contact.phone || contact.mobile}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Placeholders for Phase 2 */}
        <div style={styles.rightCol}>
          <section style={styles.cardPlaceholder}>
            <h2 style={styles.placeholderTitle}>Inventário (Fase 2)</h2>
            <p style={styles.placeholderText}>Dispositivos, servidores, licenças e computadores cadastrados.</p>
            <div style={styles.placeholderBadge}>Em Breve</div>
          </section>

          <section style={styles.cardPlaceholder}>
            <h2 style={styles.placeholderTitle}>Chamados (Fase 2)</h2>
            <p style={styles.placeholderText}>Histórico de suporte técnico e chamados em aberto.</p>
            <div style={styles.placeholderBadge}>Em Breve</div>
          </section>

          <section style={styles.cardPlaceholder}>
            <h2 style={styles.placeholderTitle}>Faturas & SLAs (Fase 2)</h2>
            <p style={styles.placeholderText}>Contratos ativos, orçamentos emitidos e SLAs acordados.</p>
            <div style={styles.placeholderBadge}>Em Breve</div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '24px',
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  legalName: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  statusActions: {
    display: 'flex',
    gap: '12px',
  },
  statusSelect: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '7fr 5fr',
    gap: '32px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#f9fafb',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: '14px',
    color: '#f9fafb',
  },
  detailLink: {
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
  },
  notesSection: {
    marginTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  notesTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#d1d5db',
  },
  notesText: {
    fontSize: '13px',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
  emptyContacts: {
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center',
    padding: '24px 0',
  },
  contactsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  contactItem: {
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  contactName: {
    fontWeight: 600,
    fontSize: '14px',
  },
  primaryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  contactActions: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
  },
  actionLink: {
    color: '#3b82f6',
    cursor: 'pointer',
  },
  deleteLink: {
    color: '#f87171',
    cursor: 'pointer',
  },
  contactSub: {
    fontSize: '12px',
    color: '#9ca3af',
    lineHeight: 1.4,
  },
  cardPlaceholder: {
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  placeholderTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#9ca3af',
  },
  placeholderText: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
  },
  placeholderBadge: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    color: '#9ca3af',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '40px 24px',
  },
  contactForm: {
    padding: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '16px',
  },
  formTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f9fafb',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '8px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  formLabel: {
    fontSize: '11px',
    color: '#d1d5db',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#f9fafb',
    outline: 'none',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkboxLabel: {
    fontSize: '12px',
    color: '#9ca3af',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '12px',
  },
  formError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '12px',
  },
};
