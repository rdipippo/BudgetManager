import React from 'react';

interface ProgressBarProps {
  value: number;
  status?: 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  status,
  showLabel = false,
  height = 8,
}) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Auto-determine status if not provided
  const computedStatus = status || (clampedValue >= 100 ? 'danger' : clampedValue >= 80 ? 'warning' : 'success');

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-track" style={{ height }}>
        <div
          className={`progress-bar-fill progress-bar-${computedStatus}`}
          style={{ width: `${Math.min(clampedValue, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="progress-bar-label">{Math.round(value)}%</span>
      )}
    </div>
  );
};
