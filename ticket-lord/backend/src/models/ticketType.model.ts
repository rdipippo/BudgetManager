import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface TicketType extends RowDataPacket {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  quantity_sold: number;
  sale_start: Date | null;
  sale_end: Date | null;
  max_per_order: number;
  min_per_order: number;
  is_visible: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const TicketTypeModel = {
  async findByEventId(eventId: number): Promise<TicketType[]> {
    const [rows] = await pool.query<TicketType[]>(
      'SELECT * FROM ticket_types WHERE event_id = ? AND deleted_at IS NULL ORDER BY price ASC',
      [eventId]
    );
    return rows;
  },

  async findById(id: number): Promise<TicketType | null> {
    const [rows] = await pool.query<TicketType[]>(
      'SELECT * FROM ticket_types WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  },

  async create(data: {
    eventId: number;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    saleStart?: string;
    saleEnd?: string;
    maxPerOrder?: number;
    minPerOrder?: number;
    isVisible?: boolean;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO ticket_types (event_id, name, description, price, quantity,
        sale_start, sale_end, max_per_order, min_per_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.eventId, data.name, data.description || null,
        data.price, data.quantity,
        data.saleStart || null, data.saleEnd || null,
        data.maxPerOrder || 10, data.minPerOrder || 1,
        data.isVisible !== undefined ? data.isVisible : true,
      ]
    );
    return result.insertId;
  },

  async update(id: number, eventId: number, data: Partial<{
    name: string; description: string; price: number; quantity: number;
    saleStart: string; saleEnd: string; maxPerOrder: number;
    minPerOrder: number; isVisible: boolean;
  }>): Promise<boolean> {
    const fieldMap: Record<string, string> = {
      name: 'name', description: 'description', price: 'price', quantity: 'quantity',
      saleStart: 'sale_start', saleEnd: 'sale_end',
      maxPerOrder: 'max_per_order', minPerOrder: 'min_per_order', isVisible: 'is_visible',
    };
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) { fields.push(`${col} = ?`); values.push((data as Record<string, unknown>)[key]); }
    }
    if (fields.length === 0) return false;
    values.push(id, eventId);
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE ticket_types SET ${fields.join(', ')} WHERE id = ? AND event_id = ?`,
      values
    );
    return result.affectedRows > 0;
  },

  async incrementSold(id: number, quantity: number, connection?: mysql.PoolConnection): Promise<void> {
    const db = connection || pool;
    await db.query(
      'UPDATE ticket_types SET quantity_sold = quantity_sold + ? WHERE id = ? AND (quantity - quantity_sold) >= ?',
      [quantity, id, quantity]
    );
  },

  async softDelete(id: number, eventId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE ticket_types SET deleted_at = NOW() WHERE id = ? AND event_id = ?',
      [id, eventId]
    );
    return result.affectedRows > 0;
  },
};

import mysql from 'mysql2/promise';
