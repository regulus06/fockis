/**
 * MinistryDialogs.tsx
 * -----------------------------------------------------------------------------
 * Admin forms used on the ministry page: create event, post announcement,
 * add Bible study, edit the meeting schedule, edit a leader's position.
 * Each one calls the real API (ministryApi.ts) and reports back with onDone.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import {
  addMinistryStudy,
  createMinistryAnnouncement,
  createMinistryEvent,
  saveLeaderTitles,
  saveMinistrySchedule,
  type MinistryLeader,
  type MinistryMeeting,
} from "./ministryApi";

export function MinistryModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="md-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="md" role="dialog" aria-modal="true" aria-label={title}>
        <div className="md__head">
          <h2>{title}</h2>
          <button type="button" className="cw-iconbtn" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({ busy, label, onClose }: { busy: boolean; label: string; onClose: () => void }) {
  return (
    <div className="md__actions">
      <button type="button" className="cw-btn cw-btn--outline" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button type="submit" className="cw-btn cw-btn--primary" disabled={busy}>
        {busy && <Loader2 className="cw-spin" aria-hidden="true" />} {label}
      </button>
    </div>
  );
}

interface Base {
  organizationId: string;
  ministryId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}

/* ------------------------------------------------------------------ event */

export function EventDialog({ organizationId, ministryId, onClose, onDone }: Base) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [rsvp, setRsvp] = useState(true);
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start) return setError("Add a title and a start date.");
    if (end && new Date(end) <= new Date(start)) return setError("The end must be after the start.");
    setBusy(true);
    setError(null);
    try {
      await createMinistryEvent(organizationId, ministryId, {
        title: title.trim(),
        startsAt: new Date(start).toISOString(),
        endsAt: end ? new Date(end).toISOString() : undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        requiresRsvp: rsvp,
        capacity: capacity ? Math.max(1, Number(capacity)) : null,
      });
      onDone(`“${title.trim()}” was created.`);
    } catch (err) {
      setError(errorMessage(err, "The event could not be created."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title="Create Ministry Event" onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required autoFocus />
        </label>
        <div className="md__row">
          <label>
            Starts
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label>
            Ends (optional)
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main Auditorium" maxLength={200} />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
        </label>
        <div className="md__row">
          <label className="md__check">
            <input type="checkbox" checked={rsvp} onChange={(e) => setRsvp(e.target.checked)} /> Registration (RSVP) required
          </label>
          <label>
            Capacity (optional)
            <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </label>
        </div>
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Create Event" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

/* ----------------------------------------------------------- announcement */

export function AnnouncementDialog({ organizationId, ministryId, onClose, onDone }: Base) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [publicPost, setPublicPost] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return setError("Add a title and a message.");
    setBusy(true);
    setError(null);
    try {
      await createMinistryAnnouncement(organizationId, ministryId, { title: title.trim(), body: body.trim(), pinned, publicPost });
      onDone("Announcement published.");
    } catch (err) {
      setError(errorMessage(err, "The announcement could not be published."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title="New Announcement" onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required autoFocus />
        </label>
        <label>
          Message
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={5000} required />
        </label>
        <label className="md__check">
          <input type="checkbox" checked={publicPost} onChange={(e) => setPublicPost(e.target.checked)} /> Show on the public ministry page (otherwise ministry members only)
        </label>
        <label className="md__check">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top
        </label>
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Publish" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

/* ------------------------------------------------------------- bible study */

export function StudyDialog({ organizationId, ministryId, onClose, onDone }: Base) {
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [minutes, setMinutes] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Add a title.");
    if (!file && !link.trim()) return setError("Upload a video, audio or PDF, or paste a link.");
    setBusy(true);
    setError(null);
    try {
      await addMinistryStudy(organizationId, ministryId, {
        title: title.trim(),
        speaker: speaker.trim() || undefined,
        durationMinutes: minutes ? Number(minutes) : undefined,
        file,
        link,
        thumbnail: thumb,
      });
      onDone(`“${title.trim()}” was added to Bible Studies.`);
    } catch (err) {
      setError(errorMessage(err, "The Bible study could not be added."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title="Add Bible Study" onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required autoFocus />
        </label>
        <div className="md__row">
          <label>
            Teacher / speaker
            <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} maxLength={120} />
          </label>
          <label>
            Length (minutes)
            <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
        </div>
        <label>
          Video, audio or PDF
          <input type="file" accept="video/*,audio/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          …or a link (YouTube, Vimeo…)
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" disabled={Boolean(file)} />
        </label>
        <label>
          Thumbnail picture (optional)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Add Study" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

/* ------------------------------------------------------- meeting schedule */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
};
const todayYmd = () => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "").slice(0, 24) : Math.random().toString(16).slice(2) + Date.now().toString(16));

/** "13:00" → "1:00 PM" */
function clock12(hhmm?: string): string {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return "";
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function ordinal(n: number): string {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Display text for a structured meeting ("Every other Wednesday"). */
function describeDays(m: MinistryMeeting): string {
  const days = (m.weekdays ?? []).slice().sort();
  const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`);
  const anchor = m.anchorDate ? new Date(`${m.anchorDate}T12:00:00Z`) : null;
  switch (m.frequency) {
    case "once":
      return anchor ? anchor.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }) : "";
    case "weekly":
      return list(days.map((d) => WEEKDAYS_LONG[d]));
    case "biweekly":
      return `Every other ${list(days.map((d) => WEEKDAYS_LONG[d].replace(/s$/, "")))}`;
    case "monthly":
      return anchor ? `Monthly on the ${ordinal(anchor.getUTCDate())}` : "Monthly";
    default:
      return m.day;
  }
}

const EMPTY = (): MinistryMeeting => ({
  name: "",
  day: "",
  startTime: "",
  endTime: "",
  location: "",
  key: newKey(),
  frequency: "weekly",
  weekdays: [new Date().getDay()],
  anchorDate: todayYmd(),
  endDate: "",
  startClock: "",
  endClock: "",
  timeZone: browserZone(),
  attendance: true,
});

export function ScheduleDialog({
  organizationId,
  ministryId,
  onClose,
  onDone,
  initial,
  defaultTimeZone,
}: Base & { initial: MinistryMeeting[]; defaultTimeZone?: string }) {
  const [rows, setRows] = useState<MinistryMeeting[]>(() =>
    initial.length
      ? initial.map((m) => ({
          ...m,
          key: m.key || newKey(),
          frequency: m.frequency || "weekly",
          weekdays: m.weekdays?.length ? m.weekdays : [],
          anchorDate: m.anchorDate || todayYmd(),
          timeZone: m.timeZone || defaultTimeZone || browserZone(),
          attendance: m.attendance !== false,
        }))
      : [{ ...EMPTY(), timeZone: defaultTimeZone || browserZone() }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof MinistryMeeting>(i: number, key: K, value: MinistryMeeting[K]) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = rows.filter((r) => r.name.trim());
    for (const r of clean) {
      if (!r.startClock) return setError(`Add a start time for “${r.name}”.`);
      if ((r.frequency === "weekly" || r.frequency === "biweekly") && !(r.weekdays ?? []).length) return setError(`Choose the day(s) for “${r.name}”.`);
    }
    const out = clean.map((r) => ({
      ...r,
      name: r.name.trim(),
      day: describeDays(r),
      startTime: clock12(r.startClock),
      endTime: clock12(r.endClock),
    }));
    setBusy(true);
    setError(null);
    try {
      await saveMinistrySchedule(organizationId, ministryId, out);
      onDone("Meeting schedule saved. Attendance sessions follow this schedule for future dates; past records are not changed.");
    } catch (err) {
      setError(errorMessage(err, "The schedule could not be saved."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title="Meetings & Schedule" onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <p className="md__hint">
          Each meeting date gets its own attendance session automatically. Changing a time here moves future dates only — dates that already have attendance keep their own
          times.
        </p>
        {rows.map((r, i) => (
          <fieldset key={r.key ?? i} className="md__meeting">
            <legend>Meeting {i + 1}</legend>
            <div className="md__row">
              <label>
                Name
                <input value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="Bible Study" maxLength={120} />
              </label>
              <label>
                Repeats
                <select value={r.frequency} onChange={(e) => set(i, "frequency", e.target.value as MinistryMeeting["frequency"])}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every other week</option>
                  <option value="monthly">Monthly (same date)</option>
                  <option value="once">One time</option>
                </select>
              </label>
            </div>
            {(r.frequency === "weekly" || r.frequency === "biweekly") && (
              <div className="md__days" role="group" aria-label="Days">
                {WEEKDAYS.map((d, n) => {
                  const on = (r.weekdays ?? []).includes(n);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      className={"md__day" + (on ? " is-on" : "")}
                      onClick={() => set(i, "weekdays", on ? (r.weekdays ?? []).filter((x) => x !== n) : [...(r.weekdays ?? []), n])}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="md__row">
              <label>
                {r.frequency === "once" ? "Date" : "Starting"}
                <input type="date" value={r.anchorDate} onChange={(e) => set(i, "anchorDate", e.target.value)} required />
              </label>
              {r.frequency !== "once" && (
                <label>
                  Until (optional)
                  <input type="date" value={r.endDate} onChange={(e) => set(i, "endDate", e.target.value)} />
                </label>
              )}
            </div>
            <div className="md__row">
              <label>
                Starts
                <input type="time" value={r.startClock} onChange={(e) => set(i, "startClock", e.target.value)} required />
              </label>
              <label>
                Ends
                <input type="time" value={r.endClock} onChange={(e) => set(i, "endClock", e.target.value)} />
              </label>
            </div>
            <div className="md__row">
              <label>
                Location or online link
                <input value={r.location} onChange={(e) => set(i, "location", e.target.value)} placeholder="Youth Hall" maxLength={300} />
              </label>
              <label>
                Time zone
                <input value={r.timeZone} onChange={(e) => set(i, "timeZone", e.target.value)} placeholder="America/New_York" maxLength={64} list="md-zones" />
              </label>
            </div>
            <label className="md__check">
              <input type="checkbox" checked={r.attendance !== false} onChange={(e) => set(i, "attendance", e.target.checked)} /> Take attendance at this meeting
            </label>
            <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
              <Trash2 aria-hidden="true" /> Remove
            </button>
          </fieldset>
        ))}
        <datalist id="md-zones">
          {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Port-au-Prince", "America/Toronto", "Europe/London", "Europe/Paris", "Africa/Lagos", "Africa/Accra", "UTC"].map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
        {rows.length < 20 && (
          <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => setRows((r) => [...r, { ...EMPTY(), timeZone: defaultTimeZone || browserZone() }])}>
            <Plus aria-hidden="true" /> Add meeting
          </button>
        )}
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Save Schedule" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

/* --------------------------------------------------------- leader position */

export function LeaderTitleDialog({ organizationId, ministryId, onClose, onDone, leader, leaders }: Base & { leader: MinistryLeader; leaders: MinistryLeader[] }) {
  const [title, setTitle] = useState(leader.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const titles: Record<string, string> = {};
    for (const l of leaders) if (l.title) titles[l.membershipId] = l.title;
    if (title.trim()) titles[leader.membershipId] = title.trim();
    else delete titles[leader.membershipId];
    try {
      await saveLeaderTitles(organizationId, ministryId, titles);
      onDone("Position saved.");
    } catch (err) {
      setError(errorMessage(err, "The position could not be saved."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title={`Position of ${leader.displayName}`} onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <label>
          Position
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Youth Director" maxLength={80} autoFocus list="md-positions" />
          <datalist id="md-positions">
            {["Ministry Director", "Assistant Director", "Secretary", "Treasurer", "Team Leader", "Coordinator", "Volunteer Coordinator"].map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <p className="md__hint">To add or remove leaders, use Settings → ministry leaders.</p>
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Save" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}
