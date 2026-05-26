import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, ClientStatus } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { WebhookEventsService } from "../webhooks/webhook-events.service";
import { ClientInput, ClientContactInput } from "@peanut/validators";

@Injectable()
export class ClientsService {
  constructor(
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
  ) {}

  async list(
    workspaceId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: ClientStatus;
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

    if (query.search) {
      const searchPattern = query.search;
      where.OR = [
        { legalName: { contains: searchPattern, mode: "insensitive" } },
        { tradeName: { contains: searchPattern, mode: "insensitive" } },
        { document: { contains: searchPattern, mode: "insensitive" } },
        { email: { contains: searchPattern, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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

  async getById(id: string, workspaceId: string) {
    const client = await prisma.client.findFirst({
      where: { id, workspaceId },
      include: {
        contacts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    return client;
  }

  async create(
    input: ClientInput,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await prisma.client.findFirst({
      where: { workspaceId, document: input.document },
    });

    if (existing) {
      throw new BadRequestException(
        "Já existe um cliente cadastrado com este documento",
      );
    }

    const newClient = await prisma.client.create({
      data: {
        workspaceId,
        type: "LEGAL_PERSON",
        legalName: input.legalName,
        tradeName: input.tradeName,
        document: input.document,
        email: input.email,
        phone: input.phone,
        website: input.website || null,
        notes: input.notes || null,
        status: "ACTIVE",
      },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client.created",
      entityType: "CLIENT",
      entityId: newClient.id,
      after: newClient,
      ipAddress,
      userAgent,
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "client.created",
        entityId: newClient.id,
        data: {
          clientId: newClient.id,
          tradeName: newClient.tradeName,
          legalName: newClient.legalName,
          document: newClient.document,
          status: newClient.status,
        },
      })
      .catch(() => {});

    return newClient;
  }

  async update(
    id: string,
    input: Partial<ClientInput>,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id, workspaceId },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    const before = { ...client };

    if (input.document && input.document !== client.document) {
      const existing = await prisma.client.findFirst({
        where: { workspaceId, document: input.document, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException(
          "Já existe um cliente cadastrado com este documento",
        );
      }
    }

    const data: any = {};
    if (input.legalName) data.legalName = input.legalName;
    if (input.tradeName) data.tradeName = input.tradeName;
    if (input.document) data.document = input.document;
    if (input.email) data.email = input.email;
    if (input.phone) data.phone = input.phone;
    if (input.website !== undefined) data.website = input.website || null;
    if (input.notes !== undefined) data.notes = input.notes || null;

    const updatedClient = await prisma.client.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client.updated",
      entityType: "CLIENT",
      entityId: id,
      before,
      after: updatedClient,
      ipAddress,
      userAgent,
    });

    this.webhookEvents
      .emit({
        workspaceId,
        eventType: "client.updated",
        entityId: id,
        data: {
          clientId: id,
          tradeName: updatedClient.tradeName,
          legalName: updatedClient.legalName,
          status: updatedClient.status,
        },
      })
      .catch(() => {});

    return updatedClient;
  }

  async updateStatus(
    id: string,
    status: ClientStatus,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id, workspaceId },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    const before = { ...client };

    const updatedClient = await prisma.client.update({
      where: { id },
      data: { status },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client.status_changed",
      entityType: "CLIENT",
      entityId: id,
      before,
      after: updatedClient,
      ipAddress,
      userAgent,
    });

    return updatedClient;
  }

  // --- CONTACTS CRUD ---

  async listContacts(clientId: string, workspaceId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    return prisma.clientContact.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createContact(
    clientId: string,
    input: ClientContactInput,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    if (input.isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId },
        data: { isPrimary: false },
      });
    }

    const newContact = await prisma.clientContact.create({
      data: {
        clientId,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        mobile: input.mobile || null,
        role: input.role || null,
        department: input.department || null,
        isPrimary: input.isPrimary,
        notes: input.notes || null,
        status: "ACTIVE",
      },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_contact.created",
      entityType: "CLIENT_CONTACT",
      entityId: newContact.id,
      after: newContact,
      ipAddress,
      userAgent,
    });

    return newContact;
  }

  async updateContact(
    clientId: string,
    contactId: string,
    input: Partial<ClientContactInput>,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    const contact = await prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });

    if (!contact) {
      throw new NotFoundException("Contato não encontrado");
    }

    const before = { ...contact };

    if (input.isPrimary === true && !contact.isPrimary) {
      await prisma.clientContact.updateMany({
        where: { clientId },
        data: { isPrimary: false },
      });
    }

    const data: any = {};
    if (input.name) data.name = input.name;
    if (input.email) data.email = input.email;
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.mobile !== undefined) data.mobile = input.mobile || null;
    if (input.role !== undefined) data.role = input.role || null;
    if (input.department !== undefined)
      data.department = input.department || null;
    if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary;
    if (input.notes !== undefined) data.notes = input.notes || null;

    const updatedContact = await prisma.clientContact.update({
      where: { id: contactId },
      data,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_contact.updated",
      entityType: "CLIENT_CONTACT",
      entityId: contactId,
      before,
      after: updatedContact,
      ipAddress,
      userAgent,
    });

    return updatedContact;
  }

  async deleteContact(
    clientId: string,
    contactId: string,
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });

    if (!client) {
      throw new NotFoundException("Cliente não encontrado");
    }

    const contact = await prisma.clientContact.findFirst({
      where: { id: contactId, clientId },
    });

    if (!contact) {
      throw new NotFoundException("Contato não encontrado");
    }

    await prisma.clientContact.delete({
      where: { id: contactId },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_contact.deleted",
      entityType: "CLIENT_CONTACT",
      entityId: contactId,
      before: contact,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }
}
