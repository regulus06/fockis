import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, DashShell, Stat, type SideItem } from "../../../components/academy/market/Shared";
import { themeFor } from "../../../components/academy/market/FaCourseCard";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademySession } from "../../../lib/academySession";
import { KIND_LABEL, creatorApi, formatPrice, mediaUrl, studioApi, type CreatorAccess, type CreatorProfile, type Kind, type StudioCourse } from "../../../lib/studioApi";
import { SignInGate } from "../AcademyPortal";

export const STUDIO_NAV: SideItem[] = [
  { label: "My classes", icon: "grid", to: "/academy/studio" },
  { label: "Create new", icon: "plus", to: "/academy/studio/new" },
  { label: "Certificates", icon: "award", to: "/academy/instructor/certificates" },
  { label: "My learning", icon: "cap", to: "/academy/portal" },
  { label: "Browse classes", icon: "search", to: "/academy/learn" },
  { label: "Academy home", icon: "home", to: "/academy" },
];

const VIS_TONE = { public: "green", hidden: "blue", private: "purple", draft: "gray", school: "purple" } as const;
const VIS_LABEL = { public: "Published", hidden: "Unlisted", private: "Private", draft: "Draft", school: "School members" } as const;

function revenueText(r?: Record<string, number>) {
  const entries = Object.entries(r ?? {});
  if (!entries.length) return "—";
  return entries.map(([cur, amt]) => formatPrice(false, amt, cur)).join(" · ");
}

