import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Flag, LoaderCircle, MessageSquareText, Ticket, X } from "lucide-react";

import { buildFockisUploadUrl } from "../../../../config/fockisConfig";
import { adminError, type StaffPerson } from "../supportAdminApi";

/* ============================================================================
   DATA LOADING
============================================================================ */

export function useAdminQuery<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const refetch = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loader.current();
      if (id === request.current) setData(result);
    } catch (err) {
      if (id === request.current) setError(adminError(err, "Couldn't load this."));
    } finally {
      if (id === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, setData, loading, error, refetch };
}

/* ============================================================================
   STATES
============================================================================ */

export function SmLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="fksm-state" role="status">
      <LoaderCircle className="fksm-spin" size={24} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function SmError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="fksm-state fksm-state--error" role="alert">
      <span className="fksm-state__icon"><CircleAlert size={22} /></span>
      <h3>Couldn't load this</h3>
      <p>{message}</p>
      {onRetry && <button type="button" className="fksm-btn fksm-btn--secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function SmEmpty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="fksm-state">
      <span className="fksm-state__icon">{icon}</span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/* ============================================================================
   BITS
============================================================================ */

export function Avatar({ person, size = 26 }: { person: StaffPerson | null | undefined; size?: number }) {
  const name = person?.name || person?.username || "?";
  return (
    <span className="fksm-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {person?.avatar ? <img src={buildFockisUploadUrl(person.avatar)} alt="" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

export function PersonCell({ person, fallback = "—" }: { person: StaffPerson | null | undefined; fallback?: string }) {
  if (!person || (!person.username && !person.name)) return <span className="fksm-muted">{fallback}</span>;
  return (
    <span className="fksm-person">
      <Avatar person={person} />
      <span>{person.username || person.name}</span>
    </span>
  );
}

export type Tone = "blue" | "purple" | "amber" | "red" | "green" | "gray" | "teal";

export function Pill({ tone, children, dot }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`fksm-pill fksm-pill--${tone}`}>
      {dot && <i aria-hidden="true" />}
      {children}
    </span>
  );
}

const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  urgent: { label: "Urgent", tone: "red" },
  high: { label: "High", tone: "red" },
  normal: { label: "Medium", tone: "amber" },
  low: { label: "Low", tone: "green" },
};

export function PriorityPill({ priority }: { priority: string | null | undefined }) {
  if (!priority) return <span className="fksm-muted">—</span>;
  const p = PRIORITY[priority] ?? { label: priority, tone: "gray" as Tone };
  return <Pill tone={p.tone} dot>{p.label}</Pill>;
}

const TYPE: Record<string, { label: string; cls: string; icon: typeof Flag }> = {
  report: { label: "Report", cls: "report", icon: Flag },
  ticket: { label: "Ticket", cls: "ticket", icon: Ticket },
  feedback: { label: "Feedback", cls: "feedback", icon: MessageSquareText },
};

export function TypeBadge({ type }: { type: "report" | "ticket" | "feedback" }) {
  const t = TYPE[type];
  return (
    <span className={`fksm-type fksm-type--${t.cls}`}>
      <t.icon size={15} aria-hidden="true" /> {t.label}
    </span>
  );
}

