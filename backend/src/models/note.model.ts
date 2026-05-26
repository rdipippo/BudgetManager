import pool from '../config/database';

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
      const result = await pool.query(
        `SELECT n.*, u.first_name AS author_first_name, u.last_name AS author_last_name, u.email AS author_email
         FROM notes n
         JOIN users u ON u.id = n.author_user_id
         WHERE n.owner_user_id = $1 AND n.entity_type = 'monthly_budget'
           AND n.budget_year = $2 AND n.budget_month = $3
         ORDER BY n.created_at ASC`,
        [ownerUserId, budgetYear as number, budgetMonth as number]
      );
      return result.rows as NoteWithAuthor[];
    }

    const result = await pool.query(
      `SELECT n.*, u.first_name AS author_first_name, u.last_name AS author_last_name, u.email AS author_email
       FROM notes n
       JOIN users u ON u.id = n.author_user_id
       WHERE n.owner_user_id = $1 AND n.entity_type = $2 AND n.entity_id = $3
       ORDER BY n.created_at ASC`,
      [ownerUserId, entityType, entityId]
    );
    return result.rows as NoteWithAuthor[];
  },

  async findById(id: number): Promise<Note | null> {
    const result = await pool.query(
      'SELECT * FROM notes WHERE id = $1',
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as Note) : null;
  },

  async create(data: CreateNoteData): Promise<number> {
    const result = await pool.query(
      `INSERT INTO notes (owner_user_id, author_user_id, entity_type, entity_id, budget_year, budget_month, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
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
    return result.rows[0].id;
  },

  async update(
    id: number,
    ownerUserId: number,
    authorUserId: number,
    body: string
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE notes SET body = $1, edited_at = NOW()
       WHERE id = $2 AND owner_user_id = $3 AND author_user_id = $4`,
      [body, id, ownerUserId, authorUserId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: number, ownerUserId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND owner_user_id = $2',
      [id, ownerUserId]
    );
    return (result.rowCount ?? 0) > 0;
  },

  async findByIdWithAuthor(id: number): Promise<NoteWithAuthor | null> {
    const result = await pool.query(
      `SELECT n.*, u.first_name AS author_first_name, u.last_name AS author_last_name, u.email AS author_email
       FROM notes n
       JOIN users u ON u.id = n.author_user_id
       WHERE n.id = $1`,
      [id]
    );
    return result.rows.length > 0 ? (result.rows[0] as NoteWithAuthor) : null;
  },

  async countByEntity(
    ownerUserId: number,
    entityType: NoteEntityType,
    entityId: number,
    budgetYear?: number,
    budgetMonth?: number
  ): Promise<number> {
    if (entityType === 'monthly_budget') {
      const result = await pool.query(
        `SELECT COUNT(*) AS count FROM notes
         WHERE owner_user_id = $1 AND entity_type = 'monthly_budget'
           AND budget_year = $2 AND budget_month = $3`,
        [ownerUserId, budgetYear as number, budgetMonth as number]
      );
      return parseInt(result.rows[0].count, 10);
    }

    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM notes
       WHERE owner_user_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [ownerUserId, entityType, entityId]
    );
    return parseInt(result.rows[0].count, 10);
  },
};
