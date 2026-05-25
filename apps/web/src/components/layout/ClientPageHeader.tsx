import React from 'react';
import Breadcrumbs, { BreadcrumbItem } from './Breadcrumbs';

export interface ClientPageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: React.ReactNode;
  description?: React.ReactNode;
  status?: React.ReactNode;
  primaryActions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
}

export const ClientPageHeader: React.FC<ClientPageHeaderProps> = ({
  breadcrumbs,
  title,
  description,
  status,
  primaryActions,
  secondaryActions,
  tabs,
  className = '',
}) => {
  const hasActions = Boolean(primaryActions || secondaryActions);

  return (
    <header className={`flex w-full flex-col gap-md border-b border-outline-variant/30 pb-lg ${className}`}>
      <div className="flex w-full flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-xs">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-center gap-sm pt-1">
            <h1 className="font-display-lg text-2xl font-semibold tracking-tight text-on-surface break-words">
              {title}
            </h1>
            {status}
          </div>
          {description && (
            <p className="max-w-3xl text-[14px] leading-relaxed text-on-surface-variant">
              {description}
            </p>
          )}
        </div>

        {hasActions && (
          <div className="flex w-full flex-col-reverse gap-sm sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {secondaryActions}
            {primaryActions}
          </div>
        )}
      </div>

      {tabs}
    </header>
  );
};

export default ClientPageHeader;
