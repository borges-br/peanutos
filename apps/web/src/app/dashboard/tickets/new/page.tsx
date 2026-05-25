'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../lib/api';
import { extractArray } from '../../../../lib/api-shape';
import { useRouter } from 'next/navigation';
import { ticketCreateSchema } from '@peanut/validators';
import { useI18n } from '../../../../i18n/useI18n';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import ClientPageHeader from '../../../../components/layout/ClientPageHeader';

export default function NewTicketPage() {
  const router = useRouter();
  const { t } = useI18n();
  
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
  const [cascadeError, setCascadeError] = useState<string | null>(null);

  // Load initial clients and internal technicians
  useEffect(() => {
    async function loadInitialData() {
      try {
        const clientsRes = await apiRequest<unknown>('/clients?limit=100');
        setClients(extractArray(clientsRes));
        
        const usersRes = await apiRequest<unknown>('/users');
        setUsers(extractArray(usersRes));
      } catch (err: any) {
        setError(t.tickets.form.loadInitialError);
      }
    }
    loadInitialData();
  }, [t.tickets.form.loadInitialError]);

  // Fetch cascading data whenever Client changes
  useEffect(() => {
    if (!clientId) {
      setContacts([]);
      setClientUsers([]);
      setAssets([]);
      setContactId('');
      setClientUserId('');
      setAssetId('');
      setCascadeError(null);
      return;
    }

    async function loadCascadingData() {
      setFetchingCascades(true);
      setCascadeError(null);
      try {
        const [contactsRes, usersRes, assetsRes] = await Promise.all([
          apiRequest<unknown>(`/clients/${clientId}/contacts`),
          apiRequest<unknown>(`/clients/${clientId}/users`),
          apiRequest<unknown>(`/clients/${clientId}/assets?limit=100`),
        ]);

        const contactsData = extractArray<any>(contactsRes);
        const clientUsersData = extractArray<any>(usersRes);
        const assetsData = extractArray<any>(assetsRes);

        setContacts(contactsData);
        setClientUsers(clientUsersData);
        setAssets(assetsData);
        
        // Auto-select primary contact if available
        const primary = contactsData.find((c: any) => c.isPrimary);
        if (primary) {
          setContactId(primary.id);
        } else if (contactsData.length > 0) {
          setContactId(contactsData[0].id);
        } else {
          setContactId('');
        }

        // Default resets
        setClientUserId('');
        setAssetId('');
      } catch (err: any) {
        console.error('Erro ao buscar dados do cliente selecionado:', err);
        setCascadeError(t.tickets.form.loadClientError);
        setContacts([]);
        setClientUsers([]);
        setAssets([]);
        setContactId('');
        setClientUserId('');
        setAssetId('');
      } finally {
        setFetchingCascades(false);
      }
    }

    loadCascadingData();
  }, [clientId, t.tickets.form.loadClientError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError(t.tickets.form.clientRequired);
      return;
    }

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
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push(`/dashboard/tickets/${response.id}`);
    } catch (err: any) {
      setError(err.message || t.tickets.form.saveError);
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'LOW', label: t.enums.ticketPriority.LOW },
    { value: 'MEDIUM', label: t.enums.ticketPriority.MEDIUM },
    { value: 'HIGH', label: t.enums.ticketPriority.HIGH },
    { value: 'URGENT', label: t.enums.ticketPriority.URGENT },
    { value: 'CRITICAL', label: t.enums.ticketPriority.CRITICAL }
  ];

  const channelOptions = [
    { value: 'EMAIL', label: t.tickets.channels.EMAIL },
    { value: 'WHATSAPP', label: t.tickets.channels.WHATSAPP },
    { value: 'PHONE', label: t.tickets.channels.PHONE },
    { value: 'PORTAL', label: t.tickets.channels.PORTAL },
    { value: 'MANUAL', label: t.tickets.channels.MANUAL },
    { value: 'OTHER', label: t.tickets.channels.OTHER }
  ];

  const clientOptions = [
    { value: '', label: t.tickets.form.selectClient },
    ...clients.map(c => ({ value: c.id, label: c.tradeName || c.legalName }))
  ];

  const contactOptions = [
    {
      value: '',
      label: !clientId
        ? t.tickets.form.selectClientFirst
        : fetchingCascades
        ? t.tickets.form.loadingContacts
        : contacts.length === 0
        ? t.tickets.form.noContacts
        : t.tickets.form.selectContact,
    },
    ...contacts.map(c => ({ value: c.id, label: `${c.name} (${c.email || '--'})` }))
  ];

  const clientUserOptions = [
    {
      value: '',
      label: !clientId
        ? t.tickets.form.selectClientFirst
        : fetchingCascades
        ? t.tickets.form.loadingUsers
        : clientUsers.length === 0
        ? t.tickets.form.noUsers
        : t.tickets.form.selectUser,
    },
    ...clientUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.department || t.tickets.form.noDepartment})` }))
  ];

  const assetOptions = [
    {
      value: '',
      label: !clientId
        ? t.tickets.form.selectClientFirst
        : fetchingCascades
        ? t.tickets.form.loadingAssets
        : assets.length === 0
        ? t.tickets.form.noAssets
        : t.tickets.assetNone,
    },
    ...assets.map(a => ({ value: a.id, label: `${a.name} (${t.enums.assetType[a.type as keyof typeof t.enums.assetType] || a.type} - S/N: ${a.serialNumber || '--'})` }))
  ];

  const technicianOptions = [
    { value: '', label: t.tickets.form.noAssignedTech },
    ...users.map(u => ({ value: u.id, label: u.name }))
  ];

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto select-none">
      <ClientPageHeader
        breadcrumbs={[
          { label: t.navigation.home, href: '/dashboard' },
          { label: t.navigation.tickets, href: '/dashboard/tickets' },
          { label: t.tickets.newTicket },
        ]}
        title={t.tickets.newTicket}
        description={t.tickets.newTicketSubtitle}
        secondaryActions={
          <Button variant="outline" onClick={() => router.push('/dashboard/tickets')}>
            <span className="material-symbols-outlined text-[16px] mr-1.5">arrow_back</span>
            {t.common.back}
          </Button>
        }
      />

      {error && (
        <div className="bg-error-container/10 border border-error-container/20 text-error p-md rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {cascadeError && (
        <div className="bg-error-container/10 border border-error-container/20 text-error p-md rounded-xl text-xs font-semibold">
          {cascadeError}
        </div>
      )}

      {fetchingCascades && (
        <div className="bg-surface-container-low border border-outline-variant/40 text-on-surface-variant p-md rounded-xl text-xs font-semibold">
          {t.tickets.form.loadingClientData}
        </div>
      )}

      {/* Creation form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg bg-surface border border-outline-variant p-lg rounded-xl shadow-lg">
        {/* Section 1: Client Info */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            1. {t.tickets.form.clientSection}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.clientLabel} *</label>
              <Select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={clientOptions}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.contactLabel}</label>
              <Select
                disabled={fetchingCascades || !clientId}
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                options={contactOptions}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.clientUserLabel}</label>
              <Select
                disabled={fetchingCascades || !clientId}
                value={clientUserId}
                onChange={(e) => setClientUserId(e.target.value)}
                options={clientUserOptions}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.assetLabel}</label>
              <Select
                disabled={fetchingCascades || !clientId}
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                options={assetOptions}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Ticket Details */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            2. {t.tickets.form.detailsSection}
          </h3>

          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.form.titleLabel}</label>
            <Input
              type="text"
              required
              placeholder={t.tickets.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.form.descriptionLabel}</label>
            <textarea
              required
              rows={6}
              placeholder={t.tickets.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface-container-low border border-outline-variant focus:border-primary/50 text-on-surface rounded-xl p-md text-sm outline-none resize-none font-body transition-colors focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.priority} (SLA) *</label>
              <Select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={priorityOptions}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.channelLabel}</label>
              <Select
                required
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                options={channelOptions}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.categoryLabel}</label>
              <Input
                type="text"
                placeholder={t.tickets.categoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Responsibility */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider font-label-caps border-b border-outline-variant/30 pb-2">
            3. {t.tickets.form.responsibilitySection}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-[13px] font-semibold text-on-surface-variant">{t.tickets.form.assignedTo}</label>
              <Select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                options={technicianOptions}
              />
            </div>
          </div>
        </div>

        {/* Actions buttons */}
        <div className="flex justify-end gap-sm border-t border-outline-variant/30 pt-lg mt-md">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => router.push('/dashboard/tickets')}
            className="px-5"
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="px-6">
            {loading ? t.common.saving : t.tickets.saveBtn}
          </Button>
        </div>
      </form>
    </div>
  );
}
