import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { eventsApi } from '../../services/api';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import Input from '../../components/Input';
import styles from './Host.module.css';

interface CheckInResult {
  valid: boolean;
  message: string;
  ticket?: {
    holder_name?: string;
    ticket_type_name?: string;
    ticket_number?: string;
  };
}

export default function CheckInScanner() {
  const { id } = useParams<{ id: string }>();
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !ticketNumber.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await eventsApi.checkIn(parseInt(id), ticketNumber.trim().toUpperCase());
      setResult(data);
      if (data.valid) setTicketNumber('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setResult({ valid: false, message: msg || 'Check-in failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Check-In Scanner</h1>
        <p className={styles.subtitle}>Enter ticket numbers or scan QR codes to check in attendees.</p>

        <div className={styles.scannerWrap}>
          <form onSubmit={handleCheckIn} className={styles.scanForm}>
            <Input
              label="Ticket Number"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value.toUpperCase())}
              placeholder="TL-XXXXXXXXXX"
              required
              autoFocus
              autoComplete="off"
              hint="Enter ticket number or scan QR code"
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Check In
            </Button>
          </form>

          {result && (
            <div className={styles.resultWrap} aria-live="assertive" aria-atomic="true">
              <Alert
                type={result.valid ? 'success' : 'error'}
                title={result.valid ? '✅ Check-in Successful' : '❌ Check-in Failed'}
                message={result.message}
              />
              {result.valid && result.ticket && (
                <div className={styles.attendeeInfo}>
                  <p><strong>Name:</strong> {result.ticket.holder_name || 'N/A'}</p>
                  <p><strong>Ticket Type:</strong> {result.ticket.ticket_type_name || 'N/A'}</p>
                  <p><strong>Ticket #:</strong> {result.ticket.ticket_number}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
