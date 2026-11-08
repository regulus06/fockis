import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LoadState } from "../../../components/academy/learn/CourseCard";
import { Icon } from "../../../components/academy/market/Icon";
import { themeFor } from "../../../components/academy/market/FaCourseCard";
import { Person, Progress } from "../../../components/academy/market/Shared";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import TeacherContact from "../../../components/academy/institutions/TeacherContact";
import { shortDate } from "../../../lib/academyLearnApi";
import {
  KIND_LABEL,
  LESSON_ICON,
  LESSON_LABEL,
  formatPrice,
  formatWhen,
  learnApi,
  mediaUrl,
  minutesLabel,
  type CoursePage,
} from "../../../lib/studioApi";

/**
 * /academy/learn/:code — public class page (course, seminar, workshop or live
 * class) from GET /academy/learn/:code. Free classes enroll in one click; paid
 * classes go to the existing Fockis checkout. Enrolled learners continue in
 * the classroom.
 */

type Tab = "Overview" | "Curriculum" | "Creator";
const tabLabel = (t: Tab, hasTeacher: boolean) => (t === "Creator" && hasTeacher ? "Teacher" : t);
const LEVEL: Record<string, string> = { all: "All levels", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export default function CourseDetails() {
  const { code = "" } = useParams();
  const { state, reload } = useAcademyLoad(() => learnApi.page(code), [code]);
  const [tab, setTab] = useState<Tab>("Overview");

  if (state.status !== "ready")
    return (
      <div className="fa-root fa-page">
        <div className="fa-container fa-section">
          {state.status === "loading" ? <LoadState status="loading" /> : <LoadState status="error" error={state.error} onRetry={reload} />}
        </div>
      </div>
    );

  const c = state.data;
  const lessons = c.lessons;
  const legacy = lessons.length === 0 ? [...c.modules].sort((a, b) => a.order - b.order) : [];
  const count = lessons.length || legacy.length;
  const cover = mediaUrl(c.coverUrl);
  const provider = c.brandName || c.instructor;
  const byType = (t: string) => lessons.filter((l) => l.type === t).length;
  const lives = lessons.filter((l) => l.type === "live" && l.startsAt);

  const includes: [string, string][] = [
    ...(byType("video") ? ([["play", `${byType("video")} video ${byType("video") === 1 ? "lesson" : "lessons"}`]] as [string, string][]) : []),
    ...(byType("live") ? ([["video", `${byType("live")} live ${byType("live") === 1 ? "session" : "sessions"} on Fockis Meetings`]] as [string, string][]) : []),
    ...(byType("pdf") ? ([["file", `${byType("pdf")} downloadable PDF${byType("pdf") === 1 ? "" : "s"}`]] as [string, string][]) : []),
    ...(byType("text") ? ([["book", `${byType("text")} reading${byType("text") === 1 ? "" : "s"}`]] as [string, string][]) : []),
    ...(byType("quiz") ? ([["quiz", `${byType("quiz")} test${byType("quiz") === 1 ? "" : "s"}`]] as [string, string][]) : []),
    ...(legacy.length ? ([["layers", `${legacy.length} modules`]] as [string, string][]) : []),
    ...(c.totalMinutes ? ([["clock", `${minutesLabel(c.totalMinutes)} total`]] as [string, string][]) : []),
    ...(c.certificateEnabled ? ([["award", "Fockis certificate with QR verification"]] as [string, string][]) : []),
  ];

  return (
    <div className="fa-root fa-page">
      <div className="fa-container">
        <div className="fa-crumbs fa-crumbs--top">
          <Link to="/academy/learn">Explore</Link> / <span>{KIND_LABEL[c.kind]}</span>
        </div>
        <section className="fa-detail">
          <div className="fa-detail__media" style={cover ? undefined : { background: themeFor(c.code) }}>
            {cover ? <img src={cover} alt="" /> : <span className="fa-detail__fallback"><Icon name="book" size={56} stroke={1.3} /></span>}
          </div>
          <div className="fa-detail__info">
            <span className="fa-st-kindtag">{KIND_LABEL[c.kind]}</span>
            <h1>{c.name}</h1>
            {c.summary && <p className="fa-detail__summary">{c.summary}</p>}
            <div className="fa-by">
              <Person look={{ skin: 2, hair: 1, shirt: "#1d5ee8" }} size={22} /> By{" "}
              {c.school ? (
                <Link to={`/academy/schools/${c.school.slug}`} className="fa-by__school">
                  <b>{c.school.name}</b> <Icon name="verified" size={14} className="fa-sch-verified" />
                </Link>
              ) : (
                <b>{provider}</b>
              )}
              {!c.teacher && c.brandName && c.brandName !== c.instructor && <span className="fa-muted"> · taught by {c.instructor}</span>}
            </div>
            {c.teacher && (
              <div className="fa-teach-line">
                {c.teacher.photoUrl ? <img src={mediaUrl(c.teacher.photoUrl)} alt="" /> : <span className="fa-teach-line__av"><Icon name="user" size={14} /></span>}
                Teacher: <b>{c.teacher.name}</b>
                {c.teacher.title && <em className="fa-muted">· {c.teacher.title}</em>}
              </div>
            )}
            <div className="fa-meta">
              <span className="fa-chip">
                <Icon name="layers" size={12} /> {count} {count === 1 ? "lesson" : "lessons"}
              </span>
              {c.level && <span className="fa-chip">{LEVEL[c.level] ?? c.level}</span>}
              {c.language && <span className="fa-chip">{c.language}</span>}
              <span className="fa-chip">
                <Icon name="users" size={12} /> {c.learners} enrolled
              </span>
              {c.startsAt && c.kind !== "course" && (
                <span className="fa-chip">
                  <Icon name="calendar" size={12} /> {formatWhen(c.startsAt)}
                </span>
              )}
              {c.updatedAt && <span>Updated {shortDate(String(c.updatedAt))}</span>}
            </div>
            <div className={`fa-price ${c.isFree ? "is-free" : ""}`}>{formatPrice(c.isFree, c.price, c.currency)}</div>
            {c.membersOnly && (
              <p className="fa-st-members">
                <Icon name="lock" size={13} /> For {c.school?.name ?? "school"} students — sign in with your school login to join.
              </p>
            )}
            {c.seatsLeft !== null && c.seatsLeft <= 20 && <p className="fa-st-seats">{c.seatsLeft === 0 ? "Sold out" : `Only ${c.seatsLeft} seats left`}</p>}
            <EnrollActions c={c} onChanged={reload} />
          </div>
        </section>

        <nav className="fa-tabs" role="tablist">
          {(["Overview", "Curriculum", "Creator"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
              {tabLabel(t, !!c.teacher)}
            </button>
          ))}
        </nav>

        <section className="fa-detail__grid">
          <div>
            {tab === "Overview" && (
              <div className="fa-two">
                <div>
                  <h4>About this {KIND_LABEL[c.kind].toLowerCase()}</h4>
                  <p className="fa-muted fa-prewrap">{c.description || c.summary || "The creator hasn't added a description yet."}</p>
                </div>
                <div>
                  {lives.length > 0 ? (
                    <>
                      <h4>Live sessions</h4>
                      <ul className="fa-checks fa-checks--sm">
                        {lives.map((l) => (
                          <li key={l.key}>
                            <Icon name="video" size={14} /> <span>{l.title} — {formatWhen(l.startsAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <h4>What&apos;s inside</h4>
                      {count === 0 ? (
                        <p className="fa-muted">Lessons will appear once the creator publishes them.</p>
                      ) : (
                        <ul className="fa-checks fa-checks--sm">
                          {(lessons.length ? lessons.map((l) => l.title) : legacy.map((m) => m.title)).slice(0, 6).map((t, i) => (
                            <li key={i}>
                              <Icon name="check" size={14} /> {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {tab === "Curriculum" &&
              (count === 0 ? (
                <LoadState status="empty" empty="The creator hasn't published lessons yet." />
              ) : lessons.length ? (
                <ol className="fa-st-outline">
                  {lessons.map((l, i) => (
                    <li key={l.key} className={l.locked ? "is-locked" : ""}>
                      <span className={`fa-st-lesson__ic t-${l.type}`}>
                        <Icon name={LESSON_ICON[l.type]} size={14} />
                      </span>
                      <div>
                        <b>
                          {i + 1}. {l.title}
                        </b>
                        <small>
                          {LESSON_LABEL[l.type]}
                          {l.durationMin ? ` · ${minutesLabel(l.durationMin)}` : ""}
                          {l.type === "live" && l.startsAt ? ` · ${formatWhen(l.startsAt)}` : ""}
                        </small>
                      </div>
                      {l.preview && !c.access.enrolled ? (
                        <Link className="fa-st-prev" to={`/academy/classroom/${encodeURIComponent(c.code)}?lesson=${l.key}`}>
                          Preview
                        </Link>
                      ) : l.locked ? (
                        <Icon name="lock" size={14} />
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <ol className="fa-list">
                  {legacy.map((m, i) => (
                    <li key={m.order}>
                      <span>{i + 1}</span>
                      {m.title}
                    </li>
                  ))}
                </ol>
              ))}
            {tab === "Creator" && c.teacher && (
              <div className="fa-instr fa-instr--teacher">
                {c.teacher.photoUrl ? <img className="fa-teach-photo" src={mediaUrl(c.teacher.photoUrl)} alt="" /> : <Person look={{ skin: 2, hair: 1, shirt: "#1d5ee8" }} size={64} />}
                <div>
                  <small className="fa-muted">Teacher</small>
                  <b>{c.teacher.name}</b>
                  {(c.teacher.title || c.teacher.department) && <p className="fa-muted">{[c.teacher.title, c.teacher.department].filter(Boolean).join(" · ")}</p>}
                  {c.teacher.bio && <p className="fa-prewrap">{c.teacher.bio}</p>}
                  {c.teacher.contact && <TeacherContact teacher={c.teacher} />}
                  {c.school && (
                    <p className="fa-muted">
                      Teaches at <Link to={`/academy/schools/${c.school.slug}`}>{c.school.name}</Link>
                    </p>
                  )}
                </div>
              </div>
            )}
            {tab === "Creator" && !c.teacher && (
              <div className="fa-instr">
                <Person look={{ skin: 2, hair: 1, shirt: "#1d5ee8" }} size={64} />
                <div>
                  <b>{provider}</b>
                  <p className="fa-muted">
                    {c.brandName && c.brandName !== c.instructor ? `${c.instructor} teaches on Fockis Academy for ${c.brandName}.` : `${c.instructor} teaches on Fockis Academy.`}
                  </p>
                </div>
              </div>
            )}
          </div>
          <aside className="fa-card fa-includes">
            <h4>This {KIND_LABEL[c.kind].toLowerCase()} includes</h4>
            <ul>
              {includes.map(([ic, t]) => (
                <li key={t}>
                  <Icon name={ic} size={15} /> {t}
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </div>
    </div>
  );
}

function EnrollActions({ c, onChanged }: { c: CoursePage; onChanged: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const room = `/academy/classroom/${encodeURIComponent(c.code)}`;
  const a = c.access;

  if (a.isOwner)
    return (
      <div className="fa-detail__btns">
        <Link className="fa-btn fa-btn--primary" to={`/academy/studio/${encodeURIComponent(c.code)}`}>
          <Icon name="pen" size={15} /> Edit in Studio
        </Link>
        <Link className="fa-btn fa-btn--outline" to={room}>
          <Icon name="monitor" size={15} /> Preview classroom
        </Link>
      </div>
    );

  if (a.staffView)
    return (
      <div className="fa-detail__btns">
        <Link className="fa-btn fa-btn--outline" to={room}>
          <Icon name="monitor" size={15} /> Review classroom
        </Link>
        <small className="fa-muted">Academy staff view — only the creator can edit this class.</small>
      </div>
    );

  if (a.enrolled && a.enrollment)
    return (
      <div className="fa-st-enrolled">
        <div className="fa-st-enrolled__bar">
          <Progress value={a.enrollment.progress} /> <b>{a.enrollment.progress}%</b>
        </div>
        <div className="fa-detail__btns">
          <Link className="fa-btn fa-btn--primary" to={room}>
            <Icon name="play" size={15} /> {a.enrollment.progress > 0 ? "Continue learning" : "Start learning"}
          </Link>
          {a.enrollment.certificateId && (
            <Link className="fa-btn fa-btn--outline" to="/academy/portal/certificates">
              <Icon name="award" size={15} /> My certificate
            </Link>
          )}
        </div>
        <small className="fa-muted">Enrollment ID {a.enrollment.enrollmentNumber}</small>
      </div>
    );

  if (!a.signedIn)
    return (
      <div className="fa-detail__btns">
        <Link className="fa-btn fa-btn--primary" to={`/academy/login?next=${encodeURIComponent(`/academy/learn/${c.code}`)}`}>
          {c.isFree ? "Sign in to enroll free" : `Sign in to buy · ${formatPrice(false, c.price, c.currency)}`}
        </Link>
        <Link className="fa-btn fa-btn--outline" to={`/academy/register?next=${encodeURIComponent(`/academy/learn/${c.code}`)}`}>
          Create account
        </Link>
      </div>
    );

  if (!a.canEnroll)
    return (
      <div className="fa-detail__btns">
        <button className="fa-btn fa-btn--primary" disabled>
          {a.reason || "Not available"}
        </button>
      </div>
    );

  async function enrollFree() {
    setBusy(true);
    setErr(null);
    try {
      await learnApi.enroll(c.code);
      navigate(`${room}?welcome=1`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not enroll.");
      setBusy(false);
      onChanged();
    }
  }

  return (
    <>
      <div className="fa-detail__btns">
        {c.isFree ? (
          <button className="fa-btn fa-btn--primary" disabled={busy} onClick={enrollFree}>
            {busy ? "Enrolling…" : "Enroll for free"}
          </button>
        ) : (
          <Link className="fa-btn fa-btn--primary" to={`/academy/checkout/${encodeURIComponent(c.code)}`}>
            <Icon name="wallet" size={15} /> Buy now · {formatPrice(false, c.price, c.currency)}
          </Link>
        )}
      </div>
      {err && <p className="fa-error">{err}</p>}
    </>
  );
}
