import nodemailer from 'nodemailer';
import { prisma, loadWorkspaceSmtpConfig, WorkspaceSmtpConfig } from '@peanut/db';

export function createWorkspaceMailTransport(config: WorkspaceSmtpConfig) {
  return nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.security === 'TLS', requireTLS: config.security !== 'TLS',
    ...(config.username ? { auth: { user: config.username, pass: config.password || '' } } : {}),
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    disableFileAccess: true, disableUrlAccess: true,
    logger: false, debug: false,
  });
}

/** Connection/authentication only. Never sends a message or returns SMTP errors/credentials. */
export async function testWorkspaceEmailConnection(workspaceId: string, revision: number, db = prisma, factory = createWorkspaceMailTransport) {
  let status = 'FAILED';
  let message = 'Falha na conexão ou autenticação. Confira servidor, TLS, usuário, senha e a chave mestra do servidor.';
  try {
    const config = await loadWorkspaceSmtpConfig(db, workspaceId, true);
    if (!config || config.revision !== revision) return { status: 'STALE', message: 'A configuração mudou. Solicite outro teste.' };
    const transport = factory(config);
    try { await transport.verify(); status = 'SUCCESS'; message = 'Conexão e autenticação verificadas. Nenhum email foi enviado.'; }
    finally { transport.close(); }
  } catch { /* Do not store raw SMTP errors (may contain authentication details). */ }
  const saved = await db.workspaceEmailSettings.updateMany({ where: { workspaceId, revision }, data: {
    lastTestAt: new Date(), lastTestStatus: status, lastTestError: status === 'SUCCESS' ? null : message,
  } });
  return saved.count ? { status, message } : { status: 'STALE', message: 'A configuração mudou. Solicite outro teste.' };
}
