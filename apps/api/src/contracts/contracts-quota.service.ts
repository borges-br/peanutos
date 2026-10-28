import { Injectable, BadRequestException } from "@nestjs/common";
import { prisma } from "@peanut/db";
import { calendarDateKey, dateKey } from "@peanut/utils";
import { AuditService } from "../audit/audit.service";

const QUOTA_COUNTED_ASSET_STATUSES = [
  "OPERATIONAL",
  "IN_MAINTENANCE",
  "OUT_OF_STANDARD",
  "IN_STOCK",
  "PENDING_REVIEW",
] as const;

export interface QuotaDetails {
  hasActiveContract: boolean;
  contractNumber?: string | null;
  contractTitle?: string | null;
  maxUsers: number | null;
  usedUsers: number;
  maxAssets: number | null;
  usedAssets: number;
  includedRemoteTickets: number | null;
  includedOnsiteVisits: number | null;
  includedRemoteHours: number | null;
  includedOnsiteHours: number | null;
}

@Injectable()
export class ContractsQuotaService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Resolves the single primary active contract for a client.
   */
  async getActiveContract(workspaceId: string, clientId: string) {
    const candidates = await prisma.contract.findMany({
      where: { workspaceId, clientId, status: 'ACTIVE', type: { in: ['RECURRING_SUPPORT', 'HYBRID'] } },
      include: { workspace: { select: { timeZone: true } } },
    });
    return candidates.find(contract => {
      const today = dateKey(new Date(), contract.workspace.timeZone);
      return calendarDateKey(contract.startDate, contract.workspace.timeZone) <= today && (!contract.endDate || calendarDateKey(contract.endDate, contract.workspace.timeZone) >= today);
    }) || null;
  }

  /**
   * Validates if the client has room to add another active ClientUser.
   */
  async validateUserQuota(
    workspaceId: string,
    clientId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const contract = await this.getActiveContract(workspaceId, clientId);
    if (
      !contract ||
      contract.maxUsers === null ||
      contract.maxUsers === undefined
    ) {
      return; // No limit defined
    }

    const currentCount = await prisma.clientUser.count({
      where: {
        workspaceId,
        clientId,
        status: "ACTIVE",
      },
    });

    if (currentCount >= contract.maxUsers) {
      // Log audit trail event
      await this.auditService.log({
        workspaceId,
        actorUserId: actorUserId || null,
        action: "contract.quota_limit_reached",
        entityType: "CONTRACT",
        entityId: contract.id,
        before: {
          type: "USER_LIMIT",
          maxUsers: contract.maxUsers,
          currentCount,
        },
        after: null,
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "System",
        severity: "WARN",
      });

      throw new BadRequestException(
        "Limite de usuários do contrato atingido. Faça upgrade no contrato do cliente.",
      );
    }
  }

  /**
   * Validates if the client has room to add another active Asset.
   */
  async validateAssetQuota(
    workspaceId: string,
    clientId: string,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const contract = await this.getActiveContract(workspaceId, clientId);
    if (
      !contract ||
      contract.maxAssets === null ||
      contract.maxAssets === undefined
    ) {
      return; // No limit defined
    }

    const currentCount = await prisma.asset.count({
      where: {
        workspaceId,
        clientId,
        status: {
          in: [...QUOTA_COUNTED_ASSET_STATUSES],
        },
      },
    });

    if (currentCount >= contract.maxAssets) {
      // Log audit trail event
      await this.auditService.log({
        workspaceId,
        actorUserId: actorUserId || null,
        action: "contract.quota_limit_reached",
        entityType: "CONTRACT",
        entityId: contract.id,
        before: {
          type: "ASSET_LIMIT",
          maxAssets: contract.maxAssets,
          currentCount,
        },
        after: null,
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "System",
        severity: "WARN",
      });

      throw new BadRequestException(
        "Limite de ativos do contrato atingido. Faça upgrade no contrato do cliente.",
      );
    }
  }

  /**
   * Retrieves full utilization data for display in dashboards and widgets.
   */
  async getClientQuotaDetails(
    workspaceId: string,
    clientId: string,
  ): Promise<QuotaDetails> {
    const contract = await this.getActiveContract(workspaceId, clientId);

    const [usedUsers, usedAssets] = await Promise.all([
      prisma.clientUser.count({
        where: {
          workspaceId,
          clientId,
          status: "ACTIVE",
        },
      }),
      prisma.asset.count({
        where: {
          workspaceId,
          clientId,
          status: {
            in: [...QUOTA_COUNTED_ASSET_STATUSES],
          },
        },
      }),
    ]);

    return {
      hasActiveContract: !!contract,
      contractNumber: contract?.number || null,
      contractTitle: contract?.title || null,
      maxUsers: contract?.maxUsers ?? null,
      usedUsers,
      maxAssets: contract?.maxAssets ?? null,
      usedAssets,
      includedRemoteTickets: contract?.includedRemoteTickets ?? null,
      includedOnsiteVisits: contract?.includedOnsiteVisits ?? null,
      includedRemoteHours: contract?.includedRemoteHours ?? null,
      includedOnsiteHours: contract?.includedOnsiteHours ?? null,
    };
  }
}
