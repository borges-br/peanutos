import React from 'react';
import { useI18n } from '../../i18n/useI18n';

export interface PlannedStateProps {
  title?: string;
  description?: string;
}

export const PlannedState: React.FC<PlannedStateProps> = ({ title, description }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center text-center p-xl bg-surface border border-outline-variant rounded-xl gap-sm shadow-xl shadow-black/10">
      <span className="material-symbols-outlined text-4xl text-primary/80 mb-2">
        event_upcoming
      </span>
      <h3 className="font-title-sm text-sm font-semibold text-on-surface">
        {title || t.states.plannedTitle}
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-sm">
        {description || t.states.plannedDescription}
      </p>
      <div className="mt-md">
        <span className="inline-flex items-center gap-xs px-sm py-xs rounded bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <span className="material-symbols-outlined text-sm">lock</span>
          {t.common.planned}
        </span>
      </div>
    </div>
  );
};

export default PlannedState;
