import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { NavLink, Navigate, Route, Routes, useSearchParams } from "react-router-dom";

import {
  BarChart3,
  ChevronRight,
  Download,
  FileText,
  Layers,
  Loader2,
  Lock,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Zap,
} from "lucide-react";

import {
  bpsToText,
  centsToText,
  marketplaceFinanceApi as apiClient,
  money,
  toBps,
  toCents,
  type AuditEntry,
  type CommissionSettings,
  type EarlyRequest,
  type HoldReasonOption,
  type MarketplaceOverview,
  type PayoutHold,
  type PayoutPlan,
  type PayoutPlanInput,
  type StoreRecord,
  type StoreRow,
} from "./marketplaceFinanceApi";

import "./MarketplacePayoutsAdmin.scss";

/* ============================================================================
   ADMIN CENTER (FINANCIAL MANAGEMENT) — Marketplace payouts
   Route: /admin/finance/marketplace/*
   Menu matches the Fockis payout design: Financial Overview, Commission
   Management, Early Payout Fee Management, Seller Payout Plans, Payment Holds
   & Verification, Seller Financial Records, Transactions & Reports.
============================================================================ */

const BASE = "/admin/finance/marketplace";

const MENU: Array<{ to: string; label: string; icon: ReactNode }> = [
  { to: "overview", label: "Financial Overview", icon: <BarChart3 size={18} /> },
  { to: "commission", label: "Commission Management", icon: <Layers size={18} /> },
  { to: "early-fees", label: "Early Payout Fee Management", icon: <Zap size={18} /> },
  { to: "plans", label: "Seller Payout Plans", icon: <User size={18} /> },
  { to: "holds", label: "Payment Holds & Verification", icon: <ShieldCheck size={18} /> },
  { to: "sellers", label: "Seller Financial Records", icon: <Users size={18} /> },
  { to: "reports", label: "Transactions & Reports", icon: <FileText size={18} /> },
];

function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

function useLoad<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, setData, loading, error, reload };
}

function Notice({ error, success }: { error?: string; success?: string }) {
  if (error) return <div className="mpa-alert mpa-alert--error" role="alert">{error}</div>;
  if (success) return <div className="mpa-alert mpa-alert--ok" role="status">{success}</div>;
  return null;
}

function Busy({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="mpa-busy">
      <Loader2 size={18} className="mpa-spin" /> {text}
    </div>
  );
}

function feeText(plan: Pick<PayoutPlan, "earlyPayout" | "currency">): string {
  const e = plan.earlyPayout;
  if (!e?.enabled) return "Off";
  const parts: string[] = [];
  if (e.percentBps) parts.push(`${e.percentBps / 100}%`);
  if (e.fixedCents) parts.push(money(e.fixedCents, plan.currency));
  let text = parts.join(" + ") || "Free";
  if (e.minFeeCents) text += ` · min ${money(e.minFeeCents, plan.currency)}`;
  if (e.maxFeeCents !== null) text += ` · max ${money(e.maxFeeCents, plan.currency)}`;
  if (e.tiers?.length) text += ` · ${e.tiers.length} tier${e.tiers.length === 1 ? "" : "s"}`;
  return text;
}

/* ========================================================================== */

