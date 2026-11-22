/**
 * MinistryDialogs.tsx (ministries dashboard)
 * Proposal form, proposal review, ministry policy (owner), new activity and
 * apply-to-join dialogs. Every action calls the real API; the server checks
 * permissions again.
 */

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { listMembers } from "../api/membersApi";
import { createMinistryEvent } from "../ministry/ministryApi";
import { MembershipStatus } from "../types/organization.types";
import { errorMessage } from "../ui/orgUi";
import {
  MINISTRY_CATEGORIES,
  POLICY_LEVEL_LABELS,
  POLICY_ROLES,
  PROPOSAL_STATUS_LABELS,
  categoryLabel,
  ministriesApi,
  type MinistrySummary,
  type PolicyLevel,
  type PolicyView,
  type Proposal,
  type ProposalInput,
} from "./ministriesApi";
import { Field, Modal, fmtDate } from "./MinistryParts";

function Err({ text }: { text: string | null }) {
  return text ? (
    <p className="mn-form-error" role="alert">
      {text}
    </p>
  ) : null;
}

/* ============================================================================
 * Member picker (active church members)
 * ========================================================================== */

export function MemberPicker({
  organizationId,
  value,
  onChange,
  placeholder = "Search church members…",
}: {
  organizationId: string;
  value: { id: string; name: string } | null;
  onChange: (v: { id: string; name: string } | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ id: string; name: string; role: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    const t = window.setTimeout(() => {
      listMembers(organizationId, { search: q || undefined, status: MembershipStatus.Active, pageSize: 12 }, c.signal)
        .then((r) => {
          setError(null);
          setItems(r.items.map((m) => ({ id: m.id, name: m.profile?.displayName || "Member", role: String(m.role ?? "") })));
        })
        .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Members could not be loaded.")));
    }, 220);
    return () => {
      c.abort();
      window.clearTimeout(t);
    };
  }, [q, open, organizationId]);

  if (value)
    return (
      <div className="mn-picked">
        <span>{value.name}</span>
        <button type="button" className="mn-link" onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );

  return (
    <div className="mn-picker">
      <input className="mn-input" value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} />
      {open && (
        <div className="mn-picker__list" role="listbox">
          {error && <p className="mn-muted">{error}</p>}
          {!error && items.length === 0 && <p className="mn-muted">No matching active members.</p>}
          {items.map((m) => (
            <button
              type="button"
              role="option"
              aria-selected={false}
              key={m.id}
              onClick={() => {
                onChange({ id: m.id, name: m.name });
                setOpen(false);
              }}
            >
              <b>{m.name}</b>
              <small>{m.role.replace(/_/g, " ")}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Proposal form (new or edit)
 * ========================================================================== */

export function ProposalDialog({
  organizationId,
  proposal,
  onClose,
  onDone,
}: {
  organizationId: string;
  proposal?: Proposal | null;
  onClose: () => void;
  onDone: (p: Proposal, submitted: boolean) => void;
}) {
  const [f, setF] = useState<ProposalInput>({
    name: proposal?.name ?? "",
    category: proposal?.category ?? "outreach",
    description: proposal?.description ?? "",
    purpose: proposal?.purpose ?? "",
    targetAudience: proposal?.targetAudience ?? "",
    meetingPlan: proposal?.meetingPlan ?? "",
    resourcesNeeded: proposal?.resourcesNeeded ?? "",
    proposedLeaderMembershipId: proposal?.proposedLeaderMembershipId ?? null,
  });
  const [leader, setLeader] = useState<{ id: string; name: string } | null>(
    proposal?.proposedLeaderMembershipId ? { id: proposal.proposedLeaderMembershipId, name: "Suggested leader" } : null,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "draft" | "submit">(null);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ProposalInput, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save(submit: boolean, e?: FormEvent) {
    e?.preventDefault();
    if (!f.name.trim()) return setError("Give the ministry a name.");
    if (f.description.trim().length < 10) return setError("Describe the ministry in a sentence or two.");
    setBusy(submit ? "submit" : "draft");
    setError(null);
    try {
      const input = { ...f, proposedLeaderMembershipId: leader?.id ?? null, submit };
      const saved = proposal ? await ministriesApi.updateProposal(organizationId, proposal.id, { ...input, note }) : await ministriesApi.propose(organizationId, input);
      onDone(saved, submit);
    } catch (err) {
      setError(errorMessage(err, "The proposal could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      title={proposal ? "Edit ministry proposal" : "Suggest a new ministry"}
      subtitle="Your proposal is reviewed by church leadership. You will be notified of every decision."
      onClose={onClose}
      busy={Boolean(busy)}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </button>
          {(!proposal || proposal.status === "draft") && (
            <button type="button" className="mn-btn mn-btn--outline" onClick={() => save(false)} disabled={Boolean(busy)}>
              {busy === "draft" && <Loader2 className="mn-spin" aria-hidden="true" />} Save draft
            </button>
          )}
          <button type="submit" form="mn-proposal-form" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "submit" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Submit proposal
          </button>
        </>
      }
    >
      <form id="mn-proposal-form" className="mn-form" onSubmit={(e) => save(true, e)}>
        {proposal?.status === "more_info" && proposal.reviewNote && (
          <div className="mn-callout mn-callout--amber">
            <b>Leadership asked for more information:</b> {proposal.reviewNote}
          </div>
        )}
        <div className="mn-form__row">
          <Field label="Ministry name" required>
            <input className="mn-input" value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Hospital Visitation Ministry" />
          </Field>
          <Field label="Category">
            <select className="mn-input" value={f.category} onChange={(e) => set("category", e.target.value)}>
              {MINISTRY_CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" required hint="What will this ministry do?">
          <textarea className="mn-input" rows={3} maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Purpose & vision" hint="Why does the church need it?">
          <textarea className="mn-input" rows={3} maxLength={2000} value={f.purpose} onChange={(e) => set("purpose", e.target.value)} />
        </Field>
        <div className="mn-form__row">
          <Field label="Who is it for?">
            <input className="mn-input" maxLength={300} value={f.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Youth, families, the community…" />
          </Field>
          <Field label="How often would it meet?">
            <input className="mn-input" maxLength={500} value={f.meetingPlan} onChange={(e) => set("meetingPlan", e.target.value)} placeholder="Every second Saturday…" />
          </Field>
        </div>
        <Field label="Resources needed" hint="People, budget, space or equipment.">
          <textarea className="mn-input" rows={2} maxLength={1000} value={f.resourcesNeeded} onChange={(e) => set("resourcesNeeded", e.target.value)} />
        </Field>
        <Field label="Suggested leader (optional)">
          <MemberPicker organizationId={organizationId} value={leader} onChange={setLeader} />
        </Field>
        {proposal?.status === "more_info" && (
          <Field label="Your answer to leadership">
            <textarea className="mn-input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <Err text={error} />
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Proposal review (leadership)
 * ========================================================================== */

export function ProposalReviewDialog({
  organizationId,
  proposal,
  onClose,
  onDone,
}: {
  organizationId: string;
  proposal: Proposal;
  onClose: () => void;
  onDone: (msg: string, ministryId?: string) => void;
}) {
  const [note, setNote] = useState(proposal.reviewNote ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: "under_review" | "more_info" | "approved" | "rejected" | "convert" | "convert_draft") {
    if ((kind === "more_info" || kind === "rejected") && !note.trim()) return setError("Add a note so the member knows what to do next.");
    setBusy(kind);
    setError(null);
    try {
      if (kind === "convert" || kind === "convert_draft") {
        const r = await ministriesApi.convertProposal(organizationId, proposal.id, kind === "convert");
        onDone(kind === "convert" ? `"${proposal.name}" is now a ministry.` : `"${proposal.name}" was created as a draft ministry.`, r.ministry.id);
      } else {
        await ministriesApi.reviewProposal(organizationId, proposal.id, kind, note.trim());
        onDone(`Proposal marked ${PROPOSAL_STATUS_LABELS[kind].toLowerCase()}.`);
      }
    } catch (err) {
      setError(errorMessage(err, "The proposal could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  const spin = (k: string) => busy === k && <Loader2 className="mn-spin" aria-hidden="true" />;
  const canDecide = ["submitted", "under_review", "more_info"].includes(proposal.status);

  return (
    <Modal
      title={proposal.name}
      subtitle={`${categoryLabel(proposal.category)} · proposed by ${proposal.proposedByName || "a member"} · ${PROPOSAL_STATUS_LABELS[proposal.status]}`}
      onClose={onClose}
      busy={Boolean(busy)}
      wide
      footer={
        <>
          {proposal.status === "submitted" && (
            <button type="button" className="mn-btn mn-btn--outline" disabled={Boolean(busy)} onClick={() => act("under_review")}>
              {spin("under_review")} Start review
            </button>
          )}
          {canDecide && (
            <>
              <button type="button" className="mn-btn mn-btn--outline" disabled={Boolean(busy)} onClick={() => act("more_info")}>
                {spin("more_info")} Ask for more info
              </button>
              <button type="button" className="mn-btn mn-btn--danger" disabled={Boolean(busy)} onClick={() => act("rejected")}>
                {spin("rejected")} Reject
              </button>
              <button type="button" className="mn-btn mn-btn--primary" disabled={Boolean(busy)} onClick={() => act("approved")}>
                {spin("approved")} Approve
              </button>
            </>
          )}
          {proposal.status === "approved" && (
            <>
              <button type="button" className="mn-btn mn-btn--outline" disabled={Boolean(busy)} onClick={() => act("convert_draft")}>
                {spin("convert_draft")} Create as draft
              </button>
              <button type="button" className="mn-btn mn-btn--primary" disabled={Boolean(busy)} onClick={() => act("convert")}>
                {spin("convert")} Create ministry
              </button>
            </>
          )}
        </>
      }
    >
      <div className="mn-review">
        <dl className="mn-dl">
          <dt>Description</dt>
          <dd>{proposal.description || "—"}</dd>
          <dt>Purpose & vision</dt>
          <dd>{proposal.purpose || "—"}</dd>
          <dt>Who it is for</dt>
          <dd>{proposal.targetAudience || "—"}</dd>
          <dt>Meeting plan</dt>
          <dd>{proposal.meetingPlan || "—"}</dd>
          <dt>Resources needed</dt>
          <dd>{proposal.resourcesNeeded || "—"}</dd>
        </dl>
        {proposal.status !== "converted" && proposal.status !== "rejected" && (
          <Field label="Note to the member" hint="Required when asking for more information or rejecting.">
            <textarea className="mn-input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <h4 className="mn-subhead">History</h4>
        <ol className="mn-history">
          {proposal.history.map((h, i) => (
            <li key={i}>
              <b>{PROPOSAL_STATUS_LABELS[h.status as keyof typeof PROPOSAL_STATUS_LABELS] ?? h.status}</b>
              <span>
                {h.byName || "—"} · {fmtDate(h.at, true)}
              </span>
              {h.note && <p>{h.note}</p>}
            </li>
          ))}
        </ol>
        <Err text={error} />
      </div>
    </Modal>
  );
}

/* ============================================================================
 * Policy (owner only)
 * ========================================================================== */

const LEVEL_ORDER: PolicyLevel[] = ["full", "create", "manage_assigned", "restricted", "propose", "none"];

export function PolicyDialog({ organizationId, policy, onClose, onDone }: { organizationId: string; policy: PolicyView; onClose: () => void; onDone: (p: PolicyView) => void }) {
  const [roles, setRoles] = useState<Record<string, PolicyLevel>>({ ...policy.roles });
  const [allowProposals, setAllowProposals] = useState(policy.allowProposals);
  const [defaults, setDefaults] = useState(policy.defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onDone(await ministriesApi.savePolicy(organizationId, { roles, allowProposals, defaults }));
    } catch (err) {
      setError(errorMessage(err, "Permissions could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Who can create and manage ministries"
      subtitle="Only the church owner can change these rules. The owner always has full access."
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="mn-policy-form" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Save permissions
          </button>
        </>
      }
    >
      <form id="mn-policy-form" className="mn-form" onSubmit={save}>
        <table className="mn-policy">
          <thead>
            <tr>
              <th>Role</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            {POLICY_ROLES.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>
                  <select className="mn-input" value={roles[r.key] ?? "none"} onChange={(e) => setRoles((p) => ({ ...p, [r.key]: e.target.value as PolicyLevel }))}>
                    {LEVEL_ORDER.map((l) => (
                      <option key={l} value={l}>
                        {POLICY_LEVEL_LABELS[l].label} — {POLICY_LEVEL_LABELS[l].text}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="mn-check">
          <input type="checkbox" checked={allowProposals} onChange={(e) => setAllowProposals(e.target.checked)} /> Members may submit ministry proposals
        </label>
        <h4 className="mn-subhead">Defaults for new ministries</h4>
        <div className="mn-form__row">
          <Field label="Visibility">
            <select className="mn-input" value={defaults.visibility} onChange={(e) => setDefaults((d) => ({ ...d, visibility: e.target.value as typeof d.visibility }))}>
              <option value="public">Public — shown on the church website</option>
              <option value="members">Members only</option>
              <option value="private">Private — members of the ministry only</option>
            </select>
          </Field>
          <Field label="How people join">
            <select className="mn-input" value={defaults.joinMode} onChange={(e) => setDefaults((d) => ({ ...d, joinMode: e.target.value as typeof d.joinMode }))}>
              <option value="open">Open — members join instantly</option>
              <option value="application">Application — leaders approve</option>
              <option value="invite">Invite only — leaders add members</option>
            </select>
          </Field>
        </div>
        <div className="mn-form__row">
          <label className="mn-check">
            <input type="checkbox" checked={defaults.autoApprove} onChange={(e) => setDefaults((d) => ({ ...d, autoApprove: e.target.checked }))} /> Auto-approve applications
          </label>
          <label className="mn-check">
            <input type="checkbox" checked={defaults.allowFinanceRequests} onChange={(e) => setDefaults((d) => ({ ...d, allowFinanceRequests: e.target.checked }))} /> Allow finance requests
          </label>
        </div>
        <Err text={error} />
      </form>
    </Modal>
  );
}

/* ============================================================================
 * New activity (creates a church event linked to the ministry)
 * ========================================================================== */

export function ActivityDialog({
  organizationId,
  ministries,
  onClose,
  onDone,
}: {
  organizationId: string;
  ministries: MinistrySummary[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [ministryId, setMinistryId] = useState(ministries[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [rsvp, setRsvp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!ministryId || !title.trim() || !start) return setError("Choose a ministry, a title and a start time.");
    if (end && new Date(end) <= new Date(start)) return setError("The end must be after the start.");
    setBusy(true);
    setError(null);
    try {
      await createMinistryEvent(organizationId, ministryId, {
        title: title.trim(),
        startsAt: new Date(start).toISOString(),
        endsAt: end ? new Date(end).toISOString() : undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        requiresRsvp: rsvp,
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "The activity could not be created."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New ministry activity"
      subtitle="Activities are church events linked to a ministry; they appear in Events and on the ministry page."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="mn-activity-form" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Create activity
          </button>
        </>
      }
    >
      <form id="mn-activity-form" className="mn-form" onSubmit={save}>
        <Field label="Ministry" required>
          <select className="mn-input" value={ministryId} onChange={(e) => setMinistryId(e.target.value)}>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title" required>
          <input className="mn-input" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Youth game night" />
        </Field>
        <div className="mn-form__row">
          <Field label="Starts" required>
            <input className="mn-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Ends">
            <input className="mn-input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Location">
          <input className="mn-input" value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} placeholder="Fellowship hall, or an online link" />
        </Field>
        <Field label="Description">
          <textarea className="mn-input" rows={3} value={description} maxLength={3000} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="mn-check">
          <input type="checkbox" checked={rsvp} onChange={(e) => setRsvp(e.target.checked)} /> Ask people to RSVP
        </label>
        <Err text={error} />
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Apply to join
 * ========================================================================== */

export function ApplyDialog({
  organizationId,
  ministry,
  onClose,
  onDone,
}: {
  organizationId: string;
  ministry: { id: string; name: string; joinMode: string };
  onClose: () => void;
  onDone: (approved: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = ministry.joinMode === "open";

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const app = await ministriesApi.apply(organizationId, ministry.id, message.trim());
      onDone(app.status === "approved");
    } catch (err) {
      setError(errorMessage(err, "Your request could not be sent."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={open ? `Join ${ministry.name}` : `Apply to ${ministry.name}`}
      subtitle={open ? "You will join right away." : "The ministry leaders review applications and you will be notified."}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="mn-apply-form" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy ? <Loader2 className="mn-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />} {open ? "Join ministry" : "Send application"}
          </button>
        </>
      }
    >
      <form id="mn-apply-form" className="mn-form" onSubmit={send}>
        <Field label={open ? "Message (optional)" : "Why would you like to serve here?"}>
          <textarea className="mn-input" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <Err text={error} />
      </form>
    </Modal>
  );
}
