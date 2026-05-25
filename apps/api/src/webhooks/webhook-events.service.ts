import { Injectable } from '@nestjs/common';
import { prisma } from '@peanut/db';
import { Queue } from 'bullmq';
import { WEBHOOK_EVENT_CATALOG } from '@peanut/validators';

export interface WebhookEventPayload {
  workspaceId: string;
  eventType: string;
  entityId: string;
  data: Record<string, unknown>;
  category?: 'AUDIT' | 'OPERATION' | 'COMMERCIAL';
  entityType?: string;
  actorUserId?: string | null;
  source?: {
    kind?: 'api' | 'worker' | 'scheduler' | 'inbound';
    name?: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

const SENSITIVE_KEYS = new Set([
  'password', 'passwordhash', 'password_hash', 'token', 'secret',
  'encryptedsecret', 'encrypted_secret', 'accesstoken', 'refreshtoken',
  'authorization', 'apikey', 'api_key', 'credential', 'sensitivedataencrypted',
  'sensitivedata', 'remoteaccess', 'vpnnotes', 'bucket', 'key', 's3key',
  'storagekey', 'stack', 'stacktrace', 'trace', 'sha256', 'signature'
]);

function sanitizePayload(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      result[k] = '[REDACTED]';
    } else {
      result[k] = sanitizePayload(v);
    }
  }
  return result;
}

@Injectable()
export class WebhookEventsService {
  private readonly dispatchQueue: Queue;

  constructor() {
    this.dispatchQueue = new Queue('webhook-dispatch', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || 'change-me-in-production',
      },
    });
  }

  async emit(event: WebhookEventPayload): Promise<void> {
    try {
      // 1. Fetch matching active endpoints
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
          workspaceId: event.workspaceId,
          isActive: true,
          events: { has: event.eventType },
        },
        select: { id: true },
      });

      if (endpoints.length === 0) return;

      // 2. Resolve catalog details
      const catalogEntry = WEBHOOK_EVENT_CATALOG.find(e => e.type === event.eventType);
      const category = event.category || catalogEntry?.category || 'OPERATION';
      const entityType = event.entityType || catalogEntry?.entityType || 'UNKNOWN';

      // 3. Fetch workspace metadata
      const ws = await prisma.workspace.findUnique({
        where: { id: event.workspaceId },
        select: { name: true }
      });
      const workspaceName = ws?.name || 'Peanut OS Workspace';

      // 4. Safe fetch entity identifier/number
      let entityNumber: string | null = null;
      try {
        if (event.entityId) {
          if (entityType === 'INVOICE') {
            const inv = await prisma.invoice.findUnique({
              where: { id: event.entityId },
              select: { number: true }
            });
            entityNumber = inv?.number || null;
          } else if (entityType === 'TICKET') {
            const tkt = await prisma.ticket.findUnique({
              where: { id: event.entityId },
              select: { number: true }
            });
            entityNumber = tkt?.number || null;
          } else if (entityType === 'CONTRACT') {
            const ctr = await prisma.contract.findUnique({
              where: { id: event.entityId },
              select: { number: true }
            });
            entityNumber = ctr?.number || null;
          } else if (entityType === 'CLIENT') {
            const cli = await prisma.client.findUnique({
              where: { id: event.entityId },
              select: { tradeName: true }
            });
            entityNumber = cli?.tradeName || null;
          } else if (entityType === 'USER') {
            const usr = await prisma.user.findUnique({
              where: { id: event.entityId },
              select: { name: true }
            });
            entityNumber = usr?.name || null;
          }
        }
      } catch (err: any) {
        console.warn(`[WebhookEventsService] Safe entity number lookup failed for type ${entityType}:`, err.message);
      }

      // 5. Fetch actor metadata
      let actor: any = null;
      if (event.actorUserId) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: event.actorUserId },
            select: { id: true, name: true, role: true }
          });
          if (user) {
            actor = {
              id: user.id,
              name: user.name,
              role: user.role
            };
          }
        } catch (err: any) {
          console.warn('[WebhookEventsService] Safe actor lookup failed:', err.message);
        }
      }

      // 6. Build robust standardized envelope
      const nowStr = new Date().toISOString();
      const sanitizedData = sanitizePayload(event.data) as Record<string, unknown>;
      const sanitizedMetadata = sanitizePayload(event.metadata || {}) as Record<string, unknown>;

      const payload = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: event.eventType,
        category,
        schemaVersion: '2026-05-01',
        createdAt: nowStr,
        triggeredAt: nowStr,
        workspace: {
          id: event.workspaceId,
          name: workspaceName
        },
        entity: {
          type: entityType,
          id: event.entityId,
          number: entityNumber
        },
        actor,
        source: {
          kind: event.source?.kind || 'api',
          name: event.source?.name || 'Peanut OS'
        },
        data: sanitizedData,
        links: {},
        metadata: sanitizedMetadata
      };

      // 7. Dispatch to BullMQ for active endpoints
      await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            const delivery = await prisma.webhookDelivery.create({
              data: {
                workspaceId: event.workspaceId,
                webhookId: endpoint.id,
                eventType: event.eventType,
                payload: payload as any,
                status: 'PENDING',
                maxAttempts: 5,
                nextAttemptAt: new Date(),
              },
            });

            await this.dispatchQueue
              .add('webhook-dispatch', { deliveryId: delivery.id }, {
                attempts: 5,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: 100,
                removeOnFail: 200,
              })
              .catch((err) => {
                console.warn(`[WebhookEventsService] Redis unavailable, delivery ${delivery.id} will not be dispatched:`, err.message);
              });
          } catch (err: any) {
            console.error(`[WebhookEventsService] Failed to create delivery for endpoint ${endpoint.id}:`, err.message);
          }
        }),
      );
    } catch (err: any) {
      // Never let webhook emission crash the main operation
      console.error('[WebhookEventsService] Unhandled error in emit (safe bypass):', err.message);
    }
  }
}
