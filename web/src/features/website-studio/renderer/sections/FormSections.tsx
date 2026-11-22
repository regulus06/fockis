import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons";
import { useRender, useSection } from "../context";
import { EditableText, SectionHeading } from "../editable";
import { formatMoney } from "../theme";
import { useCart } from "../../runtime/cart";
import { websiteStudioApi, apiError } from "../../services/websiteStudioApi";

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function useSubmit() {
  const { runtime, mode } = useRender();
  const [state, setState] = useState<{ busy: boolean; error: string | null; done: { confirmationCode: string } | null }>({ busy: false, error: null, done: null });
  const submit = async (type: string, data: Record<string, unknown>) => {
    if (mode === "edit") return;
    if (!runtime.siteId || runtime.kind !== "website") {
      setState({ busy: false, error: "Forms are active once this website is published.", done: null });
      return;
    }
    setState({ busy: true, error: null, done: null });
    try {
      const res = await websiteStudioApi.submit(runtime.siteId, type, data);
      setState({ busy: false, error: null, done: { confirmationCode: res.confirmationCode } });
    } catch (e) {
      setState({ busy: false, error: apiError(e, "Could not send. Please try again."), done: null });
    }
  };
  return { ...state, submit, reset: () => setState({ busy: false, error: null, done: null }) };
}

const FIELD_LABEL: Record<string, string> = {
  name: "Full name",
  email: "Email",
  phone: "Phone",
  message: "Message",
  date: "Event date",
  guests: "Number of guests",
  subject: "Subject",
};

