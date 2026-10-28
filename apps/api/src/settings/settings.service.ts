import { Injectable, NotFoundException, BadRequestException, ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { isValidTimeZone } from "@peanut/utils";
import { prisma, publicEmailSettings, saveWorkspaceEmailSettings, EmailSettingsError } from "@peanut/db";
import { workspaceEmailSettingsSchema, workspaceOperationSettingsSchema } from '@peanut/validators';
import { Queue } from 'bullmq';
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";

const BRAND_FIELDS = [
  "brandName",
  "brandSubtitle",
  "legalName",
  "companyDocument",
  "companyEmail",
  "financialEmail",
  "companyPhone",
  "companyWebsite",
  "companyAddress",
  "primaryColorHex",
  "documentSecondaryColor",
  "documentAccentColor",
  "documentFooterText",
  "defaultInvoiceNotes",
  "defaultQuoteTerms",
  "defaultServiceOrderTerms",
  "defaultContractTerms",
  "signatureName",
] as const;

const BRAND_SELECT = Object.fromEntries(
  [...BRAND_FIELDS, "logoFileObjectId"].map((f) => [f, true]),
) as Record<string, true>;

@Injectable()
export class SettingsService {
  private emailTests?: Queue;
  private getEmailTestQueue() {
    if (this.emailTests) return this.emailTests;
    this.emailTests = new Queue('settings-email-test', { connection: {
      host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || 'change-me-in-production',
      maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 3000,
    } });
    this.emailTests.on('error', () => { /* Request endpoints report queue availability without exposing connection details. */ });
    return this.emailTests;
  }
  async onModuleDestroy() { await this.emailTests?.close(); }

  async getEmailSettings(workspaceId: string) {
    return publicEmailSettings(await prisma.workspaceEmailSettings.findUnique({ where: { workspaceId } }));
  }
  async updateEmailSettings(workspaceId: string, body: unknown, actorUserId: string) {
    const result = workspaceEmailSettingsSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.errors.map(e => e.message).join(', '));
    try { return await saveWorkspaceEmailSettings(prisma, workspaceId, result.data, actorUserId); }
    catch (error) {
      if (error instanceof EmailSettingsError) throw error.conflict ? new ConflictException(error.message) : new BadRequestException(error.message);
      throw error;
    }
  }
  async testEmailConnection(workspaceId: string) {
    const settings = await this.getEmailSettings(workspaceId);
    if (!settings.host || !settings.fromEmail) throw new BadRequestException('Salve o servidor e remetente antes de testar.');
    try {
      // One test per workspace/revision/minute; only identifiers go into Redis.
      const job = await this.getEmailTestQueue().add('verify', { workspaceId, revision: settings.revision }, {
        jobId: `smtp-${workspaceId}-${settings.revision}-${Math.floor(Date.now() / 60000)}`,
        attempts: 1, removeOnComplete: { age: 3600, count: 100 }, removeOnFail: { age: 3600, count: 100 },
      });
      return { jobId: job.id };
    } catch { throw new ServiceUnavailableException('Fila indisponível. Verifique Redis e worker.'); }
  }
  async getEmailTest(workspaceId: string, id: string) {
    const job = await this.getEmailTestQueue().getJob(id);
    if (!job || job.data.workspaceId !== workspaceId) throw new NotFoundException('Teste não encontrado.');
    const state = await job.getState();
    return { state, result: state === 'completed' ? job.returnvalue : state === 'failed' ? { status: 'FAILED', message: 'O worker não concluiu o teste. Tente novamente.' } : null };
  }
  async getOperationSettings(workspaceId: string) {
    return prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: {
      invoiceDueSoonOffsetHours: true, contractEndingSoonDays: true, ticketFeedbackAfterHours: true,
      automationIntervalMinutes: true, webhookMaxAttempts: true, webhookTimeoutMs: true, sessionDurationMinutes: true,
    } });
  }
  async updateOperationSettings(workspaceId: string, body: unknown, actorUserId: string) {
    const result = workspaceOperationSettingsSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.errors.map(e => e.message).join(', '));
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      const before = await this.getOperationSettings(workspaceId);
      await tx.workspace.update({ where: { id: workspaceId }, data: result.data });
      await tx.auditLog.create({ data: { workspaceId, actorUserId, action: 'workspace.operation_settings_updated', entityType: 'WORKSPACE', entityId: workspaceId,
        beforeJson: JSON.stringify(before), afterJson: JSON.stringify(result.data), severity: 'INFO' } });
      return result.data;
    });
  }
  constructor(
    private readonly auditService: AuditService,
    private readonly storage: StorageService,
  ) {}

  async getGeneralSettings(workspaceId: string) {
    const settings = await prisma.workspace.findUnique({
      where: { id: workspaceId }, select: { timeZone: true },
    });
    if (!settings) throw new NotFoundException("Workspace não encontrado");
    return settings;
  }

  async updateGeneralSettings(workspaceId: string, input: any, actorUserId: string, ipAddress?: string, userAgent?: string) {
    if (!isValidTimeZone(input?.timeZone)) {
      throw new BadRequestException("Selecione um fuso horário IANA válido.");
    }
    const before = await this.getGeneralSettings(workspaceId);
    return prisma.$transaction(async (tx) => {
      const after = await tx.workspace.update({
        where: { id: workspaceId }, data: { timeZone: input.timeZone }, select: { timeZone: true },
      });
      await tx.auditLog.create({
        data: {
          workspaceId, actorUserId, action: "workspace.timezone_updated",
          entityType: "WORKSPACE", entityId: workspaceId,
          beforeJson: JSON.stringify(before), afterJson: JSON.stringify(after),
          ipAddress, userAgent, severity: "INFO",
        },
      });
      return after;
    });
  }

  private normalizeNull(value: unknown): unknown {
    if (value === "" || value === "null" || value === undefined) return null;
    return value;
  }

  private async buildLogoUrl(
    logoFileObjectId: string | null,
  ): Promise<string | null> {
    if (!logoFileObjectId) return null;
    return `/api/v1/files/${logoFileObjectId}`;
  }

  async getBrandSettings(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: BRAND_SELECT,
    });

    if (!workspace) throw new NotFoundException("Workspace não encontrado");

    const logoUrl = await this.buildLogoUrl(
      (workspace as any).logoFileObjectId,
    );
    const { logoFileObjectId: _, ...rest } = workspace as any;
    return { ...rest, logoUrl, hasLogo: !!logoUrl };
  }

  async updateBrandSettings(
    workspaceId: string,
    input: any,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const before = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: BRAND_SELECT,
    });

    if (!before) throw new NotFoundException("Workspace não encontrado");

    const dataToUpdate: any = {};
    for (const field of BRAND_FIELDS) {
      if (input[field] !== undefined) {
        dataToUpdate[field] = this.normalizeNull(input[field]);
      }
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: dataToUpdate,
      select: BRAND_SELECT,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "brand.updated",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      before: this.sanitizeForAudit(before),
      after: this.sanitizeForAudit(updated),
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    const logoUrl = await this.buildLogoUrl((updated as any).logoFileObjectId);
    const { logoFileObjectId: _, ...rest } = updated as any;
    return { ...rest, logoUrl, hasLogo: !!logoUrl };
  }

  async uploadLogo(
    workspaceId: string,
    actorUserId: string,
    upload: { data: string; mimeType: string; filename: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // NOTE: Old FileObject is intentionally kept (orphan cleanup deferred to future routine)

    const { fileObjectId } = await this.storage.uploadImage({
      workspaceId,
      actorUserId,
      folder: "logos",
      data: upload.data,
      mimeType: upload.mimeType,
      filename: upload.filename,
    });

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { logoFileObjectId: fileObjectId },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "brand.logo_uploaded",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      after: {
        fileObjectId,
        filename: upload.filename,
        mimeType: upload.mimeType,
      },
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return { logoUrl: `/api/v1/files/${fileObjectId}`, hasLogo: true };
  }

  async deleteLogo(
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { logoFileObjectId: true },
    });

    // Unlink logo without deleting the FileObject (orphan cleanup deferred)
    if (ws?.logoFileObjectId) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { logoFileObjectId: null },
      });
    }

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "brand.logo_removed",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return { logoUrl: null, hasLogo: false };
  }

  private sanitizeForAudit(data: any) {
    if (!data) return data;
    const { logoFileObjectId: _, ...safe } = data;
    return safe;
  }
}
