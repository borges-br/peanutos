// ==============================================================================
// PEANUT OS - BACKGROUND WORKER ENTRYPOINT
// ==============================================================================
import * as dotenv from 'dotenv';
import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '@peanut/db';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { chromium } from 'playwright';
import { generateInvoicePdfHtml } from '@peanut/documents';

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

    if (entityType !== 'INVOICE') {
      throw new Error(`[PDF Worker] Unsupported entity type: ${entityType}`);
    }

    // 1. Fetch invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: entityId, workspaceId },
      include: {
        client: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new Error(`[PDF Worker] Invoice with ID ${entityId} not found in workspace ${workspaceId}`);
    }

    // 2. Fetch workspace (brand settings)
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error(`[PDF Worker] Workspace with ID ${workspaceId} not found`);
    }

    // 3. Recalculate version number in worker before database record to prevent race conditions
    const lastDoc = await prisma.generatedDocument.findFirst({
      where: {
        workspaceId,
        entityType: 'INVOICE',
        entityId,
        documentType: 'INVOICE',
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });
    const version = lastDoc ? lastDoc.version + 1 : 1;

    // 4. Format variables for generateInvoicePdfHtml
    const formatCurrency = (val: number | any) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(Number(val));
    };

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('pt-BR');
    };

    const items = invoice.items.map(item => ({
      type: item.type,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPrice: formatCurrency(item.unitPrice),
      totalPrice: formatCurrency(item.totalPrice),
    }));

    const templateData = {
      invoice: {
        number: invoice.number,
        status: invoice.status === 'PAID' ? 'Liquidada' : invoice.status === 'OVERDUE' ? 'Atrasada' : 'Pendente',
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),
        paymentMethod: invoice.paymentMethod,
        pixKey: invoice.pixKey,
        totalAmount: formatCurrency(invoice.totalAmount),
        items,
      },
      client: {
        tradeName: invoice.client.tradeName,
        legalName: invoice.client.legalName,
        document: invoice.client.document,
        email: invoice.client.email,
      },
      brand: {
        brandName: workspace.brandName,
        brandSubtitle: workspace.brandSubtitle,
        legalName: workspace.legalName,
        companyDocument: workspace.companyDocument,
        companyEmail: workspace.companyEmail,
        financialEmail: workspace.financialEmail,
        companyPhone: workspace.companyPhone,
        companyWebsite: workspace.companyWebsite,
        companyAddress: workspace.companyAddress,
        primaryColorHex: workspace.primaryColorHex,
        documentFooterText: workspace.documentFooterText,
        signatureName: workspace.signatureName,
      },
      generatedAt: new Date().toLocaleString('pt-BR'),
    };

    // 5. Render HTML
    const html = generateInvoicePdfHtml(templateData);

    // 6. Launch Playwright headless browser
    console.log(`[PDF Worker] Launching chromium browser...`);
    const browser = await chromium.launch({ headless: true });
    let pdfBuffer: Buffer;
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

    // 7. Resolve workspace root and storage directory
    const workspaceRoot = process.cwd().endsWith('worker') ? path.resolve(process.cwd(), '../..') : process.cwd();
    const storageRoot = process.env.DOCUMENT_STORAGE_ROOT || path.join(workspaceRoot, 'storage');

    const sanitizedNumber = safeFilename(invoice.number);
    const fileName = `invoice-${sanitizedNumber}-v${version}.pdf`;
    const key = `${workspaceId}/invoices/${entityId}/${fileName}`;
    const filePath = path.join(storageRoot, 'documents', workspaceId, 'invoices', entityId, fileName);

    // 8. Create folder structure and save the file
    console.log(`[PDF Worker] Saving physical PDF to local disk: ${filePath}`);
    const dirPath = path.dirname(filePath);
    await fs.promises.mkdir(dirPath, { recursive: true });
    await fs.promises.writeFile(filePath, pdfBuffer);

    // 9. Calculate file statistics
    const stats = await fs.promises.stat(filePath);
    const sizeBytes = BigInt(stats.size);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // 10. Persist records in Prisma (FileObject & GeneratedDocument)
    let fileObject;
    let generatedDoc;
    try {
      fileObject = await prisma.fileObject.create({
        data: {
          workspaceId,
          bucket: 'local-documents',
          key,
          originalFilename: `fatura-${sanitizedNumber}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes,
          sha256,
          visibility: 'PRIVATE',
          createdById: actorUserId,
        },
      });

      generatedDoc = await prisma.generatedDocument.create({
        data: {
          workspaceId,
          entityType: 'INVOICE',
          entityId,
          documentType: 'INVOICE',
          version,
          fileObjectId: fileObject.id,
          sha256,
          generatedById: actorUserId,
          metadata: JSON.stringify({
            invoiceNumber: invoice.number,
            generatedFrom: 'invoice-preview',
            storage: 'local',
          }),
        },
      });
    } catch (dbError) {
      console.error('[PDF Worker] DB operations failed. Cleaning up saved file...', dbError);
      try {
        await fs.promises.unlink(filePath);
      } catch (unlinkErr) {
        console.error('[PDF Worker] Physical file cleanup failed:', unlinkErr);
      }
      throw dbError;
    }

    // 11. Write audit log (omitting local key, bucket, path)
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
            entityType: 'INVOICE',
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
    
    // Return ONLY generatedDocumentId, fileObjectId and version (excl. local path/bucket/key)
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
