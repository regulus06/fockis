import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, DashShell, Stat, type SideItem } from "../../../components/academy/market/Shared";
import { themeFor } from "../../../components/academy/market/FaCourseCard";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademySession } from "../../../lib/academySession";
import { KIND_LABEL, formatPrice, mediaUrl, studioApi, type Kind, type StudioCourse } from "../../../lib/studioApi";
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

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Creator Studio" />;

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
          <Link className="fa-btn fa-btn--primary" to="/academy/studio/new">
            <Icon name="plus" size={15} /> Create new
          </Link>
        </div>

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
        {state.status === "ready" && list.length === 0 && (
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
                    <Badge tone={VIS_TONE[c.visibility] ?? "gray"}>{VIS_LABEL[c.visibility] ?? c.visibility}</Badge>
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

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Create a class" />;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) return setError("Give it a title of at least 3 characters.");
    setBusy(true);
    setError(null);
    try {
      const c = await studioApi.create({ name: name.trim(), kind, brandName: brand.trim() || undefined });
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
            <label className="fa-field">
              <span>Business or brand name (optional)</span>
              <input value={brand} maxLength={120} placeholder="e.g. Bell Bakery" onChange={(e) => setBrand(e.target.value)} />
            </label>
          </div>
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
