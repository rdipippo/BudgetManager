import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export type NoteEntityType = 'plaid_account' | 'category' | 'monthly_budget';

export interface Note {
  id: number;
  owner_user_id: number;
  author_user_id: number;
  entity_type: NoteEntityType;
  entity_id: number;
  budget_year: number | null;
  budget_month: number | null;
  body: string;
  edited_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NoteWithAuthor extends Note {
  author_first_name: string | null;
  author_last_name: string | null;
  author_email: string;
}

export interface CreateNoteData {
  owner_user_id: number;
  author_user_id: number;
  entity_type: NoteEntityType;
  entity_id: number;
  budget_year?: number | null;
  budget_month?: number | null;
  body: string;
}

export const NoteModel = {
  async findByEntity(
    ownerUserId: number,
    entityType: NoteEntityType,
    entityId: number,
    budgetYear?: number,
    budgetMonth?: number
  ): Promise<NoteWithAuthor[]> {
    if (entityType === 'monthly_budget') {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT n.*, u.first_name AS author_first_name, u.last_name AS author_last_name, u.email AS author_email
         FROM notes n
         JOIN users u ON u.id = n.author_user_id
         WHERE n.owner_user_id = ? AND n.entity_type = 'monthly_budget'
           AND n.budget_year = ? AND n.budget_month = ?
         ORDER BY n.created_at ASC`,
        [ownerUserId, budgetYear as number, budgetMonth as number]
      );
      return rows as NoteWithAuthor[];
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT n.*, u.first_name AS author_first_name, u.last_name AS author_last_name, u.email AS author_email
       FROM notes n
       JOIN users u ON u.id = n.author_user_id
       WHERE n.owner_user_id = ? AND n.entity_type = ? AND n.entity_id = ?
       ORDER BY n.created_at ASC`,
      [ownerUserId, entityType, entityId]
    );
    return rows as NoteWithAuthor[];
  },

  async findById(id: number): Promise<Note | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as Note) : null;
  },

  async create(data: CreateNoteData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO notes (owner_user_id, author_user_id, entity_type, entity_id, budget_year, budget_month, body)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.owner_user_id,
        data.author_user_id,
        data.entity_type,
        data.entity_id,
        data.budget_year ?? null,
        data.budget_month ?? null,
        data.body,
      ]
    );
    return result.insertId;
  },

  async update(
    id: number,
    ownerUserId: number,
    authorUserId: number,
    body: string
  ): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE notes SET body = ?, edited_at = NOW()
       WHERE id = ? AND owner_user_id = ? AND author_user_id = ?`,
      [body, id, ownerUserId, authorUserId]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, ownerUserId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notes WHERE id = ? AND owner_user_id = ?',
      [id, ownerUserId]
    );
    return result.affectedRows > 0;
  },

  async findByIdWithAuthor(id: number): Promise<NoteWithAuthor | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT n.*, u.first_name AS author_first_name, u.last_name AS author_last_name, u.email AS author_email
       FROM notes n
       JOIN users u ON u.id = n.author_user_id
       WHERE n.id = ?`,
      [id]
    );
    return rows.length > 0 ? (rows[0] as NoteWithAuthor) : null;
  },

  async countByEntity(
    ownerUserId: number,
    entityType: NoteEntityType,
    entityId: number,
    budgetYear?: number,
    budgetMonth?: number
  ): Promise<number> {
    if (entityType === 'monthly_budget') {
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS count FROM notes
         WHERE owner_user_id = ? AND entity_type = 'monthly_budget'
           AND budget_year = ? AND budget_month = ?`,
        [ownerUserId, budgetYear as number, budgetMonth as number]
      );
      return (rows[0] as { count: number }).count;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM notes
       WHERE owner_user_id = ? AND entity_type = ? AND entity_id = ?`,
      [ownerUserId, entityType, entityId]
    );
    return (rows[0] as { count: number }).count;
  },
};
