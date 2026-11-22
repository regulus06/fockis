/**
 * GroupTabsSchedule.tsx — Meetings, Activities, Calendar and Attendance tabs.
 * Online meetings are Fockis Meetings rooms (created through the Meetings
 * module); activities are church events linked to the group.
 */

import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, MapPin, Pencil, Trash2, Video } from "lucide-react";

import { meetingsApi } from "../../meetings/services/meetingsApi";
import { communitiesApi, type Activity, type Meeting } from "./communitiesApi";
import { Empty, Field, Modal, Tone, fmtDate } from "./GroupParts";
import { ErrorBox, Loading, act, toLocalInput, todayIso, useLoad, type TabProps } from "./GroupTabKit";

const MODE: Record<string, string> = { in_person: "In person", online: "Online", hybrid: "Hybrid" };
const RECUR: Record<string, string> = { none: "", weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

function DateBox({ iso }: { iso: string | null }) {
  const d = iso ? new Date(iso) : null;
  return (
    <span className="mn-datebox">
      <small>{d ? d.toLocaleDateString(undefined, { month: "short" }).toUpperCase() : ""}</small>
      <b>{d ? d.getDate() : ""}</b>
    </span>
  );
}

function WhenSeg({ value, onChange }: { value: "upcoming" | "past"; onChange: (v: "upcoming" | "past") => void }) {
  return (
    <div className="mn-seg" role="tablist" aria-label="When">
      {(["upcoming", "past"] as const).map((k) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? "is-on" : ""} onClick={() => onChange(k)}>
          {k === "upcoming" ? "Upcoming" : "Past"}
        </button>
      ))}
    </div>
  );
}

/* ============================================================================
 * Meetings
 * ========================================================================== */

