import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { prisma, AssetType, AssetStatus } from "@peanut/db";
import { AuditService } from "../audit/audit.service";
import { AssetCreateInput, AssetUpdateInput } from "@peanut/validators";
import { encryptSensitiveData, decryptSensitiveData } from "@peanut/utils";
import { ContractsQuotaService } from "../contracts/contracts-quota.service";

const QUOTA_COUNTED_ASSET_STATUSES = [
  "OPERATIONAL",
  "IN_MAINTENANCE",
  "OUT_OF_STANDARD",
  "IN_STOCK",
  "PENDING_REVIEW",
] as const;

@Injectable()
export class InventoryService {
  constructor(
    private readonly auditService: AuditService,
    private readonly contractsQuotaService: ContractsQuotaService,
  ) {}

  private async validateClient(clientId: string, workspaceId: string) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, workspaceId },
    });
    if (!client) {
      throw new NotFoundException("Cliente não encontrado neste workspace");
    }
    return client;
  }

  private isQuotaCountedStatus(status: string): boolean {
    return QUOTA_COUNTED_ASSET_STATUSES.includes(
      status as (typeof QUOTA_COUNTED_ASSET_STATUSES)[number],
    );
  }

  private async logAssetHistory(params: {
    workspaceId: string;
    clientId: string;
    assetId: string;
    actorUserId: string;
    event: string;
    description: string;
    before?: any;
    after?: any;
  }) {
    // Sanitise before and after to ensure sensitive data is not logged in asset history
    const sanitizeData = (data: any) => {
      if (!data) return null;
      const copy = { ...data };
      if (copy.sensitiveDataEncrypted)
        copy.sensitiveDataEncrypted = "[REDACTED]";
      if (copy.sensitiveData) copy.sensitiveData = "[REDACTED]";
      return JSON.stringify(copy);
    };

    await prisma.assetHistory.create({
      data: {
        workspaceId: params.workspaceId,
        clientId: params.clientId,
        assetId: params.assetId,
        actorUserId: params.actorUserId,
        event: params.event,
        description: params.description,
        before: sanitizeData(params.before),
        after: sanitizeData(params.after),
      },
    });
  }

  async listGlobal(
    workspaceId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      type?: string;
      clientId?: string;
    },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
    };

    if (query.clientId) {
      where.clientId = query.clientId;
    }
    if (query.status) {
      where.status = query.status as AssetStatus;
    }
    if (query.type) {
      where.type = query.type as AssetType;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { hostname: { contains: query.search, mode: "insensitive" } },
        { serialNumber: { contains: query.search, mode: "insensitive" } },
        { assetTag: { contains: query.search, mode: "insensitive" } },
        { location: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { id: true, legalName: true, tradeName: true },
          },
          assignedClientUser: {
            select: { id: true, fullName: true, email: true },
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

  async listByClient(
    workspaceId: string,
    clientId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      type?: string;
    },
  ) {
    await this.validateClient(clientId, workspaceId);
    return this.listGlobal(workspaceId, { ...query, clientId });
  }

  async getById(workspaceId: string, clientId: string, id: string) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
      include: {
        client: true,
        assignedClientUser: true,
        assetNotes: {
          orderBy: { createdAt: "desc" },
          include: {
            authorUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          include: {
            actorUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    return asset;
  }

  async create(
    workspaceId: string,
    clientId: string,
    input: AssetCreateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    // If clientUserId is provided, check if it exists and belongs to the client
    if (input.assignedClientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: input.assignedClientUserId, clientId, workspaceId },
      });
      if (!clientUser) {
        throw new NotFoundException("Usuário do cliente não encontrado");
      }
    }

    // Encrypt sensitive data if provided
    let sensitiveDataEncrypted: string | null = null;
    if (input.sensitiveDataEncrypted) {
      sensitiveDataEncrypted = encryptSensitiveData(
        input.sensitiveDataEncrypted,
      );
    }

    // Verify asset quota
    const isNewActive = this.isQuotaCountedStatus(input.status);
    if (isNewActive) {
      await this.contractsQuotaService.validateAssetQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const newAsset = await prisma.asset.create({
      data: {
        workspaceId,
        clientId,
        assignedClientUserId: input.assignedClientUserId || null,
        name: input.name,
        hostname: input.hostname || null,
        type: input.type as AssetType,
        status: input.status as AssetStatus,
        manufacturer: input.manufacturer || null,
        model: input.model || null,
        serialNumber: input.serialNumber || null,
        assetTag: input.assetTag || null,
        macAddress: input.macAddress || null,
        operatingSystem: input.operatingSystem || null,
        location: input.location || null,
        remoteAccessId: input.remoteAccessId || null,
        sensitiveDataEncrypted,
        notes: input.notes || null,
      },
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: newAsset.id,
      actorUserId,
      event: "ASSET_CREATED",
      description: `Ativo criado: ${newAsset.name} (${newAsset.type})`,
      after: newAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.created",
      entityType: "ASSET",
      entityId: newAsset.id,
      after: newAsset,
      ipAddress,
      userAgent,
    });

    return newAsset;
  }

  async update(
    workspaceId: string,
    clientId: string,
    id: string,
    input: AssetUpdateInput,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    const before = { ...asset };

    // If clientUserId is provided, check if it exists
    if (input.assignedClientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: input.assignedClientUserId, clientId, workspaceId },
      });
      if (!clientUser) {
        throw new NotFoundException("Usuário do cliente não encontrado");
      }
    }

    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.hostname !== undefined) data.hostname = input.hostname || null;
    if (input.type !== undefined) data.type = input.type as AssetType;
    if (input.status !== undefined) data.status = input.status as AssetStatus;
    if (input.manufacturer !== undefined)
      data.manufacturer = input.manufacturer || null;
    if (input.model !== undefined) data.model = input.model || null;
    if (input.serialNumber !== undefined)
      data.serialNumber = input.serialNumber || null;
    if (input.assetTag !== undefined) data.assetTag = input.assetTag || null;
    if (input.macAddress !== undefined)
      data.macAddress = input.macAddress || null;
    if (input.operatingSystem !== undefined)
      data.operatingSystem = input.operatingSystem || null;
    if (input.location !== undefined) data.location = input.location || null;
    if (input.remoteAccessId !== undefined)
      data.remoteAccessId = input.remoteAccessId || null;
    if (input.notes !== undefined) data.notes = input.notes || null;
    if (input.assignedClientUserId !== undefined)
      data.assignedClientUserId = input.assignedClientUserId;

    // Encrypt sensitive data if provided
    let isSensitiveUpdated = false;
    if (input.sensitiveDataEncrypted !== undefined) {
      data.sensitiveDataEncrypted = input.sensitiveDataEncrypted
        ? encryptSensitiveData(input.sensitiveDataEncrypted)
        : null;
      isSensitiveUpdated = true;
    }

    // Verify quota if reactivating asset
    if (input.status !== undefined) {
      const isCurrentlyActive = this.isQuotaCountedStatus(before.status);
      const isNextActive = this.isQuotaCountedStatus(input.status);
      if (isNextActive && !isCurrentlyActive) {
        await this.contractsQuotaService.validateAssetQuota(
          workspaceId,
          clientId,
          actorUserId,
          ipAddress,
          userAgent,
        );
      }
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data,
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: isSensitiveUpdated ? "SENSITIVE_DATA_UPDATED" : "ASSET_UPDATED",
      description: isSensitiveUpdated
        ? "Dados técnicos sensíveis atualizados"
        : "Especificações do ativo atualizadas",
      before,
      after: updatedAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: isSensitiveUpdated
        ? "asset.sensitive_data_updated"
        : "asset.updated",
      entityType: "ASSET",
      entityId: id,
      before,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
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
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    const before = { ...asset };

    // Verify quota if reactivating status
    const isCurrentlyActive = this.isQuotaCountedStatus(before.status);
    const isNextActive = this.isQuotaCountedStatus(status);
    if (isNextActive && !isCurrentlyActive) {
      await this.contractsQuotaService.validateAssetQuota(
        workspaceId,
        clientId,
        actorUserId,
        ipAddress,
        userAgent,
      );
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { status: status as AssetStatus },
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "STATUS_CHANGED",
      description: `Status alterado de ${before.status} para ${status}`,
      before,
      after: updatedAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.status_changed",
      entityType: "ASSET",
      entityId: id,
      before,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
  }

  async delete(
    workspaceId: string,
    clientId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    // Perform soft delete by changing status to RETIRED
    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { status: "RETIRED" },
    });

    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "STATUS_CHANGED",
      description: "Ativo arquivado (desativado)",
      before: asset,
      after: updatedAsset,
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.deleted_or_retired",
      entityType: "ASSET",
      entityId: id,
      before: asset,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
  }

  async assign(
    workspaceId: string,
    clientId: string,
    id: string,
    clientUserId: string | null,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    const before = { ...asset };

    let userFullName = "";
    if (clientUserId) {
      const clientUser = await prisma.clientUser.findFirst({
        where: { id: clientUserId, clientId, workspaceId },
      });
      if (!clientUser) {
        throw new NotFoundException("Usuário do cliente não encontrado");
      }
      userFullName = clientUser.fullName;
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: { assignedClientUserId: clientUserId || null },
    });

    // Write history
    const event = clientUserId ? "ASSIGNED" : "UNASSIGNED";
    const description = clientUserId
      ? `Ativo vinculado ao usuário: ${userFullName}`
      : "Ativo desvinculado do usuário";

    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event,
      description,
      before,
      after: updatedAsset,
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: clientUserId ? "asset.assigned" : "asset.unassigned",
      entityType: "ASSET",
      entityId: id,
      before,
      after: updatedAsset,
      ipAddress,
      userAgent,
    });

    return updatedAsset;
  }

  async revealSensitiveData(
    workspaceId: string,
    clientId: string,
    id: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    if (!asset.sensitiveDataEncrypted) {
      return { sensitiveData: null };
    }

    let sensitiveData = null;
    try {
      sensitiveData = decryptSensitiveData(asset.sensitiveDataEncrypted);
    } catch (e) {
      throw new BadRequestException(
        "Erro ao descriptografar dados sensíveis. Verifique a chave de criptografia.",
      );
    }

    // Write history (sanitized, only register that reveal happened)
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "SENSITIVE_DATA_REVEALED",
      description: "Credenciais e dados técnicos sensíveis visualizados",
    });

    // Write audit (sanitized)
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset.sensitive_data_revealed",
      entityType: "ASSET",
      entityId: id,
      ipAddress,
      userAgent,
      severity: "SECURITY_ALERT",
    });

    return { sensitiveData };
  }

  async createNote(
    workspaceId: string,
    clientId: string,
    id: string,
    content: string,
    visibility: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.validateClient(clientId, workspaceId);

    const asset = await prisma.asset.findFirst({
      where: { id, clientId, workspaceId },
    });

    if (!asset) {
      throw new NotFoundException("Ativo não encontrado");
    }

    // Blocks basic password/key texts in notes to follow simple sanitisation rules
    const lowerContent = content.toLowerCase();
    const blockedKeywords = [
      "senha",
      "password",
      "token",
      "secret",
      "api_key",
      "apikey",
    ];
    const containsSensitive = blockedKeywords.some((keyword) =>
      lowerContent.includes(keyword),
    );

    if (containsSensitive) {
      throw new BadRequestException(
        "Por motivos de segurança, notas técnicas não devem conter senhas ou tokens em texto puro. Por favor, use o campo de dados sensíveis criptografados.",
      );
    }

    const note = await prisma.assetNote.create({
      data: {
        workspaceId,
        clientId,
        assetId: id,
        authorUserId: actorUserId,
        content,
        visibility,
      },
    });

    // Write history
    await this.logAssetHistory({
      workspaceId,
      clientId,
      assetId: id,
      actorUserId,
      event: "NOTE_ADDED",
      description: "Nota técnica adicionada",
    });

    // Write audit
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "asset_note.created",
      entityType: "ASSET_NOTE",
      entityId: note.id,
      after: note,
      ipAddress,
      userAgent,
    });

    return note;
  }
}
