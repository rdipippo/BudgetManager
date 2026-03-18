import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className={styles.header} role="banner">
      <nav className={`${styles.nav} container`} aria-label="Main navigation">
        <Link to="/" className={styles.brand} aria-label="Ticket Lord home">
          <span className={styles.brandIcon} aria-hidden="true">🎟</span>
          <span className={styles.brandName}>Ticket Lord</span>
        </Link>

        <ul className={styles.links} role="list">
          <li><Link to="/">Browse Events</Link></li>
          {user?.role === 'host' || user?.role === 'admin' ? (
            <li><Link to="/host">Host Dashboard</Link></li>
          ) : null}
        </ul>

        <div className={styles.actions}>
          {user ? (
            <>
              <Link to="/my-tickets" className={styles.iconBtn} aria-label="My tickets">
                <span aria-hidden="true">🎫</span>
              </Link>
              <div className={styles.userMenu}>
                <Link to="/profile" className={styles.avatar} aria-label={`Profile: ${user.name}`}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className={styles.avatarImg} />
                  ) : (
                    <span className={styles.avatarInitial}>{user.name[0].toUpperCase()}</span>
                  )}
                </Link>
                <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Log out">
                  Log out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={styles.loginBtn}>Log in</Link>
              <Link to="/register" className={styles.registerBtn}>Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