export function MeetingsTab({ organizationId, group, notify }: TabProps) {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const list = useLoad((s) => communitiesApi.meetings(organizationId, group.id, when, s), [organizationId, group.id, when]);
  const [editing, setEditing] = useState<Meeting | "new" | null>(null);

  async function register(m: Meeting) {
    if (await act(notify, () => communitiesApi.registerMeeting(organizationId, group.id, m.id, !m.isRegistered), m.isRegistered ? "Registration cancelled." : "You're registered.", "Registration failed.")) list.reload();
  }
  async function remove(m: Meeting) {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    if (await act(notify, () => communitiesApi.deleteMeeting(organizationId, group.id, m.id), "Meeting deleted.", "The meeting could not be deleted.")) list.reload();
  }

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <WhenSeg value={when} onChange={setWhen} />
        {list.data?.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <CalendarPlus aria-hidden="true" /> Schedule meeting
          </button>
        )}
      </div>
      {list.error && <ErrorBox text={list.error} />}
      {!list.data && !list.error && <Loading />}
      {list.data && list.data.items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={CalendarDays} title={when === "upcoming" ? "No upcoming meetings" : "No past meetings"} text="Bible studies, prayer meetings and fellowship nights appear here." />
        </div>
      )}
      {list.data && list.data.items.length > 0 && (
        <ul className="mn-activities">
          {list.data.items.map((m) => {
            const join = m.fockisMeetingId ? `/meetings/${encodeURIComponent(m.fockisMeetingId)}/lobby` : m.meetingLink;
            return (
              <li key={m.id}>
                <DateBox iso={when === "upcoming" ? m.nextAt : m.startsAt} />
                <div className="mn-list__main">
                  <b>
                    {m.title} {m.status === "cancelled" && <Tone tone="red">cancelled</Tone>}
                  </b>
                  <span>
                    {fmtDate(when === "upcoming" ? m.nextAt : m.startsAt, true)} · {MODE[m.mode]}
                    {RECUR[m.recurrence] ? ` · ${RECUR[m.recurrence]}` : ""}
                    {m.audience !== "all" ? ` · ${m.audience === "team" ? "team" : "selected members"}` : ""}
                  </span>
                  {m.location && m.mode !== "online" && (
                    <span>
                      <MapPin aria-hidden="true" /> {m.location}
                    </span>
                  )}
                  {m.description && <em>{m.description}</em>}
                  {m.registrations && m.registrations.length > 0 && <span>Registered: {m.registrations.join(", ")}</span>}
                </div>
                <span>{m.requiresRegistration && <Tone tone="blue">{m.registered}{m.capacity ? `/${m.capacity}` : ""} registered</Tone>}</span>
                <div className="mn-list__actions">
                  {join && m.mode !== "in_person" && when === "upcoming" && m.status === "scheduled" &&
                    (join.startsWith("/") ? (
                      <Link className="mn-btn mn-btn--primary mn-btn--sm" to={join}>
                        <Video aria-hidden="true" /> Join
                      </Link>
                    ) : (
                      <a className="mn-btn mn-btn--primary mn-btn--sm" href={join} target="_blank" rel="noreferrer">
                        <Video aria-hidden="true" /> Join
                      </a>
                    ))}
                  {m.requiresRegistration && when === "upcoming" && m.status === "scheduled" && (
                    <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => register(m)}>
                      {m.isRegistered ? "Cancel registration" : "Register"}
                    </button>
                  )}
                  {list.data?.canManage && (
                    <>
                      <button type="button" className="mn-iconbtn" aria-label={`Edit ${m.title}`} onClick={() => setEditing(m)}>
                        <Pencil aria-hidden="true" />
                      </button>
                      <button type="button" className="mn-iconbtn" aria-label={`Delete ${m.title}`} onClick={() => remove(m)}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <MeetingDialog
          organizationId={organizationId}
          group={group}
          meeting={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Meeting saved. Members were notified.");
            setWhen("upcoming");
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function MeetingDialog({ organizationId, group, meeting, onClose, onDone }: { organizationId: string; group: TabProps["group"]; meeting: Meeting | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    title: meeting?.title ?? "",
    description: meeting?.description ?? "",
    meetingType: meeting?.meetingType ?? (group.category === "bible_study" ? "bible_study" : group.category === "prayer" ? "prayer" : "fellowship"),
    mode: meeting?.mode ?? group.settings.meeting.mode,
    startsAt: toLocalInput(meeting?.startsAt),
    endsAt: toLocalInput(meeting?.endsAt),
    location: meeting?.location ?? group.settings.meeting.location,
    meetingLink: meeting?.fockisMeetingId ? "" : (meeting?.meetingLink ?? ""),
    recurrence: meeting?.recurrence ?? "none",
    recurrenceUntil: meeting?.recurrenceUntil ? meeting.recurrenceUntil.slice(0, 10) : "",
    audience: meeting?.audience ?? "all",
    teamId: meeting?.teamId ?? "",
    requiresRegistration: meeting?.requiresRegistration ?? false,
    capacity: meeting?.capacity ? String(meeting.capacity) : "",
    status: meeting?.status ?? "scheduled",
  });
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [useFockis, setUseFockis] = useState(!meeting || Boolean(meeting.fockisMeetingId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const teams = useLoad((s) => communitiesApi.teams(organizationId, group.id, s), [organizationId, group.id]);
  const members = useLoad((s) => (f.audience === "selected" ? communitiesApi.members(organizationId, group.id, {}, s) : Promise.resolve(null)), [organizationId, group.id, f.audience]);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.startsAt) return setError("A meeting needs a title and a start time.");
    if (f.endsAt && f.endsAt <= f.startsAt) return setError("The end must be after the start.");
    setBusy(true);
    setError(null);
    try {
      let fockisMeetingId = meeting?.fockisMeetingId ?? "";
      // Online / hybrid meetings get a Fockis Meetings room (existing video system).
      if (f.mode !== "in_person" && useFockis && !fockisMeetingId) {
        const start = new Date(f.startsAt);
        const minutes = f.endsAt ? Math.max(15, Math.round((new Date(f.endsAt).getTime() - start.getTime()) / 60000)) : 60;
        const created = await meetingsApi.createChurchMeeting(organizationId, {
          topic: `${group.name}: ${f.title.trim()}`,
          description: f.description,
          groupId: group.id,
          churchMeetingType: f.meetingType === "bible_study" ? "bible-study" : f.meetingType === "prayer" ? "prayer" : "group",
          startTime: start.toISOString(),
          durationMinutes: Math.min(minutes, 1440),
          visibility: "members",
        });
        if (!created.ok || !created.data?.id) throw new Error(created.ok ? "The online room could not be created." : created.error || "The online room could not be created.");
        fockisMeetingId = created.data.id;
      }
      await communitiesApi.saveMeeting(organizationId, group.id, meeting?.id ?? null, {
        ...f,
        startsAt: new Date(f.startsAt).toISOString(),
        endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
        recurrenceUntil: f.recurrenceUntil ? new Date(`${f.recurrenceUntil}T23:59:00`).toISOString() : null,
        capacity: f.capacity ? Number(f.capacity) : null,
        fockisMeetingId: f.mode === "in_person" || !useFockis ? "" : fockisMeetingId,
        meetingLink: useFockis ? "" : f.meetingLink,
        participantIds: [...participants],
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The meeting could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={meeting ? "Edit meeting" : "Schedule a meeting"}
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-meeting" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Save meeting
          </button>
        </>
      }
    >
      <form id="gc-meeting" className="mn-form" onSubmit={save}>
        <div className="mn-form__row">
          <Field label="Title" required>
            <input className="mn-input" value={f.title} maxLength={140} onChange={(e) => set("title", e.target.value)} placeholder="Weekly Bible study" />
          </Field>
          <Field label="Type">
            <select className="mn-input" value={f.meetingType} onChange={(e) => set("meetingType", e.target.value)}>
              <option value="bible_study">Bible study</option>
              <option value="prayer">Prayer meeting</option>
              <option value="fellowship">Fellowship</option>
              <option value="leadership">Leadership</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea className="mn-input" rows={2} maxLength={3000} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="mn-form__row">
          <Field label="Starts" required>
            <input className="mn-input" type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label="Ends">
            <input className="mn-input" type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
        </div>
        <div className="mn-form__row">
          <Field label="Repeats">
            <select className="mn-input" value={f.recurrence} onChange={(e) => set("recurrence", e.target.value)}>
              <option value="none">One-time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          {f.recurrence !== "none" ? (
            <Field label="Until (optional)">
              <input className="mn-input" type="date" value={f.recurrenceUntil} onChange={(e) => set("recurrenceUntil", e.target.value)} />
            </Field>
          ) : (
            <div />
          )}
        </div>
        <div className="mn-form__row">
          <Field label="Format">
            <select className="mn-input" value={f.mode} onChange={(e) => set("mode", e.target.value)}>
              <option value="in_person">In person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          {f.mode !== "online" ? (
            <Field label="Location">
              <input className="mn-input" value={f.location} maxLength={300} onChange={(e) => set("location", e.target.value)} />
            </Field>
          ) : (
            <div />
          )}
        </div>
        {f.mode !== "in_person" && (
          <div className="mn-form">
            <label className="mn-check">
              <input type="checkbox" checked={useFockis} onChange={(e) => setUseFockis(e.target.checked)} disabled={Boolean(meeting?.fockisMeetingId)} /> Use a Fockis Meetings room {meeting?.fockisMeetingId ? "(created)" : "(created when you save)"}
            </label>
            {!useFockis && (
              <Field label="Meeting link">
                <input className="mn-input" value={f.meetingLink} maxLength={500} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://…" />
              </Field>
            )}
          </div>
        )}
        <div className="mn-form__row">
          <Field label="Invite">
            <select className="mn-input" value={f.audience} onChange={(e) => set("audience", e.target.value)}>
              <option value="all">All group members</option>
              <option value="team">A team</option>
              <option value="selected">Selected members</option>
            </select>
          </Field>
          {f.audience === "team" ? (
            <Field label="Team">
              <select className="mn-input" value={f.teamId} onChange={(e) => set("teamId", e.target.value)}>
                <option value="">Choose…</option>
                {teams.data?.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div />
          )}
        </div>
        {f.audience === "selected" && (
          <div className="mn-checklist">
            {!members.data && <div className="mn-sk" style={{ height: 60 }} />}
            {members.data?.items.map((m) => (
              <label key={m.membershipId} className="mn-check">
                <input
                  type="checkbox"
                  checked={participants.has(m.membershipId)}
                  onChange={(e) =>
                    setParticipants((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(m.membershipId);
                      else n.delete(m.membershipId);
                      return n;
                    })
                  }
                />
                {m.displayName}
              </label>
            ))}
          </div>
        )}
        <div className="mn-form__row">
          <label className="mn-check">
            <input type="checkbox" checked={f.requiresRegistration} onChange={(e) => set("requiresRegistration", e.target.checked)} /> Members must register
          </label>
          {f.requiresRegistration && (
            <Field label="Capacity">
              <input className="mn-input" type="number" min={1} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          )}
        </div>
        {meeting && (
          <Field label="Status">
            <select className="mn-input" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
        )}
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Activities
 * ========================================================================== */

export function ActivitiesTab({ organizationId, group, notify }: TabProps) {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const list = useLoad((s) => communitiesApi.activities(organizationId, group.id, when, s), [organizationId, group.id, when]);
  const [editing, setEditing] = useState<Activity | "new" | null>(null);
  async function rsvp(a: Activity, status: "going" | "maybe" | "not_going") {
    if (await act(notify, () => communitiesApi.rsvp(organizationId, group.id, a.id, status), "Response saved.", "Your response could not be saved.")) list.reload();
  }
  async function remove(a: Activity) {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    if (await act(notify, () => communitiesApi.deleteActivity(organizationId, group.id, a.id), "Activity deleted.", "The activity could not be deleted.")) list.reload();
  }
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <WhenSeg value={when} onChange={setWhen} />
        {list.data?.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <CalendarPlus aria-hidden="true" /> New activity
          </button>
        )}
      </div>
      {list.error && <ErrorBox text={list.error} />}
      {!list.data && !list.error && <Loading />}
      {list.data && list.data.items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={CalendarDays} title="No activities" text="Retreats, service projects, family events and workshops appear here and in church Events." />
        </div>
      )}
      {list.data && list.data.items.length > 0 && (
        <div className="gc-acts">
          {list.data.items.map((a) => (
            <article key={a.id} className="gc-act">
              {a.coverImageUrl ? <img src={a.coverImageUrl} alt="" className="gc-act__cover" /> : <div className="gc-act__cover gc-act__cover--art"><CalendarDays aria-hidden="true" /></div>}
              <div className="gc-act__body">
                <b>{a.title}</b>
                <span>
                  {fmtDate(a.startsAt, true)}
                  {a.endsAt ? ` – ${fmtDate(a.endsAt, true)}` : ""}
                </span>
                {(a.location || a.isOnline) && (
                  <span>
                    <MapPin aria-hidden="true" /> {a.location || "Online"}
                  </span>
                )}
                {a.description && <p>{a.description}</p>}
                <div className="mn-row">
                  <Tone tone={a.status === "upcoming" ? "blue" : "gray"}>{a.status}</Tone>
                  <Tone tone="green">
                    {a.going} going{a.capacity ? ` / ${a.capacity}` : ""}
                  </Tone>
                </div>
                {a.status === "upcoming" && (
                  <div className="mn-row">
                    {(["going", "maybe", "not_going"] as const).map((st) => (
                      <button key={st} type="button" className={"mn-btn mn-btn--sm " + (a.myRsvp === st ? "mn-btn--primary" : "mn-btn--outline")} onClick={() => rsvp(a, st)}>
                        {st === "going" ? "Going" : st === "maybe" ? "Maybe" : "Can't go"}
                      </button>
                    ))}
                  </div>
                )}
                {list.data?.canManage && (
                  <div className="mn-row">
                    <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setEditing(a)}>
                      <Pencil aria-hidden="true" /> Edit
                    </button>
                    <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => remove(a)}>
                      <Trash2 aria-hidden="true" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <ActivityDialog
          organizationId={organizationId}
          groupId={group.id}
          activity={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Activity saved.");
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function ActivityDialog({ organizationId, groupId, activity, onClose, onDone }: { organizationId: string; groupId: string; activity: Activity | null; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    title: activity?.title ?? "",
    description: activity?.description ?? "",
    startsAt: toLocalInput(activity?.startsAt),
    endsAt: toLocalInput(activity?.endsAt),
    location: activity?.location ?? "",
    isOnline: activity?.isOnline ?? false,
    onlineUrl: activity?.onlineUrl ?? "",
    coverImageUrl: activity?.coverImageUrl ?? "",
    capacity: activity?.capacity ? String(activity.capacity) : "",
    requiresRsvp: activity?.requiresRsvp ?? true,
  });
  const [busy, setBusy] = useState<null | "save" | "cover">(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  async function cover(file: File) {
    if (!/^image\//.test(file.type)) return setError("Choose an image.");
    setBusy("cover");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      set("coverImageUrl", up.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The image could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.startsAt) return setError("An activity needs a title and a start time.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.saveActivity(organizationId, groupId, activity?.id ?? null, {
        ...f,
        startsAt: new Date(f.startsAt).toISOString(),
        endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
        capacity: f.capacity ? Number(f.capacity) : null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The activity could not be saved.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={activity ? "Edit activity" : "New activity"}
      subtitle="Activities are church events linked to this group."
      onClose={onClose}
      busy={busy === "save"}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-act" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} Save activity
          </button>
        </>
      }
    >
      <form id="gc-act" className="mn-form" onSubmit={save}>
        <Field label="Title" required>
          <input className="mn-input" value={f.title} maxLength={140} onChange={(e) => set("title", e.target.value)} placeholder="Men's retreat" />
        </Field>
        <Field label="Description">
          <textarea className="mn-input" rows={3} maxLength={3000} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="mn-form__row">
          <Field label="Starts" required>
            <input className="mn-input" type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </Field>
          <Field label="Ends">
            <input className="mn-input" type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
          </Field>
        </div>
        <div className="mn-form__row">
          <Field label="Location">
            <input className="mn-input" value={f.location} maxLength={300} onChange={(e) => set("location", e.target.value)} />
          </Field>
          <Field label="Capacity">
            <input className="mn-input" type="number" min={1} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
        </div>
        <label className="mn-check">
          <input type="checkbox" checked={f.isOnline} onChange={(e) => set("isOnline", e.target.checked)} /> Online
        </label>
        {f.isOnline && (
          <Field label="Online link">
            <input className="mn-input" value={f.onlineUrl} onChange={(e) => set("onlineUrl", e.target.value)} placeholder="https://…" />
          </Field>
        )}
        <label className="mn-check">
          <input type="checkbox" checked={f.requiresRsvp} onChange={(e) => set("requiresRsvp", e.target.checked)} /> Ask members to respond (going / maybe)
        </label>
        <Field label="Cover image">
          <div className="mn-row">
            {f.coverImageUrl && <img src={f.coverImageUrl} alt="" className="gc-thumb" />}
            <label className="mn-btn mn-btn--outline mn-btn--sm">
              {busy === "cover" ? <Loader2 className="mn-spin" aria-hidden="true" /> : null} {f.coverImageUrl ? "Replace" : "Upload"}
              <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && cover(e.target.files[0])} />
            </label>
          </div>
        </Field>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Calendar
 * ========================================================================== */

const KIND_TONE: Record<string, string> = { meeting: "gc-ev--meeting", activity: "gc-ev--activity", study: "gc-ev--study", task: "gc-ev--task" };

export function CalendarTab({ organizationId, group }: TabProps) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const from = month.toISOString();
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString();
  const cal = useLoad((s) => communitiesApi.calendar(organizationId, group.id, from, to, s), [organizationId, group.id, from]);
  const cells = useMemo(() => {
    const first = new Date(month);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);
  const byDay = useMemo(() => {
    const m = new Map<string, NonNullable<typeof cal.data>["items"]>();
    for (const it of cal.data?.items ?? []) {
      const d = new Date(it.startsAt);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return m;
  }, [cal.data]);
  const today = new Date();
  return (
    <section className="mn-panel">
      <header className="mn-panel__head">
        <h3>
          <CalendarDays aria-hidden="true" /> {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h3>
        <div className="mn-row">
          <button type="button" className="mn-iconbtn" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>
            Today
          </button>
          <button type="button" className="mn-iconbtn" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </header>
      {cal.error && <ErrorBox text={cal.error} />}
      <div className="gc-legend">
        <span className="gc-ev--meeting">Meeting</span>
        <span className="gc-ev--activity">Activity</span>
        <span className="gc-ev--study">Bible study</span>
        <span className="gc-ev--task">Task due</span>
      </div>
      <div className="gc-cal" role="grid" aria-busy={!cal.data}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="gc-cal__dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((d) => {
          const items = byDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? [];
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={d.toISOString()} className={"gc-cal__day" + (d.getMonth() !== month.getMonth() ? " is-out" : "") + (isToday ? " is-today" : "")} role="gridcell">
              <span className="gc-cal__num">{d.getDate()}</span>
              {items.slice(0, 3).map((it) => (
                <span key={it.kind + it.id + it.startsAt} className={"gc-ev " + KIND_TONE[it.kind]} title={`${it.title} · ${new Date(it.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}>
                  {it.title}
                </span>
              ))}
              {items.length > 3 && <span className="gc-ev gc-ev--more">+{items.length - 3} more</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================================
 * Attendance
 * ========================================================================== */

const STATUSES = ["present", "absent", "late", "excused"] as const;

export function AttendanceTab({ organizationId, group, notify }: TabProps) {
  const sum = useLoad((s) => communitiesApi.attendance(organizationId, group.id, s), [organizationId, group.id]);
  const [recording, setRecording] = useState(false);
  if (sum.error) return <ErrorBox text={sum.error} />;
  if (!sum.data) return <Loading />;
  const d = sum.data;
  if (!d.canRecord) {
    return (
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <ClipboardCheck aria-hidden="true" /> My attendance
          </h3>
          {d.mine?.rate != null && <Tone tone="green">{d.mine.rate}% attended</Tone>}
        </header>
        {!d.mine || d.mine.records.length === 0 ? (
          <Empty icon={ClipboardCheck} title="No attendance yet" text="Your attendance at group meetings and activities will appear here." />
        ) : (
          <ul className="mn-list">
            {d.mine.records.map((r, i) => (
              <li key={i} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{r.sessionTitle}</b>
                  <span>
                    {fmtDate(r.sessionDate)} · {r.sessionType}
                  </span>
                </div>
                <Tone tone={r.status === "present" ? "green" : r.status === "late" ? "amber" : r.status === "excused" ? "blue" : "red"}>{r.status}</Tone>
                <span />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
  const maxRate = 100;
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <div className="mn-kpis gc-kpis3">
          <div>
            <b>{d.totalMembers}</b>
            <span>Total members</span>
          </div>
          <div>
            <b>{d.attendanceRate == null ? "—" : `${d.attendanceRate}%`}</b>
            <span>Attendance rate</span>
          </div>
          <div>
            <b>{d.sessionsRecorded}</b>
            <span>Sessions recorded</span>
          </div>
        </div>
        <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setRecording(true)}>
          <ClipboardCheck aria-hidden="true" /> Take attendance
        </button>
      </div>
      {d.monthly && d.monthly.length > 0 && (
        <section className="mn-panel">
          <header className="mn-panel__head">
            <h3>Monthly attendance</h3>
          </header>
          <ul className="mn-bars">
            {d.monthly.map((m) => (
              <li key={m.month}>
                <span>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
                <i style={{ width: `${((m.rate ?? 0) / maxRate) * 100}%` }} />
                <b>{m.rate ?? 0}%</b>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>Meeting participation</h3>
        </header>
        {!d.sessions?.length ? (
          <Empty icon={ClipboardCheck} title="No sessions recorded" text="Take attendance at a meeting, Bible study or activity." />
        ) : (
          <ul className="mn-list">
            {d.sessions.map((s) => (
              <li key={s.sessionType + s.sessionId + s.sessionDate} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{s.title}</b>
                  <span>
                    {fmtDate(s.sessionDate)} · {s.sessionType}
                  </span>
                </div>
                <Tone tone="green">
                  {s.present}/{s.total} · {s.rate ?? 0}%
                </Tone>
                <span />
              </li>
            ))}
          </ul>
        )}
      </section>
      {d.members && d.members.length > 0 && (
        <section className="mn-panel mn-panel--flush">
          <div className="mn-tablewrap">
            <table className="mn-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Sessions</th>
                  <th>Present / late</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {d.members.map((m) => (
                  <tr key={m.membershipId}>
                    <td>{m.name}</td>
                    <td>{m.sessions}</td>
                    <td>{m.present}</td>
                    <td>{m.rate == null ? "—" : `${m.rate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {recording && (
        <AttendanceDialog
          organizationId={organizationId}
          group={group}
          onClose={() => setRecording(false)}
          onDone={(n) => {
            setRecording(false);
            notify("ok", `Attendance saved for ${n} people.`);
            sum.reload();
          }}
        />
      )}
    </div>
  );
}

function AttendanceDialog({ organizationId, group, onClose, onDone }: { organizationId: string; group: TabProps["group"]; onClose: () => void; onDone: (n: number) => void }) {
  const [kind, setKind] = useState("meeting");
  const [sessionId, setSessionId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [title, setTitle] = useState("");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meetings = useLoad((s) => communitiesApi.meetings(organizationId, group.id, "upcoming", s).then(async (u) => ({ items: [...u.items, ...(await communitiesApi.meetings(organizationId, group.id, "past", s)).items] })), [organizationId, group.id]);
  const activities = useLoad((s) => (group.settings.services.activities ? communitiesApi.activities(organizationId, group.id, "past", s) : Promise.resolve({ canManage: false, items: [] as Activity[] })), [organizationId, group.id]);
  const lessons = useLoad((s) => (group.settings.services.bibleStudy ? communitiesApi.lessons(organizationId, group.id, s) : Promise.resolve(null)), [organizationId, group.id]);
  const ready = kind === "session" || Boolean(sessionId);
  const sheet = useLoad(
    (s) => (ready && date ? communitiesApi.attendanceSheet(organizationId, group.id, { sessionType: kind, sessionId: kind === "session" ? undefined : sessionId, sessionDate: date }, s) : Promise.resolve(null)),
    [organizationId, group.id, kind, sessionId, date],
  );
  const rows = sheet.data?.rows ?? [];
  const statusOf = (id: string) => marks[id] ?? rows.find((r) => r.membershipId === id)?.status ?? null;

  async function save() {
    const entries = rows.map((r) => ({ membershipId: r.membershipId, status: statusOf(r.membershipId) })).filter((e): e is { membershipId: string; status: string } => Boolean(e.status));
    if (!entries.length) return setError("Mark at least one person.");
    setBusy(true);
    setError(null);
    try {
      const r = await communitiesApi.recordAttendance(organizationId, group.id, { sessionType: kind, sessionId: kind === "session" ? undefined : sessionId, sessionDate: date, sessionTitle: title, entries });
      onDone(r.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attendance could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const options = kind === "meeting" ? (meetings.data?.items ?? []).map((m) => [m.id, m.title] as const) : kind === "activity" ? (activities.data?.items ?? []).map((a) => [a.id, a.title] as const) : kind === "lesson" ? (lessons.data?.items ?? []).map((l) => [l.id, l.title] as const) : [];

  return (
    <Modal
      title="Take attendance"
      subtitle="One entry per member and session — saving again updates it."
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mn-btn mn-btn--outline" disabled={!rows.length} onClick={() => setMarks(Object.fromEntries(rows.map((r) => [r.membershipId, "present"])))}>
            Mark all present
          </button>
          <button type="button" className="mn-btn mn-btn--primary" disabled={busy || !rows.length} onClick={save}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Save attendance
          </button>
        </>
      }
    >
      <div className="mn-form">
        <div className="mn-form__row">
          <Field label="Session">
            <select
              className="mn-input"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setSessionId("");
                setMarks({});
              }}
            >
              <option value="meeting">Meeting</option>
              {group.settings.services.activities && <option value="activity">Activity</option>}
              {group.settings.services.bibleStudy && <option value="lesson">Bible study lesson</option>}
              <option value="session">Other gathering</option>
            </select>
          </Field>
          <Field label="Date">
            <input className="mn-input" type="date" value={date} onChange={(e) => (setDate(e.target.value), setMarks({}))} />
          </Field>
        </div>
        {kind === "session" ? (
          <Field label="Title">
            <input className="mn-input" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Fellowship lunch" />
          </Field>
        ) : (
          <Field label="Which one?">
            <select className="mn-input" value={sessionId} onChange={(e) => (setSessionId(e.target.value), setMarks({}))}>
              <option value="">Choose…</option>
              {options.map(([id, t]) => (
                <option key={id} value={id}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        )}
        {sheet.error && <ErrorBox text={sheet.error} />}
        {ready && !sheet.data && !sheet.error && <div className="mn-sk" style={{ height: 120 }} />}
        {rows.length > 0 && (
          <ul className="mn-list gc-sheet">
            {rows.map((r) => (
              <li key={r.membershipId} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{r.name}</b>
                </div>
                <span />
                <div className="gc-marks" role="radiogroup" aria-label={`Attendance for ${r.name}`}>
                  {STATUSES.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={statusOf(r.membershipId) === s} className={"gc-mark gc-mark--" + s + (statusOf(r.membershipId) === s ? " is-on" : "")} onClick={() => setMarks((m) => ({ ...m, [r.membershipId]: s }))}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mn-form-error">{error}</p>}
      </div>
    </Modal>
  );
}
