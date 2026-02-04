import React from 'react';

export interface BarChartData {
  label: string;
  values: {
    value: number;
    color: string;
    label: string;
  }[];
}

interface BarChartProps {
  data: BarChartData[];
  height?: number;
  barWidth?: number;
  gap?: number;
  showValues?: boolean;
  formatValue?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 300,
  barWidth = 40,
  gap = 20,
  showValues = true,
  formatValue = (v) => v.toLocaleString(),
}) => {
  if (data.length === 0) {
    return (
      <div className="bar-chart-empty" style={{ height }}>
        <p>No data</p>
      </div>
    );
  }

  // Sanitize values - ensure all are valid numbers
  const sanitizedData = data.map((group) => ({
    ...group,
    values: group.values.map((v) => ({
      ...v,
      value: isNaN(v.value) || v.value === null || v.value === undefined ? 0 : v.value,
    })),
  }));

  // Find the maximum value for scaling
  const maxValue = Math.max(
    ...sanitizedData.flatMap((d) => d.values.map((v) => Math.abs(v.value))),
    1
  );

  // Calculate dimensions
  const barsPerGroup = sanitizedData[0]?.values.length || 0;
  const groupWidth = barsPerGroup * barWidth + (barsPerGroup - 1) * 5;
  const chartWidth = sanitizedData.length * groupWidth + (sanitizedData.length - 1) * gap + 60;
  const chartHeight = height;
  const barAreaHeight = chartHeight - 60; // Leave space for labels

  return (
    <div className="bar-chart-container">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        width="100%"
        height={chartHeight}
        className="bar-chart"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = 20 + barAreaHeight * (1 - ratio);
          const value = maxValue * ratio;
          return (
            <g key={ratio}>
              <line
                x1={50}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="4,4"
                opacity={0.5}
              />
              <text
                x={45}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize="10"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {sanitizedData.map((group, groupIndex) => {
          const groupX = 60 + groupIndex * (groupWidth + gap);

          return (
            <g key={groupIndex}>
              {group.values.map((bar, barIndex) => {
                const barHeight = (Math.abs(bar.value) / maxValue) * barAreaHeight;
                const barX = groupX + barIndex * (barWidth + 5);
                const barY = 20 + barAreaHeight - barHeight;

                return (
                  <g key={barIndex}>
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      fill={bar.color}
                      rx={3}
                      ry={3}
                    />
                    {showValues && bar.value > 0 && (
                      <text
                        x={barX + barWidth / 2}
                        y={barY - 5}
                        textAnchor="middle"
                        fill="var(--color-text-secondary)"
                        fontSize="9"
                      >
                        {formatValue(bar.value)}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* X-axis label */}
              <text
                x={groupX + groupWidth / 2}
                y={chartHeight - 10}
                textAnchor="middle"
                fill="var(--color-text)"
                fontSize="11"
              >
                {group.label}
              </text>
            </g>
          );
        })}

        {/* X-axis line */}
        <line
          x1={50}
          y1={20 + barAreaHeight}
          x2={chartWidth - 10}
          y2={20 + barAreaHeight}
          stroke="var(--color-border)"
        />
      </svg>

      {/* Legend */}
      {sanitizedData[0] && (
        <div className="bar-chart-legend">
          {sanitizedData[0].values.map((bar, index) => (
            <div key={index} className="bar-chart-legend-item">
              <div
                className="bar-chart-legend-color"
                style={{ backgroundColor: bar.color }}
              />
              <span>{bar.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
