import React from 'react';
import { Transaction } from '../types/budget.types';
import { AmountDisplay } from './AmountDisplay';
import { CategoryBadge } from './CategoryBadge';

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
  onCategoryClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (id: number, selected: boolean) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onClick,
  onCategoryClick,
  selectable = false,
  selected = false,
  onSelectionChange,
}) => {
  const displayName = transaction.merchant_name || transaction.description || 'Unknown';

  // Parse and format date properly
  const dateObj = new Date(transaction.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelectionChange?.(transaction.id, e.target.checked);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`transaction-item ${onClick ? 'transaction-item-clickable' : ''} ${selectable ? 'transaction-item-selectable' : ''} ${selected ? 'transaction-item-selected' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {selectable && (
        <div className="transaction-item-checkbox" onClick={handleCheckboxClick}>
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            className="checkbox"
          />
        </div>
      )}
      <div className="transaction-item-name">
        {displayName}
        {Boolean(transaction.pending) && (
          <span className="transaction-item-pending">Pending</span>
        )}
      </div>
      <div className="transaction-item-date">{formattedDate}</div>
      <div className="transaction-item-category">
        {transaction.category_name ? (
          <CategoryBadge
            name={transaction.category_name}
            color={transaction.category_color || '#6B7280'}
            size="sm"
            onClick={onCategoryClick ? (e) => { e?.stopPropagation?.(); onCategoryClick(); } : undefined}
          />
        ) : (
          <span
            className="transaction-item-uncategorized"
            onClick={onCategoryClick ? (e) => { e?.stopPropagation?.(); onCategoryClick(); } : undefined}
          >
            Uncategorized
          </span>
        )}
      </div>
      <div className="transaction-item-amount">
        <AmountDisplay
          amount={transaction.amount}
          colorize
          size="md"
        />
      </div>
    </div>
  );
};
