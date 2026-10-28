// Explicit, one-workspace migration. Never sends email or changes infrastructure keys.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const apiRequire = createRequire(path.resolve(__dirname, '../package.json'));
const dotenv = apiRequire('dotenv');
const args = process.argv.slice(2);
const workspaceId = args.find(a => a.startsWith('--workspace='))?.slice(12);
const runtimeEnv = [path.resolve('.env'), path.resolve(__dirname, '../../../.env')].find(candidate => fs.existsSync(candidate));
const file = path.resolve(args.find(a => a.startsWith('--file='))?.slice(7) || runtimeEnv || '.env');
const apply = args.includes('--apply');
if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
  console.error('Uso: node apps/api/scripts/import-env-settings.cjs --workspace=<uuid> --file=<env-legado> [--apply]'); process.exit(1);
}
const source = dotenv.parse(fs.readFileSync(file));
// Runtime key and database location are supplied by the current server environment.
if (runtimeEnv) dotenv.config({ path: runtimeEnv, override: false });
const { prisma, saveWorkspaceEmailSettings } = apiRequire('@peanut/db');
const { workspaceEmailSettingsSchema, workspaceOperationSettingsSchema } = apiRequire('@peanut/validators');
async function main() {
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const existing = await prisma.workspaceEmailSettings.findUnique({ where: { workspaceId } });
  const mappings = {
    WEBHOOK_INVOICE_DUE_SOON_HOURS: 'invoiceDueSoonOffsetHours', WEBHOOK_CONTRACT_ENDING_SOON_DAYS: 'contractEndingSoonDays',
    WEBHOOK_TICKET_FEEDBACK_HOURS_AFTER_RESOLVED: 'ticketFeedbackAfterHours', WEBHOOK_MAX_ATTEMPTS: 'webhookMaxAttempts', WEBHOOK_TIMEOUT_MS: 'webhookTimeoutMs',
  };
  const operation = Object.fromEntries(Object.keys(workspaceOperationSettingsSchema.shape).map(key => [key, ws[key]]));
  for (const [legacy, key] of Object.entries(mappings)) if (source[legacy]) operation[key] = Number(source[legacy]);
  if (!source.WEBHOOK_INVOICE_DUE_SOON_HOURS && source.WEBHOOK_INVOICE_DUE_SOON_DAYS) operation.invoiceDueSoonOffsetHours = Number(source.WEBHOOK_INVOICE_DUE_SOON_DAYS) * 24;
  if (source.JWT_EXPIRES_IN) {
    const parsed = source.JWT_EXPIRES_IN.match(/^(\d+)(m|h|d)$/);
    if (!parsed) throw new Error('A duração antiga da sessão precisa ser convertida para minutos pela interface.');
    operation.sessionDurationMinutes = Number(parsed[1]) * ({ m: 1, h: 60, d: 1440 }[parsed[2]]);
  }
  if (source.BILLING_SCHEDULE_CRON && source.BILLING_SCHEDULE_CRON !== '0 * * * *') throw new Error('O cron legado é personalizado. Ajuste o intervalo pela interface antes de remover a variável.');
  let email;
  if (source.SMTP_HOST) {
    if (existing) throw new Error('SMTP já configurado neste workspace. Importe manualmente pela interface para evitar sobrescrita.');
    const from = source.SMTP_FROM || source.SMTP_FROM_EMAIL || '';
    const mailbox = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
    email = { enabled: false, host: source.SMTP_HOST, port: Number(source.SMTP_PORT || 587),
      security: source.SMTP_SECURE === 'true' || Number(source.SMTP_PORT) === 465 ? 'TLS' : 'STARTTLS',
      username: source.SMTP_USER || '', password: source.SMTP_PASS || source.SMTP_PASSWORD || undefined,
      fromEmail: mailbox ? mailbox[2] : from, fromName: mailbox ? mailbox[1].replace(/^"|"$/g, '') : '', replyTo: '', revision: 0 };
    if (!workspaceEmailSettingsSchema.safeParse(email).success) throw new Error('SMTP legado incompleto ou inválido. Revise pela interface.');
  }
  if (!workspaceOperationSettingsSchema.safeParse(operation).success) throw new Error('Existem parâmetros fora dos limites aceitos. Revise pela interface.');
  if (!apply) { console.log('Simulação concluída. Valores e segredos omitidos. Use --apply para gravar no workspace indicado. SMTP será importado desativado.'); return; }
  // The outer transaction rolls back both settings and their audits on failure.
  await prisma.$transaction(async tx => {
    if (email) await saveWorkspaceEmailSettings({ $transaction: fn => fn(tx) }, workspaceId, email);
    await tx.workspace.update({ where: { id: workspaceId }, data: operation });
    await tx.auditLog.create({ data: { workspaceId, action: 'workspace.legacy_settings_imported', entityType: 'WORKSPACE', entityId: workspaceId,
      afterJson: JSON.stringify({ importedSmtp: Boolean(email), smtpEnabled: false, operationalFields: Object.keys(operation) }), severity: 'INFO' } });
  });
  console.log('Configurações importadas. SMTP desativado: confira e teste pela interface antes de ativar. Preserve o arquivo legado até concluir a conferência.');
}
main().catch(() => { console.error('Importação interrompida. Confira workspace, conexão, chave mestra, parâmetros e se o SMTP já está cadastrado. Nenhum segredo foi exibido.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
