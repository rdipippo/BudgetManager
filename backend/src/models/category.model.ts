import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Category {
  id: number;
  user_id: number;
  parent_id: number | null;
  name: string;
  color: string;
  icon: string;
  is_system: boolean;
  is_income: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCategoryData {
  user_id: number;
  parent_id?: number | null;
  name: string;
  color?: string;
  icon?: string;
  is_income?: boolean;
  is_system?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
  icon?: string;
  parent_id?: number | null;
  sort_order?: number;
}

const DEFAULT_CATEGORIES = [
  { name: 'Income', color: '#10B981', icon: 'dollar-sign', is_income: true },
  { name: 'Housing', color: '#4F46E5', icon: 'home', is_income: false },
  { name: 'Transportation', color: '#F59E0B', icon: 'car', is_income: false },
  { name: 'Food & Dining', color: '#EF4444', icon: 'utensils', is_income: false },
  { name: 'Utilities', color: '#6366F1', icon: 'zap', is_income: false },
  { name: 'Healthcare', color: '#EC4899', icon: 'heart', is_income: false },
  { name: 'Entertainment', color: '#8B5CF6', icon: 'film', is_income: false },
  { name: 'Shopping', color: '#14B8A6', icon: 'shopping-bag', is_income: false },
  { name: 'Personal Care', color: '#F97316', icon: 'user', is_income: false },
  { name: 'Education', color: '#0EA5E9', icon: 'book', is_income: false },
  { name: 'Subscriptions', color: '#84CC16', icon: 'credit-card', is_income: false },
  { name: 'Other', color: '#6B7280', icon: 'more-horizontal', is_income: false },
];

export const CategoryModel = {
  async findById(id: number): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Category) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as Category) : null;
  },

  async findByUserId(userId: number): Promise<Category[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE user_id = ? ORDER BY is_income DESC, sort_order, name',
      [userId]
    );
    return rows as Category[];
  },

  async findByUserIdAndName(userId: number, name: string, parentId: number | null = null): Promise<Category | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categories WHERE user_id = ? AND name = ? AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))',
      [userId, name, parentId, parentId]
    );
    return rows.length > 0 ? (rows[0] as Category) : null;
  },

  async create(data: CreateCategoryData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categories (user_id, parent_id, name, color, icon, is_income, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.parent_id || null,
        data.name,
        data.color || '#6B7280',
        data.icon || 'tag',
        data.is_income || false,
        data.is_system || false,
      ]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateCategoryData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon);
    }
    if (data.parent_id !== undefined) {
      fields.push('parent_id = ?');
      values.push(data.parent_id);
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sort_order);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async createDefaultsForUser(userId: number): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
      await pool.execute(
        `INSERT INTO categories (user_id, name, color, icon, is_system, is_income)
         VALUES (?, ?, ?, ?, TRUE, ?)`,
        [userId, cat.name, cat.color, cat.icon, cat.is_income]
      );
    }
  },

  async hasCategories(userId: number): Promise<boolean> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT 1 FROM categories WHERE user_id = ? LIMIT 1',
      [userId]
    );
    return rows.length > 0;
  },
};
