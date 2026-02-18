import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface List {
  id: number;
  user_id: number;
  name: string;
  color: string;
  icon: string;
  created_at: Date;
  updated_at: Date;
}

export interface ListWithCounts extends List {
  item_count: number;
  completed_count: number;
}

export interface ListItem {
  id: number;
  list_id: number;
  user_id: number;
  name: string;
  is_completed: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateListData {
  user_id: number;
  name: string;
  color?: string;
  icon?: string;
}

export interface UpdateListData {
  name?: string;
  color?: string;
  icon?: string;
}

export interface CreateListItemData {
  list_id: number;
  user_id: number;
  name: string;
  sort_order?: number;
}

export interface UpdateListItemData {
  name?: string;
  is_completed?: boolean;
  sort_order?: number;
}

export const ListModel = {
  async findById(id: number): Promise<List | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM lists WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as List) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<List | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM lists WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as List) : null;
  },

  async findByUserId(userId: number): Promise<ListWithCounts[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT l.*,
        COUNT(li.id) as item_count,
        SUM(CASE WHEN li.is_completed = TRUE THEN 1 ELSE 0 END) as completed_count
       FROM lists l
       LEFT JOIN list_items li ON li.list_id = l.id
       WHERE l.user_id = ?
       GROUP BY l.id
       ORDER BY l.updated_at DESC`,
      [userId]
    );
    return rows as ListWithCounts[];
  },

  async findByUserIdAndName(userId: number, name: string): Promise<List | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM lists WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    return rows.length > 0 ? (rows[0] as List) : null;
  },

  async create(data: CreateListData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO lists (user_id, name, color, icon)
       VALUES (?, ?, ?, ?)`,
      [
        data.user_id,
        data.name,
        data.color || '#6366F1',
        data.icon || 'list',
      ]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateListData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE lists SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM lists WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },
};

export const ListItemModel = {
  async findByListId(listId: number): Promise<ListItem[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM list_items WHERE list_id = ? ORDER BY is_completed ASC, sort_order ASC, created_at DESC',
      [listId]
    );
    return rows as ListItem[];
  },

  async findById(id: number): Promise<ListItem | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM list_items WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? (rows[0] as ListItem) : null;
  },

  async findByIdAndUser(id: number, userId: number): Promise<ListItem | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM list_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as ListItem) : null;
  },

  async create(data: CreateListItemData): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO list_items (list_id, user_id, name, sort_order)
       VALUES (?, ?, ?, ?)`,
      [
        data.list_id,
        data.user_id,
        data.name,
        data.sort_order || 0,
      ]
    );
    return result.insertId;
  },

  async update(id: number, userId: number, data: UpdateListItemData): Promise<boolean> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.is_completed !== undefined) {
      fields.push('is_completed = ?');
      values.push(data.is_completed ? 1 : 0);
    }
    if (data.sort_order !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sort_order);
    }

    if (fields.length === 0) return false;

    values.push(id, userId);
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE list_items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async toggleComplete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE list_items SET is_completed = NOT is_completed WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },

  async delete(id: number, userId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM list_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.affectedRows > 0;
  },
};
