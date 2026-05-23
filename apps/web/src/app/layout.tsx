import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'Peanut OS — Sistema de Gestão Operacional de TI',
  description: 'Gestão completa e integrada de clientes, contatos, inventários, chamados e faturamento da Borges TI.',
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
          <div id="app-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
