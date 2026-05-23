'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@peanut/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Peanut OS';

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={{ marginTop: '12px', color: '#9ca3af', fontSize: '14px' }}>Carregando painel...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { name: 'Visão Geral', path: '/dashboard' },
    { name: 'Clientes', path: '/dashboard/clients' },
    { name: 'Inventário', path: '/dashboard/inventory' },
    { name: 'Chamados', path: '/dashboard/tickets' },
  ];

  // Only OWNER or ADMIN can manage users
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    // We could add users menu item, let's add it for modularity
  }

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>{brandName}</div>
        <div style={styles.divider} />
        
        <nav style={styles.nav}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                style={{
                  ...styles.navBtn,
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? '#3b82f6' : '#9ca3af',
                  borderColor: isActive ? '#3b82f6' : 'transparent',
                }}
              >
                {item.name}
              </button>
            );
          })}
        </nav>

        <div style={{ flexGrow: 1 }} />

        <div style={styles.sidebarFooter}>
          <div style={styles.userProfile}>
            <div style={styles.avatar}>{user.name.substring(0, 2).toUpperCase()}</div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{user.name}</div>
              <div style={styles.userRole}>{user.role}</div>
            </div>
          </div>
          <Button variant="outline" onClick={logout} style={styles.logoutBtn}>
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={styles.contentWrapper}>
        <header style={styles.header}>
          <div style={styles.pageTitle}>
            {pathname === '/dashboard' && 'Visão Geral'}
            {pathname?.startsWith('/dashboard/clients') && 'Gestão de Clientes'}
            {pathname?.startsWith('/dashboard/inventory') && 'Inventário de Ativos'}
            {pathname?.startsWith('/dashboard/tickets') && 'Gestão de Chamados'}
          </div>
          <div style={styles.badge}>{user.role} Account</div>
        </header>

        <main style={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
    color: '#f9fafb',
  },
  sidebar: {
    width: '260px',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    zIndex: 10,
  },
  logo: {
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(to right, #3b82f6, #1a56db)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '16px 0',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid transparent',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: 'auto',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    color: '#fff',
    fontSize: '14px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#f9fafb',
  },
  userRole: {
    fontSize: '11px',
    color: '#9ca3af',
  },
  logoutBtn: {
    width: '100%',
    padding: '8px',
    fontSize: '12px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
  },
  contentWrapper: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    overflowY: 'auto',
  },
  header: {
    height: '70px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    backdropFilter: 'blur(8px)',
  },
  pageTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#f9fafb',
  },
  badge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#60a5fa',
  },
  main: {
    flexGrow: 1,
    padding: '40px',
    position: 'relative',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(59, 130, 246, 0.1)',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
};
