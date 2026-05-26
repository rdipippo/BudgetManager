import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { goalService } from '../services';
import { Goal, GoalProgressPoint } from '../types/budget.types';
import {
  Spinner,
  Alert,
  Button,
  ProgressBar,
  AmountDisplay,
  SideMenu,
  LineChart,
} from '../components';
import { LineChartSeries } from '../components/LineChart';

const formatPercent = (v: number): string => `${Math.round(v)}%`;

export const GoalDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [progress, setProgress] = useState<GoalProgressPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadGoal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadGoal = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await goalService.getById(parseInt(id!, 10));
      setGoal(data.goal);
      setProgress(data.progress);
    } catch (err) {
      setError(t('goals.loadError', 'Failed to load goal'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!goal) return;
    if (!window.confirm(t('goals.confirmDelete', 'Are you sure you want to delete this goal?'))) {
      return;
    }
    try {
      setDeleting(true);
      await goalService.delete(goal.id);
      navigate('/goals');
    } catch (err) {
      setError(t('goals.deleteError', 'Failed to delete goal'));
      setDeleting(false);
    }
  };

  const chartSeries: LineChartSeries[] = useMemo(() => {
    if (!goal || progress.length === 0) return [];
    const color = goal.category_color || '#6366F1';
    const labelKey =
      goal.goal_type === 'save_balance'
        ? 'goals.balance'
        : goal.goal_type === 'pay_off_credit'
          ? 'goals.balance'
          : 'goals.spent';
    return [
      {
        label: t(labelKey, 'Value'),
        color,
        data: progress.map((p) => ({
          date: p.recorded_date,
          value: Number(p.current_value),
        })),
      },
    ];
  }, [goal, progress, t]);

  if (loading) {
    return (
      <div className="screen screen-with-nav">
        <div className="screen-centered">
          <Spinner size="lg" />
        </div>
        <SideMenu />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="screen screen-with-nav">
        <div className="screen-padded">
          <Alert type="error">{error || t('goals.notFound', 'Goal not found')}</Alert>
          <Button variant="secondary" onClick={() => navigate('/goals')}>
            {t('common.back', 'Back')}
          </Button>
        </div>
        <SideMenu />
      </div>
    );
  }

  const percent = goal.progressPercent || 0;
  const target =
    goal.goal_type === 'pay_off_credit'
      ? Number(goal.target_balance) || 0
      : Number(goal.target_amount) || 0;

  const primaryLabel = (() => {
    switch (goal.goal_type) {
      case 'save_balance':
        return t('goals.saved', 'Saved');
      case 'pay_off_credit':
        return t('goals.owed', 'Owed');
      case 'reduce_spending':
      case 'spend_target':
        return t('goals.spentThisMonth', 'Spent this month');
    }
  })();

  const secondaryLabel = (() => {
    switch (goal.goal_type) {
      case 'save_balance':
        return t('goals.target', 'Target');
      case 'pay_off_credit':
        return t('goals.targetBalance', 'Target Balance');
      case 'reduce_spending': {
        const baseline = Number(goal.baseline_amount) || 0;
        const amount = Number(goal.reduction_amount) || 0;
        const targetSpend =
          goal.reduction_type === 'percent'
            ? baseline * (1 - amount / 100)
            : baseline - amount;
        return `${t('goals.targetMax', 'Max')}: $${Math.max(0, targetSpend).toFixed(2)}`;
      }
      case 'spend_target':
        return t('goals.target', 'Target');
    }
  })();

  return (
    <div className="screen screen-with-nav">
      <div className="budget-detail-header">
        <button className="back-button" onClick={() => navigate('/goals')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{goal.name}</h1>
        <button className="delete-button" onClick={handleDelete} disabled={deleting}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="budget-detail-summary">
        <div className="budget-detail-amounts">
          <div className="budget-detail-spent">
            <span className="label">{primaryLabel}</span>
            <AmountDisplay amount={goal.currentValue} size="lg" />
          </div>
          <div className="budget-detail-remaining">
            <span className="label">{secondaryLabel}</span>
            {goal.goal_type === 'reduce_spending' ? (
              <span className="amount-display amount-display-lg">&nbsp;</span>
            ) : (
              <AmountDisplay amount={target} size="lg" />
            )}
          </div>
        </div>

        <div className="budget-detail-progress">
          <ProgressBar value={percent} height={12} showLabel />
        </div>

        <div className="budget-detail-total">
          {goal.isComplete
            ? t('goals.complete', 'Goal complete!')
            : `${formatPercent(percent)} ${t('goals.toGoal', 'toward goal')}`}
        </div>

        {goal.target_date && (
          <div className="budget-detail-period">
            {t('goals.targetDate', 'Target Date')}:{' '}
            {new Date(`${goal.target_date}`).toLocaleDateString()}
            {goal.daysRemaining !== null && (
              <span style={{ marginLeft: '8px' }}>
                (
                {goal.daysRemaining >= 0
                  ? t('goals.daysLeft', '{{count}}d left').replace(
                      '{{count}}',
                      String(goal.daysRemaining)
                    )
                  : t('goals.overdue', 'overdue')}
                )
              </span>
            )}
          </div>
        )}
      </div>

      {chartSeries.length > 0 && (
        <div className="budget-detail-transactions">
          <h2 className="section-title">{t('goals.history', 'Progress History')}</h2>
          <LineChart series={chartSeries} formatValue={(v) => `$${v.toFixed(0)}`} />
        </div>
      )}

      <SideMenu />
    </div>
  );
};

export default GoalDetailScreen;
