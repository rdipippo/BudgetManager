import React from 'react';

interface AlertProps {
  type: 'error' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const AlertIcon: React.FC<{ type: AlertProps['type'] }> = ({ type }) => {
  if (type === 'error') {
    return (
      <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }

  if (type === 'success') {
    return (
      <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  return (
    <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
};

export const Alert: React.FC<AlertProps> = ({ type, children, className = '' }) => {
  return (
    <div className={`alert alert-${type} ${className}`}>
      <AlertIcon type={type} />
      <div className="alert-content">{children}</div>
    </div>
  );
};
