import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@peanut/db';
import { Queue } from 'bullmq';
import { AuditService } from '../audit/audit.service';
import {
  CreateWebhookEndpointInput,
  UpdateWebhookEndpointInput,
  WebhookDeliveryQueryInput,
  CreateInboundWebhookInput,
  UpdateInboundWebhookInput,
} from '@peanut/validators';
import {
  generateWebhookSecret,
  encryptSecret,
  decryptSecret,
  computeHmacSignature,
} from './webhook-signing';
import { WebhookEventsService } from './webhook-events.service';

const MANAGE_ROLES = ['OWNER', 'ADMIN'];
const VIEW_ROLES = ['OWNER', 'ADMIN', 'READ_ONLY'];

@Injectable()
export class WebhooksService {
  private readonly dispatchQueue: Queue;

  constructor(
    private readonly auditService: AuditService,
    private readonly webhookEvents: WebhookEventsService,
  ) {
    this.dispatchQueue = new Queue('webhook-dispatch', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || 'change-me-in-production',
      },
    });
  }

  private assertCanManage(role: string) {
    if (!MANAGE_ROLES.includes(role)) {
      throw new ForbiddenException('Permissão insuficiente para gerenciar webhooks');
    }
  }

  private assertCanView(role: string) {
    if (!VIEW_ROLES.includes(role)) {
      throw new ForbiddenException('Permissão insuficiente para visualizar webhooks');
    }
  }

  private sanitizeEndpoint(endpoint: any) {
    const { encryptedSecret, ...safe } = endpoint;
    return safe;
  }

  async list(workspaceId: string, requesterRole: string) {
    this.assertCanView(requesterRole);

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { deliveries: true } },
      },
    });

    return endpoints;
  }

  async getById(id: string, workspaceId: string, requesterRole: string) {
    this.assertCanView(requesterRole);

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!endpoint) throw new NotFoundException('Webhook não encontrado');
    return endpoint;
  }

  async create(
    input: CreateWebhookEndpointInput,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const plainSecret = generateWebhookSecret();
    const encrypted = encryptSecret(plainSecret);

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        workspaceId,
        name: input.name,
        url: input.url,
        events: input.events,
        isActive: input.isActive ?? true,
        encryptedSecret: encrypted,
        createdById: actorUserId,
      },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'webhook.created',
      entityType: 'WEBHOOK',
      entityId: endpoint.id,
      after: { id: endpoint.id, name: endpoint.name, url: endpoint.url, events: endpoint.events },
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return {
      ...this.sanitizeEndpoint(endpoint),
      secret: plainSecret,
      secretMessage: 'Copie este segredo agora. Ele não será exibido novamente.',
    };
  }

  async update(
    id: string,
    input: UpdateWebhookEndpointInput,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Webhook não encontrado');

    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.events !== undefined && { events: input.events }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    const action = input.isActive === false
      ? 'webhook.disabled'
      : input.isActive === true
        ? 'webhook.enabled'
        : 'webhook.updated';

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action,
      entityType: 'WEBHOOK',
      entityId: id,
      before: { name: existing.name, url: existing.url, events: existing.events, isActive: existing.isActive },
      after: { name: updated.name, url: updated.url, events: updated.events, isActive: updated.isActive },
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return this.sanitizeEndpoint(updated);
  }

  async disable(
    id: string,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Webhook não encontrado');

    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'webhook.disabled',
      entityType: 'WEBHOOK',
      entityId: id,
      before: { isActive: true },
      after: { isActive: false },
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return this.sanitizeEndpoint(updated);
  }

  async rotateSecret(
    id: string,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Webhook não encontrado');

    const plainSecret = generateWebhookSecret();
    const encrypted = encryptSecret(plainSecret);

    await prisma.webhookEndpoint.update({
      where: { id },
      data: { encryptedSecret: encrypted },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'webhook.secret_rotated',
      entityType: 'WEBHOOK',
      entityId: id,
      severity: 'INFO',
      ipAddress,
      userAgent,
    });

    return {
      id,
      secret: plainSecret,
      secretMessage: 'Novo segredo gerado. Copie agora — não será exibido novamente.',
    };
  }

  async sendTest(
    id: string,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!endpoint) throw new NotFoundException('Webhook não encontrado');
    if (!endpoint.isActive) {
      throw new BadRequestException('Não é possível testar um webhook desativado');
    }

    const testPayload = {
      id: `evt_test_${Date.now()}`,
      type: 'webhook.test',
      createdAt: new Date().toISOString(),
      workspaceId,
      data: { message: 'Esta é uma entrega de teste do Peanut OS.' },
    };

    const delivery = await prisma.webhookDelivery.create({
      data: {
        workspaceId,
        webhookId: id,
        eventType: 'webhook.test',
        payload: testPayload,
        status: 'PENDING',
        maxAttempts: 1,
        nextAttemptAt: new Date(),
      },
    });

    await this.dispatchQueue.add(
      'webhook-dispatch',
      { deliveryId: delivery.id },
      { attempts: 1, removeOnComplete: 50, removeOnFail: 50 },
    ).catch((err) => {
      console.warn('[WebhooksService] Failed to enqueue test delivery (Redis offline?):', err.message);
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'webhook.test_sent',
      entityType: 'WEBHOOK',
      entityId: id,
      after: { deliveryId: delivery.id },
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return { deliveryId: delivery.id, status: 'queued' };
  }

  async listDeliveries(
    webhookId: string,
    workspaceId: string,
    query: WebhookDeliveryQueryInput,
    requesterRole: string,
  ) {
    this.assertCanView(requesterRole);

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: webhookId, workspaceId },
    });
    if (!endpoint) throw new NotFoundException('Webhook não encontrado');

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      prisma.webhookDelivery.count({ where: { webhookId, workspaceId } }),
      prisma.webhookDelivery.findMany({
        where: { webhookId, workspaceId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventType: true,
          status: true,
          attempt: true,
          maxAttempts: true,
          responseStatus: true,
          responseBody: true,
          errorMessage: true,
          createdAt: true,
          deliveredAt: true,
          nextAttemptAt: true,
        },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDelivery(deliveryId: string, workspaceId: string, requesterRole: string) {
    this.assertCanView(requesterRole);

    const delivery = await prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, workspaceId },
      select: {
        id: true,
        webhookId: true,
        eventType: true,
        payload: true,
        status: true,
        attempt: true,
        maxAttempts: true,
        responseStatus: true,
        responseBody: true,
        errorMessage: true,
        createdAt: true,
        deliveredAt: true,
        nextAttemptAt: true,
      },
    });

    if (!delivery) throw new NotFoundException('Entrega de webhook não encontrada');
    return delivery;
  }

  // ============================================================================
  // INBOUND WEBHOOK ENDPOINT CRUD & INBOUND PROCESSOR
  // ============================================================================

  async listInbound(workspaceId: string, requesterRole: string) {
    this.assertCanView(requesterRole);

    return prisma.inboundWebhookEndpoint.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        allowedActions: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getInboundById(id: string, workspaceId: string, requesterRole: string) {
    this.assertCanView(requesterRole);

    const endpoint = await prisma.inboundWebhookEndpoint.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        workspaceId: true,
        name: true,
        allowedActions: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!endpoint) throw new NotFoundException('Inbound webhook não encontrado');
    return endpoint;
  }

  async createInbound(
    input: CreateInboundWebhookInput,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const plainSecret = generateWebhookSecret();
    const encrypted = encryptSecret(plainSecret);

    const endpoint = await prisma.inboundWebhookEndpoint.create({
      data: {
        workspaceId,
        name: input.name,
        allowedActions: input.allowedActions,
        isActive: input.isActive ?? true,
        encryptedSecret: encrypted,
        createdById: actorUserId,
      },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'inbound_webhook.created',
      entityType: 'INBOUND_WEBHOOK',
      entityId: endpoint.id,
      after: { id: endpoint.id, name: endpoint.name, allowedActions: endpoint.allowedActions },
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return {
      ...this.sanitizeEndpoint(endpoint),
      secret: plainSecret,
      secretMessage: 'Copie este segredo agora para assinar as requisições HMAC inbound.',
    };
  }

  async updateInbound(
    id: string,
    input: UpdateInboundWebhookInput,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const existing = await prisma.inboundWebhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Inbound webhook não encontrado');

    const updated = await prisma.inboundWebhookEndpoint.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.allowedActions !== undefined && { allowedActions: input.allowedActions }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    const action = input.isActive === false
      ? 'inbound_webhook.disabled'
      : 'inbound_webhook.updated';

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action,
      entityType: 'INBOUND_WEBHOOK',
      entityId: id,
      before: { name: existing.name, allowedActions: existing.allowedActions, isActive: existing.isActive },
      after: { name: updated.name, allowedActions: updated.allowedActions, isActive: updated.isActive },
      ipAddress,
      userAgent,
      severity: 'INFO',
    });

    return this.sanitizeEndpoint(updated);
  }

  async deleteInbound(
    id: string,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const existing = await prisma.inboundWebhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Inbound webhook não encontrado');

    await prisma.inboundWebhookEndpoint.delete({
      where: { id },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'inbound_webhook.deleted',
      entityType: 'INBOUND_WEBHOOK',
      entityId: id,
      before: { name: existing.name },
      ipAddress,
      userAgent,
      severity: 'WARN',
    });

    return { success: true };
  }

  async rotateInboundSecret(
    id: string,
    workspaceId: string,
    actorUserId: string,
    requesterRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.assertCanManage(requesterRole);

    const existing = await prisma.inboundWebhookEndpoint.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Inbound webhook não encontrado');

    const plainSecret = generateWebhookSecret();
    const encrypted = encryptSecret(plainSecret);

    await prisma.inboundWebhookEndpoint.update({
      where: { id },
      data: { encryptedSecret: encrypted },
    });

    await this.auditService.log({
      workspaceId,
      actorUserId,
      action: 'inbound_webhook.secret_rotated',
      entityType: 'INBOUND_WEBHOOK',
      entityId: id,
      severity: 'INFO',
      ipAddress,
      userAgent,
    });

    return {
      id,
      secret: plainSecret,
      secretMessage: 'Novo segredo de entrada gerado. Copie agora — não será exibido novamente.',
    };
  }

  // ============================================================================
  // PUBLIC INBOUND HMAC WEBHOOK RECEIVER & PROCESSOR
  // ============================================================================

  async handleInbound(
    endpointId: string,
    timestampStr: string,
    signature: string,
    rawBody: string,
    body: any,
    _ipAddress?: string,
    _userAgent?: string,
  ) {
    // 1. Fetch active inbound endpoint
    const endpoint = await prisma.inboundWebhookEndpoint.findUnique({
      where: { id: endpointId },
    });
    if (!endpoint || !endpoint.isActive) {
      throw new ForbiddenException('Endpoint de entrada inativo ou não cadastrado');
    }

    // 2. Validate timestamp
    const nowSecs = Math.floor(Date.now() / 1000);
    const ts = parseInt(timestampStr, 10);
    if (isNaN(ts) || Math.abs(nowSecs - ts) > 300) {
      throw new BadRequestException('Timestamp expirado ou fora da janela permitida');
    }

    // 3. Cryptographic HMAC validation (using decrypted key and raw request body buffer/string)
    if (!endpoint.encryptedSecret) {
      throw new ForbiddenException('Segredo do endpoint de entrada não configurado');
    }

    const secret = decryptSecret(endpoint.encryptedSecret);
    const calculated = computeHmacSignature(secret, ts, rawBody);

    if (signature !== calculated) {
      // Safe audit log rejects without exposing keys/sigs
      await prisma.auditLog.create({
        data: {
          workspaceId: endpoint.workspaceId,
          actorUserId: null,
          action: 'inbound_webhook.rejected',
          entityType: 'INBOUND_WEBHOOK',
          entityId: endpointId,
          afterJson: JSON.stringify({ reason: 'HMAC signature mismatch' }),
          severity: 'SECURITY_ALERT',
        },
      });
      throw new ForbiddenException('Assinatura HMAC inválida');
    }

    // 4. Validate allowed actions
    const { action, entity, data, externalReference } = body;
    if (!action || !entity || !entity.id) {
      throw new BadRequestException('Ação ou entidade inválida no payload de entrada');
    }

    if (!endpoint.allowedActions.includes(action)) {
      throw new ForbiddenException(`Ação "${action}" não está na lista de permissões deste endpoint`);
    }

    // 5. Idempotency check with externalReference
    if (externalReference) {
      const existing = await prisma.webhookEventLog.findFirst({
        where: {
          workspaceId: endpoint.workspaceId,
          eventType: `inbound:${action}`,
          periodKey: externalReference,
        },
      });
      if (existing) {
        return {
          ok: true,
          action,
          entityId: entity.id,
          duplicate: true,
          message: 'Requisição processada anteriormente (idempotência)',
        };
      }
    }

    const workspaceId = endpoint.workspaceId;
    let auditId = '';

    try {
      // Log received state
      await prisma.auditLog.create({
        data: {
          workspaceId,
          actorUserId: null,
          action: 'inbound_webhook.received',
          entityType: 'INBOUND_WEBHOOK',
          entityId: endpointId,
          afterJson: JSON.stringify({ action, entityId: entity.id, externalReference }),
          severity: 'INFO',
        },
      });

      // 6. Execute direct database actions safely
      if (action === 'ticket.update_status') {
        const ticket = await prisma.ticket.findFirst({
          where: { id: entity.id, workspaceId },
        });
        if (!ticket) throw new NotFoundException('Chamado não encontrado');
        const oldStatus = ticket.status;

        await prisma.ticket.update({
          where: { id: entity.id },
          data: {
            status: data.status,
            ...(data.status === 'RESOLVED' && { resolvedAt: new Date() }),
            ...(data.status === 'CLOSED' && { closedAt: new Date() }),
          },
        });

        if (data.comment) {
          await prisma.ticketComment.create({
            data: {
              workspaceId,
              ticketId: ticket.id,
              content: data.comment,
              isInternal: false,
              visibility: 'INTERNAL',
            },
          });
        }

        await prisma.ticketHistory.create({
          data: {
            workspaceId,
            ticketId: ticket.id,
            event: 'STATUS_CHANGED',
            description: `Status alterado via API Inbound de ${oldStatus} para ${data.status}`,
            before: oldStatus,
            after: data.status,
          },
        });

      } else if (action === 'ticket.add_comment') {
        const ticket = await prisma.ticket.findFirst({
          where: { id: entity.id, workspaceId },
        });
        if (!ticket) throw new NotFoundException('Chamado não encontrado');

        await prisma.ticketComment.create({
          data: {
            workspaceId,
            ticketId: ticket.id,
            content: data.comment || data.content,
            isInternal: false,
            visibility: 'INTERNAL',
          },
        });

      } else if (action === 'ticket.assign') {
        const ticket = await prisma.ticket.findFirst({
          where: { id: entity.id, workspaceId },
        });
        if (!ticket) throw new NotFoundException('Chamado não encontrado');
        const oldAssignee = ticket.assignedToId;

        await prisma.ticket.update({
          where: { id: entity.id },
          data: { assignedToId: data.assignedToId || null },
        });

        await prisma.ticketHistory.create({
          data: {
            workspaceId,
            ticketId: ticket.id,
            event: 'ASSIGNED',
            description: `Designado via API Inbound`,
            before: oldAssignee || undefined,
            after: data.assignedToId || undefined,
          },
        });

      } else if (action === 'contract.update_status') {
        const contract = await prisma.contract.findFirst({
          where: { id: entity.id, workspaceId },
        });
        if (!contract) throw new NotFoundException('Contrato não encontrado');
        const oldStatus = contract.status;

        await prisma.contract.update({
          where: { id: entity.id },
          data: { status: data.status as any },
        });

        await prisma.contractHistory.create({
          data: {
            workspaceId,
            contractId: contract.id,
            event: 'STATUS_CHANGED',
            description: `Status alterado via API Inbound de ${oldStatus} para ${data.status}`,
            before: oldStatus,
            after: data.status,
          },
        });
      }

      // 7. Save to WebhookEventLog for idempotency tracking
      await prisma.webhookEventLog.create({
        data: {
          workspaceId,
          eventType: `inbound:${action}`,
          entityType: entity.type || 'INBOUND',
          entityId: entity.id,
          periodKey: externalReference || null,
          payload: body,
        },
      });

      // 8. Record audit log
      const audit = await prisma.auditLog.create({
        data: {
          workspaceId,
          actorUserId: null,
          action: 'inbound_webhook.action_executed',
          entityType: 'INBOUND_WEBHOOK',
          entityId: endpointId,
          afterJson: JSON.stringify({ action, entityId: entity.id, externalReference }),
          severity: 'INFO',
        },
      });
      auditId = audit.id;

      // 9. Dispatch outbound event notification in real-time
      if (action.startsWith('ticket.')) {
        this.webhookEvents.emit({
          workspaceId,
          eventType: action,
          entityId: entity.id,
          data: { ticketId: entity.id, action, ...data },
          source: { kind: 'inbound', name: 'Inbound Integration' },
        }).catch(() => {});
      } else if (action === 'contract.update_status') {
        this.webhookEvents.emit({
          workspaceId,
          eventType: 'contract.status_changed',
          entityId: entity.id,
          data: { contractId: entity.id, oldStatus: 'UNKNOWN', newStatus: data.status },
          source: { kind: 'inbound', name: 'Inbound Integration' },
        }).catch(() => {});
      }

      return {
        ok: true,
        action,
        entityId: entity.id,
        auditId,
      };

    } catch (err: any) {
      await prisma.auditLog.create({
        data: {
          workspaceId,
          actorUserId: null,
          action: 'inbound_webhook.action_failed',
          entityType: 'INBOUND_WEBHOOK',
          entityId: endpointId,
          afterJson: JSON.stringify({ action, entityId: entity.id, error: err.message }),
          severity: 'WARN',
        },
      });
      throw err;
    }
  }
}
