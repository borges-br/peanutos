import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { StorageService } from "../storage/storage.service";

const BRAND_FIELDS = [
  "brandName", "brandSubtitle", "legalName", "companyDocument",
  "companyEmail", "financialEmail", "companyPhone", "companyWebsite",
  "companyAddress", "primaryColorHex", "documentSecondaryColor",
  "documentAccentColor", "documentFooterText", "defaultInvoiceNotes",
  "defaultQuoteTerms", "defaultServiceOrderTerms", "defaultContractTerms",
  "signatureName",
] as const;

const BRAND_SELECT = Object.fromEntries([...BRAND_FIELDS, "logoFileObjectId"].map(f => [f, true])) as Record<string, true>;

@Injectable()
export class SettingsService {
  constructor(
    private readonly auditService: AuditService,
    private readonly storage: StorageService,
  ) {}

  private normalizeNull(value: unknown): unknown {
    if (value === "" || value === "null" || value === undefined) return null;
    return value;
  }

  private async buildLogoUrl(logoFileObjectId: string | null): Promise<string | null> {
    if (!logoFileObjectId) return null;
    return `/api/v1/files/${logoFileObjectId}`;
  }

  async getBrandSettings(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: BRAND_SELECT,
    });

    if (!workspace) throw new NotFoundException("Workspace não encontrado");

    const logoUrl = await this.buildLogoUrl((workspace as any).logoFileObjectId);
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
    // Remove old logo if exists
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { logoFileObjectId: true },
    });

    if (ws?.logoFileObjectId) {
      await this.storage.deleteFileObject(ws.logoFileObjectId, workspaceId);
    }

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
      after: { fileObjectId, filename: upload.filename, mimeType: upload.mimeType },
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

    if (ws?.logoFileObjectId) {
      await this.storage.deleteFileObject(ws.logoFileObjectId, workspaceId);
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
