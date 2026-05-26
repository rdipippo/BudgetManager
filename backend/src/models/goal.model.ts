import pool from '../config/database';

export type GoalType = 'save_balance' | 'pay_off_credit' | 'reduce_spending' | 'spend_target';
export type ReductionType = 'fixed' | 'percent';

export interface Goal {
  id: number;
  user_id: number;
  name: string;
  goal_type: GoalType;
  plaid_account_id: number | null;
  category_id: number | null;
  target_amount: number | null;
  baseline_amount: number | null;
  target_balance: number | null;
  baseline_total: number | null;
  reduction_type: ReductionType | null;
  reduction_amount: number | null;
  target_date: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GoalWithDetails extends Goal {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  account_name: string | null;
  account_mask: string | null;
  credit_account_ids: number[];
}

export interface GoalProgressPoint {
  recorded_date: string;
  current_value: number;
}

export interface CreateGoalData {
  user_id: number;
  name: string;
  goal_type: GoalType;
  plaid_account_id?: number | null;
  category_id?: number | null;
  target_amount?: number | null;
  baseline_amount?: number | null;
  target_balance?: number | null;
  baseline_total?: number | null;
  reduction_type?: ReductionType | null;
  reduction_amount?: number | null;
  target_date?: string | null;
  credit_account_ids?: number[];
}

export interface UpdateGoalData {
  name?: string;
  target_amount?: number | null;
  baseline_amount?: number | null;
  target_balance?: number | null;
  baseline_total?: number | null;
  reduction_type?: ReductionType | null;
  reduction_amount?: number | null;
  target_date?: string | null;
  plaid_account_id?: number | null;
  category_id?: number | null;
  is_active?: boolean;
  credit_account_ids?: number[];
}

const GOAL_DETAIL_SELECT = `
  SELECT
    g.*,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    pa.name AS account_name,
    pa.mask AS account_mask,
    COALESCE(
      (SELECT array_agg(gca.plaid_account_id) FROM goal_credit_accounts gca WHERE gca.goal_id = g.id),
      ARRAY[]::int[]
    ) AS credit_account_ids
  FROM goals g
  LEFT JOIN categories c ON g.category_id = c.id
  LEFT JOIN plaid_accounts pa ON g.plaid_account_id = pa.id
`;

const mapGoalRow = (row: Record<string, unknown>): GoalWithDetails => ({
  ...(row as unknown as Goal),
  category_name: (row.category_name as string | null) ?? null,
  category_color: (row.category_color as string | null) ?? null,
  category_icon: (row.category_icon as string | null) ?? null,
  account_name: (row.account_name as string | null) ?? null,
  account_mask: (row.account_mask as string | null) ?? null,
  credit_account_ids: (row.credit_account_ids as number[] | null) ?? [],
});

export const GoalModel = {
  async findByUserId(userId: number): Promise<GoalWithDetails[]> {
    const result = await pool.query(
      `${GOAL_DETAIL_SELECT}
       WHERE g.user_id = $1
       ORDER BY g.is_active DESC, g.created_at DESC`,
      [userId]
    );
    return result.rows.map(mapGoalRow);
  },

  async findByIdAndUser(id: number, userId: number): Promise<GoalWithDetails | null> {
    const result = await pool.query(
      `${GOAL_DETAIL_SELECT}
       WHERE g.id = $1 AND g.user_id = $2`,
      [id, userId]
    );
    return result.rows.length > 0 ? mapGoalRow(result.rows[0]) : null;
  },

  async create(data: CreateGoalData): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO goals (
           user_id, name, goal_type,
           plaid_account_id, category_id,
           target_amount, baseline_amount,
           target_balance, baseline_total,
           reduction_type, reduction_amount,
           target_date
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          data.user_id,
          data.name,
          data.goal_type,
          data.plaid_account_id ?? null,
          data.category_id ?? null,
          data.target_amount ?? null,
          data.baseline_amount ?? null,
          data.target_balance ?? null,
          data.baseline_total ?? null,
          data.reduction_type ?? null,
          data.reduction_amount ?? null,
          data.target_date ?? null,
        ]
      );
      const goalId = result.rows[0].id as number;

      if (data.goal_type === 'pay_off_credit' && data.credit_account_ids?.length) {
        for (const accountId of data.credit_account_ids) {
          await client.query(
            `INSERT INTO goal_credit_accounts (goal_id, plaid_account_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [goalId, accountId]
          );
        }
      }

      await client.query('COMMIT');
      return goalId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id: number, userId: number, data: UpdateGoalData): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields: string[] = [];
      const values: (string | number | boolean | null)[] = [];
      let p = 1;

      const set = (column: string, value: unknown) => {
        fields.push(`${column} = $${p++}`);
        values.push(value as string | number | boolean | null);
      };

      if (data.name !== undefined) set('name', data.name);
      if (data.target_amount !== undefined) set('target_amount', data.target_amount);
      if (data.baseline_amount !== undefined) set('baseline_amount', data.baseline_amount);
      if (data.target_balance !== undefined) set('target_balance', data.target_balance);
      if (data.baseline_total !== undefined) set('baseline_total', data.baseline_total);
      if (data.reduction_type !== undefined) set('reduction_type', data.reduction_type);
      if (data.reduction_amount !== undefined) set('reduction_amount', data.reduction_amount);
      if (data.target_date !== undefined) set('target_date', data.target_date);
      if (data.plaid_account_id !== undefined) set('plaid_account_id', data.plaid_account_id);
      if (data.category_id !== undefined) set('category_id', data.category_id);
      if (data.is_active !== undefined) set('is_active', data.is_active);

      let updated = false;
      if (fields.length > 0) {
        values.push(id, userId);
        const result = await client.query(
          `UPDATE goals SET ${fields.join(', ')} WHERE id = $${p++} AND user_id = $${p}`,
          values
        );
        updated = (result.rowCount ?? 0) > 0;
      } else {
        const check = await client.query(
          'SELECT 1 FROM goals WHERE id = $1 AND user_id = $2',
          [id, userId]
        );
        updated = check.rows.length > 0;
      }

      if (updated && data.credit_account_ids !== undefined) {
        await client.query('DELETE FROM goal_credit_accounts WHERE goal_id = $1', [id]);
        for (const accountId of data.credit_account_ids) {
          await client.query(
            `INSERT INTO goal_credit_accounts (goal_id, plaid_account_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, accountId]
          );
        }
      }

      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async getProgress(goalId: number): Promise<GoalProgressPoint[]> {
    const result = await pool.query(
      `SELECT to_char(recorded_date, 'YYYY-MM-DD') AS recorded_date, current_value
       FROM goal_progress
       WHERE goal_id = $1
       ORDER BY recorded_date ASC`,
      [goalId]
    );
    return result.rows.map((row) => ({
      recorded_date: row.recorded_date as string,
      current_value: parseFloat(row.current_value) || 0,
    }));
  },

  async upsertProgressForToday(goalId: number, currentValue: number): Promise<void> {
    await pool.query(
      `INSERT INTO goal_progress (goal_id, recorded_date, current_value)
       VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (goal_id, recorded_date) DO UPDATE SET current_value = EXCLUDED.current_value`,
      [goalId, currentValue]
    );
  },

  getCurrentMonthDates(): { startDate: string; endDate: string } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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
};
