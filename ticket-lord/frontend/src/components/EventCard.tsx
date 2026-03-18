import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import type { Event } from '../services/api';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  const startDate = new Date(event.startDate);
  const priceDisplay = event.minPrice === 0
    ? 'Free'
    : event.minPrice
    ? `From $${event.minPrice.toFixed(2)}`
    : 'TBA';

  const isSoldOut = event.totalTickets !== undefined &&
    event.ticketsSold !== undefined &&
    event.ticketsSold >= event.totalTickets;

  return (
    <article className={styles.card}>
      <Link to={`/events/${event.id}`} className={styles.imageLink} tabIndex={-1} aria-hidden="true">
        <div className={styles.imageWrap}>
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className={styles.image}
              loading="lazy"
            />
          ) : (
            <div className={styles.imagePlaceholder} aria-hidden="true">
              <span className={styles.categoryIcon}>{getCategoryIcon(event.category)}</span>
            </div>
          )}
          {isSoldOut && (
            <div className={styles.soldOutBadge} aria-label="Sold out">Sold Out</div>
          )}
        </div>
      </Link>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.category}>{event.category}</span>
          {event.isOnline && <span className={styles.online}>Online</span>}
        </div>

        <h3 className={styles.title}>
          <Link to={`/events/${event.id}`} className={styles.titleLink}>
            {event.title}
          </Link>
        </h3>

        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt className="sr-only">Date</dt>
            <dd className={styles.detailValue}>
              <span aria-hidden="true">📅</span>
              <time dateTime={event.startDate}>
                {format(startDate, 'EEE, MMM d · h:mm a')}
              </time>
            </dd>
          </div>
          <div className={styles.detailRow}>
            <dt className="sr-only">Location</dt>
            <dd className={styles.detailValue}>
              <span aria-hidden="true">📍</span>
              {event.isOnline ? 'Online Event' : `${event.venueName}, ${event.city}`}
            </dd>
          </div>
        </dl>

        <div className={styles.footer}>
          <span className={styles.price} aria-label={`Price: ${priceDisplay}`}>
            {priceDisplay}
          </span>
          <Link
            to={`/events/${event.id}`}
            className={styles.viewBtn}
            aria-label={`View ${event.title}`}
          >
            {isSoldOut ? 'View' : 'Get Tickets'}
          </Link>
        </div>
      </div>
    </article>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    music: '🎵', sports: '⚽', arts: '🎨', food: '🍔',
    business: '💼', technology: '💻', education: '📚', other: '🎉',
  };
  return icons[category] || '🎉';
}
