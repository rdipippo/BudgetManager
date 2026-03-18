import { Request, Response } from 'express';
import { OrderModel } from '../models/order.model';
import { TicketTypeModel } from '../models/ticketType.model';
import { EventModel } from '../models/event.model';
import { UserModel } from '../models/user.model';
import { StripeService } from '../services/stripe.service';
import { AuthRequest } from '../middleware/auth';

export const OrdersController = {
  async createOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { eventId, items } = req.body as {
        eventId: number;
        items: Array<{ ticketTypeId: number; quantity: number }>;
      };

      const event = await EventModel.findById(eventId);
      if (!event || event.status !== 'published') {
        res.status(404).json({ error: 'Event not found or not available' });
        return;
      }

      // Validate ticket types and calculate total
      let totalAmount = 0;
      const validatedItems: Array<{
        ticketTypeId: number; quantity: number; unitPrice: number; ticketType: Awaited<ReturnType<typeof TicketTypeModel.findById>>;
      }> = [];

      for (const item of items) {
        const tt = await TicketTypeModel.findById(item.ticketTypeId);
        if (!tt || tt.event_id !== eventId) {
          res.status(400).json({ error: `Invalid ticket type: ${item.ticketTypeId}` });
          return;
        }
        if (tt.quantity - tt.quantity_sold < item.quantity) {
          res.status(400).json({ error: `Not enough tickets available for: ${tt.name}` });
          return;
        }
        if (item.quantity > tt.max_per_order) {
          res.status(400).json({ error: `Max ${tt.max_per_order} tickets per order for: ${tt.name}` });
          return;
        }
        const itemTotal = Math.round(tt.price * 100) * item.quantity;
        totalAmount += itemTotal;
        validatedItems.push({ ticketTypeId: item.ticketTypeId, quantity: item.quantity, unitPrice: Math.round(tt.price * 100), ticketType: tt });
      }

      // Get or create Stripe customer
      const user = await UserModel.findById(req.user!.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }

      let customerId = user.stripe_customer_id;
      if (!customerId) {
        customerId = await StripeService.createCustomer(user.email, user.name);
        await UserModel.updateStripeCustomerId(user.id, customerId);
      }

      const platformFee = StripeService.calculatePlatformFee(totalAmount);
      const { clientSecret, paymentIntentId } = await StripeService.createPaymentIntent({
        amount: totalAmount,
        currency: 'usd',
        customerId,
        metadata: {
          eventId: String(eventId),
          userId: String(req.user!.id),
        },
        stripeAccountId: event.host_stripe_connect_id || undefined,
      });

      // Create order record
      const orderId = await OrderModel.create({
        userId: req.user!.id,
        eventId,
        totalAmount,
        platformFee,
        stripePaymentIntentId: paymentIntentId,
      });

      // Create order items
      for (const item of validatedItems) {
        await OrderModel.addItem({
          orderId,
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      res.status(201).json({
        orderId,
        clientSecret,
        totalAmount,
        currency: 'usd',
      });
    } catch (err) {
      console.error('Create order error:', err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  },

  async getOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await OrderModel.findById(parseInt(req.params.id));
      if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
      if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }
      const items = await OrderModel.getItems(order.id);
      res.json({ ...order, items });
    } catch {
      res.status(500).json({ error: 'Failed to get order' });
    }
  },

  async getMyOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const orders = await OrderModel.findByUserId(req.user!.id);
      res.json(orders);
    } catch {
      res.status(500).json({ error: 'Failed to get orders' });
    }
  },

  async requestRefund(req: AuthRequest, res: Response): Promise<void> {
    try {
      const order = await OrderModel.findById(parseInt(req.params.id));
      if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
      if (order.user_id !== req.user!.id) { res.status(403).json({ error: 'Unauthorized' }); return; }
      if (order.status !== 'completed') {
        res.status(400).json({ error: 'Order cannot be refunded' });
        return;
      }

      const intent = await StripeService.retrievePaymentIntent(order.stripe_payment_intent_id!);
      const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
      if (!chargeId) { res.status(400).json({ error: 'No charge found for this order' }); return; }

      const refundId = await StripeService.createRefund(chargeId);
      await OrderModel.updateStatus(order.id, 'refunded', { refundId });

      const { TicketModel } = await import('../models/ticket.model');
      await TicketModel.cancelByOrderId(order.id);

      const user = await UserModel.findById(req.user!.id);
      const { EmailService } = await import('../services/email.service');
      if (user) {
        await EmailService.sendRefundConfirmation(user.email, user.name, order.event_title!, order.total_amount);
      }

      res.json({ message: 'Refund processed successfully' });
    } catch (err) {
      console.error('Refund error:', err);
      res.status(500).json({ error: 'Refund failed' });
    }
  },
};

// Extend Event interface for host stripe field
declare module '../models/event.model' {
  interface Event {
    host_stripe_connect_id?: string;
  }
}
