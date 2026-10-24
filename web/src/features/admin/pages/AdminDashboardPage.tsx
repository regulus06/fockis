import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Ban,
  Calendar,
  ChevronRight,
  Crown,
  DollarSign,
  FileText,
  Flag,
  Landmark,
  Package,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { adminApi } from "../service/adminApi";
import adminUsersApi from "../users/adminUsersApi";
import type { AdminUserStats } from "../users/types/adminUsers.types";
import { financeAdminApi } from "../finance/api/financeAdminApi";
import { refundsAdminApi } from "../finance/api/refundsAdminApi";
import type { FinanceOverview, RevenuePoint } from "../finance/types/finance.types";
import { shopAdminApi } from "../shop/api/shopAdminApi";
import type { ShopAdminStats } from "../shop/types/shopAdmin.types";

import { PERMISSIONS } from "../permissions/permission.constants";
import { useAdminAccess } from "../permissions/adminAccess";
import { useAdminSessionStore } from "../store/adminSessionStore";

import {
  AdminAreaChart,
  AdminBarChart,
  CHART_GOLD,
  CHART_NAVY,
  ChartLegend,
  Sparkline,
} from "../components/charts/AdminCharts";

import "../styles/AdminDashboard.scss";

/* ============================================================================
   APP ADMIN CENTER — DASHBOARD

   Every figure on this page comes from an existing backend endpoint:
   - /admin/dashboard            overview.totalUsers / activeUsers / growth
   - /admin/users/stats          new users today / this week / this month
   - /admin/finance/overview     gross revenue, transactions, subscriptions
   - /admin/finance/revenue      daily revenue series
   - /admin/finance/refunds      pending refund requests
   - /admin/shop/dashboard       pending products / sellers, flagged products
   - /admin/audit                recent activity
   Each source loads independently and shows its own loading/empty/error
   state. Sources the administrator has no permission for are skipped.
============================================================================ */

const P = PERMISSIONS;

type Period = "7d" | "30d" | "90d";

const PERIOD_OPTIONS: { value: Period; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 Days", days: 7 },
  { value: "30d", label: "Last 30 Days", days: 30 },
  { value: "90d", label: "Last 90 Days", days: 90 },
];

/* ---------------------------------------------------------------------------
   small async helper — independent state per data source
--------------------------------------------------------------------------- */

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  skipped: boolean;
}

function useSource<T>(
  enabled: boolean,
  loader: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: enabled,
    error: null,
    skipped: !enabled,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null, skipped: true });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null, skipped: false }));

    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null, skipped: false });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Unable to load data.",
            skipped: false,
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tick, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { ...state, reload };
}

