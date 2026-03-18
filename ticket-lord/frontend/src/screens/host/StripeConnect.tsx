import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paymentsApi } from '../../services/api';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import Spinner from '../../components/Spinner';
import styles from './Host.module.css';

export default function StripeConnect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const isReturn = window.location.pathname.includes('stripe-return');

  useEffect(() => {
    if (isReturn) {
      paymentsApi.getConnectStatus()
        .then(({ data }) => setStatus(data.connected ? 'success' : 'error'))
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [isReturn]);

  if (status === 'loading') return <Spinner fullPage />;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.connectResult}>
          {status === 'success' ? (
            <>
              <Alert type="success" title="Stripe Connected!" message="Your account is ready to receive payments from ticket sales." />
              <Button onClick={() => navigate('/profile')} style={{ marginTop: '1rem' }}>
                Go to Profile
              </Button>
            </>
          ) : (
            <>
              <Alert type="error" title="Connection Incomplete" message="Your Stripe account setup was not completed. Please try again." />
              <Button onClick={() => navigate('/profile')} variant="outline" style={{ marginTop: '1rem' }}>
                Back to Profile
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
