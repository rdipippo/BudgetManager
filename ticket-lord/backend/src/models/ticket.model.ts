import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export type TicketStatus = 'valid' | 'used' | 'cancelled' | 'refunded';

export interface Ticket extends RowDataPacket {
  id: number;
  order_id: number;
  order_item_id: number;
  user_id: number;
  event_id: number;
  ticket_type_id: number;
  ticket_number: string;
  qr_code: string;
  status: TicketStatus;
  checked_in_at: Date | null;
  created_at: Date;
  // Joined
  event_title?: string;
  event_start_date?: Date;
  event_venue?: string;
  ticket_type_name?: string;
  holder_name?: string;
  holder_email?: string;
}

export const TicketModel = {
  async findById(id: number): Promise<Ticket | null> {
    const [rows] = await pool.query<Ticket[]>(
      `SELECT t.*, e.title as event_title, e.start_date as event_start_date,
        e.venue_name as event_venue, tt.name as ticket_type_name,
        u.name as holder_name, u.email as holder_email
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       JOIN users u ON t.user_id = u.id
       WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    const [rows] = await pool.query<Ticket[]>(
      `SELECT t.*, e.title as event_title, e.start_date as event_start_date,
        e.venue_name as event_venue, tt.name as ticket_type_name,
        u.name as holder_name, u.email as holder_email
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       JOIN users u ON t.user_id = u.id
       WHERE t.ticket_number = ?`,
      [ticketNumber]
    );
    return rows[0] || null;
  },

  async findByUserId(userId: number): Promise<Ticket[]> {
    const [rows] = await pool.query<Ticket[]>(
      `SELECT t.*, e.title as event_title, e.start_date as event_start_date,
        e.end_date as event_end_date, e.venue_name as event_venue,
        e.image_url as event_image, tt.name as ticket_type_name
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       WHERE t.user_id = ? AND t.status != 'cancelled'
       ORDER BY e.start_date ASC`,
      [userId]
    );
    return rows;
  },

  async findByEventId(eventId: number): Promise<Ticket[]> {
    const [rows] = await pool.query<Ticket[]>(
      `SELECT t.*, tt.name as ticket_type_name, u.name as holder_name, u.email as holder_email
       FROM tickets t
       JOIN ticket_types tt ON t.ticket_type_id = tt.id
       JOIN users u ON t.user_id = u.id
       WHERE t.event_id = ? AND t.status != 'cancelled'
       ORDER BY t.created_at DESC`,
      [eventId]
    );
    return rows;
  },

  async create(data: {
    orderId: number;
    orderItemId: number;
    userId: number;
    eventId: number;
    ticketTypeId: number;
    ticketNumber: string;
    qrCode: string;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tickets (order_id, order_item_id, user_id, event_id, ticket_type_id,
        ticket_number, qr_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'valid')`,
      [
        data.orderId, data.orderItemId, data.userId, data.eventId,
        data.ticketTypeId, data.ticketNumber, data.qrCode,
      ]
    );
    return result.insertId;
  },

  async checkIn(ticketNumber: string, eventId: number): Promise<{ success: boolean; message: string }> {
    const ticket = await this.findByTicketNumber(ticketNumber);
    if (!ticket) return { success: false, message: 'Ticket not found' };
    if (ticket.event_id !== eventId) return { success: false, message: 'Ticket not for this event' };
    if (ticket.status === 'used') return { success: false, message: 'Ticket already checked in' };
    if (ticket.status !== 'valid') return { success: false, message: `Ticket status: ${ticket.status}` };

    await pool.query(
      'UPDATE tickets SET status = "used", checked_in_at = NOW() WHERE ticket_number = ?',
      [ticketNumber]
    );
    return { success: true, message: 'Check-in successful' };
  },

  async cancelByOrderId(orderId: number): Promise<void> {
    await pool.query(
      'UPDATE tickets SET status = "cancelled" WHERE order_id = ? AND status = "valid"',
      [orderId]
    );
  },
};
