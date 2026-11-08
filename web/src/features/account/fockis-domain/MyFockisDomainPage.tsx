import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import fockisDomainApi, { apiMessage, fmtDate, money, perPeriod, type MyFockisDomain } from "./fockisDomainApi";
import "./MyFockisDomain.scss";

/**
 * /settings/fockis-domain — a person's own name.fockis.com.
 * Pick a name (kept for a few days), pay through the Fockis checkout, and it
 * shows on your profile. Organizations and schools have their own domains;
 * this one is personal and paid by you.
 */
export default function MyFockisDomainPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MyFockisDomain | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fockisDomainApi.mine());
      setLoadError("");
    } catch (e) {
      setLoadError(apiMessage(e, "Could not load your Fockis domain."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clean = name.trim().toLowerCase().replace(/\.fockis\.com$/, "").replace(/[^a-z0-9-]/g, "");

  useEffect(() => {
    if (clean.length < 3) return setCheck(null);
    const t = window.setTimeout(() => {
      fockisDomainApi
        .check(clean)
        .then((r) => setCheck({ ok: r.available, text: r.available ? `${r.domain} is available` : r.reason || "Not available" }))
        .catch(() => setCheck(null));
    }, 350);
    return () => window.clearTimeout(t);
  }, [clean]);

  async function reserve() {
    setBusy(true);
    setError("");
    try {
      setData(await fockisDomainApi.reserve(clean));
      setName("");
      setChanging(false);
    } catch (e) {
      setError(apiMessage(e, "Could not reserve that name."));
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    const d = data?.domain;
    if (!d) return;
    const paid = d.state === "active" || d.state === "paid" || d.state === "grace";
    if (!window.confirm(paid ? `Give up ${d.domain}? Anyone can take it afterwards and payments are not refunded.` : `Give back ${d.domain}?`)) return;
    setBusy(true);
    setError("");
    try {
      setData(await fockisDomainApi.release());
    } catch (e) {
      setError(apiMessage(e, "Could not give the name back."));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="fk-mydomain">
        <div className="fk-mydomain__wrap">
          <Link className="fk-mydomain__back" to="/settings">
            ← Settings
          </Link>
          {loadError ? <p className="fk-mydomain__error">{loadError}</p> : <p className="fk-mydomain__muted">Loading…</p>}
        </div>
      </div>
    );
  }

  const { domain: d, pricing } = data;
  const priceText = pricing.price > 0 ? `${money(pricing.price, pricing.currency)} ${perPeriod(pricing.periodMonths)}` : "Free";
  const showPicker = !d || changing;

  return (
    <div className="fk-mydomain">
      <div className="fk-mydomain__wrap">
        <Link className="fk-mydomain__back" to="/settings">
          ← Settings
        </Link>
        <header className="fk-mydomain__head">
          <span className="fk-mydomain__eyebrow">Fockis domain</span>
          <h1>Your own name.fockis.com</h1>
          <p>
            A personal Fockis domain, shown on your profile. It&apos;s yours alone — separate from any church, organization or school you belong to.
          </p>
        </header>

        {d && !changing && (
          <section className={`fk-mydomain__card is-${d.state}`}>
            <div className="fk-mydomain__domain">{d.domain}</div>
            {d.state === "unpaid" && (
              <>
                <p>
                  Reserved for you until <strong>{fmtDate(d.reservedUntil)}</strong>. Pay {money(d.price, d.currency)} {perPeriod(d.periodMonths)} to make it yours and show it on your
                  profile.
                </p>
                <div className="fk-mydomain__actions">
                  <button type="button" className="fk-mydomain__primary" onClick={() => navigate("/settings/fockis-domain/pay")}>
                    Pay {money(d.price, d.currency)}
                  </button>
                  <button type="button" className="fk-mydomain__secondary" onClick={() => setChanging(true)} disabled={busy}>
                    Choose another name
                  </button>
                  <button type="button" className="fk-mydomain__link" onClick={release} disabled={busy}>
                    Give it back
                  </button>
                </div>
              </>
            )}
            {(d.state === "active" || d.state === "paid" || d.state === "free" || d.state === "exempt") && (
              <>
                <p>
                  {d.state === "active" && <>Paid until <strong>{fmtDate(d.paidUntil)}</strong>. </>}
                  {d.state === "paid" && <>Paid for life. </>}
                  {d.state === "exempt" && <>Fockis gave you this domain for free. </>}
                  {d.state === "free" && <>Free right now. </>}
                  It shows on your profile.
                </p>
                <div className="fk-mydomain__actions">
                  {d.canPay && (
                    <button type="button" className="fk-mydomain__primary" onClick={() => navigate("/settings/fockis-domain/pay")}>
                      Renew · {money(d.price, d.currency)}
                    </button>
                  )}
                  <Link className="fk-mydomain__secondary" to="/profile">
                    See my profile
                  </Link>
                  <button type="button" className="fk-mydomain__link" onClick={release} disabled={busy}>
                    Give up this domain
                  </button>
                </div>
              </>
            )}
            {d.state === "grace" && (
              <>
                <p>
                  Payment is due. Pay before <strong>{fmtDate(d.graceEndsAt)}</strong> to keep it on your profile.
                </p>
                <div className="fk-mydomain__actions">
                  <button type="button" className="fk-mydomain__primary" onClick={() => navigate("/settings/fockis-domain/pay")}>
                    Pay {money(d.price, d.currency)}
                  </button>
                </div>
              </>
            )}
            {d.state === "expired" && (
              <>
                <p>Your domain has expired and no longer shows on your profile. Renew it to keep the name — after a while it becomes available to others.</p>
                <div className="fk-mydomain__actions">
                  <button type="button" className="fk-mydomain__primary" onClick={() => navigate("/settings/fockis-domain/pay")}>
                    Renew · {money(d.price, d.currency)}
                  </button>
                  <button type="button" className="fk-mydomain__link" onClick={release} disabled={busy}>
                    Give it up
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {showPicker && (
          <section className="fk-mydomain__card">
            <h2>{d ? "Choose another name" : "Choose your name"}</h2>
            <p className="fk-mydomain__muted">
              {pricing.enabled && pricing.price > 0
                ? `${priceText}. We keep the name for you for ${pricing.reservationDays} days while you pay. Nothing is charged automatically — you renew from this page.`
                : "Personal Fockis domains are free right now."}
            </p>
            <div className="fk-mydomain__input">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="yourname"
                aria-label="Domain name"
                autoComplete="off"
                maxLength={40}
              />
              <span>.fockis.com</span>
            </div>
            <small className={check ? (check.ok ? "fk-mydomain__ok" : "fk-mydomain__error") : "fk-mydomain__muted"}>
              {check?.text ?? "3–30 lowercase letters, numbers or dashes."}
            </small>
            <div className="fk-mydomain__actions">
              <button type="button" className="fk-mydomain__primary" disabled={busy || !check?.ok} onClick={reserve}>
                {busy ? "Saving…" : pricing.enabled && pricing.price > 0 ? "Reserve this name" : "Get this name"}
              </button>
              {changing && (
                <button type="button" className="fk-mydomain__secondary" onClick={() => setChanging(false)}>
                  Cancel
                </button>
              )}
            </div>
          </section>
        )}

        {error && <p className="fk-mydomain__error">{error}</p>}
        {pricing.note && <p className="fk-mydomain__note">{pricing.note}</p>}

        {data.payments.length > 0 && (
          <section className="fk-mydomain__card">
            <h2>Payments</h2>
            <ul className="fk-mydomain__payments">
              {data.payments.map((p, i) => (
                <li key={i}>
                  <strong>{p.amount !== undefined ? money(p.amount, p.currency || pricing.currency) : "Payment"}</strong>
                  <span>
                    {fmtDate(p.at)}
                    {p.to ? ` · covers until ${fmtDate(p.to)}` : p.method === "stripe" ? " · lifetime" : ""}
                    {p.method === "manual" ? " · recorded by Fockis" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
