import React from 'react';
import { useTranslation } from 'react-i18next';
import { Goal } from '../types/budget.types';
import { ProgressBar } from './ProgressBar';
import { AmountDisplay } from './AmountDisplay';

interface GoalCardProps {
  goal: Goal;
  onClick?: () => void;
}

const GOAL_TYPE_COLORS: Record<Goal['goal_type'], string> = {
  save_balance: '#10B981',
  pay_off_credit: '#EF4444',
  reduce_spending: '#F59E0B',
  spend_target: '#6366F1',
};

const goalTypeLabel = (
  type: Goal['goal_type'],
  t: (key: string, fallback: string) => string
): string => {
  switch (type) {
    case 'save_balance':
      return t('goals.saveBalance', 'Save Balance');
    case 'pay_off_credit':
      return t('goals.payOffCredit', 'Pay Off Credit');
    case 'reduce_spending':
      return t('goals.reduceSpending', 'Reduce Spending');
    case 'spend_target':
      return t('goals.spendTarget', 'Spend Target');
  }
};

const computeTargetSpend = (goal: Goal): number => {
  const baseline = Number(goal.baseline_amount) || 0;
  const amount = Number(goal.reduction_amount) || 0;
  return goal.reduction_type === 'percent'
    ? baseline * (1 - amount / 100)
    : baseline - amount;
};

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick }) => {
  const { t } = useTranslation();
  const dotColor = goal.category_color || GOAL_TYPE_COLORS[goal.goal_type];
  const percent = goal.progressPercent || 0;

  const renderAmounts = () => {
    switch (goal.goal_type) {
      case 'save_balance':
        return (
          <>
            <div className="goal-card-current">
              <AmountDisplay amount={goal.currentValue} size="sm" />
              <span className="goal-card-label">
                {' ' + t('goals.ofTarget', 'of')}{' '}
                <AmountDisplay amount={Number(goal.target_amount) || 0} size="sm" />
              </span>
            </div>
          </>
        );
      case 'pay_off_credit':
        return (
          <>
            <div className="goal-card-current">
              <AmountDisplay amount={goal.currentValue} size="sm" />
              <span className="goal-card-label">
                {t('goals.owed', 'owed')}
              </span>
            </div>
          </>
        );
      case 'reduce_spending': {
        const targetSpend = computeTargetSpend(goal);
        return (
          <div className="goal-card-current">
            <AmountDisplay amount={goal.currentValue} size="sm" />
            <span className="goal-card-label">
              {t('goals.targetMax', 'max')}{' '}
              <AmountDisplay amount={Math.max(0, targetSpend)} size="sm" />
            </span>
          </div>
        );
      }
      case 'spend_target':
        return (
          <div className="goal-card-current">
            <AmountDisplay amount={goal.currentValue} size="sm" />
            <span className="goal-card-label">
              {' ' +t('goals.ofTarget', 'of')}{' '}
              <AmountDisplay amount={Number(goal.target_amount) || 0} size="sm" />
            </span>
          </div>
        );
    }
  };

  // For reduce_spending, ProgressBar's "warning/danger" color logic is inverted:
  // higher current spend = worse. We pass status manually based on completion.
  const progressStatus =
    goal.goal_type === 'reduce_spending' || goal.goal_type === 'pay_off_credit'
      ? goal.isComplete
        ? 'success'
        : percent >= 80
          ? 'success'
          : percent >= 40
            ? 'warning'
            : 'danger'
      : undefined;

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
            style={{ backgroundColor: dotColor }}
          />
          <span className="budget-card-name">{goal.name}</span>
        </div>
        {renderAmounts()}
      </div>

      <ProgressBar value={percent} height={8} status={progressStatus} />

      <div className="budget-card-footer">
        <span className="budget-card-spent">
          {goalTypeLabel(goal.goal_type, t)}
        </span>
        <span className="budget-card-total">
          {goal.daysRemaining !== null
            ? goal.daysRemaining >= 0
              ? t('goals.daysLeft', '{{count}}d left').replace(
                  '{{count}}',
                  String(goal.daysRemaining)
                )
              : t('goals.overdue', 'overdue')
            : `${Math.round(percent)}%`}
        </span>
      </div>
    </div>
  );
};

export default GoalCard;
