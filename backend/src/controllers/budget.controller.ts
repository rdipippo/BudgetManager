import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { BudgetModel, CategoryModel, TransactionModel } from '../models';
import { BudgetWithSpent } from '../models/budget.model';

export const BudgetController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const budgets = await BudgetModel.findByUserId(req.userId);

      // Calculate spent amounts for each budget
      const budgetsWithSpent: BudgetWithSpent[] = await Promise.all(
        budgets.map(async (budget) => {
          const budgetAmount = Number(budget.amount) || 0;
          const { startDate, endDate } = BudgetModel.getCurrentPeriodDates(budget.start_day);
          const spent = await TransactionModel.getSpentByCategory(
            req.userId!,
            budget.category_id,
            startDate,
            endDate
          );

          const remaining = Math.max(0, budgetAmount - spent);
          const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

          return {
            ...budget,
            amount: budgetAmount,
            spent,
            remaining,
            percentage: Math.round(percentage * 10) / 10,
          };
        })
      );

      res.json({ budgets: budgetsWithSpent });
    } catch (error) {
      console.error('Get budgets error:', error);
      res.status(500).json({ error: 'Failed to get budgets' });
    }
  },

  async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { year, month } = req.query;
      const budgets = await BudgetModel.findByUserId(req.userId);

      // Get the period dates - use specified month/year or current period
      let startDate: string;
      let endDate: string;

      if (year && month) {
        const periodDates = BudgetModel.getPeriodDatesForMonth(
          parseInt(year as string),
          parseInt(month as string),
          1
        );
        startDate = periodDates.startDate;
        endDate = periodDates.endDate;
      } else {
        const periodDates = BudgetModel.getCurrentPeriodDates(1);
        startDate = periodDates.startDate;
        endDate = periodDates.endDate;
      }

      // Get all spending by category for this period
      const spendingByCategory = await TransactionModel.getSpentByCategoryForPeriod(
        req.userId,
        startDate,
        endDate
      );
      const spendingMap = new Map(spendingByCategory.map((s) => [s.category_id, s.total]));

      // Get income received by category for this period
      const incomeByCategory = await TransactionModel.getIncomeByCategoryForPeriod(
        req.userId,
        startDate,
        endDate
      );
      const incomeMap = new Map(incomeByCategory.map((s) => [s.category_id, s.total]));

      let totalBudgeted = 0;
      let totalSpent = 0;
      let totalIncome = 0;
      let totalIncomeReceived = 0;

      const budgetsWithSpent: BudgetWithSpent[] = budgets
        .map((budget) => {
          const budgetAmount = Number(budget.amount) || 0;
          const isIncome = budget.is_income;

          // For income categories, track income received; for expense, track spent
          const spent = isIncome
            ? (incomeMap.get(budget.category_id) || 0)
            : (spendingMap.get(budget.category_id) || 0);
          const remaining = Math.max(0, budgetAmount - spent);
          const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

          if (isIncome) {
            totalIncome += budgetAmount;
            totalIncomeReceived += spent;
          } else {
            totalBudgeted += budgetAmount;
            totalSpent += spent;
          }

          return {
            ...budget,
            amount: budgetAmount,
            spent,
            remaining,
            percentage: Math.round(percentage * 10) / 10,
          };
        });

      // Sort by percentage (highest first to show most urgent)
      budgetsWithSpent.sort((a, b) => b.percentage - a.percentage);

      res.json({
        totalBudgeted,
        totalSpent,
        totalRemaining: Math.max(0, totalBudgeted - totalSpent),
        totalIncome,
        totalIncomeReceived,
        periodStart: startDate,
        periodEnd: endDate,
        budgets: budgetsWithSpent,
      });
    } catch (error) {
      console.error('Get budget summary error:', error);
      res.status(500).json({ error: 'Failed to get budget summary' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const budget = await BudgetModel.findByIdAndUser(parseInt(id), req.userId);

      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      // Get spent amount
      const { startDate, endDate } = BudgetModel.getCurrentPeriodDates(budget.start_day);
      const spent = await TransactionModel.getSpentByCategory(
        req.userId,
        budget.category_id,
        startDate,
        endDate
      );

      // Get transactions for this category in the current period
      const transactions = await TransactionModel.findByUserId(req.userId, {
        categoryId: budget.category_id,
        startDate,
        endDate,
        limit: 100,
      });

      const budgetAmount = Number(budget.amount) || 0;
      const budgetWithSpent: BudgetWithSpent = {
        ...budget,
        amount: budgetAmount,
        spent,
        remaining: Math.max(0, budgetAmount - spent),
        percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 1000) / 10 : 0,
      };

      res.json({
        budget: budgetWithSpent,
        transactions,
        periodStart: startDate,
        periodEnd: endDate,
      });
    } catch (error) {
      console.error('Get budget error:', error);
      res.status(500).json({ error: 'Failed to get budget' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { categoryId, amount, startDay } = req.body;

      // Validate category exists
      const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
      if (!category) {
        res.status(400).json({ error: 'Category not found' });
        return;
      }

      // Check for existing budget for this category
      const existing = await BudgetModel.findByUserIdAndCategory(req.userId, categoryId);
      if (existing) {
        res.status(409).json({ error: 'A budget already exists for this category' });
        return;
      }

      const budgetId = await BudgetModel.create({
        user_id: req.userId,
        category_id: categoryId,
        amount,
        start_day: startDay,
      });

      const budget = await BudgetModel.findByIdAndUser(budgetId, req.userId);
      res.status(201).json({ budget, message: 'Budget created' });
    } catch (error) {
      console.error('Create budget error:', error);
      res.status(500).json({ error: 'Failed to create budget' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { amount, startDay, isActive } = req.body;

      const budget = await BudgetModel.findByIdAndUser(parseInt(id), req.userId);
      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      const updated = await BudgetModel.update(parseInt(id), req.userId, {
        amount,
        start_day: startDay,
        is_active: isActive,
      });

      if (!updated) {
        res.status(404).json({ error: 'Budget not found or cannot be modified' });
        return;
      }

      const updatedBudget = await BudgetModel.findByIdAndUser(parseInt(id), req.userId);
      res.json({ budget: updatedBudget, message: 'Budget updated' });
    } catch (error) {
      console.error('Update budget error:', error);
      res.status(500).json({ error: 'Failed to update budget' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      const deleted = await BudgetModel.delete(parseInt(id), req.userId);

      if (!deleted) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      res.json({ message: 'Budget deleted' });
    } catch (error) {
      console.error('Delete budget error:', error);
      res.status(500).json({ error: 'Failed to delete budget' });
    }
  },
};
