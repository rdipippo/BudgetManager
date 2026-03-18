import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.layout}>
      <Navbar />
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
