import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string | null;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={id} className="text-[12px] font-medium text-on-surface-variant tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={`w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-all duration-200 cursor-pointer appearance-none disabled:opacity-40 disabled:cursor-not-allowed ${error ? 'border-error/50 focus:border-error' : ''} ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-surface">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/60">
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </div>
        </div>
        {error && (
          <span className="text-[11px] text-error mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
