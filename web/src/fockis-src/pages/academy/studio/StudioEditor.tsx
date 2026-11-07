import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, DashShell, Progress } from "../../../components/academy/market/Shared";
import { themeFor } from "../../../components/academy/market/FaCourseCard";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademySession } from "../../../lib/academySession";
import { listTemplates } from "../../../lib/certificatesApi";
import {
  KIND_LABEL,
  LESSON_ICON,
  LESSON_LABEL,
  formatPrice,
  mediaUrl,
  studioApi,
  uploadStudioFile,
  type EditorLesson,
  type Kind,
  type Learner,
  type LessonType,
  type StudioCourse,
  type StudioSave,
} from "../../../lib/studioApi";
import { SignInGate } from "../AcademyPortal";
import { STUDIO_NAV } from "./CreatorStudio";

type Tab = "details" | "content" | "pricing" | "certificate" | "learners";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "details", label: "Details", icon: "pen" },
  { key: "content", label: "Lessons & sessions", icon: "layers" },
  { key: "pricing", label: "Price & access", icon: "dollar" },
  { key: "certificate", label: "Certificate", icon: "award" },
  { key: "learners", label: "Learners", icon: "users" },
];
const CATEGORIES = ["Food & Baking", "Business", "Technology", "Design & Arts", "Health & Wellness", "Languages", "Music", "Personal Growth", "Education", "Other"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "HTG", "DOP", "MXN", "BRL", "JPY", "AUD"];

/** datetime-local <-> ISO */
const toLocal = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : undefined);

function blankLesson(type: LessonType): EditorLesson {
  const titles: Record<LessonType, string> = { video: "New video lesson", pdf: "Handout (PDF)", text: "Reading", quiz: "Knowledge check", live: "Live session" };
  return {
    title: titles[type],
    type,
    preview: false,
    ...(type === "quiz" ? { quiz: { passPct: 70, questions: [{ prompt: "", options: ["", ""], answer: 0 }] } } : {}),
    ...(type === "live" ? { durationMin: 60 } : {}),
  };
}

