import { useId, useMemo, useRef, useState } from 'react';
import styles from '../../styles/EmployerCharts.module.scss';
import ui from '../../styles/EmployerShared.module.scss';
import type { DailyCount } from '../../types';
import { formatShortDay } from '../../utils/employerFormatters';

const WIDTH = 640;
const HEIGHT = 230;
const PAD = { top: 12, right: 12, bottom: 28, left: 34 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const raw = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  return step * magnitude * 4;
}

/** Single-series area chart with crosshair + tooltip. */
export function AreaTrendChart({ data, label = 'Applications' }: { data: DailyCount[]; label?: string }) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { points, max, ticks } = useMemo(() => {
    const peak = Math.max(0, ...data.map((d) => d.count));
    const top = niceMax(peak);
    const innerW = WIDTH - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    return {
      max: top,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f)),
      points: data.map((d, i) => ({
        x: PAD.left + i * step,
        y: PAD.top + innerH - (d.count / top) * innerH,
        ...d,
      })),
    };
  }, [data]);

  if (!data.length) return null;

  const baseline = HEIGHT - PAD.bottom;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[nearest].x - x)) nearest = i;
    });
    setHover(nearest);
  };

  const active = hover !== null ? points[hover] : null;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className={styles.chart}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${label} per day, ${total} total`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f5fe0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2f5fe0" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = PAD.top + (HEIGHT - PAD.top - PAD.bottom) * (1 - tick / max);
          return (
            <g key={tick}>
              <line className={styles.grid} x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end">{tick}</text>
            </g>
          );
        })}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.date} x={p.x} y={HEIGHT - 8} textAnchor="middle">
              {formatShortDay(p.date)}
            </text>
          ) : null,
        )}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="#1677e8" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active && (
          <>
            <line x1={active.x} x2={active.x} y1={PAD.top} y2={baseline} stroke="#c9cbe0" strokeDasharray="3 3" />
            <circle cx={active.x} cy={active.y} r={5} fill="#1677e8" stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
      {active && (
        <div className={styles.tooltip} style={{ left: `${(active.x / WIDTH) * 100}%`, top: `${(active.y / HEIGHT) * 100}%` }}>
          <strong>{active.count} {active.count === 1 ? 'application' : 'applications'}</strong>
          <span>{formatShortDay(active.date)}</span>
        </div>
      )}
      <table className={ui.srOnly}>
        <caption>{label} per day</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}><th scope="row">{d.date}</th><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AreaTrendChart;
