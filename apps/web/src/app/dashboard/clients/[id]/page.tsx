'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clientContactSchema } from '@peanut/validators';
import { apiRequest } from '../../../../lib/api';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import Input from '../../../../components/ui/Input';
import Card from '../../../../components/ui/Card';
import Select from '../../../../components/ui/Select';
import ClientContextTabs from '../../../../components/layout/ClientContextTabs';
import ClientPageHeader from '../../../../components/layout/ClientPageHeader';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [slaPolicies, setSlaPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const isContactsTab = searchParams.get('tab') === 'contacts';

  const fetchClientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientData = await apiRequest(`/clients/${clientId}`);
      setClient(clientData);
      setContacts(clientData.contacts || []);
      const policies = await apiRequest('/tickets/sla-policies');
      setSlaPolicies(Array.isArray(policies) ? policies : policies.data || []);
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

  const handleClientSlaChange = async (slaPolicyId: string) => {
    try {
      const updated = await apiRequest(`/clients/${clientId}/sla-policy`, {
        method: 'PATCH',
        body: JSON.stringify({ slaPolicyId: slaPolicyId || null }),
      });
      setClient((prev: any) => ({
        ...prev,
        slaPolicyId: updated.slaPolicyId,
        slaPolicy: updated.slaPolicy,
      }));
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar SLA do cliente.');
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

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-sm text-on-surface-variant font-body-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/10 border-t-primary" />
        <p>{t.common.loading}</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center gap-md p-xl text-center">
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-md text-body-sm text-red-400">
          {error || 'Cliente não encontrado'}
        </div>
        <Button variant="primary" onClick={() => router.push('/dashboard/clients')}>
          {t.clients.actions.backToList}
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
  const clientName = client.tradeName || client.legalName || t.clients.title;
  const activeLabel = isContactsTab ? t.clients.tabs.contacts : t.clients.tabs.summary;
  const pageTitle = isContactsTab ? t.clients.pages.contactsTitle : t.clients.pages.summaryTitle;
  const pageDescription = (
    isContactsTab ? t.clients.pages.contactsDescription : t.clients.pages.summaryDescription
  ).replace('{name}', clientName);

  const breadcrumbs = [
    { label: t.clients.title, href: '/dashboard/clients' },
    { label: clientName, href: `/dashboard/clients/${clientId}` },
    { label: activeLabel },
  ];

  const statusControl = (
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
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
        <span className="material-symbols-outlined text-[16px]">expand_more</span>
      </div>
    </div>
  );

  const contactForm = showContactForm && (
    <form onSubmit={handleContactSubmit} className="mb-lg flex flex-col gap-md rounded-xl border border-outline-variant/60 bg-surface-container-low p-md animate-in fade-in duration-200">
      <h4 className="border-b border-outline-variant/30 pb-xs text-body-sm font-semibold text-on-surface">
        {editingContactId ? t.clients.contactForm.editTitle : t.clients.contactForm.newTitle}
      </h4>

      {contactError && (
        <div className="rounded bg-red-500/10 p-sm text-[12px] text-red-400 border border-red-500/20">
          {contactError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <Input
          label={t.clients.labels.contactName}
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
          disabled={contactSaving}
        />
        <Input
          label={t.clients.labels.contactEmail}
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
          disabled={contactSaving}
        />
        <Input
          label={t.clients.labels.contactPhone}
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          disabled={contactSaving}
        />
        <Input
          label={t.clients.labels.contactMobile}
          value={contactMobile}
          onChange={(e) => setContactMobile(e.target.value)}
          disabled={contactSaving}
        />
        <Input
          label={t.clients.labels.role}
          value={contactRole}
          onChange={(e) => setContactRole(e.target.value)}
          disabled={contactSaving}
        />
        <Input
          label={t.clients.labels.department}
          value={contactDept}
          onChange={(e) => setContactDept(e.target.value)}
          disabled={contactSaving}
        />
      </div>

      <div className="mt-xs flex items-center gap-sm">
        <input
          type="checkbox"
          id="isPrimary"
          checked={contactPrimary}
          onChange={(e) => setContactPrimary(e.target.checked)}
          disabled={contactSaving}
          className="h-4 w-4 rounded border-outline-variant bg-surface text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
        <label htmlFor="isPrimary" className="cursor-pointer select-none text-[12px] text-on-surface-variant">
          {t.clients.labels.contactPrimary}
        </label>
      </div>

      <div className="mt-xs flex justify-end gap-sm border-t border-outline-variant/30 pt-md">
        <Button type="button" variant="outline" onClick={resetContactForm} disabled={contactSaving} className="py-1 px-4 text-xs">
          {t.common.cancel}
        </Button>
        <Button type="submit" variant="primary" loading={contactSaving} className="py-1 px-4 text-xs">
          {editingContactId ? t.common.save : t.common.add}
        </Button>
      </div>
    </form>
  );

  const renderContactList = (compact = false) => {
    const visibleContacts = compact ? contacts.slice(0, 3) : contacts;

    if (contacts.length === 0) {
      return (
        <p className="py-lg text-center text-[13px] italic text-on-surface-variant/60">
          {t.clients.empty.contacts}
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-sm">
        {visibleContacts.map((contact) => (
          <div
            key={contact.id}
            className="group flex flex-col gap-md rounded-xl border border-outline-variant/30 bg-surface-container-low p-md transition-colors duration-150 hover:bg-surface-container md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-xs">
              <div className="flex flex-wrap items-center gap-sm">
                <span className="text-body-sm font-semibold text-on-surface">{contact.name}</span>
                {contact.isPrimary && <Badge variant="success">{t.clients.labels.primaryContact}</Badge>}
              </div>
              <div className="flex flex-wrap gap-xs text-[12px] text-on-surface-variant/80">
                {contact.role && <span>{contact.role} &bull;</span>}
                {contact.department && <span>{contact.department} &bull;</span>}
                <span className="font-mono break-all">{contact.email}</span>
                {(contact.phone || contact.mobile) && (
                  <span className="font-mono">&bull; Tel: {contact.phone || contact.mobile}</span>
                )}
              </div>
            </div>

            {!compact && (
              <div className="flex self-end gap-sm text-[12px] opacity-90 transition-opacity group-hover:opacity-100 md:self-center">
                <Button variant="ghost" onClick={() => handleEditContact(contact)} className="py-1 px-3 text-xs">
                  {t.common.edit}
                </Button>
                <Button variant="danger" onClick={() => handleDeleteContact(contact.id)} className="py-1 px-3 text-xs">
                  {t.common.delete}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-lg select-none">
      <ClientPageHeader
        breadcrumbs={breadcrumbs}
        title={pageTitle}
        description={pageDescription}
        status={<Badge variant={clientBadgeVariant}>{clientStatusLabel}</Badge>}
        secondaryActions={statusControl}
        tabs={<ClientContextTabs clientId={clientId} />}
      />

      {isContactsTab ? (
        <Card
          title={t.clients.contextSections.contactPoints}
          headerAction={
            !showContactForm && (
              <Button variant="secondary" onClick={() => setShowContactForm(true)} className="py-1">
                {t.clients.actions.newContact}
              </Button>
            )
          }
        >
          {contactForm}
          {renderContactList(false)}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
          <div className="flex flex-col gap-lg lg:col-span-8">
            <Card title={t.clients.contextSections.cadastralData}>
              <div className="grid grid-cols-1 gap-md text-[13px] text-on-surface md:grid-cols-3">
                <div className="flex flex-col gap-xs">
                  <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                    {t.clients.labels.document}
                  </span>
                  <span className="font-mono font-medium text-on-surface">{client.document || '--'}</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                    {t.clients.labels.commercialEmail}
                  </span>
                  <span className="truncate font-medium text-on-surface">{client.email || '--'}</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                    {t.clients.labels.commercialPhone}
                  </span>
                  <span className="font-mono font-medium text-on-surface">{client.phone || '--'}</span>
                </div>
                {client.website && (
                  <div className="mt-xs flex flex-col gap-xs border-t border-outline-variant/20 pt-sm md:col-span-3">
                    <span className="text-[10px] uppercase font-label-caps text-on-surface-variant opacity-60 tracking-wider">
                      {t.clients.labels.officialWebsite}
                    </span>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-medium text-primary hover:underline"
                    >
                      {client.website}
                    </a>
                  </div>
                )}
              </div>

              {client.notes && (
                <div className="mt-md flex flex-col gap-1 border-t border-outline-variant/30 pt-md">
                  <h4 className="text-body-sm font-semibold text-on-surface">{t.clients.contextSections.internalNotes}</h4>
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-on-surface-variant/80 font-body-sm">
                    {client.notes}
                  </p>
                </div>
              )}
            </Card>

            <Card
              title={t.clients.contextSections.contactPoints}
              headerAction={
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/dashboard/clients/${clientId}?tab=contacts`)}
                  className="py-1"
                >
                  {t.clients.tabs.contacts}
                </Button>
              }
            >
              {renderContactList(true)}
            </Card>
          </div>

          <div className="flex flex-col gap-lg lg:col-span-4">
            <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface p-lg shadow-xl shadow-black/25">
              <h4 className="text-sm font-semibold tracking-tight text-primary">SLA do cliente</h4>
              <p className="text-[12px] leading-relaxed text-on-surface-variant/80 font-body-sm">
                Usado quando não houver contrato ativo com SLA próprio.
              </p>
              <Select
                value={client.slaPolicyId || ''}
                onChange={(e) => handleClientSlaChange(e.target.value)}
                options={[
                  { value: '', label: 'Usar padrão da prioridade' },
                  ...slaPolicies.map((policy) => ({
                    value: policy.id,
                    label: `${policy.name} (${policy.priority})`,
                  })),
                ]}
              />
            </section>

            <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface p-lg shadow-xl shadow-black/25">
              <h4 className="text-sm font-semibold tracking-tight text-primary">{t.clients.shortcuts.inventoryTitle}</h4>
              <p className="text-[12px] leading-relaxed text-on-surface-variant/80 font-body-sm">
                {t.clients.shortcuts.inventoryDescription}
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)}
                className="mt-xs self-start py-1 px-4"
              >
                {t.clients.actions.viewInventory}
              </Button>
            </section>

            <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface p-lg shadow-xl shadow-black/25">
              <h4 className="text-sm font-semibold tracking-tight text-primary">{t.clients.shortcuts.ticketsTitle}</h4>
              <p className="text-[12px] leading-relaxed text-on-surface-variant/80 font-body-sm">
                {t.clients.shortcuts.ticketsDescription}
              </p>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/clients/${clientId}/tickets`)}
                className="mt-xs self-start py-1 px-4"
              >
                {t.clients.actions.viewTickets}
              </Button>
            </section>

            <section className="relative flex flex-col gap-sm rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest p-lg">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">lock</span>
                <h4 className="text-sm font-semibold text-on-surface-variant opacity-70">{t.clients.shortcuts.contractsTitle}</h4>
              </div>
              <p className="text-[12px] leading-relaxed text-on-surface-variant/50 font-body-sm">
                {t.clients.shortcuts.contractsDescription}
              </p>
              <span className="absolute right-lg top-lg rounded bg-secondary-container/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-on-secondary-container">
                {t.common.planned}
              </span>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
