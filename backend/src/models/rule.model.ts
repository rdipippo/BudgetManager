import pool from '../config/database';

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
    const result = await pool.query(
      'SELECT * FROM categorization_rules WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as CategorizationRule) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<CategorizationRule | null> {
    const result = await pool.query(
      'SELECT * FROM categorization_rules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows.length > 0 ? (result.rows[0] as CategorizationRule) : null;
  },

  async findByUserId(userId: number): Promise<RuleWithCategory[]> {
    const result = await pool.query(
      `SELECT r.*, c.name as category_name, c.color as category_color
       FROM categorization_rules r
       INNER JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = $1
       ORDER BY r.priority DESC, r.name`,
      [userId]
    );
    return result.rows as RuleWithCategory[];
  },

  async findByUserIdActive(userId: number): Promise<CategorizationRule[]> {
    const result = await pool.query(
      `SELECT * FROM categorization_rules
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY priority DESC`,
      [userId]
    );
    return result.rows as CategorizationRule[];
  },

  async create(data: CreateRuleData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO categorization_rules
       (user_id, category_id, name, match_type, merchant_pattern, description_pattern, amount_min, amount_max, is_exact_match, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
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
    return result.rows[0].id;
  },

  async update(id: number, userId: number, data: UpdateRuleData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let p = 1;

    if (data.category_id !== undefined) {
      fields.push(`category_id = $${p++}`);
      values.push(data.category_id);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${p++}`);
      values.push(data.name);
    }
    if (data.match_type !== undefined) {
      fields.push(`match_type = $${p++}`);
      values.push(data.match_type);
    }
    if (data.merchant_pattern !== undefined) {
      fields.push(`merchant_pattern = $${p++}`);
      values.push(data.merchant_pattern);
    }
    if (data.description_pattern !== undefined) {
      fields.push(`description_pattern = $${p++}`);
      values.push(data.description_pattern);
    }
    if (data.amount_min !== undefined) {
      fields.push(`amount_min = $${p++}`);
      values.push(data.amount_min);
    }
    if (data.amount_max !== undefined) {
      fields.push(`amount_max = $${p++}`);
      values.push(data.amount_max);
    }
    if (data.is_exact_match !== undefined) {
      fields.push(`is_exact_match = $${p++}`);
      values.push(data.is_exact_match);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${p++}`);
      values.push(data.priority);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${p++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const result = await pool.query(
      `UPDATE categorization_rules SET ${fields.join(', ')} WHERE id = $${p++} AND user_id = $${p}`,
      values
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM categorization_rules WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};
