import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM learned_patterns
       WHERE user_id = ? AND pattern_type = ? AND pattern_value = ?`,
      [userId, patternType, patternValue.toLowerCase()]
    );
    return rows.length > 0 ? (rows[0] as LearnedPattern) : null;
  },

  async findByUserId(userId: number): Promise<LearnedPattern[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM learned_patterns
       WHERE user_id = ?
       ORDER BY match_count DESC, confidence_score DESC`,
      [userId]
    );
    return rows as LearnedPattern[];
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
        await pool.execute(
          `UPDATE learned_patterns
           SET match_count = match_count + 1,
               confidence_score = LEAST(1.00, confidence_score + 0.1)
           WHERE id = ?`,
          [existing.id]
        );
      } else {
        // Different category - user changed their mind, update with lower confidence
        await pool.execute(
          `UPDATE learned_patterns
           SET category_id = ?,
               match_count = 1,
               confidence_score = 0.7
           WHERE id = ?`,
          [categoryId, existing.id]
        );
      }
    } else {
      // Create new pattern
      await pool.execute(
        `INSERT INTO learned_patterns
         (user_id, category_id, pattern_type, pattern_value, confidence_score, match_count)
         VALUES (?, ?, ?, ?, 0.8, 1)`,
        [userId, categoryId, patternType, normalizedValue]
      );
    }
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM learned_patterns WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async deleteByCategory(categoryId: number): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM learned_patterns WHERE category_id = ?',
      [categoryId]
    );
    return result.affectedRows;
  },
};
