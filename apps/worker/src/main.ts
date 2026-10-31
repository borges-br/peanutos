// ==============================================================================
// PEANUT OS - BACKGROUND WORKER ENTRYPOINT
// ==============================================================================
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Worker, Job, Queue } from 'bullmq';
import { runContractBilling } from './contract-billing';
import { testWorkspaceEmailConnection } from './email-settings';
import type { RenderA4DocumentParams } from '@peanut/documents';
import { prisma, freezeContractDocument, getInvoiceBankLink, getPublishedDocumentIdentity } from '@peanut/db';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { chromium } from 'playwright';
import { renderA4Document, formatDate as formatDocumentDate, formatDateTime as formatDocumentDateTime } from '@peanut/documents';
import { LocalObjectStorage, dateKey, calendarDateKey, zonedDateTime } from '@peanut/utils';

// Load environment variables from root or local
for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")]) {
  if (existsSync(path)) {
    dotenv.config({ path, override: false });
    break;
  }
}

const objects = new LocalObjectStorage();

async function fileObjectToDataUri(fileObjectId: string | null | undefined, workspaceId: string): Promise<string | null> {
  if (!fileObjectId) return null;

  const fileObject = await prisma.fileObject.findFirst({
    where: { id: fileObjectId, workspaceId },
  });
  if (!fileObject) return null;

  try {
    const body = await objects.get(fileObject.bucket, fileObject.key);
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return `data:${fileObject.mimeType};base64,${buffer.toString('base64')}`;
  } catch (err: any) {
    console.warn('[PDF Worker] Failed to inline document image:', err.message);
    return null;
  }
}

console.log('👷 Background job worker initializing...');

// ==============================================================================
// WEBHOOK EVENT EMITTER (standalone, no NestJS DI)
// ==============================================================================

const WORKER_SENSITIVE_KEYS = new Set([
  'password', 'passwordhash', 'passwordencrypted', 'smtppassword', 'token', 'secret', 'encryptedsecret',
  'accesstoken', 'refreshtoken', 'authorization', 'apikey', 'credential',
  'sensitivedataencrypted', 'sensitivedata', 'bucket', 'key', 's3key',
  'storagekey', 'stack', 'stacktrace',
]);

function workerSanitize(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).map(workerSanitize);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = WORKER_SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : workerSanitize(v);
  }
  return result;
}