/** Status words from tickets, feedback and report cases, mapped to badge colours. */
const STATUS: Record<string, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "blue" },
  in_progress: { label: "In Progress", tone: "blue" },
  awaiting_user: { label: "Waiting for User", tone: "amber" },
  escalated: { label: "Escalated", tone: "red" },
  resolved: { label: "Resolved", tone: "green" },
  closed: { label: "Closed", tone: "gray" },
  new: { label: "New", tone: "blue" },
  under_review: { label: "Under Review", tone: "purple" },
  planned: { label: "Planned", tone: "teal" },
  implemented: { label: "Implemented", tone: "green" },
  rejected: { label: "Rejected", tone: "gray" },
  pending: { label: "Open", tone: "blue" },
  action_required: { label: "Action Required", tone: "amber" },
  dismissed: { label: "Dismissed", tone: "gray" },
  visible: { label: "Visible", tone: "green" },
  hidden: { label: "Hidden", tone: "red" },
  draft: { label: "Draft", tone: "gray" },
  published: { label: "Published", tone: "green" },
  archived: { label: "Archived", tone: "amber" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "gray" as Tone };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function Pager({ page, hasMore, total, onPage }: { page: number; hasMore: boolean; total: number; onPage: (p: number) => void }) {
  if (page <= 1 && !hasMore) return null;
  return (
    <div className="fksm-pager">
      <span className="fksm-muted">Page {page} · {total} total</span>
      <span>
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>{" "}
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" disabled={!hasMore} onClick={() => onPage(page + 1)}>Next</button>
      </span>
    </div>
  );
}

export function Card({ title, icon, action, children, className = "" }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`fksm-card ${className}`}>
      {(title || action) && (
        <div className="fksm-card__head">
          {title && <h2>{icon}{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function ViewAll({ to, children = "View All" }: { to: string; children?: ReactNode }) {
  return (
    <Link to={to} className="fksm-link">
      {children} <span aria-hidden="true">→</span>
    </Link>
  );
}

/* ============================================================================
   CONFIRMATION DIALOG (sensitive / destructive actions)
============================================================================ */

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  /** Ask for a written reason (recorded in history). */
  reasonLabel?: string;
  /** Require typing this word to enable the button. */
  typeToConfirm?: string;
}

export function ConfirmDialog({
  open,
  options,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  options: ConfirmOptions | null;
  onCancel: () => void;
  onConfirm: (reason: string, typed: string) => Promise<void>;
}) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLTextAreaElement | HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    setReason("");
    setTyped("");
    setError(null);
    window.setTimeout(() => first.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !options) return null;
  const needsReason = Boolean(options.reasonLabel);
  const ready = (!needsReason || reason.trim().length >= 3) && (!options.typeToConfirm || typed === options.typeToConfirm);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim(), typed);
    } catch (err) {
      setError(adminError(err, "That didn't work."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fksm-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="fksm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="fksm-dialog__head">
          <h2 id={titleId}>{options.title}</h2>
          <button type="button" className="fksm-icon-btn" onClick={onCancel} aria-label="Close" disabled={busy}><X size={18} /></button>
        </div>
        <p className="fksm-dialog__text">{options.description}</p>
        {needsReason && (
          <label className="fksm-field">
            <span>{options.reasonLabel} <b className="fksm-required">*</b></span>
            <textarea ref={(el) => { first.current = el; }} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        )}
        {options.typeToConfirm && (
          <label className="fksm-field">
            <span>Type <strong>{options.typeToConfirm}</strong> to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
        )}
        {error && <p className="fksm-notice fksm-notice--error" role="alert">{error}</p>}
        <div className="fksm-dialog__foot">
          <button type="button" className="fksm-btn fksm-btn--secondary" onClick={onCancel} disabled={busy} ref={needsReason ? undefined : (el) => { first.current = el; }}>Cancel</button>
          <button type="button" className={`fksm-btn ${options.tone === "danger" ? "fksm-btn--danger" : "fksm-btn--primary"}`} onClick={() => void confirm()} disabled={!ready || busy}>
            {busy ? "Working…" : options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small helper: const confirm = useConfirm(); confirm.ask({...}, async (reason) => …) */
export function useConfirm() {
  const [state, setState] = useState<{ options: ConfirmOptions; run: (reason: string, typed: string) => Promise<void> } | null>(null);
  const element = (
    <ConfirmDialog
      open={Boolean(state)}
      options={state?.options ?? null}
      onCancel={() => setState(null)}
      onConfirm={async (reason, typed) => {
        await state!.run(reason, typed);
        setState(null);
      }}
    />
  );
  return { ask: (options: ConfirmOptions, run: (reason: string, typed: string) => Promise<void>) => setState({ options, run }), element };
}
