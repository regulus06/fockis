/* Right-hand "Request Details" panel (a drawer on tablets and phones). */

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  MessagesSquare,
  Phone,
  RotateCcw,
  Send,
  UsersRound,
  X,
} from "lucide-react";

import { TYPE_LABEL, fmtFull, type RequestAccess, type RequestDetail, type RequestStaff, type RequestStatus } from "./requestsApi";
import { PriorityPill, RequesterBadge, RqAvatar, StatusPill, TypeLabel } from "./RequestParts";

interface Props {
  request: RequestDetail | null;
  loading: boolean;
  error: string | null;
  staff: RequestStaff | null;
  access: RequestAccess | null;
  busy: boolean;
  onOpenWorkspace: (tab?: "conversation" | "notes" | "history" | "settings") => void;
  onStatus: (status: Exclude<RequestStatus, "archived">) => void;
  onAssign: (membershipId: string | null) => void;
  onArchive: () => void;
  onRestore: () => void;
  onClose?: () => void;
}

export default function RequestDetailsPanel({ request, loading, error, staff, access, busy, onOpenWorkspace, onStatus, onAssign, onArchive, onRestore, onClose }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!request) {
    return (
      <aside className="rq-panel" aria-label="Request details">
        <header className="rq-panel__head">
          <h2>Request Details</h2>
          {onClose && (
            <button type="button" className="rq-iconbtn" onClick={onClose} aria-label="Close details">
              <X aria-hidden="true" />
            </button>
          )}
        </header>
        <p className="rq-panel__empty">{loading ? "Loading…" : (error ?? "Select a request to see its details.")}</p>
      </aside>
    );
  }

  const primary: { label: string; status: Exclude<RequestStatus, "archived">; icon: typeof Check } | null =
    request.status === "new"
      ? { label: "Mark as In Progress", status: "in_progress", icon: Check }
      : request.status === "in_progress" || request.status === "waiting"
        ? { label: "Mark as Resolved", status: "resolved", icon: Check }
        : request.status === "resolved"
          ? { label: "Reopen request", status: "in_progress", icon: RotateCcw }
          : null;

  const long = request.message.length > 220;

  return (
    <aside className={`rq-panel ${loading ? "is-loading" : ""}`} aria-label="Request details">
      <header className="rq-panel__head">
        <h2>Request Details</h2>
        <button type="button" className="rq-iconbtn" onClick={() => onOpenWorkspace("conversation")} aria-label="Open full request" title="Open full request">
          <ExternalLink aria-hidden="true" />
        </button>
        {onClose && (
          <button type="button" className="rq-iconbtn" onClick={onClose} aria-label="Close details">
            <X aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="rq-panel__who">
        <RqAvatar name={request.requesterName} url={request.avatarUrl} size={60} />
        <div>
          <strong>{request.requesterName}</strong>
          <RequesterBadge type={request.requesterType} />
        </div>
      </div>
      <ul className="rq-panel__contact">
        {request.email && (
          <li>
            <Mail aria-hidden="true" />
            <a href={`mailto:${request.email}`}>{request.email}</a>
          </li>
        )}
        {request.phone && (
          <li>
            <Phone aria-hidden="true" />
            <a href={`tel:${request.phone.replace(/\s+/g, "")}`}>{request.phone}</a>
          </li>
        )}
      </ul>

      <dl className="rq-panel__facts">
        <div>
          <dt>Request Type:</dt>
          <dd>
            <TypeLabel type={request.requestType} label={TYPE_LABEL[request.requestType]} />
          </dd>
        </div>
        <div>
          <dt>Received:</dt>
          <dd className="rq-inline">
            <Clock aria-hidden="true" /> {fmtFull(request.createdAt)}
          </dd>
        </div>
        <div>
          <dt>Status:</dt>
          <dd>
            <StatusPill status={request.status} overdue={request.overdue} />
          </dd>
        </div>
        <div>
          <dt>Priority:</dt>
          <dd>
            <PriorityPill priority={request.priority} />
          </dd>
        </div>
        <div>
          <dt>Reference:</dt>
          <dd className="rq-mono">{request.requestNumber}</dd>
        </div>
      </dl>

      <div className="rq-panel__label">Message:</div>
      <div className={`rq-panel__message ${long && !expanded ? "is-clamped" : ""}`}>{request.message}</div>
      {long && (
        <button type="button" className="rq-link" onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Show less" : "Show full message"}
        </button>
      )}

      <div className="rq-panel__label">Assign to:</div>
      <label className="rq-assign">
        <UsersRound aria-hidden="true" />
        <select
          value={request.assignedToMembershipId ?? ""}
          onChange={(e) => onAssign(e.target.value || null)}
          disabled={!access?.canAssign || busy || request.status === "archived"}
          aria-label="Assign to"
        >
          <option value="">{access?.canAssign ? "Choose a staff member" : request.assignedToName || "Not assigned"}</option>
          {(staff?.people ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="rq-assign__chev" />
      </label>
      {request.assignedDepartmentName && <p className="rq-panel__hint">Shared with {request.assignedDepartmentName}</p>}

      {request.status === "archived" ? (
        <button type="button" className="rq-btn rq-btn--primary rq-btn--block" onClick={onRestore} disabled={busy || !access?.canAssign}>
          <ArchiveRestore aria-hidden="true" /> Restore request
        </button>
      ) : (
        primary && (
          <button type="button" className="rq-btn rq-btn--primary rq-btn--block" onClick={() => onStatus(primary.status)} disabled={busy}>
            <primary.icon aria-hidden="true" /> {primary.label}
          </button>
        )
      )}
      {request.status === "waiting" && (
        <button type="button" className="rq-link rq-link--center" onClick={() => onStatus("in_progress")} disabled={busy}>
          Back to In Progress
        </button>
      )}
      {request.status === "in_progress" && (
        <button type="button" className="rq-link rq-link--center" onClick={() => onStatus("waiting")} disabled={busy}>
          Waiting for the requester’s answer
        </button>
      )}

      <div className="rq-panel__actions">
        <button type="button" className="rq-btn rq-btn--soft" onClick={() => onOpenWorkspace("conversation")} disabled={request.status === "archived"}>
          <Send aria-hidden="true" /> Reply
        </button>
        {request.phone ? (
          <a className="rq-btn rq-btn--secondary" href={`tel:${request.phone.replace(/\s+/g, "")}`}>
            <Phone aria-hidden="true" /> Call
          </a>
        ) : (
          <button type="button" className="rq-btn rq-btn--secondary" disabled title="No phone number">
            <Phone aria-hidden="true" /> Call
          </button>
        )}
        {request.status === "archived" ? (
          <button type="button" className="rq-btn rq-btn--secondary" onClick={onRestore} disabled={busy || !access?.canAssign}>
            <ArchiveRestore aria-hidden="true" /> Restore
          </button>
        ) : (
          <button type="button" className="rq-btn rq-btn--secondary" onClick={onArchive} disabled={busy || !access?.canAssign}>
            <Archive aria-hidden="true" /> Archive
          </button>
        )}
      </div>

      <button type="button" className="rq-panel__activity" onClick={() => onOpenWorkspace("history")}>
        <MessagesSquare aria-hidden="true" />
        <span>
          {request.replies.length} {request.replies.length === 1 ? "reply" : "replies"} · {request.notes.length} {request.notes.length === 1 ? "note" : "notes"} ·{" "}
          {request.history.length} history events
        </span>
        <span className="rq-link">View</span>
      </button>
    </aside>
  );
}
