import React from 'react';
import { Budget } from '../types/budget.types';
import { ProgressBar } from './ProgressBar';
import { AmountDisplay } from './AmountDisplay';

interface BudgetCardProps {
  budget: Budget;
  onClick?: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onClick }) => {
  const percentage = budget.percentage || 0;
  const spent = budget.spent || 0;
  const remaining = budget.remaining || 0;

  return (
    <div
      className="budget-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="budget-card-header">
        <div className="budget-card-category">
          <span
            className="budget-card-dot"
            style={{ backgroundColor: budget.category_color }}
          />
          <span className="budget-card-name">{budget.category_name}</span>
        </div>
        <div className="budget-card-remaining">
          <AmountDisplay amount={remaining} size="sm" />
          <span className="budget-card-remaining-label">
            {percentage > 100 ? 'over' : 'left'}
          </span>
        </div>
      </div>

      <ProgressBar value={percentage} height={8} />

      <div className="budget-card-footer">
        <span className="budget-card-spent">
          <AmountDisplay amount={spent} size="sm" /> spent
        </span>
        <span className="budget-card-total">
          of <AmountDisplay amount={budget.amount} size="sm" />
        </span>
      </div>
    </div>
  );
};
