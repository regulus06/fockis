/**
 * SchedulePanel.tsx — "Schedule Livestream" side panel (create and edit).
 * -----------------------------------------------------------------------------
 * Basic information, source (Fockis Live or an existing Fockis Meeting),
 * visibility & access, and settings. Settings that do not apply to the chosen
 * access or source are disabled with the reason, so the form never offers
 * something the server does not enforce. The server validates everything again.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Globe,
  ImagePlus,
  Info,
  Lock,
  MapPin,
  Radio,
  ShieldCheck,
  Trash2,
  Users,
  UsersRound,
  Video,
  X,
} from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { listDepartments } from "../api/departmentsApi";
import { listGroups } from "../api/groupsApi";
import { errorMessage } from "../ui/orgUi";
import { isoToZonedInput, validZone, zoneLabel, zonedInputToIso } from "../events-center/zonedTime";
import { liveApi, type LiveInput, type LiveSettings, type LiveSource, type LiveVisibility, type Livestream, type MeetingCheck } from "./liveApi";

interface Option {
  id: string;
  name: string;
  count: number | null;
}

const DEFAULT_SETTINGS: LiveSettings = {
  showOnPublicPage: true,
  showLockedPreview: false,
  enableChat: true,
  enableComments: true,
  enableRecording: true,
  allowReplay: true,
  allowSharing: true,
  notifyMembers: false,
  requireRegistration: false,
  waitingRoom: false,
  requireApproval: false,
  allowGuests: false,
  attendanceEnabled: true,
  allowAccessRequests: false,
  bearerLinks: false,
  earlyJoinMinutes: 15,
};

function zones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone");
    if (list?.length) return list;
  } catch {
    /* older browsers */
  }
  return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Port-au-Prince", "Europe/London", "Europe/Paris", "Africa/Lagos", "Asia/Manila"];
}

const ACCESS: { v: LiveVisibility; label: string; hint: string; icon: typeof Globe }[] = [
  { v: "public", label: "Public", hint: "Anyone can watch, including visitors.", icon: Globe },
  { v: "members", label: "Members Only", hint: "Only active members of this organization can join.", icon: Users },
  { v: "private", label: "Private / Invite Only", hint: "Only invited people can join using a secure link.", icon: Lock },
  { v: "groups", label: "Selected Groups / Departments", hint: "Only chosen groups, ministries, or departments can join.", icon: UsersRound },
];

