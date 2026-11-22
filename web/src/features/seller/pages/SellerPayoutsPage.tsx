import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  ExternalLink,
  Landmark,
  List,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  Zap,
} from "lucide-react";

import { useActiveStore } from "../store/activeStore";
import {
  formatBps,
  formatCents,
  payoutErrorMessage,
  payoutsApi,
  type EarlyPayoutPreview,
  type EarlyPayoutResult,
  type PayoutHistoryRow,
  type PayoutStatus,
  type PayoutSummary,
  type SaleState,
} from "../services/payoutsApi";

import "../styles/SellerPayoutsPage.scss";

/* ============================================================================
   SELLER CENTER — PAYOUTS

   Every number on this page comes from the API:
     /payouts/status, /payouts/summary, /payouts/history, /payouts/early/*
   Fees, plans and holds are set by Fockis admins in Admin Center.
============================================================================ */

type Stage = "not_connected" | "incomplete" | "reviewing" | "active";

function getStage(status: PayoutStatus | null): Stage {
  if (!status || !status.connected) return "not_connected";
  if (status.readyForPayouts) return "active";
  if (!status.detailsSubmitted || status.requirementsDue.length > 0) {
    return "incomplete";
  }
  return "reviewing";
}

/**
 * Readable labels for Stripe Accounts v2 requirement descriptions,
 * e.g. "identity.attestations.terms_of_service.account.date".
 * Checked in order; the first matching fragment wins.
 */
const REQUIREMENT_RULES: Array<[string, string]> = [
  ["terms_of_service", "Accept Stripe's terms of service"],
  ["external_account", "Bank account for deposits"],
  ["bank_account", "Bank account for deposits"],
  ["payout_method", "Bank account for deposits"],
  ["business_url", "Business website or product description"],
  ["product_description", "Business website or product description"],
  ["entity_type", "Business type (individual or company)"],
  ["dob", "Date of birth"],
  ["date_of_birth", "Date of birth"],
  ["ssn_last_4", "Last 4 digits of SSN"],
  ["id_number", "Tax ID (SSN or EIN)"],
  ["tax_id", "Tax ID (SSN or EIN)"],
  ["verification.document", "Photo ID"],
  ["documents", "Photo ID"],
  ["address", "Address"],
  ["phone", "Phone number"],
  ["email", "Email address"],
  ["given_name", "Legal name"],
  ["surname", "Legal name"],
  ["first_name", "Legal name"],
  ["last_name", "Legal name"],
  ["registered_name", "Business name"],
  ["mcc", "Business category"],
  ["representative", "Account representative details"],
  ["owners", "Business owner details"],
  ["directors", "Business director details"],
  ["executives", "Business executive details"],
];

