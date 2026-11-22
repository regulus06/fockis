/**
 * MinistryWizard.tsx
 * Multi-section "Create Ministry" / "Edit Ministry" form:
 *   Basic info · Leadership · Membership rules · Schedule · Visibility ·
 *   Finances · Review — with Save Draft and Publish.
 * Saves through the existing departments API (POST/PATCH …/departments).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";

import { uploadMediaFile } from "../api/mediaApi";
import { errorMessage } from "../ui/orgUi";
import { MINISTRY_CATEGORIES, categoryLabel, ministriesApi, type MinistryInput, type MinistrySettings, type PolicyView } from "./ministriesApi";
import { CATEGORY_VISUALS, Field, MinistryCover, MinistryIcon, Modal } from "./MinistryParts";
import { MemberPicker } from "./MinistryDialogs";

const STEPS = ["Basic info", "Leadership", "Membership rules", "Schedule", "Visibility", "Finances", "Review"] as const;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Leader = { id: string; name: string; title: string };
type Meeting = { name: string; day: string; startTime: string; endTime: string; location: string };

export default function MinistryWizard({
  organizationId,
  ministryId,
  policy,
  canGovern,
  onClose,
  onSaved,
}: {
  organizationId: string;
  /** Edit an existing ministry when given. */
  ministryId?: string | null;
  policy: PolicyView | null;
  /** Leaders/status are set by church leadership only. */
  canGovern: boolean;
  onClose: () => void;
  onSaved: (id: string, published: boolean) => void;
}) {
  const editing = Boolean(ministryId);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState<null | "draft" | "publish" | "photo">(null);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("worship");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [status, setStatus] = useState("active");
  const [settings, setSettings] = useState<MinistrySettings>(
    policy?.defaults ?? {
      visibility: "public",
      joinMode: "open",
      autoApprove: false,
      maxMembers: null,
      membersCanSeeMembers: true,
      allowFinanceRequests: true,
      annualBudget: null,
      currency: "USD",
      mission: "",
      vision: "",
      contactEmail: "",
      contactPhone: "",
      iconKey: "",
      color: "",
      notifyLeadersOnApplication: true,
    },
  );
  const set = <K extends keyof MinistrySettings>(k: K, v: MinistrySettings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!ministryId) return;
    const c = new AbortController();
    ministriesApi
      .get(organizationId, ministryId, c.signal)
      .then((d) => {
        const raw = d as unknown as { leaders?: { membershipId?: string; displayName: string | null }[]; meetingSchedule?: Meeting[] };
        setName(d.name);
        setCategory(d.category || "other");
        setDescription(d.description ?? "");
        setPhotoUrl(d.photoUrl ?? null);
        setStatus(d.ministryStatus || "active");
        setSettings((s) => ({ ...s, ...(d.ministrySettings ?? {}) }));
        const names = new Map((raw.leaders ?? []).map((l) => [l.membershipId ?? "", l.displayName ?? ""]));
        setLeaders((d.leaderIds ?? []).map((id) => ({ id, name: names.get(id) || "Leader", title: d.leaderTitles?.[id] ?? "" })));
        setMeetings((raw.meetingSchedule ?? []).map((m) => ({ name: m.name, day: m.day, startTime: m.startTime, endTime: m.endTime, location: m.location })));
      })
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "This ministry could not be loaded.")))
      .finally(() => !c.signal.aborted && setLoading(false));
    return () => c.abort();
  }, [organizationId, ministryId]);

  const stepError = useMemo(() => {
    if (!name.trim()) return { step: 0, text: "Give the ministry a name." };
    if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) return { step: 0, text: "Enter a valid contact email." };
    if (settings.maxMembers != null && settings.maxMembers < 1) return { step: 2, text: "Maximum members must be at least 1." };
    if (settings.annualBudget != null && settings.annualBudget < 0) return { step: 5, text: "The budget cannot be negative." };
    return null;
  }, [name, settings]);

  async function uploadPhoto(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size > 10 * 1024 * 1024) return setError("Cover photos can be up to 10 MB.");
    setBusy("photo");
    setError(null);
    try {
      const up = await uploadMediaFile(organizationId, file);
      setPhotoUrl(up.fileUrl);
    } catch (err) {
      setError(errorMessage(err, "The photo could not be uploaded. Staff who manage media can add it later."));
    } finally {
      setBusy(null);
    }
  }

  async function save(publish: boolean) {
    if (stepError) {
      setStep(stepError.step);
      return setError(stepError.text);
    }
    setBusy(publish ? "publish" : "draft");
    setError(null);
    const input: MinistryInput = {
      name: name.trim(),
      category,
      description: description.trim(),
      photoUrl: photoUrl ?? "",
      leaderTitles: Object.fromEntries(leaders.filter((l) => l.title.trim()).map((l) => [l.id, l.title.trim()])),
      meetingSchedule: meetings.filter((m) => m.name.trim()),
      ministrySettings: settings,
    };
    if (canGovern) {
      input.leaderIds = leaders.map((l) => l.id);
      input.ministryStatus = publish ? (editing && status === "inactive" ? "inactive" : "active") : "draft";
    }
    try {
      const saved = editing ? await ministriesApi.update(organizationId, ministryId!, input) : await ministriesApi.create(organizationId, input);
      onSaved(saved.id, publish);
    } catch (err) {
      setError(errorMessage(err, "The ministry could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  const visual = CATEGORY_VISUALS[settings.iconKey || category] ?? CATEGORY_VISUALS.other;

  return (
    <Modal
      title={editing ? "Edit ministry" : "Create ministry"}
      subtitle={editing ? name : "Set up a new ministry in a few steps. You can save a draft at any time."}
      onClose={onClose}
      busy={Boolean(busy)}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </button>
          {canGovern && (!editing || status === "draft") && (
            <button type="button" className="mn-btn mn-btn--outline" onClick={() => save(false)} disabled={Boolean(busy) || loading}>
              {busy === "draft" && <Loader2 className="mn-spin" aria-hidden="true" />} Save draft
            </button>
          )}
          <span className="mn-grow" />
          {step > 0 && (
            <button type="button" className="mn-btn mn-btn--outline" onClick={() => setStep((s) => s - 1)} disabled={Boolean(busy)}>
              <ChevronLeft aria-hidden="true" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="mn-btn mn-btn--primary" onClick={() => setStep((s) => s + 1)} disabled={Boolean(busy) || loading}>
              Next <ChevronRight aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="mn-btn mn-btn--primary" onClick={() => save(true)} disabled={Boolean(busy) || loading}>
              {busy === "publish" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{" "}
              {editing ? (status === "draft" ? "Publish" : "Save changes") : "Publish ministry"}
            </button>
          )}
        </>
      }
    >
      <div className="mn-wizard">
        <ol className="mn-steps" aria-label="Sections">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button type="button" className={(i === step ? "is-active " : "") + (i < step ? "is-done" : "")} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
                <span>{i < step ? <Check aria-hidden="true" /> : i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>

        <div className="mn-wizard__pane">
          {loading ? (
            <div className="mn-sk" style={{ height: 220 }} />
          ) : (
            <>
              {step === 0 && (
                <div className="mn-form">
                  <div className="mn-form__row">
                    <Field label="Ministry name" required>
                      <input className="mn-input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Worship Ministry" />
                    </Field>
                    <Field label="Category">
                      <select className="mn-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {MINISTRY_CATEGORIES.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Short description" hint="Shown on the ministry card and page.">
                    <textarea className="mn-input" rows={3} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </Field>
                  <div className="mn-form__row">
                    <Field label="Mission">
                      <textarea className="mn-input" rows={2} maxLength={1000} value={settings.mission} onChange={(e) => set("mission", e.target.value)} />
                    </Field>
                    <Field label="Vision">
                      <textarea className="mn-input" rows={2} maxLength={1000} value={settings.vision} onChange={(e) => set("vision", e.target.value)} />
                    </Field>
                  </div>
                  <div className="mn-form__row">
                    <Field label="Contact email">
                      <input className="mn-input" type="email" value={settings.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
                    </Field>
                    <Field label="Contact phone">
                      <input className="mn-input" value={settings.contactPhone} maxLength={40} onChange={(e) => set("contactPhone", e.target.value)} />
                    </Field>
                  </div>
                  <div className="mn-photo-row">
                    <MinistryCover photoUrl={photoUrl} category={category} iconKey={settings.iconKey} color={settings.color} className="mn-photo-preview" />
                    <div>
                      <b>Cover photo</b>
                      <p className="mn-muted">JPG, PNG or WebP, up to 10 MB.</p>
                      <input ref={photoInput} type="file" accept={IMAGE_TYPES.join(",")} hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                      <div className="mn-row">
                        <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => photoInput.current?.click()} disabled={busy === "photo"}>
                          {busy === "photo" ? <Loader2 className="mn-spin" aria-hidden="true" /> : photoUrl ? <Upload aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}{" "}
                          {photoUrl ? "Replace" : "Upload"}
                        </button>
                        {photoUrl && (
                          <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setPhotoUrl(null)}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Field label="Icon">
                    <div className="mn-iconpick" role="radiogroup" aria-label="Icon">
                      {Object.keys(CATEGORY_VISUALS).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={(settings.iconKey || category) === k}
                          className={(settings.iconKey || category) === k ? "is-on" : ""}
                          title={categoryLabel(k)}
                          onClick={() => set("iconKey", k === category ? "" : k)}
                        >
                          <MinistryIcon category={k} size={34} color={settings.color || undefined} />
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Colour">
                    <div className="mn-row">
                      <input type="color" value={settings.color || visual.color} onChange={(e) => set("color", e.target.value)} aria-label="Ministry colour" />
                      {settings.color && (
                        <button type="button" className="mn-link" onClick={() => set("color", "")}>
                          Use category colour
                        </button>
                      )}
                    </div>
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="mn-form">
                  {!canGovern && <div className="mn-callout">Ministry leaders are assigned by church leadership. You can still edit their titles.</div>}
                  <ul className="mn-leaders">
                    {leaders.length === 0 && <li className="mn-muted">No leaders yet.</li>}
                    {leaders.map((l, i) => (
                      <li key={l.id}>
                        <b>{l.name}</b>
                        <input
                          className="mn-input"
                          placeholder="Title (e.g. Director, Assistant Leader)"
                          value={l.title}
                          maxLength={80}
                          onChange={(e) => setLeaders((all) => all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                        />
                        {canGovern && (
                          <button type="button" className="mn-iconbtn" aria-label={`Remove ${l.name}`} onClick={() => setLeaders((all) => all.filter((_, j) => j !== i))}>
                            <Trash2 aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {canGovern && (
                    <Field label="Add a leader" hint="Leaders must be active church members. They manage this ministry's members, teams and activities.">
                      <MemberPicker
                        organizationId={organizationId}
                        value={pick}
                        onChange={(v) => {
                          if (v && !leaders.some((l) => l.id === v.id)) setLeaders((all) => [...all, { id: v.id, name: v.name, title: all.length ? "Assistant Leader" : "Ministry Leader" }]);
                          setPick(null);
                        }}
                      />
                    </Field>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="mn-form">
                  <fieldset className="mn-radios">
                    <legend>How do people join?</legend>
                    {[
                      ["open", "Open", "Active church members join instantly."],
                      ["application", "Application", "Members apply; leaders approve or reject."],
                      ["invite", "Invite only", "Only leaders add members."],
                    ].map(([k, l, t]) => (
                      <label key={k} className={settings.joinMode === k ? "is-on" : ""}>
                        <input type="radio" name="join" checked={settings.joinMode === k} onChange={() => set("joinMode", k as MinistrySettings["joinMode"])} />
                        <b>{l}</b>
                        <span>{t}</span>
                      </label>
                    ))}
                  </fieldset>
                  {settings.joinMode === "application" && (
                    <label className="mn-check">
                      <input type="checkbox" checked={settings.autoApprove} onChange={(e) => set("autoApprove", e.target.checked)} /> Approve applications automatically
                    </label>
                  )}
                  <div className="mn-form__row">
                    <Field label="Maximum members" hint="Leave empty for no limit.">
                      <input
                        className="mn-input"
                        type="number"
                        min={1}
                        value={settings.maxMembers ?? ""}
                        onChange={(e) => set("maxMembers", e.target.value ? Number(e.target.value) : null)}
                      />
                    </Field>
                    <div />
                  </div>
                  <label className="mn-check">
                    <input type="checkbox" checked={settings.membersCanSeeMembers} onChange={(e) => set("membersCanSeeMembers", e.target.checked)} /> Members can see who else is in the ministry
                  </label>
                  <label className="mn-check">
                    <input type="checkbox" checked={settings.notifyLeadersOnApplication} onChange={(e) => set("notifyLeadersOnApplication", e.target.checked)} /> Notify leaders about new applications
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="mn-form">
                  <p className="mn-muted">
                    Regular meetings shown on the ministry page. After publishing, open the ministry's <b>Meetings & Schedule</b> tab to set exact recurring dates for attendance.
                  </p>
                  {meetings.map((m, i) => (
                    <div className="mn-meeting" key={i}>
                      <input className="mn-input" placeholder="Meeting name" value={m.name} maxLength={120} onChange={(e) => setMeetings((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <input className="mn-input" placeholder="Day (e.g. Sundays)" value={m.day} maxLength={80} onChange={(e) => setMeetings((all) => all.map((x, j) => (j === i ? { ...x, day: e.target.value } : x)))} />
                      <input className="mn-input" placeholder="Start (10:00 AM)" value={m.startTime} maxLength={20} onChange={(e) => setMeetings((all) => all.map((x, j) => (j === i ? { ...x, startTime: e.target.value } : x)))} />
                      <input className="mn-input" placeholder="End" value={m.endTime} maxLength={20} onChange={(e) => setMeetings((all) => all.map((x, j) => (j === i ? { ...x, endTime: e.target.value } : x)))} />
                      <input className="mn-input" placeholder="Location" value={m.location} maxLength={300} onChange={(e) => setMeetings((all) => all.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)))} />
                      <button type="button" className="mn-iconbtn" aria-label="Remove meeting" onClick={() => setMeetings((all) => all.filter((_, j) => j !== i))}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setMeetings((all) => [...all, { name: "", day: "", startTime: "", endTime: "", location: "" }])} disabled={meetings.length >= 20}>
                    <Plus aria-hidden="true" /> Add meeting
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="mn-form">
                  <fieldset className="mn-radios">
                    <legend>Who can see this ministry?</legend>
                    {[
                      ["public", "Public", "Listed on the church website and visible to everyone."],
                      ["members", "Members only", "Visible to signed-in church members."],
                      ["private", "Private", "Visible only to its members, leaders and church leadership."],
                    ].map(([k, l, t]) => (
                      <label key={k} className={settings.visibility === k ? "is-on" : ""}>
                        <input type="radio" name="vis" checked={settings.visibility === k} onChange={() => set("visibility", k as MinistrySettings["visibility"])} />
                        <b>{l}</b>
                        <span>{t}</span>
                      </label>
                    ))}
                  </fieldset>
                  {editing && canGovern && status !== "draft" && (
                    <Field label="Status">
                      <select className="mn-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </Field>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="mn-form">
                  <div className="mn-form__row">
                    <Field label="Annual budget" hint="Optional. Used to show what remains after approved requests.">
                      <input
                        className="mn-input"
                        type="number"
                        min={0}
                        step="0.01"
                        value={settings.annualBudget ?? ""}
                        onChange={(e) => set("annualBudget", e.target.value ? Number(e.target.value) : null)}
                      />
                    </Field>
                    <Field label="Currency">
                      <input className="mn-input" value={settings.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
                    </Field>
                  </div>
                  <label className="mn-check">
                    <input type="checkbox" checked={settings.allowFinanceRequests} onChange={(e) => set("allowFinanceRequests", e.target.checked)} /> Leaders may submit finance requests for approval
                  </label>
                </div>
              )}

              {step === 6 && (
                <div className="mn-reviewcard">
                  <MinistryCover photoUrl={photoUrl} category={category} iconKey={settings.iconKey} color={settings.color} className="mn-reviewcard__cover" />
                  <div className="mn-reviewcard__body">
                    <MinistryIcon category={category} iconKey={settings.iconKey} color={settings.color} size={44} />
                    <h3>{name || "Untitled ministry"}</h3>
                    <p>{description || "No description yet."}</p>
                    <dl className="mn-dl mn-dl--grid">
                      <dt>Category</dt>
                      <dd>{categoryLabel(category)}</dd>
                      <dt>Leaders</dt>
                      <dd>{leaders.length ? leaders.map((l) => l.name + (l.title ? ` (${l.title})` : "")).join(", ") : "None yet"}</dd>
                      <dt>Joining</dt>
                      <dd>
                        {settings.joinMode === "open" ? "Open" : settings.joinMode === "application" ? `By application${settings.autoApprove ? " (auto-approved)" : ""}` : "Invite only"}
                        {settings.maxMembers ? ` · max ${settings.maxMembers}` : ""}
                      </dd>
                      <dt>Meetings</dt>
                      <dd>{meetings.filter((m) => m.name.trim()).length || "None"}</dd>
                      <dt>Visibility</dt>
                      <dd>{settings.visibility === "public" ? "Public" : settings.visibility === "members" ? "Members only" : "Private"}</dd>
                      <dt>Budget</dt>
                      <dd>{settings.annualBudget != null ? `${settings.annualBudget} ${settings.currency}` : "Not set"}</dd>
                    </dl>
                    {stepError && <p className="mn-form-error">{stepError.text}</p>}
                  </div>
                </div>
              )}
            </>
          )}
          {error && (
            <p className="mn-form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
