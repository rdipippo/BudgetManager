import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
  label?: string;
}

export default function Spinner({ size = 'md', fullPage, label = 'Loading...' }: SpinnerProps) {
  const spinner = (
    <div className={`${styles.spinner} ${styles[size]}`} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className={styles.fullPage}>
        {spinner}
      </div>
    );
  }

  return spinner;
}
