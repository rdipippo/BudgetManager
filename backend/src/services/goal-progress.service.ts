import pool from '../config/database';
import { GoalModel, GoalWithDetails } from '../models/goal.model';
import { TransactionModel } from '../models';

export interface GoalComputed {
  currentValue: number;
  progressPercent: number;
  isComplete: boolean;
  daysRemaining: number | null;
}

const sumCreditBalances = async (
  userId: number,
  accountIds: number[]
): Promise<number> => {
  if (accountIds.length === 0) return 0;
  const result = await pool.query(
    `SELECT COALESCE(SUM(pa.current_balance), 0) AS total
     FROM plaid_accounts pa
     INNER JOIN plaid_items pi ON pa.plaid_item_id = pi.id
     WHERE pi.user_id = $1 AND pa.id = ANY($2::int[])`,
    [userId, accountIds]
  );
  return parseFloat(result.rows[0]?.total) || 0;
};

const getAccountBalance = async (
  userId: number,
  plaidAccountId: number
): Promise<number> => {
  const result = await pool.query(
    `SELECT COALESCE(pa.current_balance, 0) AS balance
     FROM plaid_accounts pa
     INNER JOIN plaid_items pi ON pa.plaid_item_id = pi.id
     WHERE pi.user_id = $1 AND pa.id = $2`,
    [userId, plaidAccountId]
  );
  return parseFloat(result.rows[0]?.balance) || 0;
};

export const GoalProgressService = {
  async computeCurrentValue(goal: GoalWithDetails): Promise<number> {
    switch (goal.goal_type) {
      case 'save_balance':
        if (!goal.plaid_account_id) return 0;
        return getAccountBalance(goal.user_id, goal.plaid_account_id);

      case 'pay_off_credit':
        return sumCreditBalances(goal.user_id, goal.credit_account_ids);

      case 'reduce_spending':
      case 'spend_target': {
        if (!goal.category_id) return 0;
        const { startDate, endDate } = GoalModel.getCurrentMonthDates();
        return TransactionModel.getSpentByCategory(
          goal.user_id,
          goal.category_id,
          startDate,
          endDate
        );
      }
    }
  },

  computeProgressPercent(goal: GoalWithDetails, currentValue: number): number {
    const baseline = (() => {
      switch (goal.goal_type) {
        case 'save_balance':
        case 'reduce_spending':
          return Number(goal.baseline_amount) || 0;
        case 'pay_off_credit':
          return Number(goal.baseline_total) || 0;
        case 'spend_target':
          return 0;
      }
    })();

    switch (goal.goal_type) {
      case 'save_balance': {
        const target = Number(goal.target_amount) || 0;
        //const denom = target - baseline;
        //if (denom <= 0) return currentValue >= target ? 100 : 0;
        const pct =  currentValue / target;
        return Math.max(0, Math.round(pct * 100));
      }
      case 'pay_off_credit': {
        const target = Number(goal.target_balance) || 0;
        const denom = baseline - target;
        if (denom <= 0) return currentValue <= target ? 100 : 0;
        const pct = ((baseline - currentValue) / denom) * 100;
        return Math.max(0, Math.round(pct * 10) / 10);
      }
      case 'reduce_spending': {
        // Goal: stay at or below (baseline - reduction_amount/percent)
        const reductionType = goal.reduction_type || 'fixed';
        const reductionAmount = Number(goal.reduction_amount) || 0;
        const targetSpend =
          reductionType === 'percent'
            ? baseline * (1 - reductionAmount / 100)
            : baseline - reductionAmount;
        const reduced = Math.max(0, baseline - currentValue);
        const reductionGoal = baseline - targetSpend;
        if (reductionGoal <= 0) return currentValue <= targetSpend ? 100 : 0;
        const pct = (reduced / reductionGoal) * 100;
        return Math.max(0, Math.round(pct * 10) / 10);
      }
      case 'spend_target': {
        const target = Number(goal.target_amount) || 0;
        if (target <= 0) return currentValue > 0 ? 100 : 0;
        const pct = (currentValue / target) * 100;
        return Math.max(0, Math.round(pct * 10) / 10);
      }
    }
  },

  isComplete(goal: GoalWithDetails, currentValue: number): boolean {
    switch (goal.goal_type) {
      case 'save_balance':
        return currentValue >= (Number(goal.target_amount) || 0);
      case 'pay_off_credit':
        return currentValue <= (Number(goal.target_balance) || 0);
      case 'reduce_spending': {
        const baseline = Number(goal.baseline_amount) || 0;
        const reductionType = goal.reduction_type || 'fixed';
        const reductionAmount = Number(goal.reduction_amount) || 0;
        const targetSpend =
          reductionType === 'percent'
            ? baseline * (1 - reductionAmount / 100)
            : baseline - reductionAmount;
        return currentValue <= targetSpend;
      }
      case 'spend_target':
        return currentValue >= (Number(goal.target_amount) || 0);
    }
  },

  daysRemaining(goal: GoalWithDetails): number | null {
    if (!goal.target_date) return null;
    const target = new Date(`${goal.target_date}`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ms = target.getTime() - today.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  },

  async enrichGoal(goal: GoalWithDetails): Promise<GoalWithDetails & GoalComputed> {
    const currentValue = await this.computeCurrentValue(goal);
    return {
      ...goal,
      currentValue,
      progressPercent: this.computeProgressPercent(goal, currentValue),
      isComplete: this.isComplete(goal, currentValue),
      daysRemaining: this.daysRemaining(goal),
    };
  },

  async snapshotIfNeeded(goalId: number, currentValue: number): Promise<void> {
    await GoalModel.upsertProgressForToday(goalId, currentValue);
  },
};
