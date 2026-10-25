import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import "./AdminCharts.scss";

/* ============================================================================
   ADMIN CHARTS — dependency-free SVG charts

   The project has no chart library, so these small components draw the
   dashboard charts directly in SVG (no new dependency):
   - <Sparkline>       tiny trend line for KPI cards
   - <AdminBarChart>   grouped bars with axes, legend, hover tooltip
   - <AdminAreaChart>  lines + soft area fill, crosshair tooltip

   Series colors were validated for colour-vision deficiency separation
   (navy #25588F vs gold #C08F35). Every chart also renders a visually
   hidden data table for screen readers.
============================================================================ */

export const CHART_NAVY = "#25588F";
export const CHART_GOLD = "#C08F35";

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

/* ---------- helpers ---------- */

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    setWidth(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth((current) => (Math.abs(current - next) > 0.5 ? next : current));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exponent = Math.floor(Math.log10(raw));
  const base = 10 ** exponent;
  const fraction = raw / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * base;
}

/** Round, human-friendly gridlines: 0, step, 2·step … covering the data max. */
function niceTicks(dataMax: number): number[] {
  const step = niceStep(Math.max(dataMax, 1) / 4);
  const ticks = [0];
  while (ticks[ticks.length - 1] < dataMax) ticks.push(ticks.length * step);
  if (ticks.length < 2) ticks.push(step);
  return ticks;
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Indices of x labels to show so they never collide. */
function labelIndices(count: number, plotWidth: number, minGap = 64): number[] {
  if (count <= 0) return [];
  const maxLabels = Math.max(2, Math.floor(plotWidth / minGap));
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const result: number[] = [];
  for (let i = 0; i < count; i += step) result.push(i);
  if (result[result.length - 1] !== count - 1) {
    if (count - 1 - result[result.length - 1] < step / 2) result.pop();
    result.push(count - 1);
  }
  return result;
}

/* ---------- legend ---------- */

export function ChartLegend({ series }: { series: Pick<ChartSeries, "name" | "color">[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="fk-chart-legend" aria-label="Legend">
      {series.map((item) => (
        <li key={item.name}>
          <span className="fk-chart-legend__swatch" style={{ background: item.color }} aria-hidden="true" />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

/* ---------- accessible table ---------- */

function ChartTable({
  caption,
  labels,
  series,
  format,
}: {
  caption: string;
  labels: string[];
  series: ChartSeries[];
  format: (value: number) => string;
}) {
  return (
    <table className="fk-sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          {series.map((s) => (
            <th scope="col" key={s.name}>
              {s.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labels.map((label, index) => (
          <tr key={`${label}-${index}`}>
            <th scope="row">{label}</th>
            {series.map((s) => (
              <td key={s.name}>{format(finite(s.values[index]))}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- tooltip ---------- */

function Tooltip({
  x,
  containerWidth,
  title,
  rows,
}: {
  x: number;
  containerWidth: number;
  title: string;
  rows: { name: string; color: string; value: string }[];
}) {
  const flip = x > containerWidth * 0.6;
  return (
    <div
      className="fk-chart-tooltip"
      style={flip ? { right: containerWidth - x + 12 } : { left: x + 12 }}
      role="presentation"
    >
      <strong>{title}</strong>
      {rows.map((row) => (
        <span key={row.name}>
          <i style={{ background: row.color }} aria-hidden="true" />
          {row.name}
          <b>{row.value}</b>
        </span>
      ))}
    </div>
  );
}

/* ============================================================================
   SPARKLINE
============================================================================ */

export function Sparkline({
  values,
  color = CHART_GOLD,
  className = "fk-kpi__spark",
  label,
}: {
  values: number[];
  color?: string;
  className?: string;
  label?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const width = 100;
  const height = 48;
  const pad = 4;

  const clean = values.map(finite);
  if (clean.length < 2) return null;

  const max = Math.max(...clean);
  const min = Math.min(...clean);
  const span = max - min || 1;

  const points = clean.map((value, index) => {
    const x = pad + (index / (clean.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ============================================================================
   SHARED AXIS FRAME
============================================================================ */

const CHART_HEIGHT = 230;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 48 };

function YAxis({
  ticks,
  scaleY,
  plotWidth,
  format,
}: {
  ticks: number[];
  scaleY: (value: number) => number;
  plotWidth: number;
  format: (value: number) => string;
}) {
  return (
    <g className="fk-chart-axis">
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0, ${scaleY(tick)})`}>
          <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} className={tick === 0 ? "is-baseline" : undefined} />
          <text x={MARGIN.left - 10} dy="0.32em" textAnchor="end">
            {format(tick)}
          </text>
        </g>
      ))}
    </g>
  );
}

interface CartesianProps {
  labels: string[];
  /** Long-form labels for tooltips and the accessible table. */
  fullLabels?: string[];
  series: ChartSeries[];
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
  ariaLabel: string;
  footer?: ReactNode;
}

/* ============================================================================
   BAR CHART (grouped)
============================================================================ */

export function AdminBarChart({
  labels,
  fullLabels = labels,
  series,
  formatValue = (v) => v.toLocaleString(),
  formatAxis = compactNumber,
  ariaLabel,
}: CartesianProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  const ticks = useMemo(
    () => niceTicks(Math.max(0, ...series.flatMap((s) => s.values.map(finite)))),
    [series],
  );
  const max = ticks[ticks.length - 1];
  const scaleY = (value: number) => MARGIN.top + plotHeight - (finite(value) / max) * plotHeight;

  const count = labels.length;
  const band = count > 0 ? plotWidth / count : 0;
  const groupWidth = band * 0.72;
  const gap = series.length > 1 ? Math.min(2, groupWidth * 0.08) : 0;
  const barWidth = Math.max(1, (groupWidth - gap * (series.length - 1)) / Math.max(1, series.length));
  const radius = Math.min(4, barWidth / 2);
  const shown = labelIndices(count, plotWidth);

  return (
    <div className="fk-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={ariaLabel}
          onMouseLeave={() => setHover(null)}
        >
          <YAxis ticks={ticks} scaleY={scaleY} plotWidth={plotWidth} format={formatAxis} />

          {labels.map((_, index) => {
            const groupX = MARGIN.left + index * band + (band - groupWidth) / 2;
            return (
              <g key={index} className={hover !== null && hover !== index ? "is-dimmed" : undefined}>
                {series.map((s, si) => {
                  const value = Math.max(0, finite(s.values[index]));
                  const top = scaleY(value);
                  const h = MARGIN.top + plotHeight - top;
                  const x = groupX + si * (barWidth + gap);
                  if (h <= 0.5) return null;
                  const r = Math.min(radius, h);
                  return (
                    <path
                      key={s.name}
                      fill={s.color}
                      d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barWidth - r} Q${x + barWidth},${top} ${x + barWidth},${top + r} V${top + h} Z`}
                    />
                  );
                })}
                {/* generous hit target */}
                <rect
                  x={MARGIN.left + index * band}
                  y={MARGIN.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHover(index)}
                  onTouchStart={() => setHover(index)}
                />
              </g>
            );
          })}

          <g className="fk-chart-axis fk-chart-axis--x">
            {shown.map((index) => (
              <text key={index} x={MARGIN.left + index * band + band / 2} y={CHART_HEIGHT - 8} textAnchor="middle">
                {labels[index]}
              </text>
            ))}
          </g>
        </svg>
      )}

      {hover !== null && width > 0 && (
        <Tooltip
          x={MARGIN.left + hover * band + band / 2}
          containerWidth={width}
          title={fullLabels[hover] ?? labels[hover]}
          rows={series.map((s) => ({ name: s.name, color: s.color, value: formatValue(finite(s.values[hover])) }))}
        />
      )}

      <ChartTable caption={ariaLabel} labels={fullLabels} series={series} format={formatValue} />
    </div>
  );
}

/* ============================================================================
   AREA / LINE CHART
============================================================================ */

export function AdminAreaChart({
  labels,
  fullLabels = labels,
  series,
  formatValue = (v) => v.toLocaleString(),
  formatAxis = compactNumber,
  ariaLabel,
}: CartesianProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const baseId = useId().replace(/:/g, "");

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const plotHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

  const ticks = useMemo(
    () => niceTicks(Math.max(0, ...series.flatMap((s) => s.values.map(finite)))),
    [series],
  );
  const max = ticks[ticks.length - 1];
  const count = labels.length;

  const scaleX = (index: number) =>
    count <= 1 ? MARGIN.left + plotWidth / 2 : MARGIN.left + (index / (count - 1)) * plotWidth;
  const scaleY = (value: number) => MARGIN.top + plotHeight - (finite(value) / max) * plotHeight;
  const shown = labelIndices(count, plotWidth, 72);

  const onMove = (clientX: number, rectLeft: number) => {
    if (count === 0) return;
    const x = clientX - rectLeft - MARGIN.left;
    const index = count <= 1 ? 0 : Math.round((x / plotWidth) * (count - 1));
    setHover(Math.min(count - 1, Math.max(0, index)));
  };

  return (
    <div className="fk-chart" ref={ref}>
      {width > 0 && (
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={ariaLabel}
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect().left)}
          onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect().left)}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {series.map((s, si) => (
              <linearGradient key={s.name} id={`${baseId}-g${si}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.26" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          <YAxis ticks={ticks} scaleY={scaleY} plotWidth={plotWidth} format={formatAxis} />

          {series.map((s, si) => {
            const points = labels.map((_, i) => [scaleX(i), scaleY(s.values[i])] as const);
            if (points.length === 0) return null;
            const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
            const baseline = scaleY(0);
            const area = `${line} L${points[points.length - 1][0]},${baseline} L${points[0][0]},${baseline} Z`;
            return (
              <g key={s.name}>
                <path d={area} fill={`url(#${baseId}-g${si})`} />
                <path d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {count <= 12 &&
                  points.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={4} fill={s.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
              </g>
            );
          })}

          {hover !== null && (
            <g className="fk-chart-crosshair" aria-hidden="true">
              <line x1={scaleX(hover)} x2={scaleX(hover)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} />
              {series.map((s) => (
                <circle key={s.name} cx={scaleX(hover)} cy={scaleY(s.values[hover])} r={5} fill={s.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </g>
          )}

          <g className="fk-chart-axis fk-chart-axis--x">
            {shown.map((index) => (
              <text
                key={index}
                x={scaleX(index)}
                y={CHART_HEIGHT - 8}
                textAnchor={index === 0 && count > 1 ? "start" : index === count - 1 && count > 1 ? "end" : "middle"}
              >
                {labels[index]}
              </text>
            ))}
          </g>
        </svg>
      )}

      {hover !== null && width > 0 && (
        <Tooltip
          x={scaleX(hover)}
          containerWidth={width}
          title={fullLabels[hover] ?? labels[hover]}
          rows={series.map((s) => ({ name: s.name, color: s.color, value: formatValue(finite(s.values[hover])) }))}
        />
      )}

      <ChartTable caption={ariaLabel} labels={fullLabels} series={series} format={formatValue} />
    </div>
  );
}
