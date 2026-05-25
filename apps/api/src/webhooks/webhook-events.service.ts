import { Injectable } from '@nestjs/common';
import { prisma } from '@peanut/db';
import { Queue } from 'bullmq';

export interface WebhookEventPayload {
  workspaceId: string;
  eventType: string;
  entityId: string;
  data: Record<string, unknown>;
}

const SENSITIVE_KEYS = new Set([
  'password', 'passwordhash', 'password_hash', 'token', 'secret',
  'encryptedsecret', 'encrypted_secret', 'accesstoken', 'refreshtoken',
  'authorization', 'apikey', 'api_key', 'credential', 'sensitivedataencrypted',
  'sensitivedata', 'remoteaccess', 'vpnnotes', 'bucket', 'key', 's3key',
  'storagekey', 'stack', 'stacktrace', 'trace',
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
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
          workspaceId: event.workspaceId,
          isActive: true,
          events: { has: event.eventType },
        },
        select: { id: true },
      });

      if (endpoints.length === 0) return;

      const sanitizedData = sanitizePayload(event.data) as Record<string, unknown>;

      const payload = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: event.eventType,
        createdAt: new Date().toISOString(),
        workspaceId: event.workspaceId,
        data: sanitizedData,
      };

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
