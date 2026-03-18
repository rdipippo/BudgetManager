import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi, type Event } from '../../services/api';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import styles from './Host.module.css';

export default function HostDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    eventsApi.getMyEvents()
      .then(({ data }) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? events : events.filter((e) => e.status === filter);

  const stats = {
    total: events.length,
    published: events.filter((e) => e.status === 'published').length,
    totalTicketsSold: events.reduce((s, e) => s + (e.ticketsSold || 0), 0),
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Host Dashboard</h1>
          <Button as={Link} to="/host/events/new" leftIcon="+" aria-label="Create new event">
            New Event
          </Button>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid} role="list" aria-label="Dashboard statistics">
          <div className={styles.stat} role="listitem">
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Total Events</span>
          </div>
          <div className={styles.stat} role="listitem">
            <span className={styles.statValue}>{stats.published}</span>
            <span className={styles.statLabel}>Published</span>
          </div>
          <div className={styles.stat} role="listitem">
            <span className={styles.statValue}>{stats.totalTicketsSold}</span>
            <span className={styles.statLabel}>Tickets Sold</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Filter events by status">
          {['all', 'draft', 'published', 'cancelled', 'completed'].map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={filter === s}
              onClick={() => setFilter(s)}
              className={`${styles.tab} ${filter === s ? styles.tabActive : ''}`}
            >
              {s === 'all' ? 'All Events' : s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingWrap}><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p aria-hidden="true">🎪</p>
            <p>No events found. <Link to="/host/events/new">Create your first event →</Link></p>
          </div>
        ) : (
          <ul className={styles.eventList} role="list">
            {filtered.map((event) => (
              <HostEventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HostEventRow({ event }: { event: Event }) {
  const soldPct = event.totalTickets ? Math.round((event.ticketsSold || 0) / event.totalTickets * 100) : 0;

  return (
    <li className={styles.eventRow}>
      <div className={styles.eventRowMain}>
        <div className={styles.eventRowInfo}>
          <strong className={styles.eventRowTitle}>{event.title}</strong>
          <p className={styles.eventRowDate}>
            {new Date(event.startDate).toLocaleDateString()} · {event.venueName}
          </p>
          <span className={`${styles.badge} ${styles[`badge_${event.status}`]}`}>{event.status}</span>
        </div>

        <div className={styles.eventRowStats}>
          <div className={styles.progress} aria-label={`${soldPct}% sold`}>
            <div className={styles.progressBar} style={{ width: `${soldPct}%` }} />
          </div>
          <p className={styles.soldText}>
            {event.ticketsSold || 0} / {event.totalTickets || 0} sold ({soldPct}%)
          </p>
        </div>

        <div className={styles.eventRowActions}>
          <Link to={`/events/${event.id}`} className={styles.actionLink} aria-label={`View ${event.title}`}>View</Link>
          <Link to={`/host/events/${event.id}/edit`} className={styles.actionLink}>Edit</Link>
          <Link to={`/host/events/${event.id}/attendees`} className={styles.actionLink}>Attendees</Link>
          {event.status === 'published' && (
            <Link to={`/host/events/${event.id}/check-in`} className={styles.actionLink}>Check-in</Link>
          )}
        </div>
      </div>
    </li>
  );
}
