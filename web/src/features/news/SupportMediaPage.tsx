/**
 * SupportMediaPage.tsx — /news/:slug/support — "Support <Media>".
 * Payments go through the existing Fockis Stripe checkout; the server verifies
 * each payment with Stripe before it counts toward a campaign.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ArrowRight, CalendarDays, CheckCircle2, Info, Loader2, Lock, Users } from "lucide-react";

import StripeProvider from "../payments/StripeProvider";
import CheckoutForm from "../payments/components/CheckoutForm";
import NewsShell from "./NewsShell";
import { Empty, OutletLogo, Skeleton, Thumb, Verified, loginPath, signedIn } from "./NewsParts";
import { fmtDate, money, newsApi, newsError, type Campaign, type DonationReceipt, type DonationStart, type SupportPage } from "./newsApi";

type Freq = "once" | "monthly" | "annual";

function PayButton({ start, onPaid }: { start: DonationStart; onPaid: (r: DonationReceipt) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  async function pay() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setBusy(true);
    setError("");
    try {
      const result = await stripe.confirmCardPayment(start.clientSecret, { payment_method: { card } });
      if (result.error) throw new Error(result.error.message || "Your card was declined.");
      const intentId = result.paymentIntent?.id ?? start.paymentIntentId;
      if (!intentId) throw new Error("The payment could not be verified.");
      onPaid(await newsApi.confirmDonation(start.donationId, intentId));
    } catch (err) {
      setError(newsError(err, "The payment didn't go through."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <CheckoutForm total={start.amount} currency={start.currency} onCardCompleteChange={setComplete} />
      {error && (
        <p className="nm-form-error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="nm-btn nm-btn--red nm-btn--block nm-btn--lg" disabled={!stripe || !complete || busy} onClick={() => void pay()}>
        {busy ? <Loader2 className="nm-spin" /> : <Lock />} {busy ? "Processing…" : `Donate ${money(start.amount, start.currency)}${start.frequency !== "once" ? (start.frequency === "monthly" ? " / month" : " / year") : ""}`}
      </button>
    </>
  );
}

export function CampaignCard({ c, onSupport }: { c: Campaign; onSupport: () => void }) {
  const ended = Boolean(c.deadline && c.deadline < new Date().toISOString().slice(0, 10));
  return (
    <section className="nm-card nm-campaign">
      <h2 className="nm-card__title">Current Campaign</h2>
      <Thumb src={c.coverUrl} className="nm-campaign__img" />
      <h3>{c.title}</h3>
      {c.description && <p className="nm-pre">{c.description}</p>}
      <div className="nm-campaign__nums">
        <b>
          {money(c.raised, c.currency)} of {money(c.goal, c.currency)}
        </b>
        <span>{c.progress}%</span>
      </div>
      <div className="nm-progress nm-progress--green" role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Raised">
        <span style={{ width: `${c.progress}%` }} />
      </div>
      <div className="nm-campaign__facts">
        {c.deadline && (
          <span>
            <CalendarDays /> {ended ? "Ended" : "Ends"}: {fmtDate(c.deadline)}
          </span>
        )}
        <span>
          <Users /> {c.supporters} supporters
        </span>
      </div>
      {c.updates.length > 0 && (
        <ul className="nm-updates">
          {c.updates.slice(0, 2).map((u, i) => (
            <li key={i}>
              <small>{fmtDate(u.at)}</small> {u.text}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={onSupport} disabled={ended}>
        Support This Campaign <ArrowRight />
      </button>
    </section>
  );
}

export default function SupportMediaPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const [page, setPage] = useState<SupportPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freq, setFreq] = useState<Freq>((params.get("frequency") as Freq) || "once");
  const [amount, setAmount] = useState<number | null>(Number(params.get("amount")) || 25);
  const [custom, setCustom] = useState("");
  const [showName, setShowName] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [campaignId, setCampaignId] = useState<string>(params.get("campaign") ?? "");
  const [start, setStart] = useState<DonationStart | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null);
  const pledgeId = params.get("pledge") ?? undefined;

  useEffect(() => {
    newsApi
      .supportPage(slug)
      .then((r) => {
        setPage(r);
        document.title = `Support ${r.outlet.name} · Fockis News`;
      })
      .catch((err) => setError(newsError(err, "This page is not available.")));
  }, [slug]);

  const value = custom ? Number(custom) : amount ?? 0;
  const campaign = useMemo(() => page?.campaigns.find((c) => c.id === campaignId) ?? page?.campaigns[0] ?? null, [page, campaignId]);
  const currency = page?.currency ?? "USD";

  async function begin() {
    if (!signedIn()) return window.location.assign(loginPath());
    if (!(value >= 1)) return setFormError("Choose or enter an amount of at least 1.");
    setBusy(true);
    setFormError("");
    try {
      setStart(await newsApi.startDonation(slug, { amount: value, frequency: freq, campaignId: campaignId || undefined, anonymous, showName: showName && !anonymous, message: message.trim() || undefined, pledgeId }));
    } catch (err) {
      setFormError(newsError(err, "The payment could not be started."));
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <NewsShell compactHeader>
        <Empty title="Not available" text={error} />
      </NewsShell>
    );

  return (
    <NewsShell compactHeader>
      {!page && <Skeleton h={480} />}
      {page && (
        <div className="nm-support">
          <header className="nm-support__head">
            <OutletLogo outlet={page.outlet} size={96} />
            <div>
              <h1>
                Support {page.outlet.name} {page.outlet.verified && <Verified size={28} />}
              </h1>
              <p>{page.message || "Help us continue independent journalism for our community."}</p>
            </div>
          </header>

          {!page.enabled && <p className="nm-callout">{page.outlet.name} is not accepting donations right now.</p>}

          {receipt ? (
            <section className="nm-card nm-receipt">
              <CheckCircle2 className="nm-receipt__icon" />
              <h2>Thank you for supporting {receipt.outlet.name}!</h2>
              <p>
                Your {receipt.frequency === "once" ? "" : `${receipt.frequency} `}donation of <b>{money(receipt.amount, receipt.currency)}</b> was received.
              </p>
              <dl className="nm-dl">
                <dt>Receipt number</dt>
                <dd>{receipt.receiptNumber}</dd>
                <dt>Date</dt>
                <dd>{fmtDate(receipt.paidAt, true)}</dd>
                <dt>Shown publicly</dt>
                <dd>{receipt.anonymous ? "No — anonymous" : showName ? "Your name, as a supporter" : "No"}</dd>
              </dl>
              {receipt.frequency !== "once" && <p className="nm-muted">We'll remind you when your next {receipt.frequency} gift is due. You can cancel anytime from My Support.</p>}
              <p className="nm-muted">{receipt.note}</p>
              <div className="nm-row-actions">
                <Link to="/news/my-support" className="nm-btn nm-btn--primary">
                  View my donations
                </Link>
                <Link to={`/news/${page.outlet.slug}`} className="nm-btn nm-btn--ghost">
                  Back to {page.outlet.name}
                </Link>
              </div>
            </section>
          ) : (
            <div className="nm-support__grid">
              <section className="nm-support__photo">
                <Thumb src={page.outlet.coverUrl} />
                <ul>
                  <li>
                    <CheckCircle2 /> Report local and national news
                  </li>
                  <li>
                    <CheckCircle2 /> Investigate important issues
                  </li>
                  <li>
                    <CheckCircle2 /> Give a voice to our community
                  </li>
                  <li>
                    <CheckCircle2 /> Produce quality multimedia content
                  </li>
                </ul>
              </section>

              <section className="nm-card nm-donate">
                <h2 className="nm-card__title">Make a Donation</h2>
                {start ? (
                  <StripeProvider>
                    <PayButton start={start} onPaid={setReceipt} />
                    <button type="button" className="nm-link" onClick={() => setStart(null)}>
                      ← Change amount
                    </button>
                  </StripeProvider>
                ) : (
                  <>
                    <div className="nm-seg" role="radiogroup" aria-label="Frequency">
                      {(
                        [
                          ["once", "One-Time"],
                          ["monthly", "Monthly"],
                          ["annual", "Annual"],
                        ] as const
                      ).map(([k, l]) => (
                        <button key={k} type="button" role="radio" aria-checked={freq === k} className={freq === k ? "is-on" : ""} onClick={() => setFreq(k)} disabled={Boolean(pledgeId)}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="nm-amounts">
                      {page.suggested.map((v) => (
                        <button key={v} type="button" className={!custom && amount === v ? "is-on" : ""} onClick={() => (setAmount(v), setCustom(""))}>
                          {money(v, currency)}
                        </button>
                      ))}
                    </div>
                    <label className="nm-field">
                      <span className="nm-field__label">Other amount ({currency})</span>
                      <span className="nm-moneyinput">
                        <span>{currency === "USD" || currency === "CAD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : ""}</span>
                        <input className="nm-input" inputMode="decimal" type="number" min="1" step="0.01" placeholder="Custom amount" value={custom} onChange={(ev) => setCustom(ev.target.value)} />
                      </span>
                    </label>
                    {page.campaigns.length > 0 && (
                      <label className="nm-field">
                        <span className="nm-field__label">Campaign (optional)</span>
                        <select className="nm-input" value={campaignId} onChange={(ev) => setCampaignId(ev.target.value)}>
                          <option value="">General support</option>
                          {page.campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="nm-check">
                      <input type="checkbox" checked={showName && !anonymous} disabled={anonymous} onChange={(ev) => setShowName(ev.target.checked)} /> Display my name publicly as a supporter (optional)
                    </label>
                    <label className="nm-check">
                      <input type="checkbox" checked={anonymous} onChange={(ev) => setAnonymous(ev.target.checked)} /> I want to stay anonymous
                    </label>
                    <label className="nm-field">
                      <span className="nm-field__label">Message (optional)</span>
                      <textarea className="nm-input" rows={2} maxLength={500} value={message} onChange={(ev) => setMessage(ev.target.value)} />
                    </label>
                    {freq !== "once" && (
                      <p className="nm-note">
                        <Info /> Your first {freq} gift is charged today. We'll send a one-click reminder when the next one is due — you can cancel anytime.
                      </p>
                    )}
                    {formError && (
                      <p className="nm-form-error" role="alert">
                        {formError}
                      </p>
                    )}
                    <button type="button" className="nm-btn nm-btn--red nm-btn--block nm-btn--lg" onClick={begin} disabled={busy || !page.enabled}>
                      {busy ? <Loader2 className="nm-spin" /> : <Lock />} Continue to Secure Payment
                    </button>
                    {!signedIn() && <p className="nm-muted nm-center">You'll be asked to sign in to Fockis first.</p>}
                  </>
                )}
                <p className="nm-stripe">
                  Secure payment powered by <b>Stripe</b>. Your card details are never stored by Fockis or {page.outlet.name}.
                </p>
                <details className="nm-privacy">
                  <summary>What does {page.outlet.name} see?</summary>
                  <ul>
                    {page.privacy.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              </section>

              {campaign ? (
                <CampaignCard
                  c={campaign}
                  onSupport={() => {
                    setCampaignId(campaign.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ) : (
                <section className="nm-card">
                  <h2 className="nm-card__title">Our supporters</h2>
                  {page.supporters.length === 0 && <p className="nm-muted">Be the first to support {page.outlet.name}.</p>}
                  <ul className="nm-supporters">
                    {page.supporters.map((s, i) => (
                      <li key={i}>
                        <b>{s.name}</b>
                        {s.message && <p>“{s.message}”</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </NewsShell>
  );
}