export default function SchedulePanel({
  organizationId,
  editing,
  defaultZone,
  departmentsLabel,
  onClose,
  onSaved,
}: {
  organizationId: string;
  editing: Livestream | null;
  defaultZone: string;
  departmentsLabel: string;
  onClose: () => void;
  onSaved: (stream: Livestream, how: "created" | "updated" | "draft") => void;
}) {
  const initialZone = validZone(editing?.timeZone || defaultZone);
  const [zone, setZone] = useState(initialZone);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [date, setDate] = useState(editing ? isoToZonedInput(editing.scheduledStart, initialZone).slice(0, 10) : "");
  const [startTime, setStartTime] = useState(editing ? isoToZonedInput(editing.scheduledStart, initialZone).slice(11, 16) : "");
  const [endTime, setEndTime] = useState(editing?.scheduledEnd ? isoToZonedInput(editing.scheduledEnd, initialZone).slice(11, 16) : "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [posterUrl, setPosterUrl] = useState<string | null>(editing?.posterUrl ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(editing?.coverUrl ?? null);
  const [source, setSource] = useState<LiveSource>(editing?.sourceType ?? "fockis_live");
  const [meetingUrl, setMeetingUrl] = useState(editing?.meetingUrl ?? "");
  const [meeting, setMeeting] = useState<MeetingCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [visibility, setVisibility] = useState<LiveVisibility>(editing?.visibility ?? "members");
  const [groupIds, setGroupIds] = useState<string[]>(editing?.allowedGroupIds ?? []);
  const [departmentIds, setDepartmentIds] = useState<string[]>(editing?.allowedDepartmentIds ?? []);
  const [settings, setSettings] = useState<LiveSettings>({ ...DEFAULT_SETTINGS, ...(editing?.settings ?? {}) });
  const [moreOpen, setMoreOpen] = useState(false);
  const [groups, setGroups] = useState<Option[] | null>(null);
  const [departments, setDepartments] = useState<Option[] | null>(null);
  const [uploading, setUploading] = useState<"poster" | "cover" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "save" | null>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const zoneList = useMemo(zones, []);
  const isLive = editing?.state === "live";
  const isFinished = editing?.state === "ended" || editing?.state === "cancelled";

  // Groups and departments of this organization (only when needed).
  useEffect(() => {
    if (visibility !== "groups" || groups) return;
    const controller = new AbortController();
    Promise.all([
      listGroups(organizationId, { pageSize: 100 }, controller.signal).catch(() => null),
      listDepartments(organizationId, { pageSize: 100 }, controller.signal).catch(() => null),
    ]).then(([g, d]) => {
      if (controller.signal.aborted) return;
      setGroups((g?.items ?? []).map((x) => ({ id: x.id, name: x.name, count: typeof x.memberCount === "number" ? x.memberCount : null })));
      setDepartments((d?.items ?? []).map((x) => ({ id: x.id, name: x.name, count: typeof x.memberCount === "number" ? x.memberCount : null })));
    });
    return () => controller.abort();
  }, [organizationId, visibility, groups]);

  // Re-check a saved meeting link once (shows the meeting's details and warnings).
  useEffect(() => {
    if (editing?.sourceType === "meeting" && editing.meetingUrl) void checkMeeting(editing.meetingUrl, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setS = (patch: Partial<LiveSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const clearErr = (k: string) => setErrors((e) => {
    const n = { ...e };
    delete n[k];
    return n;
  });

  async function checkMeeting(url = meetingUrl, quiet = false) {
    if (!url.trim()) {
      setErrors((e) => ({ ...e, meetingUrl: "Paste the Fockis Meeting link." }));
      return;
    }
    setChecking(true);
    try {
      const res = await liveApi.validateMeeting(organizationId, url.trim(), visibility);
      setMeeting(res);
      clearErr("meetingUrl");
    } catch (err) {
      setMeeting(null);
      if (!quiet) setErrors((e) => ({ ...e, meetingUrl: errorMessage(err, "This link could not be checked.") }));
    } finally {
      setChecking(false);
    }
  }

  // The meeting's compatibility depends on the access choice.
  useEffect(() => {
    if (meeting && source === "meeting") void checkMeeting(meeting.url, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility]);

  async function upload(kind: "poster" | "cover", file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, [kind]: "Choose a JPG, PNG, WebP or GIF image." }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((e) => ({ ...e, [kind]: "The image must be 10 MB or smaller." }));
      return;
    }
    setUploading(kind);
    try {
      const res = await liveApi.upload(organizationId, file);
      if (kind === "poster") setPosterUrl(res.fileUrl);
      else setCoverUrl(res.fileUrl);
      clearErr(kind);
    } catch (err) {
      setErrors((e) => ({ ...e, [kind]: errorMessage(err, "The image could not be uploaded.") }));
    } finally {
      setUploading(null);
    }
  }

  function validate(draft: boolean): Record<string, string> {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Enter a title.";
    if (!date) e.date = "Choose the date.";
    if (!startTime) e.startTime = "Choose the start time.";
    if (!draft && !endTime) e.endTime = "Choose the end time.";
    if (date && startTime && endTime && endTime <= startTime) e.endTime = "The end time must be after the start time.";
    if (!draft && source === "meeting" && !meetingUrl.trim()) e.meetingUrl = "Paste the Fockis Meeting link.";
    if (!draft && visibility === "groups" && !groupIds.length && !departmentIds.length) e.access = "Choose at least one group or department.";
    return e;
  }

  async function submit(asDraft: boolean, ev?: FormEvent) {
    ev?.preventDefault();
    if (saving) return;
    setFormError(null);
    const found = validate(asDraft);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    const start = zonedInputToIso(`${date}T${startTime}`, zone);
    const end = endTime ? zonedInputToIso(`${date}T${endTime}`, zone) : null;
    const input: LiveInput = {
      title: title.trim(),
      description: description.trim(),
      scheduledStart: start,
      scheduledEnd: end,
      timeZone: zone,
      location: location.trim(),
      posterUrl,
      coverUrl,
      sourceType: source,
      meetingUrl: source === "meeting" ? meetingUrl.trim() : "",
      visibility,
      allowedGroupIds: visibility === "groups" ? groupIds : [],
      allowedDepartmentIds: visibility === "groups" ? departmentIds : [],
      settings: finalSettings(),
    };
    if (!editing || editing.state === "draft" || asDraft) input.isDraft = asDraft;
    setSaving(asDraft ? "draft" : "save");
    try {
      const saved = editing ? await liveApi.update(organizationId, editing.id, input) : await liveApi.create(organizationId, input);
      onSaved(saved, asDraft ? "draft" : editing ? "updated" : "created");
    } catch (err) {
      setFormError(errorMessage(err, "The livestream could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  const err = (k: string) => (errors[k] ? <small className="lv-error">{errors[k]}</small> : null);
  const eligible = useMemo(() => {
    const all = [...(groups ?? []).filter((g) => groupIds.includes(g.id)), ...(departments ?? []).filter((d) => departmentIds.includes(d.id))];
    if (!all.length || all.some((x) => x.count === null)) return null;
    return all.reduce((n, x) => n + (x.count ?? 0), 0);
  }, [groups, departments, groupIds, departmentIds]);

  /* Settings rows: [key, label, help, disabled reason] */
  const toggles: { k: keyof LiveSettings; label: string; help: string; off?: string }[] = [
    {
      k: "showOnPublicPage",
      label: "Show on Public Organization Page",
      help: "Lists the livestream on your public page. It never makes restricted video public.",
      off: visibility === "private" || visibility === "groups" ? "Private and group livestreams are never listed publicly." : undefined,
    },
    { k: "enableChat", label: "Enable Live Chat", help: "Viewers can chat during the broadcast (Fockis Live).", off: source === "meeting" ? "Chat in a Fockis Meeting is controlled in the meeting." : undefined },
  ];
  const more: { k: keyof LiveSettings; label: string; help: string; off?: string }[] = [
    { k: "notifyMembers", label: "Notify Eligible Members", help: "In-app notices when it is scheduled, 15 minutes before, and when it goes live. Only people who may watch are notified." },
    { k: "attendanceEnabled", label: "Enable Attendance Tracking", help: "Records who joined and for how long. Opening the page alone is never counted." },
    { k: "enableRecording", label: "Enable Recording", help: "Fockis Live records the broadcast to your cloud storage.", off: source === "meeting" ? "Record a Fockis Meeting from the meeting itself." : undefined },
    { k: "allowReplay", label: "Allow Replay", help: "People who may watch can open the recording afterwards." },
    { k: "allowSharing", label: "Allow Sharing", help: "Shows share and copy-link buttons to viewers. A link never grants access by itself." },
    {
      k: "showLockedPreview",
      label: "Show locked preview to visitors",
      help: "Visitors see the title and time with a Members Only lock.",
      off: visibility !== "members" ? "Only for Members Only livestreams." : undefined,
    },
    {
      k: "allowAccessRequests",
      label: "Allow Participants to Request Access",
      help: "Signed-in people who are not allowed can ask; you approve or deny in Manage Invitations.",
      off: visibility === "public" ? "Everyone can already watch a public livestream." : undefined,
    },
    {
      k: "allowGuests",
      label: "Allow Guests",
      help: "Visitors without a Fockis account can open meeting-based public livestreams.",
      off: visibility !== "public" ? "Only public livestreams can admit guests." : source === "fockis_live" ? "Fockis Live video needs a Fockis login." : undefined,
    },
    {
      k: "waitingRoom",
      label: "Enable Waiting Room",
      help: "",
      off: source === "meeting" ? "Set in Fockis Meetings — shown below the meeting link." : "Fockis Live has no waiting room. Use a Fockis Meeting for admission control.",
    },
    {
      k: "requireApproval",
      label: "Require Host Approval",
      help: "",
      off: source === "meeting" ? "Set in Fockis Meetings — shown below the meeting link." : "Use Private / Invite Only with access requests instead.",
    },
    {
      k: "requireRegistration",
      label: "Require Registration",
      help: "",
      off: "Use an event with Require RSVP and paste this livestream's link as the event's meeting link.",
    },
  ];

  /** Settings that do not apply are saved as off. */
  function finalSettings(): LiveSettings {
    const next = { ...settings, enableComments: settings.enableChat };
    [...toggles, ...more].forEach((row) => {
      if (row.off) (next as unknown as Record<string, unknown>)[row.k] = false;
    });
    return next;
  }

  const toggle = (row: { k: keyof LiveSettings; label: string; help: string; off?: string }) => {
    const disabled = Boolean(row.off);
    const on = disabled ? false : Boolean(settings[row.k]);
    return (
      <div key={row.k} className={`lv-toggle${disabled ? " is-off" : ""}`}>
        <button
          type="button"
          role="switch"
          className="lv-switch"
          aria-checked={on}
          aria-label={row.label}
          disabled={disabled}
          onClick={() => setS({ [row.k]: !settings[row.k] } as Partial<LiveSettings>)}
        >
          <i />
        </button>
        <span className="lv-toggle__label">{row.label}</span>
        <span className="lv-tip" tabIndex={0} aria-label={`About ${row.label}`}>
          <Info aria-hidden="true" />
          <span role="tooltip">{row.off ?? row.help}</span>
        </span>
      </div>
    );
  };

  const imageField = (kind: "poster" | "cover", label: string, url: string | null, ref: React.RefObject<HTMLInputElement>, set: (v: string | null) => void) => (
    <div className="lv-field">
      <span>{label}</span>
      <div className="lv-image">
        {url ? <img src={mediaUrl(url) ?? undefined} alt="" /> : <span className="lv-image__empty"><ImagePlus aria-hidden="true" /></span>}
        <div className="lv-image__actions">
          <button type="button" className="lv-btn lv-btn--ghost lv-btn--sm" disabled={uploading === kind} onClick={() => ref.current?.click()}>
            {uploading === kind ? "Uploading…" : url ? "Change" : "Upload"}
          </button>
          {url && (
            <button type="button" className="lv-icon-btn" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => set(null)}>
              <Trash2 />
            </button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => upload(kind, e.target.files?.[0])} />
      </div>
      {err(kind)}
    </div>
  );

  return (
    <aside className="lv-panel" aria-labelledby="lv-panel-title">
      <form onSubmit={(e) => submit(false, e)} noValidate>
        <header className="lv-panel__head">
          <h2 id="lv-panel-title">
            <CalendarDays aria-hidden="true" /> {editing ? (editing.state === "draft" ? "Edit Draft" : "Edit Livestream") : "Schedule Livestream"}
          </h2>
          <button type="button" className="lv-icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>

        <div className="lv-panel__body">
          {formError && <div className="lv-alert lv-alert--error" role="alert">{formError}</div>}
          {isLive && <div className="lv-alert">This livestream is live. Changes to access apply to people who join from now on.</div>}
          {isFinished && <div className="lv-alert">This livestream is over. Only the title, description, images and replay settings can change.</div>}

          <label className="lv-field">
            <span>
              Title <b>*</b>
            </span>
            <input value={title} maxLength={150} placeholder="Sunday Worship Service" aria-invalid={!!errors.title} onChange={(e) => (setTitle(e.target.value), clearErr("title"))} />
            {err("title")}
          </label>

          <label className="lv-field">
            <span>Description</span>
            <textarea rows={3} maxLength={2000} value={description} placeholder="Join us for our weekly worship, prayer, and the Word of God." onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="lv-row3">
            <label className="lv-field">
              <span>
                Date <b>*</b>
              </span>
              <span className="lv-input-icon">
                <CalendarDays aria-hidden="true" />
                <input type="date" value={date} disabled={isFinished || isLive} aria-invalid={!!errors.date} onChange={(e) => (setDate(e.target.value), clearErr("date"))} />
              </span>
              {err("date")}
            </label>
            <label className="lv-field">
              <span>
                Start Time <b>*</b>
              </span>
              <span className="lv-input-icon">
                <Clock aria-hidden="true" />
                <input type="time" value={startTime} disabled={isFinished || isLive} aria-invalid={!!errors.startTime} onChange={(e) => (setStartTime(e.target.value), clearErr("startTime"))} />
              </span>
              {err("startTime")}
            </label>
            <label className="lv-field">
              <span>
                End Time <b>*</b>
              </span>
              <span className="lv-input-icon">
                <Clock aria-hidden="true" />
                <input type="time" value={endTime} disabled={isFinished} aria-invalid={!!errors.endTime} onChange={(e) => (setEndTime(e.target.value), clearErr("endTime"))} />
              </span>
              {err("endTime")}
            </label>
          </div>

          <div className="lv-row2">
            <label className="lv-field">
              <span>Time Zone</span>
              <select value={zone} disabled={isFinished} onChange={(e) => setZone(e.target.value)}>
                {!zoneList.includes(zone) && <option value={zone}>{zoneLabel(zone)}</option>}
                {zoneList.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="lv-field">
              <span>Location or Campus</span>
              <span className="lv-input-icon">
                <MapPin aria-hidden="true" />
                <input value={location} maxLength={140} placeholder="Optional" onChange={(e) => setLocation(e.target.value)} />
              </span>
            </label>
          </div>

          <div className="lv-row2">
            {imageField("poster", "Thumbnail", posterUrl, posterRef, setPosterUrl)}
            {imageField("cover", "Cover image (optional)", coverUrl, coverRef, setCoverUrl)}
          </div>

          <fieldset className="lv-group" disabled={isLive || isFinished}>
            <legend>Livestream Source</legend>
            <label className={`lv-choice${source === "fockis_live" ? " is-on" : ""}`}>
              <input type="radio" name="lv-source" checked={source === "fockis_live"} onChange={() => setSource("fockis_live")} />
              <Radio aria-hidden="true" />
              <span>
                <strong>Fockis Live (Recommended)</strong>
                <small>Stream directly on Fockis with chat and attendance.</small>
              </span>
            </label>
            <label className={`lv-choice${source === "meeting" ? " is-on" : ""}`}>
              <input type="radio" name="lv-source" checked={source === "meeting"} onChange={() => setSource("meeting")} />
              <Video aria-hidden="true" />
              <span>
                <strong>Use Existing Meeting (Fockis Meeting)</strong>
                <small>Link a scheduled Fockis Meeting (e.g., Zoom-style).</small>
              </span>
            </label>
          </fieldset>

          {source === "meeting" && (
            <div className="lv-meeting">
              <label className="lv-field">
                <span>
                  Meeting URL <b>*</b>
                </span>
                <div className="lv-meeting__row">
                  <input
                    type="url"
                    inputMode="url"
                    value={meetingUrl}
                    disabled={isLive || isFinished}
                    placeholder="Paste the Fockis Meeting link (…/meet/…)"
                    aria-invalid={!!errors.meetingUrl}
                    onChange={(e) => (setMeetingUrl(e.target.value), setMeeting(null), clearErr("meetingUrl"))}
                  />
                  <button type="button" className="lv-btn lv-btn--outline lv-btn--sm" disabled={checking || isFinished} onClick={() => checkMeeting()}>
                    {checking ? "Checking…" : "Validate Meeting"}
                  </button>
                </div>
              </label>
              {err("meetingUrl")}
              <small className="lv-muted">Schedule the meeting in Fockis Meetings first, then copy its link here. Fockis does not create a meeting for you.</small>
              {meeting && (
                <div className="lv-meeting__info">
                  <div>
                    <strong>{meeting.title || "Fockis Meeting"}</strong>
                    <small>
                      {meeting.startsAt ? new Date(meeting.startsAt).toLocaleString() : "No time set"}
                      {meeting.hostName ? ` · Host: ${meeting.hostName}` : ""}
                    </small>
                    <small>
                      Meeting access: {meeting.visibility.replace("_", " ")} · Waiting room {meeting.waitingRoom ? "on" : "off"} · Host approval {meeting.requireApproval ? "on" : "off"}
                    </small>
                  </div>
                  <a className="lv-btn lv-btn--ghost lv-btn--sm" href={meeting.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden="true" /> Open Meeting
                  </a>
                  {meeting.protected && !meeting.warnings.length ? (
                    <p className="lv-ok">
                      <ShieldCheck aria-hidden="true" /> The meeting's settings work with this livestream's access.
                    </p>
                  ) : null}
                  {meeting.warnings.map((w) => (
                    <p key={w} className={meeting.protected ? "lv-warn lv-warn--soft" : "lv-warn"}>
                      <AlertTriangle aria-hidden="true" /> {w}
                    </p>
                  ))}
                  {!meeting.protected && <p className="lv-warn">Not protected: this livestream will be shown as "link-based access" until the meeting is fixed.</p>}
                </div>
              )}
            </div>
          )}

          <fieldset className="lv-group" disabled={isFinished}>
            <legend>
              Visibility &amp; Access <b>*</b>
            </legend>
            {ACCESS.map((a) => (
              <label key={a.v} className={`lv-choice${visibility === a.v ? " is-on" : ""}`}>
                <input type="radio" name="lv-access" checked={visibility === a.v} onChange={() => (setVisibility(a.v), clearErr("access"))} />
                <a.icon aria-hidden="true" />
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>

          {visibility === "groups" && (
            <div className="lv-groups">
              {!groups ? (
                <small className="lv-muted">Loading groups…</small>
              ) : (
                <>
                  <span className="lv-groups__label">Groups</span>
                  <div className="lv-chips">
                    {groups.length ? (
                      groups.map((g) => {
                        const on = groupIds.includes(g.id);
                        return (
                          <button key={g.id} type="button" className={`lv-chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => (setGroupIds(on ? groupIds.filter((x) => x !== g.id) : [...groupIds, g.id]), clearErr("access"))}>
                            {g.name}
                            {g.count !== null && <small>{g.count}</small>}
                          </button>
                        );
                      })
                    ) : (
                      <small className="lv-muted">No groups yet.</small>
                    )}
                  </div>
                  <span className="lv-groups__label">{departmentsLabel}</span>
                  <div className="lv-chips">
                    {departments?.length ? (
                      departments.map((d) => {
                        const on = departmentIds.includes(d.id);
                        return (
                          <button key={d.id} type="button" className={`lv-chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => (setDepartmentIds(on ? departmentIds.filter((x) => x !== d.id) : [...departmentIds, d.id]), clearErr("access"))}>
                            {d.name}
                            {d.count !== null && <small>{d.count}</small>}
                          </button>
                        );
                      })
                    ) : (
                      <small className="lv-muted">None yet.</small>
                    )}
                  </div>
                  {(groupIds.length > 0 || departmentIds.length > 0) && (
                    <small className="lv-muted">
                      {eligible !== null ? `Up to ${eligible.toLocaleString()} eligible members (people in several groups are counted once when they join).` : "Members of the selected groups can join."} Membership is checked on the server when they join.
                    </small>
                  )}
                </>
              )}
              {err("access")}
            </div>
          )}
          {visibility === "private" && (
            <small className="lv-muted">
              <CheckCircle2 aria-hidden="true" /> After saving, open <strong>Manage Invitations</strong> to invite people. A copied link only works for the invited account.
            </small>
          )}

          <div className="lv-toggles">{toggles.map(toggle)}</div>

          <button type="button" className="lv-more" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
            More settings <ChevronDown aria-hidden="true" />
          </button>
          {moreOpen && (
            <div className="lv-toggles">
              {more.map(toggle)}
              <label className="lv-early">
                {source === "meeting" ? "Meeting link opens" : "Show “Waiting for host”"}
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={settings.earlyJoinMinutes}
                  onChange={(e) => setS({ earlyJoinMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })}
                />
                minutes before the start
              </label>
            </div>
          )}
        </div>

        <footer className="lv-panel__foot">
          <button type="button" className="lv-btn lv-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          {(!editing || editing.state === "draft") && (
            <button type="button" className="lv-btn lv-btn--ghost" disabled={Boolean(saving)} onClick={() => submit(true)}>
              {saving === "draft" ? "Saving…" : "Save as Draft"}
            </button>
          )}
          <button type="submit" className="lv-btn lv-btn--primary" disabled={Boolean(saving)}>
            <CalendarDays aria-hidden="true" />
            {saving === "save" ? "Saving…" : !editing || editing.state === "draft" ? "Schedule Livestream" : "Save Changes"}
          </button>
        </footer>
      </form>
    </aside>
  );
}
