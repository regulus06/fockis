import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

import { CONSEQUENCE_LABELS } from "../../reports/reportTypes";
import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import { apiMessage, policyCenterApi, type Decision } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, Pill } from "../components/PolicyUi";
import { fmtDate, useLoad } from "../components/policyUtils";

type View = "can_appeal" | "pending" | "accepted" | "rejected" | "closed";

/** Appeal states come from the existing moderation system. */
function viewOf(d: Decision): View {
  if (d.appeal.status === "pending") return "pending";
  if (d.appeal.status === "overturned") return "accepted";
  if (d.appeal.status === "upheld") return "rejected";
  if (d.canAppeal) return "can_appeal";
  return "closed";
}

const VIEW: Record<View, { label: string; tone: "blue" | "amber" | "green" | "red" | "gray" }> = {
  can_appeal: { label: "Can appeal", tone: "blue" },
  pending: { label: "Pending", tone: "amber" },
  accepted: { label: "Accepted", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  closed: { label: "Closed", tone: "gray" },
};

const FILTERS: { id: "all" | View; label: string }[] = [
  { id: "all", label: "All" },
  { id: "can_appeal", label: "Can appeal" },
  { id: "pending", label: "Pending" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
  { id: "closed", label: "Closed" },
];

function DecisionCard({ d, onAppealed }: { d: Decision; onAppealed: (d: Decision) => void }) {
  const notify = useHelpToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const view = viewOf(d);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (message.trim().length < 10) {
      notify("Tell us a little more (at least 10 characters).", "error");
      return;
    }
    setBusy(true);
    try {
      onAppealed(await policyCenterApi.appeal(d.caseId, message.trim()));
      notify("Appeal submitted. We'll let you know the outcome.");
      setOpen(false);
    } catch (e) {
      notify(apiMessage(e, "We couldn't submit your appeal."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="fk-pol-decision">
      <div className="fk-pol-decision__head">
        <div>
          <strong>{d.ruleLabel || "Community Guidelines"}</strong>
          <span>
            Decided {fmtDate(d.decidedAt)} · {d.targetType}
          </span>
        </div>
        <Pill tone={VIEW[view].tone}>{VIEW[view].label}</Pill>
      </div>
      {d.consequences.length > 0 && (
        <p className="fk-pol-decision__what">{d.consequences.map((c) => CONSEQUENCE_LABELS[c as keyof typeof CONSEQUENCE_LABELS] ?? c).join(" · ")}{d.restrictionUntil ? ` until ${fmtDate(d.restrictionUntil)}` : ""}</p>
      )}
      {d.message && <p>{d.message}</p>}
      {d.contentPreview && <blockquote>{d.contentPreview}</blockquote>}
      {d.appeal.status !== "none" && (
        <div className="fk-pol-decision__appeal">
          <span>Your appeal · {fmtDate(d.appeal.submittedAt)}</span>
          <p>{d.appeal.message}</p>
          {d.appeal.reviewedAt && (
            <p className="fk-pol-response">
              Outcome {fmtDate(d.appeal.reviewedAt)}: {d.appeal.outcomeNote || (view === "accepted" ? "The decision was reversed." : "The decision was upheld.")}
            </p>
          )}
        </div>
      )}
      {d.reversed && d.appeal.status === "none" && <p className="fk-pol-muted">This decision was reversed on {fmtDate(d.reversedAt)}.</p>}
      {view === "can_appeal" &&
        (open ? (
          <form className="fk-pol-form" onSubmit={(e) => void submit(e)}>
            <label className="fk-pol-field">
              <span>Why should we look at this again?</span>
              <textarea className="fk-pol-input fk-pol-textarea" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            <div className="fk-pol-form__actions">
              <button type="button" className="fk-pol-btn fk-pol-btn--ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="fk-pol-btn fk-pol-btn--primary" disabled={busy}>
                {busy ? "Submitting…" : "Submit appeal"}
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="fk-pol-btn fk-pol-btn--primary fk-pol-btn--sm" onClick={() => setOpen(true)}>
            Appeal this decision
          </button>
        ))}
    </li>
  );
}

function AppealsContent() {
  const { data, setData, error, loading, reload } = useLoad(() => policyCenterApi.decisions());
  const [filter, setFilter] = useState<"all" | View>("all");
  const list = useMemo(() => (data ?? []).filter((d) => filter === "all" || viewOf(d) === filter), [data, filter]);

  if (loading && !data) return <div className="fk-pol-card"><HelpLoading label="Loading decisions…" /></div>;
  if (error && !data) return <div className="fk-pol-card"><HelpError message={error} onRetry={() => void reload()} /></div>;

  return (
    <Card title="Appeals" icon={<Scale size={24} />}>
      <p className="fk-pol-intro">
        Decisions Fockis moderators made about your content or account. If you think we got it wrong, you can appeal once and a different reviewer will look at it. See the <Link to="/settings/policy/guidelines/community-guidelines">Community Guidelines</Link>.
      </p>
      <div className="fk-pol-chips" role="tablist" aria-label="Filter decisions">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={filter === f.id ? "is-active" : ""} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {!list.length ? (
        <p className="fk-pol-muted fk-pol-pad">{data?.length ? "Nothing here." : "Good news — there are no moderation decisions on your account."}</p>
      ) : (
        <ul className="fk-pol-decisions">
          {list.map((d) => (
            <DecisionCard key={d.caseId} d={d} onAppealed={(updated) => setData((data ?? []).map((x) => (x.caseId === updated.caseId ? updated : x)))} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PolicyAppealsPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="see moderation decisions and appeals">{() => <AppealsContent />}</SignedInOnly>
    </PolicyShell>
  );
}
