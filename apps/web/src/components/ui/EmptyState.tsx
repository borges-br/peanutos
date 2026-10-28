import React from 'react';
import { useI18n } from '../../i18n/useI18n';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center text-center p-xl bg-surface border border-outline-variant rounded-xl gap-sm shadow-xl shadow-black/10">
      <span className="material-symbols-outlined text-4xl text-primary/70 mb-2">
        inbox
      </span>
      <h3 className="font-title-sm text-sm font-semibold text-on-surface">
        {title || t.states.emptyTitle}
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-sm">
        {description || t.states.emptyDescription}
      </p>
      {action && <div className="mt-md">{action}</div>}
    </div>
  );
};

export default EmptyState;
