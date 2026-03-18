import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';
import { OrderModel } from '../models/order.model';
import { TicketService } from '../services/ticket.service';
import { UserModel } from '../models/user.model';
import { EmailService } from '../services/email.service';
import { TicketModel } from '../models/ticket.model';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';

export const PaymentsController = {
  // Webhook handler for Stripe events (raw body required)
  async webhook(req: Request, res: Response): Promise<void> {
    const sig = req.headers['stripe-signature'] as string;
    let event;
    try {
      event = StripeService.constructWebhookEvent(req.body as Buffer, sig);
    } catch (err) {
      console.error('Webhook signature error:', err);
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const intent = event.data.object as { id: string; latest_charge: string | { id: string } };
          const order = await OrderModel.findByPaymentIntentId(intent.id);
          if (order && order.status === 'pending') {
            await TicketService.processOrderCompletion(order.id);
            const chargeId = typeof intent.latest_charge === 'string'
              ? intent.latest_charge
              : intent.latest_charge?.id;
            if (chargeId) {
              await OrderModel.updateStatus(order.id, 'completed', { stripeChargeId: chargeId });
            }
            // Send confirmation email with tickets
            const user = await UserModel.findById(order.user_id);
            const tickets = await TicketModel.findByUserId(order.user_id);
            const orderTickets = tickets.filter((t) => t.order_id === order.id);
            if (user && orderTickets.length > 0) {
              await EmailService.sendTicketConfirmation({
                email: user.email,
                name: user.name,
                eventTitle: order.event_title || 'Event',
                eventDate: new Date(order.event_start_date || Date.now()).toLocaleDateString(),
                venue: order.event_venue || '',
                tickets: orderTickets.map((t) => ({
                  ticketNumber: t.ticket_number,
                  type: t.ticket_type_name || 'General',
                  qrCode: t.qr_code,
                })),
                orderTotal: order.total_amount,
              });
            }
          }
          break;
        }
        case 'payment_intent.payment_failed': {
          const intent = event.data.object as { id: string };
          const order = await OrderModel.findByPaymentIntentId(intent.id);
          if (order) {
            await OrderModel.updateStatus(order.id, 'cancelled');
          }
          break;
        }
      }
      res.json({ received: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },

  // Get Stripe publishable key
  async getPublishableKey(_req: Request, res: Response): Promise<void> {
    res.json({ publishableKey: config.stripe.publishableKey });
  },

  // Host: Connect Stripe account for payouts
  async connectStripeAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await UserModel.findById(req.user!.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }

      let accountId = user.stripe_connect_account_id;
      if (!accountId) {
        accountId = await StripeService.createConnectAccount(user.email);
        await UserModel.updateStripeConnectId(user.id, accountId);
      }

      const returnUrl = `${config.frontendUrl}/host/stripe-return`;
      const refreshUrl = `${config.frontendUrl}/host/stripe-refresh`;
      const url = await StripeService.createAccountLink(accountId, returnUrl, refreshUrl);
      res.json({ url });
    } catch (err) {
      console.error('Connect account error:', err);
      res.status(500).json({ error: 'Failed to connect Stripe account' });
    }
  },

  async getConnectStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await UserModel.findById(req.user!.id);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      res.json({
        connected: !!user.stripe_connect_account_id,
        accountId: user.stripe_connect_account_id,
      });
    } catch {
      res.status(500).json({ error: 'Failed to get connect status' });
    }
  },
};

// Extend order for ticket fields
declare module '../models/order.model' {
  interface Order {
    event_start_date?: Date;
    event_venue?: string;
  }
}
