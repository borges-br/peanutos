import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`w-full overflow-hidden ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-on-surface-variant">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || !item.href;

          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <li aria-hidden className="text-on-surface-variant/35">
                  /
                </li>
              )}
              <li className="min-w-0 max-w-full">
                {isLast ? (
                  <span
                    aria-current="page"
                    className="block max-w-[220px] truncate text-on-surface-variant/75 sm:max-w-none"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href!}
                    className="block max-w-[220px] truncate font-medium text-primary transition-colors hover:text-primary-fixed sm:max-w-none"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
