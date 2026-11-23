/**
 * OrgPayoutsPage.tsx — /organizations/:organizationId/admin/payouts
 *
 * Where gifts to the organization go: the Fockis fee is kept, the rest is
 * sent to the organization's Stripe account on the schedule the owner picks
 * (or with "Pay out now"), and Stripe pays the bank. The owner connects
 * Stripe and manages the schedule; administrators can view. The server
 * enforces every rule.
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Banknote, CheckCircle2, ExternalLink, Loader2, PauseCircle, Save, Send, ShieldCheck } from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "../ui/OrgAppShell";
import { cents, feeText, orgPayoutsApi, WEEKDAYS, type Interval, type PayoutsOverview } from "./orgPayoutsApi";
import "../ui/fockisOrgTheme.scss";
import "./giving.scss";

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");
const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const STATE_LABELS: Record<string, string> = {
  waiting: "Waiting",
  available: "Ready",
  in_payout: "Being sent",
  paid: "Paid out",
};

const COUNTRIES: Array<[string, string]> = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["GB", "United Kingdom"],
  ["FR", "France"],
  ["DO", "Dominican Republic"],
  ["MX", "Mexico"],
  ["BR", "Brazil"],
  ["CH", "Switzerland"],
  ["AU", "Australia"],
];

interface Draft {
  interval: Interval;
  weeklyDay: number;
  monthlyDay: number;
  minimum: string;
}

export default function OrgPayoutsPage() {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const [params, setParams] = useSearchParams();
  const admin = useOrgAdmin(organizationId);
  const [data, setData] = useState<PayoutsOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [country, setCountry] = useState("US");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const apply = useCallback((r: PayoutsOverview) => {
    setData(r);
    setDraft({
      interval: r.schedule.interval,
      weeklyDay: r.schedule.weeklyDay,
      monthlyDay: r.schedule.monthlyDay,
      minimum: (r.minPayoutCents / 100).toFixed(2),
    });
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    setLoadError(null);
    // Back from Stripe onboarding: re-read the Stripe account first.
    const returning = params.get("done") === "1" || params.get("refresh") === "1";
    const load = returning ? orgPayoutsApi.refresh(organizationId) : orgPayoutsApi.overview(organizationId, controller.signal);
    load
      .then((r) => {
        apply(r);
        if (returning) {
          setParams({}, { replace: true });
          if (r.stripe.transfersActive) setToast({ tone: "ok", text: "Your Stripe account is ready to receive payouts." });
        }
      })
      .catch((err) => !controller.signal.aborted && setLoadError(errorText(err, "Payouts could not be loaded.")));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function goToStripe(kind: "connect" | "dashboard") {
    setBusy(kind);
    try {
      const { url } = kind === "connect" ? await orgPayoutsApi.connect(organizationId, country) : await orgPayoutsApi.dashboard(organizationId);
      window.location.assign(url);
    } catch (err) {
      setToast({ tone: "error", text: errorText(err, "Stripe could not be opened. Please try again.") });
      setBusy(null);
    }
  }

  async function saveSchedule() {
    if (!draft || !data) return;
    const minimum = Math.round(Number(draft.minimum) * 100);
    if (!Number.isFinite(minimum) || minimum < data.minPayoutFloorCents) {
      setToast({ tone: "error", text: `The minimum payout must be at least ${cents(data.minPayoutFloorCents, data.fee.feeCurrency)}.` });
      return;
    }
    setBusy("schedule");
    try {
      apply(await orgPayoutsApi.saveSchedule(organizationId, { interval: draft.interval, weeklyDay: draft.weeklyDay, monthlyDay: draft.monthlyDay, minPayoutCents: minimum }));
      setToast({ tone: "ok", text: "Payout schedule saved." });
    } catch (err) {
      setToast({ tone: "error", text: errorText(err, "The schedule could not be saved.") });
    } finally {
      setBusy(null);
    }
  }

  async function payNow() {
    setBusy("pay");
    try {
      const r = await orgPayoutsApi.payNow(organizationId);
      apply(r.overview);
      const sent = r.results.filter((x) => x.status === "paid");
      if (sent.length) {
        setToast({ tone: "ok", text: `Sent ${sent.map((x) => cents(x.amountCents ?? 0, x.currency ?? "usd")).join(" + ")} to your Stripe account.` });
      } else {
        setToast({ tone: "error", text: r.results.map((x) => x.message).filter(Boolean).join(" ") || "Nothing was sent." });
      }
    } catch (err) {
      setToast({ tone: "error", text: errorText(err, "The payout could not be started.") });
    } finally {
      setBusy(null);
    }
  }

  const p = (s: string) => `/organizations/${encodeURIComponent(organizationId)}${s}`;
  const ready = data?.balances.some((b) => b.availableCents > 0) ?? false;
  const owner = Boolean(data?.canManage);
  const stripeReady = Boolean(data?.stripe.connected && data.stripe.transfersActive);

  return (
    <OrgAppShell variant="admin" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={p("/admin/giving")}>
      <div className="gva">
        <header className="gva-head">
          <span className="gva-head__icon" aria-hidden="true">
            <Banknote />
          </span>
          <div>
            <h1>Payouts</h1>
            <p>Gifts given online are sent to your organization's bank account through Stripe.</p>
          </div>
          <Link to={p("/admin/giving")} className="gv-btn gv-btn--ghost">
            <ArrowLeft aria-hidden="true" /> Giving
          </Link>
        </header>

        {toast && (
          <p className={"gva-panel " + (toast.tone === "ok" ? "pay-ok" : "gv-error")} role="status">
            {toast.text}
          </p>
        )}
        {loadError && <p className="gva-panel gv-error">{loadError}</p>}
        {!loadError && !data && (
          <p className="gva-panel gv-muted">
            <Loader2 className="gv-spin" aria-hidden="true" /> Loading payouts…
          </p>
        )}

        {data && draft && (
          <>
            {data.onHold && (
              <section className="gva-panel pay-hold" role="alert">
                <PauseCircle aria-hidden="true" />
                <div>
                  <h2>Payouts are on hold</h2>
                  <p>{data.holdReason || "Fockis has paused payouts for this organization."} Gifts are still received and kept safely. Contact Fockis support for help.</p>
                </div>
              </section>
            )}

            {/* ---------------------------------------------- Stripe account */}
            <section className="gva-panel">
              <h2>Bank account (Stripe)</h2>
              {stripeReady ? (
                <div className="pay-row">
                  <p className="pay-status is-ok">
                    <CheckCircle2 aria-hidden="true" /> Your Stripe account is ready. Payouts go there, and Stripe sends them to your bank.
                  </p>
                  {owner && (
                    <button type="button" className="gv-btn gv-btn--ghost" disabled={busy !== null} onClick={() => void goToStripe("dashboard")}>
                      {busy === "dashboard" ? <Loader2 className="gv-spin" aria-hidden="true" /> : <ExternalLink aria-hidden="true" />} Open Stripe dashboard
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <p className="gv-muted">
                    {data.stripe.connected
                      ? "Stripe needs a few more details before it can send you money."
                      : "To receive gifts, connect a Stripe account. Stripe securely collects your organization's details and bank account — Fockis never sees your bank details."}
                  </p>
                  {data.stripe.requirementsDue.length > 0 && (
                    <ul className="pay-reqs">
                      {data.stripe.requirementsDue.slice(0, 8).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                  {owner ? (
                    <div className="pay-row">
                      {!data.stripe.connected && (
                        <label className="gva-field pay-country">
                          <span>Country of the bank account</span>
                          <select className="gv-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                            {COUNTRIES.map(([code, name]) => (
                              <option key={code} value={code}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button type="button" className="gv-btn gv-btn--primary" disabled={busy !== null} onClick={() => void goToStripe("connect")}>
                        {busy === "connect" ? <Loader2 className="gv-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                        {data.stripe.connected ? "Continue Stripe setup" : "Connect Stripe"}
                      </button>
                    </div>
                  ) : (
                    <p className="gv-muted">Only the organization's owner can connect the bank account.</p>
                  )}
                </>
              )}
            </section>

            {/* ---------------------------------------------- Balances */}
            <section className="gva-panel">
              <div className="pay-row">
                <h2>Balance</h2>
                {owner && (
                  <button type="button" className="gv-btn gv-btn--primary" disabled={busy !== null || !ready || !stripeReady || data.onHold} onClick={() => void payNow()}>
                    {busy === "pay" ? <Loader2 className="gv-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Pay out now
                  </button>
                )}
              </div>
              {data.balances.length === 0 ? (
                <p className="gv-muted">No gifts yet. Once people give online, you'll see what's coming to you here.</p>
              ) : (
                data.balances.map((b) => (
                  <div key={b.currency} className="gva-stats pay-stats">
                    <div className="gva-stat">
                      <span>Ready to pay out</span>
                      <b>{cents(b.availableCents, b.currency)}</b>
                    </div>
                    <div className="gva-stat">
                      <span>Waiting ({data.holdDays} days)</span>
                      <b>{cents(b.waitingCents, b.currency)}</b>
                    </div>
                    <div className="gva-stat">
                      <span>Paid out so far</span>
                      <b>{cents(b.paidCents + b.inPayoutCents, b.currency)}</b>
                    </div>
                    <div className="gva-stat">
                      <span>Fockis fees</span>
                      <b>{cents(b.feesCents, b.currency)}</b>
                    </div>
                  </div>
                ))
              )}
              <p className="gv-fineprint">
                Fockis fee: {feeText(data.fee)}. New gifts can be paid out {data.holdDays} day{data.holdDays === 1 ? "" : "s"} after they're received, which protects against card refunds and disputes. Refunded gifts are taken from the next payout.
              </p>
            </section>

            {/* ---------------------------------------------- Schedule */}
            <section className="gva-panel">
              <h2>Payout schedule</h2>
              <div className="gva-grid">
                <label className="gva-field">
                  <span>How often</span>
                  <select className="gv-input" disabled={!owner} value={draft.interval} onChange={(e) => setDraft({ ...draft, interval: e.target.value as Interval })}>
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                    <option value="manual">Only when I click "Pay out now"</option>
                  </select>
                </label>
                {draft.interval === "weekly" && (
                  <label className="gva-field">
                    <span>Day of the week</span>
                    <select className="gv-input" disabled={!owner} value={draft.weeklyDay} onChange={(e) => setDraft({ ...draft, weeklyDay: Number(e.target.value) })}>
                      {WEEKDAYS.map((d, i) => (
                        <option key={d} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {draft.interval === "monthly" && (
                  <label className="gva-field">
                    <span>Day of the month</span>
                    <select className="gv-input" disabled={!owner} value={draft.monthlyDay} onChange={(e) => setDraft({ ...draft, monthlyDay: Number(e.target.value) })}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="gva-field">
                  <span>Minimum payout</span>
                  <input className="gv-input" type="number" min={data.minPayoutFloorCents / 100} step="0.01" disabled={!owner} value={draft.minimum} onChange={(e) => setDraft({ ...draft, minimum: e.target.value })} />
                  <small>Smaller amounts wait for the next scheduled payout.</small>
                </label>
              </div>
              <p className="gv-muted">
                {data.schedule.interval === "manual" ? "Automatic payouts are off." : `Next scheduled payout: ${fmtDateTime(data.nextRunAt)}.`}
                {data.lastRunAt ? ` Last checked ${fmtDateTime(data.lastRunAt)}.` : ""}
              </p>
              {owner && (
                <button type="button" className="gv-btn gv-btn--primary" disabled={busy !== null} onClick={() => void saveSchedule()}>
                  {busy === "schedule" ? <Loader2 className="gv-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save schedule
                </button>
              )}
            </section>

            {/* ---------------------------------------------- History */}
            <section className="gva-panel">
              <h2>Payouts</h2>
              {data.payouts.length === 0 ? (
                <p className="gv-muted">No payouts yet.</p>
              ) : (
                <div className="pay-table-wrap">
                  <table className="pay-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Gifts</th>
                        <th>Fockis fee</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payouts.map((x) => (
                        <tr key={x.id}>
                          <td>{fmtDate(x.paidAt ?? x.createdAt)}</td>
                          <td>
                            <b>{cents(x.amountCents, x.currency)}</b>
                          </td>
                          <td>{x.entryCount}</td>
                          <td>{cents(x.feeCents, x.currency)}</td>
                          <td>
                            <span className={`pay-badge is-${x.status}`}>{x.status === "paid" ? "Sent" : x.status === "failed" ? "Will retry" : "Sending"}</span>
                            {x.trigger === "manual" && <small> · manual</small>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="gva-panel">
              <h2>Gifts and refunds</h2>
              {data.lines.length === 0 ? (
                <p className="gv-muted">Nothing yet.</p>
              ) : (
                <div className="pay-table-wrap">
                  <table className="pay-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Fockis fee</th>
                        <th>You receive</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lines.map((l) => (
                        <tr key={l.id} className={l.kind === "refund" ? "is-refund" : ""}>
                          <td>{fmtDate(l.createdAt)}</td>
                          <td>{l.description}</td>
                          <td>{cents(l.grossCents, l.currency)}</td>
                          <td>{cents(l.feeCents, l.currency)}</td>
                          <td>
                            <b>{cents(l.netCents, l.currency)}</b>
                          </td>
                          <td>
                            <span className={`pay-badge is-${l.state}`}>{STATE_LABELS[l.state] ?? l.state}</span>
                            {l.state === "waiting" && <small> · from {fmtDate(l.availableAt)}</small>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </OrgAppShell>
  );
}
