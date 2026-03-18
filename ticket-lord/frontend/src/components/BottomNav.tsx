import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './BottomNav.module.css';

export default function BottomNav() {
  const { user } = useAuth();

  return (
    <nav className={styles.nav} aria-label="Mobile navigation">
      <NavLink to="/" end className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
        <span className={styles.icon} aria-hidden="true">🏠</span>
        <span className={styles.label}>Home</span>
      </NavLink>

      {user ? (
        <>
          <NavLink to="/my-tickets" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
            <span className={styles.icon} aria-hidden="true">🎫</span>
            <span className={styles.label}>Tickets</span>
          </NavLink>

          {(user.role === 'host' || user.role === 'admin') && (
            <NavLink to="/host" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon} aria-hidden="true">📋</span>
              <span className={styles.label}>Host</span>
            </NavLink>
          )}

          <NavLink to="/profile" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
            <span className={styles.icon} aria-hidden="true">👤</span>
            <span className={styles.label}>Profile</span>
          </NavLink>
        </>
      ) : (
        <NavLink to="/login" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <span className={styles.icon} aria-hidden="true">👤</span>
          <span className={styles.label}>Log in</span>
        </NavLink>
      )}
    </nav>
  );
}
