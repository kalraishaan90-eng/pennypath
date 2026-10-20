import React, { forwardRef } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  withAwningAccent?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      withAwningAccent = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-paper border border-ink-10 shadow-card hover:shadow-card-hover transition-shadow duration-200',
      flat: 'bg-sand-10 border border-sand-20',
      outline: 'bg-transparent border-2 border-ink-20',
      interactive: 'bg-paper border border-ink-10 shadow-card hover:shadow-card-hover hover:border-ink-20 cursor-pointer transition-all duration-200 active:scale-[0.99]',
    };

    const paddingStyles = {
      none: 'p-0',
      sm: 'p-3 sm:p-4',
      md: 'p-4 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-card text-ink ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
        {...props}
      >
        {withAwningAccent && (
          <div className="absolute top-0 left-0 right-0 h-1.5 awning-stripe-accent" />
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`flex items-center justify-between pb-3 border-b border-ink-10 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`font-fraunces text-lg sm:text-xl font-semibold text-ink leading-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-ink/70 mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`mt-4 pt-3 border-t border-ink-10 flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);
