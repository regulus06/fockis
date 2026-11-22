/**
 * GroupTabsPeople.tsx — Overview, Members, Leadership and Teams tabs.
 */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, Globe, History, Languages, Loader2, Mail, MapPin, MessageSquare, Pencil, Plus, Search, ShieldCheck, Target, Trash2, UserMinus, UserPlus, Users, UsersRound } from "lucide-react";

import { GROUP_ROLE_LABELS, categoryLabel, communitiesApi, type MemberRow, type Team } from "./communitiesApi";
import { Empty, Field, Modal, PersonAvatar, Tone, fmtDate } from "./GroupParts";
import { ErrorBox, Loading, act, useLoad, type TabProps } from "./GroupTabKit";

/* ============================================================================
 * Overview
 * ========================================================================== */

export function OverviewTab({ organizationId, group }: TabProps) {
  const g = group;
  const s = g.settings;
  const member = g.viewer.isMember || g.viewer.canCoordinate;
  const meetings = useLoad((sig) => (member && s.services.meetings ? communitiesApi.meetings(organizationId, g.id, "upcoming", sig) : Promise.resolve(null)), [organizationId, g.id, member]);
  const posts = useLoad((sig) => (member ? communitiesApi.posts(organizationId, g.id, "announcement", sig) : Promise.resolve(null)), [organizationId, g.id, member]);
  const meet = s.meeting;
  return (
    <div className="gc-overview">
      <section className="mn-panel">
        <h3 className="gc-h3">About</h3>
        <p className="gc-pre">{g.description || "No description yet."}</p>
        {(g.mission || g.objectives) && (
          <div className="gc-two">
            {g.mission && (
              <div>
                <h4>
                  <Target aria-hidden="true" /> Mission
                </h4>
                <p className="gc-pre">{g.mission}</p>
              </div>
            )}
            {g.objectives && (
              <div>
                <h4>
                  <ShieldCheck aria-hidden="true" /> Objectives
                </h4>
                <p className="gc-pre">{g.objectives}</p>
              </div>
            )}
          </div>
        )}
      </section>
      <section className="mn-panel">
        <h3 className="gc-h3">Details</h3>
        <ul className="gc-facts">
          <li>
            <UsersRound aria-hidden="true" /> <span>Category</span> <b>{categoryLabel(g.category)}</b>
          </li>
          <li>
            <CalendarDays aria-hidden="true" /> <span>Meets</span> <b>{[meet.frequency && meet.frequency[0].toUpperCase() + meet.frequency.slice(1), meet.day].filter(Boolean).join(" · ") || g.meetingSchedule || "—"}</b>
          </li>
          <li>
            <Clock aria-hidden="true" /> <span>Time</span> <b>{meet.startTime ? `${meet.startTime}${meet.endTime ? ` – ${meet.endTime}` : ""}` : "—"}</b>
          </li>
          <li>
            <MapPin aria-hidden="true" /> <span>Location</span> <b>{g.location || meet.location || (meet.mode === "online" ? "Online" : "—")}</b>
          </li>
          <li>
            <Globe aria-hidden="true" /> <span>Format</span> <b>{{ in_person: "In person", online: "Online", hybrid: "Hybrid" }[meet.mode]}</b>
          </li>
          <li>
            <Languages aria-hidden="true" /> <span>Language</span> <b>{g.language || "—"}</b>
          </li>
          <li>
            <Users aria-hidden="true" /> <span>Capacity</span> <b>{g.capacity ? `${g.memberCount} / ${g.capacity}` : `${g.memberCount} members`}</b>
          </li>
          {(s.minAge != null || s.maxAge != null) && (
            <li>
              <Users aria-hidden="true" /> <span>Ages</span> <b>{`${s.minAge ?? "any"} – ${s.maxAge ?? "any"}`}</b>
            </li>
          )}
        </ul>
        {s.requirements && (
          <div className="mn-callout" style={{ marginTop: 12 }}>
            <b>Membership requirements:</b> {s.requirements}
          </div>
        )}
      </section>
      {member && (
        <>
          <section className="mn-panel">
            <h3 className="gc-h3">Next meetings</h3>
            {!meetings.data ? (
              <div className="mn-sk" style={{ height: 60 }} />
            ) : meetings.data.items.length === 0 ? (
              <p className="mn-muted">No upcoming meetings.</p>
            ) : (
              <ul className="mn-list">
                {meetings.data.items.slice(0, 3).map((m) => (
                  <li key={m.id} className="mn-list__row">
                    <div className="mn-list__main">
                      <b>{m.title}</b>
                      <span>
                        {fmtDate(m.nextAt, true)} · {m.mode === "online" ? "Online" : m.location || "—"}
                      </span>
                    </div>
                    <span />
                    <span />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="mn-panel">
            <h3 className="gc-h3">Latest announcements</h3>
            {!posts.data ? (
              <div className="mn-sk" style={{ height: 60 }} />
            ) : posts.data.items.length === 0 ? (
              <p className="mn-muted">No announcements yet.</p>
            ) : (
              posts.data.items.slice(0, 2).map((p) => (
                <article key={p.id} className="gc-post gc-post--mini">
                  <b>{p.title || (p.kind === "notice" ? "Important notice" : "Announcement")}</b>
                  <p className="gc-pre">{p.body.length > 240 ? `${p.body.slice(0, 240)}…` : p.body}</p>
                  <small>
                    {p.authorName} · {fmtDate(p.createdAt, true)}
                  </small>
                </article>
              ))
            )}
          </section>
        </>
      )}
      {!member && (
        <section className="mn-panel">
          <p className="mn-muted">Join the group to see its meetings, discussions, Bible studies and resources.</p>
        </section>
      )}
    </div>
  );
}

/* ============================================================================
 * Members
 * ========================================================================== */

export function MembersTab({ organizationId, group, notify, onChanged }: TabProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const list = useLoad((s) => communitiesApi.members(organizationId, group.id, { search, status }, s), [organizationId, group.id, search, status]);
  const requests = useLoad((s) => (group.viewer.canApproveRequests ? communitiesApi.requests(organizationId, { groupId: group.id, scope: "managed", status: "pending" }, s) : Promise.resolve(null)), [organizationId, group.id]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [history, setHistory] = useState<MemberRow | null>(null);
  const [messaging, setMessaging] = useState(false);
  const v = group.viewer;
  const manage = v.canManageMembers;

  async function decide(id: string, d: "approve" | "reject") {
    if (await act(notify, () => communitiesApi.reviewRequest(organizationId, id, d), d === "approve" ? "Member approved." : "Request declined.", "The request could not be updated.")) {
      requests.reload();
      list.reload();
      onChanged();
    }
  }

  async function remove(m: MemberRow) {
    if (!window.confirm(`Remove ${m.displayName} from ${group.name}?`)) return;
    if (await act(notify, () => communitiesApi.removeMember(organizationId, group.id, m.membershipId), `${m.displayName} was removed.`, "The member could not be removed.")) {
      list.reload();
      onChanged();
    }
  }

  async function suspend(m: MemberRow, suspend: boolean) {
    if (await act(notify, () => communitiesApi.updateMember(organizationId, group.id, m.membershipId, { status: suspend ? "suspended" : "active" }), suspend ? "Membership suspended." : "Membership reinstated.", "The membership could not be updated.")) {
      list.reload();
      onChanged();
    }
  }

  return (
    <div className="mn-stack">
      {requests.data && requests.data.items.length > 0 && (
        <section className="mn-panel">
          <header className="mn-panel__head">
            <h3>
              <UserPlus aria-hidden="true" /> Applications <Tone tone="amber">{requests.data.items.length} pending</Tone>
            </h3>
          </header>
          <ul className="mn-list">
            {requests.data.items.map((r) => (
              <li key={r.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{r.applicantName}</b>
                  <span>{fmtDate(r.createdAt, true)}</span>
                  {r.message && <em>“{r.message}”</em>}
                </div>
                <span />
                <div className="mn-list__actions">
                  <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => decide(r.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => decide(r.id, "reject")}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <UsersRound aria-hidden="true" /> Members {list.data && <Tone tone="blue">{list.data.items.length}</Tone>}
          </h3>
          <div className="mn-row">
            {v.canCoordinate && (
              <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setMessaging(true)}>
                <MessageSquare aria-hidden="true" /> Message
              </button>
            )}
            {manage && (
              <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setAdding(true)}>
                <UserPlus aria-hidden="true" /> Add member
              </button>
            )}
          </div>
        </header>
        <div className="mn-row gc-filters">
          <label className="mn-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {manage && (
            <select className="mn-input gc-narrow" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="removed">Removed</option>
              <option value="left">Left</option>
            </select>
          )}
        </div>
        {list.error && <ErrorBox text={list.error} />}
        {!list.data && !list.error && <div className="mn-sk" style={{ height: 120 }} />}
        {list.data && list.data.items.length === 0 && <Empty icon={UsersRound} title="No members" text={status === "active" ? "Add church members or approve applications." : "No one with this status."} />}
        {list.data && list.data.items.length > 0 && (
          <ul className="mn-list">
            {list.data.items.map((m) => (
              <li key={m.membershipId} className="mn-list__row">
                <div className="mn-list__main mn-list__main--person">
                  <PersonAvatar name={m.displayName} src={m.avatarUrl} size={36} />
                  <div>
                    <b>{m.displayName}</b>
                    <span>{[m.roleLabel, m.teams.join(", "), m.joinedAt ? `joined ${fmtDate(m.joinedAt)}` : ""].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
                {m.role !== "member" ? <Tone tone="purple">{m.roleLabel}</Tone> : m.status !== "active" ? <Tone tone="gray">{m.status}</Tone> : <span />}
                <div className="mn-list__actions">
                  <Link className="mn-iconbtn" to={`/messages/profile/${encodeURIComponent(m.userId)}`} aria-label={`Message ${m.displayName}`} title="Message">
                    <Mail aria-hidden="true" />
                  </Link>
                  {manage && (
                    <>
                      <button type="button" className="mn-iconbtn" aria-label={`History of ${m.displayName}`} title="Membership history" onClick={() => setHistory(m)}>
                        <History aria-hidden="true" />
                      </button>
                      {status === "active" && (
                        <>
                          <button type="button" className="mn-iconbtn" aria-label={`Edit role of ${m.displayName}`} title="Role" onClick={() => setEditing(m)}>
                            <Pencil aria-hidden="true" />
                          </button>
                          <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" onClick={() => suspend(m, true)}>
                            Suspend
                          </button>
                          <button type="button" className="mn-iconbtn" aria-label={`Remove ${m.displayName}`} title="Remove" onClick={() => remove(m)}>
                            <UserMinus aria-hidden="true" />
                          </button>
                        </>
                      )}
                      {status === "suspended" && (
                        <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => suspend(m, false)}>
                          Reinstate
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {adding && <AddMemberDialog organizationId={organizationId} groupId={group.id} onClose={() => setAdding(false)} onAdded={() => (list.reload(), onChanged())} notify={notify} />}
      {editing && (
        <RoleDialog
          organizationId={organizationId}
          groupId={group.id}
          member={editing}
          canAppointLeader={v.governs}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            list.reload();
            onChanged();
          }}
          notify={notify}
        />
      )}
      {history && <HistoryDialog organizationId={organizationId} groupId={group.id} member={history} onClose={() => setHistory(null)} />}
      {messaging && <MessageDialog organizationId={organizationId} groupId={group.id} canTarget onClose={() => setMessaging(false)} notify={notify} />}
    </div>
  );
}

function AddMemberDialog({ organizationId, groupId, onClose, onAdded, notify }: { organizationId: string; groupId: string; onClose: () => void; onAdded: () => void; notify: TabProps["notify"] }) {
  const [q, setQ] = useState("");
  const list = useLoad((s) => communitiesApi.candidates(organizationId, groupId, q, s), [organizationId, groupId, q]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  async function add(id: string, name: string) {
    setBusy(id);
    if (await act(notify, () => communitiesApi.addMember(organizationId, groupId, id), `${name} was added.`, "The member could not be added.")) {
      setAdded((s) => new Set(s).add(id));
      onAdded();
    }
    setBusy(null);
  }
  return (
    <Modal title="Add church members" subtitle="Existing active members only — no new accounts are created." onClose={onClose} footer={<button type="button" className="mn-btn mn-btn--primary" onClick={onClose}>Done</button>}>
      <div className="mn-form">
        <input className="mn-input" type="search" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {list.error && <ErrorBox text={list.error} />}
        {!list.data && <div className="mn-sk" style={{ height: 100 }} />}
        <ul className="mn-list">
          {list.data?.items.length === 0 && <li className="mn-muted">Everyone is already in the group.</li>}
          {list.data?.items.map((p) => (
            <li key={p.membershipId} className="mn-list__row">
              <div className="mn-list__main mn-list__main--person">
                <PersonAvatar name={p.displayName} src={p.avatarUrl} size={30} />
                <div>
                  <b>{p.displayName}</b>
                  <span>{p.churchRole.replace(/_/g, " ")}</span>
                </div>
              </div>
              <span />
              {added.has(p.membershipId) ? (
                <Tone tone="green">Added</Tone>
              ) : (
                <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === p.membershipId} onClick={() => add(p.membershipId, p.displayName)}>
                  {busy === p.membershipId ? <Loader2 className="mn-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />} Add
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function RoleDialog({ organizationId, groupId, member, canAppointLeader, onClose, onDone, notify }: { organizationId: string; groupId: string; member: MemberRow; canAppointLeader: boolean; onClose: () => void; onDone: () => void; notify: TabProps["notify"] }) {
  const [role, setRole] = useState(member.role);
  const [title, setTitle] = useState(member.roleLabel === (GROUP_ROLE_LABELS[member.role] ?? "") ? "" : member.roleLabel);
  const [busy, setBusy] = useState(false);
  const locked = member.role === "leader" && !canAppointLeader;
  const roles = Object.keys(GROUP_ROLE_LABELS).filter((r) => canAppointLeader || r !== "leader");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const input: { role?: string; title: string } = { title };
    if (!locked && role !== member.role) input.role = role;
    if (await act(notify, () => communitiesApi.updateMember(organizationId, groupId, member.membershipId, input), "Role updated.", "The role could not be updated.")) onDone();
    setBusy(false);
  }
  return (
    <Modal
      title={`Role of ${member.displayName}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-role" className="mn-btn mn-btn--primary" disabled={busy}>
            Save
          </button>
        </>
      }
    >
      <form id="gc-role" className="mn-form" onSubmit={save}>
        {locked && <div className="mn-callout">Only church leadership can change a group leader.</div>}
        <Field label="Group role">
          <select className="mn-input" value={role} disabled={locked} onChange={(e) => setRole(e.target.value)}>
            {(locked ? ["leader"] : roles).map((r) => (
              <option key={r} value={r}>
                {GROUP_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Custom title" hint="Shown instead of the role name, e.g. “Worship coordinator”.">
          <input className="mn-input" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

function HistoryDialog({ organizationId, groupId, member, onClose }: { organizationId: string; groupId: string; member: MemberRow; onClose: () => void }) {
  const h = useLoad((s) => communitiesApi.memberHistory(organizationId, groupId, member.membershipId, s), [organizationId, groupId, member.membershipId]);
  return (
    <Modal title={`${member.displayName} — membership history`} onClose={onClose}>
      {h.error && <ErrorBox text={h.error} />}
      {!h.data && !h.error && <div className="mn-sk" style={{ height: 100 }} />}
      {h.data && h.data.history.length === 0 && <p className="mn-muted">No history recorded yet.</p>}
      {h.data && h.data.history.length > 0 && (
        <ol className="mn-history">
          {h.data.history.map((x, i) => (
            <li key={i}>
              <b>{x.action}</b>
              <span>
                {x.byName || "—"} · {fmtDate(x.at, true)}
              </span>
              {x.detail && <p>{x.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

export function MessageDialog({ organizationId, groupId, canTarget, onClose, notify }: { organizationId: string; groupId: string; canTarget: boolean; onClose: () => void; notify: TabProps["notify"] }) {
  const [audience, setAudience] = useState(canTarget ? "all" : "leaders");
  const [teamId, setTeamId] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const teams = useLoad((s) => (canTarget ? communitiesApi.teams(organizationId, groupId, s) : Promise.resolve(null)), [organizationId, groupId]);
  const members = useLoad((s) => (canTarget && audience === "selected" ? communitiesApi.members(organizationId, groupId, {}, s) : Promise.resolve(null)), [organizationId, groupId, audience]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await communitiesApi.message(organizationId, groupId, { audience, teamId: teamId || undefined, membershipIds: [...picked], text: text.trim() });
      notify("ok", `Message sent to ${r.sent} of ${r.total} people through Fockis Messages.`);
      onClose();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "The message could not be sent.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Send a message"
      subtitle="Delivered as private Fockis Messages."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-msg" className="mn-btn mn-btn--primary" disabled={busy || !text.trim()}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Send
          </button>
        </>
      }
    >
      <form id="gc-msg" className="mn-form" onSubmit={send}>
        {canTarget && (
          <Field label="To">
            <select className="mn-input" value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">All members</option>
              <option value="team">A team</option>
              <option value="selected">Selected members</option>
              <option value="leaders">Group leadership</option>
            </select>
          </Field>
        )}
        {audience === "team" && (
          <Field label="Team">
            <select className="mn-input" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Choose…</option>
              {teams.data?.items.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {audience === "selected" && (
          <div className="mn-checklist">
            {!members.data && <div className="mn-sk" style={{ height: 60 }} />}
            {members.data?.items.map((m) => (
              <label key={m.membershipId} className="mn-check">
                <input
                  type="checkbox"
                  checked={picked.has(m.membershipId)}
                  onChange={(e) =>
                    setPicked((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(m.membershipId);
                      else n.delete(m.membershipId);
                      return n;
                    })
                  }
                />
                {m.displayName}
              </label>
            ))}
          </div>
        )}
        <Field label="Message" required>
          <textarea className="mn-input" rows={5} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Leadership
 * ========================================================================== */

export function LeadershipTab({ group }: TabProps) {
  const leaders = group.leaders;
  return (
    <section className="mn-panel">
      <header className="mn-panel__head">
        <h3>
          <ShieldCheck aria-hidden="true" /> Leadership
        </h3>
      </header>
      {leaders.length === 0 ? (
        <Empty icon={ShieldCheck} title="No leaders yet" text="Church leadership appoints group leaders." />
      ) : (
        <div className="gc-leadergrid">
          {leaders.map((l) => (
            <article key={l.membershipId} className="gc-leader">
              <PersonAvatar name={l.displayName} src={l.avatarUrl} size={64} />
              <b>{l.displayName}</b>
              <span>{l.roleLabel}</span>
              {l.userId && (
                <Link className="mn-btn mn-btn--outline mn-btn--sm" to={`/messages/profile/${encodeURIComponent(l.userId)}`}>
                  <Mail aria-hidden="true" /> Message
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
      {group.viewer.canManage && <p className="mn-muted" style={{ marginTop: 12 }}>Change leadership roles from the Members tab or with Edit group.</p>}
    </section>
  );
}

/* ============================================================================
 * Teams
 * ========================================================================== */

export function TeamsTab({ organizationId, group, notify }: TabProps) {
  const teams = useLoad((s) => communitiesApi.teams(organizationId, group.id, s), [organizationId, group.id]);
  const [editing, setEditing] = useState<Team | "new" | null>(null);
  async function remove(t: Team) {
    if (!window.confirm(`Delete the team "${t.name}"?`)) return;
    if (await act(notify, () => communitiesApi.deleteTeam(organizationId, group.id, t.id), "Team deleted.", "The team could not be deleted.")) teams.reload();
  }
  if (teams.error) return <ErrorBox text={teams.error} />;
  if (!teams.data) return <Loading />;
  return (
    <section className="mn-panel">
      <header className="mn-panel__head">
        <h3>
          <Users aria-hidden="true" /> Teams
        </h3>
        {teams.data.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New team
          </button>
        )}
      </header>
      {teams.data.items.length === 0 ? (
        <Empty icon={Users} title="No teams yet" text="Split the group into smaller teams — e.g. Morning Prayer, Evening Prayer and Intercession." />
      ) : (
        <div className="mn-teams">
          {teams.data.items.map((t) => (
            <article key={t.id} className="mn-team">
              <header>
                <b>
                  {t.name} {t.status === "inactive" && <Tone tone="gray">inactive</Tone>}
                </b>
                {t.canEdit && (
                  <span className="mn-row">
                    <button type="button" className="mn-iconbtn" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                      <Pencil aria-hidden="true" />
                    </button>
                    {teams.data?.canManage && (
                      <button type="button" className="mn-iconbtn" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    )}
                  </span>
                )}
              </header>
              {t.description && <p className="mn-muted">{t.description}</p>}
              <p>
                <small className="mn-muted">Leader</small> <b>{t.leaderName || "—"}</b>
                {t.assistantName && (
                  <>
                    {" "}
                    · <small className="mn-muted">Assistant</small> <b>{t.assistantName}</b>
                  </>
                )}
              </p>
              {t.responsibilities && (
                <p>
                  <small className="mn-muted">Responsibilities</small> {t.responsibilities}
                </p>
              )}
              {t.schedule && (
                <p>
                  <small className="mn-muted">Schedule</small> {t.schedule}
                </p>
              )}
              <div className="mn-chips">
                {t.members.length === 0 && <span className="mn-muted">No members yet</span>}
                {t.members.map((m) => (
                  <span key={m.membershipId} className="mn-chip">
                    {m.displayName}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <TeamDialog
          organizationId={organizationId}
          groupId={group.id}
          team={editing === "new" ? null : editing}
          canChooseLeaders={teams.data.canManage}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Team saved.");
            teams.reload();
          }}
        />
      )}
    </section>
  );
}

function TeamDialog({ organizationId, groupId, team, canChooseLeaders, onClose, onDone }: { organizationId: string; groupId: string; team: Team | null; canChooseLeaders: boolean; onClose: () => void; onDone: () => void }) {
  const roster = useLoad((s) => communitiesApi.members(organizationId, groupId, {}, s), [organizationId, groupId]);
  const [f, setF] = useState({
    name: team?.name ?? "",
    description: team?.description ?? "",
    responsibilities: team?.responsibilities ?? "",
    schedule: team?.schedule ?? "",
    status: team?.status ?? "active",
    leaderMembershipId: team?.leaderMembershipId ?? "",
    assistantMembershipId: team?.assistantMembershipId ?? "",
  });
  const [members, setMembers] = useState<Set<string>>(new Set(team?.members.map((m) => m.membershipId) ?? []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) return setError("Give the team a name.");
    setBusy(true);
    setError(null);
    const input: Record<string, unknown> = { name: f.name.trim(), description: f.description, responsibilities: f.responsibilities, schedule: f.schedule, status: f.status, memberIds: [...members] };
    if (canChooseLeaders) {
      input.leaderMembershipId = f.leaderMembershipId || null;
      input.assistantMembershipId = f.assistantMembershipId || null;
    }
    try {
      await communitiesApi.saveTeam(organizationId, groupId, team?.id ?? null, input);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The team could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  const people = roster.data?.items ?? [];
  return (
    <Modal
      title={team ? `Edit ${team.name}` : "New team"}
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="gc-team" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Save team
          </button>
        </>
      }
    >
      <form id="gc-team" className="mn-form" onSubmit={save}>
        <div className="mn-form__row">
          <Field label="Team name" required>
            <input className="mn-input" value={f.name} maxLength={80} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className="mn-input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea className="mn-input" rows={2} maxLength={600} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="mn-form__row">
          <Field label="Responsibilities">
            <textarea className="mn-input" rows={2} maxLength={600} value={f.responsibilities} onChange={(e) => setF({ ...f, responsibilities: e.target.value })} />
          </Field>
          <Field label="Schedule">
            <input className="mn-input" value={f.schedule} maxLength={200} onChange={(e) => setF({ ...f, schedule: e.target.value })} placeholder="Saturdays 7 am" />
          </Field>
        </div>
        {canChooseLeaders && (
          <div className="mn-form__row">
            <Field label="Team leader">
              <select className="mn-input" value={f.leaderMembershipId} onChange={(e) => setF({ ...f, leaderMembershipId: e.target.value })}>
                <option value="">None</option>
                {people.map((p) => (
                  <option key={p.membershipId} value={p.membershipId}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assistant leader">
              <select className="mn-input" value={f.assistantMembershipId} onChange={(e) => setF({ ...f, assistantMembershipId: e.target.value })}>
                <option value="">None</option>
                {people.map((p) => (
                  <option key={p.membershipId} value={p.membershipId}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        <Field label={`Members (${members.size})`} hint="Only members of the group can join its teams.">
          <div className="mn-checklist">
            {!roster.data && <div className="mn-sk" style={{ height: 60 }} />}
            {people.map((p) => (
              <label key={p.membershipId} className="mn-check">
                <input
                  type="checkbox"
                  checked={members.has(p.membershipId)}
                  onChange={(e) =>
                    setMembers((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(p.membershipId);
                      else n.delete(p.membershipId);
                      return n;
                    })
                  }
                />
                {p.displayName}
              </label>
            ))}
          </div>
        </Field>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}
