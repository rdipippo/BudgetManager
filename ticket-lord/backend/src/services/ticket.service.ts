import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { TicketModel } from '../models/ticket.model';
import { OrderModel } from '../models/order.model';
import { TicketTypeModel } from '../models/ticketType.model';
import pool from '../config/database';
import { config } from '../config';

export const TicketService = {
  generateTicketNumber(): string {
    return `TL-${uuidv4().toUpperCase().replace(/-/g, '').slice(0, 10)}`;
  },

  async generateQrCode(ticketNumber: string, eventId: number): Promise<string> {
    const payload = JSON.stringify({ ticketNumber, eventId, issuer: 'TicketLord' });
    return QRCode.toDataURL(payload);
  },

  async issueTickets(data: {
    orderId: number;
    orderItemId: number;
    userId: number;
    eventId: number;
    ticketTypeId: number;
    quantity: number;
  }): Promise<number[]> {
    const ticketIds: number[] = [];
    for (let i = 0; i < data.quantity; i++) {
      const ticketNumber = this.generateTicketNumber();
      const qrCode = await this.generateQrCode(ticketNumber, data.eventId);
      const id = await TicketModel.create({
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        userId: data.userId,
        eventId: data.eventId,
        ticketTypeId: data.ticketTypeId,
        ticketNumber,
        qrCode,
      });
      ticketIds.push(id);
    }
    return ticketIds;
  },

  async processOrderCompletion(orderId: number): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const order = await OrderModel.findById(orderId);
      if (!order) throw new Error('Order not found');

      const items = await OrderModel.getItems(orderId);
      for (const item of items) {
        // Issue tickets for each order item
        const ticketNumber = this.generateTicketNumber();
        const qrCode = await this.generateQrCode(ticketNumber, order.event_id);
        for (let i = 0; i < item.quantity; i++) {
          const tn = i === 0 ? ticketNumber : this.generateTicketNumber();
          const qr = i === 0 ? qrCode : await this.generateQrCode(tn, order.event_id);
          await TicketModel.create({
            orderId,
            orderItemId: item.id,
            userId: order.user_id,
            eventId: order.event_id,
            ticketTypeId: item.ticket_type_id,
            ticketNumber: tn,
            qrCode: qr,
          });
        }
        // Update quantity sold
        await connection.query(
          'UPDATE ticket_types SET quantity_sold = quantity_sold + ? WHERE id = ?',
          [item.quantity, item.ticket_type_id]
        );
      }

      await OrderModel.updateStatus(orderId, 'completed');
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async validateTicket(ticketNumber: string, eventId: number): Promise<{
    valid: boolean;
    message: string;
    ticket?: object;
  }> {
    const result = await TicketModel.checkIn(ticketNumber, eventId);
    if (!result.success) return { valid: false, message: result.message };
    const ticket = await TicketModel.findByTicketNumber(ticketNumber);
    return { valid: true, message: result.message, ticket: ticket || undefined };
  },
};
