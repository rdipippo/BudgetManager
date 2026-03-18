import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { eventsApi } from '../../services/api';
import Spinner from '../../components/Spinner';
import styles from './Host.module.css';

interface Attendee {
  ticket_number: string;
  holder_name: string;
  holder_email: string;
  ticket_type_name: string;
  status: string;
  checked_in_at: string | null;
  created_at: string;
}

export default function EventAttendees() {
  const { id } = useParams<{ id: string }>();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    eventsApi.getAttendees(parseInt(id))
      .then(({ data }) => setAttendees(data))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = search
    ? attendees.filter((a) =>
        a.holder_name.toLowerCase().includes(search.toLowerCase()) ||
        a.holder_email.toLowerCase().includes(search.toLowerCase()) ||
        a.ticket_number.toLowerCase().includes(search.toLowerCase())
      )
    : attendees;

  const checkedIn = attendees.filter((a) => a.status === 'used').length;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.header}>
          <h1 className={styles.title}>Attendees</h1>
          <Link to={`/host/events/${id}/check-in`} className={styles.checkInBtn}>
            Open Check-in Scanner
          </Link>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{attendees.length}</span>
            <span className={styles.statLabel}>Total Tickets</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{checkedIn}</span>
            <span className={styles.statLabel}>Checked In</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{attendees.length - checkedIn}</span>
            <span className={styles.statLabel}>Remaining</span>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <label htmlFor="search" className="sr-only">Search attendees</label>
          <input
            id="search"
            type="search"
            placeholder="Search by name, email, or ticket number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            aria-label="Search attendees"
          />
        </div>

        {loading ? (
          <Spinner size="lg" />
        ) : (
          <div className={styles.tableWrap} role="region" aria-label="Attendee list">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Ticket #</th>
                  <th scope="col">Type</th>
                  <th scope="col">Status</th>
                  <th scope="col">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.noResults}>No attendees found</td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr key={a.ticket_number}>
                      <td>{a.holder_name}</td>
                      <td>{a.holder_email}</td>
                      <td><code>{a.ticket_number}</code></td>
                      <td>{a.ticket_type_name}</td>
                      <td>
                        <span className={`${styles.badge} ${styles[`badge_${a.status}`]}`}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {a.checked_in_at
                          ? format(new Date(a.checked_in_at), 'h:mm a')
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
