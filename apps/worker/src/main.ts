// ==============================================================================
// PEANUT OS - BACKGROUND WORKER ENTRYPOINT
// ==============================================================================
import * as dotenv from 'dotenv';
import { Worker, Job } from 'bullmq';

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

pdfWorker.on('failed', (job, err) => {
  console.error(`[PDF Worker] Job ${job?.id} failed:`, err);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`[Webhook Worker] Job ${job?.id} failed:`, err);
});

console.log('✅ Workers are listening to queues [pdf-generation, webhook-dispatch] on Redis.');
