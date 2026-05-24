import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-[12px] font-medium text-on-surface-variant tracking-wide">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface placeholder-on-surface-variant/40 outline-none focus:border-primary transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${error ? 'border-error/50 focus:border-error' : ''} ${className}`}
          {...props}
        />
        {error && (
          <span className="text-[11px] text-error mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
