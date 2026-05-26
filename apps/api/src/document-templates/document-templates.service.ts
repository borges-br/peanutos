import { Injectable } from "@nestjs/common";
import { prisma, Prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { TEMPLATE_DOCUMENT_TYPES } from "@peanut/validators";

type DocType = (typeof TEMPLATE_DOCUMENT_TYPES)[number];

const DEFAULT_ENABLED: Record<string, boolean> = {
  header: true,
  logo: true,
  companyInfo: true,
  clientInfo: true,
  documentTitle: true,
  itemsTable: true,
  financialSummary: true,
  paymentInfo: true,
  terms: false,
  observations: false,
  responsibleSignature: true,
  clientSignature: false,
  qrCode: false,
  footer: true,
};

const DEFAULT_ORDER = [
  "header",
  "logo",
  "companyInfo",
  "clientInfo",
  "documentTitle",
  "itemsTable",
  "financialSummary",
  "paymentInfo",
  "responsibleSignature",
  "footer",
];

function buildDefault() {
  return {
    templateKey: "standard",
    layoutVariant: "default",
    enabledBlocks: DEFAULT_ENABLED,
    blockOrder: DEFAULT_ORDER,
    customTexts: Prisma.JsonNull,
    settings: Prisma.JsonNull,
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
      return (
        found ?? {
          id: null,
          workspaceId,
          documentType: docType,
          ...buildDefault(),
          createdAt: null,
          updatedAt: null,
        }
      );
    });
  }

  async getByType(workspaceId: string, documentType: string) {
    if (!TEMPLATE_DOCUMENT_TYPES.includes(documentType as DocType)) {
      return {
        id: null,
        workspaceId,
        documentType,
        ...buildDefault(),
        createdAt: null,
        updatedAt: null,
      };
    }

    const stored = await prisma.documentTemplateSetting.findUnique({
      where: { workspaceId_documentType: { workspaceId, documentType } },
    });

    return (
      stored ?? {
        id: null,
        workspaceId,
        documentType,
        ...buildDefault(),
        createdAt: null,
        updatedAt: null,
      }
    );
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

    const baseData = existing ?? buildDefault();

    const merged = {
      templateKey: input.templateKey ?? baseData.templateKey,
      layoutVariant: input.layoutVariant ?? baseData.layoutVariant,
      enabledBlocks: input.enabledBlocks ?? baseData.enabledBlocks,
      blockOrder: input.blockOrder ?? baseData.blockOrder,
      customTexts:
        input.customTexts === undefined
          ? (baseData.customTexts ?? Prisma.JsonNull)
          : input.customTexts === null
            ? Prisma.JsonNull
            : input.customTexts,
      settings:
        input.settings === undefined
          ? (baseData.settings ?? Prisma.JsonNull)
          : input.settings === null
            ? Prisma.JsonNull
            : input.settings,
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
    const defaults = buildDefault();

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
