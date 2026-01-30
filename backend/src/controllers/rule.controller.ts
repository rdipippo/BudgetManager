import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { RuleModel, CategoryModel } from '../models';
import { CategorizationService } from '../services';

export const RuleController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const rules = await RuleModel.findByUserId(req.userId);
      res.json({ rules });
    } catch (error) {
      console.error('Get rules error:', error);
      res.status(500).json({ error: 'Failed to get rules' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const rule = await RuleModel.findByIdAndUser(parseInt(id), req.userId);

      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      res.json({ rule });
    } catch (error) {
      console.error('Get rule error:', error);
      res.status(500).json({ error: 'Failed to get rule' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const {
        categoryId,
        name,
        matchType,
        merchantPattern,
        descriptionPattern,
        amountMin,
        amountMax,
        isExactMatch,
        priority,
      } = req.body;

      // Validate category exists
      const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
      if (!category) {
        res.status(400).json({ error: 'Category not found' });
        return;
      }

      // Validate rule has at least one condition
      if (matchType === 'merchant' && !merchantPattern) {
        res.status(400).json({ error: 'Merchant pattern is required for merchant match type' });
        return;
      }
      if (matchType === 'description' && !descriptionPattern) {
        res.status(400).json({ error: 'Description pattern is required for description match type' });
        return;
      }
      if (matchType === 'amount_range' && amountMin === undefined && amountMax === undefined) {
        res.status(400).json({ error: 'At least one amount bound is required for amount range match type' });
        return;
      }

      const ruleId = await RuleModel.create({
        user_id: req.userId,
        category_id: categoryId,
        name,
        match_type: matchType,
        merchant_pattern: merchantPattern,
        description_pattern: descriptionPattern,
        amount_min: amountMin,
        amount_max: amountMax,
        is_exact_match: isExactMatch,
        priority,
      });

      const rule = await RuleModel.findById(ruleId);
      res.status(201).json({ rule, message: 'Rule created' });
    } catch (error) {
      console.error('Create rule error:', error);
      res.status(500).json({ error: 'Failed to create rule' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const {
        categoryId,
        name,
        matchType,
        merchantPattern,
        descriptionPattern,
        amountMin,
        amountMax,
        isExactMatch,
        priority,
        isActive,
      } = req.body;

      const rule = await RuleModel.findByIdAndUser(parseInt(id), req.userId);
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      // Validate category if provided
      if (categoryId !== undefined) {
        const category = await CategoryModel.findByIdAndUser(categoryId, req.userId);
        if (!category) {
          res.status(400).json({ error: 'Category not found' });
          return;
        }
      }

      const updated = await RuleModel.update(parseInt(id), req.userId, {
        category_id: categoryId,
        name,
        match_type: matchType,
        merchant_pattern: merchantPattern,
        description_pattern: descriptionPattern,
        amount_min: amountMin,
        amount_max: amountMax,
        is_exact_match: isExactMatch,
        priority,
        is_active: isActive,
      });

      if (!updated) {
        res.status(404).json({ error: 'Rule not found or cannot be modified' });
        return;
      }

      const updatedRule = await RuleModel.findById(parseInt(id));
      res.json({ rule: updatedRule, message: 'Rule updated' });
    } catch (error) {
      console.error('Update rule error:', error);
      res.status(500).json({ error: 'Failed to update rule' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      const deleted = await RuleModel.delete(parseInt(id), req.userId);

      if (!deleted) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }

      res.json({ message: 'Rule deleted' });
    } catch (error) {
      console.error('Delete rule error:', error);
      res.status(500).json({ error: 'Failed to delete rule' });
    }
  },

  async applyRules(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const categorizedCount = await CategorizationService.applyRulesToUncategorized(req.userId);

      res.json({
        message: `Applied rules to ${categorizedCount} transactions`,
        categorizedCount,
      });
    } catch (error) {
      console.error('Apply rules error:', error);
      res.status(500).json({ error: 'Failed to apply rules' });
    }
  },
};
