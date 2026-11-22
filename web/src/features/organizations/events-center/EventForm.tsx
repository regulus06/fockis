/**
 * EventForm.tsx — Create / Edit Event card of the organization events dashboard.
 * -----------------------------------------------------------------------------
 * Saves Fockis platform events linked to the organization through the
 * existing /events API (eventsApi.create / update). The server checks the
 * organization's Manage events permission, validates every field, sanitizes
 * the description and keeps the meeting link private to people the meeting
 * access allows.
 *
 * The meeting link is pasted by the organizer: this form never creates a
 * Fockis Meeting or generates a link.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ExternalLink,
  FileText,
  Globe,
  ImagePlus,
  Info,
  Link2,
  Lock,
  MapPin,
  Plus,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";

import { EVENTS_URL, eventsApi, request } from "../../events/services/eventsApi";
import type { CreateEventInput, FockisEvent, RegistrationAccess, RegistrationSettingsInput } from "../../events/types/event.types";
import RegistrationSettingsForm, {
  defaultRegistrationSettings,
  validateRegistrationSettings,
} from "../../events/registrations/RegistrationSettingsForm";
import { richTextLength, sanitizeRichText } from "../../events/utils/richText";
import { mediaUrl } from "../api/dashboardApi";
import { errorMessage } from "../ui/orgUi";
import RichTextEditor from "./RichTextEditor";
import type { CatalogKind, CatalogTemplate, EventCatalog, EventFormat } from "./orgEventsApi";
import { isoToZonedInput, zoneLabel, zonedInputToIso } from "./zonedTime";

const MAX_DESCRIPTION = 2000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface Draft {
  title: string;
  eventType: string;
  orgCategory: string;
  starts: string;
  ends: string;
  locationName: string;
  address: string;
  online: boolean;
  format: EventFormat;
  meetingUrl: string;
  /** Edit: the saved link stays until the organizer replaces it. */
  replaceLink: boolean;
  access: RegistrationAccess;
  selectedGroupIds: string[];
  earlyJoinMinutes: number;
  description: string;
  requireRsvp: boolean;
  deadline: string;
  showPublic: boolean;
  notify: boolean;
  capacity: string;
  registration: RegistrationSettingsInput;
  coverFile: File | null;
  coverUrl: string;
  removeCover: boolean;
}

function blankDraft(types: EventCatalog["types"]): Draft {
  return {
    title: "",
    eventType: types.find((t) => !t.archived)?.id ?? "",
    orgCategory: "",
    starts: "",
    ends: "",
    locationName: "",
    address: "",
    online: false,
    format: "in_person",
    meetingUrl: "",
    replaceLink: true,
    access: "public",
    selectedGroupIds: [],
    earlyJoinMinutes: 15,
    description: "",
    requireRsvp: false,
    deadline: "",
    showPublic: true,
    notify: false,
    capacity: "",
    registration: defaultRegistrationSettings(false),
    coverFile: null,
    coverUrl: "",
    removeCover: false,
  };
}

function draftFromEvent(ev: FockisEvent, zone: string, types: EventCatalog["types"]): Draft {
  const s = ev.registrationSettings ?? defaultRegistrationSettings(ev.isOnline);
  const hybrid = !ev.isOnline && s.attendanceOptions.includes("online");
  return {
    ...blankDraft(types),
    title: ev.title,
    eventType: ev.eventType || "",
    orgCategory: ev.orgCategory || "",
    starts: isoToZonedInput(ev.startDate, zone),
    ends: isoToZonedInput(ev.endDate, zone),
    locationName: ev.locationName ?? "",
    address: ev.address ?? "",
    online: ev.isOnline || hybrid,
    format: ev.isOnline ? "online" : hybrid ? "hybrid" : "in_person",
    meetingUrl: "",
    replaceLink: !ev.onlineUrl,
    access: s.access,
    selectedGroupIds: s.selectedGroupIds ?? [],
    earlyJoinMinutes: s.earlyJoinMinutes ?? 15,
    description: ev.description ?? "",
    requireRsvp: s.mode === "required",
    deadline: s.closesAt ? isoToZonedInput(s.closesAt, zone) : "",
    showPublic: ev.visibility === "public",
    notify: false,
    capacity: ev.capacity ? String(ev.capacity) : "",
    registration: s,
    coverUrl: ev.coverMediaType === "video" ? "" : ev.coverImageUrl ?? "",
  };
}

