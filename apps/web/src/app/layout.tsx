import type { Metadata } from 'next';
import './globals.css';
import './branding.css';
import { AuthProvider } from '../context/AuthContext';
import { BrandProvider } from '../context/BrandContext';

export const metadata: Metadata = {
  title: 'Peanut OS — Sistema de Gestão Operacional de TI',
  description: 'Gestão integrada de clientes, inventário, atendimento e financeiro.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <BrandProvider><div id="app-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {children}
          </div></BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
