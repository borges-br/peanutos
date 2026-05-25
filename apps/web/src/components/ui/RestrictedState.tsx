import React from 'react';
import { useI18n } from '../../i18n/useI18n';

export interface RestrictedStateProps {
  title?: string;
  description?: string;
}

export const RestrictedState: React.FC<RestrictedStateProps> = ({ title, description }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center text-center p-xl bg-surface border border-outline-variant rounded-xl gap-sm shadow-xl shadow-black/10">
      <span className="material-symbols-outlined text-4xl text-warning/80 mb-2">
        lock
      </span>
      <h3 className="font-title-sm text-sm font-semibold text-on-surface">
        {title || t.states.restrictedTitle}
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-sm">
        {description || t.states.restrictedDescription}
      </p>
    </div>
  );
};

export default RestrictedState;
