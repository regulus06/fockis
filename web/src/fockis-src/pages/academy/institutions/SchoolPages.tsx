import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { themeFor } from "../../../components/academy/market/FaCourseCard";
import { LoadState } from "../../../components/academy/learn/CourseCard";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { KIND_LABEL, formatPrice, mediaUrl, type Kind } from "../../../lib/studioApi";
import { INSTITUTION_TYPE_LABEL, schoolsApi } from "../../../lib/institutionsApi";

/** /academy/schools — approved schools, universities and organizations. */
export function SchoolsDirectory() {
  const { state, reload } = useAcademyLoad(schoolsApi.directory);
  const [q, setQ] = useState("");
  const list = state.status === "ready" ? state.data.filter((s) => `${s.name} ${s.city ?? ""} ${s.country ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())) : [];
  return (
    <div className="fa-root fa-page">
      <section className="fa-pagehead">
        <div className="fa-container fa-sch-dirhead">
          <div>
            <h1>Schools on Fockis</h1>
            <p>Verified schools, universities, training centers and businesses teaching on Fockis Academy.</p>
          </div>
          <Link className="fa-btn fa-btn--primary" to="/academy/schools/register">
            <Icon name="building" size={15} /> Register your school
          </Link>
        </div>
      </section>
      <div className="fa-container">
        <div className="fa-filterbar fa-card">
          <label className="fa-search fa-search--block">
            <Icon name="search" size={15} />
            <input type="search" value={q} placeholder="School name, city or country" onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="fa-section">
          {state.status === "loading" && <LoadState status="loading" />}
          {state.status === "error" && <LoadState status="error" error={state.error} onRetry={reload} />}
          {state.status === "ready" && list.length === 0 && <LoadState status="empty" empty={q ? "No school matches." : "No schools are listed yet."} />}
          <div className="fa-st-grid">
            {list.map((s) => (
              <Link key={s.slug} to={`/academy/schools/${s.slug}`} className="fa-card fa-sch-card">
                <span className="fa-sch-logo">{s.logoUrl ? <img src={mediaUrl(s.logoUrl)} alt="" /> : <Icon name="building" size={22} />}</span>
                <div>
                  <b>
                    {s.name} <Icon name="verified" size={14} className="fa-sch-verified" />
                  </b>
                  <small>
                    {INSTITUTION_TYPE_LABEL[s.type]}
                    {s.city || s.country ? ` · ${[s.city, s.country].filter(Boolean).join(", ")}` : ""}
                  </small>
                  {s.description && <p>{s.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** /academy/schools/:slug — public school page with its classes and the student application form. */
export function SchoolPage() {
  const { slug = "" } = useParams();
  const { state, reload } = useAcademyLoad(() => schoolsApi.profile(slug), [slug]);
  const [form, setForm] = useState({ name: "", personalEmail: "", phone: "", program: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (state.status !== "ready")
    return (
      <div className="fa-root fa-page">
        <div className="fa-container fa-section">{state.status === "loading" ? <LoadState status="loading" /> : <LoadState status="error" error={state.error} onRetry={reload} />}</div>
      </div>
    );
  const s = state.data;

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await schoolsApi.apply(slug, {
        name: form.name.trim(),
        personalEmail: form.personalEmail.trim(),
        phone: form.phone.trim() || undefined,
        program: form.program.trim() || undefined,
        message: form.message.trim() || undefined,
      });
      setDone(r.message);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not send your application.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fa-root fa-page">
      <section className="fa-sch-hero">
        <div className="fa-container fa-sch-hero__row">
          <span className="fa-sch-logo fa-sch-logo--xl">{s.logoUrl ? <img src={mediaUrl(s.logoUrl)} alt="" /> : <Icon name="building" size={34} />}</span>
          <div>
            <span className="fa-sch-verifiedtag">
              <Icon name="verified" size={13} /> Verified by Fockis Academy
            </span>
            <h1>{s.name}</h1>
            <p>
              {INSTITUTION_TYPE_LABEL[s.type]}
              {s.city || s.country ? ` · ${[s.city, s.country].filter(Boolean).join(", ")}` : ""} · {s.domain}
            </p>
          </div>
        </div>
      </section>
      <div className="fa-container fa-sch-body">
        <div>
          {s.description && (
            <section className="fa-section">
              <h4>About</h4>
              <p className="fa-muted fa-prewrap">{s.description}</p>
            </section>
          )}
          {s.teachers?.length > 0 && (
            <section className="fa-section">
              <h4>Teachers</h4>
              <div className="fa-teach-grid">
                {s.teachers.map((t) => (
                  <div key={t.key} className="fa-teach-card">
                    <span className="fa-sch-logo fa-sch-logo--lg">{t.photoUrl ? <img src={mediaUrl(t.photoUrl)} alt="" /> : <Icon name="user" size={22} />}</span>
                    <div className="fa-teach-card__body">
                      <b>{t.name}</b>
                      {(t.title || t.department) && <small className="fa-muted">{[t.title, t.department].filter(Boolean).join(" · ")}</small>}
                      {t.bio && <p className="fa-teach-card__bio">{t.bio}</p>}
                      {t.classes.length > 0 && (
                        <div className="fa-teach-card__classes">
                          {t.classes.map((c) => (
                            <Link key={c.code} to={`/academy/learn/${encodeURIComponent(c.code)}`} className="fa-teach-chip">
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="fa-section">
            <h4>Classes</h4>
            {s.classes.length === 0 ? (
              <p className="fa-muted">No classes published yet.</p>
            ) : (
              <div className="fa-st-grid">
                {s.classes.map((c) => (
                  <Link key={c.code} to={`/academy/learn/${encodeURIComponent(c.code)}`} className="fa-card fa-st-card">
                    <div className="fa-st-card__cover" style={c.coverUrl ? undefined : { background: themeFor(c.code) }}>
                      {c.coverUrl ? <img src={mediaUrl(c.coverUrl)} alt="" /> : <Icon name="book" size={28} />}
                      <span className="fa-st-card__kind">{KIND_LABEL[c.kind as Kind] ?? "Course"}</span>
                    </div>
                    <div className="fa-st-card__body">
                      <div className="fa-st-card__top">
                        {c.visibility === "school" ? <span className="fa-badge tone-purple">Students only</span> : <span />}
                        <b className="fa-st-price">{formatPrice(c.isFree, c.price, c.currency)}</b>
                      </div>
                      <h4>{c.name}</h4>
                      {c.summary && <small className="fa-muted">{c.summary}</small>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
        <aside>
          {s.allowApplications && (
            <div className="fa-card fa-pad fa-sch-apply">
              <h4>Apply to {s.name}</h4>
              {done ? (
                <p className="fa-st-ok">
                  <Icon name="check" size={15} /> {done}
                </p>
              ) : (
                <form className="fa-fields" onSubmit={apply}>
                  <label className="fa-field">
                    <span>
                      Full name<i>*</i>
                    </span>
                    <input required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </label>
                  <label className="fa-field">
                    <span>
                      Your email<i>*</i>
                    </span>
                    <input required type="email" value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} />
                  </label>
                  <label className="fa-field">
                    <span>Phone</span>
                    <input maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </label>
                  <label className="fa-field">
                    <span>Program or class you want</span>
                    <input maxLength={160} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
                  </label>
                  <label className="fa-field">
                    <span>Message</span>
                    <textarea rows={3} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                  </label>
                  {err && <p className="fa-error">{err}</p>}
                  <button className="fa-btn fa-btn--primary" disabled={busy}>
                    {busy ? "Sending…" : "Send application"}
                  </button>
                  <small className="fa-muted">If the school approves you, it gives you a login like yourname@{s.domain} and a temporary password.</small>
                </form>
              )}
            </div>
          )}
          <div className="fa-card fa-pad fa-sch-contact">
            <h4>Contact</h4>
            <ul>
              {s.address && (
                <li>
                  <Icon name="home" size={14} /> {s.address}
                </li>
              )}
              {s.phone && (
                <li>
                  <Icon name="message" size={14} /> {s.phone}
                </li>
              )}
              {s.contactEmail && (
                <li>
                  <Icon name="send" size={14} /> <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>
                </li>
              )}
              {s.website && (
                <li>
                  <Icon name="globe" size={14} />{" "}
                  <a href={s.website} target="_blank" rel="noreferrer">
                    {s.website.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
              <li>
                <Icon name="users" size={14} /> {s.students} students
              </li>
            </ul>
            <Link className="fa-btn fa-btn--outline fa-btn--sm" to="/academy/login">
              Student sign-in
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
