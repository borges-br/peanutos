export const DEFAULT_LOCALE = 'pt-BR' as const;
export const SUPPORTED_LOCALES = ['pt-BR'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
