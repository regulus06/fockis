/* Dialogs of the Requests & Inquiries dashboard. */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CircleCheck,
  CircleX,
  Clock,

  History as HistoryIcon,
  Lock,
  Mail,
  MessagesSquare,
  Send,
  Settings2,
  StickyNote,
  UserRound,
  X,
} from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import {
  HISTORY_LABEL,
  PRIORITY_LABEL,
  REQUEST_TYPES,
  STATUS_OPTIONS,
  TYPE_LABEL,
  fmtFull,
  requestsApi,
  type NewRequestInput,
  type RequestAccess,
  type RequestDetail,
  type RequestPriority,
  type RequestReports,
  type RequestStaff,
  type RequestStatus,
  type RequestType,
} from "./requestsApi";
import { PriorityPill, RequesterBadge, RqAvatar, RqModal, StatusPill } from "./RequestParts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const todayPlus = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function Field({ label, children, error, hint, required, full }: { label: string; children: React.ReactNode; error?: string; hint?: string; required?: boolean; full?: boolean }) {
  return (
    <label className={`rq-field ${full ? "rq-field--full" : ""}`}>
      <span>
        {label}
        {required && <em> *</em>}
      </span>
      {children}
      {error ? <small className="rq-field__error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

/* ================================================================ new request */

export function NewRequestDialog({
  orgId,
  staff,
  onClose,
  onCreated,
}: {
  orgId: string;
  staff: RequestStaff | null;
  onClose: () => void;
  onCreated: (r: RequestDetail) => void;
}) {
  const [f, setF] = useState({
    requesterName: "",
    email: "",
    phone: "",
    requestType: "general" as RequestType,
    subject: "",
    message: "",
    priority: "normal" as RequestPriority,
    assignedToMembershipId: "",
    dueDate: todayPlus(7),
    internalNote: "",
  });
  const [member, setMember] = useState<{ id: string; name: string } | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [matches, setMatches] = useState<{ id: string; name: string; avatarUrl: string | null }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (member || memberQuery.trim().length < 2) return setMatches([]);
    const c = new AbortController();
    const t = window.setTimeout(() => {
      requestsApi
        .searchMembers(orgId, memberQuery.trim(), c.signal)
        .then(setMatches)
        .catch(() => undefined);
    }, 250);
    return () => {
      c.abort();
      window.clearTimeout(t);
    };
  }, [orgId, memberQuery, member]);

  // Due date follows the priority until the user picks one.
  const [dueTouched, setDueTouched] = useState(false);
  useEffect(() => {
    if (!dueTouched) setF((s) => ({ ...s, dueDate: todayPlus(s.priority === "urgent" ? 1 : s.priority === "high" ? 3 : 7) }));
  }, [f.priority, dueTouched]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!member && f.requesterName.trim().length < 2) errs.requesterName = "Enter the requester’s name, or link a member.";
    if (f.email.trim() && !EMAIL.test(f.email.trim())) errs.email = "Enter a valid email address.";
    if (f.subject.trim().length < 3) errs.subject = "Enter a subject.";
    if (f.message.trim().length < 3) errs.message = "Enter the message.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setError(null);
    try {
      const body: NewRequestInput = {
        memberId: member?.id ?? null,
        requesterName: f.requesterName.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        requestType: f.requestType,
        subject: f.subject.trim(),
        message: f.message.trim(),
        priority: f.priority,
        assignedToMembershipId: f.assignedToMembershipId || null,
        dueDate: f.dueDate || null,
        internalNote: f.internalNote.trim(),
      };
      onCreated(await requestsApi.create(orgId, body));
    } catch (err) {
      setError(errorMessage(err, "The request could not be created."));
      setBusy(false);
    }
  };

  return (
    <RqModal
      title="New Request"
      subtitle="Record a request received by phone, in person or by email."
      onClose={onClose}
      size="lg"
      busy={busy}
      footer={
        <>
          <button type="button" className="rq-btn rq-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="rq-new" className="rq-btn rq-btn--primary" disabled={busy}>
            {busy ? "Creating…" : "Create request"}
          </button>
        </>
      }
    >
      <form id="rq-new" className="rq-form" onSubmit={submit} noValidate>
        {error && (
          <p className="rq-error" role="alert">
            {error}
          </p>
        )}
        <h3 className="rq-form__section">Requester</h3>
        <div className="rq-grid">
          <Field label="Link to a church member" hint="Optional. Leave empty for someone who isn’t a member yet." full>
            {member ? (
              <span className="rq-chip">
                <UserRound aria-hidden="true" /> {member.name}
                <button type="button" onClick={() => setMember(null)} aria-label="Remove linked member">
                  <X aria-hidden="true" />
                </button>
              </span>
            ) : (
              <div className="rq-combo">
                <input className="rq-input" placeholder="Search members by name…" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} />
                {matches.length > 0 && (
                  <ul className="rq-combo__list" role="listbox">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMember({ id: m.id, name: m.name });
                            setMemberQuery("");
                            setF((s) => ({ ...s, requesterName: s.requesterName || m.name }));
                          }}
                        >
                          <RqAvatar name={m.name} url={m.avatarUrl} size={28} /> {m.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Field>
          <Field label="Requester name" required={!member} error={errors.requesterName}>
            <input className="rq-input" value={f.requesterName} onChange={set("requesterName")} maxLength={120} />
          </Field>
          <Field label="Email" error={errors.email} hint={member ? "Empty = the member’s email on file." : undefined}>
            <input className="rq-input" type="email" value={f.email} onChange={set("email")} maxLength={160} />
          </Field>
          <Field label="Phone">
            <input className="rq-input" type="tel" value={f.phone} onChange={set("phone")} maxLength={40} />
          </Field>
        </div>

        <h3 className="rq-form__section">Request</h3>
        <div className="rq-grid">
          <Field label="Request type" required>
            <select className="rq-input" value={f.requestType} onChange={set("requestType")}>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className="rq-input" value={f.priority} onChange={set("priority")}>
              {(["normal", "high", "urgent"] as RequestPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject" required error={errors.subject} full>
            <input className="rq-input" value={f.subject} onChange={set("subject")} maxLength={150} />
          </Field>
          <Field label="Message" required error={errors.message} full>
            <textarea className="rq-input rq-textarea" rows={4} value={f.message} onChange={set("message")} maxLength={5000} />
          </Field>
        </div>

        <h3 className="rq-form__section">Handling</h3>
        <div className="rq-grid">
          <Field label="Assign to">
            <select className="rq-input" value={f.assignedToMembershipId} onChange={set("assignedToMembershipId")}>
              <option value="">Not assigned</option>
              {(staff?.people ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input
              className="rq-input"
              type="date"
              value={f.dueDate}
              onChange={(e) => {
                setDueTouched(true);
                set("dueDate")(e);
              }}
            />
          </Field>
          <Field label="Internal notes" hint="Only staff can see this. Never shown to the requester." full>
            <textarea className="rq-input rq-textarea" rows={3} value={f.internalNote} onChange={set("internalNote")} maxLength={3000} />
          </Field>
        </div>
      </form>
    </RqModal>
  );
}

/* ================================================================ workspace */

export type WorkspaceTab = "conversation" | "notes" | "history" | "settings";

export function RequestWorkspace({
  orgId,
  request,
  staff,
  access,
  initialTab = "conversation",
  onClose,
  onChanged,
}: {
  orgId: string;
  request: RequestDetail;
  staff: RequestStaff | null;
  access: RequestAccess;
  initialTab?: WorkspaceTab;
  onClose: () => void;
  onChanged: (r: RequestDetail, message?: string, tone?: "ok" | "error") => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [channel, setChannel] = useState<"email" | "fockis">(request.email ? "email" : "fockis");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [noteVis, setNoteVis] = useState<"staff" | "pastoral">("staff");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [due, setDue] = useState(request.dueAt ? request.dueAt.slice(0, 10) : "");

  const canEmail = Boolean(request.email);
  const canFockis = request.canFockisMessage;

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (reply.trim().length < 2) return setError("Write your reply first.");
    setBusy("reply");
    setError(null);
    try {
      const res = await requestsApi.reply(orgId, request.id, { channel, body: reply.trim() });
      if (res.delivered) {
        setReply("");
        onChanged(res.request, channel === "email" ? `Email sent to ${request.email}.` : "Fockis message sent.");
      } else {
        onChanged(res.request);
        setError(res.error || "The message could not be sent.");
      }
    } catch (err) {
      setError(errorMessage(err, "The reply could not be sent."));
    } finally {
      setBusy(null);
    }
  };

  const addNote = async (e: FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 2) return setError("Write the note first.");
    setBusy("note");
    setError(null);
    try {
      onChanged(await requestsApi.note(orgId, request.id, { body: note.trim(), visibility: noteVis }), "Note added.");
      setNote("");
    } catch (err) {
      setError(errorMessage(err, "The note could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  const patch = async (body: Parameters<typeof requestsApi.update>[2], message: string) => {
    setBusy("settings");
    setError(null);
    try {
      onChanged(await requestsApi.update(orgId, request.id, body), message);
    } catch (err) {
      setError(errorMessage(err, "That change could not be saved."));
    } finally {
      setBusy(null);
    }
  };

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Send; count?: number }[] = [
    { id: "conversation", label: "Conversation", icon: MessagesSquare, count: request.replies.length },
    { id: "notes", label: "Internal notes", icon: StickyNote, count: request.notes.length },
    { id: "history", label: "History", icon: HistoryIcon, count: request.history.length },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <RqModal
      title={request.subject}
      subtitle={`${request.requestNumber} · ${TYPE_LABEL[request.requestType]} · received ${fmtFull(request.createdAt)}`}
      onClose={onClose}
      size="lg"
      busy={busy !== null}
    >
      <div className="rq-ws">
        <div className="rq-ws__who">
          <RqAvatar name={request.requesterName} url={request.avatarUrl} size={40} />
          <div>
            <strong>{request.requesterName}</strong>
            <RequesterBadge type={request.requesterType} />
          </div>
          <StatusPill status={request.status} overdue={request.overdue} />
          <PriorityPill priority={request.priority} />
        </div>

        <div className="rq-ws__tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
              <t.icon aria-hidden="true" /> {t.label}
              {t.count !== undefined && <span>{t.count}</span>}
            </button>
          ))}
        </div>

        {error && (
          <p className="rq-error" role="alert">
            {error}
          </p>
        )}

        {tab === "conversation" && (
          <div className="rq-ws__pane">
            <ol className="rq-thread">
              <li className="rq-thread__msg rq-thread__msg--in">
                <header>
                  <strong>{request.requesterName}</strong>
                  <span>{fmtFull(request.createdAt)}</span>
                </header>
                <p>{request.message}</p>
              </li>
              {request.replies.map((r) => (
                <li key={r.id} className={`rq-thread__msg rq-thread__msg--out ${r.delivery === "failed" ? "is-failed" : ""}`}>
                  <header>
                    <strong>{r.sentByName}</strong>
                    <span>
                      {r.channel === "email" ? <Mail aria-hidden="true" /> : <MessagesSquare aria-hidden="true" />} to {r.to} · {fmtFull(r.sentAt)}
                    </span>
                  </header>
                  <p>{r.body}</p>
                  <footer className={r.delivery === "sent" ? "is-ok" : "is-bad"}>
                    {r.delivery === "sent" ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                    {r.delivery === "sent" ? (r.channel === "email" ? "Sent by email" : "Delivered on Fockis") : `Not delivered — ${r.error || "the message could not be sent"}`}
                  </footer>
                </li>
              ))}
            </ol>
            {request.status !== "archived" &&
              (canEmail || canFockis ? (
                <form className="rq-compose" onSubmit={sendReply}>
                  <div className="rq-compose__channels" role="radiogroup" aria-label="Send as">
                    <label className={channel === "email" ? "is-on" : ""}>
                      <input type="radio" name="channel" checked={channel === "email"} disabled={!canEmail} onChange={() => setChannel("email")} />
                      <Mail aria-hidden="true" /> Email {canEmail ? `· ${request.email}` : "(no email)"}
                    </label>
                    <label className={channel === "fockis" ? "is-on" : ""}>
                      <input type="radio" name="channel" checked={channel === "fockis"} disabled={!canFockis} onChange={() => setChannel("fockis")} />
                      <MessagesSquare aria-hidden="true" /> Fockis message {canFockis ? "" : "(no Fockis account)"}
                    </label>
                  </div>
                  <textarea
                    className="rq-input rq-textarea"
                    rows={4}
                    placeholder={`Write to ${request.requesterName}…`}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={5000}
                    aria-label="Reply"
                  />
                  <div className="rq-compose__actions">
                    <small>The requester sees this message. Use internal notes for anything private.</small>
                    <button type="submit" className="rq-btn rq-btn--primary" disabled={busy !== null}>
                      <Send aria-hidden="true" /> {busy === "reply" ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="rq-muted">This person left no email address and has no Fockis account{request.phone ? " — call them instead." : "."}</p>
              ))}
          </div>
        )}

        {tab === "notes" && (
          <div className="rq-ws__pane">
            <p className="rq-lock">
              <Lock aria-hidden="true" /> Internal notes are only for church staff. The requester never sees them.
            </p>
            {request.notes.length ? (
              <ul className="rq-notes">
                {request.notes.map((n) => (
                  <li key={n.id} className={n.visibility === "pastoral" ? "is-pastoral" : ""}>
                    <header>
                      <strong>{n.authorName}</strong>
                      {n.visibility === "pastoral" && <span className="rq-tag">Pastoral</span>}
                      <span>{fmtFull(n.createdAt)}</span>
                    </header>
                    <p>{n.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rq-muted">No notes yet.</p>
            )}
            <form className="rq-compose" onSubmit={addNote}>
              <textarea className="rq-input rq-textarea" rows={3} placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={3000} aria-label="Note" />
              <div className="rq-compose__actions">
                {access.canPastoralNotes ? (
                  <select className="rq-input rq-input--sm" value={noteVis} onChange={(e) => setNoteVis(e.target.value as "staff" | "pastoral")} aria-label="Who can read it">
                    <option value="staff">Staff who handle requests</option>
                    <option value="pastoral">Pastoral (pastors &amp; administrators only)</option>
                  </select>
                ) : (
                  <span />
                )}
                <button type="submit" className="rq-btn rq-btn--primary" disabled={busy !== null}>
                  <StickyNote aria-hidden="true" /> {busy === "note" ? "Saving…" : "Add note"}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === "history" && (
          <ol className="rq-history">
            {request.history.map((h, i) => (
              <li key={i}>
                <span className="rq-history__dot" aria-hidden="true" />
                <div>
                  <strong>{HISTORY_LABEL[h.action] ?? h.action}</strong>
                  {(h.from || h.to) && (
                    <span>
                      {h.from && <s>{h.from}</s>} {h.from && h.to ? "→" : ""} {h.to}
                    </span>
                  )}
                  {h.note && <span>{h.note}</span>}
                  <small>
                    {fmtFull(h.at)}
                    {h.actorName ? ` · ${h.actorName}` : ""}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        )}

        {tab === "settings" && (
          <div className="rq-ws__pane rq-grid">
            <Field label="Status">
              <select
                className="rq-input"
                value={request.status}
                disabled={request.status === "archived" || busy !== null}
                onChange={(e) => void patch({ status: e.target.value as Exclude<RequestStatus, "archived"> }, "Status updated.")}
              >
                {STATUS_OPTIONS.filter((s) => s.value !== "archived" || request.status === "archived").map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority" hint={access.canAssign ? undefined : "Only administrators can change the priority."}>
              <select
                className="rq-input"
                value={request.priority}
                disabled={!access.canAssign || busy !== null}
                onChange={(e) => void patch({ priority: e.target.value as RequestPriority }, "Priority updated.")}
              >
                {(["normal", "high", "urgent"] as RequestPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assigned to">
              <select
                className="rq-input"
                value={request.assignedToMembershipId ?? ""}
                disabled={!access.canAssign || busy !== null}
                onChange={(e) => void patch({ assignedToMembershipId: e.target.value || null }, e.target.value ? "Request assigned." : "Assignment removed.")}
              >
                <option value="">Not assigned</option>
                {(staff?.people ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ministry" hint="Ministry leaders can see requests shared with their ministry.">
              <select
                className="rq-input"
                value={request.assignedDepartmentId ?? ""}
                disabled={!access.canAssign || busy !== null}
                onChange={(e) => void patch({ assignedDepartmentId: e.target.value || null }, "Ministry updated.")}
              >
                <option value="">No ministry</option>
                {(staff?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date" hint={request.overdue ? "This request is overdue." : undefined}>
              <span className="rq-inline">
                <input className="rq-input" type="date" value={due} onChange={(e) => setDue(e.target.value)} disabled={!access.canAssign} />
                <button
                  type="button"
                  className="rq-btn rq-btn--secondary"
                  disabled={!access.canAssign || busy !== null || due === (request.dueAt ?? "").slice(0, 10)}
                  onClick={() => void patch({ dueDate: due || null }, "Due date updated.")}
                >
                  <Clock aria-hidden="true" /> Save
                </button>
              </span>
            </Field>
            <Field label="Contact">
              <span className="rq-contact">
                {request.email || "No email"}
                <br />
                {request.phone || "No phone"}
              </span>
            </Field>
          </div>
        )}
      </div>
    </RqModal>
  );
}

/* ================================================================ status & assign */

export function StatusDialog({ request, onClose, onSave }: { request: RequestDetail; onClose: () => void; onSave: (s: Exclude<RequestStatus, "archived">) => Promise<void> }) {
  const [status, setStatus] = useState<RequestStatus>(request.status === "archived" ? "new" : request.status);
  const [busy, setBusy] = useState(false);
  return (
    <RqModal
      title="Change status"
      subtitle={request.subject}
      size="sm"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="rq-btn rq-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="rq-btn rq-btn--primary"
            disabled={busy || status === request.status}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(status as Exclude<RequestStatus, "archived">);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="rq-radios" role="radiogroup">
        {STATUS_OPTIONS.filter((s) => s.value !== "archived").map((s) => (
          <label key={s.value} className={status === s.value ? "is-on" : ""}>
            <input type="radio" name="status" checked={status === s.value} onChange={() => setStatus(s.value)} />
            <StatusPill status={s.value} />
            <span>
              {s.value === "new"
                ? "Not looked at yet."
                : s.value === "in_progress"
                  ? "Someone is handling it."
                  : s.value === "waiting"
                    ? "Waiting for the requester to answer."
                    : "Done. The requester is told it was resolved."}
            </span>
          </label>
        ))}
      </div>
    </RqModal>
  );
}

export function AssignDialog({
  request,
  staff,
  onClose,
  onSave,
}: {
  request: RequestDetail;
  staff: RequestStaff | null;
  onClose: () => void;
  onSave: (membershipId: string | null) => Promise<void>;
}) {
  const [who, setWho] = useState(request.assignedToMembershipId ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <RqModal
      title="Assign request"
      subtitle={request.subject}
      size="sm"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="rq-btn rq-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="rq-btn rq-btn--primary"
            disabled={busy || who === (request.assignedToMembershipId ?? "")}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave(who || null);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Assign"}
          </button>
        </>
      }
    >
      <Field label="Assign to" hint="The person is notified and sees it under My Assigned.">
        <select className="rq-input" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Not assigned</option>
          {(staff?.people ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
    </RqModal>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <RqModal
      title={title}
      size="sm"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="rq-btn rq-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`rq-btn ${danger ? "rq-btn--danger" : "rq-btn--primary"}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="rq-muted">{body}</p>
    </RqModal>
  );
}

/* ================================================================ reports */

const hours = (h: number | null) => (h === null ? "—" : h < 48 ? `${h} h` : `${Math.round((h / 24) * 10) / 10} days`);

export function ReportsDialog({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [data, setData] = useState<RequestReports | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const c = new AbortController();
    requestsApi
      .reports(orgId, c.signal)
      .then(setData)
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Reports could not be loaded.")));
    return () => c.abort();
  }, [orgId]);
  const maxMonth = useMemo(() => Math.max(1, ...(data?.monthly ?? []).map((m) => Math.max(m.received, m.resolved))), [data]);
  const maxType = useMemo(() => Math.max(1, ...(data?.byType ?? []).map((t) => t.count)), [data]);

  return (
    <RqModal title="Request reports" subtitle="Calculated from this church’s requests." onClose={onClose} size="lg">
      {error && (
        <p className="rq-error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="rq-muted">Loading…</p>}
      {data && (
        <div className="rq-reports">
          <div className="rq-reports__kpis">
            {[
              ["Total requests", String(data.total)],
              ["Open", String(data.open)],
              ["Overdue", String(data.overdue)],
              ["Avg. first response", hours(data.avgResponseHours)],
              ["Avg. resolution", hours(data.avgResolutionHours)],
            ].map(([k, v]) => (
              <div key={k}>
                <strong>{v}</strong>
                <span>{k}</span>
              </div>
            ))}
          </div>

          <section>
            <h3>Monthly trend (last 12 months)</h3>
            <div className="rq-bars" role="img" aria-label="Requests received and resolved per month">
              {data.monthly.map((m) => (
                <div key={m.month} className="rq-bars__col" title={`${m.month}: ${m.received} received, ${m.resolved} resolved`}>
                  <div className="rq-bars__pair">
                    <span style={{ height: `${(m.received / maxMonth) * 100}%` }} className="is-received" />
                    <span style={{ height: `${(m.resolved / maxMonth) * 100}%` }} className="is-resolved" />
                  </div>
                  <small>{new Date(`${m.month}-15`).toLocaleDateString("en-US", { month: "short" })}</small>
                </div>
              ))}
            </div>
            <p className="rq-legend">
              <span className="is-received" /> Received <span className="is-resolved" /> Resolved
            </p>
          </section>

          <div className="rq-reports__split">
            <section>
              <h3>By type</h3>
              {data.byType.length ? (
                <ul className="rq-hbars">
                  {data.byType.map((t) => (
                    <li key={t.type}>
                      <span>{t.label}</span>
                      <span className="rq-hbars__track">
                        <span style={{ width: `${(t.count / maxType) * 100}%` }} />
                      </span>
                      <strong>{t.count}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rq-muted">No requests yet.</p>
              )}
            </section>
            <section>
              <h3>By status</h3>
              <ul className="rq-kv">
                {data.byStatus.map((s) => (
                  <li key={s.status}>
                    <StatusPill status={s.status} />
                    <strong>{s.count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section>
            <h3>By staff member</h3>
            {data.byAssignee.length ? (
              <table className="rq-table-sm">
                <thead>
                  <tr>
                    <th>Assigned to</th>
                    <th>Requests</th>
                    <th>Resolved</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byAssignee.map((a) => (
                    <tr key={a.name}>
                      <td>{a.name}</td>
                      <td>{a.total}</td>
                      <td>{a.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rq-muted">No requests have been assigned yet.</p>
            )}
          </section>
        </div>
      )}
    </RqModal>
  );
}

