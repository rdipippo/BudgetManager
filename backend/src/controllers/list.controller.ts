import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { ListModel, ListItemModel } from '../models';

export const ListController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const lists = await ListModel.findByUserId(req.userId);
      res.json({ lists });
    } catch (error) {
      console.error('Get lists error:', error);
      res.status(500).json({ error: 'Failed to get lists' });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);

      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      const items = await ListItemModel.findByListId(list.id);
      res.json({ list, items });
    } catch (error) {
      console.error('Get list error:', error);
      res.status(500).json({ error: 'Failed to get list' });
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, color, icon } = req.body;

      const existing = await ListModel.findByUserIdAndName(req.userId, name);
      if (existing) {
        res.status(409).json({ error: 'A list with this name already exists' });
        return;
      }

      const listId = await ListModel.create({
        user_id: req.userId,
        name,
        color,
        icon,
      });

      const list = await ListModel.findById(listId);
      res.status(201).json({ list, message: 'List created' });
    } catch (error) {
      console.error('Create list error:', error);
      res.status(500).json({ error: 'Failed to create list' });
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { name, color, icon } = req.body;

      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);
      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      if (name && name !== list.name) {
        const existing = await ListModel.findByUserIdAndName(req.userId, name);
        if (existing && existing.id !== list.id) {
          res.status(409).json({ error: 'A list with this name already exists' });
          return;
        }
      }

      const updated = await ListModel.update(parseInt(id), req.userId, {
        name,
        color,
        icon,
      });

      if (!updated) {
        res.status(404).json({ error: 'List not found or cannot be modified' });
        return;
      }

      const updatedList = await ListModel.findById(parseInt(id));
      res.json({ list: updatedList, message: 'List updated' });
    } catch (error) {
      console.error('Update list error:', error);
      res.status(500).json({ error: 'Failed to update list' });
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);
      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      const deleted = await ListModel.delete(parseInt(id), req.userId);

      if (!deleted) {
        res.status(404).json({ error: 'List not found or cannot be deleted' });
        return;
      }

      res.json({ message: 'List deleted' });
    } catch (error) {
      console.error('Delete list error:', error);
      res.status(500).json({ error: 'Failed to delete list' });
    }
  },

  // List Item operations
  async createItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;
      const { name } = req.body;

      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);
      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      const itemId = await ListItemModel.create({
        list_id: list.id,
        user_id: req.userId,
        name,
      });

      const item = await ListItemModel.findById(itemId);
      res.status(201).json({ item, message: 'Item added' });
    } catch (error) {
      console.error('Create list item error:', error);
      res.status(500).json({ error: 'Failed to add item' });
    }
  },

  async updateItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id, itemId } = req.params;

      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);
      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      const item = await ListItemModel.findByIdAndUser(parseInt(itemId), req.userId);
      if (!item || item.list_id !== list.id) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      const { name, isCompleted, sortOrder } = req.body;

      const updated = await ListItemModel.update(parseInt(itemId), req.userId, {
        name,
        is_completed: isCompleted,
        sort_order: sortOrder,
      });

      if (!updated) {
        res.status(404).json({ error: 'Item not found or cannot be modified' });
        return;
      }

      const updatedItem = await ListItemModel.findById(parseInt(itemId));
      res.json({ item: updatedItem, message: 'Item updated' });
    } catch (error) {
      console.error('Update list item error:', error);
      res.status(500).json({ error: 'Failed to update item' });
    }
  },

  async toggleItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id, itemId } = req.params;

      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);
      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      const item = await ListItemModel.findByIdAndUser(parseInt(itemId), req.userId);
      if (!item || item.list_id !== list.id) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      const toggled = await ListItemModel.toggleComplete(parseInt(itemId), req.userId);

      if (!toggled) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      const updatedItem = await ListItemModel.findById(parseInt(itemId));
      res.json({ item: updatedItem, message: 'Item toggled' });
    } catch (error) {
      console.error('Toggle list item error:', error);
      res.status(500).json({ error: 'Failed to toggle item' });
    }
  },

  async deleteItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id, itemId } = req.params;

      const list = await ListModel.findByIdAndUser(parseInt(id), req.userId);
      if (!list) {
        res.status(404).json({ error: 'List not found' });
        return;
      }

      const item = await ListItemModel.findByIdAndUser(parseInt(itemId), req.userId);
      if (!item || item.list_id !== list.id) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }

      const deleted = await ListItemModel.delete(parseInt(itemId), req.userId);

      if (!deleted) {
        res.status(404).json({ error: 'Item not found or cannot be deleted' });
        return;
      }

      res.json({ message: 'Item deleted' });
    } catch (error) {
      console.error('Delete list item error:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  },
};
