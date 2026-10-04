import { useId, useMemo, useRef, useState } from "react";
import type { BreakdownItem, ChartSeries } from "../types/mailchimp.types";
import { formatCompact, formatMetric } from "../utils/format";

export const CHART_COLORS = ["#1f5eff", "#12b5a6", "#7c5cff", "#f2a33a", "#e0598b", "#64748b"];

type Format = "number" | "percent" | "currency";

interface AnalyticsChartProps {
  series: ChartSeries[];
  type?: "line" | "area" | "bar";
  height?: number;
  format?: Format;
  title: string;
  showLegend?: boolean;
}

const W = 640;
const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * exp;
}

/** Responsive SVG chart with hover/keyboard tooltip. No chart library needed. */
export function AnalyticsChart({ series, type = "area", height = 220, format = "number", title, showLegend }: AnalyticsChartProps) {
  const gid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const n = labels.length;
  const H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const { max, min } = useMemo(() => {
    const all = series.flatMap((s) => s.points.map((p) => p.value));
    const hi = Math.max(...all, 0);
    const lo = type === "bar" ? 0 : Math.min(...all, hi);
    const floor = lo > hi * 0.6 ? Math.floor(lo * 0.95) : 0;
    return { max: niceMax(hi - floor) + floor, min: floor };
  }, [series, type]);

  if (!n) return <p className="fm-muted">No data for this period.</p>;

  const x = (i: number) => (type === "bar" ? PAD.left + (innerW / n) * (i + 0.5) : PAD.left + (n === 1 ? innerW / 2 : (innerW / (n - 1)) * i));
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min || 1)) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + (max - min) * t);
  const labelEvery = Math.max(1, Math.ceil(n / 7));
  const tickFmt = (v: number) => {
    const n = Number.isInteger(v) ? String(v) : v.toFixed(1);
    return format === "percent" ? `${n}%` : format === "currency" ? `$${formatCompact(v)}` : formatCompact(v);
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < n; i += 1) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setHover(best);
  };

  const summary = series
    .map((s) => {
      const first = s.points[0]?.value ?? 0;
      const last = s.points[s.points.length - 1]?.value ?? 0;
      return `${s.name} went from ${formatMetric(first, format)} to ${formatMetric(last, format)}`;
    })
    .join(". ");

  return (
    <figure className="fm-chart">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}. ${summary}.`}
        tabIndex={0}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onFocus={() => setHover(n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - 1));
          if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? 0) + 1));
        }}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.name} id={`${gid}-g${si}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[si % CHART_COLORS.length]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[si % CHART_COLORS.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="fm-chart__grid" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fm-chart__tick">
              {tickFmt(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={`${l}-${i}`} x={x(i)} y={H - 6} textAnchor="middle" className="fm-chart__tick">
              {l}
            </text>
          ) : null,
        )}

        {type === "bar"
          ? series.map((s, si) => {
              const groupW = (innerW / n) * 0.7;
              const barW = groupW / series.length;
              return s.points.map((p, i) => (
                <rect
                  key={`${s.name}-${i}`}
                  x={x(i) - groupW / 2 + barW * si}
                  y={y(p.value)}
                  width={Math.max(1, barW - 2)}
                  height={Math.max(0, PAD.top + innerH - y(p.value))}
                  rx={3}
                  fill={s.color ?? CHART_COLORS[si % CHART_COLORS.length]}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              ));
            })
          : series.map((s, si) => {
              const color = s.color ?? CHART_COLORS[si % CHART_COLORS.length];
              const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
              return (
                <g key={s.name}>
                  {type === "area" && (
                    <path d={`${d} L${x(n - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`} fill={`url(#${gid}-g${si})`} />
                  )}
                  <path d={d} fill="none" stroke={color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              );
            })}

        {hover !== null && (
          <g pointerEvents="none">
            {type !== "bar" && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="fm-chart__cursor" />}
            {type !== "bar" &&
              series.map((s, si) => (
                <circle key={s.name} cx={x(hover)} cy={y(s.points[hover]?.value ?? 0)} r={4.5} fill="#fff" stroke={s.color ?? CHART_COLORS[si % CHART_COLORS.length]} strokeWidth={2} />
              ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="fm-chart__tip" style={{ left: `${(x(hover) / W) * 100}%` }} aria-live="polite">
          <strong>{labels[hover]}</strong>
          {series.map((s, si) => (
            <span key={s.name}>
              <i style={{ background: s.color ?? CHART_COLORS[si % CHART_COLORS.length] }} />
              {s.name}: {formatMetric(s.points[hover]?.value ?? 0, format)}
            </span>
          ))}
        </div>
      )}
      {(showLegend ?? series.length > 1) && (
        <figcaption className="fm-legend">
          {series.map((s, si) => (
            <span key={s.name}>
              <i style={{ background: s.color ?? CHART_COLORS[si % CHART_COLORS.length] }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

export function Sparkline({ values, color = "#1f5eff", label }: { values: number[]; color?: string; label: string }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const hi = Math.max(...values);
  const lo = Math.min(...values);
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)).toFixed(1)}`);
  return (
    <svg className="fm-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={label}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DonutChart({ items, label, format = "percent" }: { items: BreakdownItem[]; label: string; format?: Format }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="fm-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`${label}: ${items.map((i) => `${i.label} ${formatMetric(i.value, format)}`).join(", ")}`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--fm-line)" strokeWidth="16" />
        {items.map((it, i) => {
          const len = (it.value / total) * c;
          const el = (
            <circle
              key={it.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="fm-donut__value">
          {formatMetric(items[0]?.value ?? 0, format)}
        </text>
        <text x="70" y="84" textAnchor="middle" className="fm-donut__label">
          {items[0]?.label ?? ""}
        </text>
      </svg>
      <ul className="fm-donut__legend">
        {items.map((it, i) => (
          <li key={it.label}>
            <i style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span>{it.label}</span>
            <strong>{formatMetric(it.value, format)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({ items, format = "number", color = "#1f5eff" }: { items: BreakdownItem[]; format?: Format; color?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="fm-barlist">
      {items.map((it) => (
        <li key={it.label}>
          <div className="fm-barlist__row">
            <span>{it.label}</span>
            <strong>{formatMetric(it.value, format)}</strong>
          </div>
          <span className="fm-barlist__track">
            <span style={{ width: `${(it.value / max) * 100}%`, background: color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
