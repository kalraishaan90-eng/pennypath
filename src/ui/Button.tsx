import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Exact token styling:
    // primary: ink bg (#0F414A), paper text (#EFE8DF)
    // secondary: sand bg (#D8BA98), ink text (#0F414A)
    // danger: accent bg (#7F0303), paper text (#EFE8DF)
    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-ink text-paper hover:bg-ink-light active:bg-ink-dark shadow-sm focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
      secondary: 'bg-sand text-ink hover:bg-sand-light active:bg-sand-dark shadow-sm focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
      danger: 'bg-accent text-paper hover:bg-accent-light active:bg-accent-dark shadow-sm focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
      ghost: 'bg-transparent text-ink hover:bg-ink-10 active:bg-ink-20 focus-visible:ring-2 focus-visible:ring-ink',
      outline: 'bg-transparent border-2 border-ink text-ink hover:bg-ink-10 active:bg-ink-20 focus-visible:ring-2 focus-visible:ring-ink',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] rounded-lg gap-1.5',
      md: 'text-sm font-medium px-4 py-2.5 min-h-[44px] rounded-btn gap-2',
      lg: 'text-base font-semibold px-6 py-3 min-h-[48px] rounded-btn gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center font-medium transition-all duration-150 select-none
          touch-target outline-none disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
