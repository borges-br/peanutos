'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../../../../../lib/api';
import { Button } from '@peanut/ui';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../../context/AuthContext';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const clientId = params.id as string;
  const assetId = params.assetId as string;

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [noteContent, setNoteContent] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('INTERNAL');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Reveal secrets state
  const [revealedSecrets, setRevealedSecrets] = useState<any>(null);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [showSecretsModal, setShowSecretsModal] = useState(false);

  const fetchAssetDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/clients/${clientId}/assets/${assetId}`);
      setAsset(response);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar detalhes do ativo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetDetails();
    
    // Cleanup secrets on unmount to prevent leaks
    return () => {
      setRevealedSecrets(null);
    };
  }, [clientId, assetId]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setNoteSubmitting(true);
    setNoteError(null);

    // Basic password rejection
    const lowerContent = noteContent.toLowerCase();
    const blockedKeywords = ['senha', 'password', 'token', 'secret', 'api_key', 'apikey'];
    if (blockedKeywords.some(kw => lowerContent.includes(kw))) {
      setNoteError('Por segurança, notas não devem conter credenciais em texto puro. Por favor, use o campo de dados sensíveis criptografados.');
      setNoteSubmitting(false);
      return;
    }

    try {
      await apiRequest(`/clients/${clientId}/assets/${assetId}/notes`, {
        method: 'POST',
        body: JSON.stringify({
          content: noteContent,
          visibility: noteVisibility,
        }),
      });
      setNoteContent('');
      fetchAssetDetails(); // Refresh to show new note
    } catch (err: any) {
      setNoteError(err.message || 'Falha ao adicionar nota.');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleRevealSecrets = async () => {
    // RBAC Guard
    if (!user || !['OWNER', 'ADMIN', 'TECHNICIAN'].includes(user.role)) {
      alert('Você não tem permissão para visualizar dados confidenciais.');
      return;
    }

    setRevealing(true);
    setRevealError(null);
    try {
      const response = await apiRequest(`/clients/${clientId}/assets/${assetId}/reveal-sensitive-data`, {
        method: 'POST',
      });
      setRevealedSecrets(response.sensitiveData);
      setShowSecretsModal(true);
    } catch (err: any) {
      setRevealError(err.message || 'Falha ao descriptografar dados sensíveis.');
    } finally {
      setRevealing(false);
    }
  };

  const handleCloseSecrets = () => {
    setRevealedSecrets(null);
    setShowSecretsModal(false);
  };

  const assetTypes = [
    { value: 'WORKSTATION', label: 'Estação de Trabalho' },
    { value: 'NOTEBOOK', label: 'Notebook' },
    { value: 'SERVER', label: 'Servidor' },
    { value: 'PRINTER', label: 'Impressora' },
    { value: 'ROUTER', label: 'Roteador' },
    { value: 'SWITCH', label: 'Switch' },
    { value: 'ACCESS_POINT', label: 'Access Point' },
    { value: 'FIREWALL', label: 'Firewall' },
    { value: 'CAMERA', label: 'Câmera IP' },
    { value: 'NVR', label: 'NVR / DVR' },
    { value: 'UPS', label: 'Nobreak (UPS)' },
    { value: 'RACK', label: 'Rack' },
    { value: 'NAS', label: 'Storage NAS' },
    { value: 'MOBILE_DEVICE', label: 'Dispositivo Móvel' },
    { value: 'VIRTUAL_MACHINE', label: 'Máquina Virtual' },
    { value: 'CLOUD_SERVICE', label: 'Serviço em Nuvem' },
    { value: 'LICENSE', label: 'Licença Geral' },
    { value: 'SOFTWARE_LICENSE', label: 'Licença de Software' },
    { value: 'VPN', label: 'Túnel VPN' },
    { value: 'STORAGE', label: 'Armazenamento' },
    { value: 'OTHER', label: 'Outro' },
  ];

  const assetStatuses = [
    { value: 'OPERATIONAL', label: 'Operacional', color: '#34d399', bg: 'rgba(16, 185, 129, 0.1)' },
    { value: 'MAINTENANCE', label: 'Em Manutenção', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)' },
    { value: 'OUT_OF_STANDARD', label: 'Fora de Padrão', color: '#f87171', bg: 'rgba(239, 68, 68, 0.1)' },
    { value: 'STOCK', label: 'Em Estoque', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.1)' },
    { value: 'IN_STOCK', label: 'Em Estoque (Novo)', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
    { value: 'RETIRED', label: 'Aposentado', color: '#9ca3af', bg: 'rgba(107, 114, 128, 0.1)' },
    { value: 'SCRAPPED', label: 'Sucateado', color: '#f87171', bg: 'rgba(220, 38, 38, 0.1)' },
    { value: 'LOST', label: 'Extraviado', color: '#a78bfa', bg: 'rgba(124, 58, 237, 0.1)' },
    { value: 'PENDING_VALIDATION', label: 'Pendente Homologação', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)' },
    { value: 'PENDING_REVIEW', label: 'Em Revisão', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.1)' },
  ];

  if (loading) {
    return (
      <div style={styles.loadingArea}>
        <div style={styles.spinner} />
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>Carregando detalhes do ativo...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div style={styles.container}>
        <div style={styles.errorAlert}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Ocorreu um erro</h2>
          <p style={{ marginTop: '8px' }}>{error || 'Não foi possível carregar as informações do ativo.'}</p>
          <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)} style={{ marginTop: '16px' }}>
            Voltar para o Inventário
          </Button>
        </div>
      </div>
    );
  }

  const typeObj = assetTypes.find(t => t.value === asset.type);
  const statusObj = assetStatuses.find(s => s.value === asset.status);
  const isPrivilegedUser = user && ['OWNER', 'ADMIN', 'TECHNICIAN'].includes(user.role);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerTitleArea}>
          <div style={styles.breadcrumbs}>
            <span onClick={() => router.push('/dashboard/clients')} style={styles.breadcrumbLink}>Clientes</span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}`)} style={styles.breadcrumbLink}>
              {asset.client?.tradeName || 'Detalhes'}
            </span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)} style={styles.breadcrumbLink}>
              Inventário
            </span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span style={{ color: '#9ca3af' }}>{asset.name}</span>
          </div>
          <div style={styles.headerTitleRow}>
            <h1 style={styles.title}>{asset.name}</h1>
            <span
              style={{
                ...styles.statusBadge,
                backgroundColor: statusObj?.bg || 'rgba(255, 255, 255, 0.05)',
                color: statusObj?.color || '#f9fafb',
                borderColor: statusObj?.bg || 'transparent',
              }}
            >
              {statusObj?.label || asset.status}
            </span>
          </div>
          <p style={styles.subtitle}>
            Especificações completas, chaves criptografadas confidenciais, notas internas e logs de histórico.
          </p>
        </div>

        <div style={styles.headerActions}>
          {isPrivilegedUser && asset.sensitiveDataEncrypted && (
            <Button
              variant="secondary"
              onClick={handleRevealSecrets}
              disabled={revealing}
              style={styles.revealBtn}
            >
              {revealing ? 'Descriptografando...' : '🔓 Revelar Credenciais Confidenciais'}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}/inventory`)}>
            Voltar ao Inventário
          </Button>
        </div>
      </header>

      {revealError && <div style={{ ...styles.errorAlert, marginBottom: '0' }}>{revealError}</div>}

      {/* Grid Layout */}
      <div style={styles.grid}>
        
        {/* Left Column: Tech Details & Notes */}
        <div style={styles.leftCol}>
          
          {/* Tech Specs Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Especificações Técnicas</h2>
            <div style={styles.specsGrid}>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Hostname</span>
                <span style={styles.specValue}>{asset.hostname || 'Não configurado'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Tipo de Ativo</span>
                <span style={styles.specValue}>{typeObj?.label || asset.type}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Fabricante / Marca</span>
                <span style={styles.specValue}>{asset.manufacturer || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Modelo</span>
                <span style={styles.specValue}>{asset.model || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Número de Série</span>
                <span style={styles.specValue}>{asset.serialNumber || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Patrimônio / Asset Tag</span>
                <span style={styles.specValue}>{asset.assetTag || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Endereço IP</span>
                <span style={styles.specValue}>{asset.ipAddress || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Endereço MAC</span>
                <span style={styles.specValue}>{asset.macAddress || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Sistema Operacional</span>
                <span style={styles.specValue}>{asset.operatingSystem || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Localização / Setor</span>
                <span style={styles.specValue}>{asset.location || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>ID Acesso Remoto</span>
                <span style={styles.specValue}>{asset.remoteAccessId || '-'}</span>
              </div>
              <div style={styles.specItem}>
                <span style={styles.specLabel}>Usuário Vinculado</span>
                <span style={styles.specValue}>
                  {asset.assignedClientUser ? asset.assignedClientUser.fullName : 'Sem vínculo'}
                </span>
              </div>
            </div>

            {asset.notes && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={styles.specLabel}>Observações do Ativo</span>
                <p style={{ marginTop: '6px', fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                  {asset.notes}
                </p>
              </div>
            )}
          </div>

          {/* Notes Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Notas Técnicas Internas</h2>
            
            <form onSubmit={handleCreateNote} style={styles.noteForm}>
              {noteError && <div style={{ ...styles.errorAlert, marginBottom: '12px' }}>{noteError}</div>}
              <textarea
                required
                placeholder="Adicione um detalhe técnico, diagnóstico ou manutenção interna (Bloqueado adicionar senhas em texto puro)..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                style={styles.textarea}
              />
              <div style={styles.noteFormActions}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', color: '#9ca3af' }}>Visibilidade:</label>
                  <select
                    value={noteVisibility}
                    onChange={(e) => setNoteVisibility(e.target.value)}
                    style={styles.select}
                  >
                    <option value="INTERNAL">Interno (Somente Técnicos)</option>
                    <option value="CLIENT_VISIBLE_FUTURE">Futuro Portal</option>
                  </select>
                </div>
                <Button type="submit" variant="primary" disabled={noteSubmitting} style={{ padding: '6px 16px', fontSize: '13px' }}>
                  {noteSubmitting ? 'Adicionando...' : 'Adicionar Nota'}
                </Button>
              </div>
            </form>

            <div style={styles.notesList}>
              {(!asset.assetNotes || asset.assetNotes.length === 0) ? (
                <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                  Nenhuma nota técnica interna registrada.
                </p>
              ) : (
                asset.assetNotes.map((note: any) => (
                  <div key={note.id} style={styles.noteItem}>
                    <div style={styles.noteHeader}>
                      <span style={styles.noteAuthor}>{note.authorUser?.name || 'Técnico'}</span>
                      <span style={styles.noteDate}>
                        {new Date(note.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p style={styles.noteContent}>{note.content}</p>
                    <span style={styles.noteBadge}>{note.visibility}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History Timeline & Placeholders */}
        <div style={styles.rightCol}>
          
          {/* History Timeline */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Histórico de Alterações</h2>
            
            <div style={styles.timeline}>
              {(!asset.history || asset.history.length === 0) ? (
                <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px', padding: '16px' }}>
                  Nenhum histórico registrado.
                </p>
              ) : (
                asset.history.map((log: any) => (
                  <div key={log.id} style={styles.timelineItem}>
                    <div style={styles.timelinePoint} />
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineHeader}>
                        <span style={styles.timelineEvent}>{log.event}</span>
                        <span style={styles.timelineDate}>
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p style={styles.timelineDesc}>{log.description}</p>
                      {log.actorUser && <span style={styles.timelineActor}>Por: {log.actorUser.name}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Placeholders Card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Integrações e Tarefas Futuras</h2>
            <div style={styles.placeholdersList}>
              <div style={styles.placeholderItem}>
                <div style={styles.placeholderIcon}>🎫</div>
                <div style={styles.placeholderInfo}>
                  <span style={styles.placeholderTitle}>Chamados Relacionados</span>
                  <span style={styles.placeholderDesc}>Histórico de suporte deste equipamento (Fase 3).</span>
                </div>
              </div>
              <div style={styles.placeholderItem}>
                <div style={styles.placeholderIcon}>📅</div>
                <div style={styles.placeholderInfo}>
                  <span style={styles.placeholderTitle}>Manutenção Preventiva</span>
                  <span style={styles.placeholderDesc}>Agendas e limpezas recorrentes agendadas.</span>
                </div>
              </div>
              <div style={styles.placeholderItem}>
                <div style={styles.placeholderIcon}>📂</div>
                <div style={styles.placeholderInfo}>
                  <span style={styles.placeholderTitle}>Anexos e Manuais</span>
                  <span style={styles.placeholderDesc}>Upload de notas fiscais, fotos e manuais técnicos.</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Sensitive Credentials Reveal Overlay Modal */}
      {showSecretsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ ...styles.modalTitle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔑 Dados Confidenciais Descriptografados
              </h3>
              <button onClick={handleCloseSecrets} style={styles.closeBtn}>×</button>
            </div>
            
            <div style={styles.secretsAlert}>
              ⚠️ <strong>Aviso de Segurança:</strong> Estas credenciais foram descriptografadas sob demanda e este evento
              foi **auditado de forma permanente** no log de segurança do sistema. Nunca salve estes dados no seu disco local,
              localStorage ou senhas em texto plano. Feche esta janela imediatamente após o uso.
            </div>

            <div style={styles.secretsContainer}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa' }}>Conteúdo Confidencial:</span>
              <pre style={styles.secretsPre}>
                {typeof revealedSecrets === 'object'
                  ? JSON.stringify(revealedSecrets, null, 2)
                  : String(revealedSecrets || 'Sem dados')}
              </pre>
            </div>

            <div style={styles.modalActions}>
              <Button variant="outline" onClick={handleCloseSecrets} style={{ width: '100%' }}>
                Fechar e Bloquear Acesso
              </Button>
            </div>
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
    alignItems: 'flex-start',
    gap: '24px',
  },
  headerTitleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexGrow: 1,
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
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
    marginTop: '4px',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid',
    display: 'inline-block',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexShrink: 0,
  },
  revealBtn: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    padding: '8px 16px',
  },
  grid: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    flexWrap: 'wrap',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flexGrow: 2,
    flexBasis: '600px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flexGrow: 1,
    flexBasis: '350px',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#f9fafb',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '12px',
    marginBottom: '4px',
  },
  specsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px 24px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  specLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  specValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#f3f4f6',
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
    fontFamily: 'inherit',
  },
  select: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#f9fafb',
    outline: 'none',
    cursor: 'pointer',
  },
  noteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px',
  },
  noteFormActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  noteItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteAuthor: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#60a5fa',
  },
  noteDate: {
    fontSize: '11px',
    color: '#6b7280',
  },
  noteContent: {
    fontSize: '13px',
    color: '#e5e7eb',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  noteBadge: {
    fontSize: '9px',
    textTransform: 'uppercase',
    color: '#9ca3af',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: '1px 6px',
    borderRadius: '4px',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    paddingLeft: '16px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    gap: '20px',
    marginTop: '8px',
  },
  timelineItem: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  timelinePoint: {
    position: 'absolute',
    left: '-21px',
    top: '4px',
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    border: '2px solid #0b0f19',
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  timelineEvent: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#60a5fa',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  timelineDate: {
    fontSize: '11px',
    color: '#6b7280',
  },
  timelineDesc: {
    fontSize: '13px',
    color: '#d1d5db',
    lineHeight: 1.4,
  },
  timelineActor: {
    fontSize: '11px',
    color: '#6b7280',
  },
  placeholdersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  placeholderItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px',
  },
  placeholderIcon: {
    fontSize: '24px',
  },
  placeholderInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  placeholderTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e5e7eb',
  },
  placeholderDesc: {
    fontSize: '11px',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: 'rgba(11, 15, 25, 0.98)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '550px',
    padding: '32px',
    boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fca5a5',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '28px',
    cursor: 'pointer',
  },
  secretsAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '16px',
    borderRadius: '10px',
    fontSize: '12px',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  secretsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  secretsPre: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#34d399',
    whiteSpace: 'pre-wrap',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid rgba(52, 211, 153, 0.1)',
    overflow: 'auto',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '13px',
    marginBottom: '24px',
  },
  loadingArea: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(59, 130, 246, 0.1)',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
};
