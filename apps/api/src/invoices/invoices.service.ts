import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, Prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import { renderA4Document } from "@peanut/documents";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class InvoicesService {
  private normalizeS3Endpoint(endpoint?: string) {
    const value = endpoint || "http://localhost:9000";
    return /^https?:\/\//i.test(value) ? value : `http://${value}`;
  }

  private readonly s3Client = new S3Client({
    endpoint: this.normalizeS3Endpoint(process.env.S3_ENDPOINT),
    region: process.env.S3_REGION || "us-east-1",
    credentials: {
      accessKeyId:
        process.env.S3_ACCESS_KEY_ID ||
        process.env.S3_ACCESS_KEY ||
        "minio_admin",
      secretAccessKey:
        process.env.S3_SECRET_ACCESS_KEY ||
        process.env.S3_SECRET_KEY ||
        "change-me-in-production",
    },
    forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  });

  constructor(
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

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
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: fileObject.bucket,
          Key: fileObject.key,
        }),
      );
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      return `data:${fileObject.mimeType};base64,${buffer.toString("base64")}`;
    } catch (err: any) {
      console.warn("[InvoicesService] Failed to inline document image:", err.message);
      return null;
    }
  }

  /**
   * Sanitizes invoice details based on the requester's role.
   * Hide financial values from technicians and read-only roles.
   */
  mapInvoiceForRole(invoice: any, role: string) {
    if (!invoice) return invoice;

    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(
      role,
    );
    if (hasFinancialPrivilege) {
      return invoice;
    }

    // Mask financial fields for other roles
    const sanitized = {
      ...invoice,
      totalAmount: null,
      pixKey: null,
      subtotalServices: null,
      subtotalMaterials: null,
      subtotalMaterialCost: null,
      discountAmount: null,
      discountReason: null,
      netAmount: null,
      observations: null,
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

  /**
   * List all invoices inside a workspace with optional filters.
   */
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

    const where: any = {
      workspaceId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: "insensitive" } },
        {
          client: {
            tradeName: { contains: query.search, mode: "insensitive" },
          },
        },
        {
          client: {
            legalName: { contains: query.search, mode: "insensitive" },
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
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

    const totalPages = Math.ceil(total / limit);

    // Apply role-based financial sanitization
    const sanitizedData = data.map((inv) =>
      this.mapInvoiceForRole(inv, requesterRole),
    );

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get single invoice details including items.
   */
  async getById(id: string, workspaceId: string, requesterRole: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Fatura não encontrada");
    }

    return this.mapInvoiceForRole(invoice, requesterRole);
  }

  /**
   * Create a new invoice.
   */
  async create(
    input: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Verify client exists and belongs to the workspace
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, workspaceId },
    });
    if (!client) {
      throw new NotFoundException(
        "Cliente não encontrado ou não pertence a este workspace.",
      );
    }

    // 2. Cross-workspace / cross-client validation for quotes, contracts, and tickets
    if (input.quoteId) {
      const quote = await prisma.quote.findFirst({
        where: { id: input.quoteId, workspaceId },
      });
      if (!quote) {
        throw new BadRequestException(
          "O orçamento informado não existe ou não pertence a este workspace.",
        );
      }
      if (quote.clientId !== input.clientId) {
        throw new BadRequestException(
          "O orçamento informado pertence a outro cliente.",
        );
      }
    }

    if (input.contractId) {
      const contract = await prisma.contract.findFirst({
        where: { id: input.contractId, workspaceId },
      });
      if (!contract) {
        throw new BadRequestException(
          "O contrato informado não existe ou não pertence a este workspace.",
        );
      }
      if (contract.clientId !== input.clientId) {
        throw new BadRequestException(
          "O contrato informado pertence a outro cliente.",
        );
      }
    }

    if (input.ticketId) {
      const ticket = await prisma.ticket.findFirst({
        where: { id: input.ticketId, workspaceId },
      });
      if (!ticket) {
        throw new BadRequestException(
          "O chamado informado não existe ou não pertence a este workspace.",
        );
      }
      if (ticket.clientId !== input.clientId) {
        throw new BadRequestException(
          "O chamado informado pertence a outro cliente.",
        );
      }
    }

    // 3. Recalculate totals using Prisma.Decimal to avoid precision errors
    let subtotalServices = new Prisma.Decimal(0);
    let subtotalMaterials = new Prisma.Decimal(0);
    let subtotalMaterialCost = new Prisma.Decimal(0);

    const itemsToCreate = (input.items || []).map((item: any, idx: number) => {
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

    const discountAmount = new Prisma.Decimal(input.discountAmount || 0);
    const subtotal = subtotalServices.add(subtotalMaterials);
    if (discountAmount.gt(subtotal)) {
      throw new BadRequestException(
        "O desconto não pode ser maior que o subtotal da fatura.",
      );
    }
    const totalAmountDecimal = subtotal.sub(discountAmount);
    const netAmountDecimal = totalAmountDecimal.sub(subtotalMaterialCost);

    // 4. Create invoice with safe sequential/random number and collision handling
    let newInvoice: any;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const currentNumber =
          attempts === 0 && input.number
            ? input.number
            : `FAT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

        newInvoice = await prisma.invoice.create({
          data: {
            workspaceId,
            clientId: input.clientId,
            quoteId: input.quoteId || null,
            contractId: input.contractId || null,
            ticketId: input.ticketId || null,
            number: currentNumber,
            status: input.status || "DRAFT",
            issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
            dueDate: new Date(input.dueDate),
            paymentMethod: input.paymentMethod || "PIX",
            pixKey: input.pixKey || null,
            subtotalServices,
            subtotalMaterials,
            subtotalMaterialCost,
            discountAmount,
            discountReason: input.discountReason || null,
            observations: input.observations || null,
            totalAmount: totalAmountDecimal,
            netAmount: netAmountDecimal,
            items: {
              create: itemsToCreate,
            },
          },
          include: {
            items: true,
          },
        });
        break; // Break loop on success
      } catch (error: any) {
        if (error.code === "P2002" && !input.number) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new BadRequestException(
              "Falha ao gerar um número único de fatura. Tente novamente.",
            );
          }
        } else if (error.code === "P2002" && input.number) {
          throw new BadRequestException(
            `O número de fatura "${input.number}" já está em uso.`,
          );
        } else {
          throw error;
        }
      }
    }

    // 5. Sanitize sensitive financial fields before sending to the Audit Log
    const auditInvoice = {
      ...newInvoice,
      pixKey: newInvoice.pixKey ? "[REDACTED]" : null,
      items: newInvoice.items.map((item: any) => ({
        ...item,
        unitPrice: "[REDACTED]",
        unitCost: "[REDACTED]",
        totalPrice: "[REDACTED]",
        totalCost: "[REDACTED]",
      })),
      totalAmount: "[REDACTED]",
      netAmount: "[REDACTED]",
      subtotalServices: "[REDACTED]",
      subtotalMaterials: "[REDACTED]",
      subtotalMaterialCost: "[REDACTED]",
      discountAmount: "[REDACTED]",
    };

    // 6. Log audit outside Prisma transaction for resilience
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "invoice.created",
      entityType: "INVOICE",
      entityId: newInvoice.id,
      after: auditInvoice,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    // 7. Emit webhook event (non-blocking, never fails main operation)
    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "invoice.created",
        entityId: newInvoice.id,
        data: {
          invoiceId: newInvoice.id,
          number: newInvoice.number,
          status: newInvoice.status,
          clientId: newInvoice.clientId,
          dueDate: newInvoice.dueDate,
        },
      })
      .catch(() => {});

    return newInvoice;
  }

  /**
   * Update invoice status with strict business transitions and role validation.
   */
  async updateStatus(
    invoiceId: string,
    input: { status: string },
    workspaceId: string,
    actorUserId: string,
    actorRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Fetch current invoice to verify ownership and evaluate transitions
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
    });

    if (!invoice) {
      throw new NotFoundException("Fatura não encontrada");
    }

    const oldStatus = invoice.status;
    const newStatus = input.status;

    if (oldStatus === newStatus) {
      return invoice;
    }

    // 2. Validate transition legality
    // Allowed transitions:
    // DRAFT -> ISSUED
    // DRAFT -> CANCELLED
    // ISSUED -> PAID
    // ISSUED -> OVERDUE
    // ISSUED -> CANCELLED
    // OVERDUE -> PAID
    // OVERDUE -> CANCELLED
    // PAID -> CANCELLED (only OWNER or ADMIN)
    // CANCELLED -> none (cannot transition)

    const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes(actorRole);

    let isAllowed = false;
    if (oldStatus === "DRAFT") {
      isAllowed = ["ISSUED", "CANCELLED"].includes(newStatus);
    } else if (oldStatus === "ISSUED") {
      isAllowed = ["PAID", "OVERDUE", "CANCELLED"].includes(newStatus);
    } else if (oldStatus === "OVERDUE") {
      isAllowed = ["PAID", "CANCELLED"].includes(newStatus);
    } else if (oldStatus === "PAID") {
      isAllowed = newStatus === "CANCELLED" && isOwnerOrAdmin;
    }

    if (!isAllowed) {
      throw new BadRequestException(
        `Transição de status inválida: de ${oldStatus} para ${newStatus}.` +
          (oldStatus === "PAID" && newStatus === "CANCELLED" && !isOwnerOrAdmin
            ? " Apenas OWNER ou ADMIN podem cancelar uma fatura PAGA."
            : ""),
      );
    }

    const dataToUpdate: any = { status: newStatus };

    // 3. Mark as PAID -> paidAt = new Date() if empty
    if (newStatus === "PAID" && !invoice.paidAt) {
      dataToUpdate.paidAt = new Date();
    }

    // 4. Update the status in the database
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: dataToUpdate,
    });

    // 5. Audit Logging (As per user adjustment #1: outside the Prisma transaction)
    let severity: "INFO" | "WARN" = "INFO";
    if (newStatus === "CANCELLED" || oldStatus === "PAID") {
      severity = "WARN";
    }

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "invoice.status_changed",
      entityType: "INVOICE",
      entityId: invoiceId,
      before: { status: oldStatus, paidAt: invoice.paidAt },
      after: { status: newStatus, paidAt: updatedInvoice.paidAt },
      ipAddress,
      userAgent,
      severity,
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "invoice.status_changed",
        entityId: invoiceId,
        data: { invoiceId, number: invoice.number, oldStatus, newStatus },
      })
      .catch(() => {});

    return updatedInvoice;
  }

  /**
   * Update a draft invoice (with totals recalculation).
   */
  async update(
    invoiceId: string,
    input: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Fetch invoice and check if it exists in the workspace
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException("Fatura não encontrada");
    }

    // 2. Lock editing of financial/documental content for non-DRAFT invoices
    if (invoice.status !== "DRAFT") {
      throw new BadRequestException(
        "Apenas faturas em status DRAFT podem ser editadas.",
      );
    }

    const dataToUpdate: any = {};

    if (input.dueDate !== undefined)
      dataToUpdate.dueDate = new Date(input.dueDate);
    if (input.paymentMethod !== undefined)
      dataToUpdate.paymentMethod = input.paymentMethod;
    if (input.pixKey !== undefined) dataToUpdate.pixKey = input.pixKey;
    if (input.discountReason !== undefined)
      dataToUpdate.discountReason = input.discountReason;
    if (input.observations !== undefined)
      dataToUpdate.observations = input.observations;

    // Recalculation logic
    let subtotalServices = new Prisma.Decimal(invoice.subtotalServices);
    let subtotalMaterials = new Prisma.Decimal(invoice.subtotalMaterials);
    let subtotalMaterialCost = new Prisma.Decimal(
      (invoice as any).subtotalMaterialCost || 0,
    );
    const discountAmount = new Prisma.Decimal(
      input.discountAmount !== undefined
        ? input.discountAmount
        : invoice.discountAmount,
    );

    if (input.items !== undefined) {
      // Delete old items and prepare new ones
      subtotalServices = new Prisma.Decimal(0);
      subtotalMaterials = new Prisma.Decimal(0);
      subtotalMaterialCost = new Prisma.Decimal(0);

      const itemsToCreate = input.items.map((item: any, idx: number) => {
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

      const subtotal = subtotalServices.add(subtotalMaterials);
      if (discountAmount.gt(subtotal)) {
        throw new BadRequestException(
          "O desconto não pode ser maior que o subtotal da fatura.",
        );
      }
      const totalAmountDecimal = subtotal.sub(discountAmount);
      const netAmountDecimal = totalAmountDecimal.sub(subtotalMaterialCost);

      dataToUpdate.subtotalServices = subtotalServices;
      dataToUpdate.subtotalMaterials = subtotalMaterials;
      dataToUpdate.subtotalMaterialCost = subtotalMaterialCost;
      dataToUpdate.discountAmount = discountAmount;
      dataToUpdate.totalAmount = totalAmountDecimal;
      dataToUpdate.netAmount = netAmountDecimal;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.invoiceItem.deleteMany({ where: { invoiceId } });
        return tx.invoice.update({
          where: { id: invoiceId },
          data: {
            ...dataToUpdate,
            items: {
              create: itemsToCreate,
            },
          },
          include: { items: true },
        });
      });

      await this.auditService.log({
        workspaceId,
        actorUserId,
        action: "invoice.updated",
        entityType: "INVOICE",
        entityId: invoiceId,
        before: invoice,
        after: updated,
        ipAddress,
        userAgent,
        severity: "INFO",
      });

      return updated;
    } else {
      // items not provided, but discount might have changed
      const subtotal = subtotalServices.add(subtotalMaterials);
      if (discountAmount.gt(subtotal)) {
        throw new BadRequestException(
          "O desconto não pode ser maior que o subtotal da fatura.",
        );
      }
      const totalAmountDecimal = subtotal.sub(discountAmount);
      const netAmountDecimal = totalAmountDecimal.sub(subtotalMaterialCost);

      dataToUpdate.discountAmount = discountAmount;
      dataToUpdate.totalAmount = totalAmountDecimal;
      dataToUpdate.netAmount = netAmountDecimal;

      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: dataToUpdate,
        include: { items: true },
      });

      await this.auditService.log({
        workspaceId,
        actorUserId,
        action: "invoice.updated",
        entityType: "INVOICE",
        entityId: invoiceId,
        before: invoice,
        after: updated,
        ipAddress,
        userAgent,
        severity: "INFO",
      });

      return updated;
    }
  }

  /**
   * Generates dynamic faithful HTML preview matching output of renderA4Document.
   */
  async getInvoicePreviewHtml(
    invoiceId: string,
    workspaceId: string,
  ): Promise<string> {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: {
        client: true,
        items: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException("Fatura não encontrada");
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado");
    }

    const formatCurrency = (val: number | any) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(val));
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString("pt-BR");
    };

    const logoDataUri = await this.fileObjectToDataUri(
      (workspace as any).logoFileObjectId,
      workspaceId,
    );

    const brandSnapshot = {
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
    };

    const templateSetting = await prisma.documentTemplateSetting.findUnique({
      where: {
        workspaceId_documentType: { workspaceId, documentType: "INVOICE" },
      },
    });

    const templateSnapshot = templateSetting
      ? {
          documentType: "INVOICE",
          templateKey: templateSetting.templateKey,
          layoutVariant: templateSetting.layoutVariant,
          enabledBlocks: templateSetting.enabledBlocks as Record<
            string,
            boolean
          >,
          blockOrder: templateSetting.blockOrder as string[],
          settings: templateSetting.settings || {},
        }
      : {
          documentType: "INVOICE",
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
            paymentInfo: true,
            terms: false,
            observations: true,
            responsibleSignature: true,
            clientSignature: false,
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
            "paymentInfo",
            "observations",
            "responsibleSignature",
            "footer",
          ],
          settings: {},
        };

    const renderData = {
      number: invoice.number,
      status: invoice.status,
      issueDate: formatDate(invoice.issueDate),
      dueDate: formatDate(invoice.dueDate),
      paymentMethod: invoice.paymentMethod,
      pixKey: invoice.pixKey,
      totalAmount: formatCurrency(invoice.totalAmount),
      items: invoice.items.map((item) => ({
        type: item.type,
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: formatCurrency(item.unitPrice),
        totalPrice: formatCurrency(item.totalPrice),
      })),
      terms: workspace.defaultContractTerms || null,
      observations:
        invoice.observations || workspace.defaultInvoiceNotes || null,
      subtotalServices: formatCurrency(invoice.subtotalServices),
      subtotalMaterials: formatCurrency(invoice.subtotalMaterials),
      discountAmount: formatCurrency(invoice.discountAmount),
    };

    return renderA4Document({
      documentType: "INVOICE",
      brand: brandSnapshot,
      responsible: null,
      client: {
        tradeName: invoice.client.tradeName,
        legalName: invoice.client.legalName,
        document: invoice.client.document,
        email: invoice.client.email,
        phone: invoice.client.phone,
        address: invoice.client.notes,
      },
      data: renderData,
      templateSettings: templateSnapshot,
      generatedAt: new Date().toLocaleString("pt-BR"),
      locale: "pt-BR",
    });
  }
}
