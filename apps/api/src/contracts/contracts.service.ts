import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, Prisma, ContractStatus, ContractType, prepareContractPeriod, ContractBillingError, saveContractLineItem, removeContractLineItem } from "@peanut/db";
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
        billingScheduleEvents: {
          orderBy: { periodKey: 'desc' }, take: 36,
          include: { invoice: { select: { id: true, number: true, status: true, totalAmount: true, dueDate: true } } },
        },
        history: { orderBy: { createdAt: 'desc' }, take: 100, include: { actorUser: { select: { id: true, name: true } } } },
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

  async preparePeriod(contractId: string, workspaceId: string, period: string, actorUserId: string) {
    try { return await prepareContractPeriod(prisma, contractId, workspaceId, period, actorUserId); }
    catch (error) {
      if (error instanceof ContractBillingError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  private validateBillingSettings(input: any) {
    if (input.billingAutoEmail && !input.billingEmailRecipients?.length) {
      throw new BadRequestException('Informe pelo menos um destinatário para ativar o email automático.');
    }
    if (input.billingAutoEmail && !input.billingAutoIssue) {
      throw new BadRequestException('Ative a emissão automática para programar o email.');
    }
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
    this.validateBillingSettings(input);
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

    if (input.billingEmailTemplateId && !await prisma.emailTemplate.findFirst({ where: { id: input.billingEmailTemplateId, workspaceId, active: true } })) throw new BadRequestException('Modelo de email não disponível neste workspace.');
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
        billingIssueDay: input.billingIssueDay ?? null,
        billingIssueTime: input.billingIssueTime,
        billingAutoIssue: input.billingAutoIssue,
        billingAutoEmail: input.billingAutoEmail,
        billingEmailRecipients: [...new Set(input.billingEmailRecipients.map(email => email.toLowerCase()))],
        billingWhatsappNumbers: [...new Set(input.billingWhatsappNumbers)],
        billingPaymentMethod: input.billingPaymentMethod,
        billingPixKey: input.billingPixKey || null,
        billingEmailTemplateId: input.billingEmailTemplateId || null,
        gatewayBillingType: input.gatewayBillingType || 'PIX',
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
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM contracts WHERE id = ${id}::uuid AND "workspaceId" = ${workspaceId}::uuid FOR UPDATE`;
      const contract = await tx.contract.findFirst({
        where: { id, workspaceId },
      });

      if (!contract) {
        throw new NotFoundException("Contrato não encontrado");
      }

      this.validateBillingSettings({ ...contract, ...input });
      if (input.clientId && input.clientId !== contract.clientId) {
        throw new BadRequestException('O cliente de um contrato existente não pode ser alterado. Crie outro contrato.');
      }
      const start = input.startDate ? new Date(input.startDate) : contract.startDate;
      const end = input.endDate !== undefined ? (input.endDate ? new Date(input.endDate) : null) : contract.endDate;
      if (end && end < start) throw new BadRequestException('O término não pode ser anterior ao início.');
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
        const policy = await tx.slaPolicy.findFirst({
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

      for (const field of ['billingIssueDay', 'billingIssueTime', 'billingAutoIssue', 'billingAutoEmail', 'billingEmailRecipients', 'billingWhatsappNumbers', 'billingPaymentMethod', 'billingPixKey', 'billingEmailTemplateId', 'gatewayBillingType'] as const) {
        if (input[field] !== undefined) data[field] = input[field];
      }
      if (data.billingEmailRecipients) data.billingEmailRecipients = [...new Set(data.billingEmailRecipients.map((email: string) => email.toLowerCase()))];
      if (input.billingEmailTemplateId && !await tx.emailTemplate.findFirst({ where: { id: input.billingEmailTemplateId, workspaceId, active: true } })) throw new BadRequestException('Modelo de email não disponível neste workspace.');
      const updatedContract = await tx.contract.update({
        where: { id },
        data,
      });

      const affectsRecurringItems = ['title', 'startDate', 'endDate', 'monthlyAmountCents', 'currency'].some(field => field in data && JSON.stringify(data[field]) !== JSON.stringify((contract as any)[field]));
      if (affectsRecurringItems) await tx.billingScheduleEvent.updateMany({ where: { contractId: id, workspaceId, invoice: { status: 'DRAFT' } }, data: { approvedAt: null, approvedById: null, emailTemplateSnapshot: Prisma.DbNull, needsRecurringRefresh: true } });

      // Write ContractHistory record
      await tx.contractHistory.create({
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

      await tx.auditLog.create({ data: { workspaceId, actorUserId, action: 'contract.updated', entityType: 'CONTRACT', entityId: id,
        beforeJson: JSON.stringify(before), afterJson: JSON.stringify(updatedContract), ipAddress, userAgent, severity: 'INFO' } });

      return updatedContract;
    });
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

  // Line-item changes and stale draft approval invalidation are atomic.
  private lineItemError(error: unknown): never {
    if (error instanceof ContractBillingError) {
      if (error.message.includes('não encontrado')) throw new NotFoundException(error.message);
      throw new BadRequestException(error.message);
    }
    throw error;
  }
  async addLineItem(contractId: string, input: ContractLineItemCreateInput, workspaceId: string, actorUserId: string, ipAddress?: string, userAgent?: string) {
    try { return await saveContractLineItem(prisma, workspaceId, contractId, input, actorUserId, undefined, { ipAddress, userAgent }); }
    catch (error) { return this.lineItemError(error); }
  }
  async updateLineItem(contractId: string, lineItemId: string, input: Partial<ContractLineItemCreateInput>, workspaceId: string, actorUserId: string, ipAddress?: string, userAgent?: string) {
    try { return await saveContractLineItem(prisma, workspaceId, contractId, input, actorUserId, lineItemId, { ipAddress, userAgent }); }
    catch (error) { return this.lineItemError(error); }
  }
  async deleteLineItem(contractId: string, lineItemId: string, workspaceId: string, actorUserId: string, ipAddress?: string, userAgent?: string) {
    try { return await removeContractLineItem(prisma, workspaceId, contractId, lineItemId, actorUserId, { ipAddress, userAgent }); }
    catch (error) { return this.lineItemError(error); }
  }
}
