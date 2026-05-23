'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@peanut/ui';

export default function LoginPage() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Peanut OS';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha ao realizar login. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <main style={styles.container}>
      <div style={styles.ambientLight1} />
      <div style={styles.ambientLight2} />

      <section style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>{brandName}</div>
          <p style={styles.subtitle}>Insira suas credenciais para acessar o painel</p>
        </div>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="exemplo@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Senha</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            style={styles.submitBtn} 
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar na plataforma'}
          </Button>
        </form>
      </section>

      <footer style={styles.footer}>
        &copy; {new Date().getFullYear()} {brandName} &bull; Painel de Homologação.
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
  card: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
    zIndex: 2,
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: 'bold',
    letterSpacing: '-0.5px',
    background: 'linear-gradient(to right, #3b82f6, #1a56db)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#d1d5db',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    color: '#f9fafb',
    outline: 'none',
    transition: 'all 0.2s',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    marginTop: '10px',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  footer: {
    marginTop: '40px',
    fontSize: '12px',
    color: '#4b5563',
    zIndex: 2,
  },
};