async function emitUniqueWebhook(params: {
  workspaceId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  periodKey: string;
  data: Record<string, unknown>;
}) {
  try {
    // Check uniqueness/idempotency
    const existing = await prisma.webhookEventLog.findUnique({
      where: {
        workspaceId_eventType_entityType_entityId_periodKey: {
          workspaceId: params.workspaceId,
          eventType: params.eventType,
          entityType: params.entityType,
          entityId: params.entityId,
          periodKey: params.periodKey,
        },
      },
    });

    if (existing) {
      return; // Already emitted in this period/safeguard
    }

    // Build complete standardized payload
    const nowStr = new Date().toISOString();
    const ws = await prisma.workspace.findUnique({
      where: { id: params.workspaceId },
      select: { name: true, webhookMaxAttempts: true },
    });
    const workspaceName = ws?.name || 'Peanut OS Workspace';

    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: params.eventType,
      category: params.eventType.startsWith('ticket.') || params.eventType.startsWith('client.') || params.eventType.startsWith('document.') ? 'OPERATION' : 'COMMERCIAL',
      schemaVersion: '2026-05-01',
      createdAt: nowStr,
      triggeredAt: nowStr,
      workspace: {
        id: params.workspaceId,
        name: workspaceName,
      },
      entity: {
        type: params.entityType,
        id: params.entityId,
        number: (params.data.number || params.data.tradeName || null) as string | null,
      },
      actor: null,
      source: {
        kind: 'scheduler',
        name: 'Peanut OS',
      },
      data: workerSanitize(params.data),
      links: {},
      metadata: {},
    };

    // Save log record first to prevent race condition before sending!
    const log = await prisma.webhookEventLog.create({
      data: {
        workspaceId: params.workspaceId,
        eventType: params.eventType,
        entityType: params.entityType,
        entityId: params.entityId,
        periodKey: params.periodKey,
        payload: payload as any,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        actorUserId: null,
        action: 'webhook.scheduled_event_emitted',
        entityType: 'WEBHOOK_EVENT_LOG',
        entityId: log.id,
        afterJson: JSON.stringify({
          eventType: params.eventType,
          entityType: params.entityType,
          entityId: params.entityId,
          periodKey: params.periodKey,
        }),
        severity: 'INFO',
      },
    });

    // Find active endpoints
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        workspaceId: params.workspaceId,
        isActive: true,
        events: { has: params.eventType },
      },
      select: { id: true },
    });

    if (endpoints.length === 0) return;

    const webhookDispatchQueue = new Queue('webhook-dispatch', { connection });
    for (const endpoint of endpoints) {
      try {
        const delivery = await prisma.webhookDelivery.create({
          data: {
            workspaceId: params.workspaceId,
            webhookId: endpoint.id,
            eventType: params.eventType,
            payload: payload as any,
            status: 'PENDING',
            maxAttempts: ws?.webhookMaxAttempts ?? 5,
            nextAttemptAt: new Date(),
          },
        });

        await webhookDispatchQueue.add('webhook-dispatch', { deliveryId: delivery.id }, {
          attempts: ws?.webhookMaxAttempts ?? 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        }).catch((err: Error) => {
          console.warn(`[Worker WebhookEmit] Redis unavailable for delivery ${delivery.id}:`, err.message);
        });
      } catch (err: any) {
        console.error(`[Worker WebhookEmit] Failed for endpoint ${endpoint.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error(`[Webhook Scheduler] emitUniqueWebhook failed for ${params.eventType}:`, err.message);
  }
}

async function sweepInvoices(settings: { id: string; invoiceDueSoonOffsetHours: number }) {
  const today = new Date();

  // Fetch all pending/issued/overdue invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['ISSUED', 'OVERDUE'] }, workspaceId: settings.id,
    },
    include: {
      workspace: {
        select: { invoiceDueSoonOffsetHours: true, timeZone: true },
      },
    },
  });

  for (const inv of invoices) {
    const todayStr = dateKey(today, inv.workspace.timeZone);
    const dueDateStr = calendarDateKey(inv.dueDate, inv.workspace.timeZone);
    const dueInstant = inv.dueDate.toISOString().endsWith('T00:00:00.000Z')
      ? zonedDateTime(dueDateStr, inv.workspace.timeZone) : inv.dueDate;
    const remainingMs = dueInstant.getTime() - today.getTime();
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    const dueSoonOffsetHours = settings.invoiceDueSoonOffsetHours;

    // A. invoice.due_today
    if (dueDateStr === todayStr) {
      const periodKey = `${todayStr}:dueToday`;
      await emitUniqueWebhook({
        workspaceId: inv.workspaceId,
        eventType: 'invoice.due_today',
        entityType: 'INVOICE',
        entityId: inv.id,
        periodKey,
        data: {
          invoiceId: inv.id,
          number: inv.number,
          dueDate: inv.dueDate.toISOString(),
        },
      });
    }

    // B. invoice.due_soon
    if (remainingMs > 0 && remainingHours <= dueSoonOffsetHours) {
      const periodKey = `${dueDateStr}:dueSoon:${dueSoonOffsetHours}h`;
      await emitUniqueWebhook({
        workspaceId: inv.workspaceId,
        eventType: 'invoice.due_soon',
        entityType: 'INVOICE',
        entityId: inv.id,
        periodKey,
        data: {
          invoiceId: inv.id,
          number: inv.number,
          dueDate: inv.dueDate.toISOString(),
          dueSoonOffsetHours,
          remainingHours,
        },
      });
    }

    // C. invoice.overdue
    if (dueDateStr < todayStr && inv.status !== 'PAID' && inv.status !== 'CANCELLED') {
      const periodKey = `${todayStr}:overdue`;
      await emitUniqueWebhook({
        workspaceId: inv.workspaceId,
        eventType: 'invoice.overdue',
        entityType: 'INVOICE',
        entityId: inv.id,
        periodKey,
        data: {
          invoiceId: inv.id,
          number: inv.number,
          dueDate: inv.dueDate.toISOString(),
        },
      });
    }
  }
}

async function sweepContracts(settings: { id: string; contractEndingSoonDays: number }) {
  const today = new Date();

  const endingSoonDays = settings.contractEndingSoonDays;

  const contracts = await prisma.contract.findMany({
    where: {
      status: 'ACTIVE', workspaceId: settings.id,
    },
    include: { workspace: { select: { timeZone: true } } },
  });

  for (const ctr of contracts) {
    const tz = ctr.workspace.timeZone;
    const todayStr = dateKey(today, tz);
    const endingSoonTargetStr = dateKey(new Date(today.getTime() + endingSoonDays * 86400000), tz);
    if (ctr.endDate) {
      const endDateStr = calendarDateKey(ctr.endDate, tz);

      // A. cycle_ending_soon
      if (endDateStr === endingSoonTargetStr) {
        const periodKey = `${todayStr}:cycleEndingSoon`;
        await emitUniqueWebhook({
          workspaceId: ctr.workspaceId,
          eventType: 'contract.cycle_ending_soon',
          entityType: 'CONTRACT',
          entityId: ctr.id,
          periodKey,
          data: {
            contractId: ctr.id,
            number: ctr.number,
            title: ctr.title,
            endDate: ctr.endDate.toISOString(),
            daysRemaining: endingSoonDays,
          },
        });
      }

      // B. cycle_ended
      if (endDateStr < todayStr) {
        const periodKey = `${todayStr}:cycleEnded`;
        await emitUniqueWebhook({
          workspaceId: ctr.workspaceId,
          eventType: 'contract.cycle_ended',
          entityType: 'CONTRACT',
          entityId: ctr.id,
          periodKey,
          data: {
            contractId: ctr.id,
            number: ctr.number,
            title: ctr.title,
            endDate: ctr.endDate.toISOString(),
          },
        });
      }
    }

    // C. renewal_due
    const dayOfMonth = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(today), 10);
    if (ctr.billingDay === dayOfMonth) {
      const periodKey = `${todayStr}:renewalDue`;
      await emitUniqueWebhook({
        workspaceId: ctr.workspaceId,
        eventType: 'contract.renewal_due',
        entityType: 'CONTRACT',
        entityId: ctr.id,
        periodKey,
        data: {
          contractId: ctr.id,
          number: ctr.number,
          title: ctr.title,
          billingDay: ctr.billingDay,
          monthlyAmountCents: ctr.monthlyAmountCents,
        },
      });
    }
  }
}

async function sweepTicketsFeedback(settings: { id: string; ticketFeedbackAfterHours: number }) {
  const feedbackHours = settings.ticketFeedbackAfterHours;
  const targetTime = new Date(Date.now() - feedbackHours * 60 * 60 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['RESOLVED', 'CLOSED'] }, workspaceId: settings.id,
      resolvedAt: { lte: targetTime },
    },
  });

  for (const tkt of tickets) {
    await emitUniqueWebhook({
      workspaceId: tkt.workspaceId,
      eventType: 'ticket.feedback_due',
      entityType: 'TICKET',
      entityId: tkt.id,
      periodKey: 'feedbackDue',
      data: {
        ticketId: tkt.id,
        number: tkt.number,
        title: tkt.title,
        resolvedAt: tkt.resolvedAt?.toISOString(),
      },
    });
  }
}

async function runDailyWebhookSweeps() {
  const now = new Date();
  const workspaces = await prisma.workspace.findMany({ select: {
    id: true, invoiceDueSoonOffsetHours: true, contractEndingSoonDays: true, ticketFeedbackAfterHours: true,
    automationIntervalMinutes: true, lastAutomationSweepAt: true,
  } });
  for (const settings of workspaces) {
    if (settings.lastAutomationSweepAt && now.getTime() - settings.lastAutomationSweepAt.getTime() < settings.automationIntervalMinutes * 60000) continue;
    const claim = await prisma.workspace.updateMany({ where: { id: settings.id, lastAutomationSweepAt: settings.lastAutomationSweepAt }, data: { lastAutomationSweepAt: now } });
    if (!claim.count) continue;
    try {
      await sweepInvoices(settings);
      await sweepContracts(settings);
      await sweepTicketsFeedback(settings);
    } catch (error) {
      await prisma.workspace.updateMany({ where: { id: settings.id, lastAutomationSweepAt: now }, data: { lastAutomationSweepAt: settings.lastAutomationSweepAt } });
      throw error;
    }
  }
}

async function emitWebhookEventFromWorker(event: {
  workspaceId: string;
  eventType: string;
  entityId: string;
  data: Record<string, unknown>;
}): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId: event.workspaceId, isActive: true, events: { has: event.eventType } },
      select: { id: true },
    });
    if (endpoints.length === 0) return;

    // Resolve category/type
    const category = event.eventType.startsWith('ticket.') || event.eventType.startsWith('client.') || event.eventType.startsWith('document.') ? 'OPERATION' : 'COMMERCIAL';
    const entityType = event.eventType.split('.')[0]?.toUpperCase() || 'UNKNOWN';

    const ws = await prisma.workspace.findUnique({
      where: { id: event.workspaceId },
      select: { name: true, webhookMaxAttempts: true },
    });
    const workspaceName = ws?.name || 'Peanut OS Workspace';

    const nowStr = new Date().toISOString();
    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: event.eventType,
      category,
      schemaVersion: '2026-05-01',
      createdAt: nowStr,
      triggeredAt: nowStr,
      workspace: {
        id: event.workspaceId,
        name: workspaceName,
      },
      entity: {
        type: entityType,
        id: event.entityId,
        number: (event.data.number || event.data.tradeName || null) as string | null,
      },
      actor: null,
      source: {
        kind: 'worker',
        name: 'Peanut OS',
      },
      data: workerSanitize(event.data),
      links: {},
      metadata: {},
    };

    const webhookDispatchQueue = new Queue('webhook-dispatch', { connection });
    for (const endpoint of endpoints) {
      try {
        const delivery = await prisma.webhookDelivery.create({
          data: {
            workspaceId: event.workspaceId,
            webhookId: endpoint.id,
            eventType: event.eventType,
            payload: payload as any,
            status: 'PENDING',
            maxAttempts: ws?.webhookMaxAttempts ?? 5,
            nextAttemptAt: new Date(),
          },
        });
        await webhookDispatchQueue.add('webhook-dispatch', { deliveryId: delivery.id }, {
          attempts: ws?.webhookMaxAttempts ?? 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        }).catch((err: Error) => {
          console.warn(`[Worker WebhookEmit] Redis unavailable for delivery ${delivery.id}:`, err.message);
        });
      } catch (err: any) {
        console.error(`[Worker WebhookEmit] Failed for endpoint ${endpoint.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Worker WebhookEmit] Unhandled error (safe bypass):', err.message);
  }
}

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || 'change-me-in-production';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
};

