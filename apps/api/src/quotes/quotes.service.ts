import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma, Prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import { renderA4Document, formatDate as formatDocumentDate, formatDateTime as formatDocumentDateTime } from "@peanut/documents";
import { LocalObjectStorage } from "@peanut/utils";

@Injectable()
export class QuotesService {
  private readonly objects = new LocalObjectStorage();

  constructor(
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

  private hasFinancialPrivilege(role: string) {
    return ["OWNER", "ADMIN", "FINANCIAL"].includes(role);
  }

  private documentClient(source: any) {
    return {
      tradeName: source?.client?.tradeName || source?.clientName || "Cliente",
      legalName: source?.client?.legalName || source?.clientName || null,
      document: source?.client?.document || source?.clientDocument || null,
      email: source?.client?.email || source?.clientEmail || null,
      phone: source?.client?.phone || source?.clientPhone || null,
      address: source?.client?.notes || null,
    };
  }

  private async resolveClient(input: any, workspaceId: string) {
    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, workspaceId },
      });
      if (!client) {
        throw new NotFoundException("Cliente não encontrado neste workspace.");
      }
      return {
        client,
        data: {
          clientId: client.id,
          clientName: client.tradeName || client.legalName,
          clientDocument: client.document || null,
          clientEmail: client.email || null,
          clientPhone: client.phone || null,
        },
      };
    }

    const clientName = String(input.clientName || "").trim();
    if (!clientName) {
      throw new BadRequestException("Informe o nome do cliente.");
    }

    return {
      client: null,
      data: {
        clientId: null,
        clientName,
        clientDocument: input.clientDocument || null,
        clientEmail: input.clientEmail || null,
        clientPhone: input.clientPhone || null,
      },
    };
  }

  private mapQuoteForRole(quote: any, role: string) {
    if (!quote || this.hasFinancialPrivilege(role)) return quote;

    const sanitized = {
      ...quote,
      subtotalServices: null,
      subtotalMaterials: null,
      subtotalMaterialCost: null,
      discountAmount: null,
      totalAmount: null,
      netAmount: null,
    };

    if (sanitized.items) {
      sanitized.items = sanitized.items.map((item: any) => ({
        ...item,
        unitPrice: null,
        unitCost: null,
        totalPrice: null,
        totalCost: null,
      }));
    }

    return sanitized;
  }

  private calculateItems(inputItems: any[]) {
    let subtotalServices = new Prisma.Decimal(0);
    let subtotalMaterials = new Prisma.Decimal(0);
    let subtotalMaterialCost = new Prisma.Decimal(0);

    const items = (inputItems || []).map((item, idx) => {
      const qty = new Prisma.Decimal(item.quantity || 1);
      const price = new Prisma.Decimal(item.unitPrice || 0);
      const cost =
        item.type === "MATERIAL"
          ? new Prisma.Decimal(item.unitCost || 0)
          : new Prisma.Decimal(0);
      const total = qty.mul(price);
      const totalCost = qty.mul(cost);

      if (item.type === "MATERIAL") {
        subtotalMaterials = subtotalMaterials.add(total);
        subtotalMaterialCost = subtotalMaterialCost.add(totalCost);
      } else {
        subtotalServices = subtotalServices.add(total);
      }

      return {
        type: item.type || "SERVICE",
        description: item.description,
        quantity: qty,
        unit: item.unit || "UN",
        unitPrice: price,
        unitCost: cost,
        totalPrice: total,
        totalCost,
        sortOrder: idx,
      };
    });

    return {
      items,
      subtotalServices,
      subtotalMaterials,
      subtotalMaterialCost,
    };
  }

  async list(
    workspaceId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string | null;
      status?: string | null;
      clientId?: string | null;
    },
    requesterRole: string,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: "insensitive" } },
        { clientName: { contains: query.search, mode: "insensitive" } },
        { client: { tradeName: { contains: query.search, mode: "insensitive" } } },
        { client: { legalName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              tradeName: true,
              legalName: true,
              document: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: data.map((quote) => this.mapQuoteForRole(quote, requesterRole)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, workspaceId: string, requesterRole: string) {
    const quote = await prisma.quote.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!quote) {
      throw new NotFoundException("Orçamento não encontrado");
    }

    return this.mapQuoteForRole(quote, requesterRole);
  }

  async create(
    input: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const resolvedClient = await this.resolveClient(input, workspaceId);

    const calculated = this.calculateItems(input.items || []);
    const discountAmount = new Prisma.Decimal(input.discountAmount || 0);
    const subtotal = calculated.subtotalServices.add(calculated.subtotalMaterials);
    if (discountAmount.gt(subtotal)) {
      throw new BadRequestException(
        "O desconto não pode ser maior que o subtotal do orçamento.",
      );
    }
    const totalAmount = subtotal.sub(discountAmount);
    const netAmount = totalAmount.sub(calculated.subtotalMaterialCost);

    let quote: any;
    let attempts = 0;
    while (attempts < 3) {
      try {
        const number =
          attempts === 0 && input.number
            ? input.number
            : `ORC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

        quote = await prisma.quote.create({
          data: {
            workspaceId,
            ...resolvedClient.data,
            number,
            status: input.status || "DRAFT",
            issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
            validUntil: new Date(input.validUntil),
            subtotalServices: calculated.subtotalServices,
            subtotalMaterials: calculated.subtotalMaterials,
            subtotalMaterialCost: calculated.subtotalMaterialCost,
            discountAmount,
            terms: input.terms || null,
            observations: input.observations || null,
            totalAmount,
            netAmount,
            items: { create: calculated.items },
          },
          include: { items: true, client: true },
        });
        break;
      } catch (error: any) {
        if (error.code === "P2002" && !input.number) {
          attempts++;
          if (attempts >= 3) {
            throw new BadRequestException(
              "Falha ao gerar um número único de orçamento. Tente novamente.",
            );
          }
        } else if (error.code === "P2002" && input.number) {
          throw new BadRequestException(
            `O número de orçamento "${input.number}" já está em uso.`,
          );
        } else {
          throw error;
        }
      }
    }

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "quote.created",
      entityType: "QUOTE",
      entityId: quote.id,
      after: {
        ...quote,
        subtotalServices: "[REDACTED]",
        subtotalMaterials: "[REDACTED]",
        subtotalMaterialCost: "[REDACTED]",
        totalAmount: "[REDACTED]",
        netAmount: "[REDACTED]",
      },
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "quote.created",
        entityId: quote.id,
        actorUserId,
        entityType: "QUOTE",
        category: "COMMERCIAL",
        data: {
          quoteId: quote.id,
          number: quote.number,
          status: quote.status,
          clientId: quote.clientId,
          clientName: quote.clientName,
          validUntil: quote.validUntil,
          totalAmount: Number(quote.totalAmount),
        },
      })
      .catch(() => {});

    return quote;
  }

  async update(
    quoteId: string,
    input: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, workspaceId },
      include: { items: true },
    });
    if (!quote) throw new NotFoundException("Orçamento não encontrado");
    if (["REJECTED", "CANCELLED"].includes(quote.status)) {
      throw new BadRequestException(
        "Orçamentos recusados ou cancelados não podem ser editados.",
      );
    }

    const dataToUpdate: any = {};
    if (input.validUntil !== undefined)
      dataToUpdate.validUntil = new Date(input.validUntil);
    if (input.terms !== undefined) dataToUpdate.terms = input.terms;
    if (input.observations !== undefined)
      dataToUpdate.observations = input.observations;

    const discountAmount = new Prisma.Decimal(
      input.discountAmount !== undefined
        ? input.discountAmount
        : quote.discountAmount,
    );

    if (input.items !== undefined) {
      const calculated = this.calculateItems(input.items);
      const subtotal = calculated.subtotalServices.add(calculated.subtotalMaterials);
      if (discountAmount.gt(subtotal)) {
        throw new BadRequestException(
          "O desconto não pode ser maior que o subtotal do orçamento.",
        );
      }

      dataToUpdate.subtotalServices = calculated.subtotalServices;
      dataToUpdate.subtotalMaterials = calculated.subtotalMaterials;
      dataToUpdate.subtotalMaterialCost = calculated.subtotalMaterialCost;
      dataToUpdate.discountAmount = discountAmount;
      dataToUpdate.totalAmount = subtotal.sub(discountAmount);
      dataToUpdate.netAmount = dataToUpdate.totalAmount.sub(
        calculated.subtotalMaterialCost,
      );

      const updated = await prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { quoteId } });
        return tx.quote.update({
          where: { id: quoteId },
          data: { ...dataToUpdate, items: { create: calculated.items } },
          include: { items: true, client: true },
        });
      });

      await this.auditUpdate(quote, updated, workspaceId, actorUserId, ipAddress, userAgent);
      return updated;
    }

    const subtotal = new Prisma.Decimal(quote.subtotalServices).add(
      quote.subtotalMaterials,
    );
    if (discountAmount.gt(subtotal)) {
      throw new BadRequestException(
        "O desconto não pode ser maior que o subtotal do orçamento.",
      );
    }
    dataToUpdate.discountAmount = discountAmount;
    dataToUpdate.totalAmount = subtotal.sub(discountAmount);
    dataToUpdate.netAmount = dataToUpdate.totalAmount.sub(
      quote.subtotalMaterialCost,
    );

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: dataToUpdate,
      include: { items: true, client: true },
    });
    await this.auditUpdate(quote, updated, workspaceId, actorUserId, ipAddress, userAgent);
    return updated;
  }

  private async auditUpdate(
    before: any,
    after: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "quote.updated",
      entityType: "QUOTE",
      entityId: after.id,
      before,
      after,
      ipAddress,
      userAgent,
      severity: "INFO",
    });
  }

  async updateStatus(
    quoteId: string,
    input: { status: string },
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, workspaceId },
    });
    if (!quote) throw new NotFoundException("Orçamento não encontrado");

    const oldStatus = quote.status;
    const newStatus = input.status;
    if (oldStatus === newStatus) return quote;

    const allowed: Record<string, string[]> = {
      DRAFT: ["SENT", "CANCELLED"],
      SENT: ["ACCEPTED", "REJECTED", "CANCELLED"],
      ACCEPTED: ["CANCELLED"],
      REJECTED: [],
      CANCELLED: [],
    };
    if (!allowed[oldStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de status inválida: de ${oldStatus} para ${newStatus}.`,
      );
    }

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: { status: newStatus },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "quote.status_changed",
      entityType: "QUOTE",
      entityId: quoteId,
      before: { status: oldStatus },
      after: { status: newStatus },
      ipAddress,
      userAgent,
      severity: newStatus === "CANCELLED" ? "WARN" : "INFO",
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "quote.status_changed",
        entityId: quoteId,
        actorUserId,
        entityType: "QUOTE",
        category: "COMMERCIAL",
        data: { quoteId, number: quote.number, oldStatus, newStatus },
      })
      .catch(() => {});

    return updated;
  }

  private async fileObjectToDataUri(
    fileObjectId: string | null | undefined,
    workspaceId: string,
  ): Promise<string | null> {
    if (!fileObjectId) return null;
    const fileObject = await prisma.fileObject.findFirst({
      where: { id: fileObjectId, workspaceId },
    });
    if (!fileObject) return null;

    try {
      const body = await this.objects.get(fileObject.bucket, fileObject.key);
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      return `data:${fileObject.mimeType};base64,${buffer.toString("base64")}`;
    } catch (err: any) {
      console.warn("[QuotesService] Failed to inline document image:", err.message);
      return null;
    }
  }

  async getQuotePreviewHtml(
    quoteId: string,
    workspaceId: string,
  ): Promise<string> {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, workspaceId },
      include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!quote) throw new NotFoundException("Orçamento não encontrado");

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace não encontrado");

    const formatCurrency = (val: number | any) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(val));
    const formatDate = (date: Date) =>
      formatDocumentDate(date, "pt-BR", workspace.timeZone, true);

    const logoDataUri = await this.fileObjectToDataUri(
      (workspace as any).logoFileObjectId,
      workspaceId,
    );

    const templateSetting = await prisma.documentTemplateSetting.findUnique({
      where: {
        workspaceId_documentType: { workspaceId, documentType: "QUOTE" },
      },
    });

    const templateSnapshot = templateSetting
      ? {
          documentType: "QUOTE",
          templateKey: templateSetting.templateKey,
          layoutVariant: templateSetting.layoutVariant,
          enabledBlocks: templateSetting.enabledBlocks as Record<string, boolean>,
          blockOrder: templateSetting.blockOrder as string[],
          settings: templateSetting.settings || {},
        }
      : {
          documentType: "QUOTE",
          templateKey: "standard",
          layoutVariant: "default",
          enabledBlocks: {
            header: true,
            logo: true,
            companyInfo: true,
            clientInfo: true,
            documentTitle: true,
            itemsTable: true,
            financialSummary: true,
            paymentInfo: false,
            terms: true,
            observations: true,
            responsibleSignature: true,
            clientSignature: true,
            qrCode: false,
            footer: true,
          },
          blockOrder: [
            "header",
            "logo",
            "companyInfo",
            "clientInfo",
            "documentTitle",
            "itemsTable",
            "financialSummary",
            "terms",
            "observations",
            "responsibleSignature",
            "clientSignature",
            "footer",
          ],
          settings: {},
        };

    return renderA4Document({
      documentType: "QUOTE",
      brand: {
        publicName: workspace.brandName,
        brandSubtitle: workspace.brandSubtitle,
        legalName: workspace.legalName,
        taxId: workspace.companyDocument,
        email: workspace.companyEmail,
        financialEmail: workspace.financialEmail,
        phone: workspace.companyPhone,
        website: workspace.companyWebsite,
        address: workspace.companyAddress,
        documentPrimaryColor: workspace.primaryColorHex || "#1a56db",
        documentSecondaryColor:
          (workspace as any).documentSecondaryColor || "#4b5563",
        documentAccentColor: (workspace as any).documentAccentColor || "#e11d48",
        logoUrl: logoDataUri,
        footerText: workspace.documentFooterText,
        signatureName: workspace.signatureName,
      },
      responsible: null,
      client: this.documentClient(quote),
      data: {
        number: quote.number,
        status: quote.status,
        issueDate: formatDate(quote.issueDate),
        dueDate: formatDate(quote.validUntil),
        totalAmount: formatCurrency(quote.totalAmount),
        title: "Proposta Comercial",
        items: quote.items.map((item) => ({
          type: item.type,
          description: item.description,
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: formatCurrency(item.unitPrice),
          totalPrice: formatCurrency(item.totalPrice),
        })),
        terms: quote.terms || workspace.defaultQuoteTerms || null,
        observations: quote.observations || null,
        subtotalServices: formatCurrency(quote.subtotalServices),
        subtotalMaterials: formatCurrency(quote.subtotalMaterials),
        discountAmount: formatCurrency(quote.discountAmount),
      },
      templateSettings: templateSnapshot,
      generatedAt: formatDocumentDateTime(new Date(), "pt-BR", workspace.timeZone),
      locale: "pt-BR",
      timeZone: workspace.timeZone,
    });
  }
}