function requirementLabel(key: string): string {
  const normalized = key.toLowerCase();
  for (const [fragment, label] of REQUIREMENT_RULES) {
    if (normalized.includes(fragment)) return label;
  }
  const last = key.split(".").pop() ?? key;
  return last.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const STATE_LABELS: Record<SaleState, string> = {
  transferred: "Paid to Stripe",
  available: "Available",
  pending: "Pending",
  held: "Held",
  refunded: "Refunded",
};

function scheduleLabel(summary: PayoutSummary | null): string {
  const schedule = summary?.account.payoutSchedule;
  if (schedule?.interval) {
    const interval = schedule.interval;
    if (interval === "weekly" && schedule.weeklyAnchor) {
      return `Weekly (${schedule.weeklyAnchor.replace(/^\w/, (c) => c.toUpperCase())})`;
    }
    if (interval === "monthly" && schedule.monthlyAnchor) return `Monthly (day ${schedule.monthlyAnchor})`;
    return interval.replace(/^\w/, (c) => c.toUpperCase());
  }
  return summary?.plan?.payoutScheduleLabel || "Set by Stripe";
}

function feeRuleText(preview: EarlyPayoutPreview | null, summary: PayoutSummary | null): string {
  const early = preview?.plan?.earlyPayout ?? summary?.plan?.earlyPayout;
  const currency = preview?.currency ?? summary?.plan?.currency ?? "usd";
  if (!early) return "";
  const parts: string[] = [];
  if (early.percentBps) parts.push(formatBps(early.percentBps));
  if (early.fixedCents) parts.push(formatCents(early.fixedCents, currency));
  let text = parts.join(" + ") || "No fee";
  if (early.minFeeCents) text += `, min ${formatCents(early.minFeeCents, currency)}`;
  if (early.maxFeeCents !== null && early.maxFeeCents !== undefined) {
    text += `, max ${formatCents(early.maxFeeCents, currency)}`;
  }
  return text;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SellerPayoutsPage() {
  const { activeStore } = useActiveStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const storeId =
    searchParams.get("storeId") ||
    activeStore?._id ||
    localStorage.getItem("activeStoreId") ||
    "";

  const [status, setStatus] = useState<PayoutStatus | null>(null);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [history, setHistory] = useState<PayoutHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [openingDashboard, setOpeningDashboard] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [preview, setPreview] = useState<EarlyPayoutPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<EarlyPayoutResult | null>(null);

  const handledReturn = useRef(false);
  const historyRef = useRef<HTMLElement>(null);
  const earlyRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const nextStatus = await payoutsApi.getStatus(storeId);
      setStatus(nextStatus);
      const [nextSummary, nextHistory] = await Promise.all([
        payoutsApi.getSummary(storeId),
        payoutsApi.getHistory(storeId),
      ]);
      setSummary(nextSummary);
      setHistory(nextHistory);
    } catch (err) {
      setError(payoutErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const startOnboarding = useCallback(async () => {
    if (!storeId) return;
    setRedirecting(true);
    setError("");
    try {
      const url = await payoutsApi.startOnboarding(storeId);
      window.location.href = url;
    } catch (err) {
      setError(payoutErrorMessage(err));
      setRedirecting(false);
    }
  }, [storeId]);

  async function openDashboard() {
    if (!storeId) return;
    setOpeningDashboard(true);
    setError("");
    try {
      const url = await payoutsApi.getDashboardLink(storeId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(payoutErrorMessage(err));
    } finally {
      setOpeningDashboard(false);
    }
  }

  async function openEarlyPayout() {
    if (!storeId) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setAgreed(false);
    setResult(null);
    setError("");
    try {
      setPreview(await payoutsApi.previewEarly(storeId));
    } catch (err) {
      setError(payoutErrorMessage(err));
    } finally {
      setPreviewLoading(false);
      requestAnimationFrame(() => earlyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  async function confirmEarlyPayout() {
    if (!storeId || !preview?.quoteHash || !agreed) return;
    setConfirming(true);
    setError("");
    try {
      const done = await payoutsApi.confirmEarly(storeId, preview.quoteHash);
      setResult(done);
      setPreview(null);
      await load();
    } catch (err) {
      // 409: the numbers changed. Show the new preview.
      const data = (err as { response?: { status?: number; data?: { preview?: EarlyPayoutPreview } } })?.response;
      if (data?.status === 409 && data.data?.preview) {
        setPreview(data.data.preview);
        setAgreed(false);
      }
      setError(payoutErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  // Returning from Stripe (?done=1) or an expired link (?refresh=1).
  useEffect(() => {
    if (handledReturn.current || !storeId) return;
    const done = searchParams.get("done") === "1";
    const refresh = searchParams.get("refresh") === "1";
    if (!done && !refresh) return;
    handledReturn.current = true;
    const next = new URLSearchParams(searchParams);
    next.delete("done");
    next.delete("refresh");
    setSearchParams(next, { replace: true });
    if (done) setNotice("Thanks! We're checking your payout setup with Stripe.");
    else {
      setNotice("Your setup link expired. Opening a new one…");
      void startOnboarding();
    }
  }, [searchParams, setSearchParams, startOnboarding, storeId]);

  const stage = getStage(status);
  const requirements = Array.from(new Set((status?.requirementsDue ?? []).map(requirementLabel)));
  const currency = summary?.currency ?? "usd";
  const money = (cents: number) => formatCents(cents, currency);
  const totals = summary?.totals;

  // The most recent paid sale, used to show the real split in step 3.
  const latestSale = useMemo(
    () => history.find((row) => row.state !== "refunded" && row.grossCents > 0) ?? null,
    [history],
  );

  const heldTotal = (summary?.holds ?? []).reduce((sum, hold) => sum + (hold.amountCents ?? 0), 0);
  const earlyEnabled = Boolean(summary?.plan?.earlyPayout.enabled);

  if (!storeId) {
    return (
      <div className="seller-payouts">
        <div className="payouts-body">
          <div className="empty-state">
            <Store size={28} />
            <h3>Choose a store first</h3>
            <p>Open Seller Center and pick the store you want to manage payouts for.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-payouts">
      <div className="payouts-body">
        {/* ================= Header ================= */}
        <header className="pf-hero">
          <div className="pf-hero__mark">
            <Landmark size={22} />
          </div>
          <div>
            <h1>Seller Center (Payouts)</h1>
            <p>Stripe Connect-powered • Fees set by Fockis • Holds • Early payouts</p>
          </div>
          <button type="button" className="pf-btn pf-btn--ghost pf-hero__refresh" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh
          </button>
        </header>

        {notice && (
          <div className="payouts-alert payouts-alert--info">
            <CheckCircle2 size={16} /> {notice}
          </div>
        )}
        {error && (
          <div className="payouts-alert payouts-alert--error" role="alert">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {loading && !summary ? (
          <div className="payouts-loading">
            <Loader2 size={20} className="spin" /> Loading your payouts…
          </div>
        ) : (
          <>
            {/* ================= Earnings + status (top right panel of the design) ================= */}
            <div className="pf-top">
              <section className="pf-card pf-earnings">
                <div className="pf-earnings__row">
                  <div className="pf-earnings__total">
                    <span>Your Earnings</span>
                    <strong>{money(totals?.earningsCents ?? 0)}</strong>
                    <small>After Fockis commission</small>
                  </div>
                  <ul className="pf-balances">
                    <li>
                      <span className="pf-dot pf-dot--green" /> Available
                      <b>{money(totals?.availableCents ?? 0)}</b>
                    </li>
                    <li>
                      <span className="pf-dot pf-dot--orange" /> Pending
                      <b>{money(totals?.pendingCents ?? 0)}</b>
                    </li>
                    <li>
                      <Lock size={13} className="pf-lock" /> Held
                      <b>{money(totals?.heldCents ?? 0)}</b>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  className="pf-btn pf-btn--primary pf-btn--wide"
                  onClick={() => void openEarlyPayout()}
                  disabled={stage !== "active" || !earlyEnabled || (totals?.availableCents ?? 0) === 0}
                  title={
                    stage !== "active"
                      ? "Finish your Stripe setup first"
                      : !earlyEnabled
                        ? "Early payouts are not included in your plan"
                        : (totals?.availableCents ?? 0) === 0
                          ? "Nothing is available for early payout yet"
                          : undefined
                  }
                >
                  <Zap size={17} /> Request Early Payout
                </button>
                <button
                  type="button"
                  className="pf-btn pf-btn--soft pf-btn--wide"
                  onClick={() => historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  <List size={17} /> View Payout History
                </button>
              </section>

              <section className="pf-card pf-checklist">
                <ul>
                  <li>
                    {status?.connected ? <CheckCircle2 className="ok" size={18} /> : <Circle className="todo" size={18} />}
                    <span>Stripe Account {status?.connected ? "Connected" : "Not connected"}</span>
                    <em className="pf-stripe">Stripe</em>
                  </li>
                  <li>
                    {stage === "active" ? <CheckCircle2 className="ok" size={18} /> : <Circle className="todo" size={18} />}
                    <span>
                      Verification {stage === "active" ? "Completed" : stage === "reviewing" ? "Under review" : "Not finished"}
                    </span>
                  </li>
                  <li>
                    <CalendarDays className="info" size={18} />
                    <span>
                      Payout Schedule: <b>{scheduleLabel(summary)}</b>
                    </span>
                  </li>
                  <li>
                    <Tag className="info" size={18} />
                    <span>
                      Your Payout Plan: <b>{summary?.plan?.name ?? "Not set up yet"}</b>
                    </span>
                  </li>
                </ul>

                <div className="pf-checklist__actions">
                  {stage === "not_connected" && (
                    <button type="button" className="pf-btn pf-btn--primary" onClick={() => void startOnboarding()} disabled={redirecting}>
                      {redirecting ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />} Connect Stripe
                    </button>
                  )}
                  {stage === "incomplete" && (
                    <button type="button" className="pf-btn pf-btn--primary" onClick={() => void startOnboarding()} disabled={redirecting}>
                      {redirecting ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />} Complete verification
                    </button>
                  )}
                  {status?.connected && (
                    <button type="button" className="pf-btn pf-btn--ghost" onClick={() => void openDashboard()} disabled={openingDashboard}>
                      {openingDashboard ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />} Stripe dashboard
                    </button>
                  )}
                </div>

                {requirements.length > 0 && (
                  <div className="pf-requirements">
                    <p>Stripe still needs:</p>
                    <ul>
                      {requirements.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            {/* ================= How your money moves (steps 1–5 of the design) ================= */}
            <section className="pf-flow" aria-label="How your money moves">
              <div className="pf-step">
                <span className="pf-step__num">1</span>
                <h3>Customer Buys a Product</h3>
                <div className="pf-step__icon"><ShoppingCart size={30} /></div>
                <p>Customer checks out and pays on Fockis (Stripe).</p>
              </div>
              <ArrowRight className="pf-flow__arrow" size={18} />
              <div className="pf-step">
                <span className="pf-step__num">2</span>
                <h3>Payment Processed</h3>
                <div className="pf-step__icon"><CreditCard size={30} /></div>
                <p>Stripe securely processes the payment.</p>
              </div>
              <ArrowRight className="pf-flow__arrow" size={18} />
              <div className="pf-step pf-step--wide">
                <span className="pf-step__num">3</span>
                <h3>Commission &amp; Allocation</h3>
                {latestSale ? (
                  <table className="pf-split">
                    <tbody>
                      <tr>
                        <td>Order {latestSale.orderNumber}</td>
                        <td>{formatCents(latestSale.grossCents, latestSale.currency)}</td>
                      </tr>
                      <tr>
                        <td>Fockis Commission ({latestSale.commissionRate}%)</td>
                        <td className="neg">−{formatCents(latestSale.commissionCents, latestSale.currency)}</td>
                      </tr>
                      <tr className="total">
                        <td>Seller Allocation</td>
                        <td className="pos">{formatCents(latestSale.sellerCents, latestSale.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="pf-step__icon"><Tag size={30} /></div>
                )}
                <p>Fockis calculates its commission from the settings in Admin Center.</p>
              </div>
              <ArrowRight className="pf-flow__arrow" size={18} />
              <div className="pf-step">
                <span className="pf-step__num">4</span>
                <h3>Funds to Seller <small>(Stripe Connect)</small></h3>
                <div className="pf-step__icon"><Store size={30} /></div>
                <p>Your share is sent to your Stripe account when you ship — or earlier if you request it.</p>
              </div>
              <ArrowRight className="pf-flow__arrow" size={18} />
              <div className="pf-step">
                <span className="pf-step__num">5</span>
                <h3>Payout to Bank</h3>
                <div className="pf-step__icon"><Landmark size={30} /></div>
                <p>Stripe sends the money to your bank on your payout schedule.</p>
              </div>
            </section>

            {/* ================= Early payout + hold (middle row of the design) ================= */}
            <div className="pf-mid">
              <section className="pf-card pf-early" ref={earlyRef}>
                <div className="pf-early__head">
                  <Zap size={30} className="pf-early__bolt" />
                  <div>
                    <h2>Early Payout <span>(Optional)</span></h2>
                    <p>
                      Get your earnings sooner for a fee set by Fockis
                      {summary?.plan && earlyEnabled ? ` (${feeRuleText(preview, summary)}).` : "."}
                    </p>
                  </div>
                </div>

                {!previewOpen && !result && (
                  <div className="pf-early__idle">
                    {!earlyEnabled ? (
                      <p className="muted">Early payouts are not included in your plan yet.</p>
                    ) : (
                      <button
                        type="button"
                        className="pf-btn pf-btn--primary"
                        onClick={() => void openEarlyPayout()}
                        disabled={stage !== "active" || (totals?.availableCents ?? 0) === 0}
                      >
                        <Zap size={16} /> See my early payout
                      </button>
                    )}
                  </div>
                )}

                {previewOpen && previewLoading && (
                  <div className="payouts-loading">
                    <Loader2 size={18} className="spin" /> Working out your fee…
                  </div>
                )}

                {previewOpen && !previewLoading && preview && (
                  <div className="pf-early__quote">
                    <table className="pf-quote">
                      <tbody>
                        <tr>
                          <td>Requested Amount</td>
                          <td>{formatCents(preview.fee.grossCents, preview.currency)}</td>
                        </tr>
                        <tr>
                          <td>
                            Early Payout Fee
                            {preview.fee.percentBps ? ` (${formatBps(preview.fee.percentBps)}` : " ("}
                            {preview.fee.fixedCents
                              ? `${preview.fee.percentBps ? " + " : ""}${formatCents(preview.fee.fixedCents, preview.currency)}`
                              : ""}
                            {!preview.fee.percentBps && !preview.fee.fixedCents ? "none" : ""})
                            {preview.fee.feeCents !== preview.fee.rawFeeCents && (
                              <small> — {preview.fee.feeCents > preview.fee.rawFeeCents ? "minimum" : "maximum"} fee applied</small>
                            )}
                          </td>
                          <td className="neg">−{formatCents(preview.fee.feeCents, preview.currency)}</td>
                        </tr>
                        <tr className="total">
                          <td>Net Payout</td>
                          <td>
                            <span className="pf-net">{formatCents(preview.fee.netCents, preview.currency)}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {preview.items.length > 0 && (
                      <details className="pf-items">
                        <summary>{preview.items.length} sale{preview.items.length === 1 ? "" : "s"} included</summary>
                        <ul>
                          {preview.items.map((item) => (
                            <li key={item.shipmentId}>
                              <span>Order {item.orderNumber}</span>
                              <span>
                                {formatCents(item.amountCents, preview.currency)}
                                <small> (fee {formatCents(item.feeCents, preview.currency)})</small>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {preview.reasons.length > 0 && (
                      <ul className="pf-reasons">
                        {preview.reasons.map((reason) => (
                          <li key={reason}>
                            <AlertCircle size={14} /> {reason}
                          </li>
                        ))}
                      </ul>
                    )}

                    {preview.eligible && (
                      <>
                        <label className="pf-agree">
                          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                          I agree that Fockis keeps the {formatCents(preview.fee.feeCents, preview.currency)} fee and sends{" "}
                          {formatCents(preview.fee.netCents, preview.currency)} to my Stripe account now.
                        </label>
                        <p className="pf-note">{preview.note}</p>
                        <div className="pf-early__actions">
                          <button
                            type="button"
                            className="pf-btn pf-btn--primary"
                            onClick={() => void confirmEarlyPayout()}
                            disabled={!agreed || confirming}
                          >
                            {confirming ? <Loader2 size={16} className="spin" /> : <Zap size={16} />} Confirm early payout
                          </button>
                          <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setPreviewOpen(false)} disabled={confirming}>
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {result && (
                  <div className={`pf-result pf-result--${result.status}`} role="status">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>
                        {result.status === "completed"
                          ? "Early payout sent"
                          : result.status === "partial"
                            ? "Early payout partly sent"
                            : "Early payout failed"}
                      </strong>
                      <p>
                        {formatCents(result.transferredNetCents, result.currency)} went to your Stripe account
                        {result.collectedFeeCents ? ` (fee ${formatCents(result.collectedFeeCents, result.currency)})` : ""}.
                        {result.status !== "completed" && " Sales that could not be sent stay available."}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className={`pf-card pf-hold${summary?.holds.length ? " is-active" : ""}`}>
                <div className="pf-hold__head">
                  <ShieldCheck size={30} className="pf-hold__shield" />
                  <div>
                    <h2>Payment Hold <span>(Verification)</span></h2>
                    <p>Fockis can temporarily hold payments for verification or investigation.</p>
                  </div>
                  {(totals?.heldCents ?? 0) > 0 && (
                    <span className="pf-chip pf-chip--held">
                      <Lock size={13} /> Held: {money(totals?.heldCents ?? 0)}
                    </span>
                  )}
                </div>
                {summary?.holds.length ? (
                  <ul className="pf-hold__list">
                    {summary.holds.map((hold) => (
                      <li key={hold.id}>
                        <div>
                          <b>Reason:</b> {hold.reason}
                          {hold.orderNumber ? ` — order ${hold.orderNumber}` : hold.scope === "store" ? " — all sales" : ""}
                          {hold.amountCents ? ` (${formatCents(hold.amountCents, hold.currency)})` : ""}
                        </div>
                        {hold.message && <div className="muted">{hold.message}</div>}
                        <div>
                          <b>Review by:</b> {formatDate(hold.reviewBy)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted pf-hold__none">
                    <BadgeCheck size={16} /> No holds on your payouts.
                  </p>
                )}
                {heldTotal > 0 && (
                  <p className="pf-note">Held money is paid as soon as the review is finished. You can't request it early while it is held.</p>
                )}
              </section>
            </div>

            {/* ================= History ================= */}
            <section className="pf-card pf-history" ref={historyRef}>
              <div className="pf-section-head">
                <h2>Payout History</h2>
                <p>
                  Sales {money(totals?.salesCents ?? 0)} · Fockis commission {money(totals?.commissionCents ?? 0)} · Early payout
                  fees {money(totals?.earlyFeesCents ?? 0)} · Sent to Stripe {money(totals?.transferredCents ?? 0)}
                </p>
              </div>
              {history.length === 0 ? (
                <div className="empty-state">
                  <List size={24} />
                  <h3>No sales yet</h3>
                  <p>When customers buy from your store, each sale and its payout appear here.</p>
                </div>
              ) : (
                <div className="pf-table-wrap">
                  <table className="pf-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order</th>
                        <th className="num">Gross sale</th>
                        <th className="num">Fockis commission</th>
                        <th className="num">Your share</th>
                        <th className="num">Early fee</th>
                        <th className="num">Net payout</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row) => (
                        <tr key={row.shipmentId}>
                          <td>{formatDate(row.date)}</td>
                          <td>{row.orderNumber}</td>
                          <td className="num">{formatCents(row.grossCents, row.currency)}</td>
                          <td className="num">
                            −{formatCents(row.commissionCents, row.currency)}
                            <small> {row.commissionRate}%</small>
                          </td>
                          <td className="num">{formatCents(row.sellerCents, row.currency)}</td>
                          <td className="num">{row.earlyFeeCents ? `−${formatCents(row.earlyFeeCents, row.currency)}` : "—"}</td>
                          <td className="num strong">{formatCents(row.netCents, row.currency)}</td>
                          <td>{row.payoutType === "early" ? "Early" : row.payoutType === "standard" ? "Standard" : "—"}</td>
                          <td>
                            <span className={`pf-state pf-state--${row.state}`} title={row.stateReason || undefined}>
                              {STATE_LABELS[row.state]}
                            </span>
                            {row.stateReason && row.state !== "transferred" && <small className="pf-state-reason">{row.stateReason}</small>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ================= Bank payouts from Stripe ================= */}
            {summary?.account.connected && (
              <section className="pf-card pf-bank">
                <div className="pf-section-head">
                  <h2>Payouts to your bank</h2>
                  <p>
                    Sent by Stripe from your Stripe balance
                    {summary.account.stripeBalance
                      ? ` · In Stripe now: ${summary.account.stripeBalance.available
                          .map((b) => formatCents(b.amountCents, b.currency))
                          .join(", ") || formatCents(0, currency)} available, ${summary.account.stripeBalance.pending
                          .map((b) => formatCents(b.amountCents, b.currency))
                          .join(", ") || formatCents(0, currency)} on the way`
                      : ""}
                  </p>
                </div>
                {summary.account.bankPayouts?.length ? (
                  <div className="pf-table-wrap">
                    <table className="pf-table">
                      <thead>
                        <tr>
                          <th>Created</th>
                          <th className="num">Amount</th>
                          <th>Expected arrival</th>
                          <th>Method</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.account.bankPayouts.map((p) => (
                          <tr key={p.id}>
                            <td>{formatDate(p.createdAt)}</td>
                            <td className="num strong">{formatCents(p.amountCents, p.currency)}</td>
                            <td>{formatDate(p.arrivalDate)}</td>
                            <td>{p.method === "instant" ? "Instant" : "Standard"}</td>
                            <td>
                              <span className={`pf-state pf-state--bank-${p.status}`}>{p.status.replace(/_/g, " ")}</span>
                              {p.failureMessage && <small className="pf-state-reason">{p.failureMessage}</small>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No bank payouts yet{summary.account.bankPayouts ? "" : " (open your Stripe dashboard to see them)"}.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
