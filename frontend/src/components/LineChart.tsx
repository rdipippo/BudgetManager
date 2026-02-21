import React, { useState, useCallback } from 'react';

export interface LineChartDataPoint {
  date: string;
  value: number | null;
}

export interface LineChartSeries {
  label: string;
  color: string;
  data: LineChartDataPoint[];
}

interface TooltipState {
  x: number;
  dateIndex: number;
}

interface LineChartProps {
  series: LineChartSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  showLegend?: boolean;
}

const SVG_WIDTH = 800;
const MARGIN = { top: 20, right: 20, bottom: 50, left: 80 };

export const LineChart: React.FC<LineChartProps> = ({
  series,
  height = 350,
  formatValue = (v) => v.toLocaleString(),
  showLegend = true,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const chartWidth = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const chartHeight = height - MARGIN.top - MARGIN.bottom;

  // Collect all unique dates across all series, sorted
  const allDates = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.date)))
  ).sort();

  const hasData =
    series.length > 0 && allDates.length > 0 && series.some((s) => s.data.some((d) => d.value !== null));

  if (!hasData) {
    return (
      <div className="bar-chart-empty" style={{ height }}>
        <p>No data</p>
      </div>
    );
  }

  // Find value range
  const allValues = series
    .flatMap((s) => s.data.map((d) => d.value))
    .filter((v): v is number => v !== null);
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const spread = rawMax - rawMin || Math.abs(rawMax) * 0.1 || 100;
  const yMin = rawMin - spread * 0.1;
  const yMax = rawMax + spread * 0.1;

  const xScale = (dateIndex: number): number =>
    MARGIN.left + (dateIndex / Math.max(allDates.length - 1, 1)) * chartWidth;

  const yScale = (value: number): number =>
    MARGIN.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

  // Build SVG path for a series
  const buildPath = (data: LineChartDataPoint[]): string => {
    const dateIndexMap = new Map(allDates.map((d, i) => [d, i]));
    const points = data
      .filter((d) => d.value !== null)
      .map((d) => ({ x: xScale(dateIndexMap.get(d.date)!), y: yScale(d.value!) }));
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  };

  // Y-axis ticks
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (i / yTickCount) * (yMax - yMin));

  // X-axis labels (limit to avoid crowding)
  const maxXLabels = 8;
  const xLabelStep = Math.max(1, Math.ceil(allDates.length / maxXLabels));
  const xLabelIndices = allDates
    .map((_, i) => i)
    .filter((i) => i % xLabelStep === 0 || i === allDates.length - 1);

  const formatDateLabel = (date: string): string => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
      const relX = svgX - MARGIN.left;
      if (relX < 0 || relX > chartWidth) {
        setTooltip(null);
        return;
      }
      const idx = Math.round((relX / chartWidth) * (allDates.length - 1));
      setTooltip({ x: xScale(idx), dateIndex: idx });
    },
    [allDates.length, chartWidth]
  );

  // Tooltip values
  const tooltipDate = tooltip !== null ? allDates[tooltip.dateIndex] : null;
  const tooltipValues =
    tooltipDate !== null
      ? series.map((s) => ({
          label: s.label,
          color: s.color,
          value: s.data.find((d) => d.date === tooltipDate)?.value ?? null,
        }))
      : [];

  // Tooltip positioning: flip left if near right edge
  const tooltipLeftPct =
    tooltip !== null ? ((tooltip.x / SVG_WIDTH) * 100).toFixed(1) : '0';
  const flipLeft = tooltip !== null && tooltip.x / SVG_WIDTH > 0.65;

  return (
    <div className="line-chart-container">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        {/* Y-axis gridlines */}
        {yTicks.map((value, i) => {
          const y = yScale(value);
          return (
            <g key={i}>
              <line
                x1={MARGIN.left}
                y1={y}
                x2={SVG_WIDTH - MARGIN.right}
                y2={y}
                stroke="var(--color-border)"
                strokeDasharray="4,4"
                opacity={0.5}
              />
              <text
                x={MARGIN.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--color-text-secondary)"
                fontSize="11"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {/* X-axis line */}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + chartHeight}
          x2={SVG_WIDTH - MARGIN.right}
          y2={MARGIN.top + chartHeight}
          stroke="var(--color-border)"
        />

        {/* X-axis labels */}
        {xLabelIndices.map((idx) => (
          <text
            key={idx}
            x={xScale(idx)}
            y={height - 12}
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize="11"
          >
            {formatDateLabel(allDates[idx])}
          </text>
        ))}

        {/* Series lines and dots */}
        {series.map((s, si) => {
          const dateIndexMap = new Map(allDates.map((d, i) => [d, i]));
          return (
            <g key={si}>
              <path
                d={buildPath(s.data)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.data
                .filter((d) => d.value !== null)
                .map((d, i) => (
                  <circle
                    key={i}
                    cx={xScale(dateIndexMap.get(d.date)!)}
                    cy={yScale(d.value!)}
                    r={allDates.length > 60 ? 0 : 3}
                    fill={s.color}
                  />
                ))}
            </g>
          );
        })}

        {/* Tooltip vertical line and highlight dots */}
        {tooltip !== null && (
          <>
            <line
              x1={tooltip.x}
              y1={MARGIN.top}
              x2={tooltip.x}
              y2={MARGIN.top + chartHeight}
              stroke="var(--color-text-secondary)"
              strokeWidth={1}
              strokeDasharray="4,2"
              opacity={0.6}
            />
            {tooltipValues.map(
              (v, i) =>
                v.value !== null && (
                  <circle
                    key={i}
                    cx={tooltip.x}
                    cy={yScale(v.value)}
                    r={5}
                    fill={v.color}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                )
            )}
          </>
        )}
      </svg>

      {/* Tooltip box */}
      {tooltip !== null && tooltipDate !== null && (
        <div
          className="line-chart-tooltip"
          style={{
            left: flipLeft ? undefined : `${tooltipLeftPct}%`,
            right: flipLeft ? `${(100 - parseFloat(tooltipLeftPct)).toFixed(1)}%` : undefined,
            transform: flipLeft ? 'none' : 'translateX(-50%)',
          }}
        >
          <div className="line-chart-tooltip-date">
            {new Date(tooltipDate + 'T00:00:00').toLocaleDateString()}
          </div>
          {tooltipValues.map((v, i) => (
            <div key={i} className="line-chart-tooltip-row">
              <span className="line-chart-tooltip-dot" style={{ backgroundColor: v.color }} />
              <span>
                {v.label}: {v.value !== null ? formatValue(v.value) : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <div className="bar-chart-legend">
          {series.map((s, i) => (
            <div key={i} className="bar-chart-legend-item">
              <div className="bar-chart-legend-color" style={{ backgroundColor: s.color }} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
