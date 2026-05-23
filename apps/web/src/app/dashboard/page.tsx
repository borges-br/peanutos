'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@peanut/ui';
import { useRouter } from 'next/navigation';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const router = useRouter();

  const cards = [
    { title: 'Clientes', count: '1', desc: 'Contas registradas no painel', path: '/dashboard/clients' },
    { title: 'Chamados', count: 'Placeholder', desc: 'Atendimentos operacionais em aberto', path: null },
    { title: 'Orçamentos', count: 'Placeholder', desc: 'Propostas e cotações de materiais/serviços', path: null },
    { title: 'Faturas', count: 'Placeholder', desc: 'Faturamento recorrente e contratos ativos', path: null },
    { title: 'Inventário', count: 'Placeholder', desc: 'Rastreamento de ativos e licenças de TI', path: null },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Olá, {user?.name}! 👋</h1>
        <p style={styles.subtitle}>Benvindo de volta ao painel de operações técnicas do Peanut OS.</p>
      </header>

      <div style={styles.grid}>
        {cards.map((card) => (
          <div key={card.title} style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>{card.title}</h2>
              <div style={styles.cardBadge}>{card.count}</div>
            </div>
            <p style={styles.cardDesc}>{card.desc}</p>
            <div style={styles.cardFooter}>
              {card.path ? (
                <Button 
                  variant="primary" 
                  onClick={() => router.push(card.path!)}
                  style={{ width: '100%' }}
                >
                  Gerenciar {card.title}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  disabled
                  style={{ width: '100%', cursor: 'not-allowed', opacity: 0.5 }}
                >
                  Indisponível (Fase 2)
                </Button>
              )}
            </div>
          </div>
        ))}
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#f9fafb',
  },
  cardBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#9ca3af',
    lineHeight: 1.5,
    minHeight: '40px',
  },
  cardFooter: {
    marginTop: 'auto',
  },
};
