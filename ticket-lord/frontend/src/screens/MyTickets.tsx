import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ticketsApi, type Ticket } from '../services/api';
import Spinner from '../components/Spinner';
import styles from './MyTickets.module.css';

export default function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    ticketsApi.getMyTickets()
      .then(({ data }) => setTickets(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner fullPage />;

  const upcoming = tickets.filter((t) =>
    t.eventStartDate && new Date(t.eventStartDate) >= new Date()
  );
  const past = tickets.filter((t) =>
    !t.eventStartDate || new Date(t.eventStartDate) < new Date()
  );

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>My Tickets</h1>

        {tickets.length === 0 ? (
          <div className={styles.empty} role="status">
            <p className={styles.emptyIcon} aria-hidden="true">🎫</p>
            <p className={styles.emptyMsg}>You don't have any tickets yet.</p>
            <a href="/" className={styles.browseLink}>Browse Events →</a>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section aria-labelledby="upcoming-heading">
                <h2 id="upcoming-heading" className={styles.sectionTitle}>Upcoming</h2>
                <ul className={styles.list} role="list">
                  {upcoming.map((ticket) => (
                    <TicketItem
                      key={ticket.id}
                      ticket={ticket}
                      expanded={expandedId === ticket.id}
                      onToggle={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
            {past.length > 0 && (
              <section aria-labelledby="past-heading">
                <h2 id="past-heading" className={styles.sectionTitle}>Past Events</h2>
                <ul className={styles.list} role="list">
                  {past.map((ticket) => (
                    <TicketItem
                      key={ticket.id}
                      ticket={ticket}
                      expanded={expandedId === ticket.id}
                      onToggle={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TicketItem({ ticket, expanded, onToggle }: {
  ticket: Ticket;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColor: Record<string, string> = {
    valid: 'var(--color-success)',
    used: 'var(--color-gray-400)',
    cancelled: 'var(--color-error)',
    refunded: 'var(--color-warning)',
  };

  return (
    <li className={styles.ticketCard}>
      <button
        className={styles.ticketHeader}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`ticket-details-${ticket.id}`}
      >
        <div className={styles.ticketMeta}>
          <strong className={styles.eventName}>{ticket.eventTitle}</strong>
          {ticket.eventStartDate && (
            <time className={styles.eventDate} dateTime={ticket.eventStartDate}>
              {format(new Date(ticket.eventStartDate), 'MMM d, yyyy · h:mm a')}
            </time>
          )}
          <span className={styles.ticketType}>{ticket.ticketTypeName}</span>
        </div>
        <div className={styles.ticketRight}>
          <span
            className={styles.status}
            style={{ color: statusColor[ticket.status] || 'inherit' }}
          >
            {ticket.status}
          </span>
          <span className={styles.ticketNum}>#{ticket.ticketNumber}</span>
          <span className={styles.chevron} aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div id={`ticket-details-${ticket.id}`} className={styles.ticketDetails}>
          {ticket.eventVenue && (
            <p className={styles.venue}>📍 {ticket.eventVenue}</p>
          )}
          {ticket.status === 'valid' && ticket.qrCode && (
            <div className={styles.qrWrap}>
              <img
                src={ticket.qrCode}
                alt={`QR code for ticket ${ticket.ticketNumber}`}
                className={styles.qrCode}
                width={180}
                height={180}
              />
              <p className={styles.qrHint}>Show this QR code at the venue entrance</p>
            </div>
          )}
          {ticket.status === 'used' && ticket.checkedInAt && (
            <p className={styles.checkedIn}>
              ✅ Checked in at {format(new Date(ticket.checkedInAt), 'h:mm a, MMM d')}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
