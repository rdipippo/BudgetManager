import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { CategoryModel } from '../models';

export const CategoryController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const categories = await CategoryModel.findByUserId(req.userId);
      res.json({ categories });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const category = await CategoryModel.findByIdAndUser(parseInt(id), req.userId);

      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json({ category });
    } catch (error) {
      console.error('Get category error:', error);
      res.status(500).json({ error: 'Failed to get category' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, color, icon, parentId, isIncome } = req.body;

      // Check for duplicate name
      const existing = await CategoryModel.findByUserIdAndName(req.userId, name, parentId || null);
      if (existing) {
        res.status(409).json({ error: 'A category with this name already exists' });
        return;
      }

      // Validate parent exists if provided
      if (parentId) {
        const parent = await CategoryModel.findByIdAndUser(parentId, req.userId);
        if (!parent) {
          res.status(400).json({ error: 'Parent category not found' });
          return;
        }
      }

      const categoryId = await CategoryModel.create({
        user_id: req.userId,
        parent_id: parentId || null,
        name,
        color,
        icon,
        is_income: isIncome || false,
      });

      const category = await CategoryModel.findById(categoryId);
      res.status(201).json({ category, message: 'Category created' });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { name, color, icon, parentId, sortOrder } = req.body;

      // Check category exists and belongs to user
      const category = await CategoryModel.findByIdAndUser(parseInt(id), req.userId);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // Check for duplicate name if name is being changed
      if (name && name !== category.name) {
        const existing = await CategoryModel.findByUserIdAndName(
          req.userId,
          name,
          parentId !== undefined ? parentId : category.parent_id
        );
        if (existing && existing.id !== category.id) {
          res.status(409).json({ error: 'A category with this name already exists' });
          return;
        }
      }

      // Validate parent exists if provided
      if (parentId) {
        const parent = await CategoryModel.findByIdAndUser(parentId, req.userId);
        if (!parent) {
          res.status(400).json({ error: 'Parent category not found' });
          return;
        }
        // Prevent circular reference
        if (parentId === parseInt(id)) {
          res.status(400).json({ error: 'Category cannot be its own parent' });
          return;
        }
      }

      const updated = await CategoryModel.update(parseInt(id), req.userId, {
        name,
        color,
        icon,
        parent_id: parentId,
        sort_order: sortOrder,
      });

      if (!updated) {
        res.status(404).json({ error: 'Category not found or cannot be modified' });
        return;
      }

      const updatedCategory = await CategoryModel.findById(parseInt(id));
      res.json({ category: updatedCategory, message: 'Category updated' });
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

      // Check category exists and belongs to user
      const category = await CategoryModel.findByIdAndUser(parseInt(id), req.userId);
      if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const deleted = await CategoryModel.delete(parseInt(id), req.userId);

      if (!deleted) {
        res.status(404).json({ error: 'Category not found or cannot be deleted' });
        return;
      }

      res.json({ message: 'Category deleted' });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  },
};
