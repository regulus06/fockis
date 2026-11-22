/* Dialogs of the member profile dashboard. Every save goes through an
   existing endpoint (membersApi) or the member-profile endpoint; the server
   re-checks permissions on each call. */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import { membersApi } from "../api/membersApi";
import { listDepartments } from "../api/departmentsApi";
import { MemberRole, MembershipStatus, type Department, type Member } from "../types/organization.types";
import { errorMessage } from "../ui/orgUi";
import {
  DOC_CATEGORIES,
  HISTORY_TYPES,
  NOTE_CATEGORIES,
  ROLE_LABEL,
  STATUS_LABEL,
  memberProfileApi,
  type FamilyPerson,
  type MemberProfileView,
  type SacramentStatus,
} from "./memberProfileApi";
import { Field, Modal } from "./ProfileParts";

export interface DialogCtx {
  orgId: string;
  memberId: string;
  view: MemberProfileView;
  onClose: () => void;
  /** Called with the fresh profile (or null to refetch) and a success message. */
  onSaved: (next: MemberProfileView | null, message: string) => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const rid = () => Math.random().toString(36).slice(2, 10);

function Footer({ busy, onClose, label, form }: { busy: boolean; onClose: () => void; label: string; form: string }) {
  return (
    <>
      <button type="button" className="fo-btn fo-btn--secondary" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button type="submit" form={form} className="fo-btn fo-btn--primary" disabled={busy}>
        {busy ? "Saving…" : label}
      </button>
    </>
  );
}

function useSubmit(ctx: DialogCtx) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<{ view: MemberProfileView | null; message: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      ctx.onSaved(r.view, r.message);
    } catch (err) {
      setError(errorMessage(err, "Something went wrong. Please try again."));
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function FormError({ error }: { error: string | null }) {
  return error ? (
    <div className="mpf-form-error" role="alert">
      {error}
    </div>
  ) : null;
}

/* ------------------------------------------------------- edit member */

export function EditMemberDialog(ctx: DialogCtx & { focus?: "personal" | "contact" }) {
  const { view } = ctx;
  const m = view.member;
  const d = view.details;
  const canPrivate = view.access.canViewPrivate && view.access.canEditPersonal;
  const [f, setF] = useState({
    displayName: m.displayName ?? "",
    preferredName: d.preferredName ?? "",
    gender: d.gender ?? "",
    languages: (d.languages ?? []).join(", "),
    dateOfBirth: dateOnly(m.dateOfBirth),
    email: m.email ?? "",
    phone: m.phone ?? "",
    line1: m.address?.line1 ?? "",
    line2: m.address?.line2 ?? "",
    city: m.address?.city ?? "",
    state: m.address?.state ?? "",
    postalCode: m.address?.postalCode ?? "",
    country: m.address?.country ?? "",
    ecName: d.emergencyContact?.name ?? "",
    ecRelationship: d.emergencyContact?.relationship ?? "",
    ecPhone: d.emergencyContact?.phone ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, error, run } = useSubmit(ctx);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.displayName.trim()) errs.displayName = "Full name is required.";
    if (f.displayName.length > 120) errs.displayName = "Keep the name under 120 characters.";
    if (canPrivate && f.email.trim() && !EMAIL_RE.test(f.email.trim())) errs.email = "Enter a valid email address.";
    if (canPrivate && f.dateOfBirth && (!DATE_RE.test(f.dateOfBirth) || f.dateOfBirth > today())) errs.dateOfBirth = "Enter a past date.";
    if (canPrivate && f.line1.trim() && !f.city.trim()) errs.city = "City is required with a street address.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    void run(async () => {
      const update: Parameters<typeof membersApi.updateMember>[2] = {};
      if (f.displayName.trim() !== (m.displayName ?? "")) update.profile = { displayName: f.displayName.trim() };
      if (canPrivate) {
        const hasAddress = [f.line1, f.line2, f.city, f.state, f.postalCode, f.country].some((x) => x.trim());
        update.privateProfile = {
          email: f.email.trim() || null,
          phone: f.phone.trim() || null,
          ...(f.dateOfBirth ? { dateOfBirth: f.dateOfBirth } : {}),
          ...(hasAddress
            ? {
                address: {
                  line1: f.line1.trim(),
                  line2: f.line2.trim() || undefined,
                  city: f.city.trim(),
                  state: f.state.trim() || undefined,
                  postalCode: f.postalCode.trim() || undefined,
                  country: f.country.trim(),
                },
              }
            : {}),
        };
      }
      if (update.profile || update.privateProfile) await membersApi.updateMember(ctx.orgId, ctx.memberId, update);
      const next = await memberProfileApi.update(ctx.orgId, ctx.memberId, {
        preferredName: f.preferredName.trim(),
        gender: f.gender,
        languages: f.languages
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 10),
        ...(canPrivate
          ? {
              emergencyContact:
                f.ecName.trim() || f.ecPhone.trim()
                  ? { name: f.ecName.trim(), relationship: f.ecRelationship.trim(), phone: f.ecPhone.trim() }
                  : null,
            }
          : {}),
      });
      return { view: next, message: "Member details saved." };
    });
  };

  return (
    <Modal title="Edit member" onClose={ctx.onClose} busy={busy} wide footer={<Footer busy={busy} onClose={ctx.onClose} label="Save changes" form="mpf-edit" />}>
      <form id="mpf-edit" className="mpf-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <h3 className="mpf-form__section">Personal information</h3>
        <div className="mpf-grid2">
          <Field label="Full name" required error={errors.displayName}>
            <input className="fo-input" value={f.displayName} onChange={set("displayName")} maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Preferred name">
            <input className="fo-input" value={f.preferredName} onChange={set("preferredName")} maxLength={80} />
          </Field>
          {canPrivate && (
            <Field label="Date of birth" error={errors.dateOfBirth}>
              <input type="date" className="fo-input" value={f.dateOfBirth} max={today()} onChange={set("dateOfBirth")} />
            </Field>
          )}
          <Field label="Gender">
            <select className="fo-select" value={f.gender} onChange={set("gender")}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </Field>
          <Field label="Languages" hint="Separate with commas, e.g. English, Spanish" full>
            <input className="fo-input" value={f.languages} onChange={set("languages")} maxLength={300} />
          </Field>
        </div>
        {canPrivate ? (
          <>
            <h3 className="mpf-form__section">Contact information</h3>
            <div className="mpf-grid2">
              <Field label="Email" error={errors.email}>
                <input type="email" className="fo-input" value={f.email} onChange={set("email")} maxLength={254} autoComplete="email" />
              </Field>
              <Field label="Phone">
                <input type="tel" className="fo-input" value={f.phone} onChange={set("phone")} maxLength={40} autoComplete="tel" />
              </Field>
              <Field label="Street address" full>
                <input className="fo-input" value={f.line1} onChange={set("line1")} maxLength={160} autoComplete="address-line1" />
              </Field>
              <Field label="Apartment, suite" full>
                <input className="fo-input" value={f.line2} onChange={set("line2")} maxLength={160} autoComplete="address-line2" />
              </Field>
              <Field label="City" error={errors.city}>
                <input className="fo-input" value={f.city} onChange={set("city")} maxLength={100} />
              </Field>
              <Field label="State / Region">
                <input className="fo-input" value={f.state} onChange={set("state")} maxLength={100} />
              </Field>
              <Field label="Postal code">
                <input className="fo-input" value={f.postalCode} onChange={set("postalCode")} maxLength={20} />
              </Field>
              <Field label="Country">
                <input className="fo-input" value={f.country} onChange={set("country")} maxLength={100} />
              </Field>
            </div>
            <h3 className="mpf-form__section">Emergency contact</h3>
            <div className="mpf-grid3">
              <Field label="Name">
                <input className="fo-input" value={f.ecName} onChange={set("ecName")} maxLength={120} />
              </Field>
              <Field label="Relationship">
                <input className="fo-input" value={f.ecRelationship} onChange={set("ecRelationship")} maxLength={60} />
              </Field>
              <Field label="Phone">
                <input type="tel" className="fo-input" value={f.ecPhone} onChange={set("ecPhone")} maxLength={40} />
              </Field>
            </div>
          </>
        ) : (
          <p className="mpf-muted">Contact details are private and only visible to authorized administrators.</p>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- membership */

const ASSIGNABLE_ROLES: MemberRole[] = [
  MemberRole.Administrator,
  MemberRole.PastorDirector,
  MemberRole.Leader,
  MemberRole.DepartmentManager,
  MemberRole.GroupLeader,
  MemberRole.Member,
];

export function MembershipDialog(ctx: DialogCtx) {
  const { view } = ctx;
  const [f, setF] = useState({
    membershipNumber: view.details.membershipNumber ?? "",
    membershipType: view.details.membershipType ?? "",
    churchRole: view.details.churchRole ?? "",
    role: view.member.role,
  });
  const { busy, error, run } = useSubmit(ctx);
  const roleEditable = view.access.canChangeStatus && !view.access.isSelf;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (roleEditable && f.role !== view.member.role) await membersApi.updateMemberRole(ctx.orgId, ctx.memberId, f.role as MemberRole);
      const next = await memberProfileApi.update(ctx.orgId, ctx.memberId, {
        membershipNumber: f.membershipNumber.trim(),
        membershipType: f.membershipType,
        churchRole: f.churchRole.trim(),
      });
      return { view: next, message: "Membership details saved." };
    });
  };

  return (
    <Modal title="Edit membership details" onClose={ctx.onClose} busy={busy} footer={<Footer busy={busy} onClose={ctx.onClose} label="Save" form="mpf-membership" />}>
      <form id="mpf-membership" className="mpf-form" onSubmit={submit}>
        <FormError error={error} />
        <div className="mpf-grid2">
          <Field label="Member ID" hint="Leave blank to use the system ID.">
            <input className="fo-input" value={f.membershipNumber} onChange={set("membershipNumber")} maxLength={40} />
          </Field>
          <Field label="Membership type">
            <select className="fo-select" value={f.membershipType} onChange={set("membershipType")}>
              <option value="">Not specified</option>
              <option value="full">Full member</option>
              <option value="associate">Associate member</option>
              <option value="youth">Youth member</option>
              <option value="transfer">Transfer member</option>
              <option value="visitor">Regular attender</option>
            </select>
          </Field>
          <Field label="Church membership role" hint="e.g. Pastor, Deacon, Choir Director" full>
            <input className="fo-input" value={f.churchRole} onChange={set("churchRole")} maxLength={80} />
          </Field>
          {view.member.isOwner ? (
            <Field label="Organization role" full>
              <input className="fo-input" value="Organization Owner" disabled />
            </Field>
          ) : (
            <Field label="Organization role" hint={roleEditable ? "Controls what this person can manage." : "You can't change this role."} full>
              <select className="fo-select" value={f.role} onChange={set("role")} disabled={!roleEditable}>
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r] ?? r}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- spiritual */

export function SpiritualDialog(ctx: DialogCtx) {
  const b = ctx.view.details.baptism;
  const c = ctx.view.details.confirmation;
  const [f, setF] = useState({
    bStatus: (b?.status ?? "not_recorded") as SacramentStatus,
    bDate: dateOnly(b?.date),
    bLocation: b?.location ?? "",
    bOfficiant: b?.officiant ?? "",
    bNotes: b?.notes ?? "",
    cStatus: (c?.status ?? "not_recorded") as SacramentStatus,
    cDate: dateOnly(c?.date),
    cDetails: c?.details ?? "",
    faith: ctx.view.details.faithJourney ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, error, run } = useSubmit(ctx);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.bStatus === "completed" && !f.bDate) errs.bDate = "Add the baptism date.";
    if (f.bStatus === "completed" && f.bDate > today()) errs.bDate = "A completed baptism can't be in the future.";
    if (f.cStatus === "completed" && !f.cDate) errs.cDate = "Add the confirmation date.";
    if (f.cStatus === "completed" && f.cDate > today()) errs.cDate = "A completed confirmation can't be in the future.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    void run(async () => ({
      view: await memberProfileApi.update(ctx.orgId, ctx.memberId, {
        baptism: { status: f.bStatus, date: f.bDate || null, location: f.bLocation.trim(), officiant: f.bOfficiant.trim(), notes: f.bNotes.trim() },
        confirmation: { status: f.cStatus, date: f.cDate || null, details: f.cDetails.trim() },
        ...(ctx.view.access.canViewPastoral ? { faithJourney: f.faith.trim() } : {}),
      }),
      message: "Spiritual journey saved.",
    }));
  };

  const statusSelect = (value: SacramentStatus, key: "bStatus" | "cStatus") => (
    <select className="fo-select" value={value} onChange={set(key)}>
      <option value="not_recorded">Not recorded</option>
      <option value="scheduled">Scheduled</option>
      <option value="completed">Completed</option>
    </select>
  );

  return (
    <Modal title="Edit spiritual journey" onClose={ctx.onClose} busy={busy} wide footer={<Footer busy={busy} onClose={ctx.onClose} label="Save" form="mpf-spiritual" />}>
      <form id="mpf-spiritual" className="mpf-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <h3 className="mpf-form__section">Baptism</h3>
        <div className="mpf-grid2">
          <Field label="Status">{statusSelect(f.bStatus, "bStatus")}</Field>
          <Field label="Date" error={errors.bDate}>
            <input type="date" className="fo-input" value={f.bDate} onChange={set("bDate")} />
          </Field>
          <Field label="Location">
            <input className="fo-input" value={f.bLocation} onChange={set("bLocation")} maxLength={160} />
          </Field>
          <Field label="Officiant">
            <input className="fo-input" value={f.bOfficiant} onChange={set("bOfficiant")} maxLength={120} />
          </Field>
          <Field label="Notes" full>
            <textarea className="fo-textarea" rows={2} value={f.bNotes} onChange={set("bNotes")} maxLength={1000} />
          </Field>
        </div>
        <h3 className="mpf-form__section">Confirmation</h3>
        <div className="mpf-grid2">
          <Field label="Status">{statusSelect(f.cStatus, "cStatus")}</Field>
          <Field label="Date" error={errors.cDate}>
            <input type="date" className="fo-input" value={f.cDate} onChange={set("cDate")} />
          </Field>
          <Field label="Details" full>
            <input className="fo-input" value={f.cDetails} onChange={set("cDetails")} maxLength={500} />
          </Field>
        </div>
        {ctx.view.access.canViewPastoral && (
          <>
            <h3 className="mpf-form__section">Faith journey</h3>
            <Field label="Pastoral record" hint="Only the owner, administrators and pastors can see this." full>
              <textarea className="fo-textarea" rows={4} value={f.faith} onChange={set("faith")} maxLength={5000} />
            </Field>
          </>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- family */

function PersonRows({ list, onChange, relationshipPlaceholder, withBirth }: { list: FamilyPerson[]; onChange: (next: FamilyPerson[]) => void; relationshipPlaceholder: string; withBirth?: boolean }) {
  const patch = (i: number, p: Partial<FamilyPerson>) => onChange(list.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="mpf-people">
      {list.map((p, i) => (
        <div className="mpf-people__row" key={p.id}>
          <input className="fo-input" placeholder="Name" aria-label="Name" value={p.name} maxLength={120} onChange={(e) => patch(i, { name: e.target.value })} />
          <input className="fo-input" placeholder={relationshipPlaceholder} aria-label="Relationship" value={p.relationship} maxLength={60} onChange={(e) => patch(i, { relationship: e.target.value })} />
          {withBirth && <input type="date" className="fo-input" aria-label="Birth date" value={dateOnly(p.birthDate)} max={today()} onChange={(e) => patch(i, { birthDate: e.target.value || null })} />}
          <button type="button" className="fo-btn fo-btn--ghost fo-btn--sm" aria-label={`Remove ${p.name || "person"}`} onClick={() => onChange(list.filter((_, j) => j !== i))}>
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="fo-btn fo-btn--secondary fo-btn--sm"
        disabled={list.length >= 20}
        onClick={() => onChange([...list, { id: rid(), name: "", relationship: "", membershipId: null, birthDate: null }])}
      >
        <Plus aria-hidden="true" /> Add person
      </button>
    </div>
  );
}

export function FamilyDialog(ctx: DialogCtx) {
  const fam = ctx.view.details.family;
  const [spouse, setSpouse] = useState(fam?.spouse?.name ?? "");
  const [children, setChildren] = useState<FamilyPerson[]>(fam?.children ?? []);
  const [household, setHousehold] = useState<FamilyPerson[]>(fam?.household ?? []);
  const { busy, error, run } = useSubmit(ctx);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = (l: FamilyPerson[]) => l.filter((p) => p.name.trim()).map((p) => ({ ...p, name: p.name.trim(), relationship: p.relationship.trim() }));
    void run(async () => ({
      view: await memberProfileApi.update(ctx.orgId, ctx.memberId, {
        family: {
          spouse: spouse.trim() ? { id: fam?.spouse?.id ?? rid(), name: spouse.trim(), relationship: "Spouse", membershipId: fam?.spouse?.membershipId ?? null, birthDate: null } : null,
          children: clean(children).map((c) => ({ ...c, relationship: c.relationship || "Child" })),
          household: clean(household),
        },
      }),
      message: "Family connections saved.",
    }));
  };

  return (
    <Modal title="Edit family connections" onClose={ctx.onClose} busy={busy} wide footer={<Footer busy={busy} onClose={ctx.onClose} label="Save" form="mpf-family" />}>
      <form id="mpf-family" className="mpf-form" onSubmit={submit}>
        <FormError error={error} />
        <Field label="Spouse" full>
          <input className="fo-input" value={spouse} onChange={(e) => setSpouse(e.target.value)} maxLength={120} placeholder="Name" />
        </Field>
        <h3 className="mpf-form__section">Children</h3>
        <PersonRows list={children} onChange={setChildren} relationshipPlaceholder="Son, daughter…" withBirth />
        <h3 className="mpf-form__section">Household members</h3>
        <PersonRows list={household} onChange={setHousehold} relationshipPlaceholder="Parent, sibling…" />
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- assign ministry */

export function AssignMinistryDialog(ctx: DialogCtx) {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [leaders, setLeaders] = useState<Member[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [f, setF] = useState({ departmentId: "", role: "Member", leaderMembershipId: "", startDate: today(), responsibilities: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, error, run } = useSubmit(ctx);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      listDepartments(ctx.orgId, { pageSize: 100 }, controller.signal),
      membersApi.listMembers(ctx.orgId, { pageSize: 100, status: MembershipStatus.Active }, controller.signal),
    ])
      .then(([deps, mems]) => {
        if (controller.signal.aborted) return;
        setDepartments(deps.items ?? []);
        setLeaders((mems.items ?? []).filter((x) => x.id !== ctx.memberId));
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(err, "Ministries could not be loaded."));
      });
    return () => controller.abort();
  }, [ctx.orgId, ctx.memberId]);

  const assigned = useMemo(() => new Set(ctx.view.ministries.filter((m) => m.active).map((m) => m.departmentId)), [ctx.view.ministries]);
  const options = (departments ?? []).filter((d) => !assigned.has(d.id));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.departmentId) errs.departmentId = "Choose a ministry.";
    if (f.startDate && !DATE_RE.test(f.startDate)) errs.startDate = "Enter a valid date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    void run(async () => ({
      view: await memberProfileApi.assignMinistry(ctx.orgId, ctx.memberId, {
        departmentId: f.departmentId,
        role: f.role.trim() || "Member",
        leaderMembershipId: f.leaderMembershipId || null,
        startDate: f.startDate || null,
        responsibilities: f.responsibilities.trim(),
      }),
      message: "Ministry assigned.",
    }));
  };

  return (
    <Modal title="Assign ministry" onClose={ctx.onClose} busy={busy} footer={<Footer busy={busy} onClose={ctx.onClose} label="Assign" form="mpf-ministry" />}>
      <form id="mpf-ministry" className="mpf-form" onSubmit={submit} noValidate>
        <FormError error={error ?? loadError} />
        <div className="mpf-grid2">
          <Field label="Ministry" required error={errors.departmentId} full>
            <select className="fo-select" value={f.departmentId} onChange={set("departmentId")} disabled={!departments}>
              <option value="">{departments ? (options.length ? "Select a ministry" : "No other ministries available") : loadError ? "Ministries unavailable" : "Loading ministries…"}</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <select className="fo-select" value={f.role} onChange={set("role")}>
              {["Member", "Volunteer", "Coordinator", "Assistant Leader", "Leader"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date" error={errors.startDate}>
            <input type="date" className="fo-input" value={f.startDate} onChange={set("startDate")} />
          </Field>
          <Field label="Reports to (leader)" hint="Optional" full>
            <select className="fo-select" value={f.leaderMembershipId} onChange={set("leaderMembershipId")}>
              <option value="">No specific leader</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.profile?.displayName ?? "Member"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsibilities" full>
            <textarea className="fo-textarea" rows={3} value={f.responsibilities} onChange={set("responsibilities")} maxLength={1000} />
          </Field>
        </div>
        {f.role === "Leader" && <p className="mpf-muted">Choosing “Leader” also lists this member among the ministry’s leaders.</p>}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- upload document */

const MAX_UPLOAD = 20 * 1024 * 1024;
const ACCEPT = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function UploadDocumentDialog(ctx: DialogCtx & { category?: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ category: ctx.category ?? "other", title: "", issuedAt: "", expiresAt: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, error, run } = useSubmit(ctx);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!file) errs.file = "Choose a file.";
    else if (!ACCEPT.includes(file.type)) errs.file = "Use a PDF, JPG, PNG or WebP file.";
    else if (file.size > MAX_UPLOAD) errs.file = "Files can be up to 20 MB.";
    if (!f.title.trim()) errs.title = "Give the document a title.";
    if (f.issuedAt && f.expiresAt && f.expiresAt < f.issuedAt) errs.expiresAt = "Expiry must be after the issue date.";
    setErrors(errs);
    if (Object.keys(errs).length || !file) return;
    void run(async () => ({
      view: await memberProfileApi.uploadDocument(ctx.orgId, ctx.memberId, file, {
        category: f.category,
        title: f.title.trim(),
        issuedAt: f.issuedAt || undefined,
        expiresAt: f.expiresAt || undefined,
      }),
      message: "Document uploaded.",
    }));
  };

  return (
    <Modal title="Upload document" onClose={ctx.onClose} busy={busy} footer={<Footer busy={busy} onClose={ctx.onClose} label={busy ? "Uploading…" : "Upload"} form="mpf-upload" />}>
      <form id="mpf-upload" className="mpf-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <div className="mpf-grid2">
          <Field label="File" required error={errors.file} hint="PDF, JPG, PNG or WebP · up to 20 MB" full>
            <input
              type="file"
              className="fo-input"
              accept={ACCEPT.join(",")}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                if (next && !f.title) setF((s) => ({ ...s, title: next.name.replace(/\.[^.]+$/, "").slice(0, 120) }));
              }}
            />
          </Field>
          <Field label="Category">
            <select className="fo-select" value={f.category} onChange={set("category")}>
              {DOC_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" required error={errors.title}>
            <input className="fo-input" value={f.title} onChange={set("title")} maxLength={120} />
          </Field>
          <Field label="Issued on">
            <input type="date" className="fo-input" value={f.issuedAt} onChange={set("issuedAt")} />
          </Field>
          <Field label="Expires on" error={errors.expiresAt}>
            <input type="date" className="fo-input" value={f.expiresAt} onChange={set("expiresAt")} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- notes & history */

export function AddNoteDialog(ctx: DialogCtx) {
  const [f, setF] = useState({ category: NOTE_CATEGORIES[0], visibility: "admin" as "admin" | "pastoral", body: "" });
  const [fieldError, setFieldError] = useState("");
  const { busy, error, run } = useSubmit(ctx);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (f.body.trim().length < 2) return setFieldError("Write the note first.");
    setFieldError("");
    void run(async () => ({ view: await memberProfileApi.addNote(ctx.orgId, ctx.memberId, { ...f, body: f.body.trim() }), message: "Note added." }));
  };
  return (
    <Modal title="Add note" onClose={ctx.onClose} busy={busy} footer={<Footer busy={busy} onClose={ctx.onClose} label="Add note" form="mpf-note" />}>
      <form id="mpf-note" className="mpf-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <div className="mpf-grid2">
          <Field label="Category">
            <select className="fo-select" value={f.category} onChange={(e) => setF((s) => ({ ...s, category: e.target.value }))}>
              {NOTE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Visibility">
            <select className="fo-select" value={f.visibility} onChange={(e) => setF((s) => ({ ...s, visibility: e.target.value as "admin" | "pastoral" }))}>
              <option value="admin">Administrators</option>
              {ctx.view.access.canViewPastoral && <option value="pastoral">Pastoral only (private)</option>}
            </select>
          </Field>
          <Field label="Note" required error={fieldError} full>
            <textarea className="fo-textarea" rows={5} value={f.body} onChange={(e) => setF((s) => ({ ...s, body: e.target.value }))} maxLength={5000} />
          </Field>
        </div>
        <p className="mpf-muted">Notes are never shown to the member. Pastoral notes are visible only to the owner, administrators and pastors.</p>
      </form>
    </Modal>
  );
}

export function AddHistoryDialog(ctx: DialogCtx & { kind?: "milestone" | "record" }) {
  const [f, setF] = useState({ kind: ctx.kind ?? "milestone", type: HISTORY_TYPES[0].value, title: "", description: "", date: today() });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, error, run } = useSubmit(ctx);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.title.trim()) errs.title = "Add a title.";
    if (!DATE_RE.test(f.date)) errs.date = "Choose a date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    void run(async () => ({
      view: await memberProfileApi.addHistory(ctx.orgId, ctx.memberId, {
        kind: f.kind as "milestone" | "record",
        type: f.type,
        title: f.title.trim(),
        description: f.description.trim(),
        date: f.date,
      }),
      message: "History entry added.",
    }));
  };
  return (
    <Modal title="Add history entry" onClose={ctx.onClose} busy={busy} footer={<Footer busy={busy} onClose={ctx.onClose} label="Add" form="mpf-history" />}>
      <form id="mpf-history" className="mpf-form" onSubmit={submit} noValidate>
        <FormError error={error} />
        <div className="mpf-grid2">
          <Field label="Kind">
            <select className="fo-select" value={f.kind} onChange={set("kind")}>
              <option value="milestone">Milestone</option>
              <option value="record">Record</option>
            </select>
          </Field>
          <Field label="Type">
            <select className="fo-select" value={f.type} onChange={set("type")}>
              {HISTORY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" required error={errors.title} full>
            <input className="fo-input" value={f.title} onChange={set("title")} maxLength={120} />
          </Field>
          <Field label="Date" required error={errors.date}>
            <input type="date" className="fo-input" value={f.date} onChange={set("date")} />
          </Field>
          <Field label="Description" full>
            <textarea className="fo-textarea" rows={3} value={f.description} onChange={set("description")} maxLength={1000} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- status */

export function StatusDialog(ctx: DialogCtx) {
  const [status, setStatus] = useState(ctx.view.member.status);
  const { busy, error, run } = useSubmit(ctx);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (status === ctx.view.member.status) return ctx.onClose();
    void run(async () => {
      await membersApi.updateMembershipStatus(ctx.orgId, ctx.memberId, status as MembershipStatus);
      return { view: null, message: `Status changed to ${STATUS_LABEL[status] ?? status}.` };
    });
  };
  return (
    <Modal title="Change member status" onClose={ctx.onClose} busy={busy} footer={<Footer busy={busy} onClose={ctx.onClose} label="Change status" form="mpf-status" />}>
      <form id="mpf-status" className="mpf-form" onSubmit={submit}>
        <FormError error={error} />
        <div className="mpf-radio-list" role="radiogroup" aria-label="Status">
          {[
            [MembershipStatus.Active, "Full access to the member portal."],
            [MembershipStatus.Inactive, "Keeps the record; the member loses access until reactivated."],
            [MembershipStatus.Archived, "Moves the member out of active lists."],
          ].map(([value, text]) => (
            <label key={value} className={`mpf-radio ${status === value ? "is-on" : ""}`}>
              <input type="radio" name="status" value={value} checked={status === value} onChange={() => setStatus(value)} />
              <span>
                <strong>{STATUS_LABEL[value]}</strong>
                <small>{text}</small>
              </span>
            </label>
          ))}
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------- certificates */

export function CertificateDialog(ctx: DialogCtx & { onPrint: (docId: string) => void }) {
  const { view } = ctx;
  const existing = (kind: string) => (view.documents ?? []).find((d) => d.generated && d.category === `${kind}_certificate`);
  const kinds: { value: "membership" | "baptism" | "confirmation"; label: string; ready: boolean; reason?: string }[] = [
    { value: "membership", label: "Membership Certificate", ready: view.member.status === "active", reason: "Member must be active." },
    { value: "baptism", label: "Baptism Certificate", ready: view.details.baptism?.status === "completed", reason: "Record a completed baptism first." },
    { value: "confirmation", label: "Confirmation Certificate", ready: view.details.confirmation?.status === "completed", reason: "Record a completed confirmation first." },
  ];
  const [kind, setKind] = useState(kinds.find((k) => k.ready)?.value ?? "membership");
  const current = kinds.find((k) => k.value === kind)!;
  const prior = existing(kind);
  const { busy, error, run } = useSubmit(ctx);

  const issue = (reissue: boolean) =>
    run(async () => {
      const next = await memberProfileApi.issueCertificate(ctx.orgId, ctx.memberId, kind, reissue);
      const doc = (next.documents ?? []).filter((d) => d.generated && d.category === `${kind}_certificate`).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (doc) window.setTimeout(() => ctx.onPrint(doc.id), 50);
      return { view: next, message: `${current.label} ${reissue ? "reissued" : "generated"}.` };
    });

  return (
    <Modal
      title="Generate certificate"
      onClose={ctx.onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="fo-btn fo-btn--secondary" onClick={ctx.onClose} disabled={busy}>
            Cancel
          </button>
          {prior && (
            <button type="button" className="fo-btn fo-btn--secondary" disabled={busy} onClick={() => ctx.onPrint(prior.id)}>
              Print existing
            </button>
          )}
          <button type="button" className="fo-btn fo-btn--primary" disabled={busy || !current.ready} onClick={() => void issue(Boolean(prior))}>
            {busy ? "Generating…" : prior ? "Reissue" : "Generate"}
          </button>
        </>
      }
    >
      <div className="mpf-form">
        <FormError error={error} />
        <div className="mpf-radio-list" role="radiogroup" aria-label="Certificate">
          {kinds.map((k) => (
            <label key={k.value} className={`mpf-radio ${kind === k.value ? "is-on" : ""} ${k.ready ? "" : "is-disabled"}`}>
              <input type="radio" name="cert" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} />
              <span>
                <strong>{k.label}</strong>
                <small>{k.ready ? (existing(k.value) ? `Issued · ${existing(k.value)?.serial ?? ""}` : "Ready to generate") : k.reason}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="mpf-muted">Certificates get a unique serial number and are saved to this member’s documents.</p>
      </div>
    </Modal>
  );
}