function draftFromTemplate(t: CatalogTemplate, base: Draft): Draft {
  const online = t.format !== "in_person";
  return {
    ...base,
    title: t.title || base.title,
    eventType: t.eventType || base.eventType,
    orgCategory: t.orgCategory || base.orgCategory,
    locationName: t.format === "online" ? "" : t.locationName,
    address: t.format === "online" ? "" : t.address,
    online,
    format: t.format,
    description: t.description,
    requireRsvp: t.requireRsvp,
    showPublic: t.showOnPublicPage,
    registration: { ...base.registration, mode: t.requireRsvp ? "required" : "rsvp" },
  };
}

function validMeetingUrl(v: string): boolean {
  try {
    const u = new URL(v.trim());
    return (u.protocol === "https:" || u.protocol === "http:") && Boolean(u.hostname.includes("."));
  } catch {
    return false;
  }
}

function hostOf(v: string): string {
  try {
    return new URL(v).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const isFockisHost = (host: string) => /(^|\.)fockis\./i.test(host);

interface GroupOption {
  id: string;
  name: string;
}

function useGroups(enabled: boolean): { items: GroupOption[]; failed: boolean } {
  const [state, setState] = useState<{ items: GroupOption[]; failed: boolean }>({ items: [], failed: false });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    request<unknown>(`${EVENTS_URL.replace(/\/events$/, "")}/groups`, { signal: controller.signal })
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
      .catch(() => !controller.signal.aborted && setState({ items: [], failed: true }));
    return () => controller.abort();
  }, [enabled]);
  return state;
}

