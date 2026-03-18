import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { eventsApi, type Event, type TicketType } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import Button from '../components/Button';
import styles from './EventDetail.module.css';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    eventsApi.getById(parseInt(id))
      .then(({ data }) => setEvent(data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Spinner fullPage />;
  if (!event) return null;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);

  const handleQuantityChange = (ttId: number, qty: number) => {
    setSelectedQuantities((prev) => ({ ...prev, [ttId]: qty }));
  };

  const totalSelected = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);
  const totalPrice = event.ticketTypes?.reduce((sum, tt) => {
    return sum + (selectedQuantities[tt.id] || 0) * tt.price;
  }, 0) || 0;

  const handleCheckout = () => {
    if (!user) { navigate('/login'); return; }
    const items = Object.entries(selectedQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([ttId, qty]) => ({ ticketTypeId: parseInt(ttId), quantity: qty }));
    if (items.length === 0) return;
    navigate(`/checkout/${event.id}`, { state: { items, event } });
  };

  return (
    <div className={styles.page}>
      {/* Hero Image */}
      <div className={styles.hero}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className={styles.heroImage} />
        ) : (
          <div className={styles.heroPlaceholder} aria-hidden="true">
            <span className={styles.heroCatIcon}>{getCatIcon(event.category)}</span>
          </div>
        )}
        <div className={styles.heroOverlay} aria-hidden="true" />
      </div>

      <div className={`container ${styles.content}`}>
        <div className={styles.grid}>
          {/* Main content */}
          <article className={styles.main}>
            <div className={styles.tags}>
              <span className={styles.category}>{event.category}</span>
              {event.isOnline && <span className={styles.online}>Online Event</span>}
              <span className={`${styles.status} ${styles[`status_${event.status}`]}`}>
                {event.status}
              </span>
            </div>

            <h1 className={styles.title}>{event.title}</h1>

            <dl className={styles.meta}>
              <div className={styles.metaItem}>
                <dt><span aria-hidden="true">📅</span> <span className="sr-only">Date</span></dt>
                <dd>
                  <time dateTime={event.startDate}>{format(startDate, 'EEEE, MMMM d, yyyy')}</time>
                  <br />
                  <time dateTime={event.startDate}>{format(startDate, 'h:mm a')}</time>
                  {' — '}
                  <time dateTime={event.endDate}>{format(endDate, 'h:mm a')}</time>
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt><span aria-hidden="true">📍</span> <span className="sr-only">Location</span></dt>
                <dd>
                  {event.isOnline ? (
                    <span>Online Event</span>
                  ) : (
                    <>
                      <strong>{event.venueName}</strong>
                      <br />
                      {event.venueAddress}
                      <br />
                      {event.city}, {event.state}
                    </>
                  )}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt><span aria-hidden="true">👤</span> <span className="sr-only">Host</span></dt>
                <dd>Hosted by <strong>{event.hostName}</strong></dd>
              </div>
            </dl>

            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className={styles.sectionTitle}>About This Event</h2>
              <p className={styles.description}>{event.description}</p>
            </section>
          </article>

          {/* Ticket sidebar */}
          <aside className={styles.sidebar} aria-label="Ticket selection">
            <div className={styles.ticketBox}>
              <h2 className={styles.ticketTitle}>Select Tickets</h2>

              {event.status !== 'published' ? (
                <p className={styles.unavailable}>Tickets are not currently available.</p>
              ) : event.ticketTypes?.length === 0 ? (
                <p className={styles.unavailable}>No tickets available yet.</p>
              ) : (
                <>
                  <ul className={styles.ticketList} role="list">
                    {event.ticketTypes?.map((tt) => (
                      <TicketTypeRow
                        key={tt.id}
                        ticketType={tt}
                        quantity={selectedQuantities[tt.id] || 0}
                        onChange={(qty) => handleQuantityChange(tt.id, qty)}
                      />
                    ))}
                  </ul>

                  {totalSelected > 0 && (
                    <div className={styles.total}>
                      <span>Total ({totalSelected} ticket{totalSelected !== 1 ? 's' : ''})</span>
                      <strong>${totalPrice.toFixed(2)}</strong>
                    </div>
                  )}

                  <Button
                    onClick={handleCheckout}
                    fullWidth
                    size="lg"
                    disabled={totalSelected === 0}
                    aria-disabled={totalSelected === 0}
                  >
                    {totalSelected === 0 ? 'Select Tickets' : 'Checkout →'}
                  </Button>

                  {!user && (
                    <p className={styles.loginHint}>
                      <Link to="/login">Log in</Link> to purchase tickets
                    </p>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function TicketTypeRow({ ticketType, quantity, onChange }: {
  ticketType: TicketType;
  quantity: number;
  onChange: (qty: number) => void;
}) {
  const available = ticketType.quantity - ticketType.quantitySold;
  const isSoldOut = available <= 0;

  return (
    <li className={styles.ticketRow}>
      <div className={styles.ticketInfo}>
        <strong className={styles.ticketName}>{ticketType.name}</strong>
        {ticketType.description && (
          <p className={styles.ticketDesc}>{ticketType.description}</p>
        )}
        <span className={styles.ticketAvail}>
          {isSoldOut ? 'Sold out' : `${available} left`}
        </span>
      </div>
      <div className={styles.ticketRight}>
        <span className={styles.ticketPrice}>
          {ticketType.price === 0 ? 'Free' : `$${ticketType.price.toFixed(2)}`}
        </span>
        {!isSoldOut && (
          <div className={styles.qtyControl}>
            <button
              onClick={() => onChange(Math.max(0, quantity - 1))}
              disabled={quantity === 0}
              aria-label={`Decrease ${ticketType.name} quantity`}
              className={styles.qtyBtn}
            >−</button>
            <span aria-live="polite" aria-label={`${quantity} ${ticketType.name} tickets`}>
              {quantity}
            </span>
            <button
              onClick={() => onChange(Math.min(ticketType.maxPerOrder, available, quantity + 1))}
              disabled={quantity >= Math.min(ticketType.maxPerOrder, available)}
              aria-label={`Increase ${ticketType.name} quantity`}
              className={styles.qtyBtn}
            >+</button>
          </div>
        )}
      </div>
    </li>
  );
}

function getCatIcon(cat: string): string {
  const icons: Record<string, string> = {
    music: '🎵', sports: '⚽', arts: '🎨', food: '🍔',
    business: '💼', technology: '💻', education: '📚', other: '🎉',
  };
  return icons[cat] || '🎉';
}
