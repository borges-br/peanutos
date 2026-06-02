import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SelectOption } from './Select';

interface SearchableSelectProps {
  id?: string;
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: string | null;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export default function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  error,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhum resultado encontrado.',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = options.find((option) => option.value === value);
  const displayValue = open ? query : selectedOption?.label || options[0]?.label || '';

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery) ||
      option.value.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectOption = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[12px] font-medium tracking-wide text-on-surface-variant">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={displayValue}
          disabled={disabled}
          placeholder={searchPlaceholder}
          onFocus={openList}
          onClick={openList}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
            if (event.key === 'ArrowDown') {
              setOpen(true);
            }
          }}
          className={`w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 pr-10 text-body-sm text-on-surface outline-none transition-all duration-200 focus:border-primary disabled:cursor-not-allowed disabled:opacity-40 ${error ? 'border-error/50 focus:border-error' : ''} ${className}`}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={open ? () => setOpen(false) : openList}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-on-surface-variant/70 hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={open ? 'Fechar lista' : 'Abrir lista'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {open ? 'expand_less' : 'expand_more'}
          </span>
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-64 overflow-y-auto rounded-lg border border-outline-variant bg-surface shadow-2xl">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-on-surface-variant">{emptyMessage}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                disabled={option.disabled}
                onClick={() => selectOption(option)}
                className={`flex w-full items-center justify-between gap-sm px-4 py-2 text-left text-body-sm transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-50 ${
                  option.value === value ? 'bg-primary/10 text-primary' : 'text-on-surface'
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value && (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {error && <span className="mt-0.5 text-[11px] text-error">{error}</span>}
    </div>
  );
}