export default function EventForm({
  organizationId,
  catalog,
  zone,
  editing,
  template,
  isChurch,
  onSaved,
  onCancelEdit,
  onManage,
  onSaveTemplate,
}: {
  organizationId: string;
  catalog: EventCatalog;
  zone: string;
  editing: FockisEvent | null;
  /** A template picked in Quick Actions → Event Templates (applied once). */
  template: { t: CatalogTemplate; n: number } | null;
  isChurch: boolean;
  onSaved: (event: FockisEvent, how: "created" | "updated" | "draft") => void;
  onCancelEdit: () => void;
  onManage: (kind: CatalogKind) => void;
  onSaveTemplate: (t: Omit<CatalogTemplate, "id" | "archived">) => void;
}) {
  const [d, setD] = useState<Draft>(() => (editing ? draftFromEvent(editing, zone, catalog.types) : blankDraft(catalog.types)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const groups = useGroups(d.access === "selected");

  const set = (patch: Partial<Draft>) => {
    setD((x) => ({ ...x, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  // Load the event being edited (or reset when editing ends).
  useEffect(() => {
    setD(editing ? draftFromEvent(editing, zone, catalog.types) : blankDraft(catalog.types));
    setErrors({});
    setFormError(null);
    setMoreOpen(false);
    if (editing) titleRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id, zone]);

  // Pick a default type once the catalog arrives.
  useEffect(() => {
    if (!d.eventType && catalog.types.length && !editing) set({ eventType: catalog.types.find((t) => !t.archived)?.id ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.types]);

  useEffect(() => {
    if (template) setD((x) => draftFromTemplate(template.t, x));
  }, [template]);

  // Cover preview for a chosen file.
  useEffect(() => {
    if (!d.coverFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(d.coverFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [d.coverFile]);

  const types = useMemo(() => catalog.types.filter((t) => !t.archived || t.id === d.eventType), [catalog.types, d.eventType]);
  const categories = useMemo(() => catalog.categories.filter((c) => !c.archived || c.id === d.orgCategory), [catalog.categories, d.orgCategory]);
  const locations = catalog.locations.filter((l) => !l.archived);
  const savedLink = editing?.onlineUrl ?? "";
  const linkHost = hostOf(d.replaceLink ? d.meetingUrl : savedLink);
  const descLength = richTextLength(d.description);
  const isDraftEvent = Boolean(editing?.isDraft);
  const regCount = editing?.registration?.registeredSeats ?? 0;

  function setOnline(on: boolean) {
    set({ online: on, format: on ? (d.format === "in_person" ? "online" : d.format) : "in_person" });
  }

  function pickLocation(name: string) {
    const loc = locations.find((l) => l.name.toLowerCase() === name.trim().toLowerCase());
    set({ locationName: name, ...(loc ? { address: loc.address } : {}) });
  }

  function chooseCover(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, cover: "Choose an image (JPG, PNG or WebP)." }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, cover: "The image must be 10 MB or smaller." }));
      return;
    }
    set({ coverFile: file, removeCover: false });
  }

  async function pasteLink() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) set({ meetingUrl: text.slice(0, 2000) });
    } catch {
      setErrors((e) => ({ ...e, meetingUrl: "Your browser blocked pasting. Press Ctrl+V (⌘V) in the field instead." }));
    }
  }

  function validate(draft: boolean): Record<string, string> {
    const e: Record<string, string> = {};
    if (!d.title.trim()) e.title = "Enter a title.";
    else if (d.title.trim().length > 150) e.title = "The title can be at most 150 characters.";
    if (!d.eventType && !draft) e.eventType = "Choose a type.";
    if (!d.starts) e.starts = "Choose when the event starts.";
    if (!d.ends) e.ends = "Choose when the event ends.";
    const start = d.starts ? zonedInputToIso(d.starts, zone) : "";
    const end = d.ends ? zonedInputToIso(d.ends, zone) : "";
    if (start && end && new Date(end) <= new Date(start)) e.ends = "The end must be after the start.";
    if (d.format !== "online" && !d.locationName.trim() && !d.address.trim()) e.locationName = "Add the location (or turn on Online Meeting for an online-only event).";
    if (d.format !== "in_person") {
      const link = d.replaceLink ? d.meetingUrl.trim() : savedLink;
      if (!link) e.meetingUrl = "Paste the meeting link.";
      else if (d.replaceLink && !validMeetingUrl(link)) e.meetingUrl = "Enter a valid link starting with https://";
    }
    if (descLength > MAX_DESCRIPTION) e.description = `The description can be at most ${MAX_DESCRIPTION.toLocaleString("en-US")} characters.`;
    if (d.capacity && (!/^\d+$/.test(d.capacity) || Number(d.capacity) < 1)) e.capacity = "Capacity must be a whole number (or empty for no limit).";
    if (d.requireRsvp && d.deadline) {
      const dl = zonedInputToIso(d.deadline, zone);
      if (end && new Date(dl) > new Date(end)) e.deadline = "The registration deadline must be before the event ends.";
    }
    if (d.access === "selected" && !d.selectedGroupIds.length && d.format !== "in_person" && !editing) {
      e.access = "Choose at least one group (you can also invite people from the event page after saving).";
    }
    return e;
  }

  function settingsForSave(): RegistrationSettingsInput {
    const mode = d.requireRsvp ? "required" : d.registration.mode === "required" ? "rsvp" : d.registration.mode;
    return {
      ...d.registration,
      mode,
      closesAt: d.requireRsvp && d.deadline ? zonedInputToIso(d.deadline, zone) : null,
      attendanceOptions: d.format === "hybrid" ? ["in_person", "online"] : d.format === "online" ? ["online"] : ["in_person"],
      access: d.access,
      organizationId,
      selectedGroupIds: d.access === "selected" ? d.selectedGroupIds : [],
      earlyJoinMinutes: d.earlyJoinMinutes,
      allowGuests: d.access === "public" ? d.registration.allowGuests : false,
    };
  }

  async function submit(asDraft: boolean, e?: FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setFormError(null);
    const found = validate(asDraft);
    const registration = settingsForSave();
    const regError = validateRegistrationSettings(registration, d.ends ? zonedInputToIso(d.ends, zone) : "");
    if (regError) {
      found.registration = regError;
      setMoreOpen(true);
    }
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    const input: CreateEventInput = {
      title: d.title.trim(),
      description: sanitizeRichText(d.description),
      category: isChurch ? "religious" : "community",
      visibility: d.showPublic ? "public" : "organization",
      startDate: zonedInputToIso(d.starts, zone),
      endDate: zonedInputToIso(d.ends, zone),
      timeZone: zone,
      locationName: d.format === "online" ? "" : d.locationName.trim(),
      address: d.format === "online" ? "" : d.address.trim(),
      latitude: null,
      longitude: null,
      isOnline: d.format === "online",
      capacity: d.capacity ? Number(d.capacity) : null,
      registration,
      eventType: d.eventType || undefined,
      orgCategory: d.orgCategory,
      isDraft: asDraft,
      notifyMembers: !asDraft && d.notify,
    };
    if (d.format !== "in_person" && d.replaceLink) input.onlineUrl = d.meetingUrl.trim();
    if (d.coverFile) {
      input.coverImageFile = d.coverFile;
      input.coverMediaType = "image";
    } else if (d.removeCover) {
      input.coverImageUrl = "";
    }

    setSaving(asDraft ? "draft" : "publish");
    try {
      const saved = editing ? await eventsApi.update(editing.id, input) : await eventsApi.create({ ...input, organizationId });
      onSaved(saved, asDraft ? "draft" : editing ? "updated" : "created");
      if (!editing) {
        setD(blankDraft(catalog.types));
        setMoreOpen(false);
      }
    } catch (err) {
      setFormError(errorMessage(err, "The event could not be saved."));
    } finally {
      setSaving(null);
    }
  }

  function saveAsTemplate() {
    const start = d.starts ? new Date(zonedInputToIso(d.starts, zone)).getTime() : 0;
    const end = d.ends ? new Date(zonedInputToIso(d.ends, zone)).getTime() : 0;
    onSaveTemplate({
      name: d.title.trim() || "New template",
      title: d.title.trim(),
      eventType: d.eventType,
      orgCategory: d.orgCategory,
      description: sanitizeRichText(d.description),
      durationMinutes: start && end > start ? Math.round((end - start) / 60000) : 60,
      locationName: d.locationName.trim(),
      address: d.address.trim(),
      format: d.format,
      requireRsvp: d.requireRsvp,
      showOnPublicPage: d.showPublic,
    });
  }

  const err = (k: string) => (errors[k] ? <small className="oe-error" id={`oe-err-${k}`}>{errors[k]}</small> : null);
  const coverSrc = preview ?? (!d.removeCover && d.coverUrl ? mediaUrl(d.coverUrl) : null);

  return (
    <form className="oe-card oe-create" onSubmit={(e) => submit(false, e)} noValidate aria-labelledby="oe-create-title">
      <header className="oe-card__head">
        <h2 id="oe-create-title">
          <span className="oe-create__icon" aria-hidden="true">
            <CalendarPlus />
          </span>
          {editing ? (isDraftEvent ? "Edit Draft" : "Edit Event") : "Create Event"}
        </h2>
        <button type="button" className="oe-btn oe-btn--outline" onClick={() => submit(true)} disabled={Boolean(saving)}>
          <FileText aria-hidden="true" /> {saving === "draft" ? "Saving…" : "Save as Draft"}
        </button>
      </header>

      {formError && (
        <div className="oe-alert oe-alert--error" role="alert">
          {formError}
        </div>
      )}

      <div className="oe-grid">
        <label className="oe-field">
          <span>
            Title <b aria-hidden="true">*</b>
          </span>
          <input ref={titleRef} value={d.title} maxLength={150} placeholder="Enter event title" aria-invalid={!!errors.title} onChange={(e) => set({ title: e.target.value })} />
          {err("title")}
        </label>

        <label className="oe-field">
          <span>
            Type <b aria-hidden="true">*</b>
          </span>
          <div className="oe-select">
            <Settings2 aria-hidden="true" />
            <select
              value={d.eventType}
              aria-invalid={!!errors.eventType}
              onChange={(e) => (e.target.value === "__manage" ? onManage("types") : set({ eventType: e.target.value }))}
            >
              {!d.eventType && <option value="">Choose a type…</option>}
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.archived ? " (archived)" : ""}
                </option>
              ))}
              <option value="__manage">+ Add a custom type…</option>
            </select>
            <ChevronDown className="oe-select__chev" aria-hidden="true" />
          </div>
          {err("eventType")}
        </label>

        <label className="oe-field">
          <span>
            Starts at <b aria-hidden="true">*</b>
          </span>
          <div className="oe-input-icon">
            <CalendarClock aria-hidden="true" />
            <input type="datetime-local" value={d.starts} aria-invalid={!!errors.starts} onChange={(e) => set({ starts: e.target.value, ...(d.ends && e.target.value && d.ends <= e.target.value ? { ends: "" } : {}) })} />
          </div>
          {err("starts")}
        </label>

        <label className="oe-field">
          <span>
            Ends at <b aria-hidden="true">*</b>
          </span>
          <div className="oe-input-icon">
            <CalendarClock aria-hidden="true" />
            <input type="datetime-local" value={d.ends} min={d.starts || undefined} aria-invalid={!!errors.ends} onChange={(e) => set({ ends: e.target.value })} />
          </div>
          {err("ends")}
        </label>
        <p className="oe-zone">
          <Globe aria-hidden="true" /> Times are in {zoneLabel(zone)} — your organization's time zone.
        </p>

        <label className="oe-field">
          <span>Location{d.format !== "online" && <b aria-hidden="true"> *</b>}</span>
          <div className="oe-input-icon">
            <MapPin aria-hidden="true" />
            <input
              list="oe-locations"
              value={d.format === "online" ? "" : d.locationName}
              disabled={d.format === "online"}
              maxLength={140}
              placeholder={d.format === "online" ? "Online only" : isChurch ? "Enter event location (e.g., Main Sanctuary)" : "Enter event location (e.g., Main Hall)"}
              aria-invalid={!!errors.locationName}
              onChange={(e) => pickLocation(e.target.value)}
            />
            <datalist id="oe-locations">
              {locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.address}
                </option>
              ))}
            </datalist>
          </div>
          {d.format !== "online" && d.address && <small className="oe-muted">{d.address}</small>}
          {err("locationName")}
        </label>

        <div className={`oe-online${d.online ? " is-on" : ""}`}>
          <button type="button" role="switch" aria-checked={d.online} className="oe-switch" onClick={() => setOnline(!d.online)} aria-label="Online Meeting">
            <i />
          </button>
          <div>
            <strong>Online Meeting</strong>
            <small>Add a Fockis Meeting link (or any online meeting link).</small>
            {d.online && (
              <div className="oe-seg" role="radiogroup" aria-label="Attendance">
                <button type="button" role="radio" aria-checked={d.format === "online"} className={d.format === "online" ? "is-on" : ""} onClick={() => set({ format: "online" })}>
                  Online only
                </button>
                <button type="button" role="radio" aria-checked={d.format === "hybrid"} className={d.format === "hybrid" ? "is-on" : ""} onClick={() => set({ format: "hybrid" })}>
                  In person &amp; online
                </button>
              </div>
            )}
          </div>
        </div>

        {d.online && (
          <div className="oe-field oe-span">
            <span>
              Meeting Link <b aria-hidden="true">*</b>
            </span>
            {!d.replaceLink && savedLink ? (
              <div className="oe-link-saved">
                <Link2 aria-hidden="true" />
                <span className="oe-link-saved__url" title={savedLink}>
                  {savedLink}
                </span>
                <span className={`oe-pill ${isFockisHost(linkHost) ? "oe-pill--blue" : ""}`}>{isFockisHost(linkHost) ? "Fockis Meeting" : linkHost || "Link"}</span>
                <a className="oe-btn oe-btn--ghost oe-btn--sm" href={savedLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden="true" /> Open
                </a>
                <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" onClick={() => set({ replaceLink: true, meetingUrl: "" })}>
                  Replace
                </button>
              </div>
            ) : (
              <div className="oe-link">
                <Link2 aria-hidden="true" />
                <input
                  type="url"
                  inputMode="url"
                  value={d.meetingUrl}
                  maxLength={2000}
                  placeholder="Paste your Fockis Meeting link here (e.g., https://meet.fockis.com/meet/abc-123)"
                  aria-invalid={!!errors.meetingUrl}
                  aria-describedby="oe-link-help"
                  onChange={(e) => set({ meetingUrl: e.target.value })}
                  onBlur={() => d.meetingUrl && !validMeetingUrl(d.meetingUrl) && setErrors((x) => ({ ...x, meetingUrl: "Enter a valid link starting with https://" }))}
                />
                <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" onClick={pasteLink}>
                  Paste
                </button>
                <a
                  className={`oe-btn oe-btn--ghost oe-btn--sm${validMeetingUrl(d.meetingUrl) ? "" : " is-disabled"}`}
                  href={validMeetingUrl(d.meetingUrl) ? d.meetingUrl.trim() : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!validMeetingUrl(d.meetingUrl)}
                  onClick={(e) => !validMeetingUrl(d.meetingUrl) && e.preventDefault()}
                >
                  <ExternalLink aria-hidden="true" /> Test link
                </a>
                {savedLink && (
                  <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" onClick={() => set({ replaceLink: false, meetingUrl: "" })}>
                    Keep current
                  </button>
                )}
                <span className="oe-tip" tabIndex={0} aria-label="About meeting links">
                  <Info aria-hidden="true" />
                  <span role="tooltip">
                    Create the meeting in Fockis Meeting (or another service) and paste its link. Only people allowed by Meeting Access get the link, through the Join button.
                  </span>
                </span>
              </div>
            )}
            <small className="oe-muted" id="oe-link-help">
              {linkHost
                ? isFockisHost(linkHost)
                  ? "Fockis Meeting link — the meeting's own lobby and host controls still apply."
                  : `External meeting (${linkHost}). That service's own security settings apply too.`
                : "The link is never shown publicly. Fockis does not create a meeting for you."}
            </small>
            {err("meetingUrl")}

            <div className="oe-access">
              <span className="oe-access__label">Meeting access</span>
              <div className="oe-seg oe-seg--wide" role="radiogroup" aria-label="Meeting access">
                {[
                  { v: "public" as const, l: "Public", i: Globe },
                  { v: "members" as const, l: "Members Only", i: Users },
                  { v: "selected" as const, l: "Selected Members or Groups", i: Lock },
                ].map((o) => (
                  <button key={o.v} type="button" role="radio" aria-checked={d.access === o.v} className={d.access === o.v ? "is-on" : ""} onClick={() => set({ access: o.v })}>
                    <o.i aria-hidden="true" /> {o.l}
                  </button>
                ))}
              </div>
              <label className="oe-access__early">
                Join opens
                <input type="number" min={0} max={120} value={d.earlyJoinMinutes} onChange={(e) => set({ earlyJoinMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })} />
                min before start
              </label>
            </div>
            {d.access === "members" && <small className="oe-muted">Only active members of your organization can join. Visitors see the event but never the link.</small>}
            {d.access === "public" && <small className="oe-muted">Anyone who can see the event can join once the meeting opens{d.requireRsvp ? " (after registering)" : ""}.</small>}
            {d.access === "selected" && (
              <div className="oe-chips">
                {groups.items.length ? (
                  groups.items.map((g) => {
                    const on = d.selectedGroupIds.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        className={`oe-chip${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        onClick={() => set({ selectedGroupIds: on ? d.selectedGroupIds.filter((x) => x !== g.id) : [...d.selectedGroupIds, g.id] })}
                      >
                        {g.name}
                      </button>
                    );
                  })
                ) : (
                  <small className="oe-muted">{groups.failed ? "Your groups couldn't load." : "No groups yet."} You can invite individual people from the event page after saving.</small>
                )}
              </div>
            )}
            {err("access")}
          </div>
        )}

        <div className="oe-field oe-span">
          <span>Description</span>
          <RichTextEditor
            value={d.description}
            onChange={(html) => set({ description: html })}
            max={MAX_DESCRIPTION}
            invalid={!!errors.description}
            placeholder="Describe the event, who it's for, and any important details…"
          />
          {err("description")}
        </div>
      </div>

      <div className="oe-options">
        <label className="oe-check">
          <input
            type="checkbox"
            checked={d.requireRsvp}
            onChange={(e) => set({ requireRsvp: e.target.checked, registration: { ...d.registration, mode: e.target.checked ? "required" : "rsvp" } })}
          />
          <span>Require RSVP</span>
        </label>
        <label className={`oe-deadline${d.requireRsvp ? "" : " is-off"}`}>
          <span>Registration Deadline</span>
          <input type="datetime-local" value={d.deadline} disabled={!d.requireRsvp} max={d.ends || undefined} aria-invalid={!!errors.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </label>
        <div className="oe-toggle">
          <button type="button" role="switch" aria-checked={d.showPublic} className="oe-switch" onClick={() => set({ showPublic: !d.showPublic })} aria-label="Show on Public Page">
            <i />
          </button>
          <span>Show on Public Page</span>
        </div>
        <div className="oe-toggle">
          <button type="button" role="switch" aria-checked={d.notify} className="oe-switch" onClick={() => set({ notify: !d.notify })} aria-label="Send Notifications">
            <i />
          </button>
          <span>Send Notifications</span>
        </div>
      </div>
      {err("deadline")}
      {d.notify && (
        <small className="oe-muted oe-note">
          Active members get an in-app notification when the event is published (once per event){editing?.isDraft === false ? "; saving changes to a published event notifies only if they weren't notified before" : ""}.
        </small>
      )}

      <div className={`oe-more${moreOpen ? " is-open" : ""}`}>
        <button type="button" className="oe-more__toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
          <Settings2 aria-hidden="true" />
          <span>
            <strong>Registration Settings</strong>
            <small>Cover image, category, capacity, free or paid tickets, waitlist, approvals and cancellation rules.</small>
          </span>
          <ChevronDown className="oe-more__chev" aria-hidden="true" />
        </button>
        {moreOpen && (
          <div className="oe-more__body">
            <div className="oe-grid">
              <div className="oe-field">
                <span>Cover image</span>
                <div className="oe-cover">
                  {coverSrc ? <img src={coverSrc} alt="" /> : <span className="oe-cover__empty"><ImagePlus aria-hidden="true" /></span>}
                  <div className="oe-cover__actions">
                    <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" onClick={() => fileRef.current?.click()}>
                      <ImagePlus aria-hidden="true" /> {coverSrc ? "Change" : "Upload"}
                    </button>
                    {coverSrc && (
                      <button type="button" className="oe-btn oe-btn--ghost oe-btn--sm" onClick={() => set({ coverFile: null, removeCover: Boolean(d.coverUrl) })}>
                        <Trash2 aria-hidden="true" /> Remove
                      </button>
                    )}
                    <small className="oe-muted">JPG, PNG or WebP, up to 10 MB. Saved for this event only.</small>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => chooseCover(e.target.files?.[0])} />
                </div>
                {err("cover")}
              </div>

              <div className="oe-grid oe-grid--tight">
                <label className="oe-field">
                  <span>Category</span>
                  <div className="oe-select">
                    <select value={d.orgCategory} onChange={(e) => (e.target.value === "__manage" ? onManage("categories") : set({ orgCategory: e.target.value }))}>
                      <option value="">No category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.archived ? " (archived)" : ""}
                        </option>
                      ))}
                      <option value="__manage">+ Manage categories…</option>
                    </select>
                    <ChevronDown className="oe-select__chev" aria-hidden="true" />
                  </div>
                </label>
                <label className="oe-field">
                  <span>Capacity</span>
                  <input inputMode="numeric" value={d.capacity} placeholder="No limit" aria-invalid={!!errors.capacity} onChange={(e) => set({ capacity: e.target.value.replace(/[^\d]/g, "").slice(0, 7) })} />
                  <small className="oe-muted">Registrations stop at this number{d.registration.waitlistEnabled ? "; then people join the waitlist" : ""}. The server prevents overbooking.</small>
                  {err("capacity")}
                </label>
              </div>
            </div>

            <div className="oe-regform">
              <RegistrationSettingsForm
                value={{
                  ...d.registration,
                  mode: d.requireRsvp ? "required" : d.registration.mode === "required" ? "rsvp" : d.registration.mode,
                  // One deadline: the options row and this form edit the same value.
                  closesAt: d.deadline ? zonedInputToIso(d.deadline, zone) : null,
                }}
                onChange={(next) =>
                  set({ registration: next, requireRsvp: next.mode === "required", deadline: next.closesAt ? isoToZonedInput(next.closesAt, zone) : "" })
                }
                isOnline={d.format === "online"}
                hasRegistrations={regCount > 0}
                embedded
              />
            </div>
            {err("registration")}
          </div>
        )}
      </div>

      <footer className="oe-create__foot">
        <div className="oe-create__left">
          <button type="button" className="oe-btn oe-btn--ghost" onClick={() => (editing ? onCancelEdit() : setD(blankDraft(catalog.types)))}>
            Cancel
          </button>
          <button type="button" className="oe-btn oe-btn--link" onClick={saveAsTemplate} disabled={!d.title.trim()}>
            <Plus aria-hidden="true" /> Save as template
          </button>
        </div>
        <button type="submit" className="oe-btn oe-btn--primary" disabled={Boolean(saving)}>
          {!editing && <Plus aria-hidden="true" />}
          {saving === "publish" ? "Saving…" : editing ? (isDraftEvent ? "Publish Event" : "Save Changes") : "Create Event"}
        </button>
      </footer>
    </form>
  );
}
