/**
 * AdminTeam.tsx — Team & Roles, Journalists and Editors views, configurable
 * role permissions (owner only).
 */

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";

import { Empty, Modal, OutletLogo, Skeleton } from "../NewsParts";
import { fmtDate, newsApi, newsError, type TeamView } from "../newsApi";
import { PageTitle, useAdmin } from "./AdminShell";

const PERM_LABELS: Record<string, string> = {
  write_articles: "Write & submit articles",
  review_articles: "Review articles",
  publish_articles: "Publish & schedule",
  manage_breaking: "Breaking news",
  manage_broadcast: "Videos, live TV, radio, podcasts",
  manage_media_library: "Media library",
  manage_team: "Manage team",
  manage_requests: "Media requests",
  view_confidential_tips: "Confidential tips",
  manage_donations: "Donations, refunds & campaigns",
  view_finance: "View donations & finance",
  manage_ads: "Advertising",
  manage_settings: "Settings, SEO & website",
  view_analytics: "Analytics",
  moderate_comments: "Moderate comments",
};

export function TeamPage({ filter }: { filter?: "journalists" | "editors" }) {
  const { outlet, notify } = useAdmin();
  const [t, setT] = useState<TeamView | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [perms, setPerms] = useState(false);
  useEffect(() => {
    newsApi
      .team(outlet.id)
      .then(setT)
      .catch((err) => setError(newsError(err)));
  }, [outlet.id]);

  const roles = filter === "journalists" ? ["journalist", "reporter", "photographer", "video_producer"] : filter === "editors" ? ["editor", "editor_in_chief"] : null;
  const items = t ? t.items.filter((m) => !roles || roles.includes(m.role)) : [];

  async function update(memberId: string, input: Record<string, unknown>, ok: string) {
    try {
      setT(await newsApi.updateMember(outlet.id, memberId, input));
      notify("ok", ok);
    } catch (err) {
      notify("error", newsError(err));
    }
  }

  return (
    <>
      <PageTitle
        title={filter === "journalists" ? "Journalists" : filter === "editors" ? "Editors" : "Team & Roles"}
        sub={filter ? "Members of your newsroom with this role. Manage roles from Team & Roles." : "Who can write, review, publish and manage your media."}
        actions={
          t?.canManage && (
            <>
              {t.canConfigure && !filter && (
                <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setPerms(true)}>
                  Role permissions
                </button>
              )}
              <button type="button" className="nm-btn nm-btn--primary" onClick={() => setAdding(true)}>
                <UserPlus /> Add member
              </button>
            </>
          )
        }
      />
      {error && <p className="nm-form-error">{error}</p>}
      {!t && !error && <Skeleton h={200} />}
      {t && items.length === 0 && <Empty title="Nobody here yet" text="Add Fockis users to your newsroom by username or email." />}
      {t && items.length > 0 && (
        <section className="nm-card nm-card--flush">
          <div className="nm-tablewrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Title</th>
                  <th>On public profile</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="nma-person">
                        <OutletLogo outlet={{ name: m.displayName, logoUrl: m.avatarUrl }} size={34} />
                        <b>{m.displayName}</b>
                      </span>
                    </td>
                    <td>
                      {m.role === "owner" || !t.canManage ? (
                        m.roleLabel
                      ) : (
                        <select className="nm-input nm-input--sm" value={m.role} onChange={(ev) => update(m.id, { role: ev.target.value }, "Role updated.")}>
                          {t.roles
                            .filter((r) => r.id !== "owner" && (t.canConfigure || r.id !== "administrator" || m.role === "administrator"))
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {t.canManage ? (
                        <input className="nm-input nm-input--sm" defaultValue={m.title} placeholder="e.g. Senior Reporter" onBlur={(ev) => ev.target.value !== m.title && update(m.id, { title: ev.target.value }, "Title saved.")} />
                      ) : (
                        m.title
                      )}
                    </td>
                    <td>
                      <input type="checkbox" checked={m.showOnProfile} disabled={!t.canManage} onChange={(ev) => update(m.id, { showOnProfile: ev.target.checked }, ev.target.checked ? "Shown on your public profile." : "Hidden from your public profile.")} aria-label="Show on public profile" />
                    </td>
                    <td>{fmtDate(m.joinedAt)}</td>
                    <td>
                      {t.canManage && m.role !== "owner" && (
                        <button
                          type="button"
                          className="nm-iconbtn"
                          aria-label={`Remove ${m.displayName}`}
                          onClick={async () => {
                            if (!window.confirm(`Remove ${m.displayName} from the newsroom?`)) return;
                            try {
                              await newsApi.removeMember(outlet.id, m.id);
                              setT(await newsApi.team(outlet.id));
                              notify("ok", "Member removed.");
                            } catch (err) {
                              notify("error", newsError(err));
                            }
                          }}
                        >
                          <Trash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {adding && t && <AddMember team={t} onClose={() => setAdding(false)} onDone={(next) => (setT(next), setAdding(false), notify("ok", "Member added."))} />}
      {perms && t && <PermissionsDialog team={t} onClose={() => setPerms(false)} onDone={(next) => (setT(next), setPerms(false), notify("ok", "Role permissions saved."))} />}
    </>
  );
}

function AddMember({ team, onClose, onDone }: { team: TeamView; onClose: () => void; onDone: (t: TeamView) => void }) {
  const { outlet } = useAdmin();
  const [f, setF] = useState({ identifier: "", role: "journalist", title: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(ev: FormEvent) {
    ev.preventDefault();
    if (!f.identifier.trim()) return setError("Enter a username or email.");
    setBusy(true);
    setError("");
    try {
      onDone(await newsApi.addMember(outlet.id, f));
    } catch (err) {
      setError(newsError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Add a team member"
      subtitle="The person needs a Fockis account."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="nma-add" className="nm-btn nm-btn--primary" disabled={busy}>
            {busy && <Loader2 className="nm-spin" />} Add
          </button>
        </>
      }
    >
      <form id="nma-add" className="nm-form" onSubmit={save}>
        <label className="nm-field">
          <span className="nm-field__label">Username or email</span>
          <input className="nm-input" value={f.identifier} onChange={(ev) => setF({ ...f, identifier: ev.target.value })} />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Role</span>
          <select className="nm-input" value={f.role} onChange={(ev) => setF({ ...f, role: ev.target.value })}>
            {team.roles
              .filter((r) => r.id !== "owner" && (team.canConfigure || r.id !== "administrator"))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
          </select>
          <small>Permissions: {(team.rolePermissions[f.role] ?? []).map((p) => PERM_LABELS[p] ?? p).join(", ") || "none"}</small>
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Title (optional)</span>
          <input className="nm-input" value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} />
        </label>
        {error && <p className="nm-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

function PermissionsDialog({ team, onClose, onDone }: { team: TeamView; onClose: () => void; onDone: (t: TeamView) => void }) {
  const { outlet } = useAdmin();
  const roles = team.roles.filter((r) => r.id !== "owner");
  const [map, setMap] = useState<Record<string, string[]>>(() => Object.fromEntries(roles.map((r) => [r.id, team.rolePermissions[r.id] ?? []])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const toggle = (role: string, p: string) => setMap((m) => ({ ...m, [role]: m[role].includes(p) ? m[role].filter((x) => x !== p) : [...m[role], p] }));
  return (
    <Modal
      title="Role permissions"
      subtitle="Adjust what each role can do in your newsroom. Owners always have every permission."
      wide
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setMap(Object.fromEntries(roles.map((r) => [r.id, team.defaults[r.id] ?? []])))}>
            Reset to defaults
          </button>
          <button
            type="button"
            className="nm-btn nm-btn--primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                onDone(await newsApi.savePermissions(outlet.id, map));
              } catch (err) {
                setError(newsError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="nm-spin" />} Save
          </button>
        </>
      }
    >
      <div className="nm-tablewrap">
        <table className="nm-table nma-permtable">
          <thead>
            <tr>
              <th>Permission</th>
              {roles.map((r) => (
                <th key={r.id}>{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.permissions.map((p) => (
              <tr key={p}>
                <td>{PERM_LABELS[p] ?? p}</td>
                {roles.map((r) => (
                  <td key={r.id} className="nm-center">
                    <input type="checkbox" checked={map[r.id]?.includes(p)} onChange={() => toggle(r.id, p)} aria-label={`${r.label}: ${PERM_LABELS[p]}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="nm-form-error">{error}</p>}
    </Modal>
  );
}
