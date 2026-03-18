import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi, type Event, type TicketType, type TicketTypeData } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import Spinner from '../../components/Spinner';
import styles from './Host.module.css';

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [newTicket, setNewTicket] = useState<TicketTypeData>({
    name: '', price: 0, quantity: 100, maxPerOrder: 10,
  });

  useEffect(() => {
    if (!id) return;
    eventsApi.getById(parseInt(id))
      .then(({ data }) => setEvent(data))
      .catch(() => navigate('/host'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handlePublish = async () => {
    if (!event || !id) return;
    setSaving(true);
    try {
      const { data } = await eventsApi.update(parseInt(id), { status: 'published' });
      setEvent(data);
      setSuccess('Event published successfully!');
    } catch {
      setError('Failed to publish event');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTicketType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !event) return;
    setSaving(true);
    try {
      await eventsApi.addTicketType(parseInt(id), newTicket);
      const { data } = await eventsApi.getById(parseInt(id));
      setEvent(data);
      setShowAddTicket(false);
      setNewTicket({ name: '', price: 0, quantity: 100, maxPerOrder: 10 });
      setSuccess('Ticket type added!');
    } catch {
      setError('Failed to add ticket type');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicketType = async (ttId: number) => {
    if (!id) return;
    if (!confirm('Remove this ticket type?')) return;
    try {
      await eventsApi.deleteTicketType(parseInt(id), ttId);
      setEvent((e) => e ? { ...e, ticketTypes: e.ticketTypes?.filter((t) => t.id !== ttId) } : e);
    } catch {
      setError('Failed to remove ticket type');
    }
  };

  if (loading) return <Spinner fullPage />;
  if (!event) return null;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{event.title}</h1>
            <span className={`${styles.badge} ${styles[`badge_${event.status}`]}`}>{event.status}</span>
          </div>
          {event.status === 'draft' && (
            <Button onClick={handlePublish} loading={saving}>Publish Event</Button>
          )}
        </div>

        {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}
        {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

        {/* Ticket Types */}
        <section className={styles.formSection} aria-labelledby="tickets-heading">
          <div className={styles.sectionHeader}>
            <h2 id="tickets-heading" className={styles.sectionTitle}>Ticket Types</h2>
            <Button size="sm" onClick={() => setShowAddTicket(true)} leftIcon="+">
              Add Ticket Type
            </Button>
          </div>

          {event.ticketTypes?.length === 0 ? (
            <p className={styles.emptyText}>No ticket types yet. Add one to start selling.</p>
          ) : (
            <ul className={styles.ticketTypeList} role="list">
              {event.ticketTypes?.map((tt) => (
                <TicketTypeRow key={tt.id} tt={tt} onDelete={() => handleDeleteTicketType(tt.id)} />
              ))}
            </ul>
          )}

          {showAddTicket && (
            <form onSubmit={handleAddTicketType} className={styles.addTicketForm}>
              <h3 className={styles.formSubtitle}>New Ticket Type</h3>
              <div className={styles.twoCol}>
                <Input
                  label="Name"
                  value={newTicket.name}
                  onChange={(e) => setNewTicket((t) => ({ ...t, name: e.target.value }))}
                  required
                  placeholder="General Admission"
                />
                <Input
                  label="Price ($)"
                  type="number"
                  value={String(newTicket.price)}
                  onChange={(e) => setNewTicket((t) => ({ ...t, price: parseFloat(e.target.value) }))}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className={styles.twoCol}>
                <Input
                  label="Quantity"
                  type="number"
                  value={String(newTicket.quantity)}
                  onChange={(e) => setNewTicket((t) => ({ ...t, quantity: parseInt(e.target.value) }))}
                  required
                  min="1"
                />
                <Input
                  label="Max Per Order"
                  type="number"
                  value={String(newTicket.maxPerOrder || 10)}
                  onChange={(e) => setNewTicket((t) => ({ ...t, maxPerOrder: parseInt(e.target.value) }))}
                  min="1"
                  max="20"
                />
              </div>
              <div className={styles.formActions}>
                <Button type="button" variant="ghost" onClick={() => setShowAddTicket(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>Add Ticket Type</Button>
              </div>
            </form>
          )}
        </section>

        <div className={styles.formActions}>
          <Button variant="outline" onClick={() => navigate('/host')}>← Back to Dashboard</Button>
          <Button as="a" href={`/events/${event.id}`} variant="secondary">View Public Page</Button>
        </div>
      </div>
    </div>
  );
}

function TicketTypeRow({ tt, onDelete }: { tt: TicketType; onDelete: () => void }) {
  const available = tt.quantity - tt.quantitySold;
  const soldPct = tt.quantity > 0 ? Math.round(tt.quantitySold / tt.quantity * 100) : 0;

  return (
    <li className={styles.ttRow}>
      <div className={styles.ttInfo}>
        <strong>{tt.name}</strong>
        <span className={styles.ttPrice}>${tt.price.toFixed(2)}</span>
      </div>
      <div className={styles.ttStats}>
        <span>{tt.quantitySold} sold / {tt.quantity} total ({soldPct}%)</span>
        <span className={styles.ttAvail}>{available} remaining</span>
      </div>
      <button
        onClick={onDelete}
        className={styles.deleteBtn}
        aria-label={`Remove ${tt.name} ticket type`}
        disabled={tt.quantitySold > 0}
        title={tt.quantitySold > 0 ? 'Cannot remove ticket type with sales' : ''}
      >
        Remove
      </button>
    </li>
  );
}
