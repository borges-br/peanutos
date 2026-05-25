import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  prisma,
  TicketStatus,
  TicketPriority,
  TicketChannel,
} from "@peanut/db";
import { SlaService } from "./sla.service";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import { isValidTransition } from "./ticket-state-machine";

const FORBIDDEN_WORDS = [
  "senha",
  "password",
  "token",
  "secret",
  "api_key",
  "credential",
  "authorization",
];

@Injectable()
export class TicketsService {
  constructor(
    private readonly slaService: SlaService,
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

  async listSlaPolicies(workspaceId: string) {
    return prisma.slaPolicy.findMany({
      where: { workspaceId, active: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  }

  /**
   * Helper to generate a human-readable incrementing ticket number safely.
   */
  private async generateTicketNumber(): Promise<string> {
    // Basic atomic-like increment fallback inside a select query
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { createdAt: "desc" },
      select: { number: true },
    });

    let nextNum = 1;
    if (lastTicket && lastTicket.number.startsWith("TCK-")) {
      const lastNumStr = lastTicket.number.replace("TCK-", "");
      const parsed = parseInt(lastNumStr, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }

    return `TCK-${String(nextNum).padStart(6, "0")}`;
  }

  /**
   * Lists tickets with dynamic query filters and workspace isolation.
   */
  async list(
    workspaceId: string,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      clientId?: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedToId?: string;
    },
  ) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { number: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, tradeName: true, legalName: true } },
          contact: { select: { id: true, name: true, email: true } },
          clientUser: { select: { id: true, fullName: true, email: true } },
          asset: { select: { id: true, name: true, type: true } },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  /**
   * Fetches a single ticket with details.
   */
  async getById(id: string, workspaceId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        contact: true,
        clientUser: true,
        asset: true,
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          include: {
            actorUser: { select: { id: true, name: true } },
          },
        },
        timeEntries: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    return ticket;
  }