/* ---------------------------------------------------------------------------
   formatting
--------------------------------------------------------------------------- */

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(amount: number | null | undefined, currency = "USD", compact = false): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function timeAgo(iso: string | undefined | null): string {
  if (!iso) return "";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function humanize(value: string): string {
  const text = value.replace(/[_.-]+/g, " ").trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/* ---------------------------------------------------------------------------
   response normalisers (defensive: tolerate both known response shapes)
--------------------------------------------------------------------------- */

interface PlatformOverview {
  totalUsers: number | null;
  activeUsers: number | null;
  newUsers24h: number | null;
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function readPlatformOverview(raw: unknown): PlatformOverview {
  const source = (raw ?? {}) as Record<string, unknown>;
  const overview = (source.overview ?? {}) as Record<string, unknown>;
  const growth = (source.growth ?? {}) as Record<string, unknown>;

  return {
    totalUsers: num(overview.totalUsers) ?? num(source.totalUsers),
    activeUsers: num(overview.activeUsers) ?? num(source.activeUsers),
    newUsers24h: num(growth.newUsers24h),
  };
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  module: string;
  time: string;
}

function readActivity(raw: unknown): ActivityItem[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown[] } | null)?.items)
      ? (raw as { items: unknown[] }).items
      : [];

  return list
    .map((entry, index) => {
      const e = (entry ?? {}) as Record<string, unknown>;
      const action = String(e.action ?? "Activity");
      const module = String(e.module ?? e.resource ?? "platform");
      const target = e.target ?? e.targetId;
      const actor = e.actor ?? e.userId;
      const time = String(e.timestamp ?? e.createdAt ?? "");

      const subtitleParts = [
        target ? String(target) : "",
        actor ? `by ${String(actor)}` : "",
      ].filter(Boolean);

      return {
        id: String(e.id ?? e._id ?? `${action}-${index}`),
        title: humanize(action),
        subtitle: subtitleParts.join(" · ") || humanize(module),
        module,
        time,
      };
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);
}

function activityIcon(module: string): LucideIcon {
  const m = module.toLowerCase();
  if (m.includes("user")) return Users;
  if (m.includes("order") || m.includes("cart")) return ShoppingCart;
  if (m.includes("market") || m.includes("shop") || m.includes("product") || m.includes("store")) return Store;
  if (m.includes("finance") || m.includes("payment") || m.includes("payout") || m.includes("refund")) return DollarSign;
  if (m.includes("subscription")) return Crown;
  if (m.includes("admin") || m.includes("role") || m.includes("security")) return ShieldCheck;
  return FileText;
}

function activityTone(module: string): "navy" | "gold" | "info" | "success" {
  const m = module.toLowerCase();
  if (m.includes("user")) return "success";
  if (m.includes("finance") || m.includes("subscription") || m.includes("payment")) return "gold";
  if (m.includes("market") || m.includes("shop") || m.includes("order")) return "info";
  return "navy";
}

/** Fill missing days with zero (no completed payments that day) and bucket long ranges by week. */
function buildRevenueSeries(points: RevenuePoint[], days: number) {
  const byDay = new Map<string, { gross: number; net: number }>();
  for (const p of points) {
    const key = String(p.date).slice(0, 10);
    byDay.set(key, {
      gross: Number(p.gross?.amount ?? 0) || 0,
      net: Number(p.net?.amount ?? 0) || 0,
    });
  }

  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const daily: { date: Date; gross: number; net: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const value = byDay.get(key) ?? { gross: 0, net: 0 };
    daily.push({ date, ...value });
  }

  const bucketSize = days > 45 ? 7 : 1;
  const buckets: { date: Date; gross: number; net: number }[] = [];
  for (let i = 0; i < daily.length; i += bucketSize) {
    const slice = daily.slice(i, i + bucketSize);
    buckets.push({
      date: slice[0].date,
      gross: slice.reduce((sum, d) => sum + d.gross, 0),
      net: slice.reduce((sum, d) => sum + d.net, 0),
    });
  }

  const short = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    labels: buckets.map((b) => short(b.date)),
    fullLabels: buckets.map((b) =>
      bucketSize === 1
        ? b.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
        : `Week of ${short(b.date)}`,
    ),
    gross: buckets.map((b) => b.gross),
    net: buckets.map((b) => b.net),
    hasData: points.length > 0,
    bucketLabel: bucketSize === 1 ? "daily" : "weekly",
  };
}

/* ---------------------------------------------------------------------------
   presentational pieces
--------------------------------------------------------------------------- */

function Trend({ change, suffix }: { change: number | null; suffix: string }) {
  if (change === null) return <span className="fk-kpi__meta">{suffix}</span>;

  const rounded = Math.round(change * 10) / 10;
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const Icon = direction === "down" ? ArrowDown : ArrowUp;

  return (
    <span className="fk-kpi__meta">
      <span className={`fk-trend fk-trend--${direction}`}>
        {direction !== "flat" && <Icon size={13} strokeWidth={2.5} aria-hidden="true" />}
        {rounded > 0 ? "+" : ""}
        {rounded}%
      </span>
      <span>{suffix}</span>
    </span>
  );
}

interface KpiProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "navy" | "gold";
  loading: boolean;
  trend?: ReactNode;
  spark?: number[];
  sparkColor?: string;
}

function KpiCard({ label, value, icon: Icon, tone, loading, trend, spark, sparkColor }: KpiProps) {
  return (
    <article className="fk-kpi" aria-busy={loading || undefined}>
      <span className={`fk-kpi__icon fk-kpi__icon--${tone}`} aria-hidden="true">
        <Icon size={26} strokeWidth={1.9} />
      </span>

      <div className="fk-kpi__body">
        <div className="fk-kpi__label">{label}</div>
        {loading ? (
          <>
            <span className="fk-skeleton" style={{ width: 110, height: 26, marginTop: 4 }} />
            <span className="fk-skeleton" style={{ width: 70, height: 12, marginTop: 8 }} />
          </>
        ) : (
          <>
            <div className="fk-kpi__value">{value}</div>
            {trend}
          </>
        )}

        {!loading && spark && spark.length > 1 && (
          <Sparkline values={spark} color={sparkColor} label={`${label} trend`} />
        )}
      </div>
    </article>
  );
}

