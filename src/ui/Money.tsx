import React from 'react';

export interface MoneyProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Amount to format. In rupees by default, or in paise if inPaise=true */
  amount: number | bigint;
  /** Whether the input amount is in paise (1 INR = 100 paise) */
  inPaise?: boolean;
  /** Show + sign for positive numbers */
  showPositiveSign?: boolean;
  /** Hide fraction digits (.00) when zero */
  hideZeroDecimals?: boolean;
  /** Force fraction digits */
  fractionDigits?: number;
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Currency code/symbol */
  currencySymbol?: string;
  /** Color theme */
  tone?: 'default' | 'positive' | 'negative' | 'accent' | 'muted';
}

/**
 * Formats a number to Indian currency format (e.g. 1,23,456.78).
 * Uses en-IN locale grouping (thousands, lakhs, crores).
 */
export function formatINR(
  rupees: number,
  options: {
    hideZeroDecimals?: boolean;
    fractionDigits?: number;
    currencySymbol?: string;
    showPositiveSign?: boolean;
  } = {}
): { formattedNumber: string; isNegative: boolean; symbol: string } {
  const {
    hideZeroDecimals = true,
    fractionDigits,
    currencySymbol = '₹',
    showPositiveSign = false,
  } = options;

  const isNegative = rupees < 0;
  const absValue = Math.abs(rupees);

  let decimals = fractionDigits;
  if (decimals === undefined) {
    if (hideZeroDecimals && Math.floor(absValue) === absValue) {
      decimals = 0;
    } else {
      decimals = 2;
    }
  }

  const formattedValue = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absValue);

  let prefix = '';
  if (isNegative) {
    prefix = '-';
  } else if (showPositiveSign && rupees > 0) {
    prefix = '+';
  }

  return {
    formattedNumber: `${prefix}${currencySymbol}${formattedValue}`,
    isNegative,
    symbol: currencySymbol,
  };
}

export const Money: React.FC<MoneyProps> = ({
  amount,
  inPaise = false,
  showPositiveSign = false,
  hideZeroDecimals = true,
  fractionDigits,
  size = 'md',
  currencySymbol = '₹',
  tone = 'default',
  className = '',
  ...props
}) => {
  const numericAmount = typeof amount === 'bigint' ? Number(amount) : amount;
  const rupees = inPaise ? numericAmount / 100 : numericAmount;

  const { formattedNumber, isNegative } = formatINR(rupees, {
    hideZeroDecimals,
    fractionDigits,
    currencySymbol,
    showPositiveSign,
  });

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base font-semibold',
    lg: 'text-lg font-semibold',
    xl: 'text-xl sm:text-2xl font-bold font-fraunces',
    '2xl': 'text-2xl sm:text-3xl font-bold font-fraunces',
    '3xl': 'text-3xl sm:text-4xl font-extrabold font-fraunces',
  };

  const toneClasses = {
    default: 'text-ink',
    positive: 'text-ink-dark',
    negative: 'text-accent',
    accent: 'text-accent',
    muted: 'text-ink/60',
  };

  const computedTone =
    tone === 'default'
      ? isNegative
        ? 'text-accent'
        : 'text-ink'
      : toneClasses[tone];

  return (
    <span
      className={`tabular-nums inline-block tracking-tight ${sizeClasses[size]} ${computedTone} ${className}`}
      {...props}
    >
      {formattedNumber}
    </span>
  );
};