const billingScheduleQueue = new Queue('billing-schedule', { connection });
const emailTestWorker = new Worker('settings-email-test', async (job: Job) => testWorkspaceEmailConnection(job.data.workspaceId, job.data.revision), { connection, concurrency: 2 });
emailTestWorker.on('error', () => console.warn('[Email Settings] Test queue unavailable.'));
emailTestWorker.on('failed', () => console.warn('[Email Settings] Connection test failed.'));
const recurringPdfQueue = new Queue('pdf-generation', { connection });
const contractBillingQueue = new Queue('contract-billing', { connection });
contractBillingQueue.add('contract-billing.scan', {}, { jobId: 'contract-billing.scan', repeat: { every: 60000 }, removeOnComplete: 10, removeOnFail: 50 }).catch((error: Error) => console.warn('[Contract Billing] Queue unavailable:', error.message));
const contractBillingWorker = new Worker('contract-billing', async () => runContractBilling(prisma, recurringPdfQueue, objects), { connection, concurrency: 1 });
contractBillingWorker.on('error', (error: Error) => console.warn('[Contract Billing] Worker error:', error.message));

async function registerBillingSchedule() {
  const pattern = '* * * * *'; // Internal tick; workspace settings control the scan interval.
  // Replace legacy repeats so updates do not leave a second scheduler active.
  for (const repeat of await billingScheduleQueue.getRepeatableJobs()) {
    if (repeat.name === 'billing-schedule.monthly-sweep' && (repeat.pattern !== pattern || repeat.tz !== 'UTC')) {
      await billingScheduleQueue.removeRepeatableByKey(repeat.key);
    }
  }
  await billingScheduleQueue.add('billing-schedule.monthly-sweep', {}, {
    jobId: 'billing-schedule.monthly-sweep',
    repeat: { pattern, tz: 'UTC' }, removeOnComplete: 10, removeOnFail: 50,
  });
}
registerBillingSchedule().catch((err: Error) => {
  console.warn('[Billing Scheduler Queue] Could not register schedule:', err.message);
});

/**
 * PDF GENERATION JOB WORKER STUB
 * ============================================================================
 * Playwright browser context will be managed inside this worker in Phase 4.
 * ============================================================================
 */
