/* ============================================================================
   EVENT REGISTRATION PAGE — /events/:eventId/register
   Left: attendee information and additional information. Right: event
   summary with the registration fee. Free events never touch Stripe: the
   button reads "Register for Free" and the registration is confirmed in one
   request. Paid events reserve places, then show the secure checkout step.
============================================================================ */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CircleUserRound,
  ClipboardList,
  Clock,
  Gift,
  Globe,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Ticket,
  UserRound,
  Users,
  Video,
} from "lucide-react";

import EventsShell from "../components/EventsShell";
import EventCover from "../components/EventCover";
import EventEmptyState from "../components/EventEmptyState";
import EventSkeleton from "../components/EventSkeleton";
import { EventsApiError } from "../services/eventsApi";
import type { EventCategory, RegistrationQuestion } from "../types/event.types";
import RegistrationPayment from "./RegistrationPayment";
import {
  computeTotals,
  eventWhen,
  formatMoney,
  registrationApi,
  STATUS_LABEL,
  type PaymentStart,
  type RegistrationDetail,
  type RegistrationSettingsView,
} from "./registrationApi";
import "./registration.scss";

type Answers = Record<string, string | string[] | boolean>;
type Errors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s.-]{7,40}$/;
const REQUESTS_MAX = 500;

export function rememberGuestKey(id: string, key: string) {
  try {
    localStorage.setItem(`fke-reg-key:${id}`, key);
  } catch {
    /* private mode */
  }
}

