import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      prefixIcon,
      suffixIcon,
      fullWidth = true,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    return (
      <div className={`${fullWidth ? 'w-full' : 'inline-block'} text-left`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs sm:text-sm font-medium text-ink mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-ink/60">
              {prefixIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            aria-invalid={!!error}
            className={`
              w-full min-h-[44px] px-3.5 py-2.5 rounded-btn text-sm sm:text-base text-ink bg-paper
              border transition-colors duration-150 placeholder:text-ink/40
              focus:outline-none focus:ring-2 focus:ring-ink focus:border-ink
              disabled:opacity-50 disabled:bg-sand-10 disabled:cursor-not-allowed
              ${error ? 'border-accent focus:ring-accent focus:border-accent' : 'border-ink-20 hover:border-ink-40'}
              ${prefixIcon ? 'pl-10' : ''}
              ${suffixIcon ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-ink/60">
              {suffixIcon}
            </div>
          )}
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

Input.displayName = 'Input';
