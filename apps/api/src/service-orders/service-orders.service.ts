import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { prisma, Prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import { renderA4Document } from "@peanut/documents";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class ServiceOrdersService {
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
      if (!client) throw new NotFoundException("Cliente não encontrado.");
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
    if (!clientName) throw new BadRequestException("Informe o nome do cliente.");
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

    const totalAmount = subtotalServices.add(subtotalMaterials);
    const netAmount = totalAmount.sub(subtotalMaterialCost);

    return {
      items,
      subtotalServices,
      subtotalMaterials,
      subtotalMaterialCost,
      totalAmount,
      netAmount,
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
      ticketId?: string | null;
    },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.ticketId) where.ticketId = query.ticketId;
    if (query.search) {
      where.OR = [
        { number: { contains: query.search, mode: "insensitive" } },
        { title: { contains: query.search, mode: "insensitive" } },
        { clientName: { contains: query.search, mode: "insensitive" } },
        { client: { tradeName: { contains: query.search, mode: "insensitive" } } },
        { client: { legalName: { contains: query.search, mode: "insensitive" } } },
        { ticket: { number: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.serviceOrder.count({ where }),
      prisma.serviceOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { id: true, tradeName: true, legalName: true, email: true },
          },
          ticket: { select: { id: true, number: true, title: true } },
          responsibleUser: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string, workspaceId: string) {
    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        ticket: true,
        contract: true,
        responsibleUser: { select: { id: true, name: true, role: true } },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException("Ordem de serviço não encontrada");
    }

    return serviceOrder;
  }

  private async validateRelations(input: any, workspaceId: string) {
    const resolvedClient = await this.resolveClient(input, workspaceId);

    if (input.ticketId) {
      if (!resolvedClient.data.clientId) {
        throw new BadRequestException("Chamados so podem ser vinculados a clientes cadastrados.");
      }
      const ticket = await prisma.ticket.findFirst({
        where: { id: input.ticketId, workspaceId },
      });
      if (!ticket) throw new BadRequestException("Chamado inválido.");
      if (ticket.clientId !== resolvedClient.data.clientId) {
        throw new BadRequestException("O chamado pertence a outro cliente.");
      }
    }

    if (input.contractId) {
      if (!resolvedClient.data.clientId) {
        throw new BadRequestException("Contratos so podem ser vinculados a clientes cadastrados.");
      }
      const contract = await prisma.contract.findFirst({
        where: { id: input.contractId, workspaceId },
      });
      if (!contract) throw new BadRequestException("Contrato inválido.");
      if (contract.clientId !== resolvedClient.data.clientId) {
        throw new BadRequestException("O contrato pertence a outro cliente.");
      }
    }

    if (input.responsibleUserId) {
      const user = await prisma.user.findFirst({
        where: { id: input.responsibleUserId, workspaceId },
      });
      if (!user) throw new BadRequestException("Responsável inválido.");
    }

    return resolvedClient;
  }

  async create(
    input: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const resolvedClient = await this.validateRelations(input, workspaceId);
    const calculated = this.calculateItems(input.items || []);

    let serviceOrder: any;
    let attempts = 0;
    while (attempts < 3) {
      try {
        const number =
          attempts === 0 && input.number
            ? input.number
            : `OS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

        serviceOrder = await prisma.serviceOrder.create({
          data: {
            workspaceId,
            ...resolvedClient.data,
            ticketId: input.ticketId || null,
            contractId: input.contractId || null,
            responsibleUserId: input.responsibleUserId || null,
            number,
            status: input.status || "DRAFT",
            title: input.title,
            description: input.description,
            scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
            laborMinutes: input.laborMinutes || 0,
            internalNotes: input.internalNotes || null,
            clientNotes: input.clientNotes || null,
            subtotalServices: calculated.subtotalServices,
            subtotalMaterials: calculated.subtotalMaterials,
            subtotalMaterialCost: calculated.subtotalMaterialCost,
            totalAmount: calculated.totalAmount,
            netAmount: calculated.netAmount,
            items: { create: calculated.items },
          },
          include: {
            items: true,
            client: true,
            responsibleUser: {
              select: {
                id: true,
                name: true,
                role: true,
                documentDisplayName: true,
                jobTitle: true,
              },
            },
          },
        });
        break;
      } catch (error: any) {
        if (error.code === "P2002" && !input.number) {
          attempts++;
          if (attempts >= 3) {
            throw new BadRequestException(
              "Falha ao gerar um número único de O.S. Tente novamente.",
            );
          }
        } else if (error.code === "P2002" && input.number) {
          throw new BadRequestException(
            `O número de O.S. "${input.number}" já está em uso.`,
          );
        } else {
          throw error;
        }
      }
    }

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "service_order.created",
      entityType: "SERVICE_ORDER",
      entityId: serviceOrder.id,
      after: serviceOrder,
      ipAddress,
      userAgent,
      severity: "INFO",
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "service_order.created",
        entityId: serviceOrder.id,
        actorUserId,
        entityType: "SERVICE_ORDER",
        category: "OPERATION",
        data: {
          serviceOrderId: serviceOrder.id,
          number: serviceOrder.number,
          status: serviceOrder.status,
          clientId: serviceOrder.clientId,
          clientName: serviceOrder.clientName,
          ticketId: serviceOrder.ticketId,
        },
      })
      .catch(() => {});

    return serviceOrder;
  }

  async update(
    serviceOrderId: string,
    input: any,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, workspaceId },
      include: { items: true },
    });
    if (!serviceOrder) {
      throw new NotFoundException("Ordem de serviço não encontrada");
    }
    if (serviceOrder.status === "COMPLETED" || serviceOrder.status === "CANCELLED") {
      throw new BadRequestException(
        "Ordens de serviço concluídas ou canceladas não podem ser editadas.",
      );
    }

    const relationInput = {
      clientId: serviceOrder.clientId,
      clientName: serviceOrder.clientName,
      clientDocument: serviceOrder.clientDocument,
      clientEmail: serviceOrder.clientEmail,
      clientPhone: serviceOrder.clientPhone,
      ticketId: input.ticketId !== undefined ? input.ticketId : serviceOrder.ticketId,
      contractId: input.contractId !== undefined ? input.contractId : serviceOrder.contractId,
      responsibleUserId: input.responsibleUserId !== undefined ? input.responsibleUserId : serviceOrder.responsibleUserId,
    };
    await this.validateRelations(relationInput, workspaceId);

    const dataToUpdate: any = {};
    for (const field of [
      "ticketId",
      "contractId",
      "responsibleUserId",
      "title",
      "description",
      "laborMinutes",
      "internalNotes",
      "clientNotes",
    ]) {
      if (input[field] === undefined) continue;
      if (field === "title" || field === "description" || field === "laborMinutes") {
        dataToUpdate[field] = input[field];
      } else {
        dataToUpdate[field] = input[field] || null;
      }
    }
    if (input.scheduledFor !== undefined) {
      dataToUpdate.scheduledFor = input.scheduledFor
        ? new Date(input.scheduledFor)
        : null;
    }

    if (input.items !== undefined) {
      const calculated = this.calculateItems(input.items);
      Object.assign(dataToUpdate, {
        subtotalServices: calculated.subtotalServices,
        subtotalMaterials: calculated.subtotalMaterials,
        subtotalMaterialCost: calculated.subtotalMaterialCost,
        totalAmount: calculated.totalAmount,
        netAmount: calculated.netAmount,
      });

      const updated = await prisma.$transaction(async (tx) => {
        await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId } });
        return tx.serviceOrder.update({
          where: { id: serviceOrderId },
          data: { ...dataToUpdate, items: { create: calculated.items } },
          include: {
            items: true,
            client: true,
            responsibleUser: {
              select: {
                id: true,
                name: true,
                role: true,
                documentDisplayName: true,
                jobTitle: true,
              },
            },
          },
        });
      });
      await this.auditUpdate(serviceOrder, updated, workspaceId, actorUserId, ipAddress, userAgent);
      return updated;
    }

    const updated = await prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: dataToUpdate,
      include: {
        items: true,
        client: true,
        responsibleUser: {
          select: {
            id: true,
            name: true,
            role: true,
            documentDisplayName: true,
            jobTitle: true,
          },
        },
      },
    });
    await this.auditUpdate(serviceOrder, updated, workspaceId, actorUserId, ipAddress, userAgent);
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
      action: "service_order.updated",
      entityType: "SERVICE_ORDER",
      entityId: after.id,
      before,
      after,
      ipAddress,
      userAgent,
      severity: "INFO",
    });
  }

  async updateStatus(
    serviceOrderId: string,
    input: { status: string },
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, workspaceId },
    });
    if (!serviceOrder) {
      throw new NotFoundException("Ordem de serviço não encontrada");
    }

    const oldStatus = serviceOrder.status;
    const newStatus = input.status;
    if (oldStatus === newStatus) return serviceOrder;

    const allowed: Record<string, string[]> = {
      DRAFT: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
      SCHEDULED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
      IN_PROGRESS: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };
    if (!allowed[oldStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transição de status inválida: de ${oldStatus} para ${newStatus}.`,
      );
    }

    const dataToUpdate: any = { status: newStatus };
    if (newStatus === "IN_PROGRESS" && !serviceOrder.startedAt) {
      dataToUpdate.startedAt = new Date();
    }
    if (newStatus === "COMPLETED" && !serviceOrder.completedAt) {
      dataToUpdate.completedAt = new Date();
    }

    const updated = await prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: dataToUpdate,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "service_order.status_changed",
      entityType: "SERVICE_ORDER",
      entityId: serviceOrderId,
      before: { status: oldStatus },
      after: { status: newStatus },
      ipAddress,
      userAgent,
      severity: newStatus === "CANCELLED" ? "WARN" : "INFO",
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "service_order.status_changed",
        entityId: serviceOrderId,
        actorUserId,
        entityType: "SERVICE_ORDER",
        category: "OPERATION",
        data: {
          serviceOrderId,
          number: serviceOrder.number,
          oldStatus,
          newStatus,
        },
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
      console.warn(
        "[ServiceOrdersService] Failed to inline document image:",
        err.message,
      );
      return null;
    }
  }

  async getServiceOrderPreviewHtml(
    serviceOrderId: string,
    workspaceId: string,
  ): Promise<string> {
    const serviceOrder = await prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, workspaceId },
      include: {
        client: true,
        responsibleUser: {
          select: {
            id: true,
            name: true,
            role: true,
            documentDisplayName: true,
            jobTitle: true,
            signatureImageFileObjectId: true,
            documentSignatureEnabled: true,
          },
        },
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!serviceOrder) {
      throw new NotFoundException("Ordem de serviço não encontrada");
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace não encontrado");

    const formatCurrency = (val: number | any) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(val));
    const formatDate = (date: Date | null | undefined) =>
      date ? new Date(date).toLocaleDateString("pt-BR") : "--/--/----";

    const logoDataUri = await this.fileObjectToDataUri(
      (workspace as any).logoFileObjectId,
      workspaceId,
    );
    const signatureDataUri = await this.fileObjectToDataUri(
      (serviceOrder.responsibleUser as any)?.signatureImageFileObjectId,
      workspaceId,
    );

    const templateSetting = await prisma.documentTemplateSetting.findUnique({
      where: {
        workspaceId_documentType: {
          workspaceId,
          documentType: "SERVICE_ORDER",
        },
      },
    });

    const templateSnapshot = templateSetting
      ? {
          documentType: "SERVICE_ORDER",
          templateKey: templateSetting.templateKey,
          layoutVariant: templateSetting.layoutVariant,
          enabledBlocks: templateSetting.enabledBlocks as Record<string, boolean>,
          blockOrder: templateSetting.blockOrder as string[],
          settings: templateSetting.settings || {},
        }
      : {
          documentType: "SERVICE_ORDER",
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
      documentType: "SERVICE_ORDER",
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
      responsible: serviceOrder.responsibleUser
        ? {
            userId: serviceOrder.responsibleUser.id,
            displayName:
              (serviceOrder.responsibleUser as any).documentDisplayName ||
              serviceOrder.responsibleUser.name,
            jobTitle: (serviceOrder.responsibleUser as any).jobTitle || null,
            signatureImageUrl: signatureDataUri,
            signatureEnabled:
              (serviceOrder.responsibleUser as any).documentSignatureEnabled ??
              false,
          }
        : null,
      client: this.documentClient(serviceOrder),
      data: {
        number: serviceOrder.number,
        status: serviceOrder.status,
        issueDate: formatDate(serviceOrder.createdAt),
        dueDate: formatDate(serviceOrder.scheduledFor || serviceOrder.completedAt),
        totalAmount: formatCurrency(serviceOrder.totalAmount),
        title: serviceOrder.title,
        items: (serviceOrder.items.length
          ? serviceOrder.items
          : [
              {
                type: "SERVICE",
                description: serviceOrder.description,
                quantity: new Prisma.Decimal(1),
                unit: "OS",
                unitPrice: new Prisma.Decimal(0),
                totalPrice: new Prisma.Decimal(0),
              },
            ]
        ).map((item: any) => ({
          type: item.type,
          description: item.description,
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: formatCurrency(item.unitPrice),
          totalPrice: formatCurrency(item.totalPrice),
        })),
        terms: workspace.defaultServiceOrderTerms || null,
        observations:
          serviceOrder.clientNotes ||
          serviceOrder.description ||
          "Serviço registrado para controle operacional.",
        subtotalServices: formatCurrency(serviceOrder.subtotalServices),
        subtotalMaterials: formatCurrency(serviceOrder.subtotalMaterials),
      },
      templateSettings: templateSnapshot,
      generatedAt: new Date().toLocaleString("pt-BR"),
      locale: "pt-BR",
    });
  }
}
