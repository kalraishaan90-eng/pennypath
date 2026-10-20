import React, { forwardRef, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      fullWidth = true,
      className = '',
      id,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const hintId = `${selectId}-hint`;
    const errorId = `${selectId}-error`;

    return (
      <div className={`${fullWidth ? 'w-full' : 'inline-block'} text-left`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs sm:text-sm font-medium text-ink mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            aria-invalid={!!error}
            className={`
              w-full min-h-[44px] px-3.5 py-2.5 pr-10 rounded-btn text-sm sm:text-base text-ink bg-paper
              border transition-colors duration-150 appearance-none cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-ink focus:border-ink
              disabled:opacity-50 disabled:bg-sand-10 disabled:cursor-not-allowed
              ${error ? 'border-accent focus:ring-accent focus:border-accent' : 'border-ink-20 hover:border-ink-40'}
              ${className}
            `}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3.5 pointer-events-none text-ink/60">
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p id={errorId} className="text-xs text-accent font-medium mt-1.5 flex items-center gap-1">
            <span aria-hidden="true">⚠</span> {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="text-xs text-ink/60 mt-1.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