function QuestionField({ q, value, error, onChange }: { q: RegistrationQuestion; value: Answers[string] | undefined; error?: string; onChange: (v: Answers[string]) => void }) {
  const id = `fkr-q-${q.id}`;
  const label = (
    <>
      {q.label} {q.required ? <span className="fkr-req">*</span> : <span className="fkr-opt">(Optional)</span>}
    </>
  );
  const err = error ? (
    <small className="fkr-error" id={`${id}-err`}>
      {error}
    </small>
  ) : null;
  const described = error ? `${id}-err` : undefined;

  switch (q.type) {
    case "short_text":
      return (
        <label className="fkr-field" htmlFor={id}>
          <span className="fkr-label">{label}</span>
          <input id={id} className="fkr-input" maxLength={300} value={String(value ?? "")} aria-invalid={Boolean(error) || undefined} aria-describedby={described} onChange={(e) => onChange(e.target.value)} />
          {err}
        </label>
      );
    case "long_text":
      return (
        <label className="fkr-field" htmlFor={id}>
          <span className="fkr-label">{label}</span>
          <textarea id={id} className="fkr-input" rows={3} maxLength={3000} value={String(value ?? "")} aria-invalid={Boolean(error) || undefined} aria-describedby={described} onChange={(e) => onChange(e.target.value)} />
          {err}
        </label>
      );
    case "dropdown":
      return (
        <label className="fkr-field" htmlFor={id}>
          <span className="fkr-label">{label}</span>
          <select id={id} className="fkr-input" value={String(value ?? "")} aria-invalid={Boolean(error) || undefined} aria-describedby={described} onChange={(e) => onChange(e.target.value)}>
            <option value="">Choose…</option>
            {q.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {err}
        </label>
      );
    case "single_choice":
    case "yes_no": {
      const options = q.type === "yes_no" ? ["Yes", "No"] : q.options;
      const current = q.type === "yes_no" ? (value === true ? "Yes" : value === false ? "No" : "") : String(value ?? "");
      return (
        <fieldset className="fkr-field" aria-describedby={described}>
          <legend className="fkr-label">{label}</legend>
          <div className="fkr-choices">
            {options.map((o) => (
              <label key={o} className={`fkr-choice ${current === o ? "is-on" : ""}`}>
                <input type="radio" name={id} checked={current === o} onChange={() => onChange(q.type === "yes_no" ? o === "Yes" : o)} />
                <span className="fkr-radio" aria-hidden="true" />
                {o}
              </label>
            ))}
          </div>
          {err}
        </fieldset>
      );
    }
    case "multiple_choice": {
      const list = Array.isArray(value) ? value : [];
      return (
        <fieldset className="fkr-field" aria-describedby={described}>
          <legend className="fkr-label">{label}</legend>
          <div className="fkr-choices">
            {q.options.map((o) => (
              <label key={o} className={`fkr-choice ${list.includes(o) ? "is-on" : ""}`}>
                <input type="checkbox" checked={list.includes(o)} onChange={(e) => onChange(e.target.checked ? [...list, o] : list.filter((x) => x !== o))} />
                <span className="fkr-check" aria-hidden="true" />
                {o}
              </label>
            ))}
          </div>
          {err}
        </fieldset>
      );
    }
  }
}

export function EventSummaryCard({ data, quantity, ticketId }: { data: RegistrationSettingsView; quantity: number; ticketId: string }) {
  const { event, settings, availability } = data;
  const when = eventWhen(event);
  const ticket = settings.ticketTypes.find((t) => t.id === ticketId) ?? settings.ticketTypes[0];
  const totals = computeTotals(ticket?.price ?? 0, quantity, settings.taxRatePercent, settings.serviceFee);
  const free = totals.total === 0;
  const online = event.isOnline || settings.attendanceOptions.includes("online");
  const visibility =
    settings.access === "members" ? "Members only" : settings.access === "selected" ? "Invited people & groups" : event.visibility === "public" ? "Public Event" : event.visibility === "friends" ? "Friends of the organizer" : "Private event";

  return (
    <aside className="fkr-summary" aria-label="Event summary">
      <div className="fkr-summary__card">
        <div className="fkr-summary__cover">
          <EventCover event={{ ...event, category: "conference" as EventCategory, coverMediaType: event.coverMediaType === "video" ? "video" : "image" }} />
          {free && <span className="fkr-badge fkr-badge--free">FREE EVENT</span>}
        </div>
        <h2 className="fkr-summary__title">{event.title}</h2>
        {event.description && <p className="fkr-summary__desc">{event.description}</p>}
        {event.organizerName && <p className="fkr-summary__org">Organized by {event.organizerName}</p>}

        <ul className="fkr-facts">
          <li>
            <CalendarDays size={20} aria-hidden="true" />
            <span>{when.day}</span>
          </li>
          <li>
            <Clock size={20} aria-hidden="true" />
            <span>{when.time}</span>
          </li>
          <li>
            {event.isOnline ? <Video size={20} aria-hidden="true" /> : <MapPin size={20} aria-hidden="true" />}
            <span>
              {event.isOnline ? (
                <strong>Online event · Fockis Meeting</strong>
              ) : (
                <>
                  <strong>{event.locationName || "Location to be announced"}</strong>
                  {event.address && <small>{event.address}</small>}
                  {online && <small>Also available online</small>}
                </>
              )}
            </span>
          </li>
          <li>
            {settings.access === "public" ? <Users size={20} aria-hidden="true" /> : <Lock size={20} aria-hidden="true" />}
            <span>{visibility}</span>
          </li>
          {availability.capacity !== null && (
            <li>
              <Ticket size={20} aria-hidden="true" />
              <span>{availability.spotsLeft === 0 ? "Fully booked" : `${availability.spotsLeft} of ${availability.capacity} places available`}</span>
            </li>
          )}
        </ul>

        <div className={`fkr-fee ${free ? "fkr-fee--free" : ""}`}>
          <Ticket size={30} aria-hidden="true" className="fkr-fee__icon" />
          <div className="fkr-fee__text">
            <strong>{free ? "Registration Fee" : "Order total"}</strong>
            {free ? (
              <span>This event is free. No payment is required.</span>
            ) : (
              <dl className="fkr-breakdown">
                <div>
                  <dt>
                    {quantity} × {ticket?.name}
                  </dt>
                  <dd>{formatMoney(totals.subtotal, settings.currency)}</dd>
                </div>
                {totals.fees > 0 && (
                  <div>
                    <dt>Service fees</dt>
                    <dd>{formatMoney(totals.fees, settings.currency)}</dd>
                  </div>
                )}
                {totals.tax > 0 && (
                  <div>
                    <dt>Tax ({settings.taxRatePercent}%)</dt>
                    <dd>{formatMoney(totals.tax, settings.currency)}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <strong className="fkr-fee__amount">{formatMoney(totals.total, settings.currency)}</strong>
        </div>
      </div>

      <div className="fkr-summary__card fkr-perks">
        <h3>
          <Gift size={22} aria-hidden="true" /> What You'll Get
        </h3>
        <ul>
          <li>
            <CircleCheck size={20} aria-hidden="true" /> Event access
          </li>
          {settings.confirmationEmail && (
            <li>
              <CircleCheck size={20} aria-hidden="true" /> Confirmation email
            </li>
          )}
          <li>
            <CircleCheck size={20} aria-hidden="true" /> Add to your Fockis calendar
          </li>
          {settings.qrCheckIn && (
            <li>
              <CircleCheck size={20} aria-hidden="true" /> QR code check-in
            </li>
          )}
          {online && (
            <li>
              <CircleCheck size={20} aria-hidden="true" /> Join online via Fockis Meeting
            </li>
          )}
        </ul>
      </div>
    </aside>
  );
}

export default function RegistrationPage() {
  const { eventId = "" } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RegistrationSettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [count, setCount] = useState(1);
  const [ticketId, setTicketId] = useState("");
  const [mode, setMode] = useState<"in_person" | "online">("in_person");
  const [answers, setAnswers] = useState<Answers>({});
  const [requests, setRequests] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState<{ registration: RegistrationDetail; payment: PaymentStart | null } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    registrationApi
      .settings(eventId, controller.signal)
      .then((view) => {
        setData(view);
        setName(view.viewer.name);
        setEmail(view.viewer.email);
        setTicketId(view.settings.ticketTypes.find((t) => !t.soldOut)?.id ?? view.settings.ticketTypes[0]?.id ?? "");
        setMode(view.settings.attendanceOptions[0] ?? "in_person");
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setLoadError({ message: caught instanceof Error ? caught.message : "Unable to load registration.", status: caught instanceof EventsApiError ? caught.status : undefined });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [eventId]);

  const ticket = useMemo(() => data?.settings.ticketTypes.find((t) => t.id === ticketId) ?? data?.settings.ticketTypes[0], [data, ticketId]);
  const totals = data && ticket ? computeTotals(ticket.price, count, data.settings.taxRatePercent, data.settings.serviceFee) : null;
  const free = !totals || totals.total === 0;
  const maxCount = data ? Math.max(1, Math.min(data.settings.maxTicketsPerUser, ticket?.remaining ?? 99, data.availability.spotsLeft && data.availability.state === "open" ? data.availability.spotsLeft : 99)) : 1;

  useEffect(() => {
    if (count > maxCount) setCount(maxCount);
  }, [count, maxCount]);
  useEffect(() => {
    setGuestNames((g) => Array.from({ length: Math.max(0, count - 1) }, (_, i) => g[i] ?? ""));
  }, [count]);

  function validate(view: RegistrationSettingsView): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = "Enter your full name.";
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email address.";
    if (phone.trim() && !PHONE.test(phone.trim())) next.phone = "Enter a valid phone number.";
    for (const q of view.settings.questions) {
      const v = answers[q.id];
      const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
      if (q.required && empty) next[`q:${q.id}`] = `Please answer "${q.label}".`;
    }
    if (!agree) next.agree = "Please agree to the event terms and privacy policy.";
    return next;
  }

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!data || submitting) return;
    const found = validate(data);
    setErrors(found);
    if (Object.keys(found).length) {
      window.requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setSubmitting(true);
    try {
      const res = await registrationApi.register(eventId, {
        attendeeName: name.trim(),
        attendeeEmail: email.trim(),
        phone: phone.trim() || undefined,
        attendeeCount: count,
        ticketTypeId: ticket?.id,
        attendanceMode: mode,
        answers,
        accessibilityNeeds: accessibility.trim() || undefined,
        specialRequests: requests.trim() || undefined,
        agreeToTerms: true,
        guestNames: guestNames.map((g) => g.trim()),
      });
      if (res.accessKey) rememberGuestKey(res.registration.id, res.accessKey);
      if (res.payment) {
        setCheckout({ registration: res.registration, payment: res.payment });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const key = res.accessKey ? `?key=${encodeURIComponent(res.accessKey)}` : "";
      navigate(`/events/registrations/${res.registration.id}${key}`, { replace: true, state: { justRegistered: true } });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Registration failed. Please try again.";
      setErrors({ form: message });
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  const backTo = `/events/${encodeURIComponent(eventId)}`;
  const errorList = Object.entries(errors).filter(([, v]) => v);

  return (
    <EventsShell hideTabs>
      <div className="fkr">
        <Link to={backTo} className="fkr-back">
          <ArrowLeft size={18} aria-hidden="true" /> Back to Event
        </Link>

        <header className="fkr-pagehead">
          <span className="fkr-pagehead__icon" aria-hidden="true">
            <CalendarDays size={30} />
          </span>
          <div>
            <h1>Event Registration</h1>
            <p>{checkout ? "Complete your payment to confirm your registration." : "Complete your registration for the event below."}</p>
          </div>
        </header>

        {loading && <EventSkeleton variant="details" />}
        {loadError && (
          <EventEmptyState
            tone={loadError.status === 404 ? "default" : "error"}
            title={loadError.status === 404 ? "Event not found" : "Registration couldn't load"}
            body={loadError.status === 404 ? "It may have been deleted, or it's private." : loadError.message}
            action={
              <Link to="/events" className="fke-btn fke-btn--primary">
                Browse events
              </Link>
            }
          />
        )}

        {data && (
          <div className="fkr-layout">
            <div className="fkr-main">
              {checkout ? (
                <RegistrationPayment
                  registrationId={checkout.registration.id}
                  payment={checkout.payment}
                  amount={checkout.registration.totalAmount}
                  currency={checkout.registration.currency}
                  holdExpiresAt={checkout.registration.holdExpiresAt}
                  billingName={checkout.registration.attendeeName}
                  billingEmail={checkout.registration.attendeeEmail}
                  onPaid={(reg) => navigate(`/events/registrations/${reg.id}`, { replace: true, state: { justRegistered: true } })}
                />
              ) : data.viewer.registration ? (
                <section className="fkr-card fkr-card--notice">
                  <CircleCheck size={28} aria-hidden="true" />
                  <div>
                    <h2>You're already registered</h2>
                    <p>
                      Registration {data.viewer.registration.registrationNumber} · {STATUS_LABEL[data.viewer.registration.status]}
                    </p>
                  </div>
                  <Link to={`/events/registrations/${data.viewer.registration.id}`} className="fkr-btn fkr-btn--primary">
                    View registration
                  </Link>
                </section>
              ) : data.isOwner ? (
                <section className="fkr-card fkr-card--notice">
                  <UserRound size={28} aria-hidden="true" />
                  <div>
                    <h2>You're the organizer</h2>
                    <p>Manage who is coming from the registrations page.</p>
                  </div>
                  <Link to={`/events/${encodeURIComponent(eventId)}/registrations`} className="fkr-btn fkr-btn--primary">
                    Manage registrations
                  </Link>
                </section>
              ) : data.mode !== "required" ? (
                <section className="fkr-card fkr-card--notice">
                  <CalendarDays size={28} aria-hidden="true" />
                  <div>
                    <h2>No registration needed</h2>
                    <p>{data.mode === "rsvp" ? "Let the organizer know with Going or Interested on the event page." : "Just show up — or join online when it starts."}</p>
                  </div>
                  <Link to={backTo} className="fkr-btn fkr-btn--primary">
                    Back to event
                  </Link>
                </section>
              ) : !["open", "waitlist"].includes(data.availability.state) ? (
                <section className="fkr-card fkr-card--notice">
                  <ClipboardList size={28} aria-hidden="true" />
                  <div>
                    <h2>{data.availability.state === "full" ? "This event is full" : "Registration unavailable"}</h2>
                    <p>{data.availability.message}</p>
                  </div>
                </section>
              ) : !data.viewer.signedIn && !data.settings.allowGuests ? (
                <section className="fkr-card fkr-card--notice">
                  <CircleUserRound size={28} aria-hidden="true" />
                  <div>
                    <h2>Sign in to register</h2>
                    <p>Use your Fockis account so your ticket appears in My Events.</p>
                  </div>
                  <Link to={`/login?redirect=${encodeURIComponent(`/events/${eventId}/register`)}`} className="fkr-btn fkr-btn--primary">
                    Sign in
                  </Link>
                </section>
              ) : !data.viewer.hasAccess ? (
                <section className="fkr-card fkr-card--notice">
                  <Lock size={28} aria-hidden="true" />
                  <div>
                    <h2>{data.settings.access === "members" ? "Members only" : "Invitation only"}</h2>
                    <p>{data.settings.access === "members" ? "Registration is open to members of the organization." : "Registration is limited to invited people and selected groups."}</p>
                  </div>
                </section>
              ) : (
                <form className="fkr-form" onSubmit={submit} noValidate>
                  {errorList.length > 0 && (
                    <div className="fkr-alert fkr-alert--error" role="alert" tabIndex={-1} ref={errorRef}>
                      {errors.form ? (
                        errors.form
                      ) : (
                        <>
                          <strong>Please check the highlighted fields.</strong>
                          <ul>
                            {errorList.map(([k, v]) => (
                              <li key={k}>{v}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  {data.availability.state === "waitlist" && (
                    <div className="fkr-alert fkr-alert--info" role="status">
                      This event is full. Register to join the waitlist — we'll email you if a place opens.
                    </div>
                  )}

                  <section className="fkr-card" aria-labelledby="fkr-attendee">
                    <header className="fkr-card__head">
                      <span className="fkr-card__icon" aria-hidden="true">
                        <UserRound size={24} />
                      </span>
                      <div>
                        <h2 id="fkr-attendee">Attendee Information</h2>
                        <p>Please provide your details to register for this event.</p>
                      </div>
                    </header>

                    <label className="fkr-field" htmlFor="fkr-name">
                      <span className="fkr-label">
                        Full Name <span className="fkr-req">*</span>
                      </span>
                      <span className="fkr-input-wrap">
                        <UserRound size={20} aria-hidden="true" />
                        <input id="fkr-name" className="fkr-input" autoComplete="name" maxLength={120} placeholder="Enter your full name" value={name} aria-invalid={Boolean(errors.name) || undefined} onChange={(e) => setName(e.target.value)} />
                      </span>
                      {errors.name && <small className="fkr-error">{errors.name}</small>}
                    </label>

                    <label className="fkr-field" htmlFor="fkr-email">
                      <span className="fkr-label">
                        Email Address <span className="fkr-req">*</span>
                      </span>
                      <span className="fkr-input-wrap">
                        <Mail size={20} aria-hidden="true" />
                        <input id="fkr-email" className="fkr-input" type="email" autoComplete="email" maxLength={254} placeholder="Enter your email address" value={email} aria-invalid={Boolean(errors.email) || undefined} onChange={(e) => setEmail(e.target.value)} />
                      </span>
                      {errors.email && <small className="fkr-error">{errors.email}</small>}
                    </label>

                    <div className="fkr-grid2">
                      <label className="fkr-field" htmlFor="fkr-phone">
                        <span className="fkr-label">Phone Number (Optional)</span>
                        <span className="fkr-input-wrap">
                          <Phone size={20} aria-hidden="true" />
                          <input id="fkr-phone" className="fkr-input" type="tel" autoComplete="tel" maxLength={40} placeholder="(xxx) xxx-xxxx" value={phone} aria-invalid={Boolean(errors.phone) || undefined} onChange={(e) => setPhone(e.target.value)} />
                        </span>
                        {errors.phone && <small className="fkr-error">{errors.phone}</small>}
                      </label>
                      <label className="fkr-field" htmlFor="fkr-count">
                        <span className="fkr-label">
                          Number of Attendees <span className="fkr-req">*</span>
                        </span>
                        <span className="fkr-input-wrap fkr-input-wrap--select">
                          <Users size={20} aria-hidden="true" />
                          <select id="fkr-count" className="fkr-input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                            {Array.from({ length: maxCount }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </span>
                      </label>
                    </div>

                    {guestNames.length > 0 && (
                      <div className="fkr-guests">
                        <span className="fkr-label">Names of the other attendees (optional)</span>
                        {guestNames.map((g, i) => (
                          <input
                            key={i}
                            className="fkr-input"
                            maxLength={120}
                            placeholder={`Attendee ${i + 2}`}
                            aria-label={`Name of attendee ${i + 2}`}
                            value={g}
                            onChange={(e) => setGuestNames((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                          />
                        ))}
                      </div>
                    )}

                    {(data.settings.ticketTypes.length > 1 || !data.settings.isFree) && (
                      <fieldset className="fkr-field">
                        <legend className="fkr-label">
                          Ticket <span className="fkr-req">*</span>
                        </legend>
                        <div className="fkr-tickets">
                          {data.settings.ticketTypes.map((t) => (
                            <label key={t.id} className={`fkr-ticket ${t.id === ticket?.id ? "is-on" : ""} ${t.soldOut ? "is-off" : ""}`}>
                              <input type="radio" name="fkr-ticket" checked={t.id === ticket?.id} disabled={t.soldOut} onChange={() => setTicketId(t.id)} />
                              <span className="fkr-radio" aria-hidden="true" />
                              <span className="fkr-ticket__text">
                                <strong>{t.name}</strong>
                                {t.description && <small>{t.description}</small>}
                                {t.remaining !== null && <small>{t.soldOut ? "Sold out" : `${t.remaining} left`}</small>}
                              </span>
                              <strong className="fkr-ticket__price">{t.price > 0 ? formatMoney(t.price, data.settings.currency) : "Free"}</strong>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                  </section>

                  <section className="fkr-card" aria-labelledby="fkr-more">
                    <header className="fkr-card__head">
                      <span className="fkr-card__icon" aria-hidden="true">
                        <ClipboardList size={24} />
                      </span>
                      <div>
                        <h2 id="fkr-more">Additional Information</h2>
                        <p>The organizer would like a little more information.</p>
                      </div>
                    </header>

                    {data.settings.attendanceOptions.length > 1 && (
                      <fieldset className="fkr-field">
                        <legend className="fkr-label">
                          Are you attending in person or online? <span className="fkr-req">*</span>
                        </legend>
                        <div className="fkr-choices fkr-choices--stack">
                          <label className={`fkr-choice ${mode === "in_person" ? "is-on" : ""}`}>
                            <input type="radio" name="fkr-mode" checked={mode === "in_person"} onChange={() => setMode("in_person")} />
                            <span className="fkr-radio" aria-hidden="true" />
                            <Monitor size={22} aria-hidden="true" />
                            <strong>In Person</strong> <span className="fkr-muted">(Attend at the event location)</span>
                          </label>
                          <label className={`fkr-choice ${mode === "online" ? "is-on" : ""}`}>
                            <input type="radio" name="fkr-mode" checked={mode === "online"} onChange={() => setMode("online")} />
                            <span className="fkr-radio" aria-hidden="true" />
                            <Video size={22} aria-hidden="true" />
                            <strong>Online</strong> <span className="fkr-muted">(Join via Fockis Meeting)</span>
                          </label>
                        </div>
                      </fieldset>
                    )}

                    {data.settings.questions.map((q) => (
                      <QuestionField key={q.id} q={q} value={answers[q.id]} error={errors[`q:${q.id}`]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
                    ))}

                    {data.settings.askSpecialRequests && (
                      <label className="fkr-field" htmlFor="fkr-requests">
                        <span className="fkr-label">Do you have any special requests? (Optional)</span>
                        <textarea id="fkr-requests" className="fkr-input" rows={3} maxLength={REQUESTS_MAX} placeholder="Let the organizer know (e.g., seating, dietary needs, etc.)" value={requests} onChange={(e) => setRequests(e.target.value)} />
                        <small className="fkr-counter">
                          {requests.length} / {REQUESTS_MAX}
                        </small>
                      </label>
                    )}
                    {data.settings.askAccessibility && (
                      <label className="fkr-field" htmlFor="fkr-access">
                        <span className="fkr-label">Accessibility requirements (Optional)</span>
                        <textarea id="fkr-access" className="fkr-input" rows={2} maxLength={REQUESTS_MAX} placeholder="Wheelchair access, interpreter, assistance…" value={accessibility} onChange={(e) => setAccessibility(e.target.value)} />
                        <small className="fkr-counter">
                          {accessibility.length} / {REQUESTS_MAX}
                        </small>
                      </label>
                    )}

                    {data.settings.termsText && (
                      <details className="fkr-terms">
                        <summary>Read the event terms</summary>
                        <p>{data.settings.termsText}</p>
                        {data.settings.cancellationPolicy && (
                          <p>
                            <strong>Cancellation policy:</strong> {data.settings.cancellationPolicy}
                          </p>
                        )}
                      </details>
                    )}

                    <label className={`fkr-agree ${errors.agree ? "is-invalid" : ""}`}>
                      <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={Boolean(errors.agree) || undefined} />
                      <span className="fkr-check" aria-hidden="true" />
                      <span>
                        I agree to the event{" "}
                        {data.settings.termsUrl ? (
                          <a href={data.settings.termsUrl} target="_blank" rel="noopener noreferrer">
                            terms
                          </a>
                        ) : (
                          <a href="/terms" target="_blank" rel="noopener noreferrer">
                            terms
                          </a>
                        )}
                        ,{" "}
                        <a href="/community-guidelines" target="_blank" rel="noopener noreferrer">
                          code of conduct
                        </a>
                        , and{" "}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">
                          privacy policy
                        </a>
                        . <span className="fkr-req">*</span>
                      </span>
                    </label>

                    <div className="fkr-actions">
                      <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => navigate(backTo)} disabled={submitting}>
                        Cancel
                      </button>
                      <button type="submit" className="fkr-btn fkr-btn--primary fkr-btn--grow" disabled={submitting}>
                        {submitting ? <LoaderCircle className="fkr-spin" size={20} aria-hidden="true" /> : <CircleCheck size={22} aria-hidden="true" />}
                        {submitting
                          ? "Registering…"
                          : data.availability.state === "waitlist"
                            ? "Join the Waitlist"
                            : free
                              ? "Register for Free"
                              : data.settings.requireApproval
                                ? "Request to Register"
                                : `Continue to Payment · ${formatMoney(totals?.total ?? 0, data.settings.currency)}`}
                      </button>
                    </div>
                    {!free && data.settings.requireApproval && <p className="fkr-muted fkr-center">You'll be asked to pay after the organizer approves your registration.</p>}
                    {data.viewer.signedIn === false && <p className="fkr-muted fkr-center"><Globe size={14} aria-hidden="true" /> Registering as a guest. Your ticket link will be emailed to you.</p>}
                  </section>
                </form>
              )}
            </div>

            <EventSummaryCard data={data} quantity={count} ticketId={ticket?.id ?? ""} />
          </div>
        )}
      </div>
    </EventsShell>
  );
}
