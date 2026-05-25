import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class SettingsService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Retrieves the current brand/company settings of a workspace.
   */
  async getBrandSettings(workspaceId: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        brandName: true,
        brandSubtitle: true,
        legalName: true,
        companyDocument: true,
        companyEmail: true,
        financialEmail: true,
        companyPhone: true,
        companyWebsite: true,
        companyAddress: true,
        primaryColorHex: true,
        documentFooterText: true,
        signatureName: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado");
    }

    return workspace;
  }

  /**
   * Updates brand/company settings for a workspace and registers an audit trail.
   */
  async updateBrandSettings(
    workspaceId: string,
    input: any,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Fetch current settings (before state)
    const before = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        brandName: true,
        brandSubtitle: true,
        legalName: true,
        companyDocument: true,
        companyEmail: true,
        financialEmail: true,
        companyPhone: true,
        companyWebsite: true,
        companyAddress: true,
        primaryColorHex: true,
        documentFooterText: true,
        signatureName: true,
      },
    });

    if (!before) {
      throw new NotFoundException("Workspace não encontrado");
    }

    // 2. Prepare and normalize settings data
    const fields = [
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
      "documentFooterText",
      "signatureName",
    ];

    const dataToUpdate: any = {};

    for (const field of fields) {
      if (input[field] !== undefined) {
        let value = input[field];
        
        // Normalize empty strings to null
        if (value === "" || value === "null" || value === undefined) {
          value = null;
        }

        // Clean & trim free text for company document/Tax ID
        if (field === "companyDocument" && typeof value === "string") {
          value = value.trim();
          if (value === "") {
            value = null;
          }
        }

        dataToUpdate[field] = value;
      }
    }

    // 3. Persist update in database
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: dataToUpdate,
      select: {
        brandName: true,
        brandSubtitle: true,
        legalName: true,
        companyDocument: true,
        companyEmail: true,
        financialEmail: true,
        companyPhone: true,
        companyWebsite: true,
        companyAddress: true,
        primaryColorHex: true,
        documentFooterText: true,
        signatureName: true,
      },
    });

    // 4. Register audit trail containing only white-label fields
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "settings.brand_updated",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      before,
      after: updated,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return updated;
  }
}
