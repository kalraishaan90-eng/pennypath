import React from 'react';

interface AwningStripeProps {
  className?: string;
}

/**
 * Signature brand motif: diagonal maroon/alabaster awning stripe.
 * Exact design specification: subtle, one per screen.
 */
export const AwningStripe: React.FC<AwningStripeProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`h-2.5 w-full border-y border-ink/10 ${className}`}
      style={{
        background: 'repeating-linear-gradient(-45deg, #7F0303, #7F0303 10px, #EFE8DF 10px, #EFE8DF 20px)',
      }}
    />
  );
};