  /**
   * Creates a new ticket.
   */
  async create(
    data: {
      title: string;
      description: string;
      priority: TicketPriority;
      channel: TicketChannel;
      clientId: string;
      contactId?: string | null;
      clientUserId?: string | null;
      assetId?: string | null;
      assignedToId?: string | null;
      category?: string | null;
      subcategory?: string | null;
    },
    workspaceId: string,
    actorUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Entity Validations
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, workspaceId },
    });
    if (!client) {
      throw new BadRequestException("Cliente não encontrado no workspace.");
    }

    if (data.contactId) {
      const contact = await prisma.clientContact.findFirst({
        where: { id: data.contactId, clientId: data.clientId },
      });
      if (!contact) {
        throw new BadRequestException(
          "Contato não pertence ao cliente informado.",
        );
      }
    }

    if (data.clientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: data.clientUserId, clientId: data.clientId, workspaceId },
      });
      if (!clientUser) {
        throw new BadRequestException(
          "Usuário final não pertence ao cliente informado.",
        );
      }
    }

    if (data.assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: data.assetId, clientId: data.clientId, workspaceId },
      });
      if (!asset) {
        throw new BadRequestException(
          "Ativo não pertence ao cliente informado.",
        );
      }
    }

    if (data.assignedToId) {
      const technician = await prisma.user.findFirst({
        where: { id: data.assignedToId, workspaceId, status: "ACTIVE" },
      });
      if (!technician) {
        throw new BadRequestException(
          "Técnico designado não encontrado ou inativo no workspace.",
        );
      }
    }

    // 2. Generate incremental Ticket Number
    const ticketNumber = await this.generateTicketNumber();

    // 3. Compute SLAs
    const openedAt = new Date();
    const sla = await this.slaService.calculateSla(
      workspaceId,
      data.priority,
      openedAt,
      data.clientId,
    );

    // 4. Create Ticket inside Transaction to guarantee history creation
    const ticket = await prisma.$transaction(async (tx) => {
      const newTicket = await tx.ticket.create({
        data: {
          workspaceId,
          clientId: data.clientId,
          contactId: data.contactId || null,
          clientUserId: data.clientUserId || null,
          assetId: data.assetId || null,
          contractId: sla.contractId,
          slaPolicyId: sla.slaPolicyId,
          number: ticketNumber,
          title: data.title,
          description: data.description,
          channel: data.channel,
          priority: data.priority,
          status: "OPEN",
          assignedToId: data.assignedToId || null,
          openedAt,
          slaDueFirstResponseAt: sla.slaDueFirstResponseAt,
          slaDueStartAt: sla.slaDueStartAt,
          slaDueResolutionAt: sla.slaDueResolutionAt,
        },
      });

      await tx.ticketHistory.create({
        data: {
          workspaceId,
          ticketId: newTicket.id,
          actorUserId,
          event: "TICKET_CREATED",
          description: `Chamado criado com o número ${ticketNumber} canal ${data.channel}.`,
          after: JSON.stringify({ status: "OPEN", priority: data.priority }),
        },
      });

      return newTicket;
    });

    // 5. Audit Log (asynchronous)
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "ticket.created",
      entityType: "TICKET",
      entityId: ticket.id,
      after: ticket,
      ipAddress,
      userAgent,
    });

    // 6. Emit webhook event (non-blocking)
    this.webhookEvents.emit({
      workspaceId,
      eventType: 'ticket.created',
      entityId: ticket.id,
      data: { ticketId: ticket.id, number: ticket.number, title: ticket.title, status: ticket.status, priority: ticket.priority, clientId: ticket.clientId },
    }).catch(() => {});

    return ticket;
  }

  /**
   * Updates standard ticket parameters (excluding status and assignment triggers).
   */
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: TicketPriority;
      contactId?: string | null;
      clientUserId?: string | null;
      assetId?: string | null;
    },
    workspaceId: string,
    actorUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const original = await this.getById(id, workspaceId);

    const updateData: any = {};
    const historyEvents: any[] = [];

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;

    if (data.contactId !== undefined) {
      if (data.contactId) {
        const contact = await prisma.clientContact.findFirst({
          where: { id: data.contactId, clientId: original.clientId },
        });
        if (!contact) {
          throw new BadRequestException(
            "Contato não pertence ao cliente informado.",
          );
        }
      }
      updateData.contactId = data.contactId;
    }

    if (data.clientUserId !== undefined) {
      if (data.clientUserId) {
        const clientUser = await prisma.clientUser.findFirst({
          where: {
            id: data.clientUserId,
            clientId: original.clientId,
            workspaceId,
          },
        });
        if (!clientUser) {
          throw new BadRequestException(
            "Usuário final não pertence ao cliente informado.",
          );
        }
      }
      updateData.clientUserId = data.clientUserId;
    }

    if (data.assetId !== undefined) {
      if (data.assetId) {
        const asset = await prisma.asset.findFirst({
          where: { id: data.assetId, clientId: original.clientId, workspaceId },
        });
        if (!asset) {
          throw new BadRequestException(
            "Ativo não pertence ao cliente informado.",
          );
        }
      }
      updateData.assetId = data.assetId;
    }

    if (data.priority && data.priority !== original.priority) {
      updateData.priority = data.priority;
      // Re-calculate SLA deadlines if priority shifts on active ticket
      if (["OPEN", "TRIAGE", "IN_PROGRESS"].includes(original.status)) {
        const sla = await this.slaService.calculateSla(
          workspaceId,
          data.priority,
          original.openedAt,
          original.clientId,
        );
        updateData.slaPolicyId = sla.slaPolicyId;
        updateData.slaDueFirstResponseAt = sla.slaDueFirstResponseAt;
        updateData.slaDueStartAt = sla.slaDueStartAt;
        updateData.slaDueResolutionAt = sla.slaDueResolutionAt;
      }
      historyEvents.push({
        event: "PRIORITY_CHANGED",
        description: `Prioridade alterada de ${original.priority} para ${data.priority}.`,
        before: original.priority,
        after: data.priority,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: updateData,
      });

      for (const event of historyEvents) {
        await tx.ticketHistory.create({
          data: {
            workspaceId,
            ticketId: id,
            actorUserId,
            event: event.event,
            description: event.description,
            before: event.before,
            after: event.after,
          },
        });
      }

      return ticket;
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "ticket.updated",
      entityType: "TICKET",
      entityId: id,
      before: original,
      after: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Transitions ticket status based on strict state machine validations.
   */
  async updateStatus(
    id: string,
    status: TicketStatus,
    workspaceId: string,
    actorUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const original = await this.getById(id, workspaceId);

    if (!isValidTransition(original.status, status)) {
      throw new BadRequestException(
        `Transição de status inválida de ${original.status} para ${status}.`,
      );
    }

    const updateData: any = { status };
    const now = new Date();

    // Auto-update timelines depending on status transitions
    if (status === "IN_PROGRESS") {
      if (!original.startedAt) {
        updateData.startedAt = now;
      }
      if (!original.firstResponseAt) {
        updateData.firstResponseAt = now;
      }
    } else if (status === "RESOLVED") {
      if (!original.resolvedAt) {
        updateData.resolvedAt = now;
      }
    } else if (status === "CLOSED") {
      if (!original.closedAt) {
        updateData.closedAt = now;
      }
    } else if (status === "CANCELLED") {
      if (!original.closedAt) {
        updateData.closedAt = now;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: updateData,
      });

      await tx.ticketHistory.create({
        data: {
          workspaceId,
          ticketId: id,
          actorUserId,
          event: "STATUS_CHANGED",
          description: `Status do chamado alterado de ${original.status} para ${status}.`,
          before: original.status,
          after: status,
        },
      });

      return ticket;
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: `ticket.status_changed`,
      entityType: "TICKET",
      entityId: id,
      before: { status: original.status },
      after: { status: updated.status },
      ipAddress,
      userAgent,
    });

    this.webhookEvents.emit({
      workspaceId,
      eventType: 'ticket.status_changed',
      entityId: id,
      data: { ticketId: id, number: original.number, oldStatus: original.status, newStatus: status },
    }).catch(() => {});

    return updated;
  }

  /**
   * Assigns a technician to a ticket.
   */
  async assign(
    id: string,
    assignedToId: string | null,
    workspaceId: string,
    actorUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const original = await this.getById(id, workspaceId);
    let techName = "Desatribuído";

    if (assignedToId) {
      const technician = await prisma.user.findFirst({
        where: { id: assignedToId, workspaceId, status: "ACTIVE" },
      });
      if (!technician) {
        throw new BadRequestException(
          "Técnico inativo ou inexistente no workspace.",
        );
      }
      techName = technician.name;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id },
        data: { assignedToId },
      });

      await tx.ticketHistory.create({
        data: {
          workspaceId,
          ticketId: id,
          actorUserId,
          event: "ASSIGNED",
          description: assignedToId
            ? `Chamado atribuído ao técnico ${techName}.`
            : "Chamado removido de técnico designado.",
          before: original.assignedToId || undefined,
          after: assignedToId || undefined,
        },
      });

      return ticket;
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "ticket.assigned",
      entityType: "TICKET",
      entityId: id,
      before: { assignedToId: original.assignedToId },
      after: { assignedToId: updated.assignedToId },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Posts technical comments inside the ticket history.
   */
  async createComment(
    ticketId: string,
    data: { content: string; visibility: string },
    workspaceId: string,
    actorUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Verify ticket bounds
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    // 2. Sensitive plain text credentials verification
    const contentLower = data.content.toLowerCase();
    const foundWord = FORBIDDEN_WORDS.find((word) =>
      contentLower.includes(word),
    );
    if (foundWord) {
      throw new BadRequestException(
        `O comentário contém termos confidenciais (${foundWord}) e foi bloqueado por segurança.`,
      );
    }

    const isInternal = data.visibility === "INTERNAL";

    // 3. Create inside transaction
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.ticketComment.create({
        data: {
          workspaceId,
          ticketId,
          userId: actorUserId,
          content: data.content,
          isInternal,
          visibility: data.visibility,
        },
      });

      // If this comment is written by a technician/admin, mark first response if open
      if (!ticket.firstResponseAt) {
        await tx.ticket.update({
          where: { id: ticketId },
          data: { firstResponseAt: new Date() },
        });

        await tx.ticketHistory.create({
          data: {
            workspaceId,
            ticketId,
            actorUserId,
            event: "FIRST_RESPONSE_RECORDED",
            description:
              "Tempo de Primeira Resposta (SLA) registrado com sucesso.",
          },
        });
      }

      await tx.ticketHistory.create({
        data: {
          workspaceId,
          ticketId,
          actorUserId,
          event: "COMMENT_ADDED",
          description: `Novo comentário adicionado (${isInternal ? "Interno" : "Público"}).`,
        },
      });

      return newComment;
    });

    // 4. Audit Log (Notice: content field is omitted/sanitized to prevent logging plain credentials)
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "ticket.comment_created",
      entityType: "TICKET_COMMENT",
      entityId: comment.id,
      after: {
        id: comment.id,
        visibility: comment.visibility,
        isInternal: comment.isInternal,
      },
      ipAddress,
      userAgent,
    });

    return comment;
  }

  /**
   * Retrieves comments on a ticket.
   */
  async listComments(ticketId: string, workspaceId: string) {
    // Workspace-isolated verification
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    return prisma.ticketComment.findMany({
      where: { ticketId, workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });
  }

  /**
   * Logs technical working time entries on tickets.
   */
  async createTimeEntry(
    ticketId: string,
    data: {
      startedAt: string;
      endedAt?: string | null;
      description: string;
      billable: boolean;
    },
    workspaceId: string,
    actorUserId: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    const start = new Date(data.startedAt);
    let end: Date | null = null;
    let durationMinutes: number | null = null;

    if (data.endedAt) {
      end = new Date(data.endedAt);
      if (end < start) {
        throw new BadRequestException(
          "A data de término não pode ser anterior à data de início.",
        );
      }
      const diffMs = end.getTime() - start.getTime();
      durationMinutes = Math.floor(diffMs / 60000);
      if (durationMinutes < 0) {
        throw new BadRequestException(
          "A duração calculada não pode ser negativa.",
        );
      }
    }

    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.ticketTimeEntry.create({
        data: {
          workspaceId,
          ticketId,
          userId: actorUserId,
          startedAt: start,
          endedAt: end,
          durationMinutes,
          description: data.description,
          billable: data.billable,
        },
      });

      await tx.ticketHistory.create({
        data: {
          workspaceId,
          ticketId,
          actorUserId,
          event: "TIME_ENTRY_CREATED",
          description: `Apontamento de tempo de ${durationMinutes || 0} minutos registrado.`,
        },
      });

      return newEntry;
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "ticket.time_entry_created",
      entityType: "TICKET_TIME_ENTRY",
      entityId: entry.id,
      after: { id: entry.id, durationMinutes, billable: entry.billable },
      ipAddress,
      userAgent,
    });

    return entry;
  }

  /**
   * Lists logged technical hours.
   */
  async listTimeEntries(ticketId: string, workspaceId: string) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, workspaceId },
    });
    if (!ticket) {
      throw new NotFoundException("Chamado não encontrado.");
    }

    return prisma.ticketTimeEntry.findMany({
      where: { ticketId, workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }
}
