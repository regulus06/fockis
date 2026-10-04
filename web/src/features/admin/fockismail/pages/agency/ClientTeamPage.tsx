import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { TeamRole } from "../../types/platform.types";
import { useAsync } from "../../hooks/useAsync";
import { useAction, useMailchimp } from "../../hooks/useMailchimp";
import { agencyApi } from "../../services/agencyApi";
import { MARKETING_ROUTES } from "../../components/navigation";
import { Avatar, Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { PageHeader, Panel } from "../../components/ui/Layout";
import { SelectField, TextField } from "../../components/ui/Field";
import { EmptyState, Notice, SkeletonRows } from "../../components/ui/Feedback";
import { ActionMenu } from "../../components/ui/Menu";
import { Modal } from "../../components/ui/Overlay";
import { Icon } from "../../components/ui/Icon";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../../utils/platformLabels";
import { formatDate, timeAgo } from "../../utils/format";

const ROLES = Object.keys(ROLE_LABELS) as TeamRole[];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ClientTeamPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const run = useAction();
  const { confirm } = useMailchimp();
  const business = useAsync(() => agencyApi.getBusiness(clientId), [clientId]);
  const team = useAsync(() => agencyApi.getTeam(clientId), [clientId]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [touched, setTouched] = useState(false);

  return (
    <div className="fm-page">
      <nav className="fm-breadcrumb" aria-label="Breadcrumb">
        <Link to={MARKETING_ROUTES.clients}>Clients</Link><Icon name="chevronRight" size={14} />
        <Link to={MARKETING_ROUTES.client(clientId)}>{business.data?.name ?? "Client"}</Link><Icon name="chevronRight" size={14} />
        <span aria-current="page">Team</span>
      </nav>
      <PageHeader title="Team" description={`People who can work in ${business.data?.name ?? "this workspace"}.`} actions={<Button variant="primary" icon="plus" onClick={() => { setOpen(true); setTouched(false); }}>Invite member</Button>} />
      <Notice tone="warning">Roles here are a preview. They won't restrict access until the backend enforces permissions on every request.</Notice>
      <Panel flush>
        {team.loading ? <SkeletonRows rows={4} cols={5} /> : !team.data?.length ? <EmptyState icon="users" title="No team members" body="Invite the business owner and anyone helping with marketing." /> : (
          <div className="fm-tablewrap"><table className="fm-table">
            <thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Last active</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
            <tbody>{team.data.map((m) => (
              <tr key={m.id}>
                <td className="fm-table__primary"><div className="fm-person"><Avatar name={m.name} /><div><strong>{m.name}</strong><span className="fm-table__sub">{m.email}</span></div></div></td>
                <td>
                  <ActionMenu trigger="button" buttonLabel={ROLE_LABELS[m.role]} items={ROLES.map((r) => ({ label: ROLE_LABELS[r], icon: r === m.role ? "check" : undefined, onSelect: async () => {
                    if (r === m.role) return;
                    const next = await run(() => agencyApi.changeRole(clientId, m.id, r), `${m.name} is now ${ROLE_LABELS[r].toLowerCase()}.`);
                    if (next) team.reload();
                  } }))} />
                </td>
                <td><Badge tone={m.status === "active" ? "green" : "amber"} dot>{m.status === "active" ? "Active" : "Invited"}</Badge>{m.status === "invited" && <span className="fm-table__sub">Sent {formatDate(m.invitedAt)}</span>}</td>
                <td>{m.lastActiveAt ? timeAgo(m.lastActiveAt) : "—"}</td>
                <td className="is-actions">
                  <ActionMenu label={`Actions for ${m.name}`} items={[
                    ...(m.status === "invited" ? [{ label: "Resend invitation", icon: "mail" as const, onSelect: async () => { if (await run(() => agencyApi.resendInvite(clientId, m.id), `Invitation resent to ${m.email}.`)) team.reload(); } }] : []),
                    { label: "Remove member", icon: "trash", danger: true, onSelect: async () => {
                      if (!(await confirm({ title: `Remove ${m.name}?`, body: "They'll lose access to this workspace.", confirmLabel: "Remove", danger: true }))) return;
                      if ((await run(() => agencyApi.removeMember(clientId, m.id), `${m.name} removed.`)) !== undefined) team.reload();
                    } },
                  ]} />
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Panel>

      <Panel title="What each role can do">
        <dl className="fm-deflist">{ROLES.map((r) => <div key={r}><dt>{ROLE_LABELS[r]}</dt><dd>{ROLE_DESCRIPTIONS[r]}</dd></div>)}</dl>
      </Panel>

      <Modal open={open} title="Invite member" size="sm" onClose={() => setOpen(false)}
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={async () => {
          setTouched(true);
          if (!name.trim() || !EMAIL_RE.test(email)) return;
          const m = await run(() => agencyApi.inviteMember(clientId, name.trim(), email.trim(), role), `Invitation sent to ${email}.`);
          if (m) { setOpen(false); setName(""); setEmail(""); team.reload(); }
        }}>Send invitation</Button></>}
      >
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={touched && !name.trim() ? "Enter their name." : undefined} data-autofocus />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={touched && !EMAIL_RE.test(email) ? "Enter a valid email address." : undefined} />
        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as TeamRole)} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} hint={ROLE_DESCRIPTIONS[role]} />
      </Modal>
    </div>
  );
}