/** /academy/studio — everything the signed-in creator offers. */
export default function CreatorStudio() {
  const session = useAcademySession();
  const { state, reload } = useAcademyLoad(() => (session.status === "user" ? studioApi.mine() : Promise.resolve([] as StudioCourse[])), [session.status]);
  const access = useAcademyLoad(() => (session.status === "user" ? creatorApi.access() : Promise.resolve(null)), [session.status]);

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Creator Studio" />;

  const a = access.state.status === "ready" ? access.state.data : null;
  const canCreate = !!a && (a.canTeach || a.schoolIds.length > 0);

  const list = state.status === "ready" ? state.data : [];
  const learners = list.reduce((s, c) => s + (c.learners ?? 0), 0);
  const completed = list.reduce((s, c) => s + (c.completed ?? 0), 0);
  const revenue: Record<string, number> = {};
  list.forEach((c) => Object.entries(c.revenue ?? {}).forEach(([k, v]) => (revenue[k] = (revenue[k] ?? 0) + v)));

  return (
    <div className="fa-root">
      <DashShell items={STUDIO_NAV} active="My classes" sub="Creator Studio">
        <div className="fa-dhead">
          <div>
            <h2>Creator Studio</h2>
            <p>Publish courses, seminars, workshops and live classes — free or paid. Learners get a Fockis certificate when they finish.</p>
          </div>
          {canCreate && (
            <Link className="fa-btn fa-btn--primary" to="/academy/studio/new">
              <Icon name="plus" size={15} /> Create new
            </Link>
          )}
        </div>

        {a && !a.canTeach && <CreatorGate access={a} onChange={() => access.reload()} />}

        <div className="fa-stats fa-stats--4">
          <Stat icon="layers" value={String(list.length)} label="Classes" tone="blue" />
          <Stat icon="users" value={String(learners)} label="Learners" tone="purple" />
          <Stat icon="award" value={String(completed)} label="Completed" tone="green" />
          <Stat icon="wallet" value={revenueText(revenue)} label="Sales" tone="amber" />
        </div>

        {state.status === "loading" && <p className="fa-muted">Loading your classes…</p>}
        {state.status === "error" && (
          <div className="fa-card fa-pad">
            <p className="fa-error">{state.error}</p>
            <button className="fa-btn fa-btn--outline" onClick={reload}>
              Try again
            </button>
          </div>
        )}
        {state.status === "ready" && list.length === 0 && canCreate && (
          <div className="fa-card fa-st-empty">
            <span className="fa-st-empty__ic">
              <Icon name="chef" size={30} />
            </span>
            <h3>Share what you know</h3>
            <p className="fa-muted">
              A bakery teaching sourdough, a coach running a weekend seminar, a developer streaming a live class — create your first offering in a
              couple of minutes.
            </p>
            <Link className="fa-btn fa-btn--primary" to="/academy/studio/new">
              <Icon name="plus" size={15} /> Create your first class
            </Link>
          </div>
        )}
        {list.length > 0 && (
          <div className="fa-st-grid">
            {list.map((c) => (
              <Link key={c.code} to={`/academy/studio/${encodeURIComponent(c.code)}`} className="fa-card fa-st-card">
                <div className="fa-st-card__cover" style={c.coverUrl ? undefined : { background: themeFor(c.code) }}>
                  {c.coverUrl ? <img src={mediaUrl(c.coverUrl)} alt="" /> : <Icon name="book" size={30} />}
                  <span className="fa-st-card__kind">{KIND_LABEL[c.kind] ?? "Course"}</span>
                </div>
                <div className="fa-st-card__body">
                  <div className="fa-st-card__top">
                    {c.takenDown ? <Badge tone="red">Taken down by Fockis</Badge> : <Badge tone={VIS_TONE[c.visibility] ?? "gray"}>{VIS_LABEL[c.visibility] ?? c.visibility}</Badge>}
                    <b className="fa-st-price">{formatPrice(c.isFree, c.price, c.currency)}</b>
                  </div>
                  <h4>{c.name}</h4>
                  {c.brandName && <small className="fa-muted">by {c.brandName}</small>}
                  <div className="fa-st-card__foot">
                    <span>
                      <Icon name="play" size={12} /> {c.lessons?.length ?? 0} lessons
                    </span>
                    <span>
                      <Icon name="users" size={12} /> {c.learners ?? 0}
                    </span>
                    <span>
                      <Icon name="wallet" size={12} /> {revenueText(c.revenue)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DashShell>
    </div>
  );
}

const KINDS: { kind: Kind; icon: string; title: string; text: string }[] = [
  { kind: "course", icon: "book", title: "Course", text: "Self-paced videos, PDFs, readings and tests." },
  { kind: "seminar", icon: "mic", title: "Seminar", text: "A talk or session on a set date, live or recorded." },
  { kind: "live_class", icon: "video", title: "Live class", text: "Scheduled live sessions on Fockis Meetings." },
  { kind: "workshop", icon: "tools", title: "Workshop", text: "Hands-on practice with materials and checkpoints." },
];

/** /academy/studio/new — pick what to create, name it, then continue in the editor. */
export function StudioNew() {
  const session = useAcademySession();
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>("course");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const access = useAcademyLoad(() => (session.status === "user" ? creatorApi.access() : Promise.resolve(null)), [session.status]);
  const schools = useAcademyLoad(() => (session.status === "user" ? studioApi.schools() : Promise.resolve([])), [session.status]);

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Create a class" />;
  const a = access.state.status === "ready" ? access.state.data : null;
  const mySchools = schools.state.status === "ready" ? schools.state.data.filter((x) => x.status === "approved") : [];
  if (access.state.status === "loading") return <div className="fa-root fa-page" />;
  if (a && !a.canTeach && !a.schoolIds.length)
    return (
      <div className="fa-root">
        <DashShell items={STUDIO_NAV} active="Create new" sub="Creator Studio">
          <div className="fa-dhead">
            <div>
              <h2>Become a Fockis creator</h2>
              <p>Every class on Fockis Academy comes from a creator approved by Fockis.</p>
            </div>
          </div>
          <CreatorGate access={a} onChange={() => access.reload()} />
        </DashShell>
      </div>
    );
  const mustUseSchool = !!a && !a.canTeach;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) return setError("Give it a title of at least 3 characters.");
    setBusy(true);
    setError(null);
    try {
      if (mustUseSchool && !schoolId) {
        setBusy(false);
        return setError("Choose the school that offers this class.");
      }
      const c = await studioApi.create({ name: name.trim(), kind, brandName: brand.trim() || undefined, ...(schoolId ? { institutionId: schoolId } : {}) });
      navigate(`/academy/studio/${encodeURIComponent(c.code)}?tab=content`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create it.");
      setBusy(false);
    }
  }

  return (
    <div className="fa-root">
      <DashShell items={STUDIO_NAV} active="Create new" sub="Creator Studio">
        <div className="fa-dhead">
          <div>
            <h2>Create something new</h2>
            <p>You can change everything later. Nothing is public until you publish.</p>
          </div>
        </div>
        <form className="fa-card fa-pad fa-st-new" onSubmit={create}>
          <h4>What are you offering?</h4>
          <div className="fa-st-kinds" role="radiogroup">
            {KINDS.map((k) => (
              <button type="button" key={k.kind} role="radio" aria-checked={kind === k.kind} className={`fa-st-kind ${kind === k.kind ? "is-on" : ""}`} onClick={() => setKind(k.kind)}>
                <Icon name={k.icon} size={22} />
                <b>{k.title}</b>
                <small>{k.text}</small>
              </button>
            ))}
          </div>
          <div className="fa-row2">
            <label className="fa-field">
              <span>
                Title<i>*</i>
              </span>
              <input value={name} maxLength={160} placeholder="e.g. Sourdough Bread from Scratch" onChange={(e) => setName(e.target.value)} autoFocus />
            </label>
            {mySchools.length > 0 ? (
              <label className="fa-field">
                <span>Offered by{mustUseSchool && <i>*</i>}</span>
                <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                  {!mustUseSchool && <option value="">Me / my business</option>}
                  {mustUseSchool && <option value="">Choose your school…</option>}
                  {mySchools.map((x) => (
                    <option key={x._id} value={x._id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="fa-field">
                <span>Business or brand name (optional)</span>
                <input value={brand} maxLength={120} placeholder="e.g. Bell Bakery" onChange={(e) => setBrand(e.target.value)} />
              </label>
            )}
          </div>
          {mustUseSchool && <p className="fa-note">You can create classes for your school. To teach under your own name, apply to become a creator in Creator Studio.</p>}
          {error && <p className="fa-error">{error}</p>}
          <div className="fa-st-new__foot">
            <Link className="fa-btn fa-btn--outline" to="/academy/studio">
              Cancel
            </Link>
            <button className="fa-btn fa-btn--primary" disabled={busy}>
              {busy ? "Creating…" : "Continue"} <Icon name="right" size={14} />
            </button>
          </div>
        </form>
      </DashShell>
    </div>
  );
}

/* ---------------------------------------------------------------- creator approval */

const EMPTY_PROFILE: CreatorProfile = { kind: "person", displayName: "", about: "" };

/** Shown until Fockis approves the person or business as a creator. */
export function CreatorGate({ access, onChange }: { access: CreatorAccess; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  if (access.status === "pending")
    return (
      <div className="fa-card fa-pad fa-cgate is-pending">
        <Icon name="clock" size={22} />
        <div>
          <h3>Your application is being reviewed</h3>
          <p>
            Fockis checks every new creator before they can publish. You sent your application
            {access.appliedAt ? ` on ${new Date(access.appliedAt).toLocaleDateString()}` : ""}. Come back here to see the decision.
          </p>
          {access.schoolIds.length > 0 && <p className="fa-muted">Meanwhile you can still create classes offered by your school.</p>}
        </div>
      </div>
    );
  if (access.status === "suspended")
    return (
      <div className="fa-card fa-pad fa-cgate is-bad">
        <Icon name="lock" size={22} />
        <div>
          <h3>Your teaching permission is suspended</h3>
          <p>
            Your own classes are hidden from the catalog and closed to new learners; people already enrolled keep access.
            {access.reason ? ` Reason: “${access.reason}”.` : ""} Contact Fockis support to resolve it.
          </p>
        </div>
      </div>
    );
  if (!access.canApply)
    return (
      <div className="fa-card fa-pad fa-cgate">
        <Icon name="shield" size={22} />
        <div>
          <h3>Teaching isn&apos;t available for this login</h3>
          <p>School student logins can take classes but not publish them. Sign in with your own Academy account to apply as a creator.</p>
        </div>
      </div>
    );
  return (
    <div className="fa-card fa-pad fa-cgate">
      <Icon name="verified" size={22} />
      <div style={{ minWidth: 0, flex: 1 }}>
        {access.status === "rejected" ? (
          <>
            <h3>Your application wasn&apos;t approved</h3>
            <p className="fa-cgate__reason">{access.reason ? `Fockis said: “${access.reason}”` : "Fockis didn't approve the application."} You can update it and send it again.</p>
          </>
        ) : (
          <>
            <h3>Apply to teach on Fockis Academy</h3>
            <p>
              To publish courses, seminars, workshops or live classes, tell us who you are and what you&apos;ll teach. A Fockis admin reviews it — usually
              within a few days — and you can start creating as soon as you&apos;re approved.
            </p>
          </>
        )}
        {editing ? (
          <CreatorForm initial={access.profile ?? EMPTY_PROFILE} onDone={() => (setEditing(false), onChange())} onCancel={() => setEditing(false)} />
        ) : (
          <button className="fa-btn fa-btn--primary" onClick={() => setEditing(true)}>
            <Icon name="send" size={14} /> {access.status === "rejected" ? "Update and send again" : "Apply to become a creator"}
          </button>
        )}
      </div>
    </div>
  );
}

function CreatorForm({ initial, onDone, onCancel }: { initial: CreatorProfile; onDone: () => void; onCancel: () => void }) {
  const [p, setP] = useState<CreatorProfile>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<CreatorProfile>) => setP((x) => ({ ...x, ...patch }));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (p.displayName.trim().length < 2) return setErr("Enter your name as learners will see it.");
    if (p.kind === "business" && !p.businessName?.trim()) return setErr("Enter the business or organization name.");
    if (p.about.trim().length < 30) return setErr("Tell us a bit more about what you'll teach (at least 30 characters).");
    setBusy(true);
    try {
      await creatorApi.apply(p);
      onDone();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send the application.");
      setBusy(false);
    }
  };

  return (
    <form className="fa-fields fa-cgate__form" onSubmit={send}>
      <div className="fa-seg fa-seg--sm" role="radiogroup" aria-label="I am">
        <button type="button" role="radio" aria-checked={p.kind === "person"} className={p.kind === "person" ? "is-on" : ""} onClick={() => set({ kind: "person" })}>
          A person (teacher, coach, expert)
        </button>
        <button type="button" role="radio" aria-checked={p.kind === "business"} className={p.kind === "business" ? "is-on" : ""} onClick={() => set({ kind: "business" })}>
          A business or organization
        </button>
      </div>
      <div className="fa-row2 fa-row2--even">
        <label className="fa-field">
          <span>
            Your name as learners see it<i>*</i>
          </span>
          <input value={p.displayName} maxLength={80} onChange={(e) => set({ displayName: e.target.value })} />
        </label>
        {p.kind === "business" ? (
          <label className="fa-field">
            <span>
              Business / organization name<i>*</i>
            </span>
            <input value={p.businessName ?? ""} maxLength={120} placeholder="e.g. Bell Bakery" onChange={(e) => set({ businessName: e.target.value })} />
          </label>
        ) : (
          <label className="fa-field">
            <span>Phone (optional)</span>
            <input value={p.phone ?? ""} maxLength={40} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} />
          </label>
        )}
      </div>
      <div className="fa-row2 fa-row2--even">
        <label className="fa-field">
          <span>City</span>
          <input value={p.city ?? ""} maxLength={80} onChange={(e) => set({ city: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Country</span>
          <input value={p.country ?? ""} maxLength={60} onChange={(e) => set({ country: e.target.value })} />
        </label>
      </div>
      {p.kind === "business" && (
        <label className="fa-field">
          <span>Phone (optional)</span>
          <input value={p.phone ?? ""} maxLength={40} inputMode="tel" onChange={(e) => set({ phone: e.target.value })} />
        </label>
      )}
      <label className="fa-field">
        <span>What will you teach?</span>
        <input value={p.topics ?? ""} maxLength={300} placeholder="e.g. Baking, pastry, running a small food business" onChange={(e) => set({ topics: e.target.value })} />
      </label>
      <label className="fa-field">
        <span>
          About you and your classes<i>*</i>
        </span>
        <textarea rows={4} value={p.about} maxLength={2000} placeholder="Who you are, who your classes are for, and what learners will be able to do." onChange={(e) => set({ about: e.target.value })} />
      </label>
      <label className="fa-field">
        <span>Experience or qualifications (optional)</span>
        <textarea rows={3} value={p.experience ?? ""} maxLength={2000} onChange={(e) => set({ experience: e.target.value })} />
      </label>
      <div className="fa-row2 fa-row2--even">
        <label className="fa-field">
          <span>Website or social page (optional)</span>
          <input value={p.website ?? ""} maxLength={300} inputMode="url" onChange={(e) => set({ website: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Link to a sample of your teaching (optional)</span>
          <input value={p.sampleUrl ?? ""} maxLength={300} inputMode="url" placeholder="YouTube, Drive…" onChange={(e) => set({ sampleUrl: e.target.value })} />
        </label>
      </div>
      {err && <p className="fa-error">{err}</p>}
      <div className="fa-hw__actions">
        <button className="fa-btn fa-btn--primary" disabled={busy}>
          {busy ? "Sending…" : "Send application"}
        </button>
        <button type="button" className="fa-btn fa-btn--outline" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
