import { Injectable } from "@nestjs/common";
import { prisma, BillingScheduleStatus } from "@peanut/db";
import { dateKey, calendarDateKey, zonedDateTime } from "@peanut/utils";
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
    const now = new Date();
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { timeZone: true } });
    const today = dateKey(now, workspace.timeZone);
    const period = today.slice(0, 7);
    const [year, month] = period.split('-').map(Number);
    const monthStart = zonedDateTime(`${period}-01`, workspace.timeZone);
    const nextMonthStart = zonedDateTime(new Date(Date.UTC(year!, month!, 1)).toISOString().slice(0, 10), workspace.timeZone);

    const [recurringContracts, contractsByStatusRaw, billingEvents, paidInvoices] =
      await Promise.all([
        prisma.contract.findMany({
          where: {
            workspaceId,
            status: "ACTIVE",
            type: {
              in: ["RECURRING_SUPPORT", "HYBRID"],
            },
          },
          select: {
            monthlyAmountCents: true, startDate: true, endDate: true,
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
        prisma.invoice.findMany({
          where: {
            workspaceId,
            status: "PAID",
            paidAt: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
          select: {
            totalAmount: true,
            subtotalMaterialCost: true,
            subtotalServices: true,
            subtotalMaterials: true,
            discountAmount: true,
          },
        }),
      ]);

    // Compute metrics
    const effectiveContracts = recurringContracts.filter(contract => calendarDateKey(contract.startDate, workspace.timeZone) <= today && (!contract.endDate || calendarDateKey(contract.endDate, workspace.timeZone) >= today));
    const totalMrrCents = effectiveContracts.reduce(
      (acc, c) => acc + c.monthlyAmountCents,
      0,
    );

    const activeContractsCount = effectiveContracts.length;

    const averageContractValueCents =
      activeContractsCount > 0
        ? Math.round(totalMrrCents / activeContractsCount)
        : 0;

    const toCents = (value: any) => Math.round(Number(value || 0) * 100);
    const monthlyReceivedCents = paidInvoices.reduce(
      (acc, invoice) => acc + toCents(invoice.totalAmount),
      0,
    );
    const monthlyMaterialCostCents = paidInvoices.reduce(
      (acc, invoice) => acc + toCents((invoice as any).subtotalMaterialCost),
      0,
    );
    const monthlyNetReceivedCents =
      monthlyReceivedCents - monthlyMaterialCostCents;
    const monthlyServicesCents = paidInvoices.reduce(
      (acc, invoice) => acc + toCents(invoice.subtotalServices),
      0,
    );
    const monthlyMaterialsSoldCents = paidInvoices.reduce(
      (acc, invoice) => acc + toCents(invoice.subtotalMaterials),
      0,
    );
    const monthlyDiscountsCents = paidInvoices.reduce(
      (acc, invoice) => acc + toCents(invoice.discountAmount),
      0,
    );

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
      monthlyReceived: {
        period,
        paidInvoices: paidInvoices.length,
        grossReceivedCents: monthlyReceivedCents,
        materialCostCents: monthlyMaterialCostCents,
        netReceivedCents: monthlyNetReceivedCents,
        servicesCents: monthlyServicesCents,
        materialsSoldCents: monthlyMaterialsSoldCents,
        discountsCents: monthlyDiscountsCents,
      },
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
