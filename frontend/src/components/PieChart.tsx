import React from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  onSliceClick?: (index: number) => void;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 300, onSliceClick }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="pie-chart-empty" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size}>
          <circle cx="50" cy="50" r="40" fill="var(--color-border)" />
        </svg>
        <p>No data</p>
      </div>
    );
  }

  const radius = 40;
  const centerX = 50;
  const centerY = 50;

  let currentAngle = -90; // Start from top

  const slices = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const handleClick = () => {
      if (onSliceClick) {
        onSliceClick(index);
      }
    };

    // For very small slices or single item, draw a circle
    if (data.length === 1 || percentage > 0.999) {
      return (
        <circle
          key={index}
          cx={centerX}
          cy={centerY}
          r={radius}
          fill={item.color}
          onClick={handleClick}
          style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
        />
      );
    }

    // Skip very small slices
    if (percentage < 0.001) {
      return null;
    }

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return (
      <path
        key={index}
        d={pathData}
        fill={item.color}
        stroke="var(--color-surface)"
        strokeWidth="0.5"
        onClick={handleClick}
        style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
      />
    );
  });

  return (
    <div className="pie-chart-container">
      <svg viewBox="0 0 100 100" width={size} height={size} className="pie-chart">
        {slices}
      </svg>
    </div>
  );
};
