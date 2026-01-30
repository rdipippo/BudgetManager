import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface CategorizationRule {
  id: number;
  user_id: number;
  category_id: number;
  name: string;
  match_type: 'merchant' | 'description' | 'amount_range' | 'combined';
  merchant_pattern: string | null;
  description_pattern: string | null;
  amount_min: number | null;
  amount_max: number | null;
  is_exact_match: boolean;
  priority: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RuleWithCategory extends CategorizationRule {
  category_name: string;
  category_color: string;
}

export interface CreateRuleData {
  user_id: number;
  category_id: number;
  name: string;
  match_type: 'merchant' | 'description' | 'amount_range' | 'combined';
  merchant_pattern?: string;
  description_pattern?: string;
  amount_min?: number;
  amount_max?: number;
  is_exact_match?: boolean;
  priority?: number;
}

export interface UpdateRuleData {
  category_id?: number;
  name?: string;
  match_type?: 'merchant' | 'description' | 'amount_range' | 'combined';
  merchant_pattern?: string | null;
  description_pattern?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  is_exact_match?: boolean;
  priority?: number;
  is_active?: boolean;
}

export const RuleModel = {
  async findById(id: number): Promise<CategorizationRule | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categorization_rules WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as CategorizationRule) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<CategorizationRule | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM categorization_rules WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as CategorizationRule) : null;
  },

  async findByUserId(userId: number): Promise<RuleWithCategory[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT r.*, c.name as category_name, c.color as category_color
       FROM categorization_rules r
       INNER JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.priority DESC, r.name`,
      [userId]
    );
    return rows as RuleWithCategory[];
  },

  async findByUserIdActive(userId: number): Promise<CategorizationRule[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM categorization_rules
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY priority DESC`,
      [userId]
    );
    return rows as CategorizationRule[];
  },

  async create(data: CreateRuleData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categorization_rules
       (user_id, category_id, name, match_type, merchant_pattern, description_pattern, amount_min, amount_max, is_exact_match, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.category_id,
        data.name,
        data.match_type,
        data.merchant_pattern || null,
        data.description_pattern || null,
        data.amount_min ?? null,
        data.amount_max ?? null,
        data.is_exact_match || false,
        data.priority || 0,
      ]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateRuleData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (data.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(data.category_id);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.match_type !== undefined) {
      fields.push('match_type = ?');
      values.push(data.match_type);
    }
    if (data.merchant_pattern !== undefined) {
      fields.push('merchant_pattern = ?');
      values.push(data.merchant_pattern);
    }
    if (data.description_pattern !== undefined) {
      fields.push('description_pattern = ?');
      values.push(data.description_pattern);
    }
    if (data.amount_min !== undefined) {
      fields.push('amount_min = ?');
      values.push(data.amount_min);
    }
    if (data.amount_max !== undefined) {
      fields.push('amount_max = ?');
      values.push(data.amount_max);
    }
    if (data.is_exact_match !== undefined) {
      fields.push('is_exact_match = ?');
      values.push(data.is_exact_match);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categorization_rules SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM categorization_rules WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },
};
