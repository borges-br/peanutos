import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { ContractsQuotaService } from "../contracts/contracts-quota.service";
import {
  ClientUserCreateInput,
  ClientUserUpdateInput,
} from "@peanut/validators";

@Injectable()
export class ClientUsersService {
  constructor(
    private readonly auditService: AuditService,
    private readonly contractsQuotaService: ContractsQuotaService,
  ) {}

  private async validateClientBelongsToWorkspace(
    clientId: string,
    workspaceId: string,
  ) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado neste workspace");
    }
    return client;
  }

  async list(
    workspaceId: string,
    clientId: string,
    query: { page?: number; limit?: number; search?: string; status?: string },
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
      clientId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { department: { contains: query.search, mode: "insensitive" } },
        { jobTitle: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.clientUser.count({ where }),
      prisma.clientUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: "asc" },
        include: {
          assets: {
            select: { id: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((item) => ({
        ...item,
        assetsCount: item.assets.length,
        assets: undefined, // Omit raw assets list to keep payload clean
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async getById(workspaceId: string, clientId: string, id: string) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const user = await prisma.clientUser.findFirst({
      where: { id, clientId, workspaceId },
      include: {
        assets: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Usuário do cliente não encontrado");
    }

    return user;
  }

  async create(
    workspaceId: string,
    clientId: string,
    input: ClientUserCreateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    // If email is filled, verify unique within client or workspace
    if (input.email) {
      const existing = await prisma.clientUser.findFirst({
        where: { workspaceId, clientId, email: input.email },
      });
      if (existing) {
        throw new BadRequestException(
          "Já existe um usuário cadastrado com este e-mail para este cliente",
        );
      }
    }

    // Verify quota
    if (input.status === "ACTIVE" || !input.status) {
      await this.contractsQuotaService.validateUserQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const newUser = await prisma.clientUser.create({
      data: {
        workspaceId,
        clientId,
        fullName: input.fullName,
        email: input.email || "",
        phone: input.phone || null,
        department: input.department || null,
        jobTitle: input.jobTitle || null,
        status: input.status || "ACTIVE",
        notes: input.notes || null,
      },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.created",
      entityType: "CLIENT_USER",
      entityId: newUser.id,
      after: newUser,
      ipAddress,
      userAgent,
    });

    return newUser;
  }

  async update(
    workspaceId: string,
    clientId: string,
    id: string,
    input: ClientUserUpdateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const user = await prisma.clientUser.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!user) {
      throw new NotFoundException("Usuário do cliente não encontrado");
    }

    const before = { ...user };

    if (input.email && input.email !== user.email) {
      const existing = await prisma.clientUser.findFirst({
        where: { workspaceId, clientId, email: input.email, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException(
          "Já existe um usuário cadastrado com este e-mail para este cliente",
        );
      }
    }

    const data: any = {};
    if (input.fullName !== undefined) data.fullName = input.fullName;
    if (input.email !== undefined) data.email = input.email || "";
    if (input.phone !== undefined) data.phone = input.phone || null;
    if (input.department !== undefined)
      data.department = input.department || null;
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.notes !== undefined) data.notes = input.notes || null;

    // Verify quota if reactivating
    if (input.status === "ACTIVE" && user.status !== "ACTIVE") {
      await this.contractsQuotaService.validateUserQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const updatedUser = await prisma.clientUser.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.updated",
      entityType: "CLIENT_USER",
      entityId: id,
      before,
      after: updatedUser,
      ipAddress,
      userAgent,
    });

    return updatedUser;
  }

  async updateStatus(
    workspaceId: string,
    clientId: string,
    id: string,
    status: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClientBelongsToWorkspace(clientId, workspaceId);

    const user = await prisma.clientUser.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!user) {
      throw new NotFoundException("Usuário do cliente não encontrado");
    }

    const before = { ...user };

    // Verify quota if reactivating
    if (status === "ACTIVE" && user.status !== "ACTIVE") {
      await this.contractsQuotaService.validateUserQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const updatedUser = await prisma.clientUser.update({
      where: { id },
      data: { status },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "client_user.status_changed",
      entityType: "CLIENT_USER",
      entityId: id,
      before,
      after: updatedUser,
      ipAddress,
      userAgent,
    });

    return updatedUser;
  }
}
