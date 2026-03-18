import pool from '../config/database';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

export interface Order extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number;
  total_amount: number;
  platform_fee: number;
  status: OrderStatus;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  refund_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined
  event_title?: string;
  buyer_name?: string;
  buyer_email?: string;
}

export interface OrderItem extends RowDataPacket {
  id: number;
  order_id: number;
  ticket_type_id: number;
  quantity: number;
  unit_price: number;
  ticket_type_name?: string;
}

export const OrderModel = {
  async findById(id: number): Promise<Order | null> {
    const [rows] = await pool.query<Order[]>(
      `SELECT o.*, e.title as event_title, u.name as buyer_name, u.email as buyer_email
       FROM orders o
       JOIN events e ON o.event_id = e.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByPaymentIntentId(paymentIntentId: string): Promise<Order | null> {
    const [rows] = await pool.query<Order[]>(
      'SELECT * FROM orders WHERE stripe_payment_intent_id = ?',
      [paymentIntentId]
    );
    return rows[0] || null;
  },

  async findByUserId(userId: number): Promise<Order[]> {
    const [rows] = await pool.query<Order[]>(
      `SELECT o.*, e.title as event_title, e.start_date, e.image_url
       FROM orders o
       JOIN events e ON o.event_id = e.id
       WHERE o.user_id = ? AND o.status != 'pending'
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return rows;
  },

  async findByEventId(eventId: number, hostId: number): Promise<Order[]> {
    const [rows] = await pool.query<Order[]>(
      `SELECT o.*, u.name as buyer_name, u.email as buyer_email
       FROM orders o
       JOIN events e ON o.event_id = e.id
       JOIN users u ON o.user_id = u.id
       WHERE o.event_id = ? AND e.host_id = ? AND o.status = 'completed'
       ORDER BY o.created_at DESC`,
      [eventId, hostId]
    );
    return rows;
  },

  async getItems(orderId: number): Promise<OrderItem[]> {
    const [rows] = await pool.query<OrderItem[]>(
      `SELECT oi.*, tt.name as ticket_type_name
       FROM order_items oi
       JOIN ticket_types tt ON oi.ticket_type_id = tt.id
       WHERE oi.order_id = ?`,
      [orderId]
    );
    return rows;
  },

  async create(data: {
    userId: number;
    eventId: number;
    totalAmount: number;
    platformFee: number;
    stripePaymentIntentId: string;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO orders (user_id, event_id, total_amount, platform_fee, stripe_payment_intent_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [data.userId, data.eventId, data.totalAmount, data.platformFee, data.stripePaymentIntentId]
    );
    return result.insertId;
  },

  async addItem(data: {
    orderId: number;
    ticketTypeId: number;
    quantity: number;
    unitPrice: number;
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO order_items (order_id, ticket_type_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
      [data.orderId, data.ticketTypeId, data.quantity, data.unitPrice]
    );
    return result.insertId;
  },

  async updateStatus(id: number, status: OrderStatus, extra?: {
    stripeChargeId?: string;
    refundId?: string;
  }): Promise<void> {
    const fields = ['status = ?'];
    const values: unknown[] = [status];
    if (extra?.stripeChargeId) { fields.push('stripe_charge_id = ?'); values.push(extra.stripeChargeId); }
    if (extra?.refundId) { fields.push('refund_id = ?'); values.push(extra.refundId); }
    values.push(id);
    await pool.query(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async getEventRevenue(eventId: number, hostId: number): Promise<{
    totalRevenue: number; platformFees: number; netRevenue: number; orderCount: number;
  }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
        SUM(o.total_amount) as totalRevenue,
        SUM(o.platform_fee) as platformFees,
        SUM(o.total_amount - o.platform_fee) as netRevenue,
        COUNT(*) as orderCount
       FROM orders o
       JOIN events e ON o.event_id = e.id
       WHERE o.event_id = ? AND e.host_id = ? AND o.status = 'completed'`,
      [eventId, hostId]
    );
    return rows[0] as { totalRevenue: number; platformFees: number; netRevenue: number; orderCount: number };
  },
};
