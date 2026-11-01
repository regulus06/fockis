import type { ReactNode } from "react";
import {
  Archive,
  Ban,
  CalendarClock,
  CircleCheck,
  Copyright,
  CreditCard,
  Database,
  FilePen,
  FileText,
  Flag,
  Lock,
  MessageSquareWarning,
  PenLine,
  Rocket,
  Scale,
  Send,
  ShieldCheck,
  ShoppingCart,
  Undo2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import { categoryLabel, categoryTone, statusLabel, type AuditEvent } from "../policyAdminApi";

/* ---------------- pills ---------------- */

const STATUS_TONE: Record<string, string> = {
  draft: "gray",
  pending_review: "amber",
  approved: "teal",
  scheduled: "blue",
  published: "green",
  archived: "gray",
  rejected: "red",
  superseded: "gray",
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "gray";
  return (
    <span className={`fksm-pill fksm-pill--${tone} fkpc-status`}>
      {status === "scheduled" ? <CalendarClock size={13} aria-hidden /> : <i aria-hidden="true" />}
      {statusLabel(status)}
    </span>
  );
}

export function CategoryPill({ category }: { category: string }) {
  return <span className={`fkpc-cat fkpc-cat--${categoryTone(category)}`}>{categoryLabel(category)}</span>;
}

/** Icon for a policy row, by slug/category. */
export function policyIcon(slug: string, category: string): { icon: LucideIcon; tone: string } {
  if (slug === "terms") return { icon: FileText, tone: "blue" };
  if (slug.includes("cookie")) return { icon: Database, tone: "gray" };
  if (category === "privacy") return { icon: ShieldCheck, tone: "blue" };
  if (category === "community") return { icon: Users, tone: "blue" };
  if (category === "copyright") return { icon: Copyright, tone: "purple" };
  if (category === "data_retention") return { icon: Database, tone: "blue" };
  if (category === "compliance") return { icon: Scale, tone: "blue" };
  if (category === "moderation") return { icon: Flag, tone: "red" };
  if (category === "payments") return { icon: CreditCard, tone: "blue" };
  if (category === "fockis_shop") return { icon: ShoppingCart, tone: "blue" };
  if (category === "security") return { icon: Lock, tone: "blue" };
  return { icon: FileText, tone: "blue" };
}

/* ---------------- workflow graphic ---------------- */

const STEPS: { key: string; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "draft", label: "Draft", icon: FilePen, tone: "purple" },
  { key: "pending_review", label: "Review", icon: UserRound, tone: "blue" },
  { key: "approved", label: "Approve", icon: CircleCheck, tone: "green" },
  { key: "scheduled", label: "Schedule", icon: CalendarClock, tone: "teal" },
  { key: "published", label: "Publish", icon: Rocket, tone: "violet" },
];