function PanelState({
  kind,
  message,
  onRetry,
}: {
  kind: "loading" | "empty" | "error" | "denied";
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="fk-state fk-state--compact" role={kind === "error" ? "alert" : "status"}>
      {kind === "loading" && <div className="fk-spinner" />}
      <p>{message}</p>
      {kind === "error" && onRetry && (
        <button type="button" className="fk-btn fk-btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/* ============================================================================
   PAGE
============================================================================ */

export function AdminDashboardPage() {
  const { can } = useAdminAccess();
  const switchToken = useAdminSessionStore((state) => state.switchToken);

  const [period, setPeriod] = useState<Period>("30d");
  const periodInfo = PERIOD_OPTIONS.find((option) => option.value === period) ?? PERIOD_OPTIONS[1];

  const canFinance = can([P.FINANCE_VIEW]);
  const canUsers = can([P.USERS_VIEW]);
  const canShop = can([P.MARKETPLACE_VIEW]);
  const canRefunds = can([P.FINANCE_REFUNDS]);
  const canAudit = can([P.AUDIT_VIEW]);

  /* ---------- data sources ---------- */
  const platform = useSource(true, () => adminApi.getDashboard().then(readPlatformOverview), [switchToken]);

  const userStats = useSource<AdminUserStats>(canUsers, () => adminUsersApi.getStats(), [switchToken]);

  const finance = useSource<{ current: FinanceOverview; previous: FinanceOverview | null }>(
    canFinance,
    async () => {
      const [current, doubled] = await Promise.all([
        financeAdminApi.getOverview(period),
        financeAdminApi.getOverview(`${periodInfo.days * 2}d`).catch(() => null),
      ]);
      return { current, previous: doubled };
    },
    [period, switchToken],
  );

  const revenue = useSource<RevenuePoint[]>(
    canFinance,
    () => financeAdminApi.getRevenue(period).then((rows) => (Array.isArray(rows) ? rows : [])),
    [period, switchToken],
  );

  const shop = useSource<ShopAdminStats>(canShop, () => shopAdminApi.dashboard(), [switchToken]);

  const refunds = useSource<number>(
    canRefunds,
    () =>
      refundsAdminApi
        .list()
        .then((rows) => (Array.isArray(rows) ? rows.filter((r) => String(r.status).toUpperCase() === "PENDING").length : 0)),
    [switchToken],
  );

  const activity = useSource<ActivityItem[]>(canAudit, () => adminApi.getAuditLogs().then(readActivity), [switchToken]);

  /* ---------- derived values ---------- */
  const totalUsers = userStats.data?.totalUsers ?? platform.data?.totalUsers ?? null;

  const usersTrend = useMemo(() => {
    const stats = userStats.data;
    if (!stats) return { change: null as number | null, spark: undefined as number[] | undefined };
    const start = stats.totalUsers - stats.newUsersThisMonth;
    return {
      change: percentChange(stats.totalUsers, start),
      spark: [
        start,
        stats.totalUsers - stats.newUsersThisWeek,
        stats.totalUsers - stats.newUsersToday,
        stats.totalUsers,
      ],
    };
  }, [userStats.data]);

  const financeCurrent = finance.data?.current ?? null;
  const financePrevious = finance.data?.previous ?? null;

  const revenueChange =
    financeCurrent && financePrevious
      ? percentChange(
          financeCurrent.grossRevenue.amount,
          financePrevious.grossRevenue.amount - financeCurrent.grossRevenue.amount,
        )
      : null;

  const transactionsChange =
    financeCurrent && financePrevious
      ? percentChange(financeCurrent.transactionCount, financePrevious.transactionCount - financeCurrent.transactionCount)
      : null;

  const revenueSeries = useMemo(
    () => buildRevenueSeries(revenue.data ?? [], periodInfo.days),
    [revenue.data, periodInfo.days],
  );

  const growth = useMemo(() => {
    const stats = userStats.data;
    if (!stats) return null;
    const startTotal = stats.totalUsers - stats.newUsersThisMonth;
    return {
      labels: ["30 days ago", "7 days ago", "Start of today", "Now"],
      series: [
        {
          name: "Total Users",
          color: CHART_GOLD,
          values: [startTotal, stats.totalUsers - stats.newUsersThisWeek, stats.totalUsers - stats.newUsersToday, stats.totalUsers],
        },
        {
          name: "New Users",
          color: CHART_NAVY,
          values: [0, stats.newUsersThisMonth - stats.newUsersThisWeek, stats.newUsersThisMonth - stats.newUsersToday, stats.newUsersThisMonth],
        },
      ],
    };
  }, [userStats.data]);

  const currency = financeCurrent?.grossRevenue.currency ?? "USD";

  /* ---------- pending actions (only supported categories) ---------- */
  const pendingActions: {
    key: string;
    label: string;
    count: number;
    to: string;
    icon: LucideIcon;
  }[] = [];

  if (shop.data) {
    pendingActions.push(
      { key: "products", label: "Products pending review", count: shop.data.pendingProducts, to: "/admin/shop/products", icon: Package },
      { key: "sellers", label: "Sellers awaiting approval", count: shop.data.pendingSellers, to: "/admin/shop/sellers", icon: UserPlus },
      { key: "flagged", label: "Flagged products", count: shop.data.flaggedProducts, to: "/admin/shop/products", icon: Flag },
      { key: "suspended", label: "Suspended sellers", count: shop.data.suspendedSellers, to: "/admin/shop/sellers", icon: Ban },
    );
  }

  if (refunds.data !== null) {
    pendingActions.push({
      key: "refunds",
      label: "Refund requests",
      count: refunds.data,
      to: "/admin/finance/refunds",
      icon: ReceiptText,
    });
  }

  if (financeCurrent && can([P.FINANCE_PAYOUTS])) {
    pendingActions.push({
      key: "payouts",
      label: `Pending payouts (${formatMoney(financeCurrent.pendingPayouts.amount, financeCurrent.pendingPayouts.currency)})`,
      count: NaN,
      to: "/admin/finance/payouts",
      icon: Landmark,
    });
  }

  const pendingLoading = (shop.loading || refunds.loading) && pendingActions.length === 0;
  const pendingErrors = [shop.error, refunds.error].filter(Boolean) as string[];

  /* ---------- quick access (previous dashboard links, permission-filtered) ---------- */
  const quickLinks = [
    { to: "/admin/finance", label: "Finance Dashboard", anyOf: [P.FINANCE_VIEW] },
    { to: "/admin/shop", label: "Fockis Shop", anyOf: [P.MARKETPLACE_VIEW] },
    { to: "/admin/marketing-admin", label: "Marketing Admin", anyOf: [] },
    { to: "/admin/fockismail", label: "Fockis Marketing", anyOf: [] },
    { to: "/admin/users", label: "User Management", anyOf: [P.USERS_VIEW] },
    { to: "/admin/administrators", label: "Administrators", anyOf: [P.ADMINS_VIEW] },
    { to: "/admin/roles", label: "Roles", anyOf: [P.ROLES_VIEW] },
    { to: "/admin/roles/create", label: "Create Role", anyOf: [P.ROLES_CREATE, P.PERMISSIONS_ASSIGN] },
    { to: "/admin/permissions", label: "Permissions", anyOf: [P.PERMISSIONS_VIEW] },
    { to: "/admin/music/rules", label: "Music Rules", anyOf: [P.ANALYTICS_VIEW] },
  ].filter((link) => can(link.anyOf));

  /* ---------- render ---------- */
  return (
    <div className="fk-dashboard">
      {/* ======================== heading ======================== */}
      <header className="fk-dashboard__heading">
        <div>
          <span className="fk-page-header__eyebrow">Welcome to Fockis</span>
          <h1>App Admin Center</h1>
          <p>Manage your platform, monitor activity, and grow Fockis.</p>
        </div>

        <label className="fk-date-range">
          <Calendar size={18} aria-hidden="true" />
          <span className="fk-sr-only">Reporting period for finance figures</span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            aria-label="Reporting period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {platform.error && !userStats.data && (
        <div className="fk-inline-alert" role="alert">
          You don&apos;t have permission to view global analytics, or the dashboard data failed to load.
          <button type="button" className="fk-btn fk-btn--sm" onClick={platform.reload}>
            Try again
          </button>
        </div>
      )}

      {/* ======================== KPI cards ======================== */}
      <section className="fk-kpi-grid" aria-label="Key metrics">
        <KpiCard
          label="Total Users"
          value={formatCount(totalUsers)}
          icon={Users}
          tone="navy"
          loading={(platform.loading || userStats.loading) && totalUsers === null}
          trend={
            usersTrend.change !== null ? (
              <Trend change={usersTrend.change} suffix="in 30 days" />
            ) : platform.data?.newUsers24h !== null && platform.data?.newUsers24h !== undefined ? (
              <span className="fk-kpi__meta">+{formatCount(platform.data.newUsers24h)} in 24h</span>
            ) : undefined
          }
          spark={usersTrend.spark}
          sparkColor={CHART_GOLD}
        />

        <KpiCard
          label="Transactions"
          value={canFinance ? formatCount(financeCurrent?.transactionCount) : "—"}
          icon={ShoppingCart}
          tone="gold"
          loading={finance.loading}
          trend={
            !canFinance ? (
              <span className="fk-kpi__meta">Finance access required</span>
            ) : finance.error ? (
              <span className="fk-kpi__meta">Unavailable</span>
            ) : (
              <Trend change={transactionsChange} suffix={`vs prev. ${periodInfo.days}d`} />
            )
          }
        />

        <KpiCard
          label="Gross Revenue"
          value={canFinance ? formatMoney(financeCurrent?.grossRevenue.amount, currency) : "—"}
          icon={DollarSign}
          tone="gold"
          loading={finance.loading}
          trend={
            !canFinance ? (
              <span className="fk-kpi__meta">Finance access required</span>
            ) : finance.error ? (
              <span className="fk-kpi__meta">Unavailable</span>
            ) : (
              <Trend change={revenueChange} suffix={`vs prev. ${periodInfo.days}d`} />
            )
          }
          spark={revenueSeries.hasData ? revenueSeries.gross : undefined}
          sparkColor={CHART_GOLD}
        />

        <KpiCard
          label="Active Subscriptions"
          value={canFinance ? formatCount(financeCurrent?.activeSubscriptions) : "—"}
          icon={Crown}
          tone="gold"
          loading={finance.loading}
          trend={
            !canFinance ? (
              <span className="fk-kpi__meta">Finance access required</span>
            ) : finance.error ? (
              <span className="fk-kpi__meta">Unavailable</span>
            ) : (
              <span className="fk-kpi__meta">Active &amp; trial plans</span>
            )
          }
        />
      </section>

      {/* ======================== charts ======================== */}
      <section className="fk-dashboard__charts">
        <article className="fk-panel">
          <div className="fk-panel__header">
            <div>
              <h2>Platform Revenue</h2>
              <p>
                Completed payments, {revenueSeries.bucketLabel} · {periodInfo.label.toLowerCase()}
              </p>
            </div>
            <ChartLegend
              series={[
                { name: "Gross revenue", color: CHART_NAVY },
                { name: "Net of refunds", color: CHART_GOLD },
              ]}
            />
          </div>
          <div className="fk-panel__body">
            {!canFinance ? (
              <PanelState kind="denied" message="Revenue is visible to administrators with finance access." />
            ) : revenue.loading ? (
              <PanelState kind="loading" message="Loading revenue…" />
            ) : revenue.error ? (
              <PanelState kind="error" message={revenue.error} onRetry={revenue.reload} />
            ) : !revenueSeries.hasData ? (
              <PanelState kind="empty" message="No completed payments in this period yet." />
            ) : (
              <AdminBarChart
                ariaLabel={`Platform revenue, ${periodInfo.label}`}
                labels={revenueSeries.labels}
                fullLabels={revenueSeries.fullLabels}
                series={[
                  { name: "Gross revenue", color: CHART_NAVY, values: revenueSeries.gross },
                  { name: "Net of refunds", color: CHART_GOLD, values: revenueSeries.net },
                ]}
                formatValue={(v) => formatMoney(v, currency)}
                formatAxis={(v) => formatMoney(v, currency, true)}
              />
            )}
          </div>
        </article>

        <article className="fk-panel">
          <div className="fk-panel__header">
            <div>
              <h2>User Growth</h2>
              <p>Registered accounts over the last 30 days</p>
            </div>
            {growth && <ChartLegend series={growth.series} />}
          </div>
          <div className="fk-panel__body">
            {!canUsers ? (
              <PanelState kind="denied" message="User growth is visible to administrators with user access." />
            ) : userStats.loading ? (
              <PanelState kind="loading" message="Loading user growth…" />
            ) : userStats.error ? (
              <PanelState kind="error" message={userStats.error} onRetry={userStats.reload} />
            ) : !growth ? (
              <PanelState kind="empty" message="No user data available." />
            ) : (
              <AdminAreaChart
                ariaLabel="User growth over the last 30 days"
                labels={growth.labels}
                series={growth.series}
                formatValue={(v) => formatCount(v)}
              />
            )}
          </div>
        </article>
      </section>

      {/* ======================== activity + pending ======================== */}
      <section className="fk-dashboard__lists">
        <article className="fk-panel">
          <div className="fk-panel__header">
            <h2>Recent Activity</h2>
            {canAudit && (
              <Link to="/admin/audit" className="fk-panel__link">
                View All
              </Link>
            )}
          </div>
          <div className="fk-panel__body">
            {!canAudit ? (
              <PanelState kind="denied" message="Activity is visible to administrators with audit access." />
            ) : activity.loading ? (
              <PanelState kind="loading" message="Loading recent activity…" />
            ) : activity.error ? (
              <PanelState kind="error" message={activity.error} onRetry={activity.reload} />
            ) : !activity.data?.length ? (
              <PanelState kind="empty" message="No recent activity recorded." />
            ) : (
              <ul className="fk-activity">
                {activity.data.map((item) => {
                  const Icon = activityIcon(item.module);
                  const tone = activityTone(item.module);
                  return (
                    <li key={item.id} className="fk-activity__item">
                      <span className={`fk-activity__icon fk-activity__icon--${tone}`} aria-hidden="true">
                        <Icon size={18} />
                      </span>
                      <div className="fk-activity__text">
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </div>
                      <time className="fk-activity__time" dateTime={item.time}>
                        {timeAgo(item.time)}
                      </time>
                      <span className={`fk-badge fk-badge--${tone === "success" ? "success" : tone === "gold" ? "gold" : tone === "info" ? "info" : "navy"}`}>
                        {humanize(item.module)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </article>

        <article className="fk-panel">
          <div className="fk-panel__header">
            <h2>Pending Actions</h2>
            {canShop && (
              <Link to="/admin/shop" className="fk-panel__link">
                View All
              </Link>
            )}
          </div>
          <div className="fk-panel__body">
            {!canShop && !canRefunds && !canFinance ? (
              <PanelState kind="denied" message="No pending-action queues are available for your role." />
            ) : pendingLoading ? (
              <PanelState kind="loading" message="Loading pending actions…" />
            ) : pendingActions.length === 0 && pendingErrors.length > 0 ? (
              <PanelState
                kind="error"
                message={pendingErrors[0]}
                onRetry={() => {
                  shop.reload();
                  refunds.reload();
                }}
              />
            ) : pendingActions.length === 0 ? (
              <PanelState kind="empty" message="Nothing is waiting for review." />
            ) : (
              <ul className="fk-pending">
                {pendingActions.map((action) => {
                  const Icon = action.icon;
                  const hasCount = Number.isFinite(action.count);
                  return (
                    <li key={action.key}>
                      <Link to={action.to} className="fk-pending__item">
                        <span className="fk-pending__icon" aria-hidden="true">
                          <Icon size={18} />
                        </span>
                        {hasCount && <span className="fk-pending__count">{formatCount(action.count)}</span>}
                        <span className="fk-pending__label">{action.label}</span>
                        <ChevronRight size={18} className="fk-pending__chevron" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {pendingActions.length > 0 && pendingErrors.length > 0 && (
              <p className="fk-dashboard__note">Some queues could not be loaded: {pendingErrors.join(" · ")}</p>
            )}
          </div>
        </article>
      </section>

      {/* ======================== quick access ======================== */}
      {quickLinks.length > 0 && (
        <section className="fk-panel fk-quick">
          <div className="fk-panel__header">
            <h2>Quick Access</h2>
          </div>
          <div className="fk-panel__body">
            <ul className="fk-quick__list">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="fk-quick__link">
                    {link.label}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default AdminDashboardPage;
