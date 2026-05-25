import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { prisma, Prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class InvoicesService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Sanitizes invoice details based on the requester's role.
   * Hide financial values from technicians and read-only roles.
   */
  mapInvoiceForRole(invoice: any, role: string) {
    if (!invoice) return invoice;

    const hasFinancialPrivilege = ["OWNER", "ADMIN", "FINANCIAL"].includes(role);
    if (hasFinancialPrivilege) {
      return invoice;
    }

    // Mask financial fields for other roles
    const sanitized = {
      ...invoice,
      totalAmount: null,
      pixKey: null,
    };

    if (sanitized.items) {
      sanitized.items = sanitized.items.map((item: any) => ({
        ...item,
        unitPrice: null,
        totalPrice: null,
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
    const sanitizedData = data.map((inv) => this.mapInvoiceForRole(inv, requesterRole));

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
      throw new NotFoundException("Cliente não encontrado ou não pertence a este workspace.");
    }

    // 2. Cross-workspace / cross-client validation for quotes, contracts, and tickets
    if (input.quoteId) {
      const quote = await prisma.quote.findFirst({
        where: { id: input.quoteId, workspaceId },
      });
      if (!quote) {
        throw new BadRequestException("O orçamento informado não existe ou não pertence a este workspace.");
      }
      if (quote.clientId !== input.clientId) {
        throw new BadRequestException("O orçamento informado pertence a outro cliente.");
      }
    }

    if (input.contractId) {
      const contract = await prisma.contract.findFirst({
        where: { id: input.contractId, workspaceId },
      });
      if (!contract) {
        throw new BadRequestException("O contrato informado não existe ou não pertence a este workspace.");
      }
      if (contract.clientId !== input.clientId) {
        throw new BadRequestException("O contrato informado pertence a outro cliente.");
      }
    }

    if (input.ticketId) {
      const ticket = await prisma.ticket.findFirst({
        where: { id: input.ticketId, workspaceId },
      });
      if (!ticket) {
        throw new BadRequestException("O chamado informado não existe ou não pertence a este workspace.");
      }
      if (ticket.clientId !== input.clientId) {
        throw new BadRequestException("O chamado informado pertence a outro cliente.");
      }
    }

    // 3. Recalculate totals using Prisma.Decimal to avoid precision errors
    let totalAmountDecimal = new Prisma.Decimal(0);
    const itemsToCreate = (input.items || []).map((item: any, idx: number) => {
      const qty = new Prisma.Decimal(item.quantity || 1);
      const price = new Prisma.Decimal(item.unitPrice || 0);
      const total = qty.mul(price);
      totalAmountDecimal = totalAmountDecimal.add(total);

      return {
        type: item.type || "SERVICE",
        description: item.description,
        quantity: qty,
        unit: item.unit || "UN",
        unitPrice: price,
        totalPrice: total,
        sortOrder: idx,
      };
    });

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
            totalAmount: totalAmountDecimal,
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
            throw new BadRequestException("Falha ao gerar um número único de fatura. Tente novamente.");
          }
        } else if (error.code === "P2002" && input.number) {
          throw new BadRequestException(`O número de fatura "${input.number}" já está em uso.`);
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
        totalPrice: "[REDACTED]",
      })),
      totalAmount: "[REDACTED]",
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
          : "")
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

    return updatedInvoice;
  }
}