export function ContactForm() {
  const section = useSection();
  const { content } = useRender();
  const p = section.props;
  const fields: string[] = p.fields ?? ["name", "email", "message"];
  const [values, setValues] = useState<Record<string, string>>({});
  const s = useSubmit();
  const valid = (!fields.includes("name") || (values.name ?? "").trim().length > 1) && (!fields.includes("email") || /\S+@\S+\.\S+/.test(values.email ?? ""));
  return (
    <div className={`ws-container ws-contact${p.showInfo ? " has-info" : ""}`}>
      <div className="ws-contact__form">
        <SectionHeading bodyPath="text" styleOverride="plain" />
        {s.done ? (
          <div className="ws-success">
            <Icon name="Check" size={22} /> Thank you! Your message was sent. Reference {s.done.confirmationCode}.
          </div>
        ) : (
          <form
            className="ws-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) void s.submit(p.formType || "contact", values);
            }}
          >
            {fields.map((f) => (
              <label key={f} className={`ws-field${f === "message" ? " ws-field--full" : ""}`}>
                <span>{FIELD_LABEL[f] ?? f}</span>
                {f === "message" ? (
                  <textarea rows={5} value={values[f] ?? ""} onChange={(e) => setValues({ ...values, [f]: e.target.value })} required />
                ) : (
                  <input
                    type={f === "email" ? "email" : f === "date" ? "date" : f === "guests" ? "number" : f === "phone" ? "tel" : "text"}
                    value={values[f] ?? ""}
                    onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                    required={f === "name" || f === "email"}
                  />
                )}
              </label>
            ))}
            {s.error ? <p className="ws-form-error">{s.error}</p> : null}
            <button type="submit" className="ws-btn ws-btn--primary" disabled={s.busy || !valid}>
              <Icon name="Mail" size={18} />
              <span>{s.busy ? "Sending…" : p.submitLabel || "Send"}</span>
            </button>
          </form>
        )}
      </div>
      {p.showInfo ? (
        <aside className="ws-contact__info">
          <h3>{content.settings.businessName}</h3>
          <p><Icon name="MapPin" size={18} /> {content.settings.address}</p>
          <p><Icon name="Phone" size={18} /> {content.settings.phone}</p>
          <p><Icon name="Mail" size={18} /> {content.settings.email}</p>
          {p.showHours ? (
            <dl className="ws-hours__table">
              {content.settings.hours.map((h, i) => (
                <div key={i}><dt>{h.label}</dt><dd>{h.value}</dd></div>
              ))}
            </dl>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

export function Newsletter() {
  const section = useSection();
  const p = section.props;
  const [email, setEmail] = useState("");
  const s = useSubmit();
  return (
    <div className="ws-container ws-newsletter">
      <div>
        <EditableText as="h2" path="title" className="ws-newsletter__title" />
        <EditableText as="p" path="text" />
      </div>
      {s.done ? (
        <div className="ws-success"><Icon name="Check" size={20} /> You’re subscribed!</div>
      ) : (
        <form className="ws-newsletter__form" onSubmit={(e) => (e.preventDefault(), /\S+@\S+\.\S+/.test(email) && s.submit("newsletter", { email }))}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={p.placeholder || "Your email"} aria-label="Email" required />
          <button type="submit" className="ws-btn ws-btn--accent" disabled={s.busy}>
            <span>{p.buttonLabel || "Subscribe"}</span>
          </button>
        </form>
      )}
      {s.error ? <p className="ws-form-error">{s.error}</p> : null}
    </div>
  );
}

function SlotPicker({ type, date, serviceId, staffId, value, onChange }: { type: "booking" | "reservation"; date: string; serviceId?: string; staffId?: string; value: string; onChange: (v: string) => void }) {
  const { runtime, mode, content } = useRender();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!date) return;
    if (mode === "edit" || !runtime.siteId || runtime.kind !== "website") {
      // Preview-only slots computed from settings so the form looks real in the editor.
      const b = content.settings.booking;
      const out: string[] = [];
      const [oh, om] = b.openTime.split(":").map(Number);
      const [ch, cm] = b.closeTime.split(":").map(Number);
      for (let m = oh * 60 + om; m < ch * 60 + cm; m += Math.max(15, b.slotMinutes)) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
      setSlots(out.slice(0, 16));
      return;
    }
    let active = true;
    setSlots(null);
    websiteStudioApi
      .availability(runtime.siteId, { type, date, serviceId, staffId })
      .then((r) => active && (setSlots(r.slots), setError(null)))
      .catch((e) => active && setError(apiError(e)));
    return () => {
      active = false;
    };
  }, [type, date, serviceId, staffId, runtime.siteId, runtime.kind, mode, content.settings.booking]);
  if (error) return <p className="ws-form-error">{error}</p>;
  if (!slots) return <p className="ws-muted">Checking availability…</p>;
  if (!slots.length) return <p className="ws-muted">No times available on this day. Please choose another date.</p>;
  return (
    <div className="ws-slots" role="radiogroup" aria-label="Available times">
      {slots.map((t) => {
        const [h, m] = t.split(":").map(Number);
        const label = new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return (
          <button type="button" key={t} className={value === t ? "is-active" : ""} onClick={() => onChange(t)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function BookingForm() {
  const section = useSection();
  const { content, runtime } = useRender();
  const p = section.props;
  const services = content.catalog.services;
  const [serviceId, setServiceId] = useState(runtime.query.get("service") ?? services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(runtime.query.get("staff") ?? "");
  const [date, setDate] = useState(today(1));
  const [time, setTime] = useState("");
  const [info, setInfo] = useState({ name: "", email: "", phone: "", notes: "" });
  const s = useSubmit();
  const service = services.find((x) => x.id === serviceId);
  const staff = content.catalog.staff.filter((m) => !serviceId || !m.serviceIds?.length || m.serviceIds.includes(serviceId));
  useEffect(() => setTime(""), [date, serviceId, staffId]);
  const valid = !!service && !!date && !!time && info.name.trim().length > 1 && /\S+@\S+\.\S+/.test(info.email);
  if (s.done) {
    return (
      <div className="ws-container ws-booking">
        <div className="ws-confirm">
          <span className="ws-checkout__check"><Icon name="Check" size={30} strokeWidth={2.4} /></span>
          <h3>Booking request received!</h3>
          <p>
            {service?.name} on {date} at {time}. Your confirmation code is <strong>{s.done.confirmationCode}</strong>.
          </p>
          <p className="ws-muted">We’ll send a confirmation to {info.email}.</p>
          <button type="button" className="ws-btn ws-btn--outline" onClick={() => (s.reset(), setTime(""))}><span>Book another</span></button>
        </div>
      </div>
    );
  }
  return (
    <div className="ws-container ws-booking">
      <form className="ws-booking__card" onSubmit={(e) => (e.preventDefault(), valid && s.submit("booking", { serviceId, serviceName: service?.name, staffId, staffName: content.catalog.staff.find((m) => m.id === staffId)?.name ?? "Any", date, time, durationMinutes: service?.durationMinutes, price: service?.price, ...info }))}>
        <EditableText as="h3" path="title" className="ws-booking__title" />
        <div className="ws-field-row">
          <label className="ws-field">
            <span>Service</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {services.map((sv) => (
                <option key={sv.id} value={sv.id}>
                  {sv.name} — {formatMoney(sv.price, content.settings.currency)} · {sv.durationMinutes} min
                </option>
              ))}
            </select>
          </label>
          {p.allowStaffChoice && content.catalog.staff.length ? (
            <label className="ws-field">
              <span>Professional</span>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Any available</option>
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <label className="ws-field">
          <span>Date</span>
          <input type="date" min={today(0)} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="ws-field">
          <span>Time</span>
          <SlotPicker type="booking" date={date} serviceId={serviceId} staffId={staffId} value={time} onChange={setTime} />
        </div>
        <div className="ws-field-row">
          <label className="ws-field"><span>Full name</span><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required /></label>
          <label className="ws-field"><span>Phone</span><input type="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></label>
        </div>
        <label className="ws-field"><span>Email</span><input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required /></label>
        <label className="ws-field"><span>Notes (optional)</span><textarea rows={2} value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} /></label>
        {s.error ? <p className="ws-form-error">{s.error}</p> : null}
        <button type="submit" className="ws-btn ws-btn--primary ws-btn--block" disabled={!valid || s.busy}>
          <Icon name="CalendarDays" size={18} />
          <span>{s.busy ? "Booking…" : p.submitLabel || "Confirm Booking"}</span>
        </button>
      </form>
    </div>
  );
}

export function ReservationForm() {
  const section = useSection();
  const { content } = useRender();
  const p = section.props;
  const [date, setDate] = useState(today(0));
  const [time, setTime] = useState("");
  const [party, setParty] = useState(2);
  const [info, setInfo] = useState({ name: "", email: "", phone: "", notes: "" });
  const s = useSubmit();
  useEffect(() => setTime(""), [date]);
  const valid = !!date && !!time && info.name.trim().length > 1 && /\S+@\S+\.\S+/.test(info.email);
  if (s.done) {
    return (
      <div className="ws-container ws-booking">
        <div className="ws-confirm">
          <span className="ws-checkout__check"><Icon name="Check" size={30} strokeWidth={2.4} /></span>
          <h3>Reservation requested</h3>
          <p>Table for {party} on {date} at {time}. Confirmation code <strong>{s.done.confirmationCode}</strong>.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="ws-container ws-booking">
      <form className="ws-booking__card" onSubmit={(e) => (e.preventDefault(), valid && s.submit("reservation", { date, time, partySize: party, ...info }))}>
        <EditableText as="h3" path="title" className="ws-booking__title" />
        <div className="ws-field-row">
          <label className="ws-field"><span>Date</span><input type="date" min={today(0)} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label className="ws-field">
            <span>Guests</span>
            <select value={party} onChange={(e) => setParty(Number(e.target.value))}>
              {Array.from({ length: content.settings.booking.maxPartySize || 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="ws-field"><span>Time</span><SlotPicker type="reservation" date={date} value={time} onChange={setTime} /></div>
        <div className="ws-field-row">
          <label className="ws-field"><span>Full name</span><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required /></label>
          <label className="ws-field"><span>Phone</span><input type="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} /></label>
        </div>
        <label className="ws-field"><span>Email</span><input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required /></label>
        <label className="ws-field"><span>Special requests</span><textarea rows={2} value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} /></label>
        {s.error ? <p className="ws-form-error">{s.error}</p> : null}
        <button type="submit" className="ws-btn ws-btn--primary ws-btn--block" disabled={!valid || s.busy}>
          <Icon name="CalendarDays" size={18} />
          <span>{s.busy ? "Sending…" : p.submitLabel || "Reserve"}</span>
        </button>
      </form>
    </div>
  );
}

export function CustomCakeForm() {
  const section = useSection();
  const { content, mode } = useRender();
  const cart = useCart();
  const p = section.props;
  const o = content.settings.cakeOptions;
  const [size, setSize] = useState(o.sizes[0]?.label ?? "");
  const [flavor, setFlavor] = useState(o.flavors[0] ?? "");
  const [filling, setFilling] = useState(o.fillings[0] ?? "");
  const [frosting, setFrosting] = useState(o.frostings[0] ?? "");
  const [message, setMessage] = useState("");
  const [decoration, setDecoration] = useState("");
  const [added, setAdded] = useState(false);
  const price = useMemo(() => {
    const base = o.sizes.find((s) => s.label === size)?.price ?? 0;
    return base + (decoration.trim() ? o.decorationFee : 0);
  }, [o, size, decoration]);
  const currency = content.settings.currency;
  const options: [string, string, string[], (v: string) => void][] = [
    ["Size", size, o.sizes.map((s) => s.label), setSize],
    ["Flavor", flavor, o.flavors, setFlavor],
    ["Filling", filling, o.fillings, setFilling],
    ["Frosting", frosting, o.frostings, setFrosting],
  ];
  return (
    <div className="ws-container ws-booking">
      <div className="ws-booking__card">
        <EditableText as="h3" path="title" className="ws-booking__title" />
        {options.map(([label, value, list, set]) => (
          <div key={label} className="ws-field">
            <span>{label}</span>
            <div className="ws-chips">
              {list.map((x) => (
                <button type="button" key={x} className={value === x ? "is-active" : ""} onClick={() => set(x)}>
                  {x}
                  {label === "Size" ? ` · ${formatMoney(o.sizes.find((s) => s.label === x)?.price ?? 0, currency)}` : ""}
                </button>
              ))}
            </div>
          </div>
        ))}
        <label className="ws-field"><span>Message on cake (optional)</span><input value={message} maxLength={60} onChange={(e) => setMessage(e.target.value)} placeholder="Happy Birthday Mia!" /></label>
        <label className="ws-field">
          <span>Decoration preferences {o.decorationFee ? `(+${formatMoney(o.decorationFee, currency)})` : ""}</span>
          <textarea rows={3} value={decoration} onChange={(e) => setDecoration(e.target.value)} placeholder="Colors, theme, flowers, toppers…" />
        </label>
        <EditableText as="p" path="note" className="ws-muted" />
        <div className="ws-cake-total">
          <span>Estimated price</span>
          <strong>{formatMoney(price, currency)}</strong>
        </div>
        {added ? <div className="ws-success"><Icon name="Check" size={20} /> Cake added to your order. Choose pickup or delivery date at checkout.</div> : null}
        <button
          type="button"
          className="ws-btn ws-btn--primary ws-btn--block"
          disabled={!size || mode === "edit"}
          onClick={() => {
            cart.add({ kind: "custom-cake", name: `Custom Cake (${size})`, unitPrice: price, quantity: 1, options: { Size: size, Flavor: flavor, Filling: filling, Frosting: frosting, Message: message, Decoration: decoration } });
            setAdded(true);
          }}
        >
          <Icon name="CakeSlice" size={18} />
          <span>{p.submitLabel || "Add Cake to Order"}</span>
        </button>
      </div>
    </div>
  );
}
