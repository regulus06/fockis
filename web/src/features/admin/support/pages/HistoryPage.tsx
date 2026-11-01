import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Flag, History, ShieldAlert, ShieldCheck, Trash2, TriangleAlert, type LucideIcon } from "lucide-react";

import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pager, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery } from "../components/SmParts";
import { adminError, supportAdminApi, type ModerationEvent } from "../supportAdminApi";

const ACTIONS: Record<string, { label: string; icon: LucideIcon; tone?: "red" | "green" | "amber" }> = {
  hide_post: { label: "Post hidden", icon: EyeOff, tone: "red" },
  restore_post: { label: "Post restored", icon: Eye, tone: "green" },
  warn_user: { label: "Warning sent", icon: TriangleAlert, tone: "amber" },
  escalate_post: { label: "Post escalated", icon: ShieldAlert, tone: "amber" },
  purge_post: { label: "Post permanently deleted", icon: Trash2, tone: "red" },
};

const FILTERS = [
  { value: "", label: "All actions" },
  { value: "hide_post", label: "Hidden" },
  { value: "restore_post", label: "Restored" },
  { value: "warn_user", label: "Warnings" },
  { value: "escalate_post", label: "Escalations" },
  { value: "purge_post", label: "Permanent deletions" },
];

function describe(event: ModerationEvent) {
  const known = ACTIONS[event.action];
  if (known) return known;
  // Report-case actions are mirrored as case_<action>.
  const words = event.action.replace(/^case_/, "").replace(/_/g, " ");
  return { label: `Report case: ${words}`, icon: Flag, tone: undefined };
}

function targetLink(event: ModerationEvent): string | null {
  if (event.targetType === "post" && event.action !== "purge_post") return `/admin/support/posts/${event.targetId}`;
  if (event.targetType === "case") return `/admin/moderation/cases/${event.targetId}`;
  if (event.targetType === "account") return `/admin/users/${event.targetId}`;
  return null;
}

export function EventList({ events }: { events: ModerationEvent[] }) {
  return (
    <ol className="fksm-timeline">
      {events.map((e) => {
        const d = describe(e);
        const link = targetLink(e);
        return (
          <li key={e.id}>
            <span className={`fksm-timeline__icon${d.tone ? ` fksm-timeline__icon--${d.tone}` : ""}`}>
              <d.icon size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{d.label}</strong>
              <p>
                {e.actor?.username || e.actor?.name || "System"}
                {" · "}
                {link ? <Link to={link} className="fksm-link" style={{ fontSize: 13 }}>{e.targetType} #{e.targetId.slice(-6).toUpperCase()}</Link> : `${e.targetType} #${e.targetId.slice(-6).toUpperCase()}`}
                {e.previousState && e.newState ? ` · ${e.previousState} → ${e.newState}` : ""}
              </p>
              {e.reason && <p>“{e.reason}”</p>}
            </div>
            <time dateTime={e.at}>{formatDateTime(e.at)}</time>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Append-only moderation log. Entries are hash-chained on the server, and
 * the integrity check re-walks the chain to detect any edited entry.
 */
export default function HistoryPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const [params, setParams] = useSearchParams();
  const action = params.get("action") ?? "";
  const page = Number(params.get("page")) || 1;
  const [check, setCheck] = useState<{ intact: boolean; checked: number; brokenAt: number | null } | null>(null);
  const [checking, setChecking] = useState(false);

  const list = useAdminQuery(() => supportAdminApi.history({ action: action || undefined, page }), [action, page]);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const verify = async () => {
    setChecking(true);
    try {
      setCheck(await supportAdminApi.verifyHistory());
    } catch (error) {
      toast("error", adminError(error, "Couldn't run the integrity check."));
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card
      title="Moderation History"
      icon={<History size={20} />}
      action={
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void verify()} disabled={checking}>
          <ShieldCheck size={15} /> {checking ? "Checking…" : "Verify integrity"}
        </button>
      }
    >
      {check && (
        <p className={`fksm-notice ${check.intact ? "fksm-notice--ok" : "fksm-notice--error"}`} role="status" style={{ marginBottom: 12 }}>
          {check.intact
            ? `All ${check.checked.toLocaleString()} entries verified — the log has not been altered.`
            : `Integrity check failed at entry #${check.brokenAt}. Entries from that point may have been altered; escalate to a super admin.`}
        </p>
      )}
      <div className="fksm-tabs" role="tablist" aria-label="Action">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" role="tab" aria-selected={action === f.value} className={action === f.value ? "is-active" : ""} onClick={() => set("action", f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<History size={24} />} title="No moderation actions yet" text="Every hide, restore, warning, escalation and report decision is recorded here and can't be edited." />
      ) : (
        <>
          <EventList events={list.data.items} />
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </Card>
  );
}
