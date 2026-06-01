import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, ContractStatus, ContractType } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import {
  ContractCreateInput,
  ContractUpdateInput,
  ContractLineItemCreateInput,
} from "@peanut/validators";

@Injectable()
export class ContractsService {
  constructor(
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

  /**
   * List all contracts inside a workspace.
   */
  async list(
    workspaceId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: ContractStatus;
      type?: ContractType;
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

    if (query.type) {
      where.type = query.type;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
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
      prisma.contract.count({ where }),
      prisma.contract.findMany({
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
   * Get details of a single contract including line items and active client info.
   */
  async getById(id: string, workspaceId: string) {
    const contract = await prisma.contract.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        slaPolicy: true,
        lineItems: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado");
    }

    return contract;
  }

  /**
   * Get history timeline of a contract.
   */
  async getHistory(contractId: string, workspaceId: string) {
    // Verify contract exists
    const exists = await prisma.contract.findFirst({
      where: { id: contractId, workspaceId },
    });
    if (!exists) {
      throw new NotFoundException("Contrato não encontrado");
    }

    return prisma.contractHistory.findMany({
      where: { contractId, workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Checks if another main active support contract exists for the client.
   */
  private async checkOverlap(
    workspaceId: string,
    clientId: string,
    excludeContractId?: string,
  ): Promise<void> {
    const overlap = await prisma.contract.findFirst({
      where: {
        workspaceId,
        clientId,
        status: "ACTIVE",
        type: {
          in: ["RECURRING_SUPPORT", "HYBRID"],
        },
        ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
      },
    });

    if (overlap) {
      throw new BadRequestException(
        "O cliente já possui um contrato recorrente ativo. Suspenda ou finalize o contrato atual antes de ativar um novo.",
      );
    }
  }

  /**
   * Create a new contract.
   */
  async create(
    input: ContractCreateInput,
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

    if (input.slaPolicyId) {
      const policy = await prisma.slaPolicy.findFirst({
        where: { id: input.slaPolicyId, workspaceId, active: true },
      });
      if (!policy) {
        throw new BadRequestException("Política de SLA não encontrada");
      }
    }

    // Check active subscription overlap
    if (
      input.status === "ACTIVE" &&
      ["RECURRING_SUPPORT", "HYBRID"].includes(input.type)
    ) {
      await this.checkOverlap(workspaceId, input.clientId);
    }

    // Generate contract number if not provided
    const clientCodeSource = client.tradeName || client.legalName || "CLI";
    const contractNumber =
      input.number ||
      `CTR-${clientCodeSource.substring(0, 3).toUpperCase()}-${Date.now().toString().substring(6)}`;

    const newContract = await prisma.contract.create({
      data: {
        workspaceId,
        clientId: input.clientId,
        number: contractNumber,
        title: input.title,
        description: input.description || null,
        status: input.status as any,
        type: input.type as any,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        renewalMode: input.renewalMode as any,
        billingDay: input.billingDay,
        monthlyAmountCents: input.monthlyAmountCents,
        currency: input.currency,
        slaPolicyId: input.slaPolicyId || null,
        maxUsers: input.maxUsers !== undefined ? input.maxUsers : null,
        maxAssets: input.maxAssets !== undefined ? input.maxAssets : null,
        includedRemoteTickets:
          input.includedRemoteTickets !== undefined
            ? input.includedRemoteTickets
            : null,
        includedOnsiteVisits:
          input.includedOnsiteVisits !== undefined
            ? input.includedOnsiteVisits
            : null,
        includedRemoteHours:
          input.includedRemoteHours !== undefined
            ? input.includedRemoteHours
            : null,
        includedOnsiteHours:
          input.includedOnsiteHours !== undefined
            ? input.includedOnsiteHours
            : null,
        notes: input.notes || null,
      },
    });

    // Write ContractHistory record
    await prisma.contractHistory.create({
      data: {
        workspaceId,
        contractId: newContract.id,
        actorUserId,
        event: "CONTRACT_CREATED",
        description: `Contrato criado no status ${newContract.status} (Valor: ${newContract.currency} ${newContract.monthlyAmountCents / 100})`,
        after: JSON.stringify(newContract),
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "contract.created",
      entityType: "CONTRACT",
      entityId: newContract.id,
      after: newContract,
      ipAddress,
      userAgent,
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "contract.created",
        entityId: newContract.id,
        data: {
          contractId: newContract.id,
          number: newContract.number,
          title: newContract.title,
          status: newContract.status,
          clientId: newContract.clientId,
        },
      })
      .catch(() => {});

    return newContract;
  }

  /**
   * Update contract details.
   */
  async update(
    id: string,
    input: ContractUpdateInput,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const contract = await prisma.contract.findFirst({
      where: { id, workspaceId },
    });

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado");
    }

    const before = { ...contract };

    // Check active subscription overlap if updating status or type to active recurring
    const nextStatus = input.status || contract.status;
    const nextType = input.type || contract.type;
    const nextClient = input.clientId || contract.clientId;

    if (
      nextStatus === "ACTIVE" &&
      ["RECURRING_SUPPORT", "HYBRID"].includes(nextType) &&
      (contract.status !== "ACTIVE" ||
        contract.type !== nextType ||
        contract.clientId !== nextClient)
    ) {
      await this.checkOverlap(workspaceId, nextClient, id);
    }

    if (input.slaPolicyId) {
      const policy = await prisma.slaPolicy.findFirst({
        where: { id: input.slaPolicyId, workspaceId, active: true },
      });
      if (!policy) {
        throw new BadRequestException("Política de SLA não encontrada");
      }
    }

    const data: any = {};
    if (input.title) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status) data.status = input.status as any;
    if (input.type) data.type = input.type as any;
    if (input.startDate) data.startDate = new Date(input.startDate);
    if (input.endDate !== undefined)
      data.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.renewalMode) data.renewalMode = input.renewalMode as any;
    if (input.billingDay !== undefined) data.billingDay = input.billingDay;
    if (input.monthlyAmountCents !== undefined)
      data.monthlyAmountCents = input.monthlyAmountCents;
    if (input.currency) data.currency = input.currency;
    if (input.slaPolicyId !== undefined) data.slaPolicyId = input.slaPolicyId;
    if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
    if (input.maxAssets !== undefined) data.maxAssets = input.maxAssets;
    if (input.includedRemoteTickets !== undefined)
      data.includedRemoteTickets = input.includedRemoteTickets;
    if (input.includedOnsiteVisits !== undefined)
      data.includedOnsiteVisits = input.includedOnsiteVisits;
    if (input.includedRemoteHours !== undefined)
      data.includedRemoteHours = input.includedRemoteHours;
    if (input.includedOnsiteHours !== undefined)
      data.includedOnsiteHours = input.includedOnsiteHours;
    if (input.notes !== undefined) data.notes = input.notes;

    const updatedContract = await prisma.contract.update({
      where: { id },
      data,
    });

    // Write ContractHistory record
    await prisma.contractHistory.create({
      data: {
        workspaceId,
        contractId: id,
        actorUserId,
        event: "CONTRACT_UPDATED",
        description: "Contrato atualizado",
        before: JSON.stringify(before),
        after: JSON.stringify(updatedContract),
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "contract.updated",
      entityType: "CONTRACT",
      entityId: id,
      before,
      after: updatedContract,
      ipAddress,
      userAgent,
    });

    return updatedContract;
  }

  /**
   * Dedicated status lifecycle updater.
   */
  async updateStatus(
    id: string,
    status: ContractStatus,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const contract = await prisma.contract.findFirst({
      where: { id, workspaceId },
    });

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado");
    }

    const before = { ...contract };

    if (
      status === "ACTIVE" &&
      ["RECURRING_SUPPORT", "HYBRID"].includes(contract.type) &&
      contract.status !== "ACTIVE"
    ) {
      await this.checkOverlap(workspaceId, contract.clientId, id);
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: { status: status as any },
    });

    // Write ContractHistory record
    await prisma.contractHistory.create({
      data: {
        workspaceId,
        contractId: id,
        actorUserId,
        event: "STATUS_CHANGED",
        description: `Status alterado de ${contract.status} para ${status}`,
        before: JSON.stringify(before),
        after: JSON.stringify(updatedContract),
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "contract.status_changed",
      entityType: "CONTRACT",
      entityId: id,
      before,
      after: updatedContract,
      ipAddress,
      userAgent,
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "contract.status_changed",
        entityId: id,
        data: {
          contractId: id,
          number: contract.number,
          title: contract.title,
          oldStatus: contract.status,
          newStatus: status,
        },
      })
      .catch(() => {});

    return updatedContract;
  }

  // --- CONTRACT LINE ITEMS CRUD ---

  /**
   * Add a service item line to a contract.
   */
  async addLineItem(
    contractId: string,
    input: ContractLineItemCreateInput,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, workspaceId },
    });

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado");
    }

    // Recalculate price on backend
    const totalPriceCents = Math.round(
      Number(input.quantity) * input.unitPriceCents,
    );

    const newLineItem = await prisma.contractLineItem.create({
      data: {
        workspaceId,
        contractId,
        description: input.description,
        itemType: input.itemType as any,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents,
        totalPriceCents,
        recurring: input.recurring,
      },
    });

    // Write ContractHistory record
    await prisma.contractHistory.create({
      data: {
        workspaceId,
        contractId,
        actorUserId,
        event: "LINE_ITEM_ADDED",
        description: `Item adicionado: ${newLineItem.description} (Valor Total: ${newLineItem.totalPriceCents / 100})`,
        after: JSON.stringify(newLineItem),
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "contract.line_item_added",
      entityType: "CONTRACT",
      entityId: contractId,
      after: newLineItem,
      ipAddress,
      userAgent,
    });

    return newLineItem;
  }

  /**
   * Edit a line item.
   */
  async updateLineItem(
    contractId: string,
    lineItemId: string,
    input: Partial<ContractLineItemCreateInput>,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, workspaceId },
    });

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado");
    }

