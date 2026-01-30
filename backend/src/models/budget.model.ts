import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  period_type: 'monthly';
  start_day: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetWithCategory extends Budget {
  category_name: string;
  category_color: string;
  category_icon: string;
  is_income: boolean;
}

export interface BudgetWithSpent extends BudgetWithCategory {
  spent: number;
  remaining: number;
  percentage: number;
}

export interface CreateBudgetData {
  user_id: number;
  category_id: number;
  amount: number;
  period_type?: 'monthly';
  start_day?: number;
}

export interface UpdateBudgetData {
  amount?: number;
  start_day?: number;
  is_active?: boolean;
}

export const BudgetModel = {
  async findById(id: number): Promise<Budget | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM budgets WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Budget) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<BudgetWithCategory | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.is_income
       FROM budgets b
       INNER JOIN categories c ON b.category_id = c.id
       WHERE b.id = ? AND b.user_id = ?`,
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as BudgetWithCategory) : null;
  },

  async findByUserId(userId: number): Promise<BudgetWithCategory[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.is_income
       FROM budgets b
       INNER JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.is_active = TRUE
       ORDER BY c.is_income DESC, c.name`,
      [userId]
    );
    return rows as BudgetWithCategory[];
  },

  async findByUserIdAndCategory(userId: number, categoryId: number): Promise<Budget | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM budgets WHERE user_id = ? AND category_id = ?',
      [userId, categoryId]
    );
    return rows.length > 0 ? (rows[0] as Budget) : null;
  },

  async create(data: CreateBudgetData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO budgets (user_id, category_id, amount, period_type, start_day)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.category_id,
        data.amount,
        data.period_type || 'monthly',
        data.start_day || 1,
      ]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateBudgetData): Promise<boolean> {
    const fields: string[] = [];
    const values: (number | boolean)[] = [];

    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.start_day !== undefined) {
      fields.push('start_day = ?');
      values.push(data.start_day);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM budgets WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  getCurrentPeriodDates(startDay: number = 1): { startDate: string; endDate: string } {
    const now = new Date();
    const currentDay = now.getDate();

    let startDate: Date;
    let endDate: Date;

    if (currentDay >= startDay) {
      // We're in the current month's period
      startDate = new Date(now.getFullYear(), now.getMonth(), startDay);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, startDay - 1);
    } else {
      // We're in the previous month's period
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, startDay);
      endDate = new Date(now.getFullYear(), now.getMonth(), startDay - 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  },
};
