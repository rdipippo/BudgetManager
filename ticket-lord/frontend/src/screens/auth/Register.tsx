import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Alert from '../../components/Alert';
import styles from './Auth.module.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'attendee' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.register(form);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand} aria-hidden="true">✉️</div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We've sent a verification link to <strong>{form.email}</strong>.
            Click it to activate your account.
          </p>
          <Button onClick={() => navigate('/login')} fullWidth>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand} aria-hidden="true">🎟</div>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Join Ticket Lord today — it's free</p>

        {error && <Alert type="error" message={error} onDismiss={() => setError('')} />}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            autoComplete="name"
            placeholder="Jane Smith"
            minLength={2}
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
            hint="Must include uppercase letter and number"
            minLength={8}
          />

          <div className={styles.roleSelect}>
            <label htmlFor="role" className={styles.roleLabel}>I want to</label>
            <div className={styles.roleOptions} role="group" aria-labelledby="role-label">
              <label className={`${styles.roleOption} ${form.role === 'attendee' ? styles.roleSelected : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="attendee"
                  checked={form.role === 'attendee'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span aria-hidden="true">🎫</span> Buy Tickets
              </label>
              <label className={`${styles.roleOption} ${form.role === 'host' ? styles.roleSelected : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="host"
                  checked={form.role === 'host'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span aria-hidden="true">🎪</span> Host Events
              </label>
            </div>
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className={styles.terms}>
          By signing up you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener">Terms of Service</a> and{' '}
          <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>
        </p>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
