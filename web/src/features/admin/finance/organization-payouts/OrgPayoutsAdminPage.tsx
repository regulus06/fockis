/* ============================================================================
   Admin Center → Finance → Organization payouts

   - Default Fockis fee on money given to organizations (% + fixed, min/max),
     waiting days before money can be paid out, the "giver covers the fee"
     option and the smallest minimum payout organizations may choose.
   - Every organization: Stripe status, schedule, balances, custom fee, hold,
     "Pay out now". Recent payouts.
   Super admins only (enforced by the API).
============================================================================ */

import { useCallback, useEffect, useState } from "react";

import { money, orgPayoutsAdminApi, type FeeRules, type OrgPayoutsAdmin, type OrgRow } from "./orgPayoutsAdminApi";
import "../marketplace/MarketplacePayoutsAdmin.scss";

const errorText = (e: unknown, f: string) => (e instanceof Error && e.message ? e.message : f);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface FeeDraft {
  percent: string;
  fixed: string;
  min: string;
  max: string;
}

const toDraft = (f: FeeRules): FeeDraft => ({
  percent: String(f.percentBps / 100),
  fixed: (f.fixedCents / 100).toFixed(2),
  min: (f.minFeeCents / 100).toFixed(2),
  max: f.maxFeeCents === null ? "" : (f.maxFeeCents / 100).toFixed(2),
});

function fromDraft(d: FeeDraft): FeeRules {
  const c = (v: string) => Math.round(Number(v || 0) * 100);
  return {
    percentBps: Math.round(Number(d.percent || 0) * 100),
    fixedCents: c(d.fixed),
    minFeeCents: c(d.min),
    maxFeeCents: d.max.trim() === "" ? null : c(d.max),
  };
}

function feeLabel(f: FeeRules, currency: string) {
  const parts = [];
  if (f.percentBps) parts.push(`${f.percentBps / 100}%`);
  if (f.fixedCents) parts.push(money(f.fixedCents, currency));
  return parts.length ? parts.join(" + ") : "No fee";
}

function scheduleLabel(s: OrgRow["schedule"]) {
  if (s.interval === "weekly") return `Weekly (${DAYS[s.weeklyDay] ?? "?"})`;
  if (s.interval === "monthly") return `Monthly (day ${s.monthlyDay})`;
  if (s.interval === "daily") return "Daily";
  return "Manual";
}

function FeeFields({ value, onChange, currency }: { value: FeeDraft; onChange: (d: FeeDraft) => void; currency: string }) {
  return (
    <div className="mpa-grid">
      <label>
        Percentage of each gift (%)
        <input type="number" min={0} max={50} step="0.01" value={value.percent} onChange={(e) => onChange({ ...value, percent: e.target.value })} />
      </label>
      <label>
        Fixed amount per gift ({currency.toUpperCase()})
        <input type="number" min={0} step="0.01" value={value.fixed} onChange={(e) => onChange({ ...value, fixed: e.target.value })} />
      </label>
      <label>
        Minimum fee ({currency.toUpperCase()})
        <input type="number" min={0} step="0.01" value={value.min} onChange={(e) => onChange({ ...value, min: e.target.value })} />
      </label>
      <label>
        Maximum fee ({currency.toUpperCase()}, blank = none)
        <input type="number" min={0} step="0.01" value={value.max} onChange={(e) => onChange({ ...value, max: e.target.value })} />
      </label>
    </div>
  );
}

