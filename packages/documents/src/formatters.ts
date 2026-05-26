import { cpf, cnpj } from 'cpf-cnpj-validator';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

/**
 * Format document string (CPF or CNPJ) to standard Brazilian formatting or fallback
 */
export function formatCpfCnpj(value: string | null | undefined, _locale: string = 'pt-BR'): string {
  if (!value) return '';
  const clean = value.replace(/\D/g, '');
  
  if (clean.length === 11) {
    return cpf.format(clean);
  }
  if (clean.length === 14) {
    return cnpj.format(clean);
  }
  
  // Generic fallback if length is not exactly 11 or 14
  return value;
}

/**
 * Format phone to standard format, defaulting to Brazil
 */
export function formatPhone(value: string | null | undefined, defaultCountry: string = 'BR'): string {
  if (!value) return '';
  const clean = value.trim();
  
  try {
    const phoneNumber = parsePhoneNumberFromString(clean, defaultCountry as CountryCode);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatNational();
    }
  } catch (e) {
    // Ignore and fallback to custom formatter below
  }

  // Regex fallback for Brazilian phone numbers
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return value;
}

/**
 * Format currency with dynamic locale and currency code
 */
export function formatCurrency(value: number | string | null | undefined, locale: string = 'pt-BR', currency: string = 'BRL'): string {
  if (value === null || value === undefined) return '';
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numericValue)) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(numericValue);
}

/**
 * Format date with optional locale and timezone
 */
export function formatDate(value: Date | string | null | undefined, locale: string = 'pt-BR', timeZone?: string): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return '';
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  
  if (timeZone) {
    options.timeZone = timeZone;
  }
  
  return new Intl.DateTimeFormat(locale, options).format(date);
}
