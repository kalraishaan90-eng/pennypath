import React from 'react';
import { Card } from './Card';
import { Money } from './Money';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number | string | React.ReactNode;
  isCurrency?: boolean;
  inPaise?: boolean;
  currencyTone?: 'default' | 'positive' | 'negative' | 'accent' | 'muted';
  subtext?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'card' | 'simple';
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  isCurrency = false,
  inPaise = false,
  currencyTone = 'default',
  subtext,
  badge,
  icon,
  variant = 'card',
  className = '',
  ...props
}) => {
  const content = (
    <div className={`flex flex-col justify-between ${className}`} {...props}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs sm:text-sm font-medium text-ink/70">{label}</span>
        {icon && <div className="p-2 rounded-lg bg-sand-20 text-ink shrink-0">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        {isCurrency && typeof value === 'number' ? (
          <Money
            amount={value}
            inPaise={inPaise}
            tone={currencyTone}
            size="2xl"
          />
        ) : (
          <span className="text-2xl sm:text-3xl font-bold font-fraunces text-ink tracking-tight tabular-nums">
            {value}
          </span>
        )}
        {badge}
      </div>

      {subtext && (
        <p className="text-xs text-ink/60 mt-1.5">{subtext}</p>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card padding="md" className="h-full">
        {content}
      </Card>
    );
  }

  return content;
};
