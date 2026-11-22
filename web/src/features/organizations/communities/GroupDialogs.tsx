/**
 * GroupDialogs.tsx
 * Proposal form and review, owner permissions, invitations and join requests.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2, Paperclip, Send, UserPlus, X } from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import { MemberPicker } from "../ministries/MinistryDialogs";
import {
  GROUP_CATEGORIES,
  PROPOSAL_LABELS,
  categoryLabel,
  communitiesApi,
  type GroupPolicyLevel,
  type PolicyView,
  type Proposal,
} from "./communitiesApi";
import { Field, Modal, PersonAvatar, fmtDate } from "./GroupParts";

function Err({ text }: { text: string | null }) {
  return text ? (
    <p className="mn-form-error" role="alert">
      {text}
    </p>
  ) : null;
}

/* ============================================================================
 * Proposal
 * ========================================================================== */

export function ProposalDialog({ organizationId, proposal, onClose, onDone }: { organizationId: string; proposal?: Proposal | null; onClose: () => void; onDone: (submitted: boolean) => void }) {
  const [name, setName] = useState(proposal?.name ?? "");
  const [category, setCategory] = useState(proposal?.category ?? "fellowship");
  const [description, setDescription] = useState(proposal?.description ?? "");
  const [purpose, setPurpose] = useState(proposal?.purpose ?? "");
  const [expected, setExpected] = useState(proposal?.expectedMembers ? String(proposal.expectedMembers) : "");
  const [activities, setActivities] = useState(proposal?.suggestedActivities ?? "");
  const [docs, setDocs] = useState<string[]>(proposal?.documentUrls ?? []);
  const [leader, setLeader] = useState<{ id: string; name: string } | null>(proposal?.proposedLeaderMembershipId ? { id: proposal.proposedLeaderMembershipId, name: "Suggested leader" } : null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "draft" | "submit" | "file">(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function attach(file: File) {
    if (file.size > 25 * 1024 * 1024) return setError("Files can be up to 25 MB.");
    setBusy("file");
    setError(null);
    try {
      const up = await communitiesApi.uploadOrgFile(organizationId, file);
      setDocs((d) => [...d, up.fileUrl].slice(0, 10));
    } catch (err) {
      setError(errorMessage(err, "The file could not be uploaded."));
    } finally {
      setBusy(null);
    }
  }

  async function save(submit: boolean, e?: FormEvent) {
    e?.preventDefault();
    if (name.trim().length < 2) return setError("Give the group a name.");
    if (description.trim().length < 10) return setError("Describe the group in a sentence or two.");
    setBusy(submit ? "submit" : "draft");
    setError(null);
    const input = {
      name: name.trim(),
      category,
      description: description.trim(),
      purpose: purpose.trim(),
      expectedMembers: expected ? Number(expected) : null,
      suggestedActivities: activities.trim(),
      documentUrls: docs,
      proposedLeaderMembershipId: leader?.id ?? null,
      submit,
      note,
    };
    try {
      if (proposal) await communitiesApi.updateProposal(organizationId, proposal.id, input);
      else await communitiesApi.propose(organizationId, input);
      onDone(submit);
    } catch (err) {
      setError(errorMessage(err, "The proposal could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      title={proposal ? "Edit group proposal" : "Propose a new group"}
      subtitle="Church leadership reviews every proposal. You will be notified of each decision; nothing is published automatically."
      onClose={onClose}
      busy={busy === "submit" || busy === "draft"}
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
          <button type="submit" form="gc-proposal" className="mn-btn mn-btn--primary" disabled={Boolean(busy)}>
            {busy === "submit" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Submit proposal
          </button>
        </>
      }
    >
      <form id="gc-proposal" className="mn-form" onSubmit={(e) => save(true, e)}>
        {proposal?.status === "more_info" && proposal.reviewNote && (
          <div className="mn-callout mn-callout--amber">
            <b>Leadership asked:</b> {proposal.reviewNote}
          </div>
        )}
        <div className="mn-form__row">
          <Field label="Proposed group name" required>
            <input className="mn-input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Young Couples Fellowship" />
          </Field>
          <Field label="Category">
            <select className="mn-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {GROUP_CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" required>
          <textarea className="mn-input" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Purpose" hint="Why should the church start this group?">
          <textarea className="mn-input" rows={2} maxLength={2000} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </Field>
        <div className="mn-form__row">
          <Field label="Expected members">
            <input className="mn-input" type="number" min={1} value={expected} onChange={(e) => setExpected(e.target.value)} />
          </Field>
          <Field label="Suggested leader">
            <MemberPicker organizationId={organizationId} value={leader} onChange={setLeader} />
          </Field>
        </div>
        <Field label="Suggested activities">
          <textarea className="mn-input" rows={2} maxLength={1000} value={activities} onChange={(e) => setActivities(e.target.value)} placeholder="Monthly dinners, Bible study, service projects…" />
        </Field>
        <Field label="Supporting documents">
          <div className="gc-files">
            {docs.map((d, i) => (
              <span key={d} className="mn-chip">
                Document {i + 1}
                <button type="button" aria-label="Remove document" onClick={() => setDocs((all) => all.filter((x) => x !== d))}>
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}
            <input ref={fileInput} type="file" hidden onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
            <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => fileInput.current?.click()} disabled={busy === "file" || docs.length >= 10}>
              {busy === "file" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />} Attach file
            </button>
          </div>
        </Field>
        {proposal?.status === "more_info" && (
          <Field label="Your answer">
            <textarea className="mn-input" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <Err text={error} />
      </form>
    </Modal>
  );
}

export function ProposalReviewDialog({ organizationId, proposal, onClose, onDone }: { organizationId: string; proposal: Proposal; onClose: () => void; onDone: (msg: string, groupId?: string) => void }) {
  const [note, setNote] = useState(proposal.reviewNote ?? "");
  const [leader, setLeader] = useState<{ id: string; name: string } | null>(proposal.proposedLeaderMembershipId ? { id: proposal.proposedLeaderMembershipId, name: "Suggested leader" } : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(kind: string) {
    if ((kind === "more_info" || kind === "rejected") && !note.trim()) return setError("Add a note so the member knows what to do next.");
    setBusy(kind);
    setError(null);
    try {
      if (kind === "convert" || kind === "convert_draft") {
        const r = await communitiesApi.convertProposal(organizationId, proposal.id, kind === "convert", leader?.id);
        onDone(kind === "convert" ? `"${proposal.name}" is now a group.` : `"${proposal.name}" was created as a draft.`, r.group.id);
      } else {
        await communitiesApi.reviewProposal(organizationId, proposal.id, kind, note.trim());
        onDone(`Proposal marked "${PROPOSAL_LABELS[kind as keyof typeof PROPOSAL_LABELS]}".`);
      }
    } catch (err) {
      setError(errorMessage(err, "The proposal could not be updated."));
    } finally {
      setBusy(null);
    }
  }
  const spin = (k: string) => busy === k && <Loader2 className="mn-spin" aria-hidden="true" />;
  const open = ["submitted", "under_review", "more_info"].includes(proposal.status);

  return (
    <Modal
      title={proposal.name}
      subtitle={`${categoryLabel(proposal.category)} · proposed by ${proposal.proposedByName || "a member"} · ${PROPOSAL_LABELS[proposal.status]}`}
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
          {open && (
            <>
              <button type="button" className="mn-btn mn-btn--outline" disabled={Boolean(busy)} onClick={() => act("more_info")}>
                {spin("more_info")} Return for changes
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
                {spin("convert")} Create group
              </button>
            </>
          )}
        </>
      }
    >
      <div className="mn-review">
        <dl className="mn-dl gc-dl">
          <dt>Description</dt>
          <dd>{proposal.description || "—"}</dd>
          <dt>Purpose</dt>
          <dd>{proposal.purpose || "—"}</dd>
          <dt>Expected members</dt>
          <dd>{proposal.expectedMembers ?? "—"}</dd>
          <dt>Suggested activities</dt>
          <dd>{proposal.suggestedActivities || "—"}</dd>
          <dt>Supporting documents</dt>
          <dd>
            {proposal.documentUrls.length
              ? proposal.documentUrls.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="gc-doclink">
                    Document {i + 1}
                  </a>
                ))
              : "—"}
          </dd>
        </dl>
        {proposal.status === "approved" && (
          <Field label="Group leader" hint="Appoint an active church member to lead the new group.">
            <MemberPicker organizationId={organizationId} value={leader} onChange={setLeader} />
          </Field>
        )}
        {open && (
          <Field label="Note to the member" hint="Required when returning for changes or rejecting.">
            <textarea className="mn-input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <h4 className="mn-subhead">History</h4>
        <ol className="mn-history">
          {proposal.history.map((h, i) => (
            <li key={i}>
              <b>{PROPOSAL_LABELS[h.status as keyof typeof PROPOSAL_LABELS] ?? h.status}</b>
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
 * Owner permissions
 * ========================================================================== */

const ROLE_ROWS = [
  ["pastor_director", "Senior Pastor"],
  ["administrator", "Church Administrator"],
  ["department_manager", "Ministry Coordinator"],
  ["leader", "Church Leader"],
  ["group_leader", "Group Leader (church role)"],
  ["member", "Church Member"],
  ["guest", "Visitor / Guest"],
] as const;
const LEVELS: [GroupPolicyLevel, string][] = [
  ["full", "Full control — create, delete, restore, approve church funds"],
  ["create", "Manage groups — create, edit, archive, approve proposals"],
  ["propose", "Member — join groups and propose new ones"],
  ["none", "View only"],
];

export function GroupPolicyDialog({ organizationId, policy, onClose, onDone }: { organizationId: string; policy: PolicyView; onClose: () => void; onDone: () => void }) {
  const [roles, setRoles] = useState<Record<string, GroupPolicyLevel>>({ ...policy.roles });
  const [allowProposals, setAllowProposals] = useState(policy.allowProposals);
  const [d, setD] = useState(policy.defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await communitiesApi.savePolicy(organizationId, { roles, allowProposals, defaults: d });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "Permissions could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Groups & Communities permissions"
      subtitle="Only the church owner can change these. Group leaders are appointed per group and only ever manage their own groups."
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="gc-policy" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Save permissions
          </button>
        </>
      }
    >
      <form id="gc-policy" className="mn-form" onSubmit={save}>
        <table className="mn-policy">
          <tbody>
            <tr>
              <td>Church Owner</td>
              <td>
                <span className="mn-muted">Always full control</span>
              </td>
            </tr>
            {ROLE_ROWS.map(([k, l]) => (
              <tr key={k}>
                <td>{l}</td>
                <td>
                  <select className="mn-input" value={roles[k] ?? "none"} onChange={(e) => setRoles((r) => ({ ...r, [k]: e.target.value as GroupPolicyLevel }))}>
                    {LEVELS.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="mn-check">
          <input type="checkbox" checked={allowProposals} onChange={(e) => setAllowProposals(e.target.checked)} /> Members may propose new groups
        </label>
        <h4 className="mn-subhead">Defaults for new groups</h4>
        <div className="mn-form__row">
          <Field label="Privacy">
            <select className="mn-input" value={d.visibility} onChange={(e) => setD({ ...d, visibility: e.target.value as typeof d.visibility })}>
              <option value="public">Public</option>
              <option value="members">Church members</option>
              <option value="private">Private</option>
              <option value="invitation">Invitation only</option>
            </select>
          </Field>
          <Field label="Join requests reviewed by">
            <select className="mn-input" value={d.approver} onChange={(e) => setD({ ...d, approver: e.target.value as typeof d.approver })}>
              <option value="leaders">Group leaders</option>
              <option value="church">Church leadership only</option>
            </select>
          </Field>
        </div>
        <label className="mn-check">
          <input type="checkbox" checked={d.requireApproval} onChange={(e) => setD({ ...d, requireApproval: e.target.checked })} /> New members need approval
        </label>
        <label className="mn-check">
          <input type="checkbox" checked={d.allowExternalInvites} onChange={(e) => setD({ ...d, allowExternalInvites: e.target.checked })} /> Allow email invitations to people outside the church
        </label>
        <Err text={error} />
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Invite
 * ========================================================================== */

export function InviteDialog({ organizationId, groupId, groupName, allowEmail, onClose, onDone }: { organizationId: string; groupId: string; groupName: string; allowEmail: boolean; onClose: () => void; onDone: (summary: string) => void }) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<{ membershipId: string; displayName: string; avatarUrl: string | null; churchRole: string }[] | null>(null);
  const [picked, setPicked] = useState<Map<string, string>>(new Map());
  const [emails, setEmails] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    const t = window.setTimeout(() => {
      communitiesApi
        .candidates(organizationId, groupId, q, c.signal)
        .then((r) => setPeople(r.items))
        .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Members could not be loaded.")));
    }, 220);
    return () => {
      c.abort();
      window.clearTimeout(t);
    };
  }, [organizationId, groupId, q]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const list = emails
      .split(/[\s,;]+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!picked.size && !list.length) return setError("Choose at least one person.");
    setBusy(true);
    setError(null);
    try {
      const r = await communitiesApi.invite(organizationId, groupId, { membershipIds: [...picked.keys()], emails: list, message: message.trim(), expiresInDays: days });
      const invited = r.results.filter((x) => x.status === "invited").length;
      const skipped = r.results.length - invited;
      onDone(`${invited} invitation${invited === 1 ? "" : "s"} sent${skipped ? `, ${skipped} skipped (already invited or a member)` : ""}.`);
    } catch (err) {
      setError(errorMessage(err, "Invitations could not be sent."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Invite to ${groupName}`}
      subtitle="Invitations expire automatically. Recipients get a Fockis notification (or an email) with a private link."
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="gc-invite" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy ? <Loader2 className="mn-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />} Send invitations
          </button>
        </>
      }
    >
      <form id="gc-invite" className="mn-form" onSubmit={send}>
        <Field label="Church members">
          <input className="mn-input" type="search" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        {picked.size > 0 && (
          <div className="gc-files">
            {[...picked].map(([id, n]) => (
              <span key={id} className="mn-chip">
                {n}
                <button
                  type="button"
                  aria-label={`Remove ${n}`}
                  onClick={() =>
                    setPicked((m) => {
                      const x = new Map(m);
                      x.delete(id);
                      return x;
                    })
                  }
                >
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        <ul className="mn-list gc-pick">
          {!people && <li className="mn-sk" style={{ height: 80 }} />}
          {people?.length === 0 && <li className="mn-muted">No other active members found.</li>}
          {people?.map((p) => (
            <li key={p.membershipId} className="mn-list__row">
              <div className="mn-list__main mn-list__main--person">
                <PersonAvatar name={p.displayName} src={p.avatarUrl} size={30} />
                <div>
                  <b>{p.displayName}</b>
                  <span>{p.churchRole.replace(/_/g, " ")}</span>
                </div>
              </div>
              <span />
              <button
                type="button"
                className={"mn-btn mn-btn--sm " + (picked.has(p.membershipId) ? "mn-btn--primary" : "mn-btn--outline")}
                onClick={() =>
                  setPicked((m) => {
                    const x = new Map(m);
                    if (x.has(p.membershipId)) x.delete(p.membershipId);
                    else x.set(p.membershipId, p.displayName);
                    return x;
                  })
                }
              >
                {picked.has(p.membershipId) ? <Check aria-hidden="true" /> : <UserPlus aria-hidden="true" />} {picked.has(p.membershipId) ? "Selected" : "Select"}
              </button>
            </li>
          ))}
        </ul>
        {allowEmail && (
          <Field label="Guests by email" hint="Separate several addresses with commas. Guests must join the church before they can accept.">
            <input className="mn-input" value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="friend@example.com" />
          </Field>
        )}
        <div className="mn-form__row">
          <Field label="Personal message">
            <input className="mn-input" value={message} maxLength={600} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Expires after">
            <select className="mn-input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[3, 7, 14, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Err text={error} />
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Join / request to join
 * ========================================================================== */

export function JoinDialog({ organizationId, group, onClose, onDone }: { organizationId: string; group: { id: string; name: string; requireApproval: boolean; requirements?: string }; onClose: () => void; onDone: (joined: boolean) => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await communitiesApi.join(organizationId, group.id, message.trim());
      onDone(r.joined);
    } catch (err) {
      setError(errorMessage(err, "Your request could not be sent."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={group.requireApproval ? `Request to join ${group.name}` : `Join ${group.name}`}
      subtitle={group.requireApproval ? "The group leaders review requests; you will be notified." : "You will join right away."}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="gc-join" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy ? <Loader2 className="mn-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />} {group.requireApproval ? "Send request" : "Join group"}
          </button>
        </>
      }
    >
      <form id="gc-join" className="mn-form" onSubmit={send}>
        {group.requirements && (
          <div className="mn-callout">
            <b>Membership requirements:</b> {group.requirements}
          </div>
        )}
        {group.requireApproval && (
          <Field label="Message to the leaders (optional)">
            <textarea className="mn-input" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
        )}
        <Err text={error} />
      </form>
    </Modal>
  );
}
