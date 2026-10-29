import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, headerAction, className = '', ...props }) => {
  return (
    <div className={`bg-surface border border-outline-variant rounded-xl shadow-xl shadow-black/20 ${className}`} {...props}>
      {title && (
        <div className="rounded-t-xl p-md px-lg border-b border-outline-variant bg-surface-container-high flex justify-between items-center">
          <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-lg">
        {children}
      </div>
    </div>
  );
};

export default Card;
