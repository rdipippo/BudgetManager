import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { TransactionModel, CategoryModel } from '../models';
import { CategorizationService } from '../services';

export const TransactionController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const {
        startDate,
        endDate,
        categoryId,
        accountId,
        search,
        uncategorized,
        limit = '50',
        offset = '0',
      } = req.query;

      const filters = {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        categoryId: categoryId === 'null' ? null : categoryId ? parseInt(categoryId as string) : undefined,
        accountId: accountId ? parseInt(accountId as string) : undefined,
        search: search as string | undefined,
        uncategorized: uncategorized === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const [transactions, total] = await Promise.all([
        TransactionModel.findByUserId(req.userId, filters),
        TransactionModel.countByUserId(req.userId, filters),
      ]);

      res.json({
        transactions,
        pagination: {
          total,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + transactions.length < total,
        },
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const transaction = await TransactionModel.findByIdAndUser(parseInt(id), req.userId);

      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      res.json({ transaction });
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { amount, date, merchantName, description, categoryId, notes } = req.body;

      // Validate category if provided
      if (categoryId) {
        const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
        if (!category) {
          res.status(400).json({ error: 'Category not found' });
          return;
        }
      }

      const transactionId = await TransactionModel.create({
        user_id: req.userId,
        amount,
        date,
        merchant_name: merchantName,
        description,
        category_id: categoryId,
        notes,
        is_manual: true,
      });

      const transaction = await TransactionModel.findById(transactionId);
      res.status(201).json({ transaction, message: 'Transaction created' });
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json({ error: 'Failed to create transaction' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { amount, date, merchantName, description, categoryId, notes } = req.body;

      const transaction = await TransactionModel.findByIdAndUser(parseInt(id), req.userId);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      // Validate category if provided
      if (categoryId !== undefined && categoryId !== null) {
        const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
        if (!category) {
          res.status(400).json({ error: 'Category not found' });
          return;
        }
      }

      const updated = await TransactionModel.update(parseInt(id), req.userId, {
        amount,
        date,
        merchant_name: merchantName,
        description,
        category_id: categoryId,
        notes,
      });

      if (!updated) {
        res.status(404).json({ error: 'Transaction not found or cannot be modified' });
        return;
      }

      const updatedTransaction = await TransactionModel.findById(parseInt(id));
      res.json({ transaction: updatedTransaction, message: 'Transaction updated' });
    } catch (error) {
      console.error('Update transaction error:', error);
      res.status(500).json({ error: 'Failed to update transaction' });
    }
  },

  async updateCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { categoryId } = req.body;

      const transaction = await TransactionModel.findByIdAndUser(parseInt(id), req.userId);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      // Validate category if provided
      if (categoryId !== null) {
        const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
        if (!category) {
          res.status(400).json({ error: 'Category not found' });
          return;
        }
      }

      await TransactionModel.updateCategory(parseInt(id), req.userId, categoryId);

      // Learn from this categorization for future auto-categorization
      if (categoryId) {
        await CategorizationService.learnFromCategorization(req.userId, parseInt(id), categoryId);
      }

      const updatedTransaction = await TransactionModel.findById(parseInt(id));
      res.json({ transaction: updatedTransaction, message: 'Category updated' });
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      const transaction = await TransactionModel.findByIdAndUser(parseInt(id), req.userId);
      if (!transaction) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      if (!transaction.is_manual) {
        res.status(403).json({ error: 'Only manual transactions can be deleted' });
        return;
      }

      const deleted = await TransactionModel.delete(parseInt(id), req.userId);

      if (!deleted) {
        res.status(404).json({ error: 'Transaction not found or cannot be deleted' });
        return;
      }

      res.json({ message: 'Transaction deleted' });
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  },

  async bulkUpdate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { transactionIds, categoryId, notes, date } = req.body;

      if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
        res.status(400).json({ error: 'transactionIds must be a non-empty array' });
        return;
      }

      if (transactionIds.length > 100) {
        res.status(400).json({ error: 'Cannot update more than 100 transactions at once' });
        return;
      }

      // Validate category if provided
      if (categoryId !== undefined && categoryId !== null) {
        const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
        if (!category) {
          res.status(400).json({ error: 'Category not found' });
          return;
        }
      }

      const updates: { category_id?: number | null; notes?: string | null; date?: string } = {};
      if (categoryId !== undefined) updates.category_id = categoryId;
      if (notes !== undefined) updates.notes = notes || null;
      if (date !== undefined) updates.date = date;

      const affectedRows = await TransactionModel.updateMultiple(
        req.userId,
        transactionIds.map((id: string | number) => parseInt(String(id))),
        updates
      );

      res.json({
        message: `Updated ${affectedRows} transaction(s)`,
        affectedRows,
      });
    } catch (error) {
      console.error('Bulk update transactions error:', error);
      res.status(500).json({ error: 'Failed to update transactions' });
    }
  },
};