/** Draft → Review → Approve → Schedule → Publish. `current` highlights the step a version is at. */
export function Workflow({ current, compact }: { current?: string; compact?: boolean }) {
  const index = current ? STEPS.findIndex((s) => s.key === current) : -1;
  return (
    <ol className={`fkpc-flow${compact ? " fkpc-flow--compact" : ""}`} aria-label="Policy workflow">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const state = index < 0 ? "" : i < index ? " is-done" : i === index ? " is-current" : " is-next";
        return (
          <li key={s.key} className={`fkpc-flow__step fkpc-flow__step--${s.tone}${state}`} aria-current={i === index ? "step" : undefined}>
            <span className="fkpc-flow__icon">
              <Icon size={compact ? 18 : 22} aria-hidden />
            </span>
            <span className="fkpc-flow__label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- audit activity ---------------- */

const ACTIVITY: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  policy_created: { label: "created", icon: FilePen, tone: "purple" },
  policy_edited: { label: "updated", icon: PenLine, tone: "purple" },
  version_created: { label: "new version created", icon: FilePen, tone: "purple" },
  policy_submitted: { label: "sent for approval", icon: Send, tone: "blue" },
  policy_withdrawn: { label: "withdrawn from review", icon: Undo2, tone: "gray" },
  policy_approved: { label: "approved", icon: CircleCheck, tone: "green" },
  policy_rejected: { label: "rejected", icon: Ban, tone: "red" },
  policy_changes_requested: { label: "changes requested", icon: MessageSquareWarning, tone: "amber" },
  policy_scheduled: { label: "scheduled", icon: CalendarClock, tone: "amber" },
  policy_published: { label: "published", icon: ShieldCheck, tone: "green" },
  policy_archived: { label: "archived", icon: Archive, tone: "gray" },
  policy_restored: { label: "restored from archive", icon: Undo2, tone: "blue" },
  policy_settings_changed: { label: "Policy settings changed", icon: PenLine, tone: "blue" },
  acceptance_requirement_changed: { label: "Acceptance requirement changed", icon: PenLine, tone: "amber" },
  acceptance_exported: { label: "Acceptance records exported", icon: Database, tone: "amber" },
  data_correction_resolved: { label: "Data correction request handled", icon: UserRound, tone: "blue" },
  rule_created: { label: "rule created", icon: FilePen, tone: "purple" },
  rule_edited: { label: "rule updated", icon: PenLine, tone: "purple" },
  rule_submitted: { label: "rule sent for approval", icon: Send, tone: "blue" },
  rule_approved: { label: "rule approved", icon: CircleCheck, tone: "green" },
  rule_rejected: { label: "rule rejected", icon: Ban, tone: "red" },
  rule_published: { label: "rule published", icon: ShieldCheck, tone: "green" },
  rule_archived: { label: "rule archived", icon: Archive, tone: "gray" },
  rule_withdrawn: { label: "rule withdrawn", icon: Undo2, tone: "gray" },
};

const STANDALONE = new Set(["policy_settings_changed", "acceptance_requirement_changed", "acceptance_exported", "data_correction_resolved"]);

export function activityInfo(e: AuditEvent) {
  const a = ACTIVITY[e.action] ?? { label: e.action.replace(/_/g, " "), icon: FileText, tone: "gray" };
  const title = STANDALONE.has(e.action) ? a.label : `${e.targetLabel || "Policy"} ${a.label}`;
  return { ...a, title };
}

export const actionLabel = (action: string) => {
  const a = ACTIVITY[action];
  if (!a) return action.replace(/_/g, " ");
  return STANDALONE.has(action) ? a.label : `${action.startsWith("rule_") ? "" : "Policy "}${a.label}`.replace(/^\w/, (c) => c.toUpperCase());
};

/* ---------------- line diff ---------------- */

export type DiffLine = { type: "same" | "add" | "del"; text: string };

/** Line-level diff (LCS). Fine for policy-length documents. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  if (n * m > 4_000_000) return [...a.map((t) => ({ type: "del" as const, text: t })), ...b.map((t) => ({ type: "add" as const, text: t }))];
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ type: "del", text: a[i++] });
    else out.push({ type: "add", text: b[j++] });
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}

export const sectionsToText = (sections: { heading: string; body: string }[]) => sections.map((s) => `## ${s.heading}\n${s.body}`).join("\n\n");

export function DiffView({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const lines = diffLines(before, after);
  const added = lines.filter((l) => l.type === "add").length;
  const removed = lines.filter((l) => l.type === "del").length;
  return (
    <div className="fkpc-diff">
      <div className="fkpc-diff__head">
        <span>
          {beforeLabel} → {afterLabel}
        </span>
        <span>
          <b className="fkpc-diff__add">+{added}</b> <b className="fkpc-diff__del">−{removed}</b>
        </span>
      </div>
      {added + removed === 0 ? (
        <p className="fksm-muted fkpc-pad">No differences.</p>
      ) : (
        <pre className="fkpc-diff__body">
          {lines.map((l, k) => (
            <span key={k} className={`fkpc-diff__line fkpc-diff__line--${l.type}`}>
              <i aria-hidden="true">{l.type === "add" ? "+" : l.type === "del" ? "−" : " "}</i>
              {l.text || " "}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}

/* ---------------- policy text preview (same rules as the public page) ---------------- */

export function PolicyPreview({ sections }: { sections: { heading: string; body: string }[] }) {
  return (
    <div className="fkpc-preview">
      {sections.map((s, i) => (
        <section key={i}>
          {s.heading && <h3>{s.heading}</h3>}
          <Body text={s.body} />
        </section>
      ))}
    </div>
  );
}

function Body({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
      continue;
    }
    flush();
    blocks.push(<p key={blocks.length}>{line}</p>);
  }
  flush();
  return <>{blocks}</>;
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
