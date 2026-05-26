import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { GoalModel, CategoryModel, PlaidAccountModel } from '../models';
import { GoalProgressService } from '../services/goal-progress.service';
import { CreateGoalData, GoalType, ReductionType, UpdateGoalData } from '../models/goal.model';

const VALID_TYPES: GoalType[] = [
  'save_balance',
  'pay_off_credit',
  'reduce_spending',
  'spend_target',
];

const toNullableNumber = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const validateGoalPayload = async (
  userId: number,
  body: Record<string, unknown>,
  isCreate: boolean
): Promise<{ ok: true; data: CreateGoalData | UpdateGoalData } | { ok: false; error: string }> => {
  const goalType = body.goalType as GoalType | undefined;

  if (isCreate) {
    if (!goalType || !VALID_TYPES.includes(goalType)) {
      return { ok: false, error: 'Invalid goal type' };
    }
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return { ok: false, error: 'Name is required' };
    }
  }

  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const targetDate = typeof body.targetDate === 'string' && body.targetDate.length > 0
    ? body.targetDate
    : null;

  if (isCreate && goalType === 'save_balance') {
    const accountId = toNullableNumber(body.plaidAccountId);
    const target = toNullableNumber(body.targetAmount);
    const baseline = toNullableNumber(body.baselineAmount);
    if (!accountId) return { ok: false, error: 'Account is required for savings goals' };
    if (target === null || target <= 0) return { ok: false, error: 'Target amount must be positive' };
    if (baseline === null) return { ok: false, error: 'Baseline amount is required' };
    const account = await PlaidAccountModel.findById(accountId);
    if (!account) return { ok: false, error: 'Account not found' };
    return {
      ok: true,
      data: {
        user_id: userId,
        name: name!,
        goal_type: 'save_balance',
        plaid_account_id: accountId,
        target_amount: target,
        baseline_amount: baseline,
        target_date: targetDate,
      },
    };
  }

  if (isCreate && goalType === 'pay_off_credit') {
    const accountIds = Array.isArray(body.creditAccountIds)
      ? (body.creditAccountIds as unknown[])
          .map((v) => toNullableNumber(v))
          .filter((v): v is number => v !== null)
      : [];
    const targetBalance = toNullableNumber(body.targetBalance) ?? 0;
    const baselineTotal = toNullableNumber(body.baselineTotal);
    if (accountIds.length === 0) {
      return { ok: false, error: 'At least one credit account is required' };
    }
    if (baselineTotal === null) {
      return { ok: false, error: 'Baseline total is required' };
    }
    return {
      ok: true,
      data: {
        user_id: userId,
        name: name!,
        goal_type: 'pay_off_credit',
        target_balance: targetBalance,
        baseline_total: baselineTotal,
        target_date: targetDate,
        credit_account_ids: accountIds,
      },
    };
  }

  if (isCreate && (goalType === 'reduce_spending' || goalType === 'spend_target')) {
    const categoryId = toNullableNumber(body.categoryId);
    if (!categoryId) return { ok: false, error: 'Category is required' };
    const category = await CategoryModel.findByIdAndUser(categoryId, userId);
    if (!category) return { ok: false, error: 'Category not found' };

    if (goalType === 'reduce_spending') {
      const reductionType = body.reductionType as ReductionType | undefined;
      const reductionAmount = toNullableNumber(body.reductionAmount);
      const baseline = toNullableNumber(body.baselineAmount);
      if (reductionType !== 'fixed' && reductionType !== 'percent') {
        return { ok: false, error: 'Reduction type must be fixed or percent' };
      }
      if (reductionAmount === null || reductionAmount <= 0) {
        return { ok: false, error: 'Reduction amount must be positive' };
      }
      if (reductionType === 'percent' && reductionAmount > 100) {
        return { ok: false, error: 'Reduction percent cannot exceed 100' };
      }
      if (baseline === null || baseline < 0) {
        return { ok: false, error: 'Baseline monthly spend is required' };
      }
      return {
        ok: true,
        data: {
          user_id: userId,
          name: name!,
          goal_type: 'reduce_spending',
          category_id: categoryId,
          reduction_type: reductionType,
          reduction_amount: reductionAmount,
          baseline_amount: baseline,
          target_date: targetDate,
        },
      };
    }

    // spend_target
    const target = toNullableNumber(body.targetAmount);
    if (target === null || target <= 0) {
      return { ok: false, error: 'Target amount must be positive' };
    }
    return {
      ok: true,
      data: {
        user_id: userId,
        name: name!,
        goal_type: 'spend_target',
        category_id: categoryId,
        target_amount: target,
        target_date: targetDate,
      },
    };
  }

  // Update path: only mutable fields
  const update: UpdateGoalData = {};
  if (name !== undefined) update.name = name;
  if (body.targetAmount !== undefined) update.target_amount = toNullableNumber(body.targetAmount);
  if (body.baselineAmount !== undefined) update.baseline_amount = toNullableNumber(body.baselineAmount);
  if (body.targetBalance !== undefined) update.target_balance = toNullableNumber(body.targetBalance);
  if (body.baselineTotal !== undefined) update.baseline_total = toNullableNumber(body.baselineTotal);
  if (body.reductionType !== undefined) {
    const rt = body.reductionType as ReductionType | null;
    update.reduction_type = rt === 'fixed' || rt === 'percent' ? rt : null;
  }
  if (body.reductionAmount !== undefined) update.reduction_amount = toNullableNumber(body.reductionAmount);
  if (body.targetDate !== undefined) update.target_date = targetDate;
  if (body.isActive !== undefined) update.is_active = Boolean(body.isActive);
  if (body.creditAccountIds !== undefined && Array.isArray(body.creditAccountIds)) {
    update.credit_account_ids = (body.creditAccountIds as unknown[])
      .map((v) => toNullableNumber(v))
      .filter((v): v is number => v !== null);
  }
  return { ok: true, data: update };
};

