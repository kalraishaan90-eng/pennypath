import React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Value from 0 to 100 */
  value: number;
  /** Maximum value, defaults to 100 */
  max?: number;
  /** Label for accessibility and display */
  label?: string;
  /** Show numerical percentage text */
  showValueText?: boolean;
  /** Visual height */
  size?: 'sm' | 'md' | 'lg';
  /** Fill tone */
  tone?: 'ink' | 'accent' | 'sky' | 'sand';
  /** Always show awning stripe cap on leading edge */
  withAwningEdge?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValueText = false,
  size = 'md',
  tone = 'ink',
  withAwningEdge = true,
  className = '',
  ...props
}) => {
  const clampedValue = Math.min(Math.max(0, value), max);
  const percentage = Math.round((clampedValue / max) * 100);

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3.5',
    lg: 'h-5',
  };

  const toneFillClasses = {
    ink: 'bg-ink',
    accent: 'bg-accent',
    sky: 'bg-sky',
    sand: 'bg-sand',
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      {(label || showValueText) && (
        <div className="flex justify-between items-center text-xs font-medium text-ink mb-1.5">
          {label && <span>{label}</span>}
          {showValueText && <span className="tabular-nums font-semibold">{percentage}%</span>}
        </div>
      )}
      <div
        className={`w-full bg-sand-20 rounded-full overflow-hidden border border-sand-40 relative ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={`h-full transition-all duration-300 ease-out relative flex justify-end ${toneFillClasses[tone]}`}
          style={{ width: `${percentage}%` }}
        >
          {withAwningEdge && percentage > 4 && (
            <div
              className="absolute right-0 top-0 bottom-0 w-3.5 awning-stripe-accent shadow-sm"
              title="Awning stripe edge"
            />
          )}
        </div>
      </div>
    </div>
  );
};