export default function MarketplacePayoutsAdminPage() {
  return (
    <div className="mpa">
      <aside className="mpa-menu">
        <div className="mpa-menu__head">
          <Settings size={22} />
          <span>
            Admin Center <small>(Financial Management)</small>
          </span>
        </div>
        <nav>
          {MENU.map((item) => (
            <NavLink key={item.to} to={`${BASE}/${item.to}`} className={({ isActive }) => `mpa-menu__item${isActive ? " is-active" : ""}`}>
              {item.icon}
              <span>{item.label}</span>
              <ChevronRight size={16} className="mpa-menu__chev" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mpa-main">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewView />} />
          <Route path="commission" element={<CommissionView />} />
          <Route path="early-fees" element={<PlansView mode="fees" />} />
          <Route path="plans" element={<PlansView mode="plans" />} />
          <Route path="holds" element={<HoldsView />} />
          <Route path="sellers" element={<SellersView />} />
          <Route path="reports" element={<ReportsView />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/* ============================= Overview ================================== */

function OverviewView() {
  const overview = useLoad<MarketplaceOverview>(() => apiClient.overview(), []);
  const commission = useLoad<CommissionSettings>(() => apiClient.getCommission(), []);
  const plans = useLoad<PayoutPlan[]>(() => apiClient.plans(), []);
  const defaultPlan = plans.data?.find((p) => p.isDefault);

  return (
    <section className="mpa-panel">
      <header className="mpa-head">
        <h1>Financial Overview</h1>
        <p>Marketplace payouts from Fockis records. Commission and fees are Fockis revenue; money sent to sellers is not.</p>
      </header>
      <Notice error={overview.error || commission.error || plans.error} />
      {overview.loading ? (
        <Busy />
      ) : overview.data ? (
        <>
          <div className="mpa-stats">
            {(overview.data.paidToSellers.length ? overview.data.paidToSellers : [{ _id: "usd", transferredCents: 0, commissionCents: 0, earlyFeeCents: 0, shipments: 0 }]).map((row) => (
              <div className="mpa-stat-group" key={row._id}>
                <div className="mpa-stat mpa-stat--rev">
                  <span>Fockis commission earned</span>
                  <strong>{money(row.commissionCents, row._id)}</strong>
                  <small>on {row.shipments} paid-out sale{row.shipments === 1 ? "" : "s"}</small>
                </div>
                <div className="mpa-stat mpa-stat--rev">
                  <span>Early payout fees earned</span>
                  <strong>{money(row.earlyFeeCents, row._id)}</strong>
                  <small>kept from early transfers</small>
                </div>
                <div className="mpa-stat">
                  <span>Sent to sellers' Stripe accounts</span>
                  <strong>{money(row.transferredCents, row._id)}</strong>
                  <small>seller money, not revenue</small>
                </div>
              </div>
            ))}
          </div>
          <div className="mpa-stats mpa-stats--small">
            <div className="mpa-stat">
              <span>Early payouts</span>
              <strong>{overview.data.earlyPayoutCount}</strong>
            </div>
            <div className="mpa-stat mpa-stat--warn">
              <span>Active holds</span>
              <strong>{overview.data.activeHolds}</strong>
              <small>{overview.data.storesOnHold} store{overview.data.storesOnHold === 1 ? "" : "s"}</small>
            </div>
            <div className="mpa-stat">
              <span>Default commission</span>
              <strong>{commission.data ? `${commission.data.defaultRate}%` : "—"}</strong>
              <small>
                {commission.data?.defaultFixedCents ? `+ ${money(commission.data.defaultFixedCents)} per sale` : "no fixed part"}
              </small>
            </div>
            <div className="mpa-stat">
              <span>Default payout plan</span>
              <strong className="mpa-stat__text">{defaultPlan?.name ?? "None yet"}</strong>
              <small>{defaultPlan ? `Early payout: ${feeText(defaultPlan)}` : "Create one in Seller Payout Plans"}</small>
            </div>
          </div>
        </>
      ) : null}

      <div className="mpa-config-box">
        <h2>
          <Settings size={18} /> Admin-configurable (stored in the database, not hardcoded)
        </h2>
        <ul>
          <li>Marketplace commission (default, seller/store, category, fixed, min/max)</li>
          <li>Early payout fees (percentage, fixed, min/max, tiers)</li>
          <li>Seller payout plans and which store uses which plan</li>
          <li>Waiting days, minimum and maximum payout per plan</li>
          <li>Payment holds (reason, amount, review date) with full history</li>
          <li>Every change is written to the audit log (Transactions &amp; Reports)</li>
        </ul>
      </div>
    </section>
  );
}

/* ============================= Commission ================================ */

function CommissionView() {
  const settings = useLoad<CommissionSettings>(() => apiClient.getCommission(), []);
  const [form, setForm] = useState({ rate: "", fixed: "", min: "", max: "", active: true });
  const [storeRates, setStoreRates] = useState<Array<{ key: string; rate: string }>>([]);
  const [categoryRates, setCategoryRates] = useState<Array<{ key: string; rate: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ error: "", success: "" });

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setForm({
      rate: String(s.defaultRate),
      fixed: centsToText(s.defaultFixedCents ?? 0),
      min: centsToText(s.minCommissionCents ?? 0),
      max: centsToText(s.maxCommissionCents ?? null),
      active: s.isActive,
    });
    setStoreRates((s.storeRates ?? []).map((r) => ({ key: r.key, rate: String(r.rate) })));
    setCategoryRates((s.categoryRates ?? []).map((r) => ({ key: r.key, rate: String(r.rate) })));
  }, [settings.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg({ error: "", success: "" });
    const rate = Number(form.rate);
    const fixed = toCents(form.fixed) ?? 0;
    const min = toCents(form.min) ?? 0;
    const max = toCents(form.max);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return setMsg({ error: "Commission % must be between 0 and 100.", success: "" });
    if ([fixed, min, max].some((v) => Number.isNaN(v))) return setMsg({ error: "Amounts must be numbers like 0.30.", success: "" });
    const parseList = (list: Array<{ key: string; rate: string }>) =>
      list.filter((r) => r.key.trim()).map((r) => ({ key: r.key.trim(), rate: Number(r.rate) }));
    setSaving(true);
    try {
      const updated = await apiClient.updateCommission({
        defaultRate: rate,
        defaultFixedCents: fixed,
        minCommissionCents: min,
        maxCommissionCents: max,
        isActive: form.active,
        storeRates: parseList(storeRates),
        categoryRates: parseList(categoryRates),
      });
      settings.setData(updated);
      setMsg({ error: "", success: "Commission saved. New payouts use it right away; past payouts keep their frozen numbers." });
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : "Could not save.", success: "" });
    } finally {
      setSaving(false);
    }
  }

  const overrideEditor = (
    title: string,
    hint: string,
    list: Array<{ key: string; rate: string }>,
    setList: (next: Array<{ key: string; rate: string }>) => void,
    keyLabel: string,
  ) => (
    <fieldset className="mpa-fieldset">
      <legend>{title}</legend>
      <p className="mpa-hint">{hint}</p>
      {list.map((row, index) => (
        <div className="mpa-row" key={index}>
          <input
            aria-label={keyLabel}
            placeholder={keyLabel}
            value={row.key}
            onChange={(e) => setList(list.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))}
          />
          <div className="mpa-suffix">
            <input
              aria-label="Commission %"
              inputMode="decimal"
              value={row.rate}
              onChange={(e) => setList(list.map((r, i) => (i === index ? { ...r, rate: e.target.value } : r)))}
            />
            <span>%</span>
          </div>
          <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => setList(list.filter((_, i) => i !== index))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="mpa-btn mpa-btn--soft" onClick={() => setList([...list, { key: "", rate: "" }])}>
        + Add
      </button>
    </fieldset>
  );

  return (
    <section className="mpa-panel">
      <header className="mpa-head">
        <h1>Commission Management</h1>
        <p>
          What Fockis keeps from each sale. Worked out on the item subtotal of each seller's shipment (not shipping or tax).
          Order of use: store rate → category rate → default rate.
        </p>
      </header>
      <Notice error={settings.error || msg.error} success={msg.success} />
      {settings.loading && !settings.data ? (
        <Busy />
      ) : (
        <form className="mpa-form" onSubmit={save}>
          <div className="mpa-grid">
            <label>
              <span>Default commission</span>
              <div className="mpa-suffix">
                <input inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required />
                <span>%</span>
              </div>
            </label>
            <label>
              <span>Fixed commission per sale</span>
              <div className="mpa-prefix">
                <span>$</span>
                <input inputMode="decimal" value={form.fixed} onChange={(e) => setForm({ ...form, fixed: e.target.value })} placeholder="0.00" />
              </div>
            </label>
            <label>
              <span>Minimum commission</span>
              <div className="mpa-prefix">
                <span>$</span>
                <input inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} placeholder="0.00" />
              </div>
            </label>
            <label>
              <span>Maximum commission</span>
              <div className="mpa-prefix">
                <span>$</span>
                <input inputMode="decimal" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} placeholder="No maximum" />
              </div>
            </label>
          </div>
          <label className="mpa-check">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Commission settings are active (if off, sellers can't be paid until it is on again)
          </label>

          {form.rate && (
            <p className="mpa-example">
              Example: a {money(10000)} sale → Fockis keeps{" "}
              <b>
                {money(
                  Math.min(
                    Math.max(Math.round(10000 * (Number(form.rate) || 0) / 100) + (toCents(form.fixed) || 0), toCents(form.min) || 0),
                    toCents(form.max) ?? Number.MAX_SAFE_INTEGER,
                    10000,
                  ),
                )}
              </b>
              , the seller gets the rest.
            </p>
          )}

          {overrideEditor("Seller / store rates", "Use the store ID (find it in Seller Financial Records).", storeRates, setStoreRates, "Store ID")}
          {overrideEditor("Category rates", "Use the category ID or slug saved on products.", categoryRates, setCategoryRates, "Category ID")}

          <div className="mpa-actions">
            <button type="submit" className="mpa-btn mpa-btn--primary" disabled={saving}>
              {saving && <Loader2 size={16} className="mpa-spin" />} Save commission
            </button>
          </div>
        </form>
      )}

      {settings.data?.auditLog?.length ? (
        <div className="mpa-subpanel">
          <h2>Change history</h2>
          <ul className="mpa-log">
            {[...settings.data.auditLog].reverse().slice(0, 20).map((entry, i) => (
              <li key={i}>
                <b>{formatDate(entry.changedAt, true)}</b> by {entry.changedBy}: {Object.keys(entry.changes ?? {}).join(", ") || entry.action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ============================= Plans & fees ============================== */

interface PlanDraft {
  name: string;
  description: string;
  currency: string;
  enabled: boolean;
  percent: string;
  fixed: string;
  minFee: string;
  maxFee: string;
  tiers: Array<{ upTo: string; percent: string; fixed: string }>;
  minPayout: string;
  maxPayout: string;
  waitDays: string;
  schedule: string;
  from: string;
  to: string;
}

const EMPTY_DRAFT: PlanDraft = {
  name: "",
  description: "",
  currency: "usd",
  enabled: true,
  percent: "",
  fixed: "",
  minFee: "",
  maxFee: "",
  tiers: [],
  minPayout: "",
  maxPayout: "",
  waitDays: "0",
  schedule: "",
  from: "",
  to: "",
};

function draftFrom(plan: PayoutPlan): PlanDraft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    currency: plan.currency,
    enabled: plan.earlyPayout.enabled,
    percent: bpsToText(plan.earlyPayout.percentBps),
    fixed: centsToText(plan.earlyPayout.fixedCents),
    minFee: centsToText(plan.earlyPayout.minFeeCents),
    maxFee: centsToText(plan.earlyPayout.maxFeeCents),
    tiers: (plan.earlyPayout.tiers ?? []).map((t) => ({
      upTo: centsToText(t.upToCents),
      percent: bpsToText(t.percentBps),
      fixed: centsToText(t.fixedCents),
    })),
    minPayout: centsToText(plan.minPayoutCents),
    maxPayout: centsToText(plan.maxPayoutCents),
    waitDays: String(plan.waitDaysAfterPayment ?? 0),
    schedule: plan.payoutScheduleLabel ?? "",
    from: plan.effectiveFrom ? plan.effectiveFrom.slice(0, 10) : "",
    to: plan.effectiveTo ? plan.effectiveTo.slice(0, 10) : "",
  };
}

function inputFromDraft(d: PlanDraft): PayoutPlanInput | string {
  const percentBps = toBps(d.percent);
  const fixedCents = toCents(d.fixed) ?? 0;
  const minFeeCents = toCents(d.minFee) ?? 0;
  const maxFeeCents = toCents(d.maxFee);
  const minPayoutCents = toCents(d.minPayout) ?? 0;
  const maxPayoutCents = toCents(d.maxPayout);
  const waitDays = Number(d.waitDays || "0");
  if (!d.name.trim()) return "Give the plan a name.";
  if (Number.isNaN(percentBps)) return "Fee % must be between 0 and 100.";
  if ([fixedCents, minFeeCents, maxFeeCents, minPayoutCents, maxPayoutCents].some((v) => Number.isNaN(v))) {
    return "Amounts must be numbers like 2.50.";
  }
  if (!Number.isInteger(waitDays) || waitDays < 0) return "Waiting days must be a whole number.";
  const tiers = [];
  for (const t of d.tiers) {
    const upToCents = toCents(t.upTo);
    const tierBps = toBps(t.percent);
    const tierFixed = toCents(t.fixed) ?? 0;
    if (Number.isNaN(upToCents) || Number.isNaN(tierBps) || Number.isNaN(tierFixed)) return "Check the fee tiers.";
    tiers.push({ upToCents, percentBps: tierBps, fixedCents: tierFixed });
  }
  return {
    name: d.name.trim(),
    description: d.description,
    currency: d.currency,
    earlyPayout: { enabled: d.enabled, percentBps, fixedCents, minFeeCents, maxFeeCents, tiers },
    minPayoutCents,
    maxPayoutCents,
    waitDaysAfterPayment: waitDays,
    payoutScheduleLabel: d.schedule,
    effectiveFrom: d.from || null,
    effectiveTo: d.to || null,
  };
}

function PlanEditor({
  initial,
  mode,
  onCancel,
  onSave,
}: {
  initial: PlanDraft;
  mode: "fees" | "plans";
  onCancel: () => void;
  onSave: (input: PayoutPlanInput) => Promise<void>;
}) {
  const [d, setD] = useState<PlanDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (patch: Partial<PlanDraft>) => setD((current) => ({ ...current, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const input = inputFromDraft(d);
    if (typeof input === "string") return setError(input);
    setSaving(true);
    setError("");
    try {
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // Live example with today's numbers.
  const exampleGross = 50000;
  const example = useMemo(() => {
    const input = inputFromDraft(d);
    if (typeof input === "string" || !input.earlyPayout) return null;
    const e = input.earlyPayout;
    const tiers = [...(e.tiers ?? [])].sort((a, b) => (a.upToCents === null ? 1 : b.upToCents === null ? -1 : a.upToCents - b.upToCents));
    const tier = tiers.find((t) => t.upToCents === null || exampleGross <= t.upToCents);
    const pct = tier ? tier.percentBps : e.percentBps ?? 0;
    const fixed = tier ? tier.fixedCents : e.fixedCents ?? 0;
    let fee = Math.floor((exampleGross * pct + 5000) / 10000) + fixed;
    fee = Math.max(fee, e.minFeeCents ?? 0);
    if (e.maxFeeCents !== null && e.maxFeeCents !== undefined) fee = Math.min(fee, e.maxFeeCents);
    fee = Math.min(fee, exampleGross);
    return { fee, net: exampleGross - fee };
  }, [d]);

  return (
    <form className="mpa-form mpa-editor" onSubmit={submit}>
      <Notice error={error} />
      {mode === "plans" && (
        <div className="mpa-grid">
          <label>
            <span>Plan name</span>
            <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Verified Seller" required maxLength={80} />
          </label>
          <label>
            <span>Currency</span>
            <input value={d.currency} onChange={(e) => set({ currency: e.target.value.toLowerCase() })} maxLength={3} />
          </label>
          <label className="mpa-span2">
            <span>Description (internal)</span>
            <input value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={500} />
          </label>
        </div>
      )}
      {mode === "fees" && <h3 className="mpa-editor__title">{d.name}</h3>}

      <fieldset className="mpa-fieldset">
        <legend>Early payout fee</legend>
        <label className="mpa-check">
          <input type="checkbox" checked={d.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Sellers on this plan can request early payouts
        </label>
        <div className="mpa-grid">
          <label>
            <span>Percentage</span>
            <div className="mpa-suffix">
              <input inputMode="decimal" value={d.percent} onChange={(e) => set({ percent: e.target.value })} placeholder="0" />
              <span>%</span>
            </div>
          </label>
          <label>
            <span>Fixed fee</span>
            <div className="mpa-prefix">
              <span>$</span>
              <input inputMode="decimal" value={d.fixed} onChange={(e) => set({ fixed: e.target.value })} placeholder="0.00" />
            </div>
          </label>
          <label>
            <span>Minimum fee</span>
            <div className="mpa-prefix">
              <span>$</span>
              <input inputMode="decimal" value={d.minFee} onChange={(e) => set({ minFee: e.target.value })} placeholder="0.00" />
            </div>
          </label>
          <label>
            <span>Maximum fee</span>
            <div className="mpa-prefix">
              <span>$</span>
              <input inputMode="decimal" value={d.maxFee} onChange={(e) => set({ maxFee: e.target.value })} placeholder="No maximum" />
            </div>
          </label>
        </div>

        <div className="mpa-tiers">
          <p className="mpa-hint">Optional tiers: a different fee depending on the amount requested. They replace the % and fixed fee above.</p>
          {d.tiers.map((t, i) => (
            <div className="mpa-row" key={i}>
              <div className="mpa-prefix">
                <span>Up to $</span>
                <input
                  inputMode="decimal"
                  placeholder="No limit"
                  value={t.upTo}
                  onChange={(e) => set({ tiers: d.tiers.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)) })}
                />
              </div>
              <div className="mpa-suffix">
                <input
                  inputMode="decimal"
                  value={t.percent}
                  onChange={(e) => set({ tiers: d.tiers.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)) })}
                />
                <span>%</span>
              </div>
              <div className="mpa-prefix">
                <span>+ $</span>
                <input
                  inputMode="decimal"
                  value={t.fixed}
                  onChange={(e) => set({ tiers: d.tiers.map((x, j) => (j === i ? { ...x, fixed: e.target.value } : x)) })}
                />
              </div>
              <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => set({ tiers: d.tiers.filter((_, j) => j !== i) })}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="mpa-btn mpa-btn--soft" onClick={() => set({ tiers: [...d.tiers, { upTo: "", percent: "", fixed: "" }] })}>
            + Add tier
          </button>
        </div>

        {example && (
          <p className="mpa-example">
            Example: seller requests {money(exampleGross, d.currency)} → fee <b>{money(example.fee, d.currency)}</b>, seller receives{" "}
            <b>{money(example.net, d.currency)}</b>.
          </p>
        )}
      </fieldset>

      {mode === "plans" && (
        <fieldset className="mpa-fieldset">
          <legend>Limits and eligibility</legend>
          <div className="mpa-grid">
            <label>
              <span>Smallest early payout</span>
              <div className="mpa-prefix">
                <span>$</span>
                <input inputMode="decimal" value={d.minPayout} onChange={(e) => set({ minPayout: e.target.value })} placeholder="0.00" />
              </div>
            </label>
            <label>
              <span>Largest early payout</span>
              <div className="mpa-prefix">
                <span>$</span>
                <input inputMode="decimal" value={d.maxPayout} onChange={(e) => set({ maxPayout: e.target.value })} placeholder="No limit" />
              </div>
            </label>
            <label>
              <span>Days after payment before early payout</span>
              <input inputMode="numeric" value={d.waitDays} onChange={(e) => set({ waitDays: e.target.value })} />
            </label>
            <label>
              <span>Payout schedule label</span>
              <input value={d.schedule} onChange={(e) => set({ schedule: e.target.value })} placeholder="e.g. Weekly" maxLength={40} />
            </label>
            <label>
              <span>Starts</span>
              <input type="date" value={d.from} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label>
              <span>Ends</span>
              <input type="date" value={d.to} onChange={(e) => set({ to: e.target.value })} />
            </label>
          </div>
          <p className="mpa-hint">
            The schedule label is shown to sellers when Stripe doesn't report one. Stripe always decides the real bank payout timing.
          </p>
        </fieldset>
      )}

      <div className="mpa-actions">
        <button type="submit" className="mpa-btn mpa-btn--primary" disabled={saving}>
          {saving && <Loader2 size={16} className="mpa-spin" />} Save
        </button>
        <button type="button" className="mpa-btn mpa-btn--ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function PlansView({ mode }: { mode: "fees" | "plans" }) {
  const [showArchived, setShowArchived] = useState(false);
  const plans = useLoad<PayoutPlan[]>(() => apiClient.plans(showArchived), [showArchived]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [msg, setMsg] = useState({ error: "", success: "" });

  async function run(action: () => Promise<unknown>, success: string) {
    setMsg({ error: "", success: "" });
    try {
      await action();
      setMsg({ error: "", success });
      await plans.reload();
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : "Something went wrong.", success: "" });
    }
  }

  const editingPlan = plans.data?.find((p) => p._id === editing);

  return (
    <section className="mpa-panel">
      <header className="mpa-head mpa-head--row">
        <div>
          <h1>{mode === "fees" ? "Early Payout Fee Management" : "Seller Payout Plans"}</h1>
          <p>
            {mode === "fees"
              ? "The fee Fockis keeps when a seller asks to be paid early. Each plan has its own fee; changes apply to new requests only."
              : "Plans group fees, limits and eligibility. Stores without a plan use the default plan. Assign plans in Seller Financial Records."}
          </p>
        </div>
        {mode === "plans" && editing === null && (
          <button type="button" className="mpa-btn mpa-btn--primary" onClick={() => setEditing("new")}>
            + New plan
          </button>
        )}
      </header>
      <Notice error={plans.error || msg.error} success={msg.success} />

      {editing === "new" && (
        <PlanEditor
          initial={EMPTY_DRAFT}
          mode="plans"
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            await apiClient.createPlan(input);
            setEditing(null);
            setMsg({ error: "", success: "Plan created." });
            await plans.reload();
          }}
        />
      )}
      {editingPlan && (
        <PlanEditor
          initial={draftFrom(editingPlan)}
          mode={mode}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            await apiClient.updatePlan(editingPlan._id, mode === "fees" ? { earlyPayout: input.earlyPayout } : input);
            setEditing(null);
            setMsg({ error: "", success: "Saved. New early payouts use the new settings; past ones keep theirs." });
            await plans.reload();
          }}
        />
      )}

      {plans.loading && !plans.data ? (
        <Busy />
      ) : plans.data && plans.data.length === 0 ? (
        <div className="mpa-empty">
          <p>No payout plans yet. Until one exists, sellers can't request early payouts.</p>
          {mode === "fees" && <NavLink to={`${BASE}/plans`}>Create the first plan →</NavLink>}
        </div>
      ) : (
        <div className="mpa-table-wrap">
          <table className="mpa-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Early payout fee</th>
                {mode === "plans" && <th>Limits</th>}
                {mode === "plans" && <th>Stores</th>}
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(plans.data ?? []).map((plan) => (
                <tr key={plan._id}>
                  <td>
                    <b>{plan.name}</b>
                    {plan.isDefault && <span className="mpa-tag mpa-tag--blue">Default</span>}
                    <small className="mpa-sub">
                      {plan.currency.toUpperCase()} · v{plan.version}
                      {plan.effectiveFrom || plan.effectiveTo
                        ? ` · ${plan.effectiveFrom ? formatDate(plan.effectiveFrom) : "…"} – ${plan.effectiveTo ? formatDate(plan.effectiveTo) : "…"}`
                        : ""}
                    </small>
                  </td>
                  <td>{feeText(plan)}</td>
                  {mode === "plans" && (
                    <td>
                      <small>
                        {money(plan.minPayoutCents, plan.currency)} – {plan.maxPayoutCents === null ? "no max" : money(plan.maxPayoutCents, plan.currency)}
                        <br />
                        wait {plan.waitDaysAfterPayment} day{plan.waitDaysAfterPayment === 1 ? "" : "s"}
                      </small>
                    </td>
                  )}
                  {mode === "plans" && <td>{plan.assignedStores ?? 0}</td>}
                  <td>
                    <span className={`mpa-tag mpa-tag--${plan.status}`}>{plan.status}</span>
                  </td>
                  <td>
                    <div className="mpa-row-actions">
                    {plan.status !== "archived" && (
                      <button type="button" className="mpa-btn mpa-btn--soft" onClick={() => setEditing(plan._id)}>
                        {mode === "fees" ? "Edit fee" : "Edit"}
                      </button>
                    )}
                    {mode === "fees" && plan.status === "active" && (
                      <button
                        type="button"
                        className="mpa-btn mpa-btn--ghost"
                        onClick={() =>
                          void run(
                            () => apiClient.updatePlan(plan._id, { earlyPayout: { ...plan.earlyPayout, enabled: !plan.earlyPayout.enabled } }),
                            plan.earlyPayout.enabled ? "Early payout turned off for this plan." : "Early payout turned on for this plan.",
                          )
                        }
                      >
                        {plan.earlyPayout.enabled ? "Turn off" : "Turn on"}
                      </button>
                    )}
                    {mode === "plans" && plan.status === "active" && !plan.isDefault && (
                      <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => void run(() => apiClient.makeDefault(plan._id), "Default plan changed.")}>
                        Make default
                      </button>
                    )}
                    {mode === "plans" && !plan.isDefault && plan.status === "active" && (
                      <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => void run(() => apiClient.setPlanStatus(plan._id, "inactive"), "Plan deactivated.")}>
                        Deactivate
                      </button>
                    )}
                    {mode === "plans" && plan.status === "inactive" && (
                      <>
                        <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => void run(() => apiClient.setPlanStatus(plan._id, "active"), "Plan activated.")}>
                          Activate
                        </button>
                        <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => void run(() => apiClient.setPlanStatus(plan._id, "archived"), "Plan archived. Its history is kept.")}>
                          Archive
                        </button>
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === "plans" && (
        <label className="mpa-check mpa-check--small">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived plans
        </label>
      )}
    </section>
  );
}

/* ============================= Holds ===================================== */

function StorePicker({ value, onPick }: { value: StoreRow | null; onPick: (store: StoreRow | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StoreRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setResults(await apiClient.stores(q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <div className="mpa-picked">
        <b>{value.name || value.slug || value.id}</b> <small>{value.id}</small>
        <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => onPick(null)}>
          Change
        </button>
      </div>
    );
  }
  return (
    <div className="mpa-picker">
      <div className="mpa-search">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Store name, slug or ID"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button type="button" className="mpa-btn mpa-btn--soft" onClick={() => void search()} disabled={busy}>
          {busy ? <Loader2 size={14} className="mpa-spin" /> : "Search"}
        </button>
      </div>
      <Notice error={error} />
      {results.length > 0 && (
        <ul className="mpa-results">
          {results.map((store) => (
            <li key={store.id}>
              <button type="button" onClick={() => onPick(store)}>
                <b>{store.name || store.slug}</b>
                <small>
                  {store.id} · {store.stripeConnected ? (store.transfersActive ? "Stripe ready" : "Stripe not finished") : "No Stripe"}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HoldsView() {
  const [params] = useSearchParams();
  const [filter, setFilter] = useState({ status: "active", reason: "", storeId: params.get("storeId") ?? "" });
  const holds = useLoad<PayoutHold[]>(
    () => apiClient.holds(Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) as Record<string, string>),
    [filter.status, filter.reason, filter.storeId],
  );
  const reasons = useLoad<HoldReasonOption[]>(() => apiClient.holdReasons(), []);
  const reasonLabel = (value: string) => reasons.data?.find((r) => r.value === value)?.label ?? value;

  const [creating, setCreating] = useState(false);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [form, setForm] = useState({ scope: "store" as "store" | "order", orderId: "", orderNumber: "", amount: "", reason: "identity_verification", message: "", reviewBy: "", note: "" });
  const [msg, setMsg] = useState({ error: "", success: "" });
  const [busyId, setBusyId] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!store) return setMsg({ error: "Choose a store.", success: "" });
    const amountCents = toCents(form.amount);
    if (Number.isNaN(amountCents)) return setMsg({ error: "The amount must be a number like 300.00.", success: "" });
    setMsg({ error: "", success: "" });
    try {
      await apiClient.createHold({
        storeId: store.id,
        scope: form.scope,
        orderId: form.scope === "order" ? form.orderId.trim() : undefined,
        orderNumber: form.scope === "order" ? form.orderNumber.trim() : undefined,
        amountCents,
        reason: form.reason,
        sellerMessage: form.message,
        reviewBy: form.reviewBy || null,
        note: form.note,
      });
      setCreating(false);
      setStore(null);
      setMsg({ error: "", success: "Hold placed. The seller sees it on their Payouts page." });
      await holds.reload();
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : "Could not place the hold.", success: "" });
    }
  }

  async function act(id: string, action: () => Promise<unknown>, success: string) {
    setBusyId(id);
    setMsg({ error: "", success: "" });
    try {
      const result = await action();
      setMsg({ error: "", success: typeof result === "string" ? result : success });
      await holds.reload();
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : "Something went wrong.", success: "" });
    } finally {
      setBusyId("");
    }
  }

  const activeTotal = (holds.data ?? []).filter((h) => h.status === "active").length;

  return (
    <section className="mpa-panel">
      <header className="mpa-head mpa-head--row">
        <div>
          <h1>Payment Holds &amp; Verification</h1>
          <p>
            A hold stops Fockis from sending a seller's money to their Stripe account until it is released. It can't pull back money already sent.
          </p>
        </div>
        {!creating && (
          <button type="button" className="mpa-btn mpa-btn--primary" onClick={() => setCreating(true)}>
            <Lock size={16} /> Place a hold
          </button>
        )}
      </header>
      <Notice error={holds.error || msg.error} success={msg.success} />

      {creating && (
        <form className="mpa-form mpa-editor" onSubmit={create}>
          <label>
            <span>Store</span>
            <StorePicker value={store} onPick={setStore} />
          </label>
          <div className="mpa-grid">
            <label>
              <span>What to hold</span>
              <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as "store" | "order" })}>
                <option value="store">All of this store's sales</option>
                <option value="order">One order</option>
              </select>
            </label>
            {form.scope === "order" && (
              <>
                <label>
                  <span>Order ID</span>
                  <input value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} required />
                </label>
                <label>
                  <span>Order number (shown to seller)</span>
                  <input value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} />
                </label>
              </>
            )}
            <label>
              <span>Amount to hold</span>
              <div className="mpa-prefix">
                <span>$</span>
                <input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Everything" />
              </div>
            </label>
            <label>
              <span>Reason</span>
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {(reasons.data ?? []).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.value.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Review by</span>
              <input type="date" value={form.reviewBy} onChange={(e) => setForm({ ...form, reviewBy: e.target.value })} />
            </label>
            <label className="mpa-span2">
              <span>Message to the seller (optional)</span>
              <input value={form.message} maxLength={300} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="e.g. Please upload your ID in Stripe." />
            </label>
            <label className="mpa-span2">
              <span>Internal note (admins only)</span>
              <textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
          </div>
          <p className="mpa-hint">
            With an amount, Fockis keeps at least that much of the store's unpaid money; the rest can still be paid. Without an amount, nothing in scope is paid.
          </p>
          <div className="mpa-actions">
            <button type="submit" className="mpa-btn mpa-btn--primary">Place hold</button>
            <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mpa-filters">
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} aria-label="Status">
          <option value="active">Active</option>
          <option value="released">Released</option>
          <option value="">All</option>
        </select>
        <select value={filter.reason} onChange={(e) => setFilter({ ...filter, reason: e.target.value })} aria-label="Reason">
          <option value="">All reasons</option>
          {(reasons.data ?? []).map((r) => (
            <option key={r.value} value={r.value}>
              {r.value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input value={filter.storeId} onChange={(e) => setFilter({ ...filter, storeId: e.target.value.trim() })} placeholder="Store ID" aria-label="Store ID" />
        <span className="mpa-count">{holds.data ? `${holds.data.length} shown · ${activeTotal} active` : ""}</span>
      </div>

      {holds.loading && !holds.data ? (
        <Busy />
      ) : !holds.data?.length ? (
        <div className="mpa-empty">
          <p>No holds match.</p>
        </div>
      ) : (
        <div className="mpa-hold-list">
          {holds.data.map((hold) => (
            <HoldCard
              key={hold._id}
              hold={hold}
              reasonLabel={reasonLabel(hold.reason)}
              busy={busyId === hold._id}
              onRelease={(note) =>
                void act(hold._id, async () => {
                  const res = await apiClient.releaseHold(hold._id, note);
                  const paid = res.released.filter((r) => r.status === "paid_out").length;
                  return `Hold released.${paid ? ` ${paid} held sale${paid === 1 ? " was" : "s were"} paid out.` : ""}`;
                }, "Hold released.")
              }
              onExtend={(date, note) => void act(hold._id, () => apiClient.extendHold(hold._id, date, note), "Review date extended.")}
              onNote={(note) => void act(hold._id, () => apiClient.noteHold(hold._id, note), "Note added.")}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HoldCard({
  hold,
  reasonLabel,
  busy,
  onRelease,
  onExtend,
  onNote,
}: {
  hold: PayoutHold;
  reasonLabel: string;
  busy: boolean;
  onRelease: (note: string) => void;
  onExtend: (date: string, note: string) => void;
  onNote: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const overdue = hold.status === "active" && hold.reviewBy && new Date(hold.reviewBy) < new Date();

  return (
    <article className={`mpa-hold${hold.status === "active" ? " is-active" : ""}`}>
      <header>
        <span className={`mpa-tag mpa-tag--${hold.status === "active" ? "held" : "active"}`}>{hold.status}</span>
        <b>{reasonLabel}</b>
        <span className="mpa-hold__amount">
          <Lock size={13} /> {hold.amountCents ? money(hold.amountCents, hold.currency) : "All money in scope"}
        </span>
      </header>
      <dl>
        <div>
          <dt>Store</dt>
          <dd>
            <NavLink to={`${BASE}/sellers?storeId=${hold.storeId}`}>{hold.storeId}</NavLink>
          </dd>
        </div>
        <div>
          <dt>Scope</dt>
          <dd>{hold.scope === "order" ? `Order ${hold.orderNumber || hold.orderId}` : "Whole store"}</dd>
        </div>
        <div>
          <dt>Placed</dt>
          <dd>
            {formatDate(hold.createdAt)} by {hold.createdBy}
          </dd>
        </div>
        <div>
          <dt>Review by</dt>
          <dd className={overdue ? "mpa-overdue" : ""}>{formatDate(hold.reviewBy)}{overdue ? " (overdue)" : ""}</dd>
        </div>
        {hold.status === "released" && (
          <div>
            <dt>Released</dt>
            <dd>
              {formatDate(hold.releasedAt)} by {hold.releasedBy}
            </dd>
          </div>
        )}
        {hold.sellerMessage && (
          <div className="mpa-span2">
            <dt>Seller sees</dt>
            <dd>{hold.sellerMessage}</dd>
          </div>
        )}
      </dl>
      <details>
        <summary>History ({hold.history.length})</summary>
        <ul className="mpa-log">
          {hold.history.map((h, i) => (
            <li key={i}>
              <b>{formatDate(h.at, true)}</b> {h.action} by {h.by}
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ul>
      </details>
      {hold.status === "active" && (
        <div className="mpa-hold__actions">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
          <button type="button" className="mpa-btn mpa-btn--primary" disabled={busy} onClick={() => onRelease(note)}>
            {busy ? <Loader2 size={14} className="mpa-spin" /> : null} Release
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="New review date" />
          <button type="button" className="mpa-btn mpa-btn--soft" disabled={busy || !date} onClick={() => onExtend(date, note)}>
            Extend
          </button>
          <button type="button" className="mpa-btn mpa-btn--ghost" disabled={busy || !note.trim()} onClick={() => { onNote(note); setNote(""); }}>
            Add note
          </button>
        </div>
      )}
    </article>
  );
}

/* ============================= Sellers =================================== */

function SellersView() {
  const [params, setParams] = useSearchParams();
  const storeId = params.get("storeId") ?? "";
  const [picked, setPicked] = useState<StoreRow | null>(null);
  const record = useLoad<StoreRecord | null>(() => (storeId ? apiClient.storeRecord(storeId) : Promise.resolve(null)), [storeId]);
  const plans = useLoad<PayoutPlan[]>(() => apiClient.plans(), []);
  const [planChoice, setPlanChoice] = useState("");
  const [msg, setMsg] = useState({ error: "", success: "" });

  useEffect(() => {
    if (record.data?.plan?.source === "assigned") setPlanChoice(record.data.plan.id);
    else setPlanChoice("");
  }, [record.data]);

  async function assign() {
    setMsg({ error: "", success: "" });
    try {
      await apiClient.assignPlan(storeId, planChoice || null);
      setMsg({ error: "", success: planChoice ? "Plan assigned." : "Store now uses the default plan." });
      await record.reload();
    } catch (err) {
      setMsg({ error: err instanceof Error ? err.message : "Could not assign.", success: "" });
    }
  }

  const r = record.data;
  const t = r?.totals;
  const c = r?.currency ?? "usd";

  return (
    <section className="mpa-panel">
      <header className="mpa-head">
        <h1>Seller Financial Records</h1>
        <p>Find a store to see its Stripe status, plan, balances, holds, early payouts and every sale.</p>
      </header>
      <StorePicker
        value={picked && picked.id === storeId ? picked : null}
        onPick={(store) => {
          setPicked(store);
          setParams(store ? { storeId: store.id } : {});
        }}
      />
      <Notice error={record.error || msg.error} success={msg.success} />
      {storeId && record.loading && <Busy />}
      {r && t && (
        <>
          <div className="mpa-record-head">
            <h2>{r.store.name || r.store.id}</h2>
            <span className={`mpa-tag mpa-tag--${r.account.ready ? "active" : r.account.connected ? "inactive" : "archived"}`}>
              {r.account.ready ? "Stripe ready" : r.account.connected ? "Stripe not finished" : "No Stripe account"}
            </span>
            <NavLink className="mpa-btn mpa-btn--soft" to={`${BASE}/holds?storeId=${r.store.id}`}>
              <Lock size={14} /> Holds
            </NavLink>
          </div>
          <div className="mpa-stats mpa-stats--small">
            {(
              [
                ["Sales", t.salesCents],
                ["Fockis commission", t.commissionCents],
                ["Seller earnings", t.earningsCents],
                ["Available", t.availableCents],
                ["Pending", t.pendingCents],
                ["Held", t.heldCents],
                ["Sent to Stripe", t.transferredCents],
                ["Early payout fees", t.earlyFeesCents],
                ["Refunded / cancelled", t.refundedCents],
              ] as Array<[string, number]>
            ).map(([label, cents]) => (
              <div className={`mpa-stat${label === "Held" && cents ? " mpa-stat--warn" : ""}`} key={label}>
                <span>{label}</span>
                <strong>{money(cents, c)}</strong>
              </div>
            ))}
          </div>

          <div className="mpa-subpanel mpa-assign">
            <h2>Payout plan</h2>
            <p>
              Now: <b>{r.plan?.name ?? "No plan"}</b> {r.plan ? `(${r.plan.source === "assigned" ? "assigned" : "default plan"})` : ""}
            </p>
            <div className="mpa-row">
              <select value={planChoice} onChange={(e) => setPlanChoice(e.target.value)} aria-label="Plan">
                <option value="">Use the default plan</option>
                {(plans.data ?? [])
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} — early payout {feeText(p)}
                    </option>
                  ))}
              </select>
              <button type="button" className="mpa-btn mpa-btn--primary" onClick={() => void assign()}>
                Save plan
              </button>
            </div>
          </div>

          {r.account.requirementsDue?.length > 0 && (
            <div className="mpa-subpanel">
              <h2>Stripe still needs</h2>
              <ul>
                {r.account.requirementsDue.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mpa-subpanel">
            <h2>Sales and payouts</h2>
            <div className="mpa-table-wrap">
              <table className="mpa-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order</th>
                    <th className="num">Gross</th>
                    <th className="num">Commission</th>
                    <th className="num">Seller share</th>
                    <th className="num">Early fee</th>
                    <th className="num">Net</th>
                    <th>State</th>
                    <th>Transfer</th>
                  </tr>
                </thead>
                <tbody>
                  {r.history.map((h) => (
                    <tr key={h.shipmentId}>
                      <td>{formatDate(h.date)}</td>
                      <td>{h.orderNumber}</td>
                      <td className="num">{money(h.grossCents, h.currency)}</td>
                      <td className="num">{money(h.commissionCents, h.currency)}</td>
                      <td className="num">{money(h.sellerCents, h.currency)}</td>
                      <td className="num">{h.earlyFeeCents ? money(h.earlyFeeCents, h.currency) : "—"}</td>
                      <td className="num">
                        <b>{money(h.netCents, h.currency)}</b>
                      </td>
                      <td>
                        <span className={`mpa-tag mpa-tag--state-${h.state}`}>{h.state}</span>
                      </td>
                      <td>
                        <small>{h.stripeTransferId ?? "—"}</small>
                      </td>
                    </tr>
                  ))}
                  {r.history.length === 0 && (
                    <tr>
                      <td colSpan={9} className="mpa-empty-cell">
                        No sales yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ============================= Reports =================================== */

function ReportsView() {
  const early = useLoad<EarlyRequest[]>(() => apiClient.earlyPayouts(), []);
  const audit = useLoad<AuditEntry[]>(() => apiClient.audit({ limit: "150" }), []);
  const [exportError, setExportError] = useState("");

  const totals = useMemo(() => {
    const map = new Map<string, { fee: number; net: number }>();
    for (const r of early.data ?? []) {
      const row = map.get(r.currency) ?? { fee: 0, net: 0 };
      row.fee += r.collectedFeeCents;
      row.net += r.transferredNetCents;
      map.set(r.currency, row);
    }
    return [...map.entries()];
  }, [early.data]);

  return (
    <section className="mpa-panel">
      <header className="mpa-head mpa-head--row">
        <div>
          <h1>Transactions &amp; Reports</h1>
          <p>Early payout requests with the fee rules used at the time, and the audit log of every admin change.</p>
        </div>
        <button
          type="button"
          className="mpa-btn mpa-btn--soft"
          onClick={() => {
            setExportError("");
            apiClient.downloadEarlyPayoutsCsv().catch((err) => setExportError(err instanceof Error ? err.message : "Export failed."));
          }}
        >
          <Download size={16} /> Export early payouts (CSV)
        </button>
      </header>
      <Notice error={early.error || audit.error || exportError} />

      {totals.length > 0 && (
        <div className="mpa-stats mpa-stats--small">
          {totals.map(([currency, row]) => (
            <div className="mpa-stat mpa-stat--rev" key={currency}>
              <span>Early payout fees ({currency.toUpperCase()})</span>
              <strong>{money(row.fee, currency)}</strong>
              <small>{money(row.net, currency)} sent to sellers early</small>
            </div>
          ))}
        </div>
      )}

      <div className="mpa-subpanel">
        <h2>Early payout requests</h2>
        {early.loading && !early.data ? (
          <Busy />
        ) : (
          <div className="mpa-table-wrap">
            <table className="mpa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Store</th>
                  <th>Plan</th>
                  <th className="num">Requested</th>
                  <th className="num">Fee</th>
                  <th className="num">Net</th>
                  <th className="num">Sent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(early.data ?? []).map((r) => (
                  <tr key={r._id}>
                    <td>{formatDate(r.createdAt, true)}</td>
                    <td>
                      <NavLink to={`${BASE}/sellers?storeId=${r.storeId}`}>{r.storeId}</NavLink>
                    </td>
                    <td>
                      {r.pricingSnapshot?.plan?.name ?? "—"}
                      {r.pricingSnapshot?.plan?.version ? <small> v{r.pricingSnapshot.plan.version}</small> : null}
                    </td>
                    <td className="num">{money(r.grossCents, r.currency)}</td>
                    <td className="num">{money(r.feeCents, r.currency)}</td>
                    <td className="num">{money(r.netCents, r.currency)}</td>
                    <td className="num">{money(r.transferredNetCents, r.currency)}</td>
                    <td>
                      <span className={`mpa-tag mpa-tag--req-${r.status}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
                {early.data?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="mpa-empty-cell">
                      No early payouts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mpa-subpanel">
        <h2>Audit log</h2>
        {audit.loading && !audit.data ? (
          <Busy />
        ) : (
          <ul className="mpa-log mpa-log--table">
            {(audit.data ?? []).map((entry) => (
              <li key={entry._id}>
                <b>{formatDate(entry.createdAt, true)}</b>
                <span className="mpa-tag">{entry.entity.replace(/_/g, " ")}</span>
                {entry.action.replace(/_/g, " ")} by {entry.actorUserId}
                {entry.storeId ? ` · store ${entry.storeId}` : ""}
              </li>
            ))}
            {audit.data?.length === 0 && <li>No changes recorded yet.</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
