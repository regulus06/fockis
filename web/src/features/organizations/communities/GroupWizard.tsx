/**
 * GroupWizard.tsx
 * Create / edit a group in seven steps: Basic information · Leadership ·
 * Membership · Meeting schedule · Privacy · Group services · Review.
 * Save Draft / Create Group / Cancel. Validated here and again on the server.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { uploadMediaFile } from "../api/mediaApi";
import { errorMessage } from "../ui/orgUi";
import { MemberPicker } from "../ministries/MinistryDialogs";
import { GROUP_CATEGORIES, GROUP_ROLE_LABELS, SERVICE_LABELS, categoryLabel, communitiesApi, type GroupInput, type GroupSettings } from "./communitiesApi";
import { Field, GroupCover, GroupIcon, Modal } from "./GroupParts";

const STEPS = ["Basic Information", "Leadership", "Membership", "Meeting Schedule", "Privacy", "Group Services", "Review & Publish"] as const;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type LeaderRow = { membershipId: string; name: string; role: string; title: string };

export const DEFAULT_SETTINGS: GroupSettings = {
  visibility: "members",
  requireApproval: false,
  approver: "leaders",
  membersCanInvite: false,
  allowExternalInvites: false,
  membersCanSeeMembers: true,
  assistantsManageMembers: false,
  requirements: "",
  minAge: null,
  maxAge: null,
  services: { discussions: true, bibleStudy: true, prayer: true, meetings: true, attendance: true, finance: true, fundraising: true, documents: true, activities: true, tasks: true, contributions: true },
  currency: "USD",
  annualBudget: null,
  meeting: { frequency: "", day: "", startTime: "", endTime: "", location: "", mode: "in_person" },
  notifyLeadersOnRequest: true,
  notifyMembersOnAnnouncement: true,
};

export default function GroupWizard({
  organizationId,
  groupId,
  defaults,
  canGovern,
  onClose,
  onSaved,
}: {
  organizationId: string;
  groupId?: string | null;
  defaults: GroupSettings | null;
  /** Church leadership: may appoint group leaders and change status. */
  canGovern: boolean;
  onClose: () => void;
  onSaved: (id: string, published: boolean) => void;
}) {
  const editing = Boolean(groupId);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState<null | "draft" | "publish" | "logo" | "cover">(null);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement | null>(null);
  const coverRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("fellowship");
  const [description, setDescription] = useState("");
  const [mission, setMission] = useState("");
  const [objectives, setObjectives] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState("active");
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  const [pickRole, setPickRole] = useState("leader");
  const [s, setS] = useState<GroupSettings>(defaults ?? DEFAULT_SETTINGS);
  const set = <K extends keyof GroupSettings>(k: K, v: GroupSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const setMeeting = <K extends keyof GroupSettings["meeting"]>(k: K, v: GroupSettings["meeting"][K]) => setS((x) => ({ ...x, meeting: { ...x.meeting, [k]: v } }));

  useEffect(() => {
    if (!groupId) return;
    const c = new AbortController();
    communitiesApi
      .profile(organizationId, groupId, c.signal)
      .then((g) => {
        setName(g.name);
        setCategory(g.category);
        setDescription(g.description);
        setMission(g.mission);
        setObjectives(g.objectives);
        setLocation(g.location);
        setLanguage(g.language);
        setLogoUrl(g.logoUrl);
        setPhotoUrl(g.photoUrl);
        setCapacity(g.capacity ? String(g.capacity) : "");
        setStatus(g.status);
        setS(g.settings);
        setLeaders(g.leaders.map((l) => ({ membershipId: l.membershipId, name: l.displayName, role: l.role, title: l.title })));
      })
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "This group could not be loaded.")))
      .finally(() => !c.signal.aborted && setLoading(false));
    return () => c.abort();
  }, [organizationId, groupId]);

  const problem = useMemo(() => {
    if (name.trim().length < 2) return { step: 0, text: "Give the group a name." };
    if (capacity && Number(capacity) < 1) return { step: 2, text: "Capacity must be at least 1." };
    if (s.minAge != null && s.maxAge != null && s.minAge > s.maxAge) return { step: 2, text: "The minimum age is above the maximum age." };
    if (s.meeting.startTime && s.meeting.endTime && s.meeting.endTime <= s.meeting.startTime) return { step: 3, text: "Meetings must end after they start." };
    return null;
  }, [name, capacity, s]);

  async function upload(kind: "logo" | "cover", file: File) {
    if (!IMAGE_TYPES.includes(file.type)) return setError("Choose a JPG, PNG or WebP image.");
    if (file.size > 10 * 1024 * 1024) return setError("Images can be up to 10 MB.");
    setBusy(kind);
    setError(null);
    try {
      const up = editing && groupId ? await communitiesApi.uploadFile(organizationId, groupId, file) : await uploadMediaFile(organizationId, file);
      if (kind === "logo") setLogoUrl(up.fileUrl);
      else setPhotoUrl(up.fileUrl);
    } catch (err) {
      // New groups upload through the media library (staff with media access).
      setError(errorMessage(err, "The image could not be uploaded. You can add it after the group is created."));
    } finally {
      setBusy(null);
    }
  }

  async function save(publish: boolean) {
    if (problem) {
      setStep(problem.step);
      return setError(problem.text);
    }
    setBusy(publish ? "publish" : "draft");
    setError(null);
    const input: GroupInput = {
      name: name.trim(),
      category,
      description: description.trim(),
      mission: mission.trim(),
      objectives: objectives.trim(),
      location: location.trim(),
      language: language.trim(),
      logoUrl,
      photoUrl,
      capacity: capacity ? Number(capacity) : null,
      settings: s,
      leadership: leaders.map((l) => ({ membershipId: l.membershipId, role: l.role, title: l.title })),
    };
    if (canGovern) input.status = publish ? (editing && status === "inactive" ? "inactive" : "active") : "draft";
    try {
      const g = editing ? await communitiesApi.update(organizationId, groupId!, input) : await communitiesApi.create(organizationId, input);
      onSaved(g.id, publish);
    } catch (err) {
      setError(errorMessage(err, "The group could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  const roleChoices = canGovern ? Object.keys(GROUP_ROLE_LABELS).filter((r) => r !== "member") : ["assistant_leader", "coordinator", "secretary", "treasurer"];

  return (
    <Modal
      title={editing ? "Edit group" : "Create group"}
      subtitle={editing ? name : "Set up a new group in a few steps. You can save a draft at any time."}
      onClose={onClose}
      busy={busy === "draft" || busy === "publish"}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </button>
          {canGovern && (!editing || status === "draft") && (
            <button type="button" className="mn-btn mn-btn--outline" onClick={() => save(false)} disabled={Boolean(busy) || loading}>
              {busy === "draft" && <Loader2 className="mn-spin" aria-hidden="true" />} Save Draft
            </button>
          )}
          <span className="mn-grow" />
          {step > 0 && (
            <button type="button" className="mn-btn mn-btn--outline" onClick={() => setStep((x) => x - 1)} disabled={Boolean(busy)}>
              <ChevronLeft aria-hidden="true" /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="mn-btn mn-btn--primary" onClick={() => setStep((x) => x + 1)} disabled={Boolean(busy) || loading}>
              Next <ChevronRight aria-hidden="true" />
            </button>
          ) : (
            <button type="button" className="mn-btn mn-btn--primary" onClick={() => save(true)} disabled={Boolean(busy) || loading}>
              {busy === "publish" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Check aria-hidden="true" />} {editing ? (status === "draft" ? "Publish" : "Save changes") : "Create Group"}
            </button>
          )}
        </>
      }
    >
      <div className="mn-wizard">
        <ol className="mn-steps" aria-label="Steps">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button type="button" className={(i === step ? "is-active " : "") + (i < step ? "is-done" : "")} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
                <span>{i < step ? <Check aria-hidden="true" /> : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mn-wizard__pane">
          {loading ? (
            <div className="mn-sk" style={{ height: 240 }} />
          ) : (
            <>
              {step === 0 && (
                <div className="mn-form">
                  <div className="mn-form__row">
                    <Field label="Group name" required>
                      <input className="mn-input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Prayer Group" />
                    </Field>
                    <Field label="Group category">
                      <select className="mn-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {GROUP_CATEGORIES.map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Group type" hint="How people find and join the group (you can refine this under Privacy).">
                    <select
                      className="mn-input"
                      value={s.visibility === "invitation" ? "invitation" : s.visibility === "private" ? "private" : s.requireApproval ? "approval" : "open"}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "open") setS((x) => ({ ...x, visibility: x.visibility === "public" ? "public" : "members", requireApproval: false }));
                        if (v === "approval") setS((x) => ({ ...x, visibility: x.visibility === "public" ? "public" : "members", requireApproval: true }));
                        if (v === "private") setS((x) => ({ ...x, visibility: "private", requireApproval: true }));
                        if (v === "invitation") setS((x) => ({ ...x, visibility: "invitation", requireApproval: false }));
                      }}
                    >
                      <option value="open">Open — anyone in the church can join</option>
                      <option value="approval">Open with approval — request to join</option>
                      <option value="private">Private — only invited people can see it</option>
                      <option value="invitation">Invitation only</option>
                    </select>
                  </Field>
                  <Field label="Description">
                    <textarea className="mn-input" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </Field>
                  <div className="mn-form__row">
                    <Field label="Mission">
                      <textarea className="mn-input" rows={2} maxLength={1000} value={mission} onChange={(e) => setMission(e.target.value)} />
                    </Field>
                    <Field label="Objectives">
                      <textarea className="mn-input" rows={2} maxLength={2000} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
                    </Field>
                  </div>
                  <div className="mn-form__row">
                    <Field label="Location">
                      <input className="mn-input" value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} placeholder="Fellowship hall, Room 2" />
                    </Field>
                    <Field label="Language">
                      <input className="mn-input" value={language} maxLength={40} onChange={(e) => setLanguage(e.target.value)} placeholder="English, Kreyòl…" />
                    </Field>
                  </div>
                  <div className="gc-images">
                    <div className="gc-images__item">
                      <GroupIcon category={category} logoUrl={logoUrl} size={64} />
                      <div>
                        <b>Group logo</b>
                        <input ref={logoRef} type="file" hidden accept={IMAGE_TYPES.join(",")} onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />
                        <div className="mn-row">
                          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => logoRef.current?.click()} disabled={busy === "logo"}>
                            {busy === "logo" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />} {logoUrl ? "Replace" : "Upload"}
                          </button>
                          {logoUrl && (
                            <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setLogoUrl(null)}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="gc-images__item">
                      <GroupCover photoUrl={photoUrl} category={category} className="gc-images__cover" />
                      <div>
                        <b>Cover image</b>
                        <input ref={coverRef} type="file" hidden accept={IMAGE_TYPES.join(",")} onChange={(e) => e.target.files?.[0] && upload("cover", e.target.files[0])} />
                        <div className="mn-row">
                          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => coverRef.current?.click()} disabled={busy === "cover"}>
                            {busy === "cover" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />} {photoUrl ? "Replace" : "Upload"}
                          </button>
                          {photoUrl && (
                            <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setPhotoUrl(null)}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="mn-form">
                  {!canGovern && <div className="mn-callout">Group leaders are appointed by church leadership. You can assign assistants, a secretary and a treasurer.</div>}
                  <ul className="mn-leaders gc-leaders">
                    {leaders.length === 0 && <li className="mn-muted">No leadership yet.</li>}
                    {leaders.map((l, i) => {
                      const locked = !canGovern && l.role === "leader";
                      return (
                        <li key={l.membershipId}>
                          <b>{l.name}</b>
                          <select className="mn-input" value={l.role} disabled={locked} onChange={(e) => setLeaders((all) => all.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}>
                            {(locked ? ["leader"] : roleChoices).map((r) => (
                              <option key={r} value={r}>
                                {GROUP_ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <input className="mn-input" placeholder="Custom title (optional)" value={l.title} maxLength={60} onChange={(e) => setLeaders((all) => all.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                          {!locked && (
                            <button type="button" className="mn-iconbtn" aria-label={`Remove ${l.name}`} onClick={() => setLeaders((all) => all.filter((_, j) => j !== i))}>
                              <Trash2 aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mn-form__row">
                    <Field label="Add an existing church member" hint="No new accounts are created; leaders join the group automatically.">
                      <MemberPicker
                        organizationId={organizationId}
                        value={pick}
                        onChange={(v) => {
                          if (v && !leaders.some((l) => l.membershipId === v.id)) setLeaders((all) => [...all, { membershipId: v.id, name: v.name, role: pickRole, title: "" }]);
                          setPick(null);
                        }}
                      />
                    </Field>
                    <Field label="As">
                      <select className="mn-input" value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
                        {roleChoices.map((r) => (
                          <option key={r} value={r}>
                            {GROUP_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="mn-form">
                  <div className="mn-form__row">
                    <Field label="Maximum capacity" hint="Leave empty for no limit.">
                      <input className="mn-input" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                    </Field>
                    <Field label="Age range (optional)">
                      <div className="mn-row">
                        <input className="mn-input gc-age" type="number" min={0} max={120} placeholder="Min" value={s.minAge ?? ""} onChange={(e) => set("minAge", e.target.value ? Number(e.target.value) : null)} />
                        <span>–</span>
                        <input className="mn-input gc-age" type="number" min={0} max={120} placeholder="Max" value={s.maxAge ?? ""} onChange={(e) => set("maxAge", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                    </Field>
                  </div>
                  <Field label="Membership requirements">
                    <textarea className="mn-input" rows={2} maxLength={1000} value={s.requirements} onChange={(e) => set("requirements", e.target.value)} placeholder="Baptized members, attend the newcomers class…" />
                  </Field>
                  <label className="mn-check">
                    <input type="checkbox" checked={s.requireApproval} onChange={(e) => set("requireApproval", e.target.checked)} /> New members need approval
                  </label>
                  <div className="mn-form__row">
                    <Field label="Who approves requests">
                      <select className="mn-input" value={s.approver} onChange={(e) => set("approver", e.target.value as GroupSettings["approver"])}>
                        <option value="leaders">Group leaders (and church leadership)</option>
                        <option value="church">Church leadership only</option>
                      </select>
                    </Field>
                    <div />
                  </div>
                  <label className="mn-check">
                    <input type="checkbox" checked={s.membersCanInvite} onChange={(e) => set("membersCanInvite", e.target.checked)} /> Members can invite others
                  </label>
                  <label className="mn-check">
                    <input type="checkbox" checked={s.allowExternalInvites} onChange={(e) => set("allowExternalInvites", e.target.checked)} /> Allow email invitations to guests outside the church
                  </label>
                  <label className="mn-check">
                    <input type="checkbox" checked={s.membersCanSeeMembers} onChange={(e) => set("membersCanSeeMembers", e.target.checked)} /> Members can see the member list
                  </label>
                  <label className="mn-check">
                    <input type="checkbox" checked={s.assistantsManageMembers} onChange={(e) => set("assistantsManageMembers", e.target.checked)} /> Assistant leaders can manage members
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="mn-form">
                  <div className="mn-form__row">
                    <Field label="Meeting frequency">
                      <select className="mn-input" value={s.meeting.frequency} onChange={(e) => setMeeting("frequency", e.target.value as GroupSettings["meeting"]["frequency"])}>
                        <option value="">Not regular</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every two weeks</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </Field>
                    <Field label="Meeting day">
                      <select className="mn-input" value={s.meeting.day} onChange={(e) => setMeeting("day", e.target.value)}>
                        <option value="">—</option>
                        {DAYS.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="mn-form__row">
                    <Field label="Start time">
                      <input className="mn-input" type="time" value={s.meeting.startTime} onChange={(e) => setMeeting("startTime", e.target.value)} />
                    </Field>
                    <Field label="End time">
                      <input className="mn-input" type="time" value={s.meeting.endTime} onChange={(e) => setMeeting("endTime", e.target.value)} />
                    </Field>
                  </div>
                  <div className="mn-form__row">
                    <Field label="Meeting location">
                      <input className="mn-input" value={s.meeting.location} maxLength={300} onChange={(e) => setMeeting("location", e.target.value)} />
                    </Field>
                    <Field label="Format">
                      <select className="mn-input" value={s.meeting.mode} onChange={(e) => setMeeting("mode", e.target.value as GroupSettings["meeting"]["mode"])}>
                        <option value="in_person">In person</option>
                        <option value="online">Online (Fockis Meetings)</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </Field>
                  </div>
                  <p className="mn-muted">Scheduled meetings with reminders and online rooms are created from the group's Meetings tab.</p>
                </div>
              )}

              {step === 4 && (
                <div className="mn-form">
                  <fieldset className="mn-radios">
                    <legend>Who can discover and join?</legend>
                    {[
                      ["public", "Public", "Anyone can discover the group and request to join."],
                      ["members", "Church Members", "Only signed-in church members can discover and join."],
                      ["private", "Private", "Only invited people can access the group."],
                      ["invitation", "Invitation Only", "Visible to members, but joining requires an invitation."],
                    ].map(([k, l, t]) => (
                      <label key={k} className={s.visibility === k ? "is-on" : ""}>
                        <input type="radio" name="vis" checked={s.visibility === k} onChange={() => set("visibility", k as GroupSettings["visibility"])} />
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
                  <p className="mn-muted">Turn features on or off. You can change these later in the group's settings.</p>
                  <div className="gc-services">
                    {SERVICE_LABELS.map(([k, l, t]) => (
                      <label key={k} className={"gc-service" + (s.services[k] ? " is-on" : "")}>
                        <input type="checkbox" checked={s.services[k]} onChange={(e) => setS((x) => ({ ...x, services: { ...x.services, [k]: e.target.checked } }))} />
                        <span>
                          <b>{l}</b>
                          <small>{t}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                  {(s.services.finance || s.services.contributions) && (
                    <div className="mn-form__row">
                      <Field label="Currency">
                        <input className="mn-input" value={s.currency} maxLength={3} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
                      </Field>
                      <Field label="Annual budget (optional)">
                        <input className="mn-input" type="number" min={0} step="0.01" value={s.annualBudget ?? ""} onChange={(e) => set("annualBudget", e.target.value ? Number(e.target.value) : null)} />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {step === 6 && (
                <div className="mn-reviewcard">
                  <GroupCover photoUrl={photoUrl} category={category} className="mn-reviewcard__cover" />
                  <div className="mn-reviewcard__body">
                    <span className="gc-review-icon">
                      <GroupIcon category={category} logoUrl={logoUrl} size={48} />
                    </span>
                    <h3>{name || "Untitled group"}</h3>
                    <p>{description || "No description yet."}</p>
                    <dl className="mn-dl gc-dl">
                      <dt>Category</dt>
                      <dd>{categoryLabel(category)}</dd>
                      <dt>Leadership</dt>
                      <dd>{leaders.length ? leaders.map((l) => `${l.name} (${l.title || GROUP_ROLE_LABELS[l.role]})`).join(", ") : "None yet"}</dd>
                      <dt>Privacy</dt>
                      <dd>
                        {{ public: "Public", members: "Church members", private: "Private", invitation: "Invitation only" }[s.visibility]}
                        {s.requireApproval ? " · approval required" : ""}
                      </dd>
                      <dt>Capacity</dt>
                      <dd>{capacity || "No limit"}</dd>
                      <dt>Meets</dt>
                      <dd>{[s.meeting.frequency, s.meeting.day, s.meeting.startTime, s.meeting.location].filter(Boolean).join(" · ") || "Not set"}</dd>
                      <dt>Services</dt>
                      <dd>
                        {SERVICE_LABELS.filter(([k]) => s.services[k])
                          .map(([, l]) => l)
                          .join(", ") || "None"}
                      </dd>
                    </dl>
                    {problem && <p className="mn-form-error">{problem.text}</p>}
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
