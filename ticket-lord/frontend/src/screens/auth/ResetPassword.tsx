import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import styles from './Auth.module.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({ token, password });
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <Alert type="error" message="Invalid reset link. Please request a new one." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">🔒</div>
        <h1 className={styles.title}>New Password</h1>
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            hint="Min 8 chars, uppercase letter, and number"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Button type="submit" fullWidth loading={loading}>Reset Password</Button>
        </form>
      </div>
    </div>
  );
}
