import React from 'react';
import { useTranslation } from 'react-i18next';
import { AmountDisplay } from './AmountDisplay';

interface BudgetSummaryWidgetProps {
  totalIncome: number;
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
}

export const BudgetSummaryWidget: React.FC<BudgetSummaryWidgetProps> = ({
  totalIncome,
  totalBudgeted,
  totalSpent,
  totalRemaining,
}) => {
  const { t } = useTranslation();

  return (
    <div className="budget-summary-widget">
      <div className="budget-summary-widget-item">
        <span className="budget-summary-widget-label">
          {t('dashboard.totalIncome', 'Income')}
        </span>
        <AmountDisplay amount={totalIncome} size="lg" />
      </div>
      <div className="budget-summary-widget-item">
        <span className="budget-summary-widget-label">
          {t('dashboard.totalBudgeted', 'Budgeted')}
        </span>
        <AmountDisplay amount={totalBudgeted} size="lg" />
      </div>
      <div className="budget-summary-widget-item">
        <span className="budget-summary-widget-label">
          {t('dashboard.totalSpent', 'Spent')}
        </span>
        <AmountDisplay amount={-totalSpent} size="lg" colorize />
      </div>
      <div className="budget-summary-widget-item">
        <span className="budget-summary-widget-label">
          {t('dashboard.totalRemaining', 'Remaining')}
        </span>
        <AmountDisplay amount={totalRemaining} size="lg" colorize />
      </div>
    </div>
  );
};
