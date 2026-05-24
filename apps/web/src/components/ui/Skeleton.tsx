import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ count = 1, className = '', ...props }) => {
  const rows = Array.from({ length: count });

  return (
    <div className="flex flex-col gap-3 w-full" {...props}>
      {rows.map((_, i) => (
        <div
          key={i}
          className={`h-10 bg-surface-container/60 border border-outline-variant/30 rounded-lg animate-pulse ${className}`}
        />
      ))}
    </div>
  );
};

export default Skeleton;