export default function OrgPayoutsAdminPage() {
  const [data, setData] = useState<OrgPayoutsAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fee, setFee] = useState<FeeDraft | null>(null);
  const [holdDays, setHoldDays] = useState("7");
  const [feeCurrency, setFeeCurrency] = useState("usd");
  const [cover, setCover] = useState(true);
  const [floor, setFloor] = useState("1.00");
  const [editing, setEditing] = useState<{ id: string; draft: FeeDraft } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await orgPayoutsAdminApi.overview();
      setData(r);
      setFee(toDraft(r.config.fee));
      setHoldDays(String(r.config.holdDays));
      setFeeCurrency(r.config.feeCurrency);
      setCover(r.config.coverFeeEnabled);
      setFloor((r.config.minPayoutFloorCents / 100).toFixed(2));
      setError(null);
    } catch (e) {
      setError(errorText(e, "Organization payouts could not be loaded."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
      await load();
      setNotice(ok);
    } catch (e) {
      setError(errorText(e, "That didn't work."));
    } finally {
      setBusy(null);
    }
  }

  const saveConfig = () =>
    act(
      "config",
      () =>
        orgPayoutsAdminApi.saveConfig({
          fee: fromDraft(fee!),
          feeCurrency,
          holdDays: Number(holdDays),
          coverFeeEnabled: cover,
          minPayoutFloorCents: Math.round(Number(floor) * 100),
        }),
      "Settings saved. New gifts use the new fee; gifts already received keep the fee they had.",
    );

  function hold(row: OrgRow) {
    if (row.onHold) return act(`hold-${row.organizationId}`, () => orgPayoutsAdminApi.updateOrg(row.organizationId, { onHold: false }), `Payouts released for ${row.name}.`);
    const reason = window.prompt(`Why are payouts for ${row.name} being held? (shown to the organization)`);
    if (!reason?.trim()) return;
    return act(`hold-${row.organizationId}`, () => orgPayoutsAdminApi.updateOrg(row.organizationId, { onHold: true, holdReason: reason.trim() }), `Payouts held for ${row.name}.`);
  }

  async function runNow(row: OrgRow) {
    setBusy(`run-${row.organizationId}`);
    setNotice(null);
    try {
      const r = await orgPayoutsAdminApi.runNow(row.organizationId);
      await load();
      setNotice(
        r.results
          .map((x) => (x.status === "paid" ? `Sent ${money(x.amountCents ?? 0, x.currency ?? "usd")}.` : x.message || x.status))
          .join(" "),
      );
    } catch (e) {
      setError(errorText(e, "The payout could not be started."));
    } finally {
      setBusy(null);
    }
  }

  const shell = { gridTemplateColumns: "minmax(0, 1fr)" };
  if (error && !data)
    return (
      <div className="mpa" style={shell}>
        <div className="mpa-panel">{error}</div>
      </div>
    );
  if (!data || !fee)
    return (
      <div className="mpa" style={shell}>
        <div className="mpa-panel">Loading organization payouts…</div>
      </div>
    );

  return (
    <div className="mpa" style={shell}>
    <div className="mpa-main" style={{ display: "grid", gap: 18 }}>
      <section className="mpa-panel">
        <div className="mpa-head mpa-head--row">
          <div>
            <h1>Organization payouts</h1>
            <p>
              Gifts to churches and organizations reach Fockis first. Fockis keeps its fee and sends the rest to each organization's Stripe account on the schedule the
              organization picks. Stripe then pays their bank.
            </p>
          </div>
          <span className={`mpa-tag ${data.mode === "live" ? "mpa-tag--active" : "mpa-tag--inactive"}`}>Stripe {data.mode} mode</span>
        </div>
        {error && <p className="mpa-hint" style={{ color: "var(--mpa-red)" }}>{error}</p>}
        {notice && <p className="mpa-hint">{notice}</p>}
        {data.failedPayouts > 0 && (
          <p className="mpa-hint" style={{ color: "var(--mpa-orange)" }}>
            {data.failedPayouts} recent payout{data.failedPayouts === 1 ? "" : "s"} failed and will be retried on the next run (see the list below).
          </p>
        )}
      </section>

      <section className="mpa-panel mpa-form">
        <div className="mpa-head">
          <h1 style={{ fontSize: 18 }}>Default fee and rules</h1>
          <p>Applies to every organization without a custom fee. The fee is fixed when a gift arrives, so changes only affect new gifts.</p>
        </div>
        <FeeFields value={fee} onChange={setFee} currency={feeCurrency} />
        <div className="mpa-grid">
          <label>
            Fee currency (fixed, min and max amounts)
            <input value={feeCurrency} maxLength={3} onChange={(e) => setFeeCurrency(e.target.value.toLowerCase())} />
          </label>
          <label>
            Waiting days before a gift can be paid out
            <input type="number" min={0} max={90} value={holdDays} onChange={(e) => setHoldDays(e.target.value)} />
          </label>
          <label>
            Smallest minimum payout organizations may set
            <input type="number" min={0} step="0.01" value={floor} onChange={(e) => setFloor(e.target.value)} />
          </label>
          <label className="mpa-check">
            <input type="checkbox" checked={cover} onChange={(e) => setCover(e.target.checked)} /> Let givers add the fee so the organization receives the full gift
          </label>
        </div>
        <p className="mpa-hint">
          Example: a {money(2000, feeCurrency)} gift →{" "}
          {(() => {
            const f = fromDraft(fee);
            let v = Math.floor((2000 * f.percentBps + 5000) / 10000) + f.fixedCents;
            v = Math.max(v, f.minFeeCents);
            if (f.maxFeeCents !== null) v = Math.min(v, f.maxFeeCents);
            v = Math.min(v, 2000);
            return `Fockis keeps ${money(v, feeCurrency)}, the organization receives ${money(2000 - v, feeCurrency)}. Stripe's own card fees are paid by Fockis.`;
          })()}
        </p>
        <div className="mpa-actions">
          <button type="button" className="mpa-btn mpa-btn--primary" disabled={busy !== null} onClick={() => void saveConfig()}>
            {busy === "config" ? "Saving…" : "Save settings"}
          </button>
        </div>
      </section>

      <section className="mpa-panel">
        <div className="mpa-head">
          <h1 style={{ fontSize: 18 }}>Organizations</h1>
          <p>Organizations appear here after their first gift, or once they open their Payouts page.</p>
        </div>
        {data.organizations.length === 0 ? (
          <p className="mpa-empty">No organizations yet.</p>
        ) : (
          <div className="mpa-table-wrap">
            <table className="mpa-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Stripe</th>
                  <th>Schedule</th>
                  <th>Ready / waiting</th>
                  <th>Paid out</th>
                  <th>Fee</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.organizations.map((row) => (
                  <tr key={row.organizationId}>
                    <td>
                      <strong>{row.name}</strong>
                      {row.onHold && (
                        <div>
                          <span className="mpa-tag mpa-tag--held">On hold</span> <small>{row.holdReason}</small>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`mpa-tag ${row.transfersActive && row.connected ? "mpa-tag--active" : "mpa-tag--inactive"}`}>
                        {row.connected ? (row.transfersActive ? "Ready" : "Setup unfinished") : "Not connected"}
                      </span>
                    </td>
                    <td>
                      {scheduleLabel(row.schedule)}
                      <div>
                        <small>Next: {row.schedule.interval === "manual" ? "—" : fmt(row.nextRunAt)}</small>
                      </div>
                    </td>
                    <td>
                      {row.balances.length === 0
                        ? "—"
                        : row.balances.map((b) => (
                            <div key={b.currency}>
                              {money(b.availableCents, b.currency)} <small>/ {money(b.waitingCents, b.currency)}</small>
                            </div>
                          ))}
                    </td>
                    <td>
                      {row.balances.map((b) => (
                        <div key={b.currency}>
                          {money(b.paidCents, b.currency)} <small>fees {money(b.feesCents, b.currency)}</small>
                        </div>
                      ))}
                    </td>
                    <td>
                      {row.feeOverride ? (
                        <>
                          <span className="mpa-tag mpa-tag--blue">Custom</span> {feeLabel(row.feeOverride, data.config.feeCurrency)}
                        </>
                      ) : (
                        <small>Default</small>
                      )}
                    </td>
                    <td>
                      <div className="mpa-row-actions">
                        <button type="button" className="mpa-btn mpa-btn--soft" disabled={busy !== null} onClick={() => setEditing({ id: row.organizationId, draft: toDraft(row.feeOverride ?? data.config.fee) })}>
                          Fee
                        </button>
                        <button type="button" className="mpa-btn mpa-btn--ghost" disabled={busy !== null} onClick={() => void hold(row)}>
                          {row.onHold ? "Release" : "Hold"}
                        </button>
                        <button
                          type="button"
                          className="mpa-btn mpa-btn--primary"
                          disabled={busy !== null || row.onHold || !row.transfersActive || !row.balances.some((b) => b.availableCents > 0)}
                          onClick={() => void runNow(row)}
                        >
                          {busy === `run-${row.organizationId}` ? "Sending…" : "Pay out now"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editing && (
          <div className="mpa-subpanel mpa-form">
            <strong>Custom fee for {data.organizations.find((o) => o.organizationId === editing.id)?.name}</strong>
            <FeeFields value={editing.draft} onChange={(d) => setEditing({ ...editing, draft: d })} currency={data.config.feeCurrency} />
            <div className="mpa-actions">
              <button
                type="button"
                className="mpa-btn mpa-btn--primary"
                disabled={busy !== null}
                onClick={() => void act("fee", () => orgPayoutsAdminApi.updateOrg(editing.id, { feeOverride: fromDraft(editing.draft) }), "Custom fee saved.").then(() => setEditing(null))}
              >
                Save custom fee
              </button>
              <button
                type="button"
                className="mpa-btn mpa-btn--soft"
                disabled={busy !== null}
                onClick={() => void act("fee", () => orgPayoutsAdminApi.updateOrg(editing.id, { feeOverride: null }), "This organization now uses the default fee.").then(() => setEditing(null))}
              >
                Use default fee
              </button>
              <button type="button" className="mpa-btn mpa-btn--ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mpa-panel">
        <div className="mpa-head">
          <h1 style={{ fontSize: 18 }}>Recent payouts</h1>
        </div>
        {data.recentPayouts.length === 0 ? (
          <p className="mpa-empty">No payouts yet.</p>
        ) : (
          <div className="mpa-table-wrap">
            <table className="mpa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Organization</th>
                  <th>Amount</th>
                  <th>Fockis fee</th>
                  <th>Gifts</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayouts.map((p) => (
                  <tr key={p.id}>
                    <td>{fmt(p.paidAt ?? p.createdAt)}</td>
                    <td>{p.name}</td>
                    <td>{money(p.amountCents, p.currency)}</td>
                    <td>{money(p.feeCents, p.currency)}</td>
                    <td>{p.entryCount}</td>
                    <td>
                      <span className={`mpa-tag ${p.status === "paid" ? "mpa-tag--active" : p.status === "failed" ? "mpa-tag--archived" : "mpa-tag--inactive"}`}>{p.status}</span>
                      {p.failureMessage && (
                        <div>
                          <small>{p.failureMessage}</small>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