/**
 * Helper to sanitize filenames
 */
function safeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * PDF GENERATION JOB WORKER
 * ============================================================================
 * Playwright browser context managed inside this worker.
 * ============================================================================
 */
const pdfWorker = new Worker(
  'pdf-generation',
  async (job: Job) => {
    const { workspaceId, actorUserId, entityType, entityId, documentType } = job.data;
    console.log(`[PDF Worker] Processing job ${job.id} for type ${documentType} on entity ${entityId}...`);

    if (!['INVOICE', 'QUOTE', 'SERVICE_ORDER'].includes(entityType)) {
      throw new Error(`[PDF Worker] Unsupported entity type: ${entityType}`);
    }

    const typedDocumentType = (documentType || entityType) as 'INVOICE' | 'QUOTE' | 'SERVICE_ORDER';

    // 1. Fetch source entity and normalize it for the shared A4 renderer
    let source: any = null;
    if (entityType === 'INVOICE') {
      source = await prisma.invoice.findFirst({
        where: { id: entityId, workspaceId },
        include: {
          client: true,
          billingScheduleEvent: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
    } else if (entityType === 'QUOTE') {
      source = await prisma.quote.findFirst({
        where: { id: entityId, workspaceId },
        include: {
          client: true,
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
    } else {
      source = await prisma.serviceOrder.findFirst({
        where: { id: entityId, workspaceId },
        include: {
          client: true,
          responsibleUser: {
            select: {
              id: true,
              name: true,
              role: true,
              documentDisplayName: true,
              jobTitle: true,
              signatureImageFileObjectId: true,
              documentSignatureEnabled: true,
            },
          },
          items: { orderBy: { sortOrder: 'asc' } },
        },
      });
    }

    if (!source) {
      throw new Error(`[PDF Worker] ${entityType} with ID ${entityId} not found in workspace ${workspaceId}`);
    }

    // 2. Fetch workspace (brand settings) + responsible user
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    const responsibleUser = source.responsibleUser || (actorUserId ? await prisma.user.findUnique({ where: { id: actorUserId } }) : null);

    if (!workspace) {
      throw new Error(`[PDF Worker] Workspace with ID ${workspaceId} not found`);
    }

    // 3. Recalculate version number in worker before database record to prevent race conditions
    const lastDoc = await prisma.generatedDocument.findFirst({
      where: {
        workspaceId,
        entityType,
        entityId,
        documentType: typedDocumentType,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });
    const version = lastDoc ? lastDoc.version + 1 : 1;

    // 4. Format variables for generateInvoicePdfHtml / renderA4Document
    const formatCurrency = (val: number | any) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(val));
    };

    const formatDate = (date: Date) => {
      return formatDocumentDate(date, 'pt-BR', workspace.timeZone, typedDocumentType !== 'SERVICE_ORDER');
    };

    const logoDataUri = await fileObjectToDataUri((workspace as any).logoFileObjectId, workspaceId);
    const signatureDataUri = await fileObjectToDataUri((responsibleUser as any)?.signatureImageFileObjectId, workspaceId);

    // Build snapshots for metadata and rendering
    const brandSnapshot = {
      publicName: workspace.brandName,
      brandSubtitle: workspace.brandSubtitle,
      legalName: workspace.legalName,
      taxId: workspace.companyDocument,
      email: workspace.companyEmail,
      financialEmail: workspace.financialEmail,
      phone: workspace.companyPhone,
      website: workspace.companyWebsite,
      address: workspace.companyAddress,
      documentPrimaryColor: workspace.primaryColorHex || "#1a56db",
      documentSecondaryColor: (workspace as any).documentSecondaryColor || "#4b5563",
      documentAccentColor: (workspace as any).documentAccentColor || "#e11d48",
      logoUrl: logoDataUri,
      footerText: workspace.documentFooterText,
      signatureName: workspace.signatureName,
      ...(await getPublishedDocumentIdentity(prisma, workspaceId) || {}),
    };

    const responsibleSnapshot = responsibleUser ? {
      userId: responsibleUser.id,
      displayName: (responsibleUser as any).documentDisplayName || responsibleUser.name,
      jobTitle: (responsibleUser as any).jobTitle || null,
      signatureImageUrl: signatureDataUri,
      signatureEnabled: (responsibleUser as any).documentSignatureEnabled ?? false,
    } : null;

    // Fetch template settings from database
    const templateSetting = await prisma.documentTemplateSetting.findUnique({
      where: { workspaceId_documentType: { workspaceId, documentType: typedDocumentType } },
    });

    const templateSnapshot = templateSetting ? {
      documentType: typedDocumentType,
      templateKey: templateSetting.templateKey,
      layoutVariant: templateSetting.layoutVariant,
      enabledBlocks: templateSetting.enabledBlocks as Record<string, boolean>,
      blockOrder: templateSetting.blockOrder as string[],
      settings: templateSetting.settings || {},
    } : {
      documentType: typedDocumentType,
      templateKey: 'standard',
      layoutVariant: 'default',
      enabledBlocks: {
        header: true, logo: true, companyInfo: true, clientInfo: true,
        documentTitle: true, itemsTable: true, financialSummary: true,
        paymentInfo: typedDocumentType === 'INVOICE', terms: typedDocumentType !== 'INVOICE', observations: true,
        responsibleSignature: true, clientSignature: typedDocumentType !== 'INVOICE', qrCode: false, footer: true,
      },
      blockOrder: typedDocumentType === 'INVOICE'
        ? [
            "header", "logo", "companyInfo", "clientInfo", "documentTitle",
            "itemsTable", "financialSummary", "paymentInfo", "observations",
            "responsibleSignature", "footer",
          ]
        : [
            "header", "logo", "companyInfo", "clientInfo", "documentTitle",
            "itemsTable", "financialSummary", "terms", "observations",
            "responsibleSignature", "clientSignature", "footer",
          ],
      settings: {},
    };

    const dueDate =
      typedDocumentType === 'INVOICE'
        ? source.dueDate
        : typedDocumentType === 'QUOTE'
          ? source.validUntil
          : source.scheduledFor || source.completedAt || null;
    const bankPaymentUrl = entityType === 'INVOICE' ? await getInvoiceBankLink(prisma, entityId, source.status !== 'DRAFT') : null;
    const sourceItems = source.items?.length
      ? source.items
      : typedDocumentType === 'SERVICE_ORDER'
        ? [
            {
              type: 'SERVICE',
              description: source.description,
              quantity: 1,
              unit: 'OS',
              unitPrice: 0,
              totalPrice: 0,
            },
          ]
        : [];
    const documentTitle =
      typedDocumentType === 'QUOTE'
        ? 'Proposta Comercial'
        : typedDocumentType === 'SERVICE_ORDER'
          ? source.title
          : undefined;
    const documentTerms =
      typedDocumentType === 'QUOTE'
        ? source.terms || workspace.defaultQuoteTerms || null
        : typedDocumentType === 'SERVICE_ORDER'
          ? workspace.defaultServiceOrderTerms || null
          : workspace.defaultContractTerms || null;
    const documentObservations =
      typedDocumentType === 'QUOTE'
        ? source.observations || null
        : typedDocumentType === 'SERVICE_ORDER'
          ? source.clientNotes || source.description || null
          : source.observations || workspace.defaultInvoiceNotes || null;

    const renderData = {
      number: source.number,
      billingPeriod: source.billingScheduleEvent?.periodKey,
      contractNumber: source.billingScheduleEvent ? (await prisma.contract.findUnique({ where: { id: source.contractId }, select: { number: true } }))?.number : undefined,
      status: source.status,
      issueDate: formatDate(source.issueDate || source.createdAt),
      dueDate: typedDocumentType === 'SERVICE_ORDER'
        ? dueDate ? formatDocumentDateTime(dueDate, 'pt-BR', workspace.timeZone) : '--/--/----'
        : formatDate(dueDate),
      bankPaymentUrl,
      paymentMethod: typedDocumentType === 'INVOICE' ? source.paymentMethod : null,
      pixKey: typedDocumentType === 'INVOICE' ? source.pixKey : null,
      totalAmount: formatCurrency(source.totalAmount || 0),
      title: documentTitle,
      items: sourceItems.map((item: any) => ({
        type: item.type,
        billingKind: item.billingKind,
        billingNote: (item.recurrenceSnapshot as any)?.note || null,
        description: item.description,
        quantity: item.quantity.toString(),
        unit: item.unit,
        unitPrice: formatCurrency(item.unitPrice || 0),
        totalPrice: formatCurrency(item.totalPrice || 0),
      })),
      terms: documentTerms,
      observations: documentObservations,
      subtotalServices: formatCurrency(source.subtotalServices || 0),
      subtotalMaterials: formatCurrency(source.subtotalMaterials || 0),
      discountAmount: formatCurrency(source.discountAmount || 0),
    };

    // 5. Render dynamic block-based A4 HTML
    const renderParams: RenderA4DocumentParams = {
      documentType: typedDocumentType,
      brand: brandSnapshot,
      responsible: responsibleSnapshot,
      client: {
        tradeName: source.client?.tradeName || source.clientName || 'Cliente',
        legalName: source.client?.legalName || source.clientName || null,
        document: source.client?.document || source.clientDocument || null,
        email: source.client?.email || source.clientEmail || null,
        phone: source.client?.phone || source.clientPhone || null,
      },
      data: renderData,
      templateSettings: templateSnapshot,
      generatedAt: formatDocumentDateTime(new Date(), 'pt-BR', workspace.timeZone),
      timeZone: workspace.timeZone,
      locale: 'pt-BR',
    };
    const finalRenderParams: RenderA4DocumentParams = source.billingScheduleEvent && source.status !== 'DRAFT'
      ? await freezeContractDocument(prisma, entityId, workspaceId, JSON.parse(JSON.stringify(renderParams))) as unknown as RenderA4DocumentParams
      : renderParams;
    const html = renderA4Document(finalRenderParams);

    // 6. Launch Playwright headless browser
    console.log(`[PDF Worker] Launching chromium browser...`);
    let pdfBuffer: Buffer;
    try {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.setContent(html);
        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0',
            right: '0',
            bottom: '0',
            left: '0',
          },
        });
      } finally {
        await browser.close();
      }
    } catch (playwrightErr: any) {
      console.error('[PDF Worker] Playwright PDF generation failed:', playwrightErr.message);
      // Throw generic secure error (omit internal stack traces / raw errors)
      throw new Error(`Falha ao gerar o arquivo PDF.`);
    }

    const sanitizedNumber = safeFilename(source.number);
    const filePrefix =
      typedDocumentType === 'QUOTE'
        ? 'quote'
        : typedDocumentType === 'SERVICE_ORDER'
          ? 'service-order'
          : 'invoice';
    const displayPrefix =
      typedDocumentType === 'QUOTE'
        ? 'orcamento'
        : typedDocumentType === 'SERVICE_ORDER'
          ? 'ordem-servico'
          : 'fatura';
    const folder =
      typedDocumentType === 'QUOTE'
        ? 'quotes'
        : typedDocumentType === 'SERVICE_ORDER'
          ? 'service-orders'
          : 'invoices';
    const fileName = `${filePrefix}-${sanitizedNumber}-v${version}.pdf`;
    const key = `${workspaceId}/${folder}/${entityId}/${crypto.randomUUID()}-${fileName}`;

    // 7. Publish an immutable PDF in the shared persistent volume.
    try {
      await objects.put(objects.bucket, key, pdfBuffer);
    } catch (uploadErr: any) {
      console.error('[PDF Worker] File upload failed:', uploadErr.message);
      // Throw generic secure error (omit internal paths / endpoints / S3 keys)
      throw new Error(`Falha ao salvar o arquivo no armazenamento.`);
    }

    // 8. Calculate file statistics from memory buffer
    const sizeBytes = BigInt(pdfBuffer.length);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // 9. Persist records in Prisma (FileObject & GeneratedDocument)
    let persisted;
    try {
      persisted = await prisma.$transaction(async (tx) => {
        const fileObject = await tx.fileObject.create({
          data: {
            workspaceId,
            bucket: objects.bucket,
            key,
            originalFilename: `${displayPrefix}-${sanitizedNumber}-v${version}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes,
            sha256,
            visibility: 'PRIVATE',
            createdById: actorUserId,
          },
        });

        const generatedDoc = await tx.generatedDocument.create({
          data: {
            workspaceId,
            entityType,
            entityId,
            documentType: typedDocumentType,
            version,
            fileObjectId: fileObject.id,
            sha256,
            generatedById: actorUserId,
            metadata: JSON.stringify({
              invoiceNumber: typedDocumentType === 'INVOICE' ? source.number : undefined,
              quoteNumber: typedDocumentType === 'QUOTE' ? source.number : undefined,
              serviceOrderNumber: typedDocumentType === 'SERVICE_ORDER' ? source.number : undefined,
              generatedFrom: `${typedDocumentType.toLowerCase()}-preview`,
              storage: 'filesystem',
              timeZone: workspace.timeZone,
              brandSnapshot,
              responsibleSnapshot,
              templateSnapshot,
            }),
          },
        });
        if (entityType === 'INVOICE' && source.billingScheduleEvent && ['ISSUED', 'OVERDUE', 'PAID'].includes(source.status)) {
          await tx.billingScheduleEvent.updateMany({
            where: { id: source.billingScheduleEvent.id, invoiceId: entityId, emailPdfFileObjectId: null },
            data: { emailPdfFileObjectId: fileObject.id, documentSnapshot: JSON.parse(JSON.stringify(finalRenderParams)) },
          });
        }
        return { fileObject, generatedDoc };
      });
    } catch (dbError: any) {
      console.error('[PDF Worker] DB operations failed. Cleaning up stored file...', dbError.message);
      try {
        await objects.remove(objects.bucket, key);
      } catch (deleteErr: any) {
        console.error('[PDF Worker] Stored file cleanup failed:', deleteErr.message);
      }
      throw new Error(`Falha ao registrar o documento no banco de dados.`);
    }

    const { fileObject, generatedDoc } = persisted;

    // 10. Write audit log (omitting storage path/bucket/key) only after real transaction success
    try {
      await prisma.auditLog.create({
        data: {
          workspaceId,
          actorUserId,
          action: 'document.generated',
          entityType: 'DOCUMENT',
          entityId: generatedDoc.id,
          beforeJson: null,
          afterJson: JSON.stringify({
            documentId: generatedDoc.id,
            entityType,
            entityId,
            version,
            originalFilename: fileObject.originalFilename,
            sizeBytes: sizeBytes.toString(),
            sha256,
            visibility: fileObject.visibility,
          }),
          severity: 'INFO',
        },
      });
    } catch (auditErr) {
      console.warn('[PDF Worker] Failed to write audit log:', auditErr);
    }

    console.log(`[PDF Worker] Completed job ${job.id}. GeneratedDocId: ${generatedDoc.id}`);

    // Emit document.generated webhook event (non-blocking)
    emitWebhookEventFromWorker({
      workspaceId,
      eventType: 'document.generated',
      entityId: generatedDoc.id,
      data: {
        documentId: generatedDoc.id,
        entityType,
        entityId,
        documentType: typedDocumentType,
        version,
        originalFilename: fileObject.originalFilename,
      },
    }).catch(() => {});

    // Return ONLY generatedDocumentId, fileObjectId and version (excl. bucket/key/endpoint)
    return {
      generatedDocumentId: generatedDoc.id,
      fileObjectId: fileObject.id,
      version,
    };
  },
  {
    connection,
    concurrency: parseInt(process.env.PDF_MAX_CONCURRENCY || '1', 10),
  }
);

// ==============================================================================
// WEBHOOK SIGNING HELPERS
// ==============================================================================

const getWebhookEncKey = (): Buffer => {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY || 'peanut-os-webhook-key-change-in-production!!';
  return crypto.createHash('sha256').update(raw).digest();
};

function decryptWebhookSecret(encryptedSecret: string): string {
  const parts = encryptedSecret.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const ivHex = parts[0]!;
  const tagHex = parts[1]!;
  const encHex = parts[2]!;
  const key = getWebhookEncKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString('utf8') + decipher.final('utf8');
}

function computeHmac(secret: string, timestamp: number, rawBody: string): string {
  const payload = `${timestamp}.${rawBody}`;
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function isPrivateHost(hostname: string): boolean {
  return (
    ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname)
  );
}

function doHttpPost(
  url: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return reject(new Error('URL inválida'));
    }

    if (process.env.NODE_ENV === 'production' && isPrivateHost(parsed.hostname)) {
      return reject(new Error('URL aponta para rede privada (bloqueado em produção)'));
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: timeoutMs,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data }));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * WEBHOOK DISPATCH JOB WORKER
 * ============================================================================
 * Receives { deliveryId }, fetches the delivery + endpoint, sends HMAC-signed
 * POST request, and updates the delivery record with the result.
 * ============================================================================
 */
const webhookWorker = new Worker(
  'webhook-dispatch',
  async (job: Job) => {
    const { deliveryId } = job.data;

    if (!deliveryId) {
      console.warn('[Webhook Worker] Job missing deliveryId, skipping.');
      return { skipped: true };
    }

    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true, workspace: { select: { webhookTimeoutMs: true } } },
    });

    if (!delivery) {
      console.warn(`[Webhook Worker] Delivery ${deliveryId} not found, skipping.`);
      return { skipped: true };
    }

    if (!delivery.webhook || !delivery.webhook.isActive) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'CANCELLED', errorMessage: 'Webhook inativo ou removido' },
      });
      console.log(`[Webhook Worker] Delivery ${deliveryId} cancelled — webhook inactive.`);
      return { cancelled: true };
    }

    const attempt = (delivery.attempt || 0) + 1;
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { attempt, status: attempt > 1 ? 'RETRYING' : 'PENDING' },
    });

    console.log(`[Webhook Worker] Dispatching delivery ${deliveryId} (attempt ${attempt}) for event ${delivery.eventType} to ${delivery.webhook.url}`);

    const rawBody = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(Date.now() / 1000);

    let signature = '';
    if (delivery.webhook.encryptedSecret) {
      try {
        const secret = decryptWebhookSecret(delivery.webhook.encryptedSecret);
        signature = computeHmac(secret, timestamp, rawBody);
      } catch (sigErr: any) {
        console.error(`[Webhook Worker] Failed to compute HMAC for delivery ${deliveryId}:`, sigErr.message);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'PeanutOS-Webhooks/1.0',
      'X-Peanut-Event': delivery.eventType,
      'X-Peanut-Delivery': deliveryId,
      'X-Peanut-Timestamp': String(timestamp),
      ...(signature ? { 'X-Peanut-Signature': signature } : {}),
    };

    try {
      const result = await doHttpPost(delivery.webhook.url, rawBody, headers, delivery.workspace.webhookTimeoutMs);
      const isSuccess = result.status >= 200 && result.status < 300;
      const truncatedBody = result.body.substring(0, 500);

      if (isSuccess) {
        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'DELIVERED',
            responseStatus: result.status,
            responseBody: truncatedBody,
            deliveredAt: new Date(),
            errorMessage: null,
          },
        });

        await writeWebhookAudit(delivery.workspaceId, 'webhook.delivery_succeeded', deliveryId, {
          eventType: delivery.eventType,
          webhookId: delivery.webhookId,
          responseStatus: result.status,
          attempt,
        });

        console.log(`[Webhook Worker] Delivery ${deliveryId} succeeded (HTTP ${result.status}).`);
        return { success: true, status: result.status };
      } else {
        const isRetryable = attempt < delivery.maxAttempts;
        const backoffMs = Math.pow(2, attempt) * 5000;
        const nextAttemptAt = isRetryable ? new Date(Date.now() + backoffMs) : null;

        await prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: isRetryable ? 'RETRYING' : 'FAILED',
            responseStatus: result.status,
            responseBody: truncatedBody.substring(0, 500),
            errorMessage: `HTTP ${result.status}`,
            nextAttemptAt,
          },
        });

        if (!isRetryable) {
          await writeWebhookAudit(delivery.workspaceId, 'webhook.delivery_failed', deliveryId, {
            eventType: delivery.eventType,
            webhookId: delivery.webhookId,
            responseStatus: result.status,
            attempt,
          });
        }

        console.warn(`[Webhook Worker] Delivery ${deliveryId} failed (HTTP ${result.status}, attempt ${attempt}/${delivery.maxAttempts}).`);
        if (isRetryable) throw new Error(`HTTP ${result.status} — will retry`);
        return { failed: true, status: result.status };
      }
    } catch (err: any) {
      const isRetryable = attempt < delivery.maxAttempts;
      const backoffMs = Math.pow(2, attempt) * 5000;
      const nextAttemptAt = isRetryable ? new Date(Date.now() + backoffMs) : null;
      const errorMsg = (err.message || 'Erro desconhecido').substring(0, 500);

      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: isRetryable ? 'RETRYING' : 'FAILED',
          errorMessage: errorMsg,
          nextAttemptAt,
        },
      });

      if (!isRetryable) {
        await writeWebhookAudit(delivery.workspaceId, 'webhook.delivery_failed', deliveryId, {
          eventType: delivery.eventType,
          webhookId: delivery.webhookId,
          errorMessage: errorMsg,
          attempt,
        });
      }

      console.error(`[Webhook Worker] Delivery ${deliveryId} error (attempt ${attempt}):`, err.message);
      throw err;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WEBHOOK_MAX_CONCURRENCY || '5', 10),
  },
);

async function writeWebhookAudit(
  workspaceId: string,
  action: string,
  deliveryId: string,
  details: Record<string, unknown>,
) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        actorUserId: null,
        action,
        entityType: 'WEBHOOK_DELIVERY',
        entityId: deliveryId,
        afterJson: JSON.stringify(details),
        severity: action.includes('failed') ? 'WARN' : 'INFO',
      },
    });
  } catch (err: any) {
    console.warn('[Webhook Worker] Failed to write audit log:', err.message);
  }
}

/**
 * SLA MONITOR JOB WORKER
 * ============================================================================
 * Periodic job scanning active tickets for SLA breach warnings.
 * ============================================================================
 */
const slaMonitorWorker = new Worker(
  'sla-monitor',
  async (job: Job) => {
    console.log(`[SLA Monitor Worker] Running SLA check scan job ${job.id}...`);
    try {
      const activeTickets = await prisma.ticket.findMany({
        where: {
          status: {
            notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'],
          },
        },
      });

      const now = new Date();
      console.log(`[SLA Monitor Worker] Found ${activeTickets.length} active tickets to scan.`);

      for (const ticket of activeTickets) {
        // 1. First Response SLA Check
        if (!ticket.firstResponseAt && ticket.slaDueFirstResponseAt) {
          const due = new Date(ticket.slaDueFirstResponseAt);
          if (now > due) {
            console.warn(`[SLA Monitor Worker] BREACHED: Ticket ${ticket.number} ("${ticket.title}") has breached its First Response SLA.`);
            await emitUniqueWebhook({
              workspaceId: ticket.workspaceId,
              eventType: 'ticket.sla_breached',
              entityType: 'TICKET',
              entityId: ticket.id,
              periodKey: 'slaFirstResponseBreached',
              data: {
                ticketId: ticket.id,
                number: ticket.number,
                title: ticket.title,
                clientId: ticket.clientId,
                contractId: ticket.contractId,
                slaPolicyId: ticket.slaPolicyId,
                slaType: 'FIRST_RESPONSE',
                slaDueAt: ticket.slaDueFirstResponseAt.toISOString(),
              },
            }).catch(() => {});
          } else {
            const diffMs = due.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin <= 30) {
              console.log(`[SLA Monitor Worker] WARNING: Ticket ${ticket.number} is within ${diffMin} minutes of first response breach.`);
              await emitUniqueWebhook({
                workspaceId: ticket.workspaceId,
                eventType: 'ticket.sla_first_response_due_soon',
                entityType: 'TICKET',
                entityId: ticket.id,
                periodKey: 'slaFirstResponseDueSoon',
                data: {
                  ticketId: ticket.id,
                  number: ticket.number,
                  title: ticket.title,
                  clientId: ticket.clientId,
                  contractId: ticket.contractId,
                  slaPolicyId: ticket.slaPolicyId,
                  slaDueFirstResponseAt: ticket.slaDueFirstResponseAt.toISOString(),
                  remainingMinutes: diffMin,
                },
              }).catch(() => {});
            }
          }
        }

        // 2. Resolution SLA Check
        if (!ticket.resolvedAt && ticket.slaDueResolutionAt) {
          const due = new Date(ticket.slaDueResolutionAt);
          if (now > due) {
            console.warn(`[SLA Monitor Worker] BREACHED: Ticket ${ticket.number} ("${ticket.title}") has breached its Resolution SLA.`);
            await emitUniqueWebhook({
              workspaceId: ticket.workspaceId,
              eventType: 'ticket.sla_breached',
              entityType: 'TICKET',
              entityId: ticket.id,
              periodKey: 'slaResolutionBreached',
              data: {
                ticketId: ticket.id,
                number: ticket.number,
                title: ticket.title,
                clientId: ticket.clientId,
                contractId: ticket.contractId,
                slaPolicyId: ticket.slaPolicyId,
                slaType: 'RESOLUTION',
                slaDueAt: ticket.slaDueResolutionAt.toISOString(),
              },
            }).catch(() => {});
          } else {
            const diffMs = due.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin <= 60) {
              console.log(`[SLA Monitor Worker] WARNING: Ticket ${ticket.number} is within ${diffMin} minutes of resolution breach.`);
              await emitUniqueWebhook({
                workspaceId: ticket.workspaceId,
                eventType: 'ticket.sla_resolution_due_soon',
                entityType: 'TICKET',
                entityId: ticket.id,
                periodKey: 'slaResolutionDueSoon',
                data: {
                  ticketId: ticket.id,
                  number: ticket.number,
                  title: ticket.title,
                  clientId: ticket.clientId,
                  contractId: ticket.contractId,
                  slaPolicyId: ticket.slaPolicyId,
                  slaDueResolutionAt: ticket.slaDueResolutionAt.toISOString(),
                  remainingMinutes: diffMin,
                },
              }).catch(() => {});
            }
          }
        }
      }

      return { processedCount: activeTickets.length };
    } catch (err) {
      console.error('[SLA Monitor Worker] Error sweeping SLA policies:', err);
      throw err;
    }
  },
  { connection }
);

/**
 * BILLING SCHEDULER JOB WORKER
 * ============================================================================
 * Periodically sweeps active contracts to generate BillingScheduleEvents
 * for the current calendar month.
 * ============================================================================
 */
const billingSchedulerWorker = new Worker(
  'billing-schedule',
  async (_job: Job) => {
    console.log(`[Billing Scheduler Worker] Sweeping active contracts...`);
    try {
      // Trigger the daily commercial and operational scheduled webhook sweeps
      await runDailyWebhookSweeps().catch(err => {
        console.error('[Billing Scheduler Worker] Scheduled webhook sweeps failed:', err.message);
      });

      return { success: true };
    } catch (err) {
      console.error('[Billing Scheduler Worker] Error processing recurring billing sweep:', err);
      throw err;
    }
  },
  { connection }
);

// --- ERROR & FAILURE EVENTS LOGGING (Graceful fallbacks when Redis is offline) ---

pdfWorker.on('failed', (job, err) => {
  console.error(`[PDF Worker] Job ${job?.id} failed:`, err);
});
pdfWorker.on('error', (err) => {
  console.warn('[PDF Worker] Redis is offline (safe bypass):', err.message);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[Webhook Worker] Job ${job?.id} failed:`, err);
});
webhookWorker.on('error', (err) => {
  console.warn('[Webhook Worker] Redis is offline (safe bypass):', err.message);
});

slaMonitorWorker.on('failed', (job, err) => {
  console.error(`[SLA Monitor Worker] Job ${job?.id} failed:`, err);
});
slaMonitorWorker.on('error', (err) => {
  console.warn('[SLA Monitor Worker] Redis is offline (safe bypass):', err.message);
});

billingSchedulerWorker.on('failed', (job, err) => {
  console.error(`[Billing Scheduler Worker] Job ${job?.id} failed:`, err);
});
billingSchedulerWorker.on('error', (err) => {
  console.warn('[Billing Scheduler Worker] Redis is offline (safe bypass):', err.message);
});

console.log('✅ Workers are listening to queues [pdf-generation, webhook-dispatch, sla-monitor, billing-schedule] on Redis.');
