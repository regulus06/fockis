import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, DashShell, Stat, type SideItem } from "../../../components/academy/market/Shared";
import CredentialsSheet from "../../../components/academy/institutions/CredentialsSheet";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademySession } from "../../../lib/academySession";
import { mediaUrl, uploadStudioFile } from "../../../lib/studioApi";
import { publicSiteUrl } from "../../../lib/siteUrl";
import {
  INSTITUTION_TYPE_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  parseStudentList,
  schoolsApi,
  type Credentials,
  type InstitutionDetails,
  type SchoolStudent,
  type SchoolTeacher,
  type TeacherInput,
  type StaffInstitution,
  type StudentApplication,
  domainPeriodText,
} from "../../../lib/institutionsApi";
import { formatPrice } from "../../../lib/studioApi";
import { SignInGate } from "../AcademyPortal";
import { SchoolForm } from "./RegisterSchool";

type Tab = "overview" | "teachers" | "students" | "applications" | "staff" | "profile";

const nav = (id?: string): SideItem[] => [
  { label: "My schools", icon: "building", to: "/academy/school" },
  ...(id
    ? [
        { label: "Overview", icon: "grid", to: `/academy/school/${id}` },
        { label: "Teachers", icon: "cap", to: `/academy/school/${id}?tab=teachers` },
        { label: "Students", icon: "users", to: `/academy/school/${id}?tab=students` },
        { label: "Applications", icon: "inbox", to: `/academy/school/${id}?tab=applications` },
        { label: "Staff", icon: "user", to: `/academy/school/${id}?tab=staff` },
        { label: "School profile", icon: "pen", to: `/academy/school/${id}?tab=profile` },
      ]
    : []),
  { label: "Creator Studio", icon: "layers", to: "/academy/studio" },
  { label: "Academy home", icon: "home", to: "/academy" },
];
const ACTIVE: Record<Tab, string> = { overview: "Overview", teachers: "Teachers", students: "Students", applications: "Applications", staff: "Staff", profile: "School profile" };
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");

