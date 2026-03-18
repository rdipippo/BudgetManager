import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { ordersApi, paymentsApi, type Event } from '../services/api';
import Button from '../components/Button';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import styles from './Checkout.module.css';

type OrderItem = { ticketTypeId: number; quantity: number; name?: string; price?: number };

interface LocationState {
  items: OrderItem[];
  event: Event;
}

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function CheckoutForm({ orderId, totalAmount, onSuccess }: {
  orderId: number;
  totalAmount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/my-tickets?order=${orderId}`,
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.paymentForm}>
      <PaymentElement />
      {error && <Alert type="error" message={error} />}
      <Button type="submit" fullWidth size="lg" loading={processing} disabled={!stripe || processing}>
        Pay ${(totalAmount / 100).toFixed(2)}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeInstance, setStripeInstance] = useState<ReturnType<typeof loadStripe> | null>(null);

  useEffect(() => {
    if (!state?.items || !eventId) {
      navigate(`/events/${eventId}`);
      return;
    }

    const init = async () => {
      try {
        // Load Stripe
        const { data: cfg } = await paymentsApi.getConfig();
        if (!stripePromise) stripePromise = loadStripe(cfg.publishableKey);
        setStripeInstance(stripePromise);

        // Create order
        const { data } = await ordersApi.create({
          eventId: parseInt(eventId),
          items: state.items,
        });
        setClientSecret(data.clientSecret);
        setOrderId(data.orderId);
        setTotalAmount(data.totalAmount);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create order';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [eventId, state, navigate]);

  if (loading) return <Spinner fullPage />;
  if (error) return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <Alert type="error" message={error} />
      <Button onClick={() => navigate(-1)} variant="outline" style={{ marginTop: '1rem' }}>
        ← Go Back
      </Button>
    </div>
  );

  const event = state?.event;

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Complete Your Order</h1>

        <div className={styles.grid}>
          {/* Order summary */}
          <aside className={styles.summary} aria-label="Order summary">
            <h2 className={styles.summaryTitle}>Order Summary</h2>
            {event && (
              <div className={styles.eventInfo}>
                <strong>{event.title}</strong>
                <p>{event.venueName} · {event.city}</p>
              </div>
            )}
            <ul className={styles.items} role="list">
              {state?.items.map((item) => (
                <li key={item.ticketTypeId} className={styles.item}>
                  <span>{item.name || `Ticket Type ${item.ticketTypeId}`} × {item.quantity}</span>
                  {item.price !== undefined && (
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  )}
                </li>
              ))}
            </ul>
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>${(totalAmount / 100).toFixed(2)}</strong>
            </div>
            <p className={styles.secureNote}>
              <span aria-hidden="true">🔒</span> Payments secured by Stripe
            </p>
          </aside>

          {/* Payment form */}
          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading" className={styles.paymentTitle}>Payment Details</h2>
            {clientSecret && stripeInstance && (
              <Elements stripe={stripeInstance} options={{ clientSecret }}>
                <CheckoutForm
                  orderId={orderId}
                  totalAmount={totalAmount}
                  onSuccess={() => navigate('/my-tickets')}
                />
              </Elements>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
