// ==============================================================================
// PEANUT OS - BACKGROUND WORKER ENTRYPOINT
// ==============================================================================
import * as dotenv from 'dotenv';
import { Worker, Job, Queue } from 'bullmq';
import { prisma } from '@peanut/db';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import { chromium } from 'playwright';
import { generateInvoicePdfHtml } from '@peanut/documents';
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Load environment variables from root or local
dotenv.config({ override: true });

// S3 Client initialization with resilient fallbacks
const normalizeS3Endpoint = (endpoint?: string) => {
  const value = endpoint || "http://localhost:9000";
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
};

const s3Endpoint = normalizeS3Endpoint(process.env.S3_ENDPOINT);
const s3AccessKey = process.env.S3_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || "minio_admin";
const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || "change-me-in-production";
const s3Bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || "peanut-os-documents";
const s3Region = process.env.S3_REGION || "us-east-1";
const s3ForcePathStyle = String(process.env.S3_FORCE_PATH_STYLE ?? "true") === "true";

const s3Client = new S3Client({
  endpoint: s3Endpoint,
  region: s3Region,
  credentials: {
    accessKeyId: s3AccessKey,
    secretAccessKey: s3SecretKey,
  },
  forcePathStyle: s3ForcePathStyle,
});

/**
 * Auto-create target S3 bucket in non-production environments
 */
async function ensureBucketExists() {
  const isProduction = process.env.NODE_ENV === 'production';
  const autoCreate = process.env.S3_AUTO_CREATE_BUCKET === 'true';

  if (!isProduction && autoCreate) {
    console.log(`[S3 Initialize] Checking bucket "${s3Bucket}" existence...`);
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
      console.log(`[S3 Initialize] Bucket "${s3Bucket}" is ready.`);
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        console.log(`[S3 Initialize] Bucket "${s3Bucket}" not found. Creating it dynamically...`);
        try {
          await s3Client.send(new CreateBucketCommand({ Bucket: s3Bucket }));
          console.log(`[S3 Initialize] Bucket "${s3Bucket}" created successfully.`);
        } catch (createErr: any) {
          console.error(`[S3 Initialize] Failed to create bucket "${s3Bucket}":`, createErr.message);
        }
      } else {
        console.warn(`[S3 Initialize] HeadBucket query failed (safe bypass):`, err.message);
      }
    }
  } else {
    console.log(`[S3 Initialize] Dynamic bucket auto-creation bypassed. Production = ${isProduction}, AutoCreate = ${autoCreate}`);
  }
}

ensureBucketExists().catch(err => {
  console.warn('[S3 Initialize] Auto-create check threw unhandled error:', err.message);
});

console.log('👷 Background job worker initializing...');

// ==============================================================================
// WEBHOOK EVENT EMITTER (standalone, no NestJS DI)
// ==============================================================================

