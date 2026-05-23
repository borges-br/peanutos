"use client";

import React from 'react';
import { Button } from '@peanut/ui';

export default function HomePage() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Peanut OS';
  const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Borges TI';

  return (
    <main style={styles.container}>
      {/* Decorative ambient light gradients */}
      <div style={styles.ambientLight1} />
      <div style={styles.ambientLight2} />

      <header style={styles.header}>
        <div style={styles.logo}>{brandName}</div>
        <div style={styles.badge}>Fase 0: Fundação Operacional</div>
      </header>

      <section style={styles.card}>
        <h1 style={styles.title}>Benvindo ao {brandName}</h1>
        <p style={styles.subtitle}>
          A plataforma operacional e técnica da <strong style={{ color: '#1a56db' }}>{companyName}</strong>. 
          Monorepo workspaces, Turborepo orchestration, e PostgreSQL base configurados com sucesso.
        </p>

        <div style={styles.divider} />

        <h2 style={styles.sectionTitle}>Status do Monorepo</h2>
        
        <div style={styles.grid}>
          <div style={styles.gridItem}>
            <div style={styles.statusDotActive} />
            <div>
              <div style={styles.gridItemTitle}>@peanut/db</div>
              <div style={styles.gridItemDesc}>Prisma schema e sementes fictícias preparadas.</div>
            </div>
          </div>

          <div style={styles.gridItem}>
            <div style={styles.statusDotActive} />
            <div>
              <div style={styles.gridItemTitle}>@peanut/ui</div>
              <div style={styles.gridItemDesc}>Design system compartilhado e componentes customizáveis.</div>
            </div>
          </div>

          <div style={styles.gridItem}>
            <div style={styles.statusDotActive} />
            <div>
              <div style={styles.gridItemTitle}>@peanut/types</div>
              <div style={styles.gridItemDesc}>Tipos compartilhados de negócios e auditoria.</div>
            </div>
          </div>

          <div style={styles.gridItem}>
            <div style={styles.statusDotActive} />
            <div>
              <div style={styles.gridItemTitle}>@peanut/utils</div>
              <div style={styles.gridItemDesc}>Criptografia em nível de aplicação planejada.</div>
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.actions}>
          <Button variant="primary" style={{ marginRight: '12px' }}>
            Painel Administrativo (MVP)
          </Button>
          <Button variant="outline" onClick={() => window.open('https://github.com', '_blank')}>
            Ver Repositório
          </Button>
        </div>
      </section>

      <footer style={styles.footer}>
        &copy; {new Date().getFullYear()} {brandName} &bull; Desenvolvido com qualidade de portfólio.
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: '#0b0f19',
    color: '#f9fafb',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientLight1: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(26,86,219,0.15) 0%, rgba(0,0,0,0) 70%)',
    zIndex: 1,
  },
  ambientLight2: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '45%',
    height: '45%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '32px',
    zIndex: 2,
  },
  logo: {
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(to right, #3b82f6, #1a56db)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#60a5fa',
  },
  card: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
    zIndex: 2,
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    marginBottom: '12px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#9ca3af',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '24px 0',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#e5e7eb',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '12px',
  },
  gridItem: {
    display: 'flex',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    padding: '16px',
  },
  gridItemTitle: {
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '4px',
    color: '#f3f4f6',
  },
  gridItemDesc: {
    fontSize: '12px',
    color: '#9ca3af',
    lineHeight: 1.4,
  },
  statusDotActive: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 8px #10b981',
    marginRight: '12px',
    marginTop: '6px',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
  },
  footer: {
    marginTop: '40px',
    fontSize: '12px',
    color: '#4b5563',
    zIndex: 2,
  },
};
