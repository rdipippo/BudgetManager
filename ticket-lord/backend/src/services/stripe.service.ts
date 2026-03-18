import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

// Platform fee percentage (5%)
const PLATFORM_FEE_PERCENT = 0.05;

export const StripeService = {
  stripe,

  calculatePlatformFee(amount: number): number {
    return Math.round(amount * PLATFORM_FEE_PERCENT);
  },

  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await stripe.customers.create({ email, name });
    return customer.id;
  },

  async createPaymentIntent(data: {
    amount: number; // in cents
    currency: string;
    customerId: string;
    metadata: Record<string, string>;
    stripeAccountId?: string; // Host's connected account
  }): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const platformFee = this.calculatePlatformFee(data.amount);

    const intentOptions: Stripe.PaymentIntentCreateParams = {
      amount: data.amount,
      currency: data.currency || 'usd',
      customer: data.customerId,
      metadata: data.metadata,
      automatic_payment_methods: { enabled: true },
    };

    if (data.stripeAccountId) {
      intentOptions.application_fee_amount = platformFee;
      intentOptions.transfer_data = { destination: data.stripeAccountId };
    }

    const intent = await stripe.paymentIntents.create(intentOptions);
    return { clientSecret: intent.client_secret!, paymentIntentId: intent.id };
  },

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  async createRefund(chargeId: string, amount?: number): Promise<string> {
    const refundData: Stripe.RefundCreateParams = { charge: chargeId };
    if (amount) refundData.amount = amount;
    const refund = await stripe.refunds.create(refundData);
    return refund.id;
  },

  async createConnectAccount(email: string): Promise<string> {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    return account.id;
  },

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const link = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: 'account_onboarding',
    });
    return link.url;
  },

  async getAccountBalance(accountId: string): Promise<Stripe.Balance> {
    return stripe.balance.retrieve({ stripeAccount: accountId });
  },

  constructWebhookEvent(payload: Buffer, sig: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, sig, config.stripe.webhookSecret);
  },
};
