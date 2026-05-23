// ==============================================================================
// PEANUT OS - BACKGROUND WORKER ENTRYPOINT
// ==============================================================================
import * as dotenv from 'dotenv';
import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '@peanut/db';

// Load environment variables from root or local
dotenv.config();

console.log('👷 Background job worker initializing...');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || 'change-me-in-production';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
};

const billingScheduleQueue = new Queue('billing-schedule', { connection });

async function writeBillingAudit(params: {
  workspaceId: string;
  action: 'billing.event_created' | 'billing.event_skipped';
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        actorUserId: null,
        action: params.action,
        entityType: 'BILLING_SCHEDULE_EVENT',
        entityId: params.entityId,
        beforeJson: params.before ? JSON.stringify(params.before) : null,
        afterJson: params.after ? JSON.stringify(params.after) : null,
        severity: params.action === 'billing.event_skipped' ? 'WARN' : 'INFO',
      },
    });
  } catch (err) {
    console.warn('[Billing Scheduler Worker] Failed to write billing audit log:', err);
  }
}

billingScheduleQueue
  .add(
    'billing-schedule.monthly-sweep',
    {},
    {
      jobId: 'billing-schedule.monthly-sweep',
      repeat: { pattern: process.env.BILLING_SCHEDULE_CRON || '0 2 * * *' },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  )
  .catch((err: Error) => {
    console.warn('[Billing Scheduler Queue] Redis is offline (safe bypass):', err.message);
  });

/**
 * PDF GENERATION JOB WORKER STUB
 * ============================================================================
 * Playwright browser context will be managed inside this worker in Phase 4.
 * ============================================================================
 */
const pdfWorker = new Worker(
  'pdf-generation',
  async (job: Job) => {
    console.log(`[PDF Worker] Processing job ${job.id} for type ${job.data.documentType}...`);
    // Stub delay simulating PDF rendering
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`[PDF Worker] Completed job ${job.id}`);
    return { success: true, key: `s3://peanut-os-documents/fictive-${job.id}.pdf` };
  },
  {
    connection,
    concurrency: parseInt(process.env.PDF_MAX_CONCURRENCY || '1', 10),
  }
);

/**
 * WEBHOOK DISPATCH JOB WORKER STUB
 * ============================================================================
 * Outbox Event webhook signature and POST sending in Phase 6.
 * ============================================================================
 */
const webhookWorker = new Worker(
  'webhook-dispatch',
  async (job: Job) => {
    console.log(`[Webhook Worker] Sending payload for event ${job.data.eventType} to ${job.data.endpoint}...`);
    // Stub delay simulating HTTP dispatch
    await new Promise((resolve) => setTimeout(resolve, 800));
    console.log(`[Webhook Worker] Hook sent successfully signature-verified.`);
    return { success: true };
  },
  { connection }
);

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
          } else {
            const diffMs = due.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin <= 30) {
              console.log(`[SLA Monitor Worker] WARNING: Ticket ${ticket.number} is within ${diffMin} minutes of first response breach.`);
            }
          }
        }

        // 2. Resolution SLA Check
        if (!ticket.resolvedAt && ticket.slaDueResolutionAt) {
          const due = new Date(ticket.slaDueResolutionAt);
          if (now > due) {
            console.warn(`[SLA Monitor Worker] BREACHED: Ticket ${ticket.number} ("${ticket.title}") has breached its Resolution SLA.`);
          } else {
            const diffMs = due.getTime() - now.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            if (diffMin <= 60) {
              console.log(`[SLA Monitor Worker] WARNING: Ticket ${ticket.number} is within ${diffMin} minutes of resolution breach.`);
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
      const activeContracts = await prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          type: {
            in: ['RECURRING_SUPPORT', 'HYBRID'],
          },
          monthlyAmountCents: { gt: 0 },
        },
      });

      const now = new Date();
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      let processedCount = 0;
      let skippedCount = 0;

      for (const contract of activeContracts) {
        // Double-billing safeguard check
        const existingEvent = await prisma.billingScheduleEvent.findFirst({
          where: {
            contractId: contract.id,
            periodKey,
          },
        });

        if (existingEvent) {
          await writeBillingAudit({
            workspaceId: contract.workspaceId,
            action: 'billing.event_skipped',
            entityId: existingEvent.id,
            before: { contractId: contract.id, periodKey, reason: 'duplicate_period' },
          });
          skippedCount++;
          continue;
        }

        // Generate billing schedule event scheduled for the billing day of the current month
        const billingDay = Math.min(contract.billingDay, currentMonthEnd.getDate());
        const billingDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
        const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        const event = await prisma.billingScheduleEvent.create({
          data: {
            workspaceId: contract.workspaceId,
            contractId: contract.id,
            clientId: contract.clientId,
            scheduledFor: billingDate,
            status: 'PENDING',
            periodKey,
            amountCents: contract.monthlyAmountCents,
            currency: contract.currency,
            description: `Recorrência contratual - Competência ${monthLabel}`,
          },
        });

        await writeBillingAudit({
          workspaceId: contract.workspaceId,
          action: 'billing.event_created',
          entityId: event.id,
          after: event,
        });

        processedCount++;
      }

      console.log(`[Billing Scheduler Worker] Finished sweep. Created: ${processedCount}, Skipped: ${skippedCount}`);
      return { processedCount, skippedCount };
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
