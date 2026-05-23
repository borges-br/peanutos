'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../lib/api';
import { Button } from '@peanut/ui';
import { useParams, useRouter } from 'next/navigation';

export default function ClientUsersPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  
  // Search & filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchClientDetails = async () => {
    try {
      const response = await apiRequest(`/clients/${clientId}`);
      setClient(response);
    } catch (err) {
      console.error('Falha ao buscar detalhes do cliente', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = status ? `&status=${status}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      
      const response = await apiRequest(
        `/clients/${clientId}/users?page=${page}&limit=10${statusParam}${searchParam}`
      );
      setUsers(response.data || []);
      setMeta(response.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar usuários do cliente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
    fetchUsers();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setJobTitle('');
    setFormStatus('ACTIVE');
    setNotes('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (user: any) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFullName(user.fullName);
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setJobTitle(user.jobTitle || '');
    setFormStatus(user.status);
    setNotes(user.notes || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    // Basic Validation
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Nome completo é obrigatório (mínimo 2 caracteres)');
      setFormSubmitting(false);
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('E-mail inválido');
      setFormSubmitting(false);
      return;
    }

    const payload = {
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      department: department || undefined,
      jobTitle: jobTitle || undefined,
      status: formStatus,
      notes: notes || undefined,
    };

    try {
      if (isEditing && editingUserId) {
        await apiRequest(`/clients/${clientId}/users/${editingUserId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/clients/${clientId}/users`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar usuário do cliente.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/clients/${clientId}/users/${user.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar status do usuário.');
    }
  };

  const clientUserStatuses = [
    { value: 'ACTIVE', label: 'Ativo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { value: 'INACTIVE', label: 'Inativo', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    { value: 'ON_LEAVE', label: 'Licença', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { value: 'TERMINATED', label: 'Desligado', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
    { value: 'PENDING_REVIEW', label: 'Pendente Revisão', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.1)' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <div style={styles.breadcrumbs}>
            <span onClick={() => router.push('/dashboard/clients')} style={styles.breadcrumbLink}>Clientes</span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} style={styles.breadcrumbLink}>
              {client?.tradeName || 'Detalhes'}
            </span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span style={{ color: '#9ca3af' }}>Usuários Finais</span>
          </div>
          <h1 style={styles.title}>Usuários Finais</h1>
          <p style={styles.subtitle}>
            Organize e vincule os usuários finais de <strong>{client?.tradeName || '...'}</strong> aos seus equipamentos.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          + Novo Usuário Final
        </Button>
      </header>

      {/* Navigation tabs */}
      <div style={styles.tabsRow}>
        <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} style={styles.tab}>Geral / Contatos</span>
        <span onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)} style={styles.tab}>Inventário</span>
        <span style={{ ...styles.tab, ...styles.activeTab }}>Usuários Finais</span>
      </div>

      {/* Filters & Search */}
      <div style={styles.filtersBar}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, departamento ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <Button type="submit" variant="secondary" style={styles.searchBtn}>
            Buscar
          </Button>
        </form>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={styles.filterSelect}
        >
          <option value="">Todos os status</option>
          {clientUserStatuses.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {error && <div style={styles.errorAlert}>{error}</div>}

      {/* Table */}
      {loading ? (
        <div style={styles.loadingArea}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.skeletonRow} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Nenhum usuário final cadastrado ou encontrado para este cliente.</p>
          <Button variant="outline" onClick={openCreateModal}>
            Cadastrar primeiro usuário
          </Button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Nome Completo / Cargo</th>
                <th style={styles.th}>E-mail / Telefone</th>
                <th style={styles.th}>Departamento</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Ativos Vinculados</th>
                <th style={styles.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const statusObj = clientUserStatuses.find(s => s.value === user.status);

                return (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userNames}>
                        <span style={styles.userName}>{user.fullName}</span>
                        {user.jobTitle && <span style={styles.jobTitleText}>{user.jobTitle}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.userContact}>
                        <span>{user.email || 'Sem e-mail'}</span>
                        {user.phone && <span style={styles.phoneText}>{user.phone}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: '#d1d5db' }}>{user.department || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span
                        onClick={() => handleToggleStatus(user)}
                        title="Clique para alternar rápido Ativo/Inativo"
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusObj?.bg || 'rgba(255, 255, 255, 0.05)',
                          color: statusObj?.color || '#f9fafb',
                          borderColor: statusObj?.bg || 'transparent',
                        }}
                      >
                        {statusObj?.label || user.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.assetsCountBadge}>
                        {user.assetsCount} ativo(s)
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <Button variant="outline" onClick={() => openEditModal(user)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Mostrando {users.length} de {meta.total} usuários (Pág. {meta.page} de {meta.totalPages})
            </span>
            <div style={styles.paginationBtns}>
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={styles.pageBtn}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={styles.pageBtn}
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Creating / Editing Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {isEditing ? 'Editar Usuário Final' : 'Novo Usuário Final'}
              </h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
            </div>
            
            <form onSubmit={handleFormSubmit} style={styles.modalForm}>
              {formError && <div style={styles.errorAlert}>{formError}</div>}

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Souza"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>E-mail</label>
                  <input
                    type="email"
                    placeholder="Ex: maria.souza@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Telefone</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98888-8888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Departamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Financeiro"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cargo / Função</label>
                  <input
                    type="text"
                    placeholder="Ex: Analista Fiscal"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={styles.select}
                  >
                    {clientUserStatuses.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Observações Internas</label>
                <textarea
                  placeholder="Informações adicionais como horários de acesso específicos, quotas, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.modalActions}>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
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
  breadcrumbs: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '4px',
  },
  breadcrumbLink: {
    cursor: 'pointer',
    color: '#3b82f6',
    transition: 'color 0.2s',
    fontWeight: 500,
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
  tabsRow: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '2px',
  },
  tab: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#9ca3af',
    cursor: 'pointer',
    borderRadius: '6px 6px 0 0',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderBottom: '2px solid #3b82f6',
    fontWeight: 600,
  },
  filtersBar: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    flexGrow: 1,
    maxWidth: '600px',
  },
  searchInput: {
    flexGrow: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 16px',
    fontSize: '14px',
  },
  filterSelect: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  th: {
    padding: '16px 24px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#d1d5db',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    transition: 'all 0.2s',
  },
  td: {
    padding: '16px 24px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  userNames: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontWeight: 600,
    color: '#f9fafb',
  },
  jobTitleText: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  userContact: {
    display: 'flex',
    flexDirection: 'column',
  },
  phoneText: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
    display: 'inline-block',
    cursor: 'pointer',
  },
  assetsCountBadge: {
    fontSize: '12px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#60a5fa',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '3px 8px',
    borderRadius: '6px',
    fontWeight: 500,
  },
  actionBtns: {
    display: 'flex',
    gap: '8px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  paginationBtns: {
    display: 'flex',
    gap: '8px',
  },
  pageBtn: {
    padding: '6px 12px',
    fontSize: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    gap: '16px',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '15px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonRow: {
    height: '60px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '650px',
    padding: '32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f9fafb',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '28px',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flexGrow: 1,
    width: '50%',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
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
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
};
