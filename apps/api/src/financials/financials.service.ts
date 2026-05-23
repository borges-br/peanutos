import { Injectable } from "@nestjs/common";
import { prisma, BillingScheduleStatus } from "@peanut/db";
import { AuditService } from "../audit/audit.service";

@Injectable()
export class FinancialsService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Calculates MRR, contract counts, averages, status distributions, and loads upcoming billing agendas.
   */
  async getMrrMetrics(
    workspaceId: string,
    actorUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const [recurringContracts, contractsByStatusRaw, billingEvents] =
      await Promise.all([
        prisma.contract.findMany({
          where: {
            workspaceId,
            status: "ACTIVE",
            type: {
              in: ["RECURRING_SUPPORT", "HYBRID"],
            },
            monthlyAmountCents: { gt: 0 },
          },
          select: {
            monthlyAmountCents: true,
          },
        }),
        prisma.contract.groupBy({
          by: ["status"],
          where: { workspaceId },
          _count: {
            id: true,
          },
        }),
        prisma.billingScheduleEvent.findMany({
          where: {
            workspaceId,
            status: "PENDING",
          },
          orderBy: {
            scheduledFor: "asc",
          },
          take: 10,
          include: {
            client: {
              select: {
                tradeName: true,
                legalName: true,
              },
            },
            contract: {
              select: {
                number: true,
                title: true,
              },
            },
          },
        }),
      ]);

    // Compute metrics
    const totalMrrCents = recurringContracts.reduce(
      (acc, c) => acc + c.monthlyAmountCents,
      0,
    );

    const activeContractsCount = await prisma.contract.count({
      where: {
        workspaceId,
        status: "ACTIVE",
        type: {
          in: ["RECURRING_SUPPORT", "HYBRID"],
        },
      },
    });

    const averageContractValueCents =
      activeContractsCount > 0
        ? Math.round(totalMrrCents / activeContractsCount)
        : 0;

    // Formulate status breakdown object
    const contractsByStatus = contractsByStatusRaw.reduce((acc: any, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {});

    // Audit Log
    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "financials.mrr_viewed",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      after: { totalMrrCents, activeContractsCount },
      ipAddress,
      userAgent,
    });

    return {
      totalMrrCents,
      activeContracts: activeContractsCount,
      averageContractValueCents,
      contractsByStatus,
      nextBillingEvents: billingEvents,
    };
  }

  /**
   * Queries general scheduled billing occurrences with filter tags.
   */
  async getBillingSchedule(
    workspaceId: string,
    actorUserId: string,
    query: {
      status?: BillingScheduleStatus;
      contractId?: string;
      clientId?: string;
      page?: number;
      limit?: number;
    },
    ipAddress?: string,
    userAgent?: string,
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

    if (query.contractId) {
      where.contractId = query.contractId;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    const [total, data] = await Promise.all([
      prisma.billingScheduleEvent.count({ where }),
      prisma.billingScheduleEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledFor: "desc" },
        include: {
          client: {
            select: {
              tradeName: true,
              legalName: true,
            },
          },
          contract: {
            select: {
              number: true,
              title: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: "financials.billing_schedule_viewed",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      after: {
        filters: {
          status: query.status,
          contractId: query.contractId,
          clientId: query.clientId,
        },
        total,
      },
      ipAddress,
      userAgent,
    });

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
}