export const GoalController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const userId = req.userId;
      const goals = await GoalModel.findByUserId(userId);
      const enriched = await Promise.all(
        goals.map(async (g) => {
          const result = await GoalProgressService.enrichGoal(g);
          if (g.is_active) {
            await GoalProgressService.snapshotIfNeeded(g.id, result.currentValue);
          }
          return result;
        })
      );
      res.json({ goals: enriched });
    } catch (error) {
      console.error('Get goals error:', error);
      res.status(500).json({ error: 'Failed to get goals' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const userId = req.userId;
      const id = parseInt(req.params.id, 10);
      const goal = await GoalModel.findByIdAndUser(id, userId);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      const enriched = await GoalProgressService.enrichGoal(goal);
      if (goal.is_active) {
        await GoalProgressService.snapshotIfNeeded(goal.id, enriched.currentValue);
      }
      const progress = await GoalModel.getProgress(goal.id);
      res.json({ goal: enriched, progress });
    } catch (error) {
      console.error('Get goal error:', error);
      res.status(500).json({ error: 'Failed to get goal' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const userId = req.userId;
      const validation = await validateGoalPayload(userId, req.body, true);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const goalId = await GoalModel.create(validation.data as CreateGoalData);
      const goal = await GoalModel.findByIdAndUser(goalId, userId);
      if (!goal) {
        res.status(500).json({ error: 'Failed to load created goal' });
        return;
      }
      const enriched = await GoalProgressService.enrichGoal(goal);
      await GoalProgressService.snapshotIfNeeded(goal.id, enriched.currentValue);
      res.status(201).json({ goal: enriched, message: 'Goal created' });
    } catch (error) {
      console.error('Create goal error:', error);
      res.status(500).json({ error: 'Failed to create goal' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const userId = req.userId;
      const id = parseInt(req.params.id, 10);
      const existing = await GoalModel.findByIdAndUser(id, userId);
      if (!existing) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      const validation = await validateGoalPayload(userId, req.body, false);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }
      const updated = await GoalModel.update(id, userId, validation.data as UpdateGoalData);
      if (!updated) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      const refreshed = await GoalModel.findByIdAndUser(id, userId);
      if (!refreshed) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      const enriched = await GoalProgressService.enrichGoal(refreshed);
      res.json({ goal: enriched, message: 'Goal updated' });
    } catch (error) {
      console.error('Update goal error:', error);
      res.status(500).json({ error: 'Failed to update goal' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const userId = req.userId;
      const id = parseInt(req.params.id, 10);
      const deleted = await GoalModel.delete(id, userId);
      if (!deleted) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json({ message: 'Goal deleted' });
    } catch (error) {
      console.error('Delete goal error:', error);
      res.status(500).json({ error: 'Failed to delete goal' });
    }
  },
};
