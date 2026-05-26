import pool from '../config/database';

export interface UserPreferences {
  id: number;
  user_id: number;
  transaction_columns: string;
  transaction_sort_field: string;
  transaction_sort_direction: 'asc' | 'desc';
  created_at: Date;
  updated_at: Date;
}

export interface TransactionColumnConfig {
  visibleColumns: unknown;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}

const DEFAULT_COLUMNS = ['name', 'date', 'category', 'amount'];
const DEFAULT_SORT_FIELD = 'date';
const DEFAULT_SORT_DIRECTION = 'desc';

export const UserPreferencesModel = {
  async findByUserId(userId: number): Promise<UserPreferences | null> {
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? (result.rows[0] as UserPreferences) : null;
  },

  async getTransactionConfig(userId: number): Promise<TransactionColumnConfig> {
    const prefs = await this.findByUserId(userId);

    if (!prefs) {
      return {
        visibleColumns: DEFAULT_COLUMNS,
        sortField: DEFAULT_SORT_FIELD,
        sortDirection: DEFAULT_SORT_DIRECTION,
      };
    }
    return {
      visibleColumns: prefs.transaction_columns ? prefs.transaction_columns as unknown: DEFAULT_COLUMNS,
      sortField: prefs.transaction_sort_field || DEFAULT_SORT_FIELD,
      sortDirection: prefs.transaction_sort_direction || DEFAULT_SORT_DIRECTION,
    };
  },

  async upsert(
    userId: number,
    config: Partial<TransactionColumnConfig>
  ): Promise<void> {
    const existing = await this.findByUserId(userId);

    if (existing) {
      const updates: string[] = [];
      const values: (string | number)[] = [];
      let p = 1;

      if (config.visibleColumns !== undefined) {
        updates.push(`transaction_columns = $${p++}`);
        values.push(JSON.stringify(config.visibleColumns));
      }
      if (config.sortField !== undefined) {
        updates.push(`transaction_sort_field = $${p++}`);
        values.push(config.sortField);
      }
      if (config.sortDirection !== undefined) {
        updates.push(`transaction_sort_direction = $${p++}`);
        values.push(config.sortDirection);
      }

      if (updates.length > 0) {
        values.push(userId);
        await pool.query(
          `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = $${p}`,
          values
        );
      }
    } else {
      await pool.query(
        `INSERT INTO user_preferences (user_id, transaction_columns, transaction_sort_field, transaction_sort_direction)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          JSON.stringify(config.visibleColumns || DEFAULT_COLUMNS),
          config.sortField || DEFAULT_SORT_FIELD,
          config.sortDirection || DEFAULT_SORT_DIRECTION,
        ]
      );
    }
  },
};
