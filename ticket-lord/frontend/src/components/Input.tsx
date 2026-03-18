import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={`${styles.field} ${className || ''}`}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {props.required && <span className={styles.required} aria-hidden="true"> *</span>}
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.hasError : ''}`}
        aria-invalid={!!error}
        aria-describedby={[error ? errorId : '', hint ? hintId : ''].filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {hint && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
