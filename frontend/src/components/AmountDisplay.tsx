import React from 'react';

interface AmountDisplayProps {
  amount: number;
  showSign?: boolean;
  colorize?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  showSign = false,
  colorize = false,
  size = 'md',
  className = '',
}) => {
  const formattedAmount = Math.abs(amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isNegative = amount < 0;
  const sign = showSign ? (isNegative ? '-' : '+') : (isNegative ? '-' : '');

  let colorClass = '';
  if (colorize) {
    colorClass = isNegative ? 'amount-negative' : 'amount-positive';
  }

  return (
    <span className={`amount-display amount-display-${size} ${colorClass} ${className}`}>
      {sign}{formattedAmount.replace('-', '')}
    </span>
  );
};
