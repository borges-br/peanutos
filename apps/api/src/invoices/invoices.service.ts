import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class InvoicesService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * List all invoices inside a workspace.
   */
  async list(
    workspaceId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      clientId?: string;
    },
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
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
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
  async getById(id: string, workspaceId: string) {
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

    return invoice;
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
    // Verify client exists
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, workspaceId },
    });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    // Generate invoice number
    const invoiceNumber =
      input.number ||
      `INV-${client.tradeName.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(6)}`;

    // Create Invoice with items
    const newInvoice = await prisma.invoice.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        quoteId: input.quoteId || null,
        contractId: input.contractId || null,
        ticketId: input.ticketId || null,
        number: invoiceNumber,
        status: input.status || "DRAFT",
        issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
        dueDate: new Date(input.dueDate),
        paymentMethod: input.paymentMethod || "PIX",
        pixKey: input.pixKey || null,
        totalAmount: input.totalAmount,
        items: {
          create: (input.items || []).map((item: any, idx: number) => ({
            type: item.type || "SERVICE",
            description: item.description,
            quantity: item.quantity || 1,
            unit: item.unit || "UN",
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice || (Number(item.quantity || 1) * Number(item.unitPrice)),
            sortOrder: idx,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "invoice.created",
      entityType: "INVOICE",
      entityId: newInvoice.id,
      after: newInvoice,
      ipAddress,
      userAgent,
    });

    return newInvoice;
  }
}
