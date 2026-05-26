import pool from '../config/database';

export interface LearnedPattern {
  id: number;
  user_id: number;
  category_id: number;
  pattern_type: 'merchant' | 'description';
  pattern_value: string;
  confidence_score: number;
  match_count: number;
  created_at: Date;
  updated_at: Date;
}

export const LearnedPatternModel = {
  async findByPattern(
    userId: number,
    patternType: 'merchant' | 'description',
    patternValue: string
  ): Promise<LearnedPattern | null> {
    const result = await pool.query(
      `SELECT * FROM learned_patterns
       WHERE user_id = $1 AND pattern_type = $2 AND pattern_value = $3`,
      [userId, patternType, patternValue.toLowerCase()]
    );
    return result.rows.length > 0 ? (result.rows[0] as LearnedPattern) : null;
  },

  async findByUserId(userId: number): Promise<LearnedPattern[]> {
    const result = await pool.query(
      `SELECT * FROM learned_patterns
       WHERE user_id = $1
       ORDER BY match_count DESC, confidence_score DESC`,
      [userId]
    );
    return result.rows as LearnedPattern[];
  },

  async upsert(
    userId: number,
    categoryId: number,
    patternType: 'merchant' | 'description',
    patternValue: string
  ): Promise<void> {
    const normalizedValue = patternValue.toLowerCase().trim();
    if (!normalizedValue) return;

    const existing = await this.findByPattern(userId, patternType, normalizedValue);

    if (existing) {
      if (existing.category_id === categoryId) {
        // Same category - increase confidence
        await pool.query(
          `UPDATE learned_patterns
           SET match_count = match_count + 1,
               confidence_score = LEAST(1.00, confidence_score + 0.1)
           WHERE id = $1`,
          [existing.id]
        );
      } else {
        // Different category - user changed their mind, update with lower confidence
        await pool.query(
          `UPDATE learned_patterns
           SET category_id = $1,
               match_count = 1,
               confidence_score = 0.7
           WHERE id = $2`,
          [categoryId, existing.id]
        );
      }
    } else {
      // Create new pattern
      await pool.query(
        `INSERT INTO learned_patterns
         (user_id, category_id, pattern_type, pattern_value, confidence_score, match_count)
         VALUES ($1, $2, $3, $4, 0.8, 1)`,
        [userId, categoryId, patternType, normalizedValue]
      );
    }
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM learned_patterns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async deleteByCategory(categoryId: number): Promise<number> {
    const result = await pool.query(
      'DELETE FROM learned_patterns WHERE category_id = $1',
      [categoryId]
    );
    return result.rowCount ?? 0;
  },
};
