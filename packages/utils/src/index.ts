// ==============================================================================
// PEANUT OS - SHARED UTILITIES & HELPERS
// ==============================================================================

import * as crypto from 'crypto';
export * from './object-storage';
export * from './timezone';

/**
 * Format document string (CPF or CNPJ) to standard Brazilian formatting
 */
export function formatDocument(document: string): string {
  const clean = document.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return document;
}

/**
 * Format currency to BRL Brazilian Real
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const envKey = process.env.APP_ENCRYPTION_KEY || process.env.APPLICATION_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('Chave de criptografia não fornecida (APP_ENCRYPTION_KEY ou APPLICATION_ENCRYPTION_KEY)');
  }

  // 1. Try parsing as hex (64 chars)
  if (envKey.length === 64 && /^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }

  // 2. Try parsing as base64
  try {
    const parsedBase64 = Buffer.from(envKey, 'base64');
    if (parsedBase64.length === 32) {
      return parsedBase64;
    }
  } catch (e) {
    // ignore and check raw next
  }

  // 3. Try raw string if it has exactly 32 bytes
  const rawBuffer = Buffer.from(envKey, 'utf-8');
  if (rawBuffer.length === 32) {
    return rawBuffer;
  }

  throw new Error(`Chave de criptografia inválida. A chave deve ter exatamente 32 bytes (recebido: ${rawBuffer.length} bytes, ou representação hex/base64 inválida).`);
}

/**
 * Encrypt a plain text string using AES-256-GCM
 */
export function encryptString(plainText: string): string {
  if (!plainText) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 12 bytes IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  const ivBase64 = iv.toString('base64');
  
  return `v1:gcm:${ivBase64}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a cipher text string using AES-256-GCM
 */
export function decryptString(cipherText: string): string {
  if (!cipherText) return '';
  
  // Backward compatibility for Phase 0 stub (base64)
  if (!cipherText.startsWith('v1:gcm:')) {
    try {
      return Buffer.from(cipherText, 'base64').toString('utf-8');
    } catch (e) {
      return cipherText;
    }
  }
  
  const parts = cipherText.split(':');
  if (parts.length !== 5 || parts[0] !== 'v1' || parts[1] !== 'gcm') {
    throw new Error('Formato de payload criptografado inválido');
  }
  
  const ivBase64 = parts[2]!;
  const authTagBase64 = parts[3]!;
  const encryptedBase64 = parts[4]!;
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt any data (typically object or string)
 */
export function encryptSensitiveData(data: unknown): string {
  if (data === undefined || data === null) return '';
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return encryptString(text);
}

/**
 * Decrypt cipher text back to its original form (either string or parsed JSON object)
 */
export function decryptSensitiveData<T = unknown>(cipherText: string): T {
  if (!cipherText) return null as T;
  const decrypted = decryptString(cipherText);
  try {
    return JSON.parse(decrypted) as T;
  } catch (e) {
    return decrypted as T;
  }
}