/** /academy/school — the schools I own or work for. */
export function MySchools() {
  const session = useAcademySession();
  const list = useAcademyLoad(() => (session.status === "user" ? schoolsApi.mine() : Promise.resolve([] as StaffInstitution[])), [session.status]);
  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="My school" />;
  if (list.state.status === "ready" && list.state.data.length === 1) return <Navigate to={`/academy/school/${list.state.data[0]._id}`} replace />;
  const items = list.state.status === "ready" ? list.state.data : [];
  return (
    <div className="fa-root">
      <DashShell items={nav()} active="My schools" sub="School">
        <div className="fa-dhead">
          <div>
            <h2>My schools</h2>
            <p>Schools, universities and organizations you manage on Fockis Academy.</p>
          </div>
          <Link className="fa-btn fa-btn--primary" to="/academy/schools/register">
            <Icon name="plus" size={15} /> Register a school
          </Link>
        </div>
        {list.state.status === "loading" && <p className="fa-muted">Loading…</p>}
        {list.state.status === "error" && <p className="fa-error">{list.state.error}</p>}
        {list.state.status === "ready" && items.length === 0 && (
          <div className="fa-card fa-st-empty">
            <span className="fa-st-empty__ic">
              <Icon name="building" size={28} />
            </span>
            <h3>No school yet</h3>
            <p className="fa-muted">Register your school, university, training center or business. Once Fockis approves it you can create student logins and publish classes for your students.</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/schools/register">
              Register your school
            </Link>
          </div>
        )}
        <div className="fa-st-grid">
          {items.map((s) => (
            <Link key={s._id} to={`/academy/school/${s._id}`} className="fa-card fa-sch-card">
              <span className="fa-sch-logo">{s.logoUrl ? <img src={mediaUrl(s.logoUrl)} alt="" /> : <Icon name="building" size={22} />}</span>
              <div>
                <b>{s.name}</b>
                <small>{s.domain}</small>
                <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </DashShell>
    </div>
  );
}

/** /academy/school/:id — manage one school. */
export default function SchoolDashboard() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const session = useAcademySession();
  const school = useAcademyLoad(() => (session.status === "user" ? schoolsApi.get(id) : Promise.reject(new Error("guest"))), [id, session.status]);
  const [creds, setCreds] = useState<{ items: Credentials[]; failed?: { name: string; error: string }[] } | null>(null);

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="My school" />;

  const s = school.state.status === "ready" ? school.state.data : null;

  return (
    <div className="fa-root">
      <DashShell items={nav(id)} active={ACTIVE[tab] ?? "Overview"} sub={s?.name ?? "School"}>
        {school.state.status === "loading" && <p className="fa-muted">Loading…</p>}
        {school.state.status === "error" && (
          <div className="fa-card fa-pad">
            <p className="fa-error">{school.state.error}</p>
            <Link className="fa-btn fa-btn--outline" to="/academy/school">
              Back
            </Link>
          </div>
        )}
        {s && (
          <>
            <div className="fa-sch-head">
              <span className="fa-sch-logo fa-sch-logo--lg">{s.logoUrl ? <img src={mediaUrl(s.logoUrl)} alt="" /> : <Icon name="building" size={26} />}</span>
              <div>
                <h2>
                  {s.name} {s.status === "approved" && <Icon name="verified" size={18} className="fa-sch-verified" />}
                </h2>
                <div className="fa-st-head__meta">
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                  <span>{INSTITUTION_TYPE_LABEL[s.type]}</span>
                  <span>·</span>
                  <code>{s.domain}</code>
                  {s.domainBilling?.state === "active" && s.domainBilling.paidUntil && (
                    <>
                      <span>·</span>
                      <span>Domain paid until {fmt(s.domainBilling.paidUntil)}</span>
                    </>
                  )}
                </div>
              </div>
              {s.status === "approved" && (
                <Link className="fa-btn fa-btn--outline fa-btn--sm" to={`/academy/schools/${s.slug}`} target="_blank">
                  <Icon name="expand" size={13} /> Public page
                </Link>
              )}
            </div>
            <StatusBanner s={s} onChanged={school.reload} />
            <DomainBanner s={s} />
            {tab === "overview" && <Overview s={s} />}
            {tab === "teachers" && <Teachers s={s} onChanged={(n) => school.setData(() => n)} />}
            {tab === "students" && <Students s={s} onCreds={setCreds} />}
            {tab === "applications" && <Applications s={s} onCreds={setCreds} onChanged={school.reload} />}
            {tab === "staff" && <Staff s={s} onChanged={(n) => school.setData(() => n)} />}
            {tab === "profile" && <Profile s={s} onSaved={(n) => school.setData(() => n)} />}
          </>
        )}
        {creds && s && <CredentialsSheet school={s.name} items={creds.items} failed={creds.failed} onClose={() => setCreds(null)} />}
      </DashShell>
    </div>
  );
}

function StatusBanner({ s, onChanged }: { s: StaffInstitution; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  if (s.status === "approved") return null;
  const map = {
    pending: { tone: "is-pending", icon: "clock", title: "Waiting for Fockis Academy review", text: "We check every school before it goes live. You can still edit your profile. Student logins and school classes open once you are approved." },
    rejected: { tone: "is-bad", icon: "help", title: "Registration rejected", text: s.statusReason ? `Reason: ${s.statusReason}` : "Update your details and send it again." },
    blocked: { tone: "is-bad", icon: "lock", title: "This school is blocked", text: `${s.statusReason ? `Reason: ${s.statusReason}. ` : ""}Its classes are hidden and its students can't sign in. Contact Fockis Academy support.` },
  } as const;
  const b = map[s.status];
  return (
    <div className={`fa-sch-banner ${b.tone}`}>
      <Icon name={b.icon} size={20} />
      <div>
        <b>{b.title}</b>
        <p>{b.text}</p>
      </div>
      {s.status === "rejected" && (
        <button
          className="fa-btn fa-btn--primary fa-btn--sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await schoolsApi.resubmit(s._id);
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          Send again for review
        </button>
      )}
    </div>
  );
}

/** Fockis domain fee: pay after approval, renew before the end of each period. */
function DomainBanner({ s }: { s: StaffInstitution }) {
  const b = s.domainBilling;
  if (s.status !== "approved" || !b) return null;
  const show = b.state === "unpaid" || b.state === "expired" || b.state === "grace" || (b.state === "active" && b.renewSoon);
  if (!show) return null;
  const canPay = s.myRole === "owner" || s.myRole === "admin" || s.myRole === "fockis-admin";
  const price = `${formatPrice(false, b.price, b.currency)} ${domainPeriodText(b.periodMonths)}`;
  const copy = {
    unpaid: { tone: "is-pending", icon: "wallet", title: "Approved — pay to switch on your domain", text: `${s.domain} costs ${price}. Once paid, you can add students and publish school classes.`, btn: "Pay now" },
    grace: { tone: "is-pending", icon: "clock", title: "Your domain payment is due", text: `Pay ${price} before ${fmt(b.graceEndsAt ?? undefined)} to keep ${s.domain} running.`, btn: "Pay now" },
    expired: { tone: "is-bad", icon: "lock", title: "Your domain is paused", text: `Your classes are hidden and you can't add students or classes. Renew ${s.domain} (${price}) to switch everything back on. Students who already joined keep their classes.`, btn: "Renew now" },
    active: { tone: "is-pending", icon: "calendar", title: "Renew your domain soon", text: `${s.domain} is paid until ${fmt(b.paidUntil ?? undefined)}. Renewing adds another period after that date (${price}).`, btn: "Renew" },
  } as const;
  const c = copy[b.state as keyof typeof copy];
  return (
    <div className={`fa-sch-banner ${c.tone}`}>
      <Icon name={c.icon} size={20} />
      <div>
        <b>{c.title}</b>
        <p>{c.text}</p>
        {b.note && <p className="fa-sch-banner__note">{b.note}</p>}
        {!canPay && <p>Only the school&apos;s owner or admins can pay.</p>}
      </div>
      {canPay && b.canPay && (
        <Link className="fa-btn fa-btn--primary fa-btn--sm" to={`/academy/school/${s._id}/pay`}>
          {c.btn}
        </Link>
      )}
    </div>
  );
}

function Overview({ s }: { s: StaffInstitution }) {
  // Paused domain (unpaid / expired) works like "not approved" for these shortcuts.
  const approved = s.status === "approved" && s.domainBilling?.active !== false;
  return (
    <>
      <div className="fa-stats fa-stats--4">
        <Stat icon="users" value={String(s.counts.students)} label="Student logins" tone="blue" />
        <Stat icon="inbox" value={String(s.counts.pendingApplications)} label="Applications waiting" tone="amber" />
        <Stat icon="layers" value={String(s.counts.classes)} label="School classes" tone="purple" />
        <Stat icon="cap" value={String(s.teachers?.length ?? 0)} label="Teachers" tone="green" />
      </div>
      <div className="fa-sch-actions">
        {[
          { to: `?tab=students`, icon: "plus", t: "Add students", d: `Create logins like name@${s.domain} with a temporary password.` },
          { to: `?tab=applications`, icon: "inbox", t: "Review applications", d: "Approve students who applied from your school page." },
          { to: `/academy/studio/new`, icon: "layers", t: "Create a class", d: "In Creator Studio, choose your school under “Offered by”." },
          { to: `?tab=teachers`, icon: "cap", t: "Add teachers", d: "List your teachers, then pick who teaches each class." },
        ].map((a) => (
          <Link key={a.t} to={a.to} className={`fa-card fa-sch-action ${!approved && a.icon !== "cap" ? "is-off" : ""}`}>
            <span className="fa-stat__ic tone-blue">
              <Icon name={a.icon} size={18} />
            </span>
            <b>{a.t}</b>
            <small>{a.d}</small>
          </Link>
        ))}
      </div>
      {(s.domainPayments?.length ?? 0) > 0 && (
        <div className="fa-card fa-pad">
          <h4 className="fa-st-h4">Domain payments</h4>
          <ul className="fa-sch-history">
            {s.domainPayments!.map((p, i) => (
              <li key={i}>
                <b>{p.amount !== undefined ? formatPrice(false, p.amount, p.currency) : "Payment"}</b> {fmt(p.at)}
                {p.to ? ` · covers until ${fmt(p.to)}` : p.method === "stripe" ? " · lifetime" : ""}
                {p.method === "manual" ? " · recorded by Fockis" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {s.history?.length > 0 && (
        <div className="fa-card fa-pad">
          <h4 className="fa-st-h4">History</h4>
          <ul className="fa-sch-history">
            {[...s.history].reverse().map((h, i) => (
              <li key={i}>
                <b>{h.action[0].toUpperCase() + h.action.slice(1)}</b> {fmt(h.at)}
                {h.byName ? ` · ${h.byName}` : ""}
                {h.reason ? ` — ${h.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

const EMPTY_TEACHER: TeacherInput = { name: "", title: "", department: "", bio: "", photoUrl: "", email: "", contactEnabled: false, contactEmail: "", contactPhone: "", officeHours: "", meetingUrl: "" };

function Teachers({ s, onChanged }: { s: StaffInstitution; onChanged: (n: StaffInstitution) => void }) {
  const [editing, setEditing] = useState<{ key?: string; v: TeacherInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const canEdit = s.myRole === "owner" || s.myRole === "admin" || s.myRole === "fockis-admin";
  const list = s.teachers ?? [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (editing.v.name.trim().length < 2) return setErr("Enter the teacher's name.");
    setBusy(true);
    setErr(null);
    try {
      const clean = (x?: string) => x?.trim() || undefined;
      const body = {
        ...editing.v,
        email: clean(editing.v.email),
        contactEmail: clean(editing.v.contactEmail),
        contactPhone: clean(editing.v.contactPhone),
        officeHours: clean(editing.v.officeHours),
        meetingUrl: clean(editing.v.meetingUrl),
      };
      onChanged(editing.key ? await schoolsApi.updateTeacher(s._id, editing.key, body) : await schoolsApi.addTeacher(s._id, body));
      setEditing(null);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(t: SchoolTeacher) {
    const n = t.classes.length;
    if (!window.confirm(`Remove ${t.name}?${n ? ` ${n} class${n === 1 ? "" : "es"} will no longer show a teacher.` : ""}`)) return;
    try {
      onChanged(await schoolsApi.removeTeacher(s._id, t.key));
    } catch (e2) {
      window.alert(e2 instanceof Error ? e2.message : "Could not remove.");
    }
  }

  async function photo(file?: File) {
    if (!file || !editing) return;
    setPct(0);
    try {
      const r = await uploadStudioFile(file, "image", setPct);
      setEditing({ ...editing, v: { ...editing.v, photoUrl: r.url } });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Upload failed.");
    } finally {
      setPct(null);
    }
  }

  return (
    <div className="fa-sch-students">
      <div className="fa-card fa-pad">
        <div className="fa-cardhead">
          <h4>Teachers ({list.length})</h4>
          {canEdit && !editing && (
            <button className="fa-btn fa-btn--primary fa-btn--sm" onClick={() => setEditing({ v: { ...EMPTY_TEACHER } })}>
              <Icon name="plus" size={13} /> Add teacher
            </button>
          )}
        </div>
        <p className="fa-muted fa-sch-hint">
          Each class (subject) shows its teacher. One teacher can teach several classes — pick the teacher in Creator Studio, under “Offered by”.
        </p>

        {editing && (
          <form className="fa-teach-form" onSubmit={save}>
            <div className="fa-teach-form__photo">
              <span className="fa-sch-logo fa-sch-logo--lg">{editing.v.photoUrl ? <img src={mediaUrl(editing.v.photoUrl)} alt="" /> : <Icon name="user" size={24} />}</span>
              <label className="fa-link">
                {editing.v.photoUrl ? "Change photo" : "Add photo"}
                <input type="file" hidden accept="image/*" onChange={(e) => photo(e.target.files?.[0])} />
              </label>
              {pct !== null && <small>{pct}%</small>}
            </div>
            <div className="fa-fields">
              <div className="fa-row2">
                <label className="fa-field">
                  <span>
                    Name<i>*</i>
                  </span>
                  <input value={editing.v.name} maxLength={120} placeholder="e.g. Prof. John Smith" onChange={(e) => setEditing({ ...editing, v: { ...editing.v, name: e.target.value } })} autoFocus />
                </label>
                <label className="fa-field">
                  <span>Title</span>
                  <input value={editing.v.title ?? ""} maxLength={120} placeholder="e.g. Head Pastry Chef, Professor" onChange={(e) => setEditing({ ...editing, v: { ...editing.v, title: e.target.value } })} />
                </label>
              </div>
              <div className="fa-row2">
                <label className="fa-field">
                  <span>Department / subjects</span>
                  <input value={editing.v.department ?? ""} maxLength={120} placeholder="e.g. Mathematics, Breads" onChange={(e) => setEditing({ ...editing, v: { ...editing.v, department: e.target.value } })} />
                </label>
                <label className="fa-field">
                  <span>Email (only staff see it)</span>
                  <input type="email" value={editing.v.email ?? ""} onChange={(e) => setEditing({ ...editing, v: { ...editing.v, email: e.target.value } })} />
                </label>
              </div>
              <label className="fa-field">
                <span>Short bio (shown on class pages)</span>
                <textarea rows={3} maxLength={2000} value={editing.v.bio ?? ""} onChange={(e) => setEditing({ ...editing, v: { ...editing.v, bio: e.target.value } })} />
              </label>
              <div className="fa-teach-contact">
                <label className="fa-check fa-check--lg">
                  <input type="checkbox" checked={!!editing.v.contactEnabled} onChange={(e) => setEditing({ ...editing, v: { ...editing.v, contactEnabled: e.target.checked } })} />
                  <span>
                    <b>Students can contact this teacher</b>
                    <small>Only students enrolled in this teacher&apos;s classes see the details below. Turn it off any time to hide them.</small>
                  </span>
                </label>
                {editing.v.contactEnabled && (
                  <>
                    <div className="fa-row2">
                      <label className="fa-field">
                        <span>Contact email for students</span>
                        <input type="email" value={editing.v.contactEmail ?? ""} onChange={(e) => setEditing({ ...editing, v: { ...editing.v, contactEmail: e.target.value } })} />
                      </label>
                      <label className="fa-field">
                        <span>Phone (optional)</span>
                        <input value={editing.v.contactPhone ?? ""} maxLength={40} onChange={(e) => setEditing({ ...editing, v: { ...editing.v, contactPhone: e.target.value } })} />
                      </label>
                    </div>
                    <div className="fa-row2">
                      <label className="fa-field">
                        <span>Office hours</span>
                        <input value={editing.v.officeHours ?? ""} maxLength={200} placeholder="e.g. Tuesdays 3–5 pm" onChange={(e) => setEditing({ ...editing, v: { ...editing.v, officeHours: e.target.value } })} />
                      </label>
                      <label className="fa-field">
                        <span>Fockis Meetings link</span>
                        <input value={editing.v.meetingUrl ?? ""} placeholder={`${window.location.origin}/meet/…`} onChange={(e) => setEditing({ ...editing, v: { ...editing.v, meetingUrl: e.target.value } })} />
                      </label>
                    </div>
                    <small className="fa-muted">
                      For virtual sessions, office hours or student presentations. Create the room in{" "}
                      <a href="/meetings" target="_blank" rel="noreferrer">
                        Fockis Meetings
                      </a>{" "}
                      and paste its link.
                    </small>
                  </>
                )}
              </div>
              {err && <p className="fa-error">{err}</p>}
              <div className="fa-st-new__foot">
                <button type="button" className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="fa-btn fa-btn--primary fa-btn--sm" disabled={busy}>
                  {busy ? "Saving…" : editing.key ? "Save teacher" : "Add teacher"}
                </button>
              </div>
            </div>
          </form>
        )}

        {list.length === 0 && !editing && <p className="fa-muted">No teachers yet.</p>}
        <div className="fa-teach-grid">
          {list.map((t) => (
            <div key={t.key} className="fa-teach-card">
              <span className="fa-sch-logo fa-sch-logo--lg">{t.photoUrl ? <img src={mediaUrl(t.photoUrl)} alt="" /> : <Icon name="user" size={22} />}</span>
              <div className="fa-teach-card__body">
                <b>{t.name}</b>
                {(t.title || t.department) && <small className="fa-muted">{[t.title, t.department].filter(Boolean).join(" · ")}</small>}
                <span className={`fa-teach-flag ${t.contactEnabled ? "is-on" : ""}`}>
                  <Icon name={t.contactEnabled ? "message" : "lock"} size={11} /> {t.contactEnabled ? "Students can contact" : "Contact off"}
                  {t.contactEnabled && t.meetingUrl ? " · meeting room" : ""}
                </span>
                <div className="fa-teach-card__classes">
                  {t.classes.length === 0 ? (
                    <small className="fa-muted">No class yet</small>
                  ) : (
                    t.classes.map((c) => (
                      <Link key={c.code} to={`/academy/studio/${encodeURIComponent(c.code)}`} className="fa-teach-chip">
                        {c.name}
                      </Link>
                    ))
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="fa-teach-card__btns">
                  <button className="fa-link" onClick={() => setEditing({ key: t.key, v: { name: t.name, title: t.title ?? "", department: t.department ?? "", bio: t.bio ?? "", photoUrl: t.photoUrl ?? "", email: t.email ?? "", contactEnabled: !!t.contactEnabled, contactEmail: t.contactEmail ?? "", contactPhone: t.contactPhone ?? "", officeHours: t.officeHours ?? "", meetingUrl: t.meetingUrl ?? "" } })}>
                    Edit
                  </button>
                  <button className="fa-link fa-link--danger" onClick={() => remove(t)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Students({ s, onCreds }: { s: StaffInstitution; onCreds: (c: { items: Credentials[]; failed?: { name: string; error: string }[] }) => void }) {
  const list = useAcademyLoad(() => schoolsApi.students(s._id), [s._id]);
  const [mode, setMode] = useState<"one" | "many">("one");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const approved = s.status === "approved";
  const parsed = useMemo(() => parseStudentList(bulk), [bulk]);

  async function addOne(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Enter the student's full name.");
    setBusy(true);
    setErr(null);
    try {
      const c = await schoolsApi.addStudent(s._id, { name: name.trim(), personalEmail: email.trim() || undefined, username: username.trim() || undefined });
      onCreds({ items: [c] });
      setName("");
      setEmail("");
      setUsername("");
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not create the login.");
    } finally {
      setBusy(false);
    }
  }

  async function addMany() {
    if (!parsed.length) return setErr("Paste one student per line: name, then email (optional).");
    setBusy(true);
    setErr(null);
    try {
      const r = await schoolsApi.addStudents(s._id, parsed);
      onCreds({ items: r.created, failed: r.failed });
      setBulk("");
      list.reload();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not create the logins.");
    } finally {
      setBusy(false);
    }
  }

  async function act(st: SchoolStudent, what: "reset" | "suspend" | "restore") {
    try {
      if (what === "reset") {
        if (!window.confirm(`Give ${st.name} a new temporary password? Their current password stops working.`)) return;
        onCreds({ items: [await schoolsApi.resetPassword(s._id, st.userId)] });
      } else if (what === "suspend") {
        const reason = window.prompt(`Suspend ${st.name}? They won't be able to sign in. Reason (optional):`, "");
        if (reason === null) return;
        await schoolsApi.suspend(s._id, st.userId, reason || undefined);
      } else await schoolsApi.restore(s._id, st.userId);
      list.reload();
    } catch (e2) {
      window.alert(e2 instanceof Error ? e2.message : "Action failed.");
    }
  }

  const rows = (list.state.status === "ready" ? list.state.data : []).filter((x) => `${x.name} ${x.loginId} ${x.personalEmail ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fa-sch-students">
      <div className="fa-card fa-pad">
        <div className="fa-cardhead">
          <h4>Add students</h4>
          <div className="fa-seg fa-seg--sm">
            <button className={mode === "one" ? "is-on" : ""} onClick={() => setMode("one")}>
              One student
            </button>
            <button className={mode === "many" ? "is-on" : ""} onClick={() => setMode("many")}>
              Paste a list
            </button>
          </div>
        </div>
        {!approved && <p className="fa-note">Student logins can be created once Fockis Academy approves your school.</p>}
        {mode === "one" ? (
          <form className="fa-sch-addone" onSubmit={addOne}>
            <label className="fa-field">
              <span>
                Full name<i>*</i>
              </span>
              <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} disabled={!approved} />
            </label>
            <label className="fa-field">
              <span>Student&apos;s own email (optional)</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!approved} />
            </label>
            <label className="fa-field">
              <span>Username (optional)</span>
              <div className="fa-domain">
                <input value={username} maxLength={30} placeholder="auto" onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} disabled={!approved} />
                <span>@{s.domain}</span>
              </div>
            </label>
            <button className="fa-btn fa-btn--primary" disabled={!approved || busy}>
              {busy ? "Creating…" : "Create login"}
            </button>
          </form>
        ) : (
          <div className="fa-sch-bulk">
            <textarea rows={6} value={bulk} disabled={!approved} placeholder={"Amara Johnson, amara@mail.com\nDavid Miller\nLinda Carter, linda.c@mail.com"} onChange={(e) => setBulk(e.target.value)} />
            <div className="fa-sch-bulk__foot">
              <small className="fa-muted">
                One student per line — name, then their own email if you have it. {parsed.length > 0 && <b>{parsed.length} ready</b>}
              </small>
              <button className="fa-btn fa-btn--primary fa-btn--sm" disabled={!approved || busy || !parsed.length} onClick={addMany}>
                {busy ? "Creating…" : `Create ${parsed.length || ""} logins`}
              </button>
            </div>
          </div>
        )}
        {err && <p className="fa-error">{err}</p>}
      </div>

      <div className="fa-card fa-pad">
        <div className="fa-cardhead">
          <h4>Students ({list.state.status === "ready" ? list.state.data.length : "…"})</h4>
          <label className="fa-search">
            <Icon name="search" size={14} />
            <input value={q} placeholder="Search students" onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <SignInHelp />
        {list.state.status === "error" && <p className="fa-error">{list.state.error}</p>}
        {list.state.status === "ready" && rows.length === 0 && <p className="fa-muted">{q ? "No student matches." : "No student logins yet."}</p>}
        {rows.length > 0 && (
          <div className="fa-tablewrap">
            <table className="fa-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Login</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.userId}>
                    <td>
                      <b>{x.name}</b>
                      {x.personalEmail && (
                        <>
                          <br />
                          <small className="fa-muted">{x.personalEmail}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <span className="fa-sch-login">
                        <code>{x.loginId}</code>
                        <CopyButton text={x.loginId} label={`Copy ${x.loginId}`} />
                      </span>
                    </td>
                    <td>
                      {!x.active ? (
                        <Badge tone="red">Suspended</Badge>
                      ) : x.mustChangePassword ? (
                        <Badge tone="amber">Not signed in yet</Badge>
                      ) : (
                        <Badge tone="green">Active</Badge>
                      )}
                    </td>
                    <td>{fmt(x.lastLogin)}</td>
                    <td className="fa-sch-rowbtns">
                      <button className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => act(x, "reset")} disabled={!approved}>
                        New password
                      </button>
                      {x.active ? (
                        <button className="fa-link fa-link--danger" onClick={() => act(x, "suspend")}>
                          Suspend
                        </button>
                      ) : (
                        <button className="fa-link" onClick={() => act(x, "restore")}>
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Where students sign in, so staff can tell them (email isn't connected yet). */
function SignInHelp() {
  const url = `${publicSiteUrl()}/academy/login`;
  return (
    <div className="fa-sch-signin">
      <Icon name="lock" size={16} />
      <div>
        <b>How students sign in the first time</b>
        <p>
          Send each student this page, their <b>login</b> (below) and the <b>temporary password</b> you got when you created it. They sign in, then choose
          their own password. Lost the temporary password? Click <b>New password</b> to make another one.
        </p>
        <span className="fa-sch-login">
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
          <CopyButton text={url} label="Copy the sign-in link" />
        </span>
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="fa-icon-btn fa-sch-copy"
      aria-label={label}
      title={done ? "Copied" : label}
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        })
      }
    >
      <Icon name={done ? "check" : "clipboard"} size={13} />
    </button>
  );
}

function Applications({ s, onCreds, onChanged }: { s: StaffInstitution; onCreds: (c: { items: Credentials[] }) => void; onChanged: () => void }) {
  const [status, setStatus] = useState("pending");
  const list = useAcademyLoad(() => schoolsApi.applications(s._id, status), [s._id, status]);
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(a: StudentApplication) {
    setBusy(a._id);
    try {
      onCreds({ items: [await schoolsApi.approveApplication(s._id, a._id)] });
      list.reload();
      onChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setBusy(null);
    }
  }
  async function reject(a: StudentApplication) {
    const reason = window.prompt(`Reject ${a.name}'s application? Reason (optional):`, "");
    if (reason === null) return;
    setBusy(a._id);
    try {
      await schoolsApi.rejectApplication(s._id, a._id, reason || undefined);
      list.reload();
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  const rows: StudentApplication[] = list.state.status === "ready" ? list.state.data : [];
  return (
    <div className="fa-card fa-pad">
      <div className="fa-cardhead">
        <h4>Student applications</h4>
        <div className="fa-seg fa-seg--sm">
          {["pending", "approved", "rejected"].map((x) => (
            <button key={x} className={status === x ? "is-on" : ""} onClick={() => setStatus(x)}>
              {x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {s.status === "approved" && s.allowApplications !== false && (
        <p className="fa-muted fa-sch-hint">
          Students apply at <Link to={`/academy/schools/${s.slug}`}>/academy/schools/{s.slug}</Link>. Approving creates their login.
        </p>
      )}
      {list.state.status === "loading" && <p className="fa-muted">Loading…</p>}
      {list.state.status === "error" && <p className="fa-error">{list.state.error}</p>}
      {list.state.status === "ready" && rows.length === 0 && <p className="fa-muted">No {status} applications.</p>}
      <div className="fa-sch-apps">
        {rows.map((a) => (
          <div key={a._id} className="fa-sch-app">
            <div>
              <b>{a.name}</b>
              <small>
                {a.personalEmail}
                {a.phone ? ` · ${a.phone}` : ""} · applied {fmt(a.createdAt)}
              </small>
              {a.program && <span className="fa-sch-app__prog">{a.program}</span>}
              {a.message && <p>{a.message}</p>}
              {a.reason && <p className="fa-muted">Reason: {a.reason}</p>}
            </div>
            {a.status === "pending" ? (
              <div className="fa-sch-rowbtns">
                <button className="fa-btn fa-btn--primary fa-btn--sm" disabled={busy === a._id || s.status !== "approved"} onClick={() => approve(a)}>
                  <Icon name="check" size={13} /> Approve &amp; create login
                </button>
                <button className="fa-btn fa-btn--outline fa-btn--sm" disabled={busy === a._id} onClick={() => reject(a)}>
                  Reject
                </button>
              </div>
            ) : (
              <Badge tone={a.status === "approved" ? "green" : "red"}>{a.status}</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Staff({ s, onChanged }: { s: StaffInstitution; onChanged: (n: StaffInstitution) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [err, setErr] = useState<string | null>(null);
  const canEdit = s.myRole === "owner" || s.myRole === "admin" || s.myRole === "fockis-admin";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      onChanged(await schoolsApi.addStaff(s._id, email.trim(), role));
      setEmail("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not add.");
    }
  }
  return (
    <div className="fa-card fa-pad">
      <h4 className="fa-st-h4">Staff</h4>
      <div className="fa-tablewrap">
        <table className="fa-table">
          <tbody>
            {s.owner && (
              <tr>
                <td>
                  <b>{s.owner.name}</b>
                  <br />
                  <small className="fa-muted">{s.owner.email}</small>
                </td>
                <td>
                  <Badge tone="purple">Owner</Badge>
                </td>
                <td />
              </tr>
            )}
            {s.staff.map((m) => (
              <tr key={m.userId}>
                <td>
                  <b>{m.name ?? "—"}</b>
                  <br />
                  <small className="fa-muted">{m.email}</small>
                </td>
                <td>
                  <Badge tone={m.role === "admin" ? "blue" : "gray"}>{m.role === "admin" ? "Admin" : "Staff"}</Badge>
                </td>
                <td>
                  {canEdit && (
                    <button className="fa-link fa-link--danger" onClick={async () => window.confirm(`Remove ${m.name ?? m.email}?`) && onChanged(await schoolsApi.removeStaff(s._id, m.userId))}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <form className="fa-sch-addstaff" onSubmit={add}>
          <label className="fa-field">
            <span>Add by their Academy account email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="fa-field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as "staff" | "admin")}>
              <option value="staff">Staff — manage students & applications</option>
              <option value="admin">Admin — also edit the school and its staff</option>
            </select>
          </label>
          <button className="fa-btn fa-btn--primary">Add</button>
        </form>
      )}
      {err && <p className="fa-error">{err}</p>}
    </div>
  );
}

function Profile({ s, onSaved }: { s: StaffInstitution; onSaved: (n: StaffInstitution) => void }) {
  const [v, setV] = useState<InstitutionDetails>(s);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => setV(s), [s]);
  const canEdit = s.myRole === "owner" || s.myRole === "admin" || s.myRole === "fockis-admin";
  return (
    <form
      className="fa-card fa-pad"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
          const { slug, ...rest } = v;
          onSaved(await schoolsApi.update(s._id, s.status === "approved" ? rest : { ...rest, slug }));
          setMsg({ ok: true, t: "Saved." });
        } catch (e2) {
          setMsg({ ok: false, t: e2 instanceof Error ? e2.message : "Could not save." });
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={!canEdit} className="fa-sch-fieldset">
        <SchoolForm value={v} onChange={setV} lockSlug={s.status === "approved"} />
      </fieldset>
      {msg && <p className={msg.ok ? "fa-st-ok" : "fa-error"}>{msg.t}</p>}
      {canEdit && (
        <div className="fa-st-new__foot">
          <button className="fa-btn fa-btn--primary" disabled={busy}>
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      )}
    </form>
  );
}
