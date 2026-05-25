import * as crypto from 'crypto';

const getEncryptionKey = (): Buffer => {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY || 'peanut-os-webhook-key-change-in-production!!';
  return crypto.createHash('sha256').update(raw).digest();
};

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encryptedSecret: string): string {
  const parts = encryptedSecret.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const ivHex = parts[0]!;
  const tagHex = parts[1]!;
  const encryptedHex = parts[2]!;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

export function computeHmacSignature(secret: string, timestamp: number, rawBody: string): string {
  const payload = `${timestamp}.${rawBody}`;
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${hash}`;
}