    const item = await prisma.contractLineItem.findFirst({
      where: { id: lineItemId, contractId },
    });

    if (!item) {
      throw new NotFoundException("Item do contrato não encontrado");
    }

    const before = { ...item };

    const data: any = {};
    if (input.description) data.description = input.description;
    if (input.itemType) data.itemType = input.itemType as any;
    if (input.quantity !== undefined) data.quantity = input.quantity;
    if (input.unitPriceCents !== undefined)
      data.unitPriceCents = input.unitPriceCents;
    if (input.recurring !== undefined) data.recurring = input.recurring;

    // Recalculate price on backend
    const finalQuantity =
      input.quantity !== undefined ? input.quantity : item.quantity;
    const finalUnitPrice =
      input.unitPriceCents !== undefined
        ? input.unitPriceCents
        : item.unitPriceCents;
    data.totalPriceCents = Math.round(Number(finalQuantity) * finalUnitPrice);

    const updatedItem = await prisma.contractLineItem.update({
      where: { id: lineItemId },
      data,
    });

    // Write ContractHistory record
    await prisma.contractHistory.create({
      data: {
        workspaceId,
        contractId,
        actorUserId,
        event: "LINE_ITEM_UPDATED",
        description: `Item atualizado: ${updatedItem.description}`,
        before: JSON.stringify(before),
        after: JSON.stringify(updatedItem),
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "contract.line_item_updated",
      entityType: "CONTRACT",
      entityId: contractId,
      before,
      after: updatedItem,
      ipAddress,
      userAgent,
    });

    return updatedItem;
  }

  /**
   * Delete a line item.
   */
  async deleteLineItem(
    contractId: string,
    lineItemId: string,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, workspaceId },
    });

    if (!contract) {
      throw new NotFoundException("Contrato não encontrado");
    }

    const item = await prisma.contractLineItem.findFirst({
      where: { id: lineItemId, contractId },
    });

    if (!item) {
      throw new NotFoundException("Item do contrato não encontrado");
    }

    await prisma.contractLineItem.delete({
      where: { id: lineItemId },
    });

    // Write ContractHistory record
    await prisma.contractHistory.create({
      data: {
        workspaceId,
        contractId,
        actorUserId,
        event: "LINE_ITEM_REMOVED",
        description: `Item removido: ${item.description}`,
        before: JSON.stringify(item),
      },
    });

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "contract.line_item_deleted",
      entityType: "CONTRACT",
      entityId: contractId,
      before: item,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }
}
