import { ptBR } from './dictionaries/pt-BR';
import { DEFAULT_LOCALE } from './config';

export function useI18n() {
  // Keeping it lightweight and simple as requested
  return {
    t: ptBR,
    locale: DEFAULT_LOCALE,
  };
}
