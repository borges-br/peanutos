import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { prisma } from "@peanut/db";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuditService } from "./audit.service";
import { auditLogQuerySchema } from "@peanut/validators";

@UseGuards(AuthGuard, RolesGuard)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(@Query() query: any, @CurrentUser() user: any) {
    const validation = auditLogQuerySchema.safeParse(query);
    if (!validation.success) {
      const messages = validation.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(messages);
    }

    const {
      page,
      limit,
      search,
      entityType,
      action,
      severity,
      actorUserId,
      dateFrom,
      dateTo,
    } = validation.data;

    const where: any = {
      workspaceId: user.workspaceId,
    };

    if (search) {
      const isUuid = (val: string) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(val);
      };

      const searchConditions: any[] = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { actorUser: { name: { contains: search, mode: "insensitive" } } },
      ];

      if (isUuid(search)) {
        searchConditions.push({ id: search });
        searchConditions.push({ entityId: search });
      }

      where.OR = searchConditions;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (action) {
      where.action = action;
    }

    if (severity) {
      where.severity = severity;
    }

    if (actorUserId) {
      where.actorUserId = actorUserId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const pageNum = Math.max(1, page || 1);
    const limitNum = Math.min(100, Math.max(1, limit || 20));
    const skip = (pageNum - 1) * limitNum;

    // Fetch data and count
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        include: {
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Distinct aggregates for filters
    const [distinctEntityTypes, distinctActions, distinctSeverities] =
      await Promise.all([
        prisma.auditLog.groupBy({
          by: ["entityType"],
          where: { workspaceId: user.workspaceId },
        }),
        prisma.auditLog.groupBy({
          by: ["action"],
          where: { workspaceId: user.workspaceId },
        }),
        prisma.auditLog.groupBy({
          by: ["severity"],
          where: { workspaceId: user.workspaceId },
        }),
      ]);

    // Metrics Summary
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sensitiveTerms = [
      "sensitive",
      "credential",
      "reveal",
      "secret",
      "password",
      "token",
      "webhook",
      "permission",
      "rbac",
    ];
    const sensitiveConditions = sensitiveTerms.flatMap((term) => [
      { action: { contains: term, mode: "insensitive" as const } },
      { entityType: { contains: term, mode: "insensitive" as const } },
    ]);

    const [
      totalLogsCount,
      securityAlertsCount,
      warningsCount,
      sensitiveActionsCount,
      last24hCount,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { workspaceId: user.workspaceId } }),
      prisma.auditLog.count({
        where: { workspaceId: user.workspaceId, severity: "SECURITY_ALERT" },
      }),
      prisma.auditLog.count({
        where: { workspaceId: user.workspaceId, severity: "WARN" },
      }),
      prisma.auditLog.count({
        where: {
          workspaceId: user.workspaceId,
          OR: sensitiveConditions,
        },
      }),
      prisma.auditLog.count({
        where: {
          workspaceId: user.workspaceId,
          createdAt: { gte: oneDayAgo },
        },
      }),
    ]);

    const isReadOnly = user.role === "READ_ONLY";

    const mappedData = logs.map((log) => {
      let beforeJsonParsed: any = null;
      let afterJsonParsed: any = null;

      if (!isReadOnly) {
        if (log.beforeJson) {
          try {
            beforeJsonParsed = JSON.parse(log.beforeJson);
            beforeJsonParsed = this.auditService.sanitizeForRead(
              beforeJsonParsed,
              user.role,
            );
          } catch (e) {
            beforeJsonParsed = null;
          }
        }
        if (log.afterJson) {
          try {
            afterJsonParsed = JSON.parse(log.afterJson);
            afterJsonParsed = this.auditService.sanitizeForRead(
              afterJsonParsed,
              user.role,
            );
          } catch (e) {
            afterJsonParsed = null;
          }
        }
      }

      return {
        id: log.id,
        createdAt: log.createdAt,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        severity: log.severity,
        actor: log.actorUser
          ? {
              id: log.actorUser.id,
              name: log.actorUser.name,
              email: log.actorUser.email,
              role: log.actorUser.role,
            }
          : null,
        ipAddress: isReadOnly ? null : log.ipAddress,
        userAgent: isReadOnly ? null : log.userAgent,
        beforeJson: isReadOnly ? null : beforeJsonParsed,
        afterJson: isReadOnly ? null : afterJsonParsed,
      };
    });

    return {
      data: mappedData,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      summary: {
        totalLogs: totalLogsCount,
        sensitiveActions: sensitiveActionsCount,
        securityAlerts: securityAlertsCount,
        warnings: warningsCount,
        last24h: last24hCount,
      },
      filters: {
        entityTypes: distinctEntityTypes.map((x) => x.entityType),
        actions: distinctActions.map((x) => x.action),
        severities: distinctSeverities.map((x) => x.severity),
      },
    };
  }

  @Roles("OWNER", "ADMIN", "FINANCIAL", "TECHNICIAN")
  @Get(":auditLogId")
  async getById(
    @Param("auditLogId") auditLogId: string,
    @CurrentUser() user: any,
  ) {
    const log = await prisma.auditLog.findUnique({
      where: { id: auditLogId },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!log || log.workspaceId !== user.workspaceId) {
      throw new NotFoundException("Log de auditoria não encontrado");
    }

    let beforeJsonParsed: any = null;
    let afterJsonParsed: any = null;

    if (log.beforeJson) {
      try {
        beforeJsonParsed = JSON.parse(log.beforeJson);
        beforeJsonParsed = this.auditService.sanitizeForRead(
          beforeJsonParsed,
          user.role,
        );
      } catch (e) {
        beforeJsonParsed = null;
      }
    }
    if (log.afterJson) {
      try {
        afterJsonParsed = JSON.parse(log.afterJson);
        afterJsonParsed = this.auditService.sanitizeForRead(
          afterJsonParsed,
          user.role,
        );
      } catch (e) {
        afterJsonParsed = null;
      }
    }

    return {
      id: log.id,
      createdAt: log.createdAt,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      severity: log.severity,
      actor: log.actorUser
        ? {
            id: log.actorUser.id,
            name: log.actorUser.name,
            email: log.actorUser.email,
            role: log.actorUser.role,
          }
        : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      beforeJson: beforeJsonParsed,
      afterJson: afterJsonParsed,
    };
  }
}
