import pool from '../config/database';

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
    const result = await pool.query(
      'SELECT * FROM budgets WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as Budget) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<BudgetWithCategory | null> {
    const result = await pool.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.is_income
       FROM budgets b
       INNER JOIN categories c ON b.category_id = c.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    return result.rows.length > 0 ? (result.rows[0] as BudgetWithCategory) : null;
  },

  async findByUserId(userId: number): Promise<BudgetWithCategory[]> {
    const result = await pool.query(
      `SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon, c.is_income
       FROM budgets b
       INNER JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.is_active = TRUE
       ORDER BY c.is_income DESC, c.name`,
      [userId]
    );
    return result.rows as BudgetWithCategory[];
  },

  async findByUserIdAndCategory(userId: number, categoryId: number): Promise<Budget | null> {
    const result = await pool.query(
      'SELECT * FROM budgets WHERE user_id = $1 AND category_id = $2',
      [userId, categoryId]
    );
    return result.rows.length > 0 ? (result.rows[0] as Budget) : null;
  },

  async create(data: CreateBudgetData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, period_type, start_day)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        data.user_id,
        data.category_id,
        data.amount,
        data.period_type || 'monthly',
        data.start_day || 1,
      ]
    );
    return result.rows[0].id;
  },

  async update(id: number, userId: number, data: UpdateBudgetData): Promise<boolean> {
    const fields: string[] = [];
    const values: (number | boolean)[] = [];
    let p = 1;

    if (data.amount !== undefined) {
      fields.push(`amount = $${p++}`);
      values.push(data.amount);
    }
    if (data.start_day !== undefined) {
      fields.push(`start_day = $${p++}`);
      values.push(data.start_day);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${p++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = $${p++} AND user_id = $${p}`,
      values
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
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

    // Format dates in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  },

  getPeriodDatesForMonth(year: number, month: number, startDay: number = 1): { startDate: string; endDate: string } {
    // month is 1-indexed (1 = January, 12 = December)
    const startDate = new Date(year, month - 1, startDay);
    const endDate = new Date(year, month, startDay - 1);

    const formatDate = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  },
};
