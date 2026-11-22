/**
 * ReaderPages.tsx — Request tracking (/news/requests/track) and
 * My Support (/news/my-support: donations, pledges, follows & notification
 * preferences, bookmarks).
 */

import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bookmark, HandHeart, Loader2, Search, Send } from "lucide-react";

import NewsShell from "./NewsShell";
import { ArticleTile, Empty, FollowControl, OutletLogo, Skeleton, Verified, loginPath, signedIn, useToast } from "./NewsParts";
import { REQUEST_STATUS_LABELS, fmtDate, money, newsApi, newsError, type ArticleCard, type DonationReceipt, type OutletCard, type Prefs, type RequestTracking } from "./newsApi";

const STEPS = ["submitted", "received", "under_review", "assigned", "in_progress", "completed"];

export function RequestTrackingPage() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [code, setCode] = useState("");
  const [r, setR] = useState<RequestTracking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");

  async function look(ev?: FormEvent) {
    ev?.preventDefault();
    if (!ref.trim()) return setError("Enter your reference number.");
    setBusy(true);
    setError("");
    try {
      setR(await newsApi.track(ref.trim().toUpperCase(), code.trim()));
    } catch (err) {
      setError(newsError(err, "No request matches this reference and code."));
    } finally {
      setBusy(false);
    }
  }

  async function send(ev: FormEvent) {
    ev.preventDefault();
    if (!r || !reply.trim()) return;
    setBusy(true);
    try {
      setR(await newsApi.trackReply(r.reference, code.trim(), reply.trim()));
      setReply("");
    } catch (err) {
      setError(newsError(err));
    } finally {
      setBusy(false);
    }
  }

  const idx = r ? STEPS.indexOf(r.status === "more_info" ? "under_review" : r.status) : -1;
  return (
    <NewsShell compactHeader>
      <div className="nm-narrow">
        <header className="nm-pagehead">
          <h1>
            <Search /> Track a request
          </h1>
          <p>Use the reference number and tracking code you received after submitting.</p>
        </header>
        <form className="nm-card nm-trackform" onSubmit={look}>
          <label className="nm-field">
            <span className="nm-field__label">Reference number</span>
            <input className="nm-input" value={ref} onChange={(ev) => setRef(ev.target.value)} placeholder="OUA-2026-000123" />
          </label>
          <label className="nm-field">
            <span className="nm-field__label">Tracking code</span>
            <input className="nm-input" value={code} onChange={(ev) => setCode(ev.target.value)} placeholder={signedIn() ? "Not needed if you were signed in when you sent it" : ""} />
          </label>
          <button type="submit" className="nm-btn nm-btn--primary" disabled={busy}>
            {busy && <Loader2 className="nm-spin" />} Check status
          </button>
          {error && <p className="nm-form-error">{error}</p>}
        </form>
        {r && (
          <section className="nm-card">
            <h2 className="nm-card__title">
              {r.typeLabel}: {r.subject}
            </h2>
            <p className="nm-muted">
              {r.reference} · sent to <Link to={`/news/${r.outlet.slug}`}>{r.outlet.name}</Link> on {fmtDate(r.submittedAt, true)}
            </p>
            {r.status === "declined" ? (
              <p className="nm-callout">This request was declined.</p>
            ) : (
              <ol className="nm-steps">
                {STEPS.map((s, i) => (
                  <li key={s} className={i <= idx ? "is-done" : ""}>
                    {REQUEST_STATUS_LABELS[s]}
                  </li>
                ))}
              </ol>
            )}
            {r.status === "more_info" && <p className="nm-note nm-note--amber">The newsroom needs more information. Reply below.</p>}
            <h3 className="nm-h3">Messages</h3>
            {r.messages.length === 0 && <p className="nm-muted">No messages yet.</p>}
            <ul className="nm-thread">
              {r.messages.map((m, i) => (
                <li key={i} className={m.from === "staff" ? "is-staff" : ""}>
                  <b>{m.byName}</b> <small>{fmtDate(m.at, true)}</small>
                  <p className="nm-pre">{m.text}</p>
                </li>
              ))}
            </ul>
            {r.canReply && (
              <form className="nm-reply" onSubmit={send}>
                <textarea className="nm-input" rows={3} maxLength={4000} value={reply} onChange={(ev) => setReply(ev.target.value)} placeholder="Add information for the newsroom…" />
                <button type="submit" className="nm-btn nm-btn--primary" disabled={busy || !reply.trim()}>
                  <Send /> Send
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </NewsShell>
  );
}

export function MySupportPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"donations" | "following" | "saved">("donations");
  const [don, setDon] = useState<{ items: DonationReceipt[]; pledges: { id: string; amount: number; currency: string; frequency: string; nextDueAt: string | null; due: boolean; outlet: { name: string; slug: string }; campaignId: string | null }[] } | null>(null);
  const [follows, setFollows] = useState<{ outlet: OutletCard; muted: boolean; prefs: Prefs }[] | null>(null);
  const [saved, setSaved] = useState<ArticleCard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signedIn()) return;
    const fail = (err: unknown) => setError(newsError(err));
    if (tab === "donations") newsApi.myDonations().then(setDon).catch(fail);
    if (tab === "following") newsApi.myFollows().then((r) => setFollows(r.items)).catch(fail);
    if (tab === "saved") newsApi.bookmarks().then((r) => setSaved(r.items)).catch(fail);
  }, [tab]);

  if (!signedIn())
    return (
      <NewsShell compactHeader>
        <Empty title="Sign in to see your support" action={<Link to={loginPath()} className="nm-btn nm-btn--primary">Sign in</Link>} />
      </NewsShell>
    );

  return (
    <NewsShell compactHeader>
      <header className="nm-pagehead">
        <h1>
          <HandHeart /> My News & Support
        </h1>
      </header>
      <div className="nm-tabs" role="tablist">
        {(
          [
            ["donations", "Donations"],
            ["following", "Following & notifications"],
            ["saved", "Saved articles"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {error && <p className="nm-form-error">{error}</p>}

      {tab === "donations" && (
        <>
          {!don && <Skeleton h={160} />}
          {don && don.pledges.length > 0 && (
            <section className="nm-card">
              <h2 className="nm-card__title">Recurring support</h2>
              <ul className="nm-pledges">
                {don.pledges.map((p) => (
                  <li key={p.id}>
                    <span>
                      <b>
                        {money(p.amount, p.currency)} {p.frequency === "monthly" ? "/ month" : "/ year"}
                      </b>{" "}
                      to <Link to={`/news/${p.outlet.slug}`}>{p.outlet.name}</Link>
                      <small> · next gift {p.due ? "due now" : fmtDate(p.nextDueAt)}</small>
                    </span>
                    <span className="nm-row-actions">
                      {p.due && (
                        <Link className="nm-btn nm-btn--red nm-btn--sm" to={`/news/${p.outlet.slug}/support?pledge=${p.id}&amount=${p.amount}&frequency=${p.frequency}${p.campaignId ? `&campaign=${p.campaignId}` : ""}`}>
                          Renew now
                        </Link>
                      )}
                      <button
                        type="button"
                        className="nm-btn nm-btn--ghost nm-btn--sm"
                        onClick={async () => {
                          if (!window.confirm("Cancel this recurring support?")) return;
                          try {
                            await newsApi.cancelPledge(p.id);
                            setDon((d) => (d ? { ...d, pledges: d.pledges.filter((x) => x.id !== p.id) } : d));
                            toast.show("ok", "Recurring support cancelled.");
                          } catch (err) {
                            toast.show("error", newsError(err));
                          }
                        }}
                      >
                        Cancel
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {don && don.items.length === 0 && <Empty icon={HandHeart} title="No donations yet" text="When you support a media organization, your receipts appear here." />}
          {don && don.items.length > 0 && (
            <section className="nm-card nm-card--flush">
              <div className="nm-tablewrap">
                <table className="nm-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Media</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Receipt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {don.items.map((d) => (
                      <tr key={d.id}>
                        <td>{fmtDate(d.paidAt)}</td>
                        <td>
                          <Link to={`/news/${d.outlet.slug}`}>{d.outlet.name}</Link>
                        </td>
                        <td>{money(d.amount, d.currency)}</td>
                        <td>{d.frequency === "once" ? "One-time" : d.frequency}</td>
                        <td>
                          <code>{d.receiptNumber}</code>
                        </td>
                        <td>{d.status === "refunded" ? <span className="nm-greypill">Refunded</span> : <span className="nm-okpill">Paid</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {tab === "following" && (
        <>
          {!follows && <Skeleton h={160} />}
          {follows && follows.length === 0 && <Empty title="You don't follow any media yet" action={<Link to="/news/directory" className="nm-btn nm-btn--primary">Open the Media Directory</Link>} />}
          <div className="nm-followlist">
            {follows?.map((f) => (
              <div key={f.outlet.id} className="nm-card nm-followrow">
                <Link to={`/news/${f.outlet.slug}`} className="nm-outletline__who">
                  <OutletLogo outlet={f.outlet} size={44} />
                  <span>
                    <b>
                      {f.outlet.name} {f.outlet.verified && <Verified size={14} />}
                    </b>
                    <small>
                      {f.muted ? "Muted" : `${Object.values(f.prefs).filter(Boolean).length} notification types on`}
                    </small>
                  </span>
                </Link>
                <FollowControl outletId={f.outlet.id} outletName={f.outlet.name} initial={{ isFollowing: true, muted: f.muted, prefs: f.prefs }} withBell notify={toast.show} />
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "saved" && (
        <>
          {!saved && <Skeleton h={160} />}
          {saved && saved.length === 0 && <Empty icon={Bookmark} title="No saved articles" text="Bookmark articles to read them later." />}
          <div className="nm-grid3">
            {saved?.map((a) => (
              <ArticleTile key={a.id} a={a} />
            ))}
          </div>
        </>
      )}
      {toast.node}
    </NewsShell>
  );
}
