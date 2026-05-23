import type { Metadata } from 'next';
import './globals.css';

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
        <div id="app-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
