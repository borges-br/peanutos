import React from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useBrand } from '../../context/BrandContext';
import { artworkAsset } from '../../lib/visual-brand';
import AuthenticatedImage from './AuthenticatedImage';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  module?: 'clients' | 'inventory' | 'tickets' | 'contracts' | 'invoices' | 'documents';
  filtered?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, module, filtered = false }) => {
  const { t } = useI18n();
  const { config, assets, scheme } = useBrand();
  const image = config && module && !filtered ? artworkAsset(config,assets,scheme,module) : null;

  return (
    <div className="flex flex-col items-center justify-center text-center p-xl bg-surface border border-outline-variant rounded-xl gap-sm shadow-xl shadow-black/10">
      {image ? <AuthenticatedImage src={image} alt="" className="brand-empty-illustration" /> : !module && <span className="material-symbols-outlined text-4xl text-primary/70 mb-2" aria-hidden="true">
        inbox
      </span>}
      <h3 className="font-title-sm text-sm font-semibold text-on-surface">
        {filtered ? 'Nenhum resultado com estes filtros.' : title || t.states.emptyTitle}
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-sm">
        {filtered ? 'Altere a busca ou remova os filtros para encontrar seus registros.' : description || t.states.emptyDescription}
      </p>
      {action && !filtered && <div className="mt-md">{action}</div>}
    </div>
  );
};

export default EmptyState;
