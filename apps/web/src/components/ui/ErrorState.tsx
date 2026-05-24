import React from 'react';
import { useI18n } from '../../i18n/useI18n';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ title, description, onRetry }) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center text-center p-xl bg-surface border border-error-container/20 rounded-xl gap-sm shadow-xl shadow-black/10">
      <span className="material-symbols-outlined text-4xl text-error/80 mb-2">
        error
      </span>
      <h3 className="font-title-sm text-sm font-semibold text-error">
        {title || t.states.errorTitle}
      </h3>
      <p className="text-[13px] text-on-surface-variant max-w-sm">
        {description || t.states.errorDescription}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-md">
          {t.common.retry}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
