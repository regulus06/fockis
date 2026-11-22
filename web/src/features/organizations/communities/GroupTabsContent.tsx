/**
 * GroupTabsContent.tsx — Discussions (announcements, notices, discussions,
 * messages), Bible Study, Prayer Requests, Documents and Tasks tabs.
 */

import { useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, CheckCircle2, Download, FileText, FileUp, HandHeart, Lock, Loader2, Megaphone, MessageCircle, MessageSquare, Paperclip, Pencil, Pin, Plus, Send, Trash2, ListTodo } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { formatBytes } from "../api/mediaApi";
import { communitiesApi, type Lesson, type Post, type Prayer, type Task } from "./communitiesApi";
import { Empty, Field, Modal, Tone, fmtDate } from "./GroupParts";
import { MessageDialog } from "./GroupTabsPeople";
import { ErrorBox, Loading, act, toLocalInput, useLoad, type TabProps } from "./GroupTabKit";

/* ============================================================================
 * Discussions & announcements
 * ========================================================================== */

export function DiscussionsTab({ organizationId, group, notify }: TabProps) {
  const [kind, setKind] = useState<"announcement" | "discussion">(group.settings.services.discussions ? "discussion" : "announcement");
  const list = useLoad((s) => communitiesApi.posts(organizationId, group.id, kind, s), [organizationId, group.id, kind]);
  const teams = useLoad((s) => (group.viewer.canCoordinate ? communitiesApi.teams(organizationId, group.id, s) : Promise.resolve(null)), [organizationId, group.id]);
  const [composing, setComposing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [reply, setReply] = useState<Record<string, string>>({});

  async function comment(p: Post) {
    const text = (reply[p.id] ?? "").trim();
    if (!text) return;
    if (await act(notify, () => communitiesApi.comment(organizationId, group.id, p.id, text), "Reply posted.", "The reply could not be posted.")) {
      setReply((r) => ({ ...r, [p.id]: "" }));
      list.reload();
    }
  }
  async function remove(p: Post, commentId?: string) {
    if (!window.confirm(commentId ? "Delete this reply?" : "Delete this post?")) return;
    if (await act(notify, () => communitiesApi.deletePost(organizationId, group.id, p.id, commentId), "Deleted.", "It could not be deleted.")) list.reload();
  }

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <div className="mn-seg" role="tablist" aria-label="Communication">
          {group.settings.services.discussions && (
            <button type="button" role="tab" aria-selected={kind === "discussion"} className={kind === "discussion" ? "is-on" : ""} onClick={() => setKind("discussion")}>
              Discussions
            </button>
          )}
          <button type="button" role="tab" aria-selected={kind === "announcement"} className={kind === "announcement" ? "is-on" : ""} onClick={() => setKind("announcement")}>
            Announcements
          </button>
        </div>
        <div className="mn-row">
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setMessaging(true)}>
            <MessageSquare aria-hidden="true" /> {group.viewer.canCoordinate ? "Message members" : "Message leaders"}
          </button>
          {list.data?.canPost && (
            <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setComposing(true)}>
              {kind === "discussion" ? <MessageCircle aria-hidden="true" /> : <Megaphone aria-hidden="true" />} {kind === "discussion" ? "Start a discussion" : "New announcement"}
            </button>
          )}
        </div>
      </div>
      {list.error && <ErrorBox text={list.error} />}
      {!list.data && !list.error && <Loading />}
      {list.data && list.data.items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={kind === "discussion" ? MessageCircle : Megaphone} title={kind === "discussion" ? "No discussions yet" : "No announcements yet"} text={kind === "discussion" ? "Start a conversation with the group." : "Leaders' announcements and important notices appear here."} />
        </div>
      )}
      {list.data?.items.map((p) => (
        <article key={p.id} className={"mn-panel gc-post" + (p.kind === "notice" ? " gc-post--notice" : "")}>
          <header className="gc-post__head">
            <div>
              <b>
                {p.pinned && <Pin aria-hidden="true" className="gc-pin" />}
                {p.title || (p.kind === "notice" ? "Important notice" : p.kind === "announcement" ? "Announcement" : "Discussion")}
              </b>
              <span>
                {p.authorName} · {fmtDate(p.createdAt, true)}
                {p.audience !== "all" ? ` · ${p.audience === "leaders" ? "leadership only" : "team"}` : ""}
              </span>
            </div>
            {p.kind === "notice" && <Tone tone="red">Important</Tone>}
            {p.canDelete && (
              <button type="button" className="mn-iconbtn" aria-label="Delete post" onClick={() => remove(p)}>
                <Trash2 aria-hidden="true" />
              </button>
            )}
          </header>
          <p className="gc-pre">{p.body}</p>
          {p.attachmentUrls.length > 0 && (
            <div className="gc-files">
              {p.attachmentUrls.map((u, i) => (
                <a key={u} className="mn-chip" href={mediaUrl(u) ?? u} target="_blank" rel="noreferrer">
                  <Paperclip aria-hidden="true" /> File {i + 1}
                </a>
              ))}
            </div>
          )}
          <div className="gc-comments">
            {p.comments.map((c) => (
              <div key={c.id} className="gc-comment">
                <b>{c.authorName}</b> <span>{fmtDate(c.createdAt, true)}</span>
                <p className="gc-pre">{c.body}</p>
                {c.canDelete && (
                  <button type="button" className="mn-link" onClick={() => remove(p, c.id)}>
                    Delete
                  </button>
                )}
              </div>
            ))}
            <form
              className="gc-reply"
              onSubmit={(e) => {
                e.preventDefault();
                void comment(p);
              }}
            >
              <input className="mn-input" placeholder="Write a reply…" value={reply[p.id] ?? ""} maxLength={2000} onChange={(e) => setReply((r) => ({ ...r, [p.id]: e.target.value }))} />
              <button type="submit" className="mn-btn mn-btn--outline mn-btn--sm" disabled={!(reply[p.id] ?? "").trim()}>
                <Send aria-hidden="true" />
              </button>
            </form>
          </div>
        </article>
      ))}
      {composing && (
        <PostDialog
          organizationId={organizationId}
          groupId={group.id}
          kind={kind}
          teams={teams.data?.items ?? []}
          onClose={() => setComposing(false)}
          onDone={() => {
            setComposing(false);
            notify("ok", kind === "discussion" ? "Discussion started." : "Announcement published. Members were notified.");
            list.reload();
          }}
        />
      )}
      {messaging && <MessageDialog organizationId={organizationId} groupId={group.id} canTarget={group.viewer.canCoordinate} onClose={() => setMessaging(false)} notify={notify} />}
    </div>
  );
}

