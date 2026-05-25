import { Injectable } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { TEMPLATE_DOCUMENT_TYPES, TEMPLATE_BLOCKS } from "@peanut/validators";

type DocType = typeof TEMPLATE_DOCUMENT_TYPES[number];

const DEFAULT_ENABLED: Record<string, boolean> = {
  header: true, logo: true, companyInfo: true, clientInfo: true,
  documentTitle: true, itemsTable: true, financialSummary: true,
  paymentInfo: true, terms: false, observations: false,
  responsibleSignature: true, clientSignature: false, qrCode: false, footer: true,
};

const DEFAULT_ORDER = [
  "header", "logo", "companyInfo", "clientInfo", "documentTitle",
  "itemsTable", "financialSummary", "paymentInfo",
  "responsibleSignature", "footer",
];

function buildDefault(documentType: string) {
  return {
    documentType,
    templateKey: "standard",
    layoutVariant: "default",
    enabledBlocks: DEFAULT_ENABLED,
    blockOrder: DEFAULT_ORDER,
    customTexts: null,
    settings: null,
  };
}

@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly auditService: AuditService) {}

  async listAll(workspaceId: string) {
    const stored = await prisma.documentTemplateSetting.findMany({
      where: { workspaceId },
    });

    return TEMPLATE_DOCUMENT_TYPES.map((docType) => {
      const found = stored.find((s) => s.documentType === docType);
      return found ?? { id: null, workspaceId, ...buildDefault(docType), createdAt: null, updatedAt: null };
    });
  }

  async getByType(workspaceId: string, documentType: string) {
    if (!TEMPLATE_DOCUMENT_TYPES.includes(documentType as DocType)) {
      return { id: null, workspaceId, ...buildDefault(documentType), createdAt: null, updatedAt: null };
    }

    const stored = await prisma.documentTemplateSetting.findUnique({
      where: { workspaceId_documentType: { workspaceId, documentType } },
    });

    return stored ?? { id: null, workspaceId, ...buildDefault(documentType), createdAt: null, updatedAt: null };
  }

  async upsert(
    workspaceId: string,
    documentType: string,
    input: any,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await prisma.documentTemplateSetting.findUnique({
      where: { workspaceId_documentType: { workspaceId, documentType } },
    });

    const baseData = existing ?? buildDefault(documentType);

    const merged = {
      templateKey: input.templateKey ?? baseData.templateKey,
      layoutVariant: input.layoutVariant ?? baseData.layoutVariant,
      enabledBlocks: input.enabledBlocks ?? baseData.enabledBlocks,
      blockOrder: input.blockOrder ?? baseData.blockOrder,
      customTexts: input.customTexts !== undefined ? input.customTexts : (baseData.customTexts ?? null),
      settings: input.settings !== undefined ? input.settings : (baseData.settings ?? null),
    };

    const result = await prisma.documentTemplateSetting.upsert({
      where: { workspaceId_documentType: { workspaceId, documentType } },
      create: { workspaceId, documentType, ...merged },
      update: merged,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "document_template.updated",
      entityType: "DOCUMENT_TEMPLATE",
      entityId: result.id,
      before: existing,
      after: result,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return result;
  }

  async reset(
    workspaceId: string,
    documentType: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const defaults = buildDefault(documentType);

    const result = await prisma.documentTemplateSetting.upsert({
      where: { workspaceId_documentType: { workspaceId, documentType } },
      create: { workspaceId, documentType, ...defaults },
      update: defaults,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "document_template.reset",
      entityType: "DOCUMENT_TEMPLATE",
      entityId: result.id,
      after: { documentType, message: "Reset to defaults" },
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    return result;
  }
}
