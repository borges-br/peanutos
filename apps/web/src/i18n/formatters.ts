import { DEFAULT_LOCALE } from './config';

export function formatDateTime(
  date: Date | string | number | null | undefined,
  locale: string = DEFAULT_LOCALE,
  timeZone: string = 'America/Sao_Paulo'
): string {
  if (!date) return '--';
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return '--';

  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsedDate);
}

export function formatCurrency(
  valueInCents: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
  currency: string = 'BRL'
): string {
  if (valueInCents === null || valueInCents === undefined) return '--';
  
  const value = valueInCents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatNumber(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE
): string {
  if (value === null || value === undefined) return '--';
  return new Intl.NumberFormat(locale).format(value);
}