function PostDialog({ organizationId, groupId, kind, teams, onClose, onDone }: { organizationId: string; groupId: string; kind: "announcement" | "discussion"; teams: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ kind: kind as string, title: "", body: "", audience: "all", teamId: "", pinned: false });
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState<null | "save" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  async function attach(file: File) {
    setBusy("file");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      setFiles((x) => [...x, up.fileUrl].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.body.trim()) return setError("Write something first.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.createPost(organizationId, groupId, { ...f, attachmentUrls: files });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "It could not be posted.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={kind === "discussion" ? "Start a discussion" : "New announcement"}
      onClose={onClose}
      busy={busy === "save"}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-post" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} Post
          </button>
        </>
      }
    >
      <form id="gc-post" className="mn-form" onSubmit={save}>
        {kind === "announcement" && (
          <div className="mn-form__row">
            <Field label="Type">
              <select className="mn-input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option value="announcement">Announcement</option>
                <option value="notice">Important notice</option>
              </select>
            </Field>
            <Field label="Audience">
              <select className="mn-input" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
                <option value="all">All members</option>
                <option value="team">A team</option>
                <option value="leaders">Group leadership</option>
              </select>
            </Field>
          </div>
        )}
        {f.audience === "team" && (
          <Field label="Team">
            <select className="mn-input" value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}>
              <option value="">Choose…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Title">
          <input className="mn-input" value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Message" required>
          <textarea className="mn-input" rows={6} maxLength={6000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
        <div className="gc-files">
          {files.map((u, i) => (
            <span key={u} className="mn-chip">
              File {i + 1}
            </span>
          ))}
          <input ref={input} type="file" hidden onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => input.current?.click()} disabled={busy === "file"}>
            {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />} Attach file
          </button>
        </div>
        {kind === "announcement" && (
          <label className="mn-check">
            <input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to the top
          </label>
        )}
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Bible study
 * ========================================================================== */

export function BibleStudyTab({ organizationId, group, notify }: TabProps) {
  const list = useLoad((s) => communitiesApi.lessons(organizationId, group.id, s), [organizationId, group.id]);
  const [program, setProgram] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lesson | "new" | null>(null);
  const [answersFor, setAnswersFor] = useState<Lesson | null>(null);
  if (list.error) return <ErrorBox text={list.error} />;
  if (!list.data) return <Loading />;
  const items = list.data.items.filter((l) => program === "all" || l.program === program);
  async function remove(l: Lesson) {
    if (!window.confirm(`Delete "${l.title}"?`)) return;
    if (await act(notify, () => communitiesApi.deleteLesson(organizationId, group.id, l.id), "Lesson deleted.", "The lesson could not be deleted.")) list.reload();
  }
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <select className="mn-input gc-narrow" value={program} onChange={(e) => setProgram(e.target.value)} aria-label="Study program">
          <option value="all">All programs</option>
          {list.data.programs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {list.data.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New lesson
          </button>
        )}
      </div>
      {items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={BookOpen} title="No lessons yet" text="Leaders can publish lessons with passages, questions and study material." />
        </div>
      )}
      {items.map((l) => (
        <LessonCard
          key={l.id}
          organizationId={organizationId}
          groupId={group.id}
          lesson={l}
          open={open === l.id}
          onToggle={() => setOpen(open === l.id ? null : l.id)}
          canManage={list.data!.canManage}
          onEdit={() => setEditing(l)}
          onDelete={() => remove(l)}
          onAnswers={() => setAnswersFor(l)}
          notify={notify}
          onSaved={list.reload}
        />
      ))}
      {editing && (
        <LessonDialog
          organizationId={organizationId}
          groupId={group.id}
          lesson={editing === "new" ? null : editing}
          programs={list.data.programs}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Lesson saved.");
            list.reload();
          }}
        />
      )}
      {answersFor && <AnswersDialog organizationId={organizationId} groupId={group.id} lesson={answersFor} onClose={() => setAnswersFor(null)} />}
    </div>
  );
}

