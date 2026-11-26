/* ============================================================================
   CREATE / EDIT EVENT — "Registration & tickets" section
   Registration mode, dates, capacity rules, free or paid tickets, custom
   questions, terms, check-in, messages and online-meeting access.
   The server validates everything again (registration-settings.ts).
============================================================================ */

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, Globe, Plus, ShieldCheck, Ticket, Trash2, Users, UserRoundCheck, Lock, Ban } from "lucide-react";

import { EVENTS_URL, request } from "../services/eventsApi";
import type { AttendanceOption, QuestionType, RegistrationQuestion, RegistrationSettingsInput, TicketTypeInput } from "../types/event.types";
import { toLocalInputValue, fromLocalInputValue } from "../utils/eventTime";

export function defaultRegistrationSettings(isOnline: boolean): RegistrationSettingsInput {
  return {
    mode: "rsvp",
    opensAt: null,
    closesAt: null,
    waitlistEnabled: false,
    requireApproval: false,
    allowGuests: false,
    maxTicketsPerUser: 1,
    currency: "USD",
    ticketTypes: [{ id: "general", name: "General admission", description: "", price: 0, quantity: null }],
    taxRatePercent: 0,
    serviceFee: 0,
    questions: [],
    askAccessibility: true,
    askSpecialRequests: true,
    attendanceOptions: [isOnline ? "online" : "in_person"],
    termsText: "",
    termsUrl: "",
    cancellationPolicy: "",
    allowCancellation: true,
    cancellationDeadlineHours: 0,
    qrCheckIn: true,
    individualCheckIn: false,
    confirmationEmail: true,
    reminders: true,
    access: "public",
    organizationId: null,
    selectedGroupIds: [],
    earlyJoinMinutes: 15,
    checkInStaffIds: [],
    ticketSecurity: "standard",
    qrTtlSeconds: 30,
    allowReentry: false,
    showHolderPhoto: false,
  };
}

/** Client-side checks that mirror the server (the server is authoritative). */
export function validateRegistrationSettings(s: RegistrationSettingsInput, endDate: string): string | null {
  if (s.mode !== "required") return null;
  if (s.opensAt && s.closesAt && new Date(s.closesAt) <= new Date(s.opensAt)) return "The registration deadline must be after registration opens.";
  if (s.closesAt && endDate && new Date(s.closesAt) > new Date(endDate)) return "The registration deadline must be before the event ends.";
  for (const [i, t] of s.ticketTypes.entries()) {
    if (!t.name.trim()) return `Ticket ${i + 1} needs a name.`;
    if (!Number.isFinite(t.price) || t.price < 0) return `"${t.name}" needs a valid price.`;
    if (t.quantity !== null && (!Number.isInteger(t.quantity) || t.quantity < 1)) return `"${t.name}" quantity must be a whole number.`;
  }
  for (const [i, q] of s.questions.entries()) {
    if (!q.label.trim()) return `Question ${i + 1} needs text.`;
    if (["dropdown", "single_choice", "multiple_choice"].includes(q.type) && q.options.filter((o) => o.trim()).length < 2) return `"${q.label}" needs at least two options.`;
  }
  if (s.termsUrl && !/^https:\/\/\S+$/i.test(s.termsUrl)) return "The terms link must start with https://";
  if (s.access === "members" && !s.organizationId) return "Choose the organization whose members may attend.";
  return null;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "yes_no", label: "Yes / No" },
];

const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "HTG", "MXN", "BRL", "NGN", "GHS", "KES", "ZAR", "AUD", "JPY"];

