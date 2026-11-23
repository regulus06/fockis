/**
 * GivingAdminPage.tsx — /organizations/:organizationId/admin/giving
 *
 * Church administrators turn Give Online on or off, choose the currency and
 * funds (Tithe, Offering, Building fund…), set suggested amounts and messages,
 * and see the gifts received with totals. Who may open it is decided by the
 * server (owner, administrators / pastors, "manage settings" permission).
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Banknote, Download, ExternalLink, HandHeart, Loader2, Plus, Save, Trash2 } from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "../ui/OrgAppShell";
import GivingQrCard from "./GivingQrCard";
import { givingApi, money, type GivingAdmin, type GivingFund, type Total } from "./givingApi";
import "../ui/fockisOrgTheme.scss";
import "./giving.scss";

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
const totalText = (list: Total[]) => (list.length ? list.map((t) => money(t.total, t.currency)).join(" · ") : "—");
const countOf = (list: Total[]) => list.reduce((n, t) => n + t.count, 0);

interface Draft {
  enabled: boolean;
  currency: string;
  funds: GivingFund[];
  suggested: string;
  message: string;
  thankYouMessage: string;
}

export default function GivingAdminPage() {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const admin = useOrgAdmin(organizationId);
  const [data, setData] = useState<GivingAdmin | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ fund: "", from: "", to: "" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const controller = new AbortController();
    setLoadError(null);
    givingApi
      .admin(organizationId, { fund: filters.fund || undefined, from: filters.from || undefined, to: filters.to || undefined }, controller.signal)
      .then((r) => {
        setData(r);
        setDraft((d) =>
          d ?? {
            enabled: r.settings.enabled,
            currency: r.settings.currency,
            funds: r.settings.funds.map((f) => ({ ...f, active: f.active !== false })),
            suggested: r.settings.suggestedAmounts.join(", "),
            message: r.settings.message,
            thankYouMessage: r.settings.thankYouMessage,
          },
        );
      })
      .catch((err) => !controller.signal.aborted && setLoadError(errorText(err, "Giving could not be loaded.")));
    return () => controller.abort();
  }, [organizationId, filters, tick]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const dirty = useMemo(() => {
    if (!data || !draft) return false;
    const s = data.settings;
    return (
      draft.enabled !== s.enabled ||
      draft.currency !== s.currency ||
      draft.message !== s.message ||
      draft.thankYouMessage !== s.thankYouMessage ||
      draft.suggested !== s.suggestedAmounts.join(", ") ||
      JSON.stringify(draft.funds) !== JSON.stringify(s.funds.map((f) => ({ ...f, active: f.active !== false })))
    );
  }, [data, draft]);

  async function save(next?: Partial<Draft>) {
    if (!draft) return;
    const d = { ...draft, ...next };
    const suggestedAmounts = d.suggested
      .split(/[,\s]+/)
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n >= 1);
    setSaving(true);
    try {
      const saved = await givingApi.saveSettings(organizationId, {
        enabled: d.enabled,
        currency: d.currency,
        funds: d.funds.filter((f) => f.label.trim()),
        suggestedAmounts,
        message: d.message,
        thankYouMessage: d.thankYouMessage,
      });
      setDraft({
        enabled: saved.enabled,
        currency: saved.currency,
        funds: saved.funds.map((f) => ({ ...f, active: f.active !== false })),
        suggested: saved.suggestedAmounts.join(", "),
        message: saved.message,
        thankYouMessage: saved.thankYouMessage,
      });
      setData((cur) => (cur ? { ...cur, settings: saved } : cur));
      setToast({ tone: "ok", text: next?.enabled !== undefined ? (saved.enabled ? "Online giving is on." : "Online giving is off.") : "Giving settings saved." });
    } catch (err) {
      setToast({ tone: "error", text: errorText(err, "The settings could not be saved.") });
    } finally {
      setSaving(false);
    }
  }

  async function refundGift(g: GivingAdmin["items"][number]) {
    const reason = window.prompt(
      `Refund ${money(g.amount + (g.coverFee ?? 0), g.currency)} to ${g.anonymous ? "this giver" : g.giverName || "this giver"}?\n\nThe full amount goes back to their card. This can't be undone. Reason (shown in your records):`,
      g.refundRequestReason || "",
    );
    if (reason === null) return;
    setRefunding(g.id);
    try {
      const updated = await givingApi.refund(organizationId, g.id, reason.trim());
      setData((cur) => (cur ? { ...cur, items: cur.items.map((x) => (x.id === g.id ? { ...x, ...updated } : x)) } : cur));
      setToast({ tone: "ok", text: "The gift was refunded. The giver has been notified." });
      setTick((t) => t + 1);
    } catch (err) {
      setToast({ tone: "error", text: errorText(err, "The gift could not be refunded.") });
    } finally {
      setRefunding(null);
    }
  }

  function setFund(i: number, patch: Partial<GivingFund>) {
    setDraft((d) => (d ? { ...d, funds: d.funds.map((f, j) => (j === i ? { ...f, ...patch } : f)) } : d));
  }

  function exportCsv() {
    if (!data) return;
    const rows = [["Date", "Giver", "Fund", "Amount", "Currency", "Receipt", "Note"]];
    for (const g of data.items) rows.push([g.paidAt?.slice(0, 10) ?? "", g.anonymous ? "Anonymous" : g.giverName, g.fundLabel, g.amount.toFixed(2), g.currency, g.receiptNumber, g.status === "refunded" ? `REFUNDED. ${g.note}` : g.note]);
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `giving-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const p = (s: string) => `/organizations/${encodeURIComponent(organizationId)}${s}`;
  const denied = admin.allowed === false || /administrators can manage giving/i.test(loadError ?? "");

  return (
    <OrgAppShell variant="admin" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={p("/admin/giving")}>
      <div className="gva">
        <header className="gva-head">
          <span className="gva-head__icon" aria-hidden="true">
            <HandHeart />
          </span>
          <div>
            <h1>Giving</h1>
            <p>Tithes, offerings and special gifts given online through your church website.</p>
          </div>
          <Link to={p("/admin/payouts")} className="gv-btn gv-btn--ghost">
            <Banknote aria-hidden="true" /> Payouts
          </Link>
          <Link to={`${p("")}#give`} className="gv-btn gv-btn--ghost">
            <ExternalLink aria-hidden="true" /> View on website
          </Link>
        </header>

        {denied && <p className="gva-panel gv-error">{loadError ?? "Only church administrators can manage giving."}</p>}
        {!denied && loadError && <p className="gva-panel gv-error">{loadError}</p>}
        {!denied && !loadError && (!data || !draft) && (
          <p className="gva-panel gv-muted">
            <Loader2 className="gv-spin" aria-hidden="true" /> Loading giving…
          </p>
        )}

        {!denied && data && draft && (
          <>
            <section className={"gva-panel gva-switch" + (data.settings.enabled ? " is-on" : "")}>
              <div>
                <h2>Online giving is {data.settings.enabled ? "on" : "off"}</h2>
                <p>
                  {data.settings.enabled
                    ? "Visitors can give by card from the Give Online section of your website. Givers must be signed in to Fockis."
                    : "Your website shows Give Online, but the button only points people to your contact details until you turn this on."}
                </p>
              </div>
              <button type="button" role="switch" aria-checked={data.settings.enabled} className={"gva-toggle" + (data.settings.enabled ? " is-on" : "")} disabled={saving} onClick={() => void save({ enabled: !data.settings.enabled })}>
                <span />
                <b>{data.settings.enabled ? "On" : "Off"}</b>
              </button>
            </section>

            <section className="gva-stats" aria-label="Totals">
              {[
                ["This month", data.summary.thisMonth],
                ["This year", data.summary.thisYear],
                ["All time", data.summary.allTime],
              ].map(([label, list]) => (
                <div key={label as string} className="gva-panel gva-stat">
                  <span>{label as string}</span>
                  <b>{totalText(list as Total[])}</b>
                  <small>{countOf(list as Total[]) === 1 ? "1 gift" : `${countOf(list as Total[])} gifts`}</small>
                </div>
              ))}
            </section>

            <GivingQrCard organizationId={organizationId} funds={data.settings.funds} enabled={data.settings.enabled} />

            <section className="gva-panel">
              <h2>Settings</h2>
              <div className="gva-grid">
                <label className="gva-field">
                  <span>Currency</span>
                  <select className="gv-input" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                    {data.currencies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <small>Gifts are charged in this currency.</small>
                </label>
                <label className="gva-field">
                  <span>Suggested amounts</span>
                  <input className="gv-input" value={draft.suggested} onChange={(e) => setDraft({ ...draft, suggested: e.target.value })} placeholder="10, 25, 50, 100" />
                  <small>Up to 6, separated by commas.</small>
                </label>
              </div>

              <div className="gva-field">
                <span>Funds givers can choose</span>
                <ul className="gva-funds">
                  {draft.funds.map((f, i) => (
                    <li key={i}>
                      <input className="gv-input" value={f.label} maxLength={60} placeholder="Fund name" aria-label={`Fund ${i + 1} name`} onChange={(e) => setFund(i, { label: e.target.value })} />
                      <input className="gv-input" value={f.description} maxLength={200} placeholder="Short description (optional)" aria-label={`Fund ${i + 1} description`} onChange={(e) => setFund(i, { description: e.target.value })} />
                      <label className="gv-check gv-check--inline">
                        <input type="checkbox" checked={f.active !== false} onChange={(e) => setFund(i, { active: e.target.checked })} /> Available
                      </label>
                      <button type="button" className="gva-icon" aria-label={`Remove ${f.label || "fund"}`} onClick={() => setDraft({ ...draft, funds: draft.funds.filter((_, j) => j !== i) })}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                {draft.funds.length < 12 && (
                  <button type="button" className="gv-btn gv-btn--ghost gv-btn--sm" onClick={() => setDraft({ ...draft, funds: [...draft.funds, { key: "", label: "", description: "", active: true }] })}>
                    <Plus aria-hidden="true" /> Add fund
                  </button>
                )}
                <small>Turning a fund off hides it from givers; its past gifts stay in your records.</small>
              </div>

              <label className="gva-field">
                <span>Message on the giving form (optional)</span>
                <textarea className="gv-input" rows={2} maxLength={600} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="e.g. Thank you for supporting the ministry of our church." />
              </label>
              <label className="gva-field">
                <span>Thank-you message after giving (optional)</span>
                <textarea className="gv-input" rows={2} maxLength={400} value={draft.thankYouMessage} onChange={(e) => setDraft({ ...draft, thankYouMessage: e.target.value })} placeholder="e.g. God bless you for your generosity!" />
              </label>

              <div className="gv-row">
                <button type="button" className="gv-btn gv-btn--primary" disabled={saving || !dirty} onClick={() => void save()}>
                  {saving ? <Loader2 className="gv-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save settings
                </button>
              </div>
            </section>

            <section className="gva-panel">
              <div className="gva-listhead">
                <h2>Gifts received</h2>
                <div className="gva-filters">
                  <select className="gv-input" value={filters.fund} onChange={(e) => setFilters({ ...filters, fund: e.target.value })} aria-label="Fund">
                    <option value="">All funds</option>
                    {data.settings.funds.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <input className="gv-input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} aria-label="From" />
                  <input className="gv-input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} aria-label="To" />
                  <button type="button" className="gv-btn gv-btn--ghost gv-btn--sm" onClick={exportCsv} disabled={data.items.length === 0}>
                    <Download aria-hidden="true" /> CSV
                  </button>
                  <button type="button" className="gv-btn gv-btn--ghost gv-btn--sm" onClick={() => setTick((t) => t + 1)}>
                    Refresh
                  </button>
                </div>
              </div>

              {data.summary.byFund.length > 0 && (
                <ul className="gva-byfund">
                  {data.summary.byFund.map((f) => (
                    <li key={f.fundKey + f.currency}>
                      <span>{f.fundLabel}</span>
                      <b>{money(f.total, f.currency)}</b>
                      <small>{f.count === 1 ? "1 gift" : `${f.count} gifts`}</small>
                    </li>
                  ))}
                </ul>
              )}

              {data.items.length === 0 ? (
                <p className="gv-muted">{data.settings.enabled ? "No gifts for these filters yet." : "No gifts yet. Turn on online giving to start receiving gifts."}</p>
              ) : (
                <div className="gva-tablewrap">
                  <table className="gva-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Giver</th>
                        <th>Fund</th>
                        <th className="gva-num">Amount</th>
                        <th>Receipt</th>
                        <th>Note</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((g) => (
                        <tr key={g.id}>
                          <td>{fmtDate(g.paidAt)}</td>
                          <td>{g.anonymous ? <i>Anonymous</i> : g.giverName || "—"}</td>
                          <td>{g.fundLabel}</td>
                          <td className="gva-num">{money(g.amount, g.currency)}</td>
                          <td className="gva-mono">{g.receiptNumber}</td>
                          <td>
                            {g.note}
                            {g.refundRequested && g.status === "paid" && (
                              <div className="gva-refund-req">
                                <b>Refund requested</b>
                                {g.refundRequestReason ? `: ${g.refundRequestReason}` : ""}
                              </div>
                            )}
                          </td>
                          <td>
                            {g.status === "refunded" ? (
                              <span className="pay-badge is-failed">Refunded</span>
                            ) : data.canRefund ? (
                              <button type="button" className="gv-btn gv-btn--ghost gv-btn--sm" disabled={refunding !== null} onClick={() => void refundGift(g)}>
                                {refunding === g.id ? <Loader2 className="gv-spin" aria-hidden="true" /> : null} Refund
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.truncated && <p className="gv-muted">Showing the latest 500 gifts. Narrow the dates to see older gifts.</p>}
            </section>

            <p className="gva-note">
              Gifts are card payments processed by Fockis through Stripe. Fockis never stores card numbers. Gift receipts are payment confirmations, not tax receipts.
            </p>
          </>
        )}
      </div>
      {toast && (
        <div className={"gva-toast gva-toast--" + toast.tone} role="status">
          {toast.text}
        </div>
      )}
    </OrgAppShell>
  );
}
