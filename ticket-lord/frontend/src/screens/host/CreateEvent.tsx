import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import styles from './Host.module.css';

const CATEGORIES = ['music', 'sports', 'arts', 'food', 'business', 'technology', 'education', 'other'];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'other',
    venueName: '',
    venueAddress: '',
    city: '',
    state: '',
    country: 'US',
    startDate: '',
    endDate: '',
    isOnline: false,
    onlineUrl: '',
    maxAttendees: '',
    tags: '',
    status: 'draft' as 'draft' | 'published',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'published') => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await eventsApi.create({
        ...form,
        status,
        maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : undefined,
      });
      navigate(`/host/events/${data.id}/edit`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Create New Event</h1>

        {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

        <form className={styles.eventForm} onSubmit={(e) => handleSubmit(e, 'draft')}>
          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Basic Information</h2>

            <Input
              label="Event Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Amazing Concert 2026"
              minLength={3}
              maxLength={200}
            />

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Description <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={5}
                className={styles.textarea}
                placeholder="Tell attendees what makes this event special..."
                minLength={10}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="category" className={styles.label}>Category</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className={styles.select}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <Input
              label="Tags (comma-separated)"
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="live music, outdoor, family-friendly"
            />
          </section>

          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Date & Time</h2>
            <div className={styles.twoCol}>
              <Input
                label="Start Date & Time"
                type="datetime-local"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
              />
              <Input
                label="End Date & Time"
                type="datetime-local"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </section>

          <section className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Location</h2>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="isOnline"
                checked={form.isOnline}
                onChange={handleChange}
              />
              This is an online event
            </label>

            {form.isOnline ? (
              <Input
                label="Online Event URL"
                type="url"
                name="onlineUrl"
                value={form.onlineUrl}
                onChange={handleChange}
                placeholder="https://zoom.us/j/..."
              />
            ) : (
              <>
                <Input label="Venue Name" name="venueName" value={form.venueName} onChange={handleChange} required={!form.isOnline} placeholder="Madison Square Garden" />
                <Input label="Address" name="venueAddress" value={form.venueAddress} onChange={handleChange} required={!form.isOnline} />
                <div className={styles.threeCol}>
                  <Input label="City" name="city" value={form.city} onChange={handleChange} required={!form.isOnline} />
                  <Input label="State / Province" name="state" value={form.state} onChange={handleChange} required={!form.isOnline} />
                  <Input label="Country" name="country" value={form.country} onChange={handleChange} required={!form.isOnline} />
                </div>
              </>
            )}

            <Input
              label="Max Attendees (optional)"
              type="number"
              name="maxAttendees"
              value={form.maxAttendees}
              onChange={handleChange}
              min="1"
              placeholder="Leave empty for unlimited"
            />
          </section>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/host')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              loading={loading}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              loading={loading}
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, 'published')}
            >
              Publish Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