function LessonCard({ organizationId, groupId, lesson: l, open, onToggle, canManage, onEdit, onDelete, onAnswers, notify, onSaved }: { organizationId: string; groupId: string; lesson: Lesson; open: boolean; onToggle: () => void; canManage: boolean; onEdit: () => void; onDelete: () => void; onAnswers: () => void; notify: TabProps["notify"]; onSaved: () => void }) {
  const [answers, setAnswers] = useState<string[]>(l.mine?.answers ?? []);
  const [notes, setNotes] = useState(l.mine?.privateNotes ?? "");
  const [busy, setBusy] = useState(false);
  async function save(completed?: boolean) {
    setBusy(true);
    const input: { answers?: string[]; privateNotes: string; completed?: boolean } = { privateNotes: notes };
    if (l.allowAnswers && l.questions.length) input.answers = answers;
    if (completed !== undefined) input.completed = completed;
    if (await act(notify, () => communitiesApi.saveNote(organizationId, groupId, l.id, input), completed ? "Marked as studied." : "Saved.", "Your notes could not be saved.")) onSaved();
    setBusy(false);
  }
  return (
    <article className="mn-panel gc-lesson">
      <header className="gc-post__head">
        <button type="button" className="gc-lesson__toggle" onClick={onToggle} aria-expanded={open}>
          <BookOpen aria-hidden="true" />
          <div>
            <b>
              {l.title} {l.status === "draft" && <Tone tone="gray">draft</Tone>} {l.mine?.completed && <Tone tone="green">studied</Tone>}
            </b>
            <span>
              {l.program}
              {l.passages.length ? ` · ${l.passages.join("; ")}` : ""}
              {l.scheduledAt ? ` · ${fmtDate(l.scheduledAt, true)}` : ""}
            </span>
          </div>
        </button>
        {canManage && (
          <div className="mn-row">
            {l.allowAnswers && l.questions.length > 0 && (
              <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={onAnswers}>
                Answers{l.completedCount ? ` (${l.completedCount})` : ""}
              </button>
            )}
            <button type="button" className="mn-iconbtn" aria-label="Edit lesson" onClick={onEdit}>
              <Pencil aria-hidden="true" />
            </button>
            <button type="button" className="mn-iconbtn" aria-label="Delete lesson" onClick={onDelete}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        )}
      </header>
      {open && (
        <div className="gc-lesson__body">
          {l.reading && (
            <p className="mn-callout">
              <b>Reading:</b> {l.reading}
            </p>
          )}
          {l.body && <div className="gc-pre gc-lesson__text">{l.body}</div>}
          {l.documentUrls.length > 0 && (
            <div className="gc-files">
              {l.documentUrls.map((u, i) => (
                <a key={u} className="mn-chip" href={mediaUrl(u) ?? u} target="_blank" rel="noreferrer">
                  <FileText aria-hidden="true" /> Material {i + 1}
                </a>
              ))}
            </div>
          )}
          {l.questions.length > 0 && (
            <div className="gc-questions">
              <h4>Discussion questions</h4>
              {l.questions.map((q, i) => (
                <div key={i} className="gc-question">
                  <p>
                    <b>{i + 1}.</b> {q}
                  </p>
                  {l.allowAnswers && (
                    <textarea
                      className="mn-input"
                      rows={2}
                      maxLength={3000}
                      placeholder="Your answer (visible to the group leaders)"
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((a) => Object.assign([...a], { [i]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <Field label="My study notes" hint="Private — only you can see them.">
            <textarea className="mn-input" rows={3} maxLength={10000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="mn-row">
            <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy} onClick={() => save()}>
              Save
            </button>
            {!l.mine?.completed && (
              <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy} onClick={() => save(true)}>
                <CheckCircle2 aria-hidden="true" /> Mark as studied
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function LessonDialog({ organizationId, groupId, lesson, programs, onClose, onDone }: { organizationId: string; groupId: string; lesson: Lesson | null; programs: string[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    program: lesson?.program ?? programs[0] ?? "General",
    title: lesson?.title ?? "",
    passages: (lesson?.passages ?? []).join("; "),
    body: lesson?.body ?? "",
    questions: (lesson?.questions ?? []).join("\n"),
    reading: lesson?.reading ?? "",
    scheduledAt: toLocalInput(lesson?.scheduledAt),
    allowAnswers: lesson?.allowAnswers ?? true,
    status: lesson?.status ?? "published",
  });
  const [docs, setDocs] = useState<string[]>(lesson?.documentUrls ?? []);
  const [busy, setBusy] = useState<null | "save" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  async function attach(file: File) {
    setBusy("file");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      setDocs((d) => [...d, up.fileUrl].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setError("Give the lesson a title.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.saveLesson(organizationId, groupId, lesson?.id ?? null, {
        ...f,
        passages: f.passages.split(";").map((p) => p.trim()).filter(Boolean),
        questions: f.questions.split("\n").map((q) => q.trim()).filter(Boolean),
        scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null,
        documentUrls: docs,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The lesson could not be saved.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={lesson ? "Edit lesson" : "New Bible study lesson"}
      onClose={onClose}
      busy={busy === "save"}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-lesson" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} Save lesson
          </button>
        </>
      }
    >
      <form id="gc-lesson" className="mn-form" onSubmit={save}>
        <div className="mn-form__row">
          <Field label="Program / series" hint="Several programs can run in one group.">
            <input className="mn-input" list="gc-programs" value={f.program} maxLength={100} onChange={(e) => setF({ ...f, program: e.target.value })} />
            <datalist id="gc-programs">
              {programs.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Title" required>
            <input className="mn-input" value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </Field>
        </div>
        <div className="mn-form__row">
          <Field label="Bible passages" hint="Separate with semicolons, e.g. John 3:1-21; Romans 5:8">
            <input className="mn-input" value={f.passages} onChange={(e) => setF({ ...f, passages: e.target.value })} />
          </Field>
          <Field label="Study session">
            <input className="mn-input" type="datetime-local" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} />
          </Field>
        </div>
        <Field label="Assigned reading">
          <input className="mn-input" value={f.reading} maxLength={500} onChange={(e) => setF({ ...f, reading: e.target.value })} />
        </Field>
        <Field label="Lesson / study notes">
          <textarea className="mn-input" rows={7} maxLength={20000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
        <Field label="Discussion questions" hint="One per line.">
          <textarea className="mn-input" rows={4} value={f.questions} onChange={(e) => setF({ ...f, questions: e.target.value })} />
        </Field>
        <div className="gc-files">
          {docs.map((u, i) => (
            <span key={u} className="mn-chip">
              Material {i + 1}
            </span>
          ))}
          <input ref={input} type="file" hidden onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => input.current?.click()} disabled={busy === "file"}>
            {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <FileUp aria-hidden="true" />} Upload lesson document
          </button>
        </div>
        <div className="mn-form__row">
          <label className="mn-check">
            <input type="checkbox" checked={f.allowAnswers} onChange={(e) => setF({ ...f, allowAnswers: e.target.checked })} /> Members can submit answers
          </label>
          <label className="mn-check">
            <input type="checkbox" checked={f.status === "draft"} onChange={(e) => setF({ ...f, status: e.target.checked ? "draft" : "published" })} /> Save as draft (hidden from members)
          </label>
        </div>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

function AnswersDialog({ organizationId, groupId, lesson, onClose }: { organizationId: string; groupId: string; lesson: Lesson; onClose: () => void }) {
  const a = useLoad((s) => communitiesApi.answers(organizationId, groupId, lesson.id, s), [organizationId, groupId, lesson.id]);
  return (
    <Modal title={`Answers — ${lesson.title}`} subtitle="Members' private notes are never shown here." onClose={onClose} wide>
      {a.error && <ErrorBox text={a.error} />}
      {!a.data && !a.error && <div className="mn-sk" style={{ height: 120 }} />}
      {a.data && a.data.items.length === 0 && <p className="mn-muted">No answers yet.</p>}
      {a.data?.items.map((x, i) => (
        <div key={i} className="gc-answer">
          <b>
            {x.memberName} {x.completed && <Tone tone="green">studied</Tone>}
          </b>
          {lesson.questions.map((q, qi) => (
            <p key={qi}>
              <small>{q}</small>
              <br />
              {x.answers[qi] || <span className="mn-muted">—</span>}
            </p>
          ))}
        </div>
      ))}
    </Modal>
  );
}

/* ============================================================================
 * Prayer requests
 * ========================================================================== */

const PRIVACY: Record<string, string> = { leaders: "Group leaders only", team: "Prayer team", members: "Group members" };

export function PrayerTab({ organizationId, group, notify }: TabProps) {
  const [archived, setArchived] = useState(false);
  const list = useLoad((s) => communitiesApi.prayers(organizationId, group.id, archived ? "archived" : undefined, s), [organizationId, group.id, archived]);
  const teams = useLoad((s) => communitiesApi.teams(organizationId, group.id, s), [organizationId, group.id]);
  const [composing, setComposing] = useState(false);
  const [responding, setResponding] = useState<Record<string, string>>({});
  async function setStatus(p: Prayer, status: string) {
    if (await act(notify, () => communitiesApi.updatePrayer(organizationId, group.id, p.id, { status }), status === "answered" ? "Marked as answered. Praise God!" : "Updated.", "The request could not be updated.")) list.reload();
  }
  async function respond(p: Prayer) {
    const text = (responding[p.id] ?? "").trim();
    if (!text) return;
    if (await act(notify, () => communitiesApi.updatePrayer(organizationId, group.id, p.id, { response: text }), "Response sent.", "The response could not be sent.")) {
      setResponding((r) => ({ ...r, [p.id]: "" }));
      list.reload();
    }
  }
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <div className="mn-seg" role="tablist" aria-label="Prayer requests">
          <button type="button" role="tab" aria-selected={!archived} className={!archived ? "is-on" : ""} onClick={() => setArchived(false)}>
            Current
          </button>
          <button type="button" role="tab" aria-selected={archived} className={archived ? "is-on" : ""} onClick={() => setArchived(true)}>
            Archived
          </button>
        </div>
        <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setComposing(true)}>
          <HandHeart aria-hidden="true" /> Submit a prayer request
        </button>
      </div>
      <p className="mn-muted gc-privacy">
        <Lock aria-hidden="true" /> You only see requests shared with you. Leaders are notified that a request arrived, never its contents.
      </p>
      {list.error && <ErrorBox text={list.error} />}
      {!list.data && !list.error && <Loading />}
      {list.data && list.data.items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={HandHeart} title="No prayer requests" text="Share a request with the group leaders, a prayer team or the whole group." />
        </div>
      )}
      {list.data?.items.map((p) => (
        <article key={p.id} className="mn-panel gc-post">
          <header className="gc-post__head">
            <div>
              <b>{p.title}</b>
              <span>
                {p.authorName} · {fmtDate(p.createdAt, true)} · {PRIVACY[p.privacy]}
                {p.anonymous ? " · anonymous" : ""}
                {p.category ? ` · ${p.category}` : ""}
              </span>
            </div>
            <Tone tone={p.status === "answered" ? "green" : p.status === "praying" ? "purple" : p.status === "archived" ? "gray" : "blue"}>{p.status}</Tone>
          </header>
          {p.body && <p className="gc-pre">{p.body}</p>}
          {p.attachmentUrl && (
            <a className="mn-chip" href={mediaUrl(p.attachmentUrl) ?? p.attachmentUrl} target="_blank" rel="noreferrer">
              <Paperclip aria-hidden="true" /> Attachment
            </a>
          )}
          {p.responses.length > 0 && (
            <div className="gc-comments">
              {p.responses.map((r) => (
                <div key={r.id} className="gc-comment">
                  <b>{r.authorName}</b> <span>{fmtDate(r.createdAt, true)}</span>
                  <p className="gc-pre">{r.body}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mn-row">
            {list.data?.canManage && p.status !== "archived" && (
              <>
                {p.status === "open" && (
                  <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setStatus(p, "praying")}>
                    We're praying
                  </button>
                )}
                <input className="mn-input gc-grow" placeholder="Respond to this request…" value={responding[p.id] ?? ""} onChange={(e) => setResponding((r) => ({ ...r, [p.id]: e.target.value }))} />
                <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => respond(p)} disabled={!(responding[p.id] ?? "").trim()}>
                  Respond
                </button>
              </>
            )}
            {(list.data?.canManage || p.isMine) && p.status !== "answered" && p.status !== "archived" && (
              <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setStatus(p, "answered")}>
                <CheckCircle2 aria-hidden="true" /> Answered
              </button>
            )}
            {(list.data?.canManage || p.isMine) && p.status !== "archived" && (
              <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setStatus(p, "archived")}>
                Archive
              </button>
            )}
          </div>
        </article>
      ))}
      {composing && (
        <PrayerDialog
          organizationId={organizationId}
          groupId={group.id}
          teams={teams.data?.items ?? []}
          onClose={() => setComposing(false)}
          onDone={() => {
            setComposing(false);
            notify("ok", "Your prayer request was shared.");
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function PrayerDialog({ organizationId, groupId, teams, onClose, onDone }: { organizationId: string; groupId: string; teams: { id: string; name: string }[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ title: "", body: "", category: "", privacy: "leaders", teamId: "", anonymous: false, attachmentUrl: "" });
  const [busy, setBusy] = useState<null | "save" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  async function attach(file: File) {
    setBusy("file");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      setF((x) => ({ ...x, attachmentUrl: up.fileUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setError("Give your request a title.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.createPrayer(organizationId, groupId, f);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request could not be sent.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title="Prayer request"
      onClose={onClose}
      busy={busy === "save"}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-prayer" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} Share request
          </button>
        </>
      }
    >
      <form id="gc-prayer" className="mn-form" onSubmit={save}>
        <Field label="Title" required>
          <input className="mn-input" value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Request">
          <textarea className="mn-input" rows={4} maxLength={4000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
        <div className="mn-form__row">
          <Field label="Category (optional)">
            <input className="mn-input" value={f.category} maxLength={60} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Health, family, work…" />
          </Field>
          <Field label="Who can see it">
            <select className="mn-input" value={f.privacy} onChange={(e) => setF({ ...f, privacy: e.target.value })}>
              <option value="leaders">Group leaders only</option>
              {teams.length > 0 && <option value="team">Selected prayer team</option>}
              <option value="members">Group members</option>
            </select>
          </Field>
        </div>
        {f.privacy === "team" && (
          <Field label="Prayer team">
            <select className="mn-input" value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}>
              <option value="">Choose…</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <label className="mn-check">
          <input type="checkbox" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} /> Share anonymously (your name is hidden)
        </label>
        <label className="mn-btn mn-btn--outline mn-btn--sm gc-attach">
          {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />} {f.attachmentUrl ? "Attachment added" : "Attach a file (optional)"}
          <input type="file" hidden onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
        </label>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Documents
 * ========================================================================== */

const DOC_CATS = [
  ["bible_study", "Bible study materials"],
  ["minutes", "Meeting minutes"],
  ["policies", "Group policies"],
  ["lessons", "Lesson documents"],
  ["reports", "Reports"],
  ["media", "Images & videos"],
  ["presentations", "Presentations"],
  ["general", "General"],
] as const;

export function DocumentsTab({ organizationId, group, notify }: TabProps) {
  const list = useLoad((s) => communitiesApi.documents(organizationId, group.id, s), [organizationId, group.id]);
  const [cat, setCat] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: string; title: string } | null>(null);
  if (list.error) return <ErrorBox text={list.error} />;
  if (!list.data) return <Loading />;
  const items = list.data.items.filter((d) => cat === "all" || d.category === cat);
  async function remove(id: string, title: string) {
    if (!window.confirm(`Remove "${title}"?`)) return;
    if (await act(notify, () => communitiesApi.deleteDocument(organizationId, group.id, id), "Document removed.", "The document could not be removed.")) list.reload();
  }
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <select className="mn-input gc-narrow" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {DOC_CATS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        {list.data.canUpload && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setUploading(true)}>
            <FileUp aria-hidden="true" /> Upload
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="mn-panel">
          <Empty icon={FileText} title="No documents" text="Study materials, minutes, policies, presentations and media shared with the group appear here." />
        </div>
      ) : (
        <section className="mn-panel mn-panel--flush">
          <div className="mn-tablewrap">
            <table className="mn-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Uploaded by</th>
                  <th>Date</th>
                  <th>Access</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((d) => {
                  const url = mediaUrl(d.fileUrl) ?? d.fileUrl;
                  return (
                    <tr key={d.id}>
                      <td>
                        <b>{d.title}</b>
                        <small>{[d.fileName, formatBytes(d.fileSize)].filter(Boolean).join(" · ")}</small>
                      </td>
                      <td>{DOC_CATS.find(([k]) => k === d.category)?.[1] ?? d.category}</td>
                      <td>{d.uploadedBy || "—"}</td>
                      <td>{fmtDate(d.createdAt)}</td>
                      <td>{d.access === "leaders" ? <Tone tone="purple">Leaders</Tone> : <Tone tone="blue">Members</Tone>}</td>
                      <td>
                        <div className="mn-row">
                          {["photo", "video"].includes(d.mediaType) || d.mimeType === "application/pdf" ? (
                            <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => setPreview({ url, type: d.mimeType ?? d.mediaType, title: d.title })}>
                              Preview
                            </button>
                          ) : null}
                          <a className="mn-btn mn-btn--outline mn-btn--sm" href={url} target="_blank" rel="noreferrer" download>
                            <Download aria-hidden="true" /> Download
                          </a>
                          {list.data?.canUpload && (
                            <button type="button" className="mn-iconbtn" aria-label={`Remove ${d.title}`} onClick={() => remove(d.id, d.title)}>
                              <Trash2 aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {uploading && (
        <UploadDialog
          organizationId={organizationId}
          groupId={group.id}
          onClose={() => setUploading(false)}
          onDone={() => {
            setUploading(false);
            notify("ok", "Document uploaded.");
            list.reload();
          }}
        />
      )}
      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)} wide>
          {preview.type.startsWith("image") || preview.type === "photo" ? (
            <img src={preview.url} alt={preview.title} className="gc-preview" />
          ) : preview.type.startsWith("video") || preview.type === "video" ? (
            <video src={preview.url} controls className="gc-preview" />
          ) : (
            <iframe src={preview.url} title={preview.title} className="gc-preview gc-preview--pdf" />
          )}
        </Modal>
      )}
    </div>
  );
}

function UploadDialog({ organizationId, groupId, onClose, onDone }: { organizationId: string; groupId: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [access, setAccess] = useState("members");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a file.");
    if (file.size > 100 * 1024 * 1024) return setError("Files can be up to 100 MB.");
    setBusy(true);
    setError(null);
    try {
      await communitiesApi.uploadDocument(organizationId, groupId, file, title.trim() || file.name.replace(/\.[^.]+$/, ""), category, access);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Upload a document"
      subtitle="PDF, Word, PowerPoint, Excel, images, audio and video. Stored in the church media library."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-upload" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Upload
          </button>
        </>
      }
    >
      <form id="gc-upload" className="mn-form" onSubmit={save}>
        <Field label="File" required>
          <input className="mn-input" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="Title">
          <input className="mn-input" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="mn-form__row">
          <Field label="Category">
            <select className="mn-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {DOC_CATS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Who can access it">
            <select className="mn-input" value={access} onChange={(e) => setAccess(e.target.value)}>
              <option value="members">All group members</option>
              <option value="leaders">Group leaders only</option>
            </select>
          </Field>
        </div>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Tasks
 * ========================================================================== */

const T_STATUS: Record<Task["status"], string> = { todo: "To Do", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
const T_TONE: Record<Task["status"], "gray" | "blue" | "green" | "red"> = { todo: "gray", in_progress: "blue", completed: "green", cancelled: "red" };

export function TasksTab({ organizationId, group, notify }: TabProps) {
  const [mine, setMine] = useState(!group.viewer.canCoordinate);
  const list = useLoad((s) => communitiesApi.tasks(organizationId, group.id, mine, s), [organizationId, group.id, mine]);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const columns = useMemo(() => (["todo", "in_progress", "completed", "cancelled"] as const).map((st) => ({ st, items: (list.data?.items ?? []).filter((t) => t.status === st) })), [list.data]);
  async function move(t: Task, status: Task["status"]) {
    if (await act(notify, () => communitiesApi.saveTask(organizationId, group.id, t.id, list.data?.canManage ? { ...t, status } : { status }), "Task updated.", "The task could not be updated.")) list.reload();
  }
  async function remove(t: Task) {
    if (!window.confirm(`Delete "${t.title}"?`)) return;
    if (await act(notify, () => communitiesApi.deleteTask(organizationId, group.id, t.id), "Task deleted.", "The task could not be deleted.")) list.reload();
  }
  if (list.error) return <ErrorBox text={list.error} />;
  if (!list.data) return <Loading />;
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        {list.data.canManage ? (
          <div className="mn-seg" role="tablist" aria-label="Tasks">
            <button type="button" role="tab" aria-selected={!mine} className={!mine ? "is-on" : ""} onClick={() => setMine(false)}>
              All tasks
            </button>
            <button type="button" role="tab" aria-selected={mine} className={mine ? "is-on" : ""} onClick={() => setMine(true)}>
              Assigned to me
            </button>
          </div>
        ) : (
          <p className="mn-muted">Tasks assigned to you.</p>
        )}
        {list.data.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New task
          </button>
        )}
      </div>
      {list.data.items.length === 0 ? (
        <div className="mn-panel">
          <Empty icon={ListTodo} title="No tasks" text={list.data.canManage ? "Assign tasks with due dates and priorities." : "You have no tasks in this group."} />
        </div>
      ) : (
        <div className="gc-board">
          {columns.map((c) => (
            <section key={c.st} className="gc-board__col">
              <h4>
                {T_STATUS[c.st]} <span>{c.items.length}</span>
              </h4>
              {c.items.map((t) => (
                <article key={t.id} className="gc-task">
                  <b>{t.title}</b>
                  {t.description && <p>{t.description}</p>}
                  <div className="mn-row">
                    <Tone tone={t.priority === "high" ? "red" : t.priority === "medium" ? "amber" : "gray"}>{t.priority}</Tone>
                    {t.dueDate && <span className="mn-muted">due {fmtDate(t.dueDate)}</span>}
                  </div>
                  <span className="mn-muted">{t.assigneeName ? `Assigned to ${t.assigneeName}` : "Unassigned"}</span>
                  {t.attachmentUrls.length > 0 && (
                    <div className="gc-files">
                      {t.attachmentUrls.map((u, i) => (
                        <a key={u} className="mn-chip" href={mediaUrl(u) ?? u} target="_blank" rel="noreferrer">
                          <Paperclip aria-hidden="true" /> {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {(list.data?.canManage || t.isMine) && (
                    <div className="mn-row">
                      <select className="mn-input gc-tiny" value={t.status} onChange={(e) => move(t, e.target.value as Task["status"])} aria-label="Status">
                        {(Object.keys(T_STATUS) as Task["status"][])
                          .filter((s) => list.data?.canManage || s !== "cancelled")
                          .map((s) => (
                            <option key={s} value={s}>
                              {T_STATUS[s]}
                            </option>
                          ))}
                      </select>
                      {list.data?.canManage && (
                        <>
                          <button type="button" className="mn-iconbtn" aria-label="Edit task" onClick={() => setEditing(t)}>
                            <Pencil aria-hidden="true" />
                          </button>
                          <button type="button" className="mn-iconbtn" aria-label="Delete task" onClick={() => remove(t)}>
                            <Trash2 aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <Tone tone={T_TONE[t.status]}>{T_STATUS[t.status]}</Tone>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
      {editing && (
        <TaskDialog
          organizationId={organizationId}
          groupId={group.id}
          task={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Task saved.");
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function TaskDialog({ organizationId, groupId, task, onClose, onDone }: { organizationId: string; groupId: string; task: Task | null; onClose: () => void; onDone: () => void }) {
  const members = useLoad((s) => communitiesApi.members(organizationId, groupId, {}, s), [organizationId, groupId]);
  const [f, setF] = useState({ title: task?.title ?? "", description: task?.description ?? "", assigneeMembershipId: task?.assigneeMembershipId ?? "", dueDate: task?.dueDate ?? "", priority: task?.priority ?? "medium", status: task?.status ?? "todo" });
  const [files, setFiles] = useState<string[]>(task?.attachmentUrls ?? []);
  const [busy, setBusy] = useState<null | "save" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  async function attach(file: File) {
    setBusy("file");
    try {
      const up = await communitiesApi.uploadFile(organizationId, groupId, file);
      setFiles((x) => [...x, up.fileUrl].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) return setError("Give the task a title.");
    setBusy("save");
    setError(null);
    try {
      await communitiesApi.saveTask(organizationId, groupId, task?.id ?? null, { ...f, assigneeMembershipId: f.assigneeMembershipId || null, attachmentUrls: files });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The task could not be saved.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      onClose={onClose}
      busy={busy === "save"}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-task" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="mn-spin" aria-hidden="true" />} Save task
          </button>
        </>
      }
    >
      <form id="gc-task" className="mn-form" onSubmit={save}>
        <Field label="Title" required>
          <input className="mn-input" value={f.title} maxLength={160} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea className="mn-input" rows={3} maxLength={3000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="mn-form__row">
          <Field label="Assigned to">
            <select className="mn-input" value={f.assigneeMembershipId} onChange={(e) => setF({ ...f, assigneeMembershipId: e.target.value })}>
              <option value="">Unassigned</option>
              {members.data?.items.map((m) => (
                <option key={m.membershipId} value={m.membershipId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input className="mn-input" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} />
          </Field>
        </div>
        <div className="mn-form__row">
          <Field label="Priority">
            <select className="mn-input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value as Task["priority"] })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="mn-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Task["status"] })}>
              {(Object.keys(T_STATUS) as Task["status"][]).map((s) => (
                <option key={s} value={s}>
                  {T_STATUS[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="mn-btn mn-btn--outline mn-btn--sm gc-attach">
          {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />} Attach file {files.length ? `(${files.length})` : ""}
          <input type="file" hidden onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
        </label>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}
