import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Logo, Progress } from "../../../components/academy/market/Shared";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import {
  KIND_LABEL,
  LESSON_ICON,
  LESSON_LABEL,
  embedFor,
  formatWhen,
  learnApi,
  minutesLabel,
  type CoursePage,
  type EnrollmentSummary,
  type PageLesson,
} from "../../../lib/studioApi";
import TeacherContact from "../../../components/academy/institutions/TeacherContact";
import "../../../styles/academy-market.scss";

/* ================================================================== */
/* /academy/classroom/:code — where learners study.                   */
/* Lessons come from GET /academy/learn/:code (videos, PDFs, readings,*/
/* tests, live sessions). Progress, test grading and the automatic    */
/* certificate are handled by the backend. Live sessions open in the  */
/* existing Fockis Meetings (link set by the creator).                */
/* ================================================================== */

export default function AcademyClassroom() {
  const { code = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const page = useAcademyLoad(() => learnApi.page(code), [code]);
  const [enr, setEnr] = useState<EnrollmentSummary | null>(null);
  const [legacyDone, setLegacyDone] = useState<number[]>([]);
  const [sideOpen, setSideOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(params.get("welcome") ? "You're in! Start with the first lesson below." : null);

  useEffect(() => {
    if (page.state.status === "ready") {
      setEnr(page.state.data.access.enrollment);
      setLegacyDone(page.state.data.access.enrollment?.completedModuleOrders ?? []);
    }
  }, [page.state]);

  const c = page.state.status === "ready" ? page.state.data : null;
  const lessons = c?.lessons ?? [];
  const done = new Set(enr?.completedLessonKeys ?? []);
  const firstOpen = lessons.find((l) => !done.has(l.key) && !l.locked) ?? lessons.find((l) => !l.locked) ?? lessons[0];
  const currentKey = params.get("lesson") || firstOpen?.key || "";
  const current = lessons.find((l) => l.key === currentKey) ?? firstOpen;
  const idx = current ? lessons.indexOf(current) : -1;

  const sections = useMemo(() => {
    const out: { name: string; items: PageLesson[] }[] = [];
    for (const l of lessons) {
      const name = l.section || "";
      const last = out[out.length - 1];
      if (last && last.name === name) last.items.push(l);
      else out.push({ name, items: [l] });
    }
    return out;
  }, [lessons]);

  if (page.state.status === "loading")
    return (
      <div className="academy fa-root fa-room">
        <p className="fa-room__loading">Opening classroom…</p>
      </div>
    );
  if (page.state.status === "error" || !c)
    return (
      <div className="fa-root fa-page fa-page--soft">
        <div className="fa-container fa-narrow">
          <div className="fa-card fa-gate">
            <h2>Classroom unavailable</h2>
            <p className="fa-error">{page.state.status === "error" ? page.state.error : ""}</p>
            <Link className="fa-btn fa-btn--primary" to="/academy/learn">
              Explore classes
            </Link>
          </div>
        </div>
      </div>
    );

  const unlocked = c.access.enrolled || c.access.isOwner;
  const progress = enr?.progress ?? 0;
  const go = (key: string) => {
    const next = new URLSearchParams(params);
    next.set("lesson", key);
    next.delete("welcome");
    setParams(next);
    setSideOpen(false);
    window.scrollTo({ top: 0 });
  };
  const onProgress = (e: EnrollmentSummary) => {
    setEnr(e);
    if (e.progress >= 100 && (progress < 100 || !enr?.certificateId)) setBanner(e.certificateId ? "🎉 You completed everything — your certificate has been issued." : "🎉 You completed everything!");
  };

  return (
    <div className="academy fa-root fa-room">
      <header className="fa-room__top">
        <Link to="/academy" className="fa-room__logo" aria-label="Fockis Academy home">
          <Logo light />
        </Link>
        <div className="fa-room__title">
          <small>
            {KIND_LABEL[c.kind]} · {c.brandName || c.instructor}
          </small>
          <b>{c.name}</b>
        </div>
        {unlocked && !c.access.isOwner && (
          <div className="fa-room__prog">
            <Progress value={progress} />
            <span>{progress}%</span>
          </div>
        )}
        {c.access.isOwner && (
          <Link className="fa-btn fa-btn--outline fa-btn--sm" to={`/academy/studio/${encodeURIComponent(c.code)}?tab=content`}>
            <Icon name="pen" size={13} /> Edit
          </Link>
        )}
        <button className="fa-icon-btn fa-room__menu" aria-label="Lessons" onClick={() => setSideOpen(!sideOpen)}>
          <Icon name="list" size={18} />
        </button>
        <Link className="fa-link fa-room__exit" to={`/academy/learn/${encodeURIComponent(c.code)}`}>
          Class page
        </Link>
      </header>

      {banner && (
        <div className="fa-room__banner" role="status">
          <span>{banner}</span>
          {enr?.certificateId && (
            <Link to="/academy/portal/certificates" className="fa-btn fa-btn--primary fa-btn--sm">
              <Icon name="award" size={13} /> View certificate
            </Link>
          )}
          <button className="fa-icon-btn" aria-label="Dismiss" onClick={() => setBanner(null)}>
            ×
          </button>
        </div>
      )}

      <div className="fa-room__body">
        <main className="fa-room__main">
          {!unlocked && (
            <div className="fa-room__lockbar">
              <Icon name="lock" size={15} /> You&apos;re previewing. <Link to={`/academy/learn/${encodeURIComponent(c.code)}`}>Enroll</Link> to unlock every lesson
              {c.certificateEnabled ? " and earn a certificate" : ""}.
            </div>
          )}
          {lessons.length === 0 ? (
            <LegacyModules c={c} done={legacyDone} setDone={setLegacyDone} unlocked={unlocked} />
          ) : current ? (
            <LessonView key={current.key} c={c} l={current} index={idx} done={done.has(current.key)} enr={enr} onProgress={onProgress} />
          ) : null}
          {current && lessons.length > 0 && (
            <div className="fa-room__nav">
              {idx > 0 ? (
                <button className="fa-btn fa-btn--outline" onClick={() => go(lessons[idx - 1].key)}>
                  <Icon name="left" size={14} /> Previous
                </button>
              ) : (
                <span />
              )}
              {idx < lessons.length - 1 && (
                <button className="fa-btn fa-btn--primary" onClick={() => go(lessons[idx + 1].key)}>
                  Next <Icon name="right" size={14} />
                </button>
              )}
            </div>
          )}
        </main>

        {lessons.length > 0 && (
          <aside className={`fa-room__side ${sideOpen ? "is-open" : ""}`}>
            <div className="fa-room__sidehead">
              <b>Content</b>
              <small>
                {done.size}/{lessons.length} done{c.totalMinutes ? ` · ${minutesLabel(c.totalMinutes)}` : ""}
              </small>
            </div>
            {sections.map((s, si) => (
              <div key={si} className="fa-room__sec">
                {s.name && <h5>{s.name}</h5>}
                <ol>
                  {s.items.map((l) => {
                    const n = lessons.indexOf(l) + 1;
                    return (
                      <li key={l.key}>
                        <button className={`fa-room__item ${l.key === current?.key ? "is-active" : ""} ${l.locked ? "is-locked" : ""}`} onClick={() => go(l.key)}>
                          <span className={`fa-room__check ${done.has(l.key) ? "is-done" : ""}`}>{done.has(l.key) ? <Icon name="check" size={12} /> : n}</span>
                          <span className="fa-room__itemtxt">
                            <b>{l.title}</b>
                            <small>
                              <Icon name={LESSON_ICON[l.type]} size={11} /> {LESSON_LABEL[l.type]}
                              {l.durationMin ? ` · ${minutesLabel(l.durationMin)}` : ""}
                              {l.type === "live" && l.startsAt ? ` · ${formatWhen(l.startsAt)}` : ""}
                            </small>
                          </span>
                          {l.locked && <Icon name="lock" size={12} />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            {c.teacher && (c.access.enrolled || c.access.isOwner) && <TeacherContact teacher={c.teacher} compact />}
            {enr?.enrollmentNumber && <p className="fa-room__enr">Enrollment ID {enr.enrollmentNumber}</p>}
          </aside>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ lesson

function LessonView({ c, l, index, done, enr, onProgress }: { c: CoursePage; l: PageLesson; index: number; done: boolean; enr: EnrollmentSummary | null; onProgress: (e: EnrollmentSummary) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canTrack = c.access.enrolled;

  async function complete() {
    setBusy(true);
    setErr(null);
    try {
      onProgress(await learnApi.complete(c.code, l.key));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save progress.");
    } finally {
      setBusy(false);
    }
  }

  if (l.locked)
    return (
      <div className="fa-card fa-room__locked">
        <Icon name="lock" size={30} />
        <h3>{l.title}</h3>
        <p className="fa-muted">This {LESSON_LABEL[l.type].toLowerCase()} unlocks when you enroll.</p>
        <Link className="fa-btn fa-btn--primary" to={`/academy/learn/${encodeURIComponent(c.code)}`}>
          See enrollment options
        </Link>
      </div>
    );

  return (
    <article className="fa-room__lesson">
      <div className="fa-room__lhead">
        <small>
          Lesson {index + 1} · {LESSON_LABEL[l.type]}
          {l.durationMin ? ` · ${minutesLabel(l.durationMin)}` : ""}
        </small>
        <h1>{l.title}</h1>
      </div>

      {l.type === "video" && <VideoBlock c={c} l={l} />}
      {l.type === "pdf" && <PdfBlock c={c} l={l} />}
      {l.type === "live" && <LiveBlock c={c} l={l} onJoin={() => canTrack && !done && complete()} />}
      {l.type === "quiz" && <QuizBlock c={c} l={l} enr={enr} canTrack={canTrack} onProgress={onProgress} />}

      {l.body && <div className={`fa-room__text ${l.type === "text" ? "is-main" : ""}`}>{l.body}</div>}
      {l.type === "text" && !l.body && <p className="fa-muted">This reading is empty.</p>}

      {l.type !== "quiz" && canTrack && (
        <div className="fa-room__done">
          {done ? (
            <span className="fa-st-ok">
              <Icon name="check" size={15} /> Completed
            </span>
          ) : (
            <button className="fa-btn fa-btn--primary" disabled={busy} onClick={complete}>
              <Icon name="check" size={15} /> {l.type === "live" ? "Mark as attended" : "Mark as complete"}
            </button>
          )}
          {err && <span className="fa-error">{err}</span>}
        </div>
      )}
    </article>
  );
}

function useFile(c: CoursePage, l: PageLesson) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!l.hasFile) return;
    let off = false;
    learnApi
      .file(c.code, l.key)
      .then((r) => !off && setUrl(r.url))
      .catch((e) => !off && setErr(e instanceof Error ? e.message : "Could not load the file."));
    return () => {
      off = true;
    };
  }, [c.code, l.key, l.hasFile]);
  return { url, err };
}

function VideoBlock({ c, l }: { c: CoursePage; l: PageLesson }) {
  const file = useFile(c, l);
  if (l.hasFile) {
    if (file.err) return <p className="fa-error">{file.err}</p>;
    if (!file.url) return <div className="fa-room__player is-loading" />;
    return (
      <div className="fa-room__player">
        <video src={file.url} controls controlsList="nodownload" playsInline />
      </div>
    );
  }
  if (l.videoUrl) {
    const e = embedFor(l.videoUrl);
    return (
      <div className="fa-room__player">
        {e.kind === "iframe" ? <iframe src={e.src} title={l.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> : <video src={e.src} controls playsInline />}
      </div>
    );
  }
  return <p className="fa-muted">The creator hasn&apos;t added the video yet.</p>;
}

function PdfBlock({ c, l }: { c: CoursePage; l: PageLesson }) {
  const file = useFile(c, l);
  async function download() {
    try {
      const r = await learnApi.file(c.code, l.key, true);
      window.location.href = r.url;
    } catch {
      /* shown via file.err */
    }
  }
  if (!l.hasFile) return <p className="fa-muted">The creator hasn&apos;t attached the PDF yet.</p>;
  if (file.err) return <p className="fa-error">{file.err}</p>;
  return (
    <div className="fa-room__pdf">
      <div className="fa-room__pdfbar">
        <Icon name="file" size={16} /> <b>{l.fileName || "Document.pdf"}</b>
        <span className="fa-room__spacer" />
        {file.url && (
          <a className="fa-btn fa-btn--outline fa-btn--sm" href={file.url} target="_blank" rel="noreferrer">
            <Icon name="expand" size={13} /> Open
          </a>
        )}
        <button className="fa-btn fa-btn--primary fa-btn--sm" onClick={download}>
          <Icon name="download" size={13} /> Download
        </button>
      </div>
      {file.url ? <iframe className="fa-room__pdfframe" src={file.url} title={l.fileName || l.title} /> : <div className="fa-room__pdfframe is-loading" />}
    </div>
  );
}

function LiveBlock({ c, l, onJoin }: { c: CoursePage; l: PageLesson; onJoin: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const start = l.startsAt ? new Date(l.startsAt).getTime() : NaN;
  const end = start + (l.durationMin || 60) * 60000;
  const soon = !Number.isNaN(start) && now >= start - 15 * 60000 && now <= end;
  const over = !Number.isNaN(start) && now > end;
  const mins = Math.max(0, Math.round((start - now) / 60000));
  const until = mins >= 1440 ? `in ${Math.round(mins / 1440)} day(s)` : mins >= 60 ? `in ${Math.round(mins / 60)} hour(s)` : `in ${mins} min`;

  const ics = () => {
    if (Number.isNaN(start)) return;
    const f = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fockis Academy//EN", "BEGIN:VEVENT", `UID:${c.code}-${l.key}@fockis`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${l.title} — ${c.name}`, `DESCRIPTION:${window.location.href}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    a.download = `${c.code}-${l.key}.ics`;
    a.click();
  };

  return (
    <div className={`fa-room__live ${soon ? "is-live" : ""}`}>
      <div className="fa-room__liveic">
        <Icon name="video" size={26} />
      </div>
      <div className="fa-room__livebody">
        <small>{soon ? "Happening now" : over ? "This session has ended" : l.startsAt ? `Starts ${until}` : "Date to be announced"}</small>
        <h3>{l.startsAt ? formatWhen(l.startsAt) : "Live session"}</h3>
        <p className="fa-muted">
          {l.durationMin ? `${minutesLabel(l.durationMin)} · ` : ""}On Fockis Meetings. You may need to sign in to Fockis to join.
        </p>
        <div className="fa-room__livebtns">
          {l.joinUrl && !over ? (
            <a className={`fa-btn ${soon ? "fa-btn--primary" : "fa-btn--outline"}`} href={l.joinUrl} target="_blank" rel="noreferrer" onClick={onJoin}>
              <Icon name="video" size={14} /> {soon ? "Join now" : "Open meeting link"}
            </a>
          ) : !over ? (
            <span className="fa-muted">The join link will appear here before the session.</span>
          ) : null}
          {l.recordingUrl && (
            <a className="fa-btn fa-btn--outline" href={l.recordingUrl} target="_blank" rel="noreferrer">
              <Icon name="play" size={14} /> Watch recording
            </a>
          )}
          {!over && l.startsAt && (
            <button className="fa-btn fa-btn--outline" onClick={ics}>
              <Icon name="calendar" size={14} /> Add to calendar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizBlock({ c, l, enr, canTrack, onProgress }: { c: CoursePage; l: PageLesson; enr: EnrollmentSummary | null; canTrack: boolean; onProgress: (e: EnrollmentSummary) => void }) {
  const qs = l.quiz?.questions ?? [];
  const [answers, setAnswers] = useState<number[]>(() => qs.map(() => -1));
  const [result, setResult] = useState<Awaited<ReturnType<typeof learnApi.quiz>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const prev = enr?.quizResults?.find((r) => r.lessonKey === l.key);

  if (!qs.length) return <p className="fa-muted">This test has no questions yet.</p>;

  async function submit() {
    if (answers.some((a) => a < 0)) return setErr("Answer every question first.");
    setBusy(true);
    setErr(null);
    try {
      const r = await learnApi.quiz(c.code, l.key, answers);
      setResult(r);
      onProgress(r.enrollment);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fa-room__quiz">
      <div className="fa-room__quizhead">
        <span>
          {qs.length} question{qs.length === 1 ? "" : "s"} · pass mark {l.quiz?.passPct ?? 70}%
        </span>
        {prev && (
          <span className={prev.passed ? "fa-st-ok" : "fa-error"}>
            Best score {prev.score}% {prev.passed ? "· passed" : ""} · {prev.attempts} attempt{prev.attempts === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {qs.map((q, qi) => {
        const r = result?.results[qi];
        return (
          <fieldset key={qi} className={`fa-room__q ${r ? (r.correct ? "is-right" : "is-wrong") : ""}`}>
            <legend>
              {qi + 1}. {q.prompt}
            </legend>
            {q.options.map((o, oi) => (
              <label key={oi} className={`fa-room__opt ${answers[qi] === oi ? "is-on" : ""} ${r && r.answer === oi ? "is-answer" : ""}`}>
                <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} disabled={!!result} onChange={() => setAnswers(answers.map((a, j) => (j === qi ? oi : a)))} />
                {o}
              </label>
            ))}
            {r?.explain && <p className="fa-room__explain">{r.explain}</p>}
          </fieldset>
        );
      })}
      {result ? (
        <div className={`fa-room__score ${result.passed ? "is-pass" : "is-fail"}`}>
          <b>{result.score}%</b>
          <span>
            {result.correct}/{result.total} correct — {result.passed ? "Passed! This lesson is complete." : `You need ${result.passPct}% to pass.`}
          </span>
          {!result.passed && (
            <button
              className="fa-btn fa-btn--outline fa-btn--sm"
              onClick={() => {
                setResult(null);
                setAnswers(qs.map(() => -1));
              }}
            >
              Try again
            </button>
          )}
        </div>
      ) : canTrack ? (
        <button className="fa-btn fa-btn--primary" disabled={busy} onClick={submit}>
          {busy ? "Checking…" : "Submit answers"}
        </button>
      ) : (
        <p className="fa-muted">Enroll to submit this test and get a score.</p>
      )}
      {err && <p className="fa-error">{err}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ courses created before the Studio

function LegacyModules({ c, done, setDone, unlocked }: { c: CoursePage; done: number[]; setDone: (d: number[]) => void; unlocked: boolean }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const modules = [...c.modules].sort((a, b) => a.order - b.order);
  if (!modules.length) return <p className="fa-muted">The creator hasn&apos;t published lessons yet.</p>;
  return (
    <div className="fa-card fa-pad">
      <h3>Course modules</h3>
      <ol className="fa-st-outline">
        {modules.map((m) => (
          <li key={m.order}>
            <span className={`fa-room__check ${done.includes(m.order) ? "is-done" : ""}`}>{done.includes(m.order) ? <Icon name="check" size={12} /> : m.order}</span>
            <div>
              <b>{m.title}</b>
            </div>
            {unlocked && c.access.enrolled && !done.includes(m.order) && (
              <button
                className="fa-btn fa-btn--outline fa-btn--xs"
                disabled={busy === m.order}
                onClick={async () => {
                  setBusy(m.order);
                  setErr(null);
                  try {
                    const r = await learnApi.completeModule(c.code, m.order);
                    setDone(r.completedModuleOrders ?? [...done, m.order]);
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : "Could not save.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                Mark done
              </button>
            )}
          </li>
        ))}
      </ol>
      {err && <p className="fa-error">{err}</p>}
    </div>
  );
}
