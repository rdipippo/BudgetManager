import { useState, useEffect, useCallback } from 'react';
import { eventsApi, type Event, type EventFilters } from '../services/api';
import EventCard from '../components/EventCard';
import Spinner from '../components/Spinner';
import styles from './Home.module.css';

const CATEGORIES = ['music', 'sports', 'arts', 'food', 'business', 'technology', 'education', 'other'];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<EventFilters>({});

  const fetchEvents = useCallback(async (f: EventFilters, p: number) => {
    setLoading(true);
    try {
      const { data } = await eventsApi.list({ ...f, page: p, limit: 12 });
      setEvents(data.events);
      setTotal(data.total);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(filters, page);
  }, [filters, page, fetchEvents]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const search = (form.elements.namedItem('search') as HTMLInputElement).value;
    setFilters((f) => ({ ...f, search }));
    setPage(1);
  };

  const handleCategory = (cat: string) => {
    setFilters((f) => ({ ...f, category: f.category === cat ? undefined : cat }));
    setPage(1);
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className="container">
          <h1 id="hero-heading" className={styles.heroTitle}>
            Find Your Next <span className={styles.heroAccent}>Experience</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Discover concerts, sports, arts, and more — then buy tickets in seconds.
          </p>
          <form onSubmit={handleSearch} className={styles.searchForm} role="search">
            <label htmlFor="search" className="sr-only">Search events</label>
            <input
              id="search"
              name="search"
              type="search"
              placeholder="Search events, artists, venues..."
              className={styles.searchInput}
              defaultValue={filters.search || ''}
              aria-label="Search events"
            />
            <button type="submit" className={styles.searchBtn} aria-label="Search">
              <span aria-hidden="true">🔍</span>
              <span>Search</span>
            </button>
          </form>
        </div>
      </section>

      <div className="container">
        {/* Category filters */}
        <section aria-labelledby="categories-heading">
          <h2 id="categories-heading" className="sr-only">Filter by category</h2>
          <div className={styles.categories} role="group" aria-label="Event categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`${styles.catBtn} ${filters.category === cat ? styles.catBtnActive : ''}`}
                aria-pressed={filters.category === cat}
              >
                {getCatIcon(cat)} {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Results */}
        <section aria-labelledby="events-heading" aria-live="polite" aria-busy={loading}>
          <div className={styles.resultsHeader}>
            <h2 id="events-heading" className={styles.sectionTitle}>
              {filters.search ? `Results for "${filters.search}"` : 'Upcoming Events'}
            </h2>
            {!loading && (
              <p className={styles.count} aria-live="polite">
                {total} event{total !== 1 ? 's' : ''} found
              </p>
            )}
          </div>

          {loading ? (
            <div className={styles.loadingWrap}>
              <Spinner size="lg" label="Loading events..." />
            </div>
          ) : events.length === 0 ? (
            <div className={styles.empty} role="status">
              <p className={styles.emptyIcon} aria-hidden="true">🎭</p>
              <p>No events found. Try adjusting your filters.</p>
            </div>
          ) : (
            <ul className={styles.grid} role="list" aria-label="Events list">
              {events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <nav aria-label="Pagination" className={styles.pagination}>
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className={styles.pageBtn}
                aria-label="Previous page"
              >
                ← Previous
              </button>
              <span aria-current="page" className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className={styles.pageBtn}
                aria-label="Next page"
              >
                Next →
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

function getCatIcon(cat: string): string {
  const icons: Record<string, string> = {
    music: '🎵', sports: '⚽', arts: '🎨', food: '🍔',
    business: '💼', technology: '💻', education: '📚', other: '🎉',
  };
  return icons[cat] || '🎉';
}