const WORKER_SENSITIVE_KEYS = new Set([
  'password', 'passwordhash', 'token', 'secret', 'encryptedsecret',
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

    const webhookDispatchQueue = new Queue('webhook-dispatch', { connection });
    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: event.eventType,
      createdAt: new Date().toISOString(),
      workspaceId: event.workspaceId,
      data: workerSanitize(event.data),
    };

    for (const endpoint of endpoints) {
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
        await webhookDispatchQueue.add('webhook-dispatch', { deliveryId: delivery.id }, {
          attempts: 5,
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

    // 2. Fetch workspace (brand settings) + responsible user
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    const responsibleUser = actorUserId ? await prisma.user.findUnique({ where: { id: actorUserId } }) : null;

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
        documentSecondaryColor: (workspace as any).documentSecondaryColor,
        documentAccentColor: (workspace as any).documentAccentColor,
        documentFooterText: workspace.documentFooterText,
        signatureName: workspace.signatureName,
        logoUrl: (workspace as any).logoFileObjectId
          ? `${process.env.INTERNAL_API_URL || 'http://localhost:3001'}/api/v1/files/${(workspace as any).logoFileObjectId}`
          : null,
      },
      responsible: responsibleUser ? {
        userId: responsibleUser.id,
        displayName: (responsibleUser as any).documentDisplayName || responsibleUser.name,
        jobTitle: (responsibleUser as any).jobTitle || null,
        signatureImageUrl: (responsibleUser as any).signatureImageFileObjectId
          ? `${process.env.INTERNAL_API_URL || 'http://localhost:3001'}/api/v1/files/${(responsibleUser as any).signatureImageFileObjectId}`
          : null,
        signatureEnabled: (responsibleUser as any).documentSignatureEnabled ?? false,
      } : null,
      generatedAt: new Date().toLocaleString('pt-BR'),
    };

    // Build snapshots for metadata
    const brandSnapshot = {
      publicName: workspace.brandName,
      brandSubtitle: workspace.brandSubtitle,
      legalName: workspace.legalName,
      taxId: workspace.companyDocument,
      email: workspace.companyEmail,
      phone: workspace.companyPhone,
      website: workspace.companyWebsite,
      address: workspace.companyAddress,
      documentPrimaryColor: workspace.primaryColorHex,
      footerText: workspace.documentFooterText,
      hasLogo: !!(workspace as any).logoFileObjectId,
    };

    const responsibleSnapshot = responsibleUser ? {
      userId: responsibleUser.id,
      displayName: (responsibleUser as any).documentDisplayName || responsibleUser.name,
      jobTitle: (responsibleUser as any).jobTitle || null,
      signatureEnabled: (responsibleUser as any).documentSignatureEnabled ?? false,
    } : null;

    // 5. Render HTML
    const html = generateInvoicePdfHtml(templateData);

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

    const sanitizedNumber = safeFilename(invoice.number);
    const fileName = `invoice-${sanitizedNumber}-v${version}.pdf`;
    const key = `${workspaceId}/invoices/${entityId}/${fileName}`;

    // 7. Upload the buffer directly to MinIO
    console.log(`[PDF Worker] Uploading PDF buffer to MinIO bucket "${s3Bucket}" key "${key}"...`);
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }));
    } catch (uploadErr: any) {
      console.error('[PDF Worker] MinIO upload command failed:', uploadErr.message);
      // Throw generic secure error (omit internal paths / endpoints / S3 keys)
      throw new Error(`Falha ao salvar o arquivo no armazenamento em nuvem.`);
    }

    // 8. Calculate file statistics from memory buffer
    const sizeBytes = BigInt(pdfBuffer.length);
    const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // 9. Persist records in Prisma (FileObject & GeneratedDocument)
    let fileObject;
    let generatedDoc;
    try {
      fileObject = await prisma.fileObject.create({
        data: {
          workspaceId,
          bucket: s3Bucket,
          key,
          originalFilename: `fatura-${sanitizedNumber}-v${version}.pdf`,
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
            storage: 's3',
            brandSnapshot,
            responsibleSnapshot,
            templateSnapshot: {
              documentType: 'INVOICE',
              templateKey: 'standard',
              layoutVariant: 'default',
            },
          }),
        },
      });
    } catch (dbError: any) {
      console.error('[PDF Worker] DB operations failed. Cleaning up S3 object...', dbError.message);
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: s3Bucket,
          Key: key,
        }));
      } catch (deleteErr: any) {
        console.error('[PDF Worker] S3 Object cleanup failed:', deleteErr.message);
      }
      throw new Error(`Falha ao registrar o documento no banco de dados.`);
    }

    // 10. Write audit log (omitting S3 path/bucket/key) only after real transaction success
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

    // Emit document.generated webhook event (non-blocking)
    emitWebhookEventFromWorker({
      workspaceId,
      eventType: 'document.generated',
      entityId: generatedDoc.id,
      data: {
        documentId: generatedDoc.id,
        entityType: 'INVOICE',
        entityId,
        documentType: 'INVOICE',
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
      include: { webhook: true },
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
      const result = await doHttpPost(delivery.webhook.url, rawBody, headers, 8000);
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
