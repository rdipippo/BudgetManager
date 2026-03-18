import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';
import styles from './Auth.module.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Missing verification token'); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        const msg = err?.response?.data?.error || 'Verification failed';
        setMessage(msg);
        setStatus('error');
      });
  }, [token]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.brand} aria-hidden="true">✉️</div>
            <h1 className={styles.title}>Verifying...</h1>
            <Spinner size="lg" label="Verifying your email..." />
          </>
        )}
        {status === 'success' && (
          <>
            <div className={styles.brand} aria-hidden="true">✅</div>
            <h1 className={styles.title}>Email Verified!</h1>
            <p className={styles.subtitle}>Your account is ready. Welcome to Ticket Lord!</p>
            <Link to="/login" className={styles.switchText}>Sign in to your account →</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <Alert type="error" title="Verification Failed" message={message || 'Invalid or expired token'} />
            <p className={styles.switchText}>
              <Link to="/login">← Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
