import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  planned?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', loading, planned, className = '', disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium text-body-sm transition-all rounded-lg select-none px-4 py-1.5 focus:outline-none active:scale-95 duration-200';
    
    const variantClasses = {
      primary: 'bg-primary text-on-primary-fixed hover:bg-primary-fixed-dim border border-primary/20 shadow-lg shadow-primary/5',
      secondary: 'bg-surface-container-highest text-on-surface hover:bg-outline-variant border border-outline-variant',
      outline: 'border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary',
      danger: 'bg-error-container/20 text-error hover:bg-error-container/30 border border-error-container/40',
      ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
    };

    const isDisabled = disabled || loading || planned;

    if (planned) {
      return (
        <button
          ref={ref}
          disabled
          className={`${baseClasses} bg-surface-container-low text-on-surface-variant/40 border border-outline-variant/30 cursor-not-allowed ${className}`}
          title="Módulo planejado para uma próxima fase"
          {...props}
        >
          <span className="material-symbols-outlined text-[14px] mr-2">lock</span>
          {children}
          <span className="text-[9px] bg-secondary-container/30 text-on-secondary-container px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter ml-2">
            Planejado
          </span>
        </button>
      );
    }

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${isDisabled ? 'opacity-40 cursor-not-allowed active:scale-100' : ''} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
