import React from 'react';

export type BadgeVariant = 'ink' | 'sand' | 'accent' | 'sky' | 'awning' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'ink',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    ink: 'bg-ink-10 text-ink border border-ink-20',
    sand: 'bg-sand-20 text-ink border border-sand-40',
    accent: 'bg-accent-10 text-accent border border-accent-20',
    sky: 'bg-sky-20 text-ink border border-sky-40',
    awning: 'awning-stripe-badge text-accent border border-accent-20 font-semibold',
    outline: 'bg-transparent text-ink border border-ink-20',
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5 rounded-md gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 rounded-full gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 -ml-0.5">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
