import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, paymentsApi } from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import Alert from '../components/Alert';
import styles from './Profile.module.css';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await authApi.updateProfile({ name });
      await refreshUser();
      setMessage('Profile updated successfully');
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleStripeConnect = async () => {
    setConnectLoading(true);
    try {
      const { data } = await paymentsApi.connectStripe();
      window.location.href = data.url;
    } catch {
      alert('Failed to connect Stripe account');
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Profile</h1>

        <div className={styles.grid}>
          {/* Profile form */}
          <section className={styles.card} aria-labelledby="profile-heading">
            <h2 id="profile-heading" className={styles.cardTitle}>Personal Information</h2>

            <div className={styles.avatarSection}>
              <div className={styles.avatar} aria-hidden="true">
                {user?.name[0].toUpperCase()}
              </div>
              <div>
                <p className={styles.userName}>{user?.name}</p>
                <p className={styles.userEmail}>{user?.email}</p>
                <span className={`${styles.roleBadge} ${styles[`role_${user?.role}`]}`}>
                  {user?.role}
                </span>
              </div>
            </div>

            {message && (
              <Alert
                type={message.includes('success') ? 'success' : 'error'}
                message={message}
                onDismiss={() => setMessage('')}
              />
            )}

            <form onSubmit={handleUpdateProfile} className={styles.form}>
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                hint="Email cannot be changed"
                type="email"
              />
              <Button type="submit" loading={saving}>Save Changes</Button>
            </form>
          </section>

          {/* Host settings */}
          {(user?.role === 'host' || user?.role === 'admin') && (
            <section className={styles.card} aria-labelledby="host-heading">
              <h2 id="host-heading" className={styles.cardTitle}>Host Settings</h2>
              <p className={styles.cardDesc}>
                Connect your Stripe account to receive payouts from ticket sales.
              </p>
              {user.stripeConnected ? (
                <Alert type="success" message="Your Stripe account is connected and ready to receive payments." />
              ) : (
                <Button
                  onClick={handleStripeConnect}
                  loading={connectLoading}
                  leftIcon="💳"
                >
                  Connect Stripe Account
                </Button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
