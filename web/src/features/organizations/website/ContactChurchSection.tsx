/**
 * ContactChurchSection.tsx
 * -----------------------------------------------------------------------------
 * "Contact Our Church" / "Contact Our Organization" on the public homepage.
 * Anyone can send a message (no Fockis account needed); signed-in people also
 * see their earlier requests and the replies they were sent.
 *
 * Messages go to the existing Requests & Inquiries system
 * (POST /organizations/:id/requests/submit): server-side validation, rate
 * limits, duplicate checks, staff notifications and a confirmation email.
 * Prayer, counseling and assistance requests are only visible to the owner,
 * administrators and pastors. A "Plan a visit" message links to the Plan a
 * Visit booking form for an actual visit date.
 *
 * Links to "#contact-prayer", "#contact-visit"… open the form with that type.
 * Spam protection: hidden field + minimum fill time here, rate limits and
 * duplicate checks on the server.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CircleCheck, Lock, Mail, MapPin, Phone, Send } from "lucide-react";

import { PUBLIC_TYPES, requestsApi, STATUS_LABEL, fmtDay, type MyRequest, type RequestType } from "../requests/requestsApi";
import "./ContactChurch.scss";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENSITIVE = new Set<RequestType>(["prayer", "counseling", "assistance"]);

export interface ContactSectionProps {
  organizationId: string;
  organizationName: string;
  signedIn: boolean;
  title?: string;
  intro?: string;
  /** Request types offered (defaults to all public types). */
  types?: { value: RequestType; label: string }[];
  phone?: string;
  email?: string;
  location?: string;
  /** Rendered social links (icons). */
  socials?: ReactNode;
  /** Cover photo for the blue panel. */
  imageUrl?: string | null;
  /** Booking form for an actual visit (Plan a Visit). */
  planVisitHref?: string | null;
}

