import React from 'react';
import Spinner from './Spinner';
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  leftIcon,
  children,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        styles.btn,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        className || '',
      ].join(' ')}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" label="Please wait..." />
      ) : leftIcon ? (
        <span className={styles.icon} aria-hidden="true">{leftIcon}</span>
      ) : null}
      {children}
    </button>
  );
}
