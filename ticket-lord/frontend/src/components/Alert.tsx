import styles from './Alert.module.css';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export default function Alert({ type, title, message, onDismiss }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[type]}`} role="alert" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">{icons[type]}</span>
      <div className={styles.content}>
        {title && <strong className={styles.title}>{title}</strong>}
        <p className={styles.message}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={styles.dismiss}
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}
    </div>
  );
}