/** /academy/studio/:code — edit one offering. */
export default function StudioEditor() {
  const { code = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const session = useAcademySession();
  const tab = (params.get("tab") as Tab) || "details";
  const load = useAcademyLoad(() => (session.status === "user" ? studioApi.get(code) : Promise.reject(new Error("guest"))), [code, session.status]);

  const [draft, setDraft] = useState<StudioCourse | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (load.state.status === "ready") {
      setDraft(load.state.data);
      setDirty(false);
    }
  }, [load.state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (session.status === "loading") return <div className="fa-root fa-page" />;
  if (session.status === "guest") return <SignInGate what="Creator Studio" />;
  if (load.state.status === "error")
    return (
      <div className="fa-root">
        <DashShell items={STUDIO_NAV} active="My classes" sub="Creator Studio">
          <div className="fa-card fa-pad">
            <p className="fa-error">{load.state.error}</p>
            <Link className="fa-btn fa-btn--outline" to="/academy/studio">
              Back to my classes
            </Link>
          </div>
        </DashShell>
      </div>
    );
  if (!draft)
    return (
      <div className="fa-root">
        <DashShell items={STUDIO_NAV} active="My classes" sub="Creator Studio">
          <p className="fa-muted">Loading…</p>
        </DashShell>
      </div>
    );

  const c = draft;
  const set = (patch: Partial<StudioCourse>) => {
    setDraft({ ...c, ...patch });
    setDirty(true);
    setMsg(null);
  };
  const setLessons = (lessons: EditorLesson[]) => set({ lessons });
  const go = (t: Tab) => setParams({ tab: t }, { replace: true });

  async function save(extra: StudioSave = {}, okText = "Saved.") {
    setBusy(true);
    setMsg(null);
    try {
      const body: StudioSave = {
        name: c.name,
        kind: c.kind,
        brandName: c.brandName ?? "",
        category: c.category ?? "",
        level: c.level ?? "all",
        language: c.language ?? "",
        summary: c.summary ?? "",
        description: c.description ?? "",
        coverUrl: c.coverUrl ?? "",
        isFree: c.isFree,
        price: c.isFree ? c.price || 0 : Number(c.price) || 0,
        currency: c.currency || "USD",
        startsAt: c.startsAt,
        capacity: Number(c.capacity) || 0,
        visibility: c.visibility,
        enrollmentOpen: c.enrollmentOpen,
        certificateEnabled: c.certificateEnabled !== false,
        ...(c.certificateTemplateId ? { certificateTemplateId: c.certificateTemplateId } : { clearCertificateTemplate: true }),
        ...(c.institutionId ? { institutionId: c.institutionId, teacherKey: c.teacherKey ?? "" } : { clearInstitution: true }),
        lessons: c.lessons.map((l) => ({
          ...l,
          durationMin: l.durationMin ? Number(l.durationMin) : undefined,
          videoUrl: l.videoUrl?.trim() || undefined,
          joinUrl: l.joinUrl?.trim() || undefined,
          recordingUrl: l.recordingUrl?.trim() || undefined,
        })),
        ...extra,
      };
      const saved = await studioApi.update(c.code, body);
      setDraft(saved);
      setDirty(false);
      setMsg({ tone: "ok", text: okText });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${c.name}”? If people already enrolled it is unpublished instead, so they keep access.`)) return;
    try {
      const r = await studioApi.remove(c.code);
      if (r.archived) {
        setMsg({ tone: "ok", text: `Unpublished — ${r.learners} learner(s) keep their access.` });
        load.reload();
      } else navigate("/academy/studio", { replace: true });
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "Could not delete." });
    }
  }

  const published = c.visibility === "public";
  const live = c.lessons.filter((l) => l.type === "live").length;

  return (
    <div className="fa-root">
      <DashShell items={STUDIO_NAV} active="My classes" sub="Creator Studio">
        <div className="fa-st-head">
          <Link to="/academy/studio" className="fa-link">
            <Icon name="left" size={13} /> My classes
          </Link>
          <div className="fa-st-head__row">
            <div>
              <h2>{c.name}</h2>
              <div className="fa-st-head__meta">
                <Badge tone={published ? "green" : c.visibility === "draft" ? "gray" : "blue"}>{published ? "Published" : c.visibility === "draft" ? "Draft" : c.visibility === "hidden" ? "Unlisted" : c.visibility === "school" ? "School members" : "Private"}</Badge>
                <span>{KIND_LABEL[c.kind]}</span>
                <span>·</span>
                <span>{formatPrice(c.isFree, c.price, c.currency)}</span>
                <span>·</span>
                <span>
                  {c.lessons.length} lessons{live ? `, ${live} live` : ""}
                </span>
                <span>·</span>
                <code>{c.code}</code>
              </div>
            </div>
            <div className="fa-st-head__btns">
              {c.visibility !== "draft" && (
                <Link className="fa-btn fa-btn--outline" to={`/academy/learn/${encodeURIComponent(c.code)}`} target="_blank">
                  <Icon name="expand" size={14} /> View page
                </Link>
              )}
              <button className="fa-btn fa-btn--outline" disabled={busy || !dirty} onClick={() => save()}>
                {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
              </button>
              {published ? (
                <button className="fa-btn fa-btn--outline" disabled={busy} onClick={() => save({ visibility: "draft" }, "Unpublished. It is hidden from the catalog.")}>
                  Unpublish
                </button>
              ) : (
                <button className="fa-btn fa-btn--primary" disabled={busy} onClick={() => save({ visibility: "public" }, "Published! Learners can now find it in the catalog.")}>
                  <Icon name="send" size={14} /> Publish
                </button>
              )}
            </div>
          </div>
          {msg && <p className={msg.tone === "ok" ? "fa-st-ok" : "fa-error"}>{msg.text}</p>}
        </div>

        <nav className="fa-tabs fa-st-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "is-active" : ""} onClick={() => go(t.key)}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </nav>

        {tab === "details" && <DetailsTab c={c} set={set} />}
        {tab === "content" && <ContentTab c={c} setLessons={setLessons} open={open} setOpen={setOpen} />}
        {tab === "pricing" && <PricingTab c={c} set={set} />}
        {tab === "certificate" && <CertificateTab c={c} set={set} />}
        {tab === "learners" && <LearnersTab c={c} />}

        <div className="fa-st-danger">
          <button className="fa-link fa-link--danger" onClick={remove}>
            Delete this {KIND_LABEL[c.kind].toLowerCase()}
          </button>
        </div>
      </DashShell>
    </div>
  );
}

// =====================================================================
// DETAILS
// =====================================================================

function DetailsTab({ c, set }: { c: StudioCourse; set: (p: Partial<StudioCourse>) => void }) {
  const [up, setUp] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function cover(file?: File) {
    if (!file) return;
    setErr(null);
    setUp(0);
    try {
      const r = await uploadStudioFile(file, "image", setUp);
      set({ coverUrl: r.url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUp(null);
    }
  }

  return (
    <div className="fa-st-cols">
      <div className="fa-card fa-pad fa-fields">
        <label className="fa-field">
          <span>
            Title<i>*</i>
          </span>
          <input value={c.name} maxLength={160} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <div className="fa-row2">
          <label className="fa-field">
            <span>Type</span>
            <select value={c.kind} onChange={(e) => set({ kind: e.target.value as Kind })}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <OfferedBy c={c} set={set} />
        </div>
        <label className="fa-field">
          <span>Short summary</span>
          <input value={c.summary ?? ""} maxLength={300} placeholder="One sentence that appears on the class card" onChange={(e) => set({ summary: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Description</span>
          <textarea rows={7} value={c.description ?? ""} maxLength={20000} placeholder="What will people learn? Who is it for? What should they bring?" onChange={(e) => set({ description: e.target.value })} />
        </label>
        <div className="fa-row3">
          <label className="fa-field">
            <span>Category</span>
            <select value={c.category ?? ""} onChange={(e) => set({ category: e.target.value })}>
              <option value="">Choose…</option>
              {CATEGORIES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="fa-field">
            <span>Level</span>
            <select value={c.level ?? "all"} onChange={(e) => set({ level: e.target.value as StudioCourse["level"] })}>
              <option value="all">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="fa-field">
            <span>Language</span>
            <input value={c.language ?? ""} maxLength={60} placeholder="English" onChange={(e) => set({ language: e.target.value })} />
          </label>
        </div>
        {c.kind !== "course" && (
          <label className="fa-field">
            <span>Date and time (first session)</span>
            <input type="datetime-local" value={toLocal(c.startsAt)} onChange={(e) => set({ startsAt: fromLocal(e.target.value) })} />
          </label>
        )}
      </div>
      <div className="fa-card fa-pad">
        <h4 className="fa-st-h4">Cover image</h4>
        <div className="fa-st-cover" style={c.coverUrl ? undefined : { background: themeFor(c.code) }}>
          {c.coverUrl ? <img src={mediaUrl(c.coverUrl)} alt="" /> : <Icon name="image" size={34} />}
        </div>
        {up !== null && <Progress value={up} />}
        <div className="fa-st-cover__btns">
          <label className="fa-btn fa-btn--outline fa-btn--sm">
            <Icon name="upload" size={14} /> {c.coverUrl ? "Replace" : "Upload"}
            <input type="file" accept="image/*" hidden onChange={(e) => cover(e.target.files?.[0])} />
          </label>
          {c.coverUrl && (
            <button className="fa-link" onClick={() => set({ coverUrl: "" })}>
              Remove
            </button>
          )}
        </div>
        {err && <p className="fa-error">{err}</p>}
        <p className="fa-muted fa-st-hint">A 16:9 photo works best — your storefront, a finished dish, you teaching.</p>
      </div>
    </div>
  );
}

function OfferedBy({ c, set }: { c: StudioCourse; set: (p: Partial<StudioCourse>) => void }) {
  const schools = useAcademyLoad(studioApi.schools);
  const list = schools.state.status === "ready" ? schools.state.data : [];
  const approved = list.filter((x) => x.status === "approved");
  if (!c.institutionId && approved.length === 0)
    return (
      <label className="fa-field">
        <span>Business or brand name</span>
        <input value={c.brandName ?? ""} maxLength={120} placeholder="Shown as “by …”" onChange={(e) => set({ brandName: e.target.value })} />
        {list.length > 0 && <small className="fa-muted">Your school can offer classes once Fockis Academy approves it.</small>}
      </label>
    );
  return (
    <div className="fa-field">
      <span>Offered by</span>
      <select
        value={c.institutionId ?? ""}
        onChange={(e) => {
          const id = e.target.value || undefined;
          const sch = approved.find((x) => x._id === id);
          set({ institutionId: id, teacherKey: undefined, ...(sch ? { brandName: sch.name } : {}), ...(!id && c.visibility === "school" ? { visibility: "draft" } : {}) });
        }}
      >
        <option value="">Me{c.brandName && !c.institutionId ? ` (${c.brandName})` : ""}</option>
        {approved.map((x) => (
          <option key={x._id} value={x._id}>
            {x.name} — verified school
          </option>
        ))}
      </select>
      {!c.institutionId && (
        <input value={c.brandName ?? ""} maxLength={120} placeholder="Brand name shown as “by …” (optional)" onChange={(e) => set({ brandName: e.target.value })} />
      )}
      {c.institutionId && (() => {
        const sch = approved.find((x) => x._id === c.institutionId);
        const list = sch?.teachers ?? [];
        return (
          <>
            <select value={c.teacherKey ?? ""} onChange={(e) => set({ teacherKey: e.target.value || undefined })} aria-label="Teacher">
              <option value="">Teacher: not set</option>
              {list.map((t) => (
                <option key={t.key} value={t.key}>
                  Teacher: {t.name}
                  {t.title ? ` — ${t.title}` : ""}
                  {t.department ? ` (${t.department})` : ""}
                </option>
              ))}
            </select>
            {list.length === 0 && (
              <small className="fa-muted">
                Add teachers in <Link to={`/academy/school/${c.institutionId}?tab=teachers`}>My school → Teachers</Link>, then pick one here.
              </small>
            )}
          </>
        );
      })()}
    </div>
  );
}

// =====================================================================
// CONTENT
// =====================================================================

function ContentTab({ c, setLessons, open, setOpen }: { c: StudioCourse; setLessons: (l: EditorLesson[]) => void; open: number | null; setOpen: (i: number | null) => void }) {
  const lessons = c.lessons;
  const update = (i: number, patch: Partial<EditorLesson>) => setLessons(lessons.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= lessons.length) return;
    const next = [...lessons];
    [next[i], next[j]] = [next[j], next[i]];
    setLessons(next);
    setOpen(open === i ? j : open === j ? i : open);
  };
  const add = (t: LessonType) => {
    setLessons([...lessons, blankLesson(t)]);
    setOpen(lessons.length);
  };
  const del = (i: number) => {
    if (!window.confirm(`Remove “${lessons[i].title}”? Learners lose progress on this lesson.`)) return;
    setLessons(lessons.filter((_, j) => j !== i));
    setOpen(null);
  };

  return (
    <div className="fa-st-content">
      <div className="fa-st-add fa-card fa-pad">
        <b>Add to this {KIND_LABEL[c.kind].toLowerCase()}</b>
        <div>
          {(Object.keys(LESSON_LABEL) as LessonType[]).map((t) => (
            <button key={t} className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => add(t)}>
              <Icon name={LESSON_ICON[t]} size={14} /> {LESSON_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
      {lessons.length === 0 && (
        <div className="fa-card fa-st-empty">
          <span className="fa-st-empty__ic">
            <Icon name="layers" size={28} />
          </span>
          <h3>No lessons yet</h3>
          <p className="fa-muted">Add videos, PDF handouts, readings, tests and live sessions above. Learners go through them in this order.</p>
        </div>
      )}
      <ol className="fa-st-lessons">
        {lessons.map((l, i) => (
          <li key={l.key ?? `new-${i}`} className={`fa-card fa-st-lesson ${open === i ? "is-open" : ""}`}>
            <div className="fa-st-lesson__row">
              <span className={`fa-st-lesson__ic t-${l.type}`}>
                <Icon name={LESSON_ICON[l.type]} size={15} />
              </span>
              <button className="fa-st-lesson__title" onClick={() => setOpen(open === i ? null : i)}>
                <small>
                  {i + 1}. {LESSON_LABEL[l.type]}
                  {l.preview ? " · free preview" : ""}
                  {l.type === "live" && l.startsAt ? ` · ${new Date(l.startsAt).toLocaleString()}` : ""}
                </small>
                <b>{l.title || "Untitled"}</b>
              </button>
              <LessonWarnings l={l} />
              <div className="fa-st-lesson__tools">
                <button className="fa-icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button className="fa-icon-btn" aria-label="Move down" disabled={i === lessons.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="chevron" size={14} />
                </button>
                <button className="fa-icon-btn" aria-label={open === i ? "Collapse" : "Edit"} onClick={() => setOpen(open === i ? null : i)}>
                  <Icon name="pen" size={14} />
                </button>
              </div>
            </div>
            {open === i && <LessonEditor l={l} onChange={(p) => update(i, p)} onDelete={() => del(i)} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function lessonProblems(l: EditorLesson): string[] {
  const out: string[] = [];
  if (l.type === "video" && !l.videoUrl && !l.storageKey) out.push("No video");
  if (l.type === "pdf" && !l.storageKey) out.push("No PDF");
  if (l.type === "text" && !l.body?.trim()) out.push("Empty");
  if (l.type === "quiz" && !l.quiz?.questions?.some((q) => q.prompt.trim())) out.push("No questions");
  if (l.type === "live" && !l.startsAt) out.push("No date");
  if (l.type === "live" && !l.joinUrl) out.push("No join link");
  return out;
}

function LessonWarnings({ l }: { l: EditorLesson }) {
  const p = lessonProblems(l);
  if (!p.length) return null;
  return <span className="fa-st-warn">{p.join(" · ")}</span>;
}

function FileField({ l, kind, onChange }: { l: EditorLesson; kind: "video" | "pdf"; onChange: (p: Partial<EditorLesson>) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function pick(file?: File) {
    if (!file) return;
    setErr(null);
    setPct(0);
    try {
      const r = await uploadStudioFile(file, kind, setPct);
      onChange({ storageKey: r.storageKey, fileName: r.fileName, mimeType: r.mimeType, size: r.size, ...(kind === "video" ? { videoUrl: "" } : {}) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setPct(null);
    }
  }
  return (
    <div className="fa-st-file">
      {l.storageKey ? (
        <div className="fa-st-file__has">
          <Icon name={kind === "pdf" ? "file" : "play"} size={16} />
          <span>{l.fileName || "Uploaded file"}</span>
          {l.size ? <small>{(l.size / 1024 / 1024).toFixed(1)} MB</small> : null}
          <button className="fa-link" onClick={() => onChange({ storageKey: undefined, fileName: undefined, mimeType: undefined, size: undefined })}>
            Remove
          </button>
        </div>
      ) : (
        <label className="fa-st-drop">
          <Icon name="upload" size={20} />
          <span>{pct === null ? `Upload a ${kind === "pdf" ? "PDF" : "video file"}` : `Uploading… ${pct}%`}</span>
          <small>{kind === "pdf" ? "PDF up to 1 GB" : "MP4, WebM or MOV"}</small>
          <input type="file" hidden accept={kind === "pdf" ? "application/pdf" : "video/*"} disabled={pct !== null} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      )}
      {pct !== null && <Progress value={pct} />}
      {err && <p className="fa-error">{err}</p>}
    </div>
  );
}

function LessonEditor({ l, onChange, onDelete }: { l: EditorLesson; onChange: (p: Partial<EditorLesson>) => void; onDelete: () => void }) {
  return (
    <div className="fa-st-lesson__body fa-fields">
      <div className="fa-row2">
        <label className="fa-field">
          <span>Title</span>
          <input value={l.title} maxLength={160} onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        <label className="fa-field">
          <span>Duration (minutes)</span>
          <input type="number" min={0} value={l.durationMin ?? ""} onChange={(e) => onChange({ durationMin: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
      </div>

      {l.type === "video" && (
        <>
          <FileField l={l} kind="video" onChange={onChange} />
          {!l.storageKey && (
            <label className="fa-field">
              <span>…or paste a video link (YouTube, Vimeo, MP4)</span>
              <input value={l.videoUrl ?? ""} placeholder="https://" onChange={(e) => onChange({ videoUrl: e.target.value })} />
            </label>
          )}
        </>
      )}
      {l.type === "pdf" && <FileField l={l} kind="pdf" onChange={onChange} />}
      {l.type === "live" && (
        <>
          <div className="fa-row2">
            <label className="fa-field">
              <span>Starts</span>
              <input type="datetime-local" value={toLocal(l.startsAt)} onChange={(e) => onChange({ startsAt: fromLocal(e.target.value) })} />
            </label>
            <label className="fa-field">
              <span>Fockis Meetings join link</span>
              <input value={l.joinUrl ?? ""} placeholder={`${window.location.origin}/meet/…`} onChange={(e) => onChange({ joinUrl: e.target.value })} />
            </label>
          </div>
          <p className="fa-note">
            <Icon name="video" size={14} /> Schedule the session in{" "}
            <a href="/meetings" target="_blank" rel="noreferrer">
              Fockis Meetings
            </a>{" "}
            and paste its join link here. Only enrolled learners see the link.
          </p>
          <label className="fa-field">
            <span>Recording link (add after the session)</span>
            <input value={l.recordingUrl ?? ""} placeholder="https://" onChange={(e) => onChange({ recordingUrl: e.target.value })} />
          </label>
        </>
      )}
      {l.type === "quiz" && <QuizEditor l={l} onChange={onChange} />}
      <label className="fa-field">
        <span>{l.type === "text" ? "Lesson text" : "Notes for learners (optional)"}</span>
        <textarea rows={l.type === "text" ? 10 : 3} value={l.body ?? ""} onChange={(e) => onChange({ body: e.target.value })} />
      </label>
      <div className="fa-st-lesson__foot">
        <label className="fa-check">
          <input type="checkbox" checked={!!l.preview} onChange={(e) => onChange({ preview: e.target.checked })} /> Free preview — anyone can open this lesson before enrolling
        </label>
        <button className="fa-link fa-link--danger" onClick={onDelete}>
          Remove lesson
        </button>
      </div>
    </div>
  );
}

function QuizEditor({ l, onChange }: { l: EditorLesson; onChange: (p: Partial<EditorLesson>) => void }) {
  const quiz = l.quiz ?? { passPct: 70, questions: [] };
  const setQ = (questions: typeof quiz.questions) => onChange({ quiz: { ...quiz, questions } });
  return (
    <div className="fa-st-quiz">
      <label className="fa-field fa-st-quiz__pass">
        <span>Pass mark (%)</span>
        <input type="number" min={0} max={100} value={quiz.passPct} onChange={(e) => onChange({ quiz: { ...quiz, passPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } })} />
      </label>
      {quiz.questions.map((q, qi) => (
        <div key={qi} className="fa-st-q">
          <div className="fa-st-q__head">
            <b>Question {qi + 1}</b>
            <button className="fa-link fa-link--danger" onClick={() => setQ(quiz.questions.filter((_, j) => j !== qi))}>
              Remove
            </button>
          </div>
          <input className="fa-st-q__prompt" value={q.prompt} placeholder="Ask something…" onChange={(e) => setQ(quiz.questions.map((x, j) => (j === qi ? { ...x, prompt: e.target.value } : x)))} />
          {q.options.map((o, oi) => (
            <div key={oi} className="fa-st-q__opt">
              <input
                type="radio"
                name={`q-${l.key ?? "n"}-${qi}`}
                checked={q.answer === oi}
                aria-label="Correct answer"
                onChange={() => setQ(quiz.questions.map((x, j) => (j === qi ? { ...x, answer: oi } : x)))}
              />
              <input value={o} placeholder={`Answer ${oi + 1}`} onChange={(e) => setQ(quiz.questions.map((x, j) => (j === qi ? { ...x, options: x.options.map((y, k) => (k === oi ? e.target.value : y)) } : x)))} />
              {q.options.length > 2 && (
                <button
                  className="fa-icon-btn"
                  aria-label="Remove answer"
                  onClick={() =>
                    setQ(quiz.questions.map((x, j) => (j === qi ? { ...x, options: x.options.filter((_, k) => k !== oi), answer: x.answer === oi ? 0 : x.answer > oi ? x.answer - 1 : x.answer } : x)))
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="fa-st-q__foot">
            {q.options.length < 8 && (
              <button className="fa-link" onClick={() => setQ(quiz.questions.map((x, j) => (j === qi ? { ...x, options: [...x.options, ""] } : x)))}>
                + Add answer
              </button>
            )}
            <small className="fa-muted">Select the circle next to the correct answer.</small>
          </div>
          <input className="fa-st-q__explain" value={q.explain ?? ""} placeholder="Explanation shown after answering (optional)" onChange={(e) => setQ(quiz.questions.map((x, j) => (j === qi ? { ...x, explain: e.target.value } : x)))} />
        </div>
      ))}
      <button className="fa-btn fa-btn--outline fa-btn--sm" onClick={() => setQ([...quiz.questions, { prompt: "", options: ["", ""], answer: 0 }])}>
        <Icon name="plus" size={13} /> Add question
      </button>
    </div>
  );
}

// =====================================================================
// PRICING & ACCESS
// =====================================================================

function PricingTab({ c, set }: { c: StudioCourse; set: (p: Partial<StudioCourse>) => void }) {
  return (
    <div className="fa-st-cols">
      <div className="fa-card fa-pad fa-fields">
        <h4 className="fa-st-h4">Price</h4>
        <div className="fa-st-pricepick">
          <button className={`fa-st-kind ${c.isFree ? "is-on" : ""}`} onClick={() => set({ isFree: true })}>
            <Icon name="heart" size={20} />
            <b>Free</b>
            <small>Anyone with an Academy account can join.</small>
          </button>
          <button className={`fa-st-kind ${!c.isFree ? "is-on" : ""}`} onClick={() => set({ isFree: false, price: c.price > 0 ? c.price : 25 })}>
            <Icon name="dollar" size={20} />
            <b>Paid</b>
            <small>Learners pay through Fockis secure checkout.</small>
          </button>
        </div>
        {!c.isFree && (
          <div className="fa-row2">
            <label className="fa-field">
              <span>Price</span>
              <input type="number" min={0.5} step={0.01} value={c.price} onChange={(e) => set({ price: Number(e.target.value) })} />
            </label>
            <label className="fa-field">
              <span>Currency</span>
              <select value={c.currency} onChange={(e) => set({ currency: e.target.value })}>
                {CURRENCIES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {!c.isFree && <p className="fa-note">Payments use your existing Fockis payment system (Stripe). Each purchase unlocks the class for that learner only.</p>}
      </div>
      <div className="fa-card fa-pad fa-fields">
        <h4 className="fa-st-h4">Who can find and join it</h4>
        <label className="fa-field">
          <span>Visibility</span>
          <select value={c.visibility} onChange={(e) => set({ visibility: e.target.value as StudioCourse["visibility"] })}>
            <option value="draft">Draft — only you</option>
            <option value="public">Published — listed in the Academy catalog</option>
            <option value="hidden">Unlisted — anyone with the link</option>
            <option value="private">Private — anyone with the link, not listed</option>
            {c.institutionId && <option value="school">School members only — students with your school login</option>}
          </select>
        </label>
        <label className="fa-check">
          <input type="checkbox" checked={c.enrollmentOpen} onChange={(e) => set({ enrollmentOpen: e.target.checked })} /> Accept new enrollments
        </label>
        <label className="fa-field">
          <span>Seat limit (0 = unlimited)</span>
          <input type="number" min={0} value={c.capacity ?? 0} onChange={(e) => set({ capacity: Number(e.target.value) || 0 })} />
        </label>
        <div className="fa-st-share">
          <span className="fa-muted">Share link</span>
          <code>{`${window.location.origin}/academy/learn/${c.code}`}</code>
          <button className="fa-link" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/academy/learn/${c.code}`)}>
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// CERTIFICATE
// =====================================================================

function CertificateTab({ c, set }: { c: StudioCourse; set: (p: Partial<StudioCourse>) => void }) {
  const tpl = useAcademyLoad(listTemplates);
  const list = tpl.state.status === "ready" ? tpl.state.data : [];
  return (
    <div className="fa-card fa-pad fa-fields fa-st-cert">
      <label className="fa-check fa-check--lg">
        <input type="checkbox" checked={c.certificateEnabled !== false} onChange={(e) => set({ certificateEnabled: e.target.checked })} />
        <span>
          <b>Give a Fockis certificate automatically</b>
          <small>When a learner finishes every lesson and passes every test, Fockis issues a certificate with a QR code, a unique number and their enrollment ID.</small>
        </span>
      </label>
      {c.certificateEnabled !== false && (
        <>
          <label className="fa-field">
            <span>Certificate design</span>
            <select value={c.certificateTemplateId ?? ""} onChange={(e) => set({ certificateTemplateId: e.target.value || undefined })}>
              <option value="">{list.length ? "My most recent design" : "Fockis Signature (default)"}</option>
              {list.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <p className="fa-muted">
            The certificate shows <b>{c.brandName || "Fockis Academy"}</b> as the issuer and your name as the instructor.{" "}
            <Link to="/academy/instructor/certificates/designer">Design your own certificate</Link>.
          </p>
        </>
      )}
    </div>
  );
}

// =====================================================================
// LEARNERS
// =====================================================================

function LearnersTab({ c }: { c: StudioCourse }) {
  const r = useAcademyLoad(() => studioApi.learners(c.code), [c.code]);
  const quizzes = useMemo(() => c.lessons.filter((l) => l.type === "quiz"), [c.lessons]);
  if (r.state.status === "loading") return <p className="fa-muted">Loading learners…</p>;
  if (r.state.status === "error") return <p className="fa-error">{r.state.error}</p>;
  const list: Learner[] = r.state.data;
  if (!list.length)
    return (
      <div className="fa-card fa-st-empty">
        <span className="fa-st-empty__ic">
          <Icon name="users" size={28} />
        </span>
        <h3>No learners yet</h3>
        <p className="fa-muted">{c.visibility === "draft" ? "Publish it so people can find and join." : "Share your class link to get your first learners."}</p>
      </div>
    );
  return (
    <div className="fa-card fa-pad">
      <div className="fa-tablewrap">
        <table className="fa-table">
          <thead>
            <tr>
              <th>Learner</th>
              <th>Enrollment ID</th>
              <th>Joined</th>
              <th>Access</th>
              <th>Progress</th>
              {quizzes.map((q) => (
                <th key={q.key}>{q.title}</th>
              ))}
              <th>Certificate</th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.enrollmentId}>
                <td>
                  <b>{x.name}</b>
                  <br />
                  <small className="fa-muted">{x.email}</small>
                </td>
                <td>
                  <code>{x.enrollmentNumber}</code>
                </td>
                <td>{x.enrolledAt ? new Date(x.enrolledAt).toLocaleDateString() : "—"}</td>
                <td>{x.accessType === "paid" ? formatPrice(false, x.paidAmount ?? 0, x.paidCurrency) : "Free"}</td>
                <td style={{ minWidth: 120 }}>
                  <Progress value={x.progress} /> <small>{x.progress}%</small>
                </td>
                {x.quizzes.map((q, i) => (
                  <td key={i}>{q ? <Badge tone={q.passed ? "green" : "red"}>{q.score}%</Badge> : <span className="fa-muted">—</span>}</td>
                ))}
                <td>{x.certificateId ? <Badge tone="green">Issued</Badge> : <span className="fa-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
