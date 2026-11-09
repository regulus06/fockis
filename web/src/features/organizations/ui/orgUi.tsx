/**
 * orgUi.tsx
 * -----------------------------------------------------------------------------
 * Small building blocks for the Fockis Organizations screens (design system in
 * fockisOrgTheme.scss): brand wordmark, avatar, stat card, status badge,
 * empty / error / loading states, line and bar charts, pagination, dates.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, CircleAlert, Inbox, TrendingDown, TrendingUp } from "lucide-react";

import FockisFMark from "./FockisFMark";
import { mediaUrl } from "../api/dashboardApi";

/* ---------------------------------------------------------------- fonts */

let fontsRequested = false;

/**
 * Loads Poppins + Inter once (display + body fonts of the Fockis artwork) and,
 * while an Organizations screen is open, paints the whole page light so the
 * app's dark theme never shows below or around the content. The previous
 * background is restored when the screen closes.
 */
export function useOrgFonts(pageBackground = "#f4f7fc"): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");
    const before = {
      html: html.style.backgroundColor,
      body: body.style.backgroundColor,
      root: root?.style.backgroundColor ?? "",
      scheme: html.style.colorScheme,
    };
    html.style.backgroundColor = pageBackground;
    body.style.backgroundColor = pageBackground;
    if (root) root.style.backgroundColor = pageBackground;
    html.style.colorScheme = "light";
    return () => {
      html.style.backgroundColor = before.html;
      body.style.backgroundColor = before.body;
      if (root) root.style.backgroundColor = before.root;
      html.style.colorScheme = before.scheme;
    };
  }, [pageBackground]);

  useEffect(() => {
    if (fontsRequested || typeof document === "undefined") return;
    fontsRequested = true;
    if (document.querySelector('link[data-fockis-org-fonts="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&display=swap";
    link.dataset.fockisOrgFonts = "1";
    document.head.appendChild(link);
  }, []);
}

/* ---------------------------------------------------------------- brand */

export function FockisOrgBrand({
  to = "/organizations",
  inline = false,
  product = "Organizations",
}: {
  to?: string;
  inline?: boolean;
  product?: string | null;
}): React.JSX.Element {
  return (
    <Link to={to} className={"fo-brand" + (inline ? " fo-brand--inline" : "")} aria-label={`Fockis ${product ?? ""}`.trim()}>
      <FockisFMark className="fo-brand__mark" size={30} />
      <span className="fo-brand__text">
        <span className="fo-brand__name">Fockis</span>
        {product && <span className="fo-brand__product">{product}</span>}
      </span>
    </Link>
  );
}

/* --------------------------------------------------------------- avatar */

export function initialsOf(name?: string | null): string {
  return (
    (name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function Avatar({
  name,
  url,
  size,
}: {
  name?: string | null;
  url?: string | null;
  size?: "sm" | "lg" | "xl";
}): React.JSX.Element {
  const src = mediaUrl(url);
  const [broken, setBroken] = useState(false);
  return (
    <span className={"fo-avatar" + (size ? ` fo-avatar--${size}` : "")} aria-hidden="true">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initialsOf(name)}
    </span>
  );
}

export function OrgLogoBox({
  name,
  url,
  icon: Icon,
  className = "fo-orgswitch__logo",
}: {
  name?: string;
  url?: string | null;
  icon?: LucideIcon;
  className?: string;
}): React.JSX.Element {
  const src = mediaUrl(url);
  if (src) return <img src={src} alt="" className={className} />;
  return (
    <span className={className} aria-hidden="true">
      {Icon ? <Icon size={22} /> : initialsOf(name)}
    </span>
  );
}

/* ----------------------------------------------------------- stat card */

export function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  tone,
  to,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: ReactNode;
  trend?: number | null;
  tone?: "violet" | "pink" | "green" | "amber";
  to?: string;
}): React.JSX.Element {
  const body = (
    <>
      <span className="fo-stat__icon">
        <Icon aria-hidden="true" />
      </span>
      <span className="fo-stat__value">{value}</span>
      <span className="fo-stat__label">{label}</span>
      {typeof trend === "number" && (
        <span className={"fo-stat__trend" + (trend < 0 ? " is-down" : trend === 0 ? " is-flat" : "")}>
          {trend < 0 ? <TrendingDown aria-hidden="true" /> : <TrendingUp aria-hidden="true" />}
          {trend > 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </>
  );
  const className = "fo-stat" + (tone ? ` fo-stat--${tone}` : "");
  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/* --------------------------------------------------------------- badges */

const STATUS_TONE: Record<string, string> = {
  active: "ok",
  pending: "warn",
  inactive: "muted",
  archived: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  inactive: "Suspended",
  archived: "Rejected / archived",
};

export function StatusBadge({ status }: { status?: string | null }): React.JSX.Element {
  const key = String(status ?? "").toLowerCase();
  return <span className={`fo-badge fo-badge--${STATUS_TONE[key] ?? "muted"}`}>{STATUS_LABEL[key] ?? (status || "Unknown")}</span>;
}

/* --------------------------------------------------------------- states */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  text,
  children,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="fo-empty">
      <span className="fo-empty__icon">
        <Icon aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
      {children && <div className="fo-empty__actions">{children}</div>}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "ok" | "info" | "warn";
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className={"fo-alert" + (tone === "error" ? "" : ` fo-alert--${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <CircleAlert aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Skeleton({ height = 18, width = "100%", style }: { height?: number; width?: number | string; style?: React.CSSProperties }) {
  return <div className="fo-skeleton" style={{ height, width, ...style }} aria-hidden="true" />;
}

export function LoadingCards({ count = 4, height = 120 }: { count?: number; height?: number }) {
  return (
    <div className="fo-stats" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- dates */

export function formatDate(value?: string | null, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, opts);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function formatNumber(n?: number | null): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

/* ---------------------------------------------------------------- chart */

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(560);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (max === min) {
    const base = Math.max(1, Math.abs(max));
    return [Math.max(0, min - base), min, max + base].filter((v, i, a) => a.indexOf(v) === i);
  }
  const span = max - min;
  const rough = span / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? rough;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/** Area/line chart of a numeric series (membership growth). */
export function LineChart({
  points,
  label,
}: {
  points: { x: string; y: number }[];
  label: string;
}): React.JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 230;
  const pad = { l: 44, r: 14, t: 12, b: 28 };
  const ys = points.length ? points.map((p) => p.y) : [0];
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const iw = Math.max(10, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 70))));

  return (
    <div ref={ref}>
      <svg className="fo-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <defs>
          <linearGradient id="fo-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1a8cff" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#1a8cff" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="fo-chart__grid" x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        {points.length > 0 && <path d={area} fill="url(#fo-area)" />}
        {points.length > 0 && <path className="fo-chart__line" d={line} />}
        {points.map((p, i) => (
          <g key={p.x + i}>
            <circle className="fo-chart__dot" cx={x(i)} cy={y(p.y)} r={4}>
              <title>{`${p.x}: ${p.y.toLocaleString()}`}</title>
            </circle>
            {i % labelEvery === 0 && (
              <text x={x(i)} y={height - 8} textAnchor="middle">
                {p.x}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Simple bar chart (weekly check-ins). */
export function BarChart({ bars, label }: { bars: { x: string; y: number }[]; label: string }): React.JSX.Element {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 170;
  const pad = { l: 34, r: 8, t: 10, b: 26 };
  const max = Math.max(1, ...bars.map((b) => b.y));
  const ticks = niceTicks(0, max, 4);
  const hi = ticks[ticks.length - 1] || 1;
  const iw = Math.max(10, width - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const slot = iw / Math.max(1, bars.length);
  const bw = Math.min(36, slot * 0.6);
  const y = (v: number) => pad.t + ih - (v / hi) * ih;
  return (
    <div ref={ref}>
      <svg className="fo-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="fo-chart__grid" x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = pad.l + slot * i + slot / 2;
          return (
            <g key={b.x + i}>
              <rect className="fo-chart__bar" x={cx - bw / 2} y={y(b.y)} width={bw} height={Math.max(0, pad.t + ih - y(b.y))} rx={5}>
                <title>{`${b.x}: ${b.y}`}</title>
              </rect>
              <text x={cx} y={height - 8} textAnchor="middle">
                {b.x}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------- pagination */

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  noun = "members",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  noun?: string;
}): React.JSX.Element | null {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const list: (number | "gap")[] = [];
  const push = (n: number) => list[list.length - 1] !== n && list.push(n);
  push(1);
  if (page > 3) list.push("gap");
  for (let n = Math.max(2, page - 1); n <= Math.min(pages - 1, page + 1); n++) push(n);
  if (page < pages - 2) list.push("gap");
  if (pages > 1) push(pages);

  return (
    <nav className="fo-pager" aria-label="Pages">
      <span>
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} {noun}
      </span>
      <span className="fo-pager__pages">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft aria-hidden="true" />
        </button>
        {list.map((n, i) =>
          n === "gap" ? (
            <span key={`gap${i}`} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              className={n === page ? "is-active" : ""}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight aria-hidden="true" />
        </button>
      </span>
    </nav>
  );
}
