import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, Globe, Search, ShieldCheck, User, Users, Wallet } from "lucide-react";

import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { Card, Pager, Pill, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery, useConfirm, type Tone } from "../../support/components/SmParts";
import { adminError } from "../../support/supportAdminApi";
import { domainBillingAdminApi, type DomainPricing, type OrgDomainState, type OrgFeeDetail, type PersonalDetail, type PersonalState } from "../api/domainBillingAdminApi";
import "../../support/styles/SupportMod.scss";
import "../../academy/AcademyAdminCenter.scss";
import "../styles/DomainBilling.scss";

/* ============================================================================
   ADMIN · FOCKIS DOMAIN FEES
   /admin/domains/pricing          one price list for every Fockis domain
   /admin/domains/fees             organizations' domains and whether they paid
   /admin/domains/fees/:orgId      one organization: payments, record cash, exempt
   /admin/domains/personal(/:id)   people's own domains (john.fockis.com)
   Academy schools use the same prices; their fees are on Academy → Schools.
============================================================================ */

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};
const perPeriod = (m: number) => (m === 0 ? "one-time" : m === 1 ? "per month" : m === 12 ? "per year" : m % 12 === 0 ? `every ${m / 12} years` : `every ${m} months`);
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

const PERIODS: Array<{ value: number; label: string }> = [
  { value: 0, label: "One-time fee (lifetime)" },
  { value: 1, label: "Every month" },
  { value: 3, label: "Every 3 months" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Every year" },
  { value: 24, label: "Every 2 years" },
];

export const ORG_STATE: Record<OrgDomainState, { label: string; tone: Tone }> = {
  no_domain: { label: "No domain", tone: "gray" },
  free: { label: "Free", tone: "gray" },
  exempt: { label: "Exempt", tone: "purple" },
  paid: { label: "Paid (one-time)", tone: "green" },
  active: { label: "Paid", tone: "green" },
  grace: { label: "Payment due", tone: "amber" },
  unpaid: { label: "Not paid", tone: "red" },
  expired: { label: "Expired", tone: "red" },
};

function useCanManage() {
  const { can } = useAdminAccess();
  return can([PERMISSIONS.DOMAINS_MANAGE]);
}

function Head({ title, text }: { title: string; text: string }) {
  return (
    <header className="fkac-head">
      <div>
        <h1>
          <Globe size={24} aria-hidden="true" /> {title}
        </h1>
        <p className="fksm-muted">{text}</p>
      </div>
      <div className="fkac-headlinks">
        <Link className="fksm-btn fksm-btn--secondary fksm-btn--sm" to="/admin/domains/pricing">
          <Wallet size={15} /> Pricing
        </Link>
        <Link className="fksm-btn fksm-btn--secondary fksm-btn--sm" to="/admin/domains/fees">
          <Users size={15} /> Organization fees
        </Link>
        <Link className="fksm-btn fksm-btn--secondary fksm-btn--sm" to="/admin/domains/personal">
          <User size={15} /> Personal domains
        </Link>
        <Link className="fksm-btn fksm-btn--secondary fksm-btn--sm" to="/admin/academy/schools">
          Academy schools
        </Link>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- pricing */

export function DomainPricingPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const q = useAdminQuery(() => domainBillingAdminApi.pricing(), []);
  const [form, setForm] = useState<DomainPricing | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const strip = (p: DomainPricing) => JSON.stringify({ ...p, history: 0, updatedAt: 0 });
  const dirty = !!form && !!q.data && strip(form) !== strip(q.data);
  const set = (patch: Partial<DomainPricing>) => setForm((f) => (f ? { ...f, ...patch } : f));

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const next = await domainBillingAdminApi.savePricing({
        enabled: form.enabled,
        currency: form.currency.trim().toUpperCase(),
        periodMonths: Number(form.periodMonths),
        graceDays: Number(form.graceDays),
        memberDomainPrice: Number(form.memberDomainPrice) || 0,
        personalDomainPrice: Number(form.personalDomainPrice) || 0,
        note: form.note,
        prices: Object.fromEntries(Object.entries(form.prices).map(([k, v]) => [k, Number(v) || 0])),
      });
      q.setData(next);
      setForm(next);
      toast("success", "Domain prices saved.");
    } catch (e) {
      setError(adminError(e));
    } finally {
      setSaving(false);
    }
  }

  const priceInput = (key: string, label: string) => (
    <label key={key} className="fksm-field">
      <span>{label}</span>
      <span className="fkac-money">
        <em>{form!.currency}</em>
        <input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={form!.prices[key] ?? 0}
          disabled={!canManage}
          onChange={(e) => set({ prices: { ...form!.prices, [key]: e.target.value === "" ? 0 : Number(e.target.value) } })}
        />
        <small>{Number(form!.prices[key] ?? 0) > 0 ? perPeriod(form!.periodMonths) : "free"}</small>
      </span>
    </label>
  );

  return (
    <div className="fksm fkac">
      <Head title="Fockis domain pricing" text="One price list for every name.fockis.com — church and organization domains, their member domains, personal domains and Fockis Academy schools." />
      {q.loading && !q.data ? (
        <SmLoading />
      ) : q.error || !form ? (
        <SmError message={q.error ?? "Could not load prices."} onRetry={q.refetch} />
      ) : (
        <div className="fkac-grid">
          <Card title="Prices" icon={<Wallet size={20} />} className="fkac-wide">
            <p className="fksm-muted fkac-intro">
              Organizations create their domain (it stays reserved), then pay through the normal Fockis checkout to activate it. Academy schools pay after you approve them. Change prices at
              any time: a new price applies to the next payment, not to periods already paid. Nothing is charged automatically — organizations renew from their Domains page.
            </p>

            <label className="fksm-switch fkac-switchrow">
              <input type="checkbox" checked={form.enabled} disabled={!canManage} onChange={(e) => set({ enabled: e.target.checked })} />
              <span className="fksm-switch__track" aria-hidden="true" />
              {form.enabled ? "Charging is ON — organizations pay for their domain" : "Charging is OFF — every domain is free"}
            </label>
            {form.enabled && q.data && !q.data.enabled && (
              <p className="fksm-notice fksm-notice--warn">
                When you save, domains that already work get {form.graceDays} days to pay before they pause. New domains must be paid to activate.
              </p>
            )}

            <div className="fksm-form-grid fkac-pricegrid">
              <label className="fksm-field">
                <span>Currency</span>
                <input value={form.currency} maxLength={3} disabled={!canManage} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
                <small>3-letter code, e.g. USD. Must be a currency your checkout accepts.</small>
              </label>
              <label className="fksm-field">
                <span>Each payment covers</span>
                <select value={form.periodMonths} disabled={!canManage} onChange={(e) => set({ periodMonths: Number(e.target.value) })}>
                  {PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                  {!PERIODS.some((p) => p.value === form.periodMonths) && <option value={form.periodMonths}>Every {form.periodMonths} months</option>}
                </select>
              </label>
              <label className="fksm-field">
                <span>Grace period (days)</span>
                <input type="number" min={0} max={180} value={form.graceDays} disabled={!canManage} onChange={(e) => set({ graceDays: Number(e.target.value) })} />
                <small>How long a domain keeps working after its paid period ends.</small>
              </label>
            </div>

            <h3 className="fkac-subhead" style={{ marginTop: 22 }}>
              Churches & organizations — base domain (springfieldchurch.fockis.com)
            </h3>
            <div className="fkac-prices">{form.types.filter((t) => t.group !== "academy").map((t) => priceInput(t.key, t.label))}</div>

            <h3 className="fkac-subhead" style={{ marginTop: 22 }}>
              Member domains (john.springfieldchurch.fockis.com)
            </h3>
            <div className="fkac-prices">
              <label className="fksm-field">
                <span>Price per member domain</span>
                <span className="fkac-money">
                  <em>{form.currency}</em>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={form.memberDomainPrice}
                    disabled={!canManage}
                    onChange={(e) => set({ memberDomainPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                  <small>{Number(form.memberDomainPrice) > 0 ? perPeriod(form.periodMonths) : "included"}</small>
                </span>
              </label>
            </div>
            <p className="fksm-muted fkac-small">
              Billed with the organization&apos;s fee for every member domain in use. Extra member domains bought during a period are charged only for the time left.
            </p>

            <h3 className="fkac-subhead" style={{ marginTop: 22 }}>
              Personal domains (john.fockis.com)
            </h3>
            <div className="fkac-prices">
              <label className="fksm-field">
                <span>Price per person</span>
                <span className="fkac-money">
                  <em>{form.currency}</em>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={form.personalDomainPrice ?? 0}
                    disabled={!canManage}
                    onChange={(e) => set({ personalDomainPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                  <small>{Number(form.personalDomainPrice) > 0 ? perPeriod(form.periodMonths) : "free"}</small>
                </span>
              </label>
            </div>
            <p className="fksm-muted fkac-small">
              For anyone who wants their own name, with or without an organization or school. They pick it in Settings → Your Fockis domain, pay, and it shows on their profile.
            </p>

            <h3 className="fkac-subhead" style={{ marginTop: 22 }}>
              Fockis Academy schools
            </h3>
            <div className="fkac-prices">{form.types.filter((t) => t.group === "academy").map((t) => priceInput(t.key, t.label))}</div>
            <p className="fksm-muted fkac-small">“Church” and “Other” above also apply to Academy schools of that type. Set 0 to make a type free.</p>

            <label className="fksm-field" style={{ marginTop: 14 }}>
              <span>Note for organizations (optional)</span>
              <textarea
                rows={2}
                maxLength={600}
                value={form.note}
                disabled={!canManage}
                placeholder="e.g. Contact domains@fockis.com for nonprofit discounts."
                onChange={(e) => set({ note: e.target.value })}
              />
            </label>

            {error && <p className="fksm-notice fksm-notice--error">{error}</p>}
            {canManage ? (
              <div className="fkac-savebar">
                <button type="button" className="fksm-btn fksm-btn--secondary" disabled={!dirty || saving} onClick={() => setForm(q.data)}>
                  Discard
                </button>
                <button type="button" className="fksm-btn fksm-btn--primary" disabled={!dirty || saving} onClick={save}>
                  {saving ? "Saving…" : "Save prices"}
                </button>
              </div>
            ) : (
              <p className="fksm-muted">You can view prices but not change them (needs “Manage Domains”).</p>
            )}
          </Card>

          <Card title="Change history" icon={<FileText size={18} />} className="fkac-wide">
            {q.data?.history.length ? (
              <ul className="fkac-list">
                {q.data.history.map((h, i) => (
                  <li key={i}>
                    <strong>{h.summary}</strong>
                    <span>{h.byName}</span>
                    <time>{formatDateTime(h.at)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fksm-muted">No changes yet.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- organizations */

const FEE_TABS = [
  { value: "due", label: "Not paid / due" },
  { value: "active", label: "Paid" },
  { value: "exempt", label: "Exempt" },
  { value: "free", label: "Free" },
  { value: "all", label: "All" },
];

export function DomainFeesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = params.get("state") ?? "due";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => domainBillingAdminApi.organizations({ state, search, page }), [state, search, page]);
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };
  const counts = list.data?.counts ?? {};
  const tabCount = (v: string) =>
    v === "due" ? (counts.unpaid ?? 0) + (counts.grace ?? 0) + (counts.expired ?? 0) : v === "active" ? (counts.active ?? 0) + (counts.paid ?? 0) : v === "all" ? undefined : counts[v];

  return (
    <div className="fksm fkac">
      <Head title="Organization domain fees" text="Churches and organizations that created a Fockis domain, and whether it is paid." />
      <Card title="Organizations" icon={<Users size={20} />}>
        <div className="fksm-tabs" role="tablist" aria-label="Fee status">
          {FEE_TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={state === t.value} className={state === t.value ? "is-active" : ""} onClick={() => set({ state: t.value })}>
              {t.label}
              {tabCount(t.value) !== undefined && <span className="fkac-count">{tabCount(t.value)}</span>}
            </button>
          ))}
        </div>
        <div className="fksm-filters">
          <form
            className="fksm-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ search: draft.trim() });
            }}
          >
            <Search size={16} aria-hidden="true" />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Domain, e.g. springfieldchurch" aria-label="Search domains" />
          </form>
        </div>
        {list.loading && !list.data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={list.refetch} />
        ) : !list.data?.items.length ? (
          <SmEmpty icon={<Globe size={24} />} title="No organizations here" />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table fksm-table--cards">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Type</th>
                    <th>Member domains</th>
                    <th>Price</th>
                    <th>Paid until</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((r) => (
                    <tr key={r.organizationId} className="is-clickable" onClick={() => navigate(`/admin/domains/fees/${r.organizationId}`)}>
                      <td>
                        <span className="fksm-subject">
                          <strong>{r.organizationName}</strong>
                          <span>{r.domain}</span>
                        </span>
                      </td>
                      <td>{r.organizationTypeLabel}</td>
                      <td>
                        {r.memberDomainsUsed}
                        {r.memberDomainsAllowed !== null ? ` / ${r.memberDomainsAllowed}` : ""}
                      </td>
                      <td>{r.price > 0 ? money(r.price, r.currency) : "—"}</td>
                      <td>{r.paidUntil ? dateOnly(r.paidUntil) : "—"}</td>
                      <td>
                        <Pill tone={ORG_STATE[r.state].tone}>{ORG_STATE[r.state].label}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
          </>
        )}
      </Card>
    </div>
  );
}

export function DomainFeeDetailPage() {
  const { organizationId = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const q = useAdminQuery(() => domainBillingAdminApi.organization(organizationId), [organizationId]);
  const d = q.data;

  const [recording, setRecording] = useState(false);
  const [until, setUntil] = useState("");
  const [amount, setAmount] = useState("");
  const [members, setMembers] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openRecord(x: OrgFeeDetail) {
    const b = x.billing;
    const base = b.paidUntil && new Date(b.paidUntil) > new Date() ? new Date(b.paidUntil) : new Date();
    base.setMonth(base.getMonth() + (b.periodMonths || 12));
    setUntil(base.toISOString().slice(0, 10));
    setMembers(String(Math.max(x.memberSlots, b.memberDomainsUsed)));
    setAmount(String(b.price + b.memberDomainPrice * Math.max(x.memberSlots, b.memberDomainsUsed) || ""));
    setNote("");
    setError(null);
    setRecording(true);
  }

  async function record() {
    setBusy(true);
    setError(null);
    try {
      q.setData(
        await domainBillingAdminApi.action(organizationId, {
          action: "set_paid_until",
          until: new Date(`${until}T23:59:59`).toISOString(),
          amount: amount === "" ? undefined : Number(amount),
          memberDomains: members === "" ? undefined : Number(members),
          note: note.trim() || undefined,
        }),
      );
      toast("success", "Payment recorded.");
      setRecording(false);
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }

  const ask = (action: "exempt" | "unexempt" | "clear_paid") => {
    const copy = {
      exempt: { title: "Let this organization use its domain for free?", description: "It won't be asked to pay (including member domains) until you remove the exemption.", label: "Exempt", reason: "Why (kept in the history)" },
      unexempt: { title: "Remove the exemption?", description: "It will need a paid period again. If none, adding members pauses.", label: "Remove exemption", reason: undefined },
      clear_paid: { title: "Clear the paid period?", description: "Use this to undo a payment recorded by mistake.", label: "Clear", reason: "Why (kept in the history)" },
    }[action];
    confirm.ask({ title: copy.title, description: copy.description, confirmLabel: copy.label, tone: action === "exempt" ? "primary" : "danger", reasonLabel: copy.reason }, async (reason) => {
      q.setData(await domainBillingAdminApi.action(organizationId, { action, note: reason }));
      toast("success", "Domain fee updated.");
    });
  };

  return (
    <div className="fksm fkac">
      <Head title="Organization domain fee" text="Payments, cash payments recorded by Fockis, and waivers." />
      <Link to="/admin/domains/fees" className="fksm-back">
        <ArrowLeft size={16} /> Back to organizations
      </Link>
      {q.loading && !d ? (
        <SmLoading />
      ) : q.error || !d ? (
        <SmError message={q.error ?? "Organization not found."} onRetry={q.refetch} />
      ) : (
        <div className="fksm-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{d.organization.name}</h2>
                  <div className="fksm-detail-head__meta">
                    <code>{d.billing.baseDomain ?? "no domain"}</code>
                    <span>·</span>
                    <span>{d.billing.organizationTypeLabel}</span>
                    {d.billing.baseDomainStatus && (
                      <>
                        <span>·</span>
                        <span>domain {d.billing.baseDomainStatus}</span>
                      </>
                    )}
                  </div>
                </div>
                <Pill tone={ORG_STATE[d.billing.state].tone}>{ORG_STATE[d.billing.state].label}</Pill>
              </div>
              <dl className="fksm-facts">
                <div>
                  <dt>Organization domain</dt>
                  <dd>{d.billing.price > 0 ? `${money(d.billing.price, d.billing.currency)} ${perPeriod(d.billing.periodMonths)}` : "Free"}</dd>
                </div>
                <div>
                  <dt>Member domains</dt>
                  <dd>
                    {d.billing.memberDomainsUsed} in use
                    {d.billing.memberDomainsAllowed !== null ? ` · ${d.billing.memberDomainsAllowed} paid` : ""}
                    {d.billing.memberDomainPrice > 0 ? ` · ${money(d.billing.memberDomainPrice, d.billing.currency)} each` : ""}
                  </dd>
                </div>
                {d.billing.paidUntil && (
                  <div>
                    <dt>Paid until</dt>
                    <dd>{dateOnly(d.billing.paidUntil)}</dd>
                  </div>
                )}
                {d.billing.graceEndsAt && (
                  <div>
                    <dt>{d.billing.state === "expired" ? "Paused since" : "Pauses on"}</dt>
                    <dd>{dateOnly(d.billing.graceEndsAt)}</dd>
                  </div>
                )}
                {d.exempt && (
                  <div>
                    <dt>Exempt because</dt>
                    <dd>{d.exemptReason || "—"}</dd>
                  </div>
                )}
                {d.billing.renewTotal > 0 && (
                  <div>
                    <dt>Next payment (with member domains in use)</dt>
                    <dd>{money(d.billing.renewTotal, d.billing.currency)}</dd>
                  </div>
                )}
              </dl>
              {(d.billing.state === "unpaid" || d.billing.state === "expired") && (
                <p className="fksm-notice fksm-notice--warn fkac-small" style={{ marginTop: 12 }}>
                  {d.billing.state === "unpaid"
                    ? "Not active: the domain can't be verified and the organization can't add member logins or member domains until it pays."
                    : "Paused: no new member logins or member domains until it renews. Existing logins keep working."}
                </p>
              )}
            </Card>

            <Card title="Payments & history" icon={<FileText size={18} />}>
              {d.entries.length ? (
                <ul className="fkac-list">
                  {d.entries.map((e, i) => (
                    <li key={i}>
                      <strong>
                        {e.method === "stripe"
                          ? `Card · ${e.amount !== undefined ? money(e.amount, e.currency || d.billing.currency) : ""}`
                          : e.method === "manual"
                            ? `Recorded payment${e.amount !== undefined ? ` · ${money(e.amount, e.currency || d.billing.currency)}` : ""}`
                            : e.method === "exempt"
                              ? "Exempted"
                              : e.method === "unexempt"
                                ? "Exemption removed"
                                : "Paid period cleared"}
                      </strong>
                      <span>
                        {e.kind === "members" ? `${e.memberDomains} more member domain${e.memberDomains === 1 ? "" : "s"}` : ""}
                        {e.kind !== "members" && e.memberDomains ? `${e.memberDomains} member domain${e.memberDomains === 1 ? "" : "s"}` : ""}
                        {e.to ? ` · until ${dateOnly(e.to)}` : ""}
                        {e.note ? ` · ${e.note}` : ""}
                        {e.byName ? ` · ${e.byName}` : ""}
                      </span>
                      <time>{formatDateTime(e.at)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No payments yet.</p>
              )}
            </Card>

            <Card title={`Member domains (${d.memberDomains.length})`} icon={<Users size={18} />}>
              {d.memberDomains.length ? (
                <ul className="fkac-list">
                  {d.memberDomains.map((m) => (
                    <li key={m.domain}>
                      <strong>{m.domain}</strong>
                      <span>{m.assigned ? "assigned to a member" : "not assigned"}</span>
                      <Pill tone={m.status === "verified" ? "green" : "gray"}>{m.status}</Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No member domains yet.</p>
              )}
            </Card>
          </div>

          <div className="fksm-stack">
            <Card title="Actions" icon={<ShieldCheck size={18} />}>
              {!canManage ? (
                <p className="fksm-muted">You can view fees but not change them (needs “Manage Domains”).</p>
              ) : d.billing.state === "no_domain" ? (
                <p className="fksm-muted">This organization has no Fockis domain yet.</p>
              ) : (
                <div className="fkac-actions">
                  {!recording ? (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => openRecord(d)}>
                      Record a cash / bank payment
                    </button>
                  ) : (
                    <div className="fkac-record">
                      <label className="fksm-field">
                        <span>Paid until</span>
                        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                      </label>
                      <label className="fksm-field">
                        <span>Member domains paid for</span>
                        <input type="number" min={0} value={members} onChange={(e) => setMembers(e.target.value)} />
                      </label>
                      <label className="fksm-field">
                        <span>Amount received ({d.billing.currency})</span>
                        <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </label>
                      <label className="fksm-field">
                        <span>Note</span>
                        <input value={note} maxLength={500} placeholder="e.g. MonCash receipt #1234" onChange={(e) => setNote(e.target.value)} />
                      </label>
                      {error && <p className="fksm-notice fksm-notice--error">{error}</p>}
                      <div className="fkac-savebar">
                        <button type="button" className="fksm-btn fksm-btn--secondary" disabled={busy} onClick={() => setRecording(false)}>
                          Cancel
                        </button>
                        <button type="button" className="fksm-btn fksm-btn--primary" disabled={busy || !until} onClick={record}>
                          {busy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                  {d.exempt ? (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("unexempt")}>
                      Remove exemption
                    </button>
                  ) : (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("exempt")}>
                      Exempt from the fee
                    </button>
                  )}
                  {(d.billing.paidUntil || d.paidForever) && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("clear_paid")}>
                      Clear paid period
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      {confirm.element}
    </div>
  );
}

/* ---------------------------------------------------------------- personal domains */

const PERSONAL_STATE: Record<PersonalState, { label: string; tone: Tone }> = {
  free: { label: "Free", tone: "gray" },
  exempt: { label: "Exempt", tone: "purple" },
  paid: { label: "Paid (one-time)", tone: "green" },
  active: { label: "Paid", tone: "green" },
  grace: { label: "Payment due", tone: "amber" },
  unpaid: { label: "Reserved, not paid", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
};

const PERSONAL_TABS = [
  { value: "active", label: "Paid" },
  { value: "due", label: "Not paid / due" },
  { value: "exempt", label: "Exempt" },
  { value: "free", label: "Free" },
  { value: "all", label: "All" },
];

export function PersonalDomainsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = params.get("state") ?? "all";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => domainBillingAdminApi.personal({ state, search, page }), [state, search, page]);
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };
  const c = list.data?.counts ?? {};
  const tabCount = (v: string) =>
    v === "due" ? (c.unpaid ?? 0) + (c.grace ?? 0) + (c.expired ?? 0) : v === "active" ? (c.active ?? 0) + (c.paid ?? 0) : v === "all" ? undefined : c[v];

  return (
    <div className="fksm fkac">
      <Head title="Personal domains" text="People's own name.fockis.com, paid by them — with or without an organization or school." />
      <Card title="People" icon={<User size={20} />}>
        <div className="fksm-tabs" role="tablist" aria-label="Status">
          {PERSONAL_TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={state === t.value} className={state === t.value ? "is-active" : ""} onClick={() => set({ state: t.value })}>
              {t.label}
              {tabCount(t.value) !== undefined && <span className="fkac-count">{tabCount(t.value)}</span>}
            </button>
          ))}
        </div>
        <div className="fksm-filters">
          <form
            className="fksm-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ search: draft.trim() });
            }}
          >
            <Search size={16} aria-hidden="true" />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name, e.g. john" aria-label="Search personal domains" />
          </form>
        </div>
        {list.loading && !list.data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={list.refetch} />
        ) : !list.data?.items.length ? (
          <SmEmpty icon={<Globe size={24} />} title="No personal domains here" />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table fksm-table--cards">
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Person</th>
                    <th>Since</th>
                    <th>Paid until</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((r) => (
                    <tr key={r.id} className="is-clickable" onClick={() => navigate(`/admin/domains/personal/${r.id}`)}>
                      <td>
                        <strong>{r.domain}</strong>
                      </td>
                      <td>
                        <span className="fksm-subject">
                          <strong>{r.userName}</strong>
                          <span>{r.userEmail}</span>
                        </span>
                      </td>
                      <td>{dateOnly(r.createdAt)}</td>
                      <td>{r.paidUntil ? dateOnly(r.paidUntil) : r.reservedUntil ? `reserved until ${dateOnly(r.reservedUntil)}` : "—"}</td>
                      <td>
                        <Pill tone={PERSONAL_STATE[r.state].tone}>{PERSONAL_STATE[r.state].label}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
          </>
        )}
      </Card>
    </div>
  );
}

export function PersonalDomainDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const q = useAdminQuery(() => domainBillingAdminApi.personalOne(id), [id]);
  const d = q.data;
  const [recording, setRecording] = useState(false);
  const [until, setUntil] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openRecord(x: PersonalDetail) {
    const base = x.billing.paidUntil && new Date(x.billing.paidUntil) > new Date() ? new Date(x.billing.paidUntil) : new Date();
    base.setMonth(base.getMonth() + (x.billing.periodMonths || 12));
    setUntil(base.toISOString().slice(0, 10));
    setAmount(String(x.billing.price || ""));
    setNote("");
    setError(null);
    setRecording(true);
  }

  async function record() {
    setBusy(true);
    setError(null);
    try {
      const r = await domainBillingAdminApi.personalAction(id, {
        action: "set_paid_until",
        until: new Date(`${until}T23:59:59`).toISOString(),
        amount: amount === "" ? undefined : Number(amount),
        note: note.trim() || undefined,
      });
      if ("billing" in r) q.setData(r);
      toast("success", "Payment recorded.");
      setRecording(false);
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }

  const ask = (action: "exempt" | "unexempt" | "clear_paid" | "release") => {
    const copy = {
      exempt: { title: "Give this person the domain for free?", description: "They won't be asked to pay until you remove the exemption.", label: "Exempt", reason: "Why (kept in the history)" },
      unexempt: { title: "Remove the exemption?", description: "They will need to pay to keep the domain on their profile.", label: "Remove exemption", reason: undefined },
      clear_paid: { title: "Clear the paid period?", description: "Use this to undo a payment recorded by mistake.", label: "Clear", reason: "Why (kept in the history)" },
      release: { title: "Take this name back?", description: "The person loses the domain and anyone can take the name. Payments are not refunded here.", label: "Take back", reason: "Why (e.g. impersonation, offensive name)" },
    }[action];
    confirm.ask({ title: copy.title, description: copy.description, confirmLabel: copy.label, tone: action === "exempt" ? "primary" : "danger", reasonLabel: copy.reason }, async (reason) => {
      const r = await domainBillingAdminApi.personalAction(id, { action, note: reason });
      if ("released" in r) {
        toast("success", "Name taken back.");
        navigate("/admin/domains/personal");
        return;
      }
      q.setData(r);
      toast("success", "Domain updated.");
    });
  };

  return (
    <div className="fksm fkac">
      <Head title="Personal domain" text="A person's own Fockis domain, payments and actions." />
      <Link to="/admin/domains/personal" className="fksm-back">
        <ArrowLeft size={16} /> Back to personal domains
      </Link>
      {q.loading && !d ? (
        <SmLoading />
      ) : q.error || !d ? (
        <SmError message={q.error ?? "Personal domain not found."} onRetry={q.refetch} />
      ) : (
        <div className="fksm-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{d.billing.domain}</h2>
                  <div className="fksm-detail-head__meta">
                    <span>{d.user.name}</span>
                    {d.user.email && (
                      <>
                        <span>·</span>
                        <span>{d.user.email}</span>
                      </>
                    )}
                  </div>
                </div>
                <Pill tone={PERSONAL_STATE[d.billing.state].tone}>{PERSONAL_STATE[d.billing.state].label}</Pill>
              </div>
              <dl className="fksm-facts">
                <div>
                  <dt>Price</dt>
                  <dd>{d.billing.price > 0 ? `${money(d.billing.price, d.billing.currency)} ${perPeriod(d.billing.periodMonths)}` : "Free"}</dd>
                </div>
                <div>
                  <dt>On their profile</dt>
                  <dd>{d.billing.active ? "Yes" : "No"}</dd>
                </div>
                {d.billing.paidUntil && (
                  <div>
                    <dt>Paid until</dt>
                    <dd>{dateOnly(d.billing.paidUntil)}</dd>
                  </div>
                )}
                {d.billing.reservedUntil && (
                  <div>
                    <dt>Reserved until</dt>
                    <dd>{dateOnly(d.billing.reservedUntil)}</dd>
                  </div>
                )}
                {d.billing.graceEndsAt && (
                  <div>
                    <dt>{d.billing.state === "expired" ? "Paused since" : "Pauses on"}</dt>
                    <dd>{dateOnly(d.billing.graceEndsAt)}</dd>
                  </div>
                )}
                {d.exempt && (
                  <div>
                    <dt>Exempt because</dt>
                    <dd>{d.exemptReason || "—"}</dd>
                  </div>
                )}
                <div>
                  <dt>Profile</dt>
                  <dd>
                    <a className="fksm-link" href={`/profile/${d.user.id}`} target="_blank" rel="noreferrer">
                      Open profile
                    </a>
                  </dd>
                </div>
              </dl>
            </Card>
            <Card title="Payments & history" icon={<FileText size={18} />}>
              {d.entries.length ? (
                <ul className="fkac-list">
                  {d.entries.map((e, i) => (
                    <li key={i}>
                      <strong>
                        {e.method === "stripe"
                          ? `Card · ${e.amount !== undefined ? money(e.amount, e.currency || d.billing.currency) : ""}`
                          : e.method === "manual"
                            ? `Recorded payment${e.amount !== undefined ? ` · ${money(e.amount, e.currency || d.billing.currency)}` : ""}`
                            : e.method === "exempt"
                              ? "Exempted"
                              : e.method === "unexempt"
                                ? "Exemption removed"
                                : "Paid period cleared"}
                      </strong>
                      <span>
                        {e.to ? `until ${dateOnly(e.to)}` : ""}
                        {e.note ? ` · ${e.note}` : ""}
                        {e.byName ? ` · ${e.byName}` : ""}
                      </span>
                      <time>{formatDateTime(e.at)}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No payments yet.</p>
              )}
            </Card>
          </div>
          <div className="fksm-stack">
            <Card title="Actions" icon={<ShieldCheck size={18} />}>
              {!canManage ? (
                <p className="fksm-muted">You can view domains but not change them (needs “Manage Domains”).</p>
              ) : (
                <div className="fkac-actions">
                  {!recording ? (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => openRecord(d)}>
                      Record a cash / bank payment
                    </button>
                  ) : (
                    <div className="fkac-record">
                      <label className="fksm-field">
                        <span>Paid until</span>
                        <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                      </label>
                      <label className="fksm-field">
                        <span>Amount received ({d.billing.currency})</span>
                        <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </label>
                      <label className="fksm-field">
                        <span>Note</span>
                        <input value={note} maxLength={500} placeholder="e.g. MonCash receipt #1234" onChange={(e) => setNote(e.target.value)} />
                      </label>
                      {error && <p className="fksm-notice fksm-notice--error">{error}</p>}
                      <div className="fkac-savebar">
                        <button type="button" className="fksm-btn fksm-btn--secondary" disabled={busy} onClick={() => setRecording(false)}>
                          Cancel
                        </button>
                        <button type="button" className="fksm-btn fksm-btn--primary" disabled={busy || !until} onClick={record}>
                          {busy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                  {d.exempt ? (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("unexempt")}>
                      Remove exemption
                    </button>
                  ) : (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("exempt")}>
                      Give it for free (exempt)
                    </button>
                  )}
                  {(d.billing.paidUntil || d.paidForever) && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => ask("clear_paid")}>
                      Clear paid period
                    </button>
                  )}
                  <button type="button" className="fksm-btn fksm-btn--danger fksm-btn--block" onClick={() => ask("release")}>
                    Take the name back
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
      {confirm.element}
    </div>
  );
}
