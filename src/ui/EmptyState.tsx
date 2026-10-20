import React from 'react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionProps?: Partial<ButtonProps>;
  withStripeMotif?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionProps,
  withStripeMotif = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`text-center py-12 px-6 rounded-card bg-paper border border-ink-10 max-w-md mx-auto ${className}`}
      {...props}
    >
      {/* Icon with signature stripe motif halo */}
      <div className="relative inline-flex items-center justify-center mb-5">
        {withStripeMotif && (
          <div className="absolute inset-0 -m-3 rounded-full awning-stripe-badge animate-pulse" />
        )}
        <div className="relative w-16 h-16 rounded-full bg-sand-20 border-2 border-sand flex items-center justify-center text-ink">
          {icon || (
            <svg
              className="w-8 h-8 text-ink"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          )}
        </div>
      </div>

      <h3 className="font-fraunces text-xl font-semibold text-ink mb-2">
        {title}
      </h3>

      <p className="text-sm text-ink/70 leading-relaxed max-w-sm mx-auto mb-6">
        {description}
      </p>

      {actionText && (
        <div>
          <Button
            variant="primary"
            onClick={onAction}
            {...actionProps}
          >
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
};
