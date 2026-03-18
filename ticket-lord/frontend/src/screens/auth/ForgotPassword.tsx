import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import styles from './Auth.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">🔑</div>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your email to receive a reset link</p>

        {sent ? (
          <Alert type="success" message="Check your email for a password reset link." />
        ) : (
          <>
            {error && <Alert type="error" message={error} />}
            <form onSubmit={handleSubmit} className={styles.form}>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
              <Button type="submit" fullWidth loading={loading}>Send Reset Link</Button>
            </form>
          </>
        )}
        <p className={styles.switchText}>
          <Link to="/login">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
