import { prisma } from './index';
import { encryptString, decryptString } from '@peanut/utils';

type Db = typeof prisma;
export class EmailSettingsError extends Error {
  constructor(message: string, public readonly conflict = false) { super(message); }
}
export type EmailSettingsInput = {
  enabled: boolean; host: string; port: number; security: 'STARTTLS' | 'TLS';
  username: string; password?: string; clearPassword?: boolean;
  fromEmail: string; fromName: string; replyTo?: string | null; revision: number;
};
export function publicEmailSettings(row: any) {
  return {
    enabled: row?.enabled ?? false, host: row?.host ?? '', port: row?.port ?? 587,
    security: row?.security ?? 'STARTTLS', username: row?.username ?? '',
    fromEmail: row?.fromEmail ?? '', fromName: row?.fromName ?? '', replyTo: row?.replyTo ?? '',
    hasPassword: Boolean(row?.passwordEncrypted), revision: row?.revision ?? 0,
    lastTestAt: row?.lastTestAt ?? null, lastTestStatus: row?.lastTestStatus ?? null,
    lastTestError: row?.lastTestError ?? null,
  };
}
export async function saveWorkspaceEmailSettings(db: Db, workspaceId: string, input: EmailSettingsInput, actorUserId?: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const before = await tx.workspaceEmailSettings.findUnique({ where: { workspaceId } });
    if ((before?.revision ?? 0) !== input.revision) throw new EmailSettingsError('A configuração foi alterada por outra pessoa. Recarregue antes de salvar.', true);
    let passwordEncrypted = before?.passwordEncrypted ?? null;
    if (input.clearPassword && input.password) throw new EmailSettingsError('Escolha substituir ou remover a senha.');
    if (input.clearPassword) passwordEncrypted = null;
    if (input.password) {
      try { passwordEncrypted = encryptString(input.password); }
      catch { throw new EmailSettingsError('Configure a chave mestra APP_ENCRYPTION_KEY no servidor antes de salvar senhas.'); }
    }
    if (input.enabled && (!input.host || !input.fromEmail || (input.username && !passwordEncrypted))) throw new EmailSettingsError('Informe servidor, remetente e a senha do usuário SMTP antes de ativar.');
    const data = {
      enabled: input.enabled, host: input.host, port: input.port, security: input.security,
      username: input.username, passwordEncrypted, fromEmail: input.fromEmail, fromName: input.fromName,
      replyTo: input.replyTo || null, revision: (before?.revision ?? 0) + 1,
      lastTestAt: null, lastTestStatus: null, lastTestError: null,
    };
    const saved = await tx.workspaceEmailSettings.upsert({ where: { workspaceId }, create: { workspaceId, ...data }, update: data });
    await tx.auditLog.create({ data: {
      workspaceId, actorUserId, action: 'workspace.email_settings_updated', entityType: 'WORKSPACE', entityId: workspaceId,
      beforeJson: JSON.stringify(publicEmailSettings(before)),
      afterJson: JSON.stringify({ ...publicEmailSettings(saved), passwordChanged: Boolean(input.password || input.clearPassword) }), severity: 'INFO',
    } });
    return publicEmailSettings(saved);
  });
}
export type WorkspaceSmtpConfig = {
  host: string; port: number; security: string; username: string; password?: string;
  fromEmail: string; fromName: string; replyTo?: string; revision: number;
};
export async function loadWorkspaceSmtpConfig(db: Db, workspaceId: string, includeDisabled = false): Promise<WorkspaceSmtpConfig | null> {
  const row = await db.workspaceEmailSettings.findUnique({ where: { workspaceId } });
  if (!row || (!row.enabled && !includeDisabled) || !row.host || !row.fromEmail) return null;
  let password: string | undefined;
  if (row.passwordEncrypted) {
    // Never use the legacy base64 fallback for mail credentials.
    if (!row.passwordEncrypted.startsWith('v1:gcm:')) throw new EmailSettingsError('Credencial SMTP inválida. Salve a senha novamente.');
    try { password = decryptString(row.passwordEncrypted); }
    catch { throw new EmailSettingsError('Não foi possível desbloquear a credencial SMTP. Verifique a chave mestra do servidor.'); }
  }
  return { host: row.host, port: row.port, security: row.security, username: row.username, password,
    fromEmail: row.fromEmail, fromName: row.fromName, replyTo: row.replyTo || undefined, revision: row.revision };
}