const uid = (p: string) => `${p}_${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="fkr-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="fkr-toggle__track" aria-hidden="true" />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

interface Option {
  id: string;
  name: string;
}

function useMine(path: string, enabled: boolean): { items: Option[]; failed: boolean } {
  const [state, setState] = useState<{ items: Option[]; failed: boolean }>({ items: [], failed: false });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const base = EVENTS_URL.replace(/\/events$/, "");
    request<unknown>(`${base}${path}`, { signal: controller.signal })
      .then((raw) => {
        const r = raw as { items?: unknown[]; data?: unknown[] } | unknown[];
        const list = Array.isArray(r) ? r : (r.items ?? r.data ?? []);
        setState({
          items: (list as { id?: string; _id?: string; name?: string }[])
            .map((x) => ({ id: String(x.id ?? x._id ?? ""), name: String(x.name ?? "") }))
            .filter((x) => x.id && x.name),
          failed: false,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ items: [], failed: true });
      });
    return () => controller.abort();
  }, [path, enabled]);
  return state;
}

export default function RegistrationSettingsForm({
  value,
  onChange,
  isOnline,
  hasRegistrations = false,
  embedded = false,
}: {
  value: RegistrationSettingsInput;
  onChange: (next: RegistrationSettingsInput) => void;
  isOnline: boolean;
  /** Edit mode with existing registrations: warn before price changes. */
  hasRegistrations?: boolean;
  /**
   * The parent form shows the attendance format (in person / online / hybrid)
   * and the meeting-access choice itself (organization events dashboard).
   */
  embedded?: boolean;
}) {
  const s = value;
  const set = (patch: Partial<RegistrationSettingsInput>) => onChange({ ...s, ...patch });
  const paid = s.ticketTypes.some((t) => t.price > 0);
  const [pricing, setPricing] = useState<"free" | "paid">(paid ? "paid" : "free");
  const [openQ, setOpenQ] = useState<string | null>(null);
  const hybrid = !isOnline && s.attendanceOptions.includes("online");
  const showAccess = !embedded && (isOnline || hybrid || s.mode === "required");
  const orgs = useMine("/church/organizations?mine=true&pageSize=100", s.access === "members");
  const groups = useMine("/groups", s.access === "selected");

  useEffect(() => {
    // Online events are online-only; in-person ones may add online attendance (hybrid).
    if (isOnline && (s.attendanceOptions.length !== 1 || s.attendanceOptions[0] !== "online")) set({ attendanceOptions: ["online"] });
    if (!isOnline && !s.attendanceOptions.includes("in_person")) set({ attendanceOptions: ["in_person"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  function setTicket(i: number, patch: Partial<TicketTypeInput>) {
    set({ ticketTypes: s.ticketTypes.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  }
  function setQuestion(id: string, patch: Partial<RegistrationQuestion>) {
    set({ questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  }
  function moveQuestion(i: number, d: -1 | 1) {
    const list = [...s.questions];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    set({ questions: list });
  }

  const MODES = [
    { value: "required" as const, label: "Registration required", hint: "People register (free or paid) before attending.", icon: ClipboardCheck },
    { value: "rsvp" as const, label: "Optional RSVP", hint: "People can say Going or Interested.", icon: UserRoundCheck },
    { value: "none" as const, label: "No registration", hint: "Information only, with an Attend / Join action.", icon: Ban },
  ];

  return (
    <fieldset className="fke-fieldset fkr-settings">
      <legend>Registration & tickets</legend>

      <div className="fke-choice-grid" role="radiogroup" aria-label="Registration mode">
        {MODES.map((m) => (
          <button type="button" role="radio" aria-checked={s.mode === m.value} key={m.value} className={`fke-choice ${s.mode === m.value ? "is-active" : ""}`} onClick={() => set({ mode: m.value })}>
            <m.icon size={18} aria-hidden="true" />
            <strong>{m.label}</strong>
            <small>{m.hint}</small>
          </button>
        ))}
      </div>

      {!isOnline && !embedded && (
        <Toggle
          checked={hybrid}
          onChange={(v) => set({ attendanceOptions: v ? ["in_person", "online"] : ["in_person"] })}
          label="Also offer online attendance (hybrid)"
          hint="Attendees choose In person or Online. Paste the Fockis Meeting link below."
        />
      )}

      {s.mode === "required" && (
        <>
          <div className="fke-form-grid">
            <label className="fke-field">
              <span>Registration opens (optional)</span>
              <input type="datetime-local" value={s.opensAt ? toLocalInputValue(s.opensAt) : ""} onChange={(e) => set({ opensAt: e.target.value ? fromLocalInputValue(e.target.value) : null })} />
            </label>
            <label className="fke-field">
              <span>Registration deadline (optional)</span>
              <input type="datetime-local" value={s.closesAt ? toLocalInputValue(s.closesAt) : ""} onChange={(e) => set({ closesAt: e.target.value ? fromLocalInputValue(e.target.value) : null })} />
            </label>
          </div>

          <div className="fke-form-grid">
            <label className="fke-field">
              <span>Maximum tickets per person</span>
              <input type="number" min={1} max={20} value={s.maxTicketsPerUser} onChange={(e) => set({ maxTicketsPerUser: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
              <small className="fke-muted">{embedded ? "Maximum attendees = the capacity above." : "Maximum attendees = the event capacity under Privacy & capacity."}</small>
            </label>
          </div>

          <div className="fkr-toggles">
            <Toggle checked={s.waitlistEnabled} onChange={(v) => set({ waitlistEnabled: v })} label="Waitlist" hint="When full, people join a waitlist and move in automatically when places open." />
            <Toggle checked={s.requireApproval} onChange={(v) => set({ requireApproval: v })} label="Approve each registration" hint="You review registrations before they're confirmed." />
            <Toggle
              checked={s.allowGuests && !paid && s.ticketSecurity !== "enhanced"}
              onChange={(v) => set({ allowGuests: v })}
              label="Allow guests without a Fockis account"
              hint={paid ? "Only for free events." : s.ticketSecurity === "enhanced" ? "Not available with Enhanced ticket security." : "Public free events only."}
            />
          </div>

          <h4 className="fkr-subhead">
            <Ticket size={16} aria-hidden="true" /> Tickets
          </h4>
          <div className="fke-segmented" role="radiogroup" aria-label="Pricing">
            <button
              type="button"
              role="radio"
              aria-checked={pricing === "free"}
              className={pricing === "free" ? "is-active" : ""}
              onClick={() => {
                setPricing("free");
                set({ ticketTypes: s.ticketTypes.map((t) => ({ ...t, price: 0 })), taxRatePercent: 0, serviceFee: 0 });
              }}
            >
              Free event
            </button>
            <button type="button" role="radio" aria-checked={pricing === "paid"} className={pricing === "paid" ? "is-active" : ""} onClick={() => setPricing("paid")}>
              Paid event
            </button>
          </div>
          {hasRegistrations && <small className="fke-muted">Ticket types with registrations keep their price; add a new type for a different price.</small>}

          <div className="fkr-tickets-edit">
            {s.ticketTypes.map((t, i) => (
              <div key={t.id} className="fkr-ticket-edit">
                <label className="fke-field">
                  <span>Ticket name</span>
                  <input maxLength={80} value={t.name} onChange={(e) => setTicket(i, { name: e.target.value })} placeholder="General admission" />
                </label>
                {pricing === "paid" && (
                  <label className="fke-field">
                    <span>Price ({s.currency})</span>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={t.price} onChange={(e) => setTicket(i, { price: Math.max(0, Number(e.target.value) || 0) })} />
                  </label>
                )}
                <label className="fke-field">
                  <span>Quantity</span>
                  <input type="number" min={1} step={1} placeholder="Unlimited" value={t.quantity ?? ""} onChange={(e) => setTicket(i, { quantity: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : null })} />
                </label>
                <label className="fke-field fkr-ticket-edit__desc">
                  <span>Description (optional)</span>
                  <input maxLength={300} value={t.description} onChange={(e) => setTicket(i, { description: e.target.value })} placeholder="What's included" />
                </label>
                {s.ticketTypes.length > 1 && (
                  <button type="button" className="fke-btn fke-btn--ghost fkr-ticket-edit__remove" onClick={() => set({ ticketTypes: s.ticketTypes.filter((_, j) => j !== i) })} aria-label={`Remove ${t.name || "ticket"}`}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            {s.ticketTypes.length < 10 && (
              <button type="button" className="fke-btn fke-btn--ghost" onClick={() => set({ ticketTypes: [...s.ticketTypes, { id: uid("t"), name: "", description: "", price: 0, quantity: null }] })}>
                <Plus size={16} aria-hidden="true" /> Add ticket category
              </button>
            )}
          </div>

          {pricing === "paid" && (
            <div className="fke-form-grid fke-form-grid--3">
              <label className="fke-field">
                <span>Currency</span>
                <select value={s.currency} onChange={(e) => set({ currency: e.target.value })}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fke-field">
                <span>Tax (%)</span>
                <input type="number" min={0} max={30} step="0.01" value={s.taxRatePercent} onChange={(e) => set({ taxRatePercent: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })} />
              </label>
              <label className="fke-field">
                <span>Service fee per ticket</span>
                <input type="number" min={0} step="0.01" value={s.serviceFee} onChange={(e) => set({ serviceFee: Math.max(0, Number(e.target.value) || 0) })} />
              </label>
            </div>
          )}

          <h4 className="fkr-subhead">Registration questions</h4>
          <div className="fkr-toggles">
            <Toggle checked={s.askAccessibility} onChange={(v) => set({ askAccessibility: v })} label="Ask about accessibility requirements" />
            <Toggle checked={s.askSpecialRequests} onChange={(v) => set({ askSpecialRequests: v })} label="Ask for special requests" />
          </div>
          <ol className="fkr-qlist">
            {s.questions.map((q, i) => (
              <li key={q.id} className="fkr-q">
                <div className="fkr-q__row">
                  <input className="fkr-q__label" maxLength={200} value={q.label} placeholder="Question" aria-label={`Question ${i + 1}`} onChange={(e) => setQuestion(q.id, { label: e.target.value })} />
                  <select value={q.type} aria-label="Answer type" onChange={(e) => setQuestion(q.id, { type: e.target.value as QuestionType })}>
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label className="fkr-q__req">
                    <input type="checkbox" checked={q.required} onChange={(e) => setQuestion(q.id, { required: e.target.checked })} /> Required
                  </label>
                  <button type="button" className="fke-btn fke-btn--ghost" aria-label="Move up" onClick={() => moveQuestion(i, -1)} disabled={i === 0}>
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" className="fke-btn fke-btn--ghost" aria-label="Move down" onClick={() => moveQuestion(i, 1)} disabled={i === s.questions.length - 1}>
                    <ChevronDown size={16} />
                  </button>
                  <button type="button" className="fke-btn fke-btn--ghost" aria-label="Remove question" onClick={() => set({ questions: s.questions.filter((x) => x.id !== q.id) })}>
                    <Trash2 size={16} />
                  </button>
                </div>
                {["dropdown", "single_choice", "multiple_choice"].includes(q.type) && (
                  <label className="fke-field">
                    <span>Options (one per line)</span>
                    <textarea
                      rows={openQ === q.id ? 4 : 2}
                      onFocus={() => setOpenQ(q.id)}
                      value={q.options.join("\n")}
                      onChange={(e) => setQuestion(q.id, { options: e.target.value.split("\n").slice(0, 20) })}
                    />
                  </label>
                )}
              </li>
            ))}
          </ol>
          {s.questions.length < 20 && (
            <button type="button" className="fke-btn fke-btn--ghost" onClick={() => set({ questions: [...s.questions, { id: uid("q"), type: "short_text", label: "", required: false, options: [] }] })}>
              <Plus size={16} aria-hidden="true" /> Add question
            </button>
          )}

          <h4 className="fkr-subhead">Terms & cancellation</h4>
          <label className="fke-field">
            <span>Event terms and conditions (optional)</span>
            <textarea rows={3} maxLength={5000} value={s.termsText} onChange={(e) => set({ termsText: e.target.value })} />
          </label>
          <label className="fke-field">
            <span>Link to full terms (optional)</span>
            <input type="url" placeholder="https://" value={s.termsUrl} onChange={(e) => set({ termsUrl: e.target.value })} />
          </label>
          <label className="fke-field">
            <span>Cancellation policy (optional)</span>
            <textarea rows={2} maxLength={2000} value={s.cancellationPolicy} onChange={(e) => set({ cancellationPolicy: e.target.value })} placeholder="e.g. Full refund up to 48 hours before the event." />
          </label>
          <div className="fkr-toggles">
            <Toggle checked={s.allowCancellation} onChange={(v) => set({ allowCancellation: v })} label="Attendees can cancel online" />
          </div>
          {s.allowCancellation && (
            <label className="fke-field fke-field--narrow">
              <span>Cancel until (hours before start)</span>
              <input type="number" min={0} max={1440} value={s.cancellationDeadlineHours} onChange={(e) => set({ cancellationDeadlineHours: Math.max(0, Math.min(1440, Number(e.target.value) || 0)) })} />
            </label>
          )}

          <h4 className="fkr-subhead">Check-in & messages</h4>
          <div className="fkr-toggles">
            <Toggle checked={s.qrCheckIn} onChange={(v) => set({ qrCheckIn: v })} label="QR-code tickets & check-in" />
            <Toggle checked={s.individualCheckIn} onChange={(v) => set({ individualCheckIn: v })} label="Check in each attendee of a group separately" />
            <Toggle checked={s.confirmationEmail} onChange={(v) => set({ confirmationEmail: v })} label="Send a confirmation email" />
            <Toggle checked={s.reminders} onChange={(v) => set({ reminders: v })} label="Send a reminder 24 hours before" />
          </div>

          {s.qrCheckIn && (
            <>
              <h4 className="fkr-subhead">
                <ShieldCheck size={16} aria-hidden="true" /> Ticket security
              </h4>
              <p className="fke-muted">
                Every ticket shows a live QR code that changes on its own and only opens for the person who registered. Screenshots and
                copies stop working within seconds, and each ticket gets in once. These protections are always on.
              </p>
              <div className="fke-choice-grid" role="radiogroup" aria-label="Ticket security">
                {[
                  { v: "standard" as const, l: "Standard", h: "Live QR, linked to the attendee's account, one entry per ticket." },
                  { v: "enhanced" as const, l: "Enhanced", h: "Standard, plus staff confirm each person's identity (name and profile photo). Fockis account required." },
                ].map((o) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={(s.ticketSecurity ?? "standard") === o.v}
                    key={o.v}
                    className={`fke-choice ${(s.ticketSecurity ?? "standard") === o.v ? "is-active" : ""}`}
                    onClick={() => set({ ticketSecurity: o.v, ...(o.v === "enhanced" ? { allowGuests: false, showHolderPhoto: true } : {}) })}
                  >
                    <ShieldCheck size={18} aria-hidden="true" />
                    <strong>{o.l}</strong>
                    <small>{o.h}</small>
                  </button>
                ))}
              </div>
              <label className="fke-field fke-field--narrow">
                <span>QR code changes every</span>
                <select value={s.qrTtlSeconds ?? 30} onChange={(e) => set({ qrTtlSeconds: Number(e.target.value) })}>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds (recommended)</option>
                  <option value={60}>60 seconds</option>
                </select>
              </label>
              <div className="fkr-toggles">
                <Toggle
                  checked={Boolean(s.allowReentry)}
                  onChange={(v) => set({ allowReentry: v })}
                  label="Allow re-entry"
                  hint="A checked-in ticket can be scanned again (for people who step out). Off: each ticket gets in once."
                />
                {s.ticketSecurity !== "enhanced" && (
                  <Toggle
                    checked={Boolean(s.showHolderPhoto)}
                    onChange={(v) => set({ showHolderPhoto: v })}
                    label="Show staff the attendee's profile photo when scanning"
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      {showAccess && (
        <>
          <h4 className="fkr-subhead">
            <Globe size={16} aria-hidden="true" /> {isOnline || hybrid ? "Who can register and join online" : "Who can register"}
          </h4>
          <div className="fke-choice-grid" role="radiogroup" aria-label="Access">
            {[
              { v: "public" as const, l: "Public", h: "Anyone who can see the event.", i: Globe },
              { v: "members" as const, l: "Members only", h: "Active members of your organization.", i: Users },
              { v: "selected" as const, l: "Selected people & groups", h: "People you invite and members of chosen groups.", i: Lock },
            ].map((o) => (
              <button type="button" role="radio" aria-checked={s.access === o.v} key={o.v} className={`fke-choice ${s.access === o.v ? "is-active" : ""}`} onClick={() => set({ access: o.v, ...(o.v !== "public" ? { allowGuests: false } : {}) })}>
                <o.i size={18} aria-hidden="true" />
                <strong>{o.l}</strong>
                <small>{o.h}</small>
              </button>
            ))}
          </div>
          {s.access === "members" && (
            <label className="fke-field">
              <span>Organization</span>
              {orgs.items.length ? (
                <select value={s.organizationId ?? ""} onChange={(e) => set({ organizationId: e.target.value || null })}>
                  <option value="">Choose an organization…</option>
                  {orgs.items.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={s.organizationId ?? ""} placeholder="Organization ID" onChange={(e) => set({ organizationId: e.target.value.trim() || null })} />
              )}
              <small className="fke-muted">For church services: only active members can register and see the Join button.</small>
            </label>
          )}
          {s.access === "selected" && (
            <div className="fke-field">
              <span>Groups (optional) — invite individual people with the Invite button on the event page</span>
              {groups.items.length ? (
                <div className="fkr-chiplist">
                  {groups.items.map((g) => {
                    const on = s.selectedGroupIds.includes(g.id);
                    return (
                      <button type="button" key={g.id} className={`fkr-chip ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => set({ selectedGroupIds: on ? s.selectedGroupIds.filter((x) => x !== g.id) : [...s.selectedGroupIds, g.id] })}>
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <small className="fke-muted">{groups.failed ? "Your groups couldn't load." : "You don't have any groups yet."}</small>
              )}
            </div>
          )}
          {(isOnline || hybrid) && (
            <label className="fke-field fke-field--narrow">
              <span>Join button opens (minutes before start)</span>
              <input type="number" min={0} max={120} value={s.earlyJoinMinutes} onChange={(e) => set({ earlyJoinMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })} />
            </label>
          )}
        </>
      )}
    </fieldset>
  );
}

export type { AttendanceOption };
