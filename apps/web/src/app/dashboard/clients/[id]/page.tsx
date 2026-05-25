'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clientContactSchema } from '@peanut/validators';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Card from '../../../../components/ui/Card';
import ClientContextTabs from '../../../../components/layout/ClientContextTabs';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
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

  const activeTabParam = searchParams.get('tab');

  useEffect(() => {
    if (activeTabParam === 'contacts' && !loading) {
      setTimeout(() => {
        const element = document.getElementById('contacts');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    }
  }, [activeTabParam, loading]);

  const fetchClientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientData = await apiRequest(`/clients/${clientId}`);
      setClient(clientData);
      setContacts(clientData.contacts || []);
    } catch (err: any) {
      setError(err.message || t.states.errorTitle);
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
        await apiRequest(`/clients/${clientId}/contacts/${editingContactId}`, {
          method: 'PATCH',
          body: JSON.stringify(validation.data),
        });
      } else {
        await apiRequest(`/clients/${clientId}/contacts`, {
          method: 'POST',
          body: JSON.stringify(validation.data),
        });
      }

      resetContactForm();
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
    return (
      <div className="flex flex-col justify-center items-center min-h-[200px] gap-sm text-on-surface-variant font-body-sm">
        <div className="w-8 h-8 rounded-full border-3 border-primary/10 border-t-primary animate-spin" />
        <p>{t.common.loading}</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center p-xl text-center gap-md">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-md rounded-lg text-body-sm">
          {error || 'Cliente não encontrado'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/clients')}>
          Voltar para Lista
        </Button>
      </div>
    );
  }

  const clientBadgeVariant =
    client.status === 'ACTIVE'
      ? 'success'
      : client.status === 'PROSPECT'
      ? 'warning'
      : 'neutral';
  
  const clientStatusLabel =
    t.enums.clientStatus[client.status as keyof typeof t.enums.clientStatus] || client.status;

  return (
    <div className="flex flex-col gap-lg select-none select-text">
      
      {/* Dossie Breadcrumbs & Header */}
      <header className="flex flex-col gap-sm border-b border-outline-variant/30 pb-lg">
        <div className="flex items-center gap-md">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/clients')}
            className="py-1 px-3"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
            {t.common.back}
          </Button>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-md">
              <h2 className="font-display-lg text-2xl text-on-surface font-semibold tracking-tight">
                {client.tradeName}
              </h2>
              <Badge variant={clientBadgeVariant}>{clientStatusLabel}</Badge>
            </div>
            <span className="text-[12px] text-on-surface-variant font-mono">{client.legalName}</span>
          </div>

          <div className="relative">
            <select
              value={client.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded-lg px-4 py-1.5 text-body-sm text-on-surface outline-none cursor-pointer appearance-none pr-8 focus:border-primary"
            >
              <option value="ACTIVE">{t.enums.clientStatus.ACTIVE}</option>
              <option value="INACTIVE">{t.enums.clientStatus.INACTIVE}</option>
              <option value="PROSPECT">{t.enums.clientStatus.PROSPECT}</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </div>
          </div>
        </div>

        {/* Dossie Tabs Row */}
        <ClientContextTabs clientId={clientId} />
      </header>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mt-sm">
        
        {/* Left Column: Basic Details & Contacts */}
        <div className="lg:col-span-8 flex flex-col gap-lg">
          {/* Cadastral Details Card */}
          <Card title="Dados Cadastrais">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md text-[13px] text-on-surface">
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Documento (CNPJ/CPF)
                </span>
                <span className="font-mono font-medium text-on-surface">{client.document || '--'}</span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  E-mail Comercial
                </span>
                <span className="font-medium text-on-surface truncate">{client.email || '--'}</span>
              </div>
              <div className="flex flex-col gap-xs">
                <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                  Telefone Comercial
                </span>
                <span className="font-mono font-medium text-on-surface">{client.phone || '--'}</span>
              </div>
              {client.website && (
                <div className="flex flex-col gap-xs md:col-span-3 border-t border-outline-variant/20 pt-sm mt-xs">
                  <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                    Website Oficial
                  </span>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-medium break-all"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="border-t border-outline-variant/30 pt-md mt-md flex flex-col gap-1">
                <h4 className="text-body-sm font-semibold text-on-surface">Observações Internas</h4>
                <p className="text-[13px] text-on-surface-variant/80 leading-relaxed font-body-sm whitespace-pre-line">
                  {client.notes}
                </p>
              </div>
            )}
          </Card>

          {/* Contact Manager Card */}
          <div id="contacts" className="scroll-mt-6">
            <Card
              title="Contatos e Pontos Focais"
            headerAction={
              !showContactForm && (
                <Button variant="secondary" onClick={() => setShowContactForm(true)} className="py-1">
                  + Novo Contato
                </Button>
              )
            }
          >
            {showContactForm && (
              <form onSubmit={handleContactSubmit} className="mb-lg p-md bg-surface-container-low border border-outline-variant/60 rounded-xl flex flex-col gap-md animate-in fade-in duration-200">
                <h4 className="font-semibold text-body-sm text-on-surface border-b border-outline-variant/30 pb-xs">
                  {editingContactId ? 'Editar Contato' : 'Cadastrar Novo Contato'}
                </h4>
                
                {contactError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-sm rounded text-[12px]">
                    {contactError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <Input
                    label="Nome Completo *"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    disabled={contactSaving}
                  />

                  <Input
                    label="E-mail *"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                    disabled={contactSaving}
                  />

                  <Input
                    label="Telefone Fixo"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    disabled={contactSaving}
                  />

                  <Input
                    label="WhatsApp / Celular"
                    value={contactMobile}
                    onChange={(e) => setContactMobile(e.target.value)}
                    disabled={contactSaving}
                  />

                  <Input
                    label="Cargo"
                    placeholder="Ex: Diretor de TI"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    disabled={contactSaving}
                  />

                  <Input
                    label="Departamento"
                    placeholder="Ex: Tecnologia"
                    value={contactDept}
                    onChange={(e) => setContactDept(e.target.value)}
                    disabled={contactSaving}
                  />
                </div>

                <div className="flex items-center gap-sm mt-xs">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={contactPrimary}
                    onChange={(e) => setContactPrimary(e.target.checked)}
                    disabled={contactSaving}
                    className="w-4 h-4 rounded border-outline-variant bg-surface text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <label htmlFor="isPrimary" className="text-[12px] text-on-surface-variant cursor-pointer select-none">
                    Este é o contato principal (SLA & Notificações de chamados)
                  </label>
                </div>

                <div className="flex justify-end gap-sm border-t border-outline-variant/30 pt-md mt-xs">
                  <Button type="button" variant="outline" onClick={resetContactForm} disabled={contactSaving} className="py-1 px-4 text-xs">
                    {t.common.cancel}
                  </Button>
                  <Button type="submit" variant="primary" loading={contactSaving} className="py-1 px-4 text-xs">
                    {editingContactId ? t.common.save : 'Adicionar'}
                  </Button>
                </div>
              </form>
            )}

            {contacts.length === 0 ? (
              <p className="text-[13px] text-on-surface-variant/60 italic text-center py-lg">
                Nenhum contato cadastrado para este cliente.
              </p>
            ) : (
              <div className="flex flex-col gap-sm">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-md bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center gap-md hover:bg-surface-container transition-colors duration-150 group"
                  >
                    <div className="flex flex-col gap-xs">
                      <div className="flex items-center gap-sm">
                        <span className="font-semibold text-on-surface text-body-sm">{contact.name}</span>
                        {contact.isPrimary && <Badge variant="success">Principal</Badge>}
                      </div>
                      <div className="text-[12px] text-on-surface-variant/80 flex flex-wrap gap-xs">
                        {contact.role && <span>{contact.role} &bull; </span>}
                        {contact.department && <span>{contact.department} &bull; </span>}
                        <span className="font-mono">{contact.email}</span>
                        {(contact.phone || contact.mobile) && (
                          <span className="font-mono"> &bull; Tel: {contact.phone || contact.mobile}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-md text-[12px] self-end md:self-center opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="text-primary hover:underline font-medium"
                      >
                        {t.common.edit}
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-error hover:underline font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

        {/* Right Column: Tab Shortcuts & Phase 2 Modules */}
        <div className="lg:col-span-4 flex flex-col gap-lg">
          {/* Technical Inventory Shortcut */}
          <section className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col gap-sm shadow-xl shadow-black/25">
            <h4 className="font-semibold text-sm text-primary tracking-tight">Inventário Técnico</h4>
            <p className="text-[12px] text-on-surface-variant/80 leading-relaxed font-body-sm">
              Dispositivos, servidores, licenças e computadores cadastrados e vinculados.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)}
              className="py-1 px-4 self-start mt-xs"
            >
              Ver Inventário
            </Button>
          </section>

          {/* Tickets Shortcut */}
          <section className="bg-surface border border-outline-variant rounded-xl p-lg flex flex-col gap-sm shadow-xl shadow-black/25">
            <h4 className="font-semibold text-sm text-primary tracking-tight">Chamados & SLAs</h4>
            <p className="text-[12px] text-on-surface-variant/80 leading-relaxed font-body-sm">
              Histórico de suporte técnico e chamados de helpdesk em aberto.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/clients/${clientId}/tickets`)}
              className="py-1 px-4 self-start mt-xs"
            >
              Ver Chamados
            </Button>
          </section>

          {/* Planned Contracts / Finance Box */}
          <section className="bg-surface-container-lowest border border-outline-variant/40 border-dashed rounded-xl p-lg flex flex-col gap-sm relative">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">lock</span>
              <h4 className="font-semibold text-sm text-on-surface-variant opacity-70">Contratos & SLAs</h4>
            </div>
            <p className="text-[12px] text-on-surface-variant/50 leading-relaxed font-body-sm">
              Contratos ativos, termos de SLA, orçamentos e recorrência comercial.
            </p>
            <span className="absolute top-lg right-lg text-[9px] bg-secondary-container/20 text-on-secondary-container px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
              {t.common.planned}
            </span>
          </section>
        </div>

      </div>

    </div>
  );
}
