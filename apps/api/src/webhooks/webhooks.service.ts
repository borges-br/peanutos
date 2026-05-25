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
} from '@peanut/validators';
import {
  generateWebhookSecret,
  encryptSecret,
} from './webhook-signing';

const MANAGE_ROLES = ['OWNER', 'ADMIN'];
const VIEW_ROLES = ['OWNER', 'ADMIN', 'READ_ONLY'];

@Injectable()
export class WebhooksService {
  private readonly dispatchQueue: Queue;

  constructor(private readonly auditService: AuditService) {
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
}
