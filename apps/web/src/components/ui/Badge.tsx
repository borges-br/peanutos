import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium tracking-wide uppercase';
  
  const variantClasses = {
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    neutral: 'bg-surface-container-highest text-on-surface-variant border-outline-variant',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
