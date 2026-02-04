import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { UserPreferencesModel } from '../models/user-preferences.model';

export const SettingsController = {
  async getTransactionPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const config = await UserPreferencesModel.getTransactionConfig(req.userId);
      res.json(config);
    } catch (error) {
      console.error('Get transaction preferences error:', error);
      res.status(500).json({ error: 'Failed to get preferences' });
    }
  },

  async updateTransactionPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { visibleColumns, sortField, sortDirection } = req.body;

      // Validate columns
      const validColumns = ['name', 'date', 'category', 'amount', 'account', 'notes'];
      if (visibleColumns) {
        const invalidColumns = visibleColumns.filter((col: string) => !validColumns.includes(col));
        if (invalidColumns.length > 0) {
          res.status(400).json({ error: `Invalid columns: ${invalidColumns.join(', ')}` });
          return;
        }
      }

      // Validate sort field
      const validSortFields = ['name', 'date', 'category', 'amount'];
      if (sortField && !validSortFields.includes(sortField)) {
        res.status(400).json({ error: `Invalid sort field: ${sortField}` });
        return;
      }

      // Validate sort direction
      if (sortDirection && !['asc', 'desc'].includes(sortDirection)) {
        res.status(400).json({ error: `Invalid sort direction: ${sortDirection}` });
        return;
      }

      await UserPreferencesModel.upsert(req.userId, {
        visibleColumns,
        sortField,
        sortDirection,
      });

      const config = await UserPreferencesModel.getTransactionConfig(req.userId);
      res.json(config);
    } catch (error) {
      console.error('Update transaction preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  },
};
