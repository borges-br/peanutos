// ==============================================================================
// PEANUT OS - SHARED UTILITIES & HELPERS
// ==============================================================================

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

/**
 * MOCK APPLICATION-LEVEL ENCRYPTION UTILITIES
 * ============================================================================
 * IMPORTANT FOR FUTURE AGENTS:
 * Implement secure symmetric encryption (e.g. AES-256-GCM) here using
 * process.env.APPLICATION_ENCRYPTION_KEY when cryptography is fully rolled out.
 * 
 * Current status: Stub implementation for Phase 0 (returns base64-encoded strings).
 * ============================================================================
 */

export function encryptSensitiveData(text: string): string {
  if (!text) return '';
  // Temporary transparent mock encryption (base64) for Phase 0 validation.
  // TO BE REPLACED WITH REAL AES-256-GCM in Phase 1/2.
  return Buffer.from(text, 'utf-8').toString('base64');
}

export function decryptSensitiveData(encryptedBase64: string): string {
  if (!encryptedBase64) return '';
  try {
    return Buffer.from(encryptedBase64, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Failed to decrypt data stub', error);
    return encryptedBase64;
  }
}