export default function ContactChurchSection({
  organizationId,
  organizationName,
  signedIn,
  title = "Contact Our Church",
  intro,
  types = PUBLIC_TYPES,
  phone,
  email,
  location,
  socials,
  imageUrl,
  planVisitHref,
}: ContactSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const startedAt = useRef(Date.now());
  const offered = types.length ? types : PUBLIC_TYPES;
  const [f, setF] = useState({ name: "", email: "", phone: "", requestType: offered[0].value as RequestType, subject: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mine, setMine] = useState<MyRequest[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const apply = () => {
      const m = /^#contact-([a-z_]+)$/.exec(window.location.hash);
      const t = m && offered.some((x) => x.value === m[1]) ? (m[1] as RequestType) : null;
      if (t) setF((s) => ({ ...s, requestType: t }));
      if (window.location.hash.startsWith("#contact")) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const c = new AbortController();
    requestsApi
      .mine(organizationId, c.signal)
      .then(setMine)
      .catch(() => setMine(null));
    return () => c.abort();
  }, [organizationId, signedIn, tick]);

  const set = (k: "name" | "email" | "phone" | "subject" | "message" | "website") => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // no double submissions
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = "Enter your full name.";
    if (!EMAIL.test(f.email.trim())) errs.email = "Enter a valid email address so we can reply.";
    if (f.phone.trim() && !/^[+()\d\s.-]{6,40}$/.test(f.phone.trim())) errs.phone = "Enter a valid phone number, or leave it empty.";
    if (f.subject.trim().length < 3) errs.subject = "Enter a subject.";
    if (f.message.trim().length < 10) errs.message = "Tell us a little more (at least 10 characters).";
    if (!f.consent) errs.consent = "Please agree to the privacy notice.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await requestsApi.submit(organizationId, {
        name: f.name.trim(),
        email: f.email.trim(),
        phone: f.phone.trim() || undefined,
        requestType: f.requestType,
        subject: f.subject.trim(),
        message: f.message.trim(),
        consent: true,
        website: f.website,
        startedAt: startedAt.current,
      });
      setDone(res.requestNumber);
      setF((s) => ({ ...s, subject: "", message: "", consent: false }));
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Your message could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="cw-contact" id="contact" ref={ref} aria-labelledby="cw-contact-title">
      <div className="cw-contact__panel">
        {imageUrl && <span className="cw-contact__photo" style={{ backgroundImage: `url("${imageUrl.replace(/"/g, "%22")}")` }} aria-hidden="true" />}
        <div className="cw-contact__panelin">
          <Mail className="cw-contact__icon" aria-hidden="true" />
          <h2 id="cw-contact-title">{title}</h2>
          <p>{intro ?? `Have a question or a request? Send ${organizationName} a message — no account needed.`}</p>
          {(phone || email || location) && (
            <ul className="cw-contact__info">
              {phone && (
                <li>
                  <span aria-hidden="true">
                    <Phone />
                  </span>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                </li>
              )}
              {email && (
                <li>
                  <span aria-hidden="true">
                    <Mail />
                  </span>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              )}
              {location && (
                <li>
                  <span aria-hidden="true">
                    <MapPin />
                  </span>
                  <span>{location}</span>
                </li>
              )}
            </ul>
          )}
          {socials && <div className="cw-contact__socials">{socials}</div>}
        </div>
        <svg className="cw-contact__wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 40 C 90 10, 170 60, 260 34 S 370 8, 400 22 L 400 60 L 0 60 Z" fill="rgba(255,255,255,0.14)" />
          <path d="M0 50 C 110 26, 200 62, 290 44 S 380 26, 400 34 L 400 60 L 0 60 Z" fill="var(--cw-sky, #2f8cff)" />
        </svg>
      </div>

      <div className="cw-contact__right">
        {done ? (
          <div className="cw-contact__done" role="status">
            <CircleCheck aria-hidden="true" />
            <h3>Thank you — your message was sent</h3>
            <p>
              {organizationName} received your request. Your reference number is <strong>{done}</strong>. We also sent a confirmation to your email.
            </p>
            <button
              type="button"
              className="cw-btn cw-btn--outline"
              onClick={() => {
                setDone(null);
                startedAt.current = Date.now();
              }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form className="cw-contact__form" onSubmit={submit} noValidate>
            {error && (
              <p className="cw-contact__error" role="alert">
                {error}
              </p>
            )}
            <div className="cw-contact__grid">
              <label>
                <span>Full name *</span>
                <input value={f.name} onChange={set("name")} maxLength={120} autoComplete="name" required aria-invalid={Boolean(errors.name)} />
                {errors.name && <small>{errors.name}</small>}
              </label>
              <label>
                <span>Email *</span>
                <input type="email" value={f.email} onChange={set("email")} maxLength={160} autoComplete="email" required aria-invalid={Boolean(errors.email)} />
                {errors.email && <small>{errors.email}</small>}
              </label>
              <label>
                <span>Phone (optional)</span>
                <input type="tel" value={f.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" aria-invalid={Boolean(errors.phone)} />
                {errors.phone && <small>{errors.phone}</small>}
              </label>
              <label>
                <span>What is it about? *</span>
                <select value={f.requestType} onChange={(e) => setF((s) => ({ ...s, requestType: e.target.value as RequestType }))}>
                  {offered.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {f.requestType === "visit" && planVisitHref && (
                <p className="cw-contact__full cw-contact__hint">
                  <CalendarCheck aria-hidden="true" /> Want to book a specific day? <Link to={planVisitHref}>Use Plan a Visit</Link> — or ask your question here.
                </p>
              )}
              <label className="cw-contact__full">
                <span>Subject *</span>
                <input value={f.subject} onChange={set("subject")} maxLength={150} required aria-invalid={Boolean(errors.subject)} />
                {errors.subject && <small>{errors.subject}</small>}
              </label>
              <label className="cw-contact__full">
                <span>Message *</span>
                <textarea rows={3} value={f.message} onChange={set("message")} maxLength={5000} required aria-invalid={Boolean(errors.message)} />
                <em>{f.message.length} / 5000</em>
                {errors.message && <small>{errors.message}</small>}
              </label>
              {/* Spam trap: hidden from people, filled in by bots. */}
              <label className="cw-contact__trap" aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
              </label>
            </div>

            <div className="cw-contact__privacy">
              <Lock aria-hidden="true" />
              <p>
                Used only to answer you; never published.{" "}
                {SENSITIVE.has(f.requestType) ? "This request is private: only the leaders and administrators can read it." : `Only ${organizationName}’s staff can read it.`}
              </p>
            </div>
            <div className="cw-contact__foot">
              <label className="cw-contact__consent">
                <input type="checkbox" checked={f.consent} onChange={(e) => setF((s) => ({ ...s, consent: e.target.checked }))} aria-invalid={Boolean(errors.consent)} />
                <span>I agree that {organizationName} may use these details to reply to me.</span>
              </label>
              <button type="submit" className="cw-btn cw-btn--primary cw-contact__send" disabled={busy}>
                <Send aria-hidden="true" /> {busy ? "Sending…" : "Send message"}
              </button>
            </div>
            {errors.consent && <small className="cw-contact__err">{errors.consent}</small>}
          </form>
        )}

        {mine && mine.length > 0 && (
          <details className="cw-contact__mine">
            <summary>Your earlier requests ({mine.length})</summary>
            <ul>
              {mine.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <details>
                    <summary>
                      <span>
                        <strong>{r.subject}</strong>
                        <small>
                          {r.requestNumber} · {fmtDay(r.createdAt)}
                        </small>
                      </span>
                      <span className={`cw-contact__status cw-contact__status--${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </summary>
                    <p className="cw-contact__msg">{r.message}</p>
                    {r.replies.length ? (
                      r.replies.map((x) => (
                        <div key={x.id} className="cw-contact__reply">
                          <small>
                            {x.sentByName} · {fmtDay(x.sentAt)}
                          </small>
                          <p>{x.body}</p>
                        </div>
                      ))
                    ) : (
                      <p className="cw-contact__none">No reply yet.</p>
                    )}
                  </details>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
