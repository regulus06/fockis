import {
  Download,
  Eye,
  FileCheck,
  FileText,
  FileX,
  Gavel,
  Layers,
  Lock,
  LockOpen,
  Paperclip,
  Search,
  ShieldCheck,
  Trash2,
  User,
  type LucideIcon,
} from "lucide-react";

import type { Tone } from "../../support/components/SmParts";
import type { AccessLogEntry } from "../legalAdminApi";

export const ACTIVITY: Record<string, { label: string; icon: LucideIcon; tone?: Tone }> = {
  hold_created: { label: "Legal Hold Created", icon: Lock, tone: "red" },
  hold_updated: { label: "Legal Hold Updated", icon: Lock },
  hold_released: { label: "Legal Hold Released", icon: LockOpen, tone: "green" },
  evidence_preserved: { label: "Evidence Preserved", icon: ShieldCheck, tone: "green" },
  evidence_viewed: { label: "Record Accessed", icon: Eye },
  evidence_file_opened: { label: "Evidence File Opened", icon: Eye },
  evidence_exported: { label: "Evidence Exported", icon: Download },
  export_downloaded: { label: "Export Downloaded", icon: Download },
  evidence_expired: { label: "Evidence Expired", icon: Trash2, tone: "amber" },
  export_package_removed: { label: "Export Package Removed", icon: Trash2, tone: "amber" },
  account_deleted: { label: "Deleted Account Record", icon: User },
  account_deleted_with_hold: { label: "Deleted Account (Hold Applied)", icon: User, tone: "red" },
  request_received: { label: "Legal Request Received", icon: FileText, tone: "amber" },
  request_verified: { label: "Request Verified", icon: FileCheck, tone: "green" },
  request_rejected: { label: "Request Rejected", icon: FileX, tone: "red" },
  request_updated: { label: "Request Updated", icon: FileText },
  disclosure_approved: { label: "Disclosure Approved", icon: Gavel, tone: "green" },
  disclosure_partially_approved: { label: "Disclosure Partly Approved", icon: Gavel, tone: "amber" },
  disclosure_denied: { label: "Disclosure Denied", icon: Gavel, tone: "red" },
  retention_policy_changed: { label: "Retention Policy Changed", icon: Layers, tone: "amber" },
  retention_run: { label: "Retention Job Ran", icon: Layers },
  archive_searched: { label: "Archive Searched", icon: Search },
  document_uploaded: { label: "Document Uploaded", icon: Paperclip },
  document_opened: { label: "Document Opened", icon: Paperclip },
};

export function activity(action: string) {
  return ACTIVITY[action] ?? { label: action.replace(/_/g, " "), icon: FileText };
}

/** Two short lines of detail for an access-log entry. */
export function activityDetails(e: AccessLogEntry): [string, string] {
  const first = [e.caseReference ? `Case #${e.caseReference}` : "", e.targetLabel].filter(Boolean).join(" • ");
  let second = e.reason;
  if (!second) {
    const m = e.metadata ?? {};
    if (e.action.startsWith("account_deleted")) second = `Posts deleted: ${m.postsDeleted ?? 0} · kept: ${m.postsRetained ?? 0}`;
    else if (e.action === "evidence_exported") second = `${m.records ?? 0} record(s) · sha256 ${String(m.sha256 ?? "").slice(0, 12)}…`;
    else if (e.action === "retention_run") second = Object.entries(m).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ") || "Nothing due";
    else if (e.holdNumber) second = `Hold ${e.holdNumber}`;
  }
  return [first || e.targetType.replace(/_/g, " "), second];
}

export function daysLabel(days: number) {
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? "" : "s"}`;
  if (days % 30 === 0 || days > 60) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

export function shortDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function toDateInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
