import { useState, type FormEvent } from 'react';
import { Check, Info, Minus, Pencil, Trash2, UserPlus, UsersRound } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerModal } from '../components/shared/EmployerModal';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { ActionMenu } from '../components/shared/ActionMenu';
import { FormField } from '../components/shared/FormField';
import { Avatar } from '../components/shared/Avatar';
import { Badge } from '../components/shared/EmployerStatusBadge';
import { useEmployerTeam } from '../hooks/useEmployerTeam';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerCapability, EmployerRole, EmployerTeamMember, EmployerTeamRole } from '../types';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, canEmployer } from '../utils/employerPermissions';
import { formatEmployerDate } from '../utils/employerFormatters';
import { isValidEmail } from '../utils/employerValidators';

const TEAM_ROLES: EmployerTeamRole[] = ['admin', 'recruiter', 'hiring_manager'];
const ALL_ROLES: EmployerRole[] = ['owner', ...TEAM_ROLES];

const CAPABILITY_LABELS: { key: EmployerCapability; label: string }[] = [
  { key: 'read', label: 'View jobs, applicants and analytics' },
  { key: 'manageApplicants', label: 'Update applicants, notes and interviews' },
  { key: 'manageJobs', label: 'Pause and activate jobs' },
  { key: 'manageCompany', label: 'Edit company profile, verification and settings' },
  { key: 'manageTeam', label: 'Invite and manage team members' },
  { key: 'manageBilling', label: 'Manage plan and billing' },
];

function RoleSelect({ value, onChange, id }: { value: EmployerTeamRole; onChange: (role: EmployerTeamRole) => void; id?: string }) {
  return (
    <div style={{ display: 'grid', gap: 8 }} role="radiogroup" id={id}>
      {TEAM_ROLES.map((role) => (
        <label key={role} className={ui.choice}>
          <input type="radio" name="team-role" checked={value === role} onChange={() => onChange(role)} />
          <div>
            <strong>{ROLE_LABELS[role]}</strong>
            <span>{ROLE_DESCRIPTIONS[role]}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

export function EmployerTeamPage() {
  const notify = useNotify();
  const me = useEmployerStore((state) => state.me);
  const { can } = useEmployerPermissions();
  const canManage = can('manageTeam');
  const { data, setData, loading, error, refetch } = useEmployerTeam();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployerTeamRole>('recruiter');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [inviting, setInviting] = useState(false);

  const [editing, setEditing] = useState<EmployerTeamMember | null>(null);
  const [editRole, setEditRole] = useState<EmployerTeamRole>('recruiter');
  const [savingRole, setSavingRole] = useState(false);
  const [removing, setRemoving] = useState<EmployerTeamMember | null>(null);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(undefined);
    setInviting(true);
    setInviteError(null);
    try {
      const updated = await employerApi.inviteTeamMember({ email: email.trim(), name: name.trim() || undefined, role });
      setData(updated);
      notify(`Invitation created for ${email.trim()}.`);
      setInviteOpen(false);
      setEmail('');
      setName('');
      setRole('recruiter');
    } catch (err) {
      setInviteError(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const saveRole = async () => {
    if (!editing) return;
    setSavingRole(true);
    try {
      const updated = await employerApi.updateTeamMember(editing.id, editRole);
      setData(updated);
      notify(`${editing.name || editing.email} is now ${ROLE_LABELS[editRole].toLowerCase()}.`);
      setEditing(null);
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Team Management"
        description="Invite recruiters and hiring managers and control what they can do."
        action={
          canManage && (
            <button type="button" className={ui.btnPrimary} onClick={() => setInviteOpen(true)}>
              <UserPlus size={16} /> Invite Member
            </button>
          )
        }
      />

      <p className={ui.notice} style={{ margin: 0 }}>
        <Info size={16} />
        Invitations are not emailed automatically. Ask the person to sign in to Fockis with the invited email and open the
        Employer Center — they will see an option to accept.
      </p>

      <div className={ui.cardFlush}>
        <div className={ui.cardHeaderPadded}>
          <div>
            <h2>Team members</h2>
            <p>{data ? `${data.members.length + 1} people` : ''}</p>
          </div>
        </div>
        {loading && !data && <EmployerLoading rows={4} />}
        {error && <EmployerError message={error} onRetry={refetch} />}
        {data && (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.responsiveTable}`}>
              <thead>
                <tr><th>Member</th><th>Email</th><th>Role</th><th>Status</th><th>Since</th><th><span className={ui.srOnly}>Actions</span></th></tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Member">
                    <span className={ui.person}>
                      <Avatar name={data.owner.isYou ? me?.user.username ?? 'Owner' : 'Owner'} />
                      <strong>{data.owner.isYou ? `${me?.user.username ?? 'You'} (you)` : 'Account owner'}</strong>
                    </span>
                  </td>
                  <td data-label="Email">{data.owner.isYou ? me?.user.email ?? '—' : '—'}</td>
                  <td data-label="Role"><Badge tone="violet">Owner</Badge></td>
                  <td data-label="Status"><Badge tone="success">Active</Badge></td>
                  <td data-label="Since">—</td>
                  <td data-label="" />
                </tr>
                {data.members.map((member) => (
                  <tr key={member.id}>
                    <td data-label="Member">
                      <span className={ui.person}>
                        <Avatar name={member.name || member.email} />
                        <strong>{member.name || member.email.split('@')[0]}{member.isYou ? ' (you)' : ''}</strong>
                      </span>
                    </td>
                    <td data-label="Email">{member.email}</td>
                    <td data-label="Role">{ROLE_LABELS[member.role]}</td>
                    <td data-label="Status">
                      <Badge tone={member.status === 'active' ? 'success' : 'warning'}>{member.status === 'active' ? 'Active' : 'Invitation pending'}</Badge>
                    </td>
                    <td data-label="Since">{formatEmployerDate(member.joinedAt ?? member.invitedAt)}</td>
                    <td data-label="">
                      <ActionMenu
                        label={`Actions for ${member.email}`}
                        items={[
                          { label: 'Edit permissions', icon: <Pencil size={15} />, hidden: !canManage, onSelect: () => { setEditing(member); setEditRole(member.role); } },
                          { label: member.status === 'invited' ? 'Revoke invitation' : 'Remove member', icon: <Trash2 size={15} />, danger: true, hidden: !canManage, onSelect: () => setRemoving(member) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.members.length === 0 && (
              <div className={ui.state} style={{ paddingTop: 24 }}>
                <span className={ui.stateIcon}><UsersRound size={22} /></span>
                <p>It's just you for now. Invite recruiters and hiring managers to collaborate.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={ui.cardFlush}>
        <div className={ui.cardHeaderPadded}>
          <div>
            <h2>Role permissions</h2>
            <p>What each role can do in the Employer Center. Enforced by the server.</p>
          </div>
        </div>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Permission</th>
                {ALL_ROLES.map((r) => <th key={r} style={{ textAlign: 'center' }}>{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_LABELS.map((capability) => (
                <tr key={capability.key}>
                  <td>{capability.label}</td>
                  {ALL_ROLES.map((r) => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      {canEmployer(r, capability.key) ? (
                        <Check size={16} color="#15803d" aria-label="Allowed" />
                      ) : (
                        <Minus size={16} color="#b0b5c9" aria-label="Not allowed" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td>Create, edit and delete job listings</td>
                {ALL_ROLES.map((r) => (
                  <td key={r} style={{ textAlign: 'center' }}>
                    {r === 'owner' ? <Check size={16} color="#15803d" aria-label="Allowed" /> : <Minus size={16} color="#b0b5c9" aria-label="Not allowed" />}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <EmployerModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        busy={inviting}
        title="Invite a team member"
        description="They get access after signing in with this email and accepting."
        footer={
          <>
            <button type="button" className={ui.btnSecondary} onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</button>
            <button type="submit" form="invite-member" className={ui.btnPrimary} disabled={inviting}>{inviting ? 'Inviting…' : 'Create invitation'}</button>
          </>
        }
      >
        <form id="invite-member" onSubmit={invite} noValidate style={{ display: 'grid', gap: 16 }}>
          <FormField label="Email" required error={emailError}>
            <input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </FormField>
          <FormField label="Name">
            <input className={ui.input} value={name} maxLength={150} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className={ui.field}>
            <span className={ui.label}>Role</span>
            <RoleSelect value={role} onChange={setRole} />
          </div>
          {inviteError && <p className={ui.fieldError} role="alert" style={{ margin: 0 }}>{inviteError}</p>}
        </form>
      </EmployerModal>

      <EmployerModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        busy={savingRole}
        title="Edit permissions"
        description={editing ? editing.name || editing.email : undefined}
        footer={
          <>
            <button type="button" className={ui.btnSecondary} onClick={() => setEditing(null)} disabled={savingRole}>Cancel</button>
            <button type="button" className={ui.btnPrimary} onClick={saveRole} disabled={savingRole || editRole === editing?.role}>
              {savingRole ? 'Saving…' : 'Save role'}
            </button>
          </>
        }
      >
        <RoleSelect value={editRole} onChange={setEditRole} />
      </EmployerModal>

      <ConfirmActionModal
        open={Boolean(removing)}
        title={removing?.status === 'invited' ? 'Revoke invitation?' : 'Remove team member?'}
        description={
          removing
            ? removing.status === 'invited'
              ? `${removing.email} will no longer be able to join your Employer Center.`
              : `${removing.name || removing.email} will immediately lose access to your Employer Center.`
            : ''
        }
        confirmLabel={removing?.status === 'invited' ? 'Revoke' : 'Remove'}
        variant="danger"
        onConfirm={async () => {
          if (!removing) return;
          const updated = await employerApi.removeTeamMember(removing.id);
          setData(updated);
          notify(removing.status === 'invited' ? 'Invitation revoked.' : 'Team member removed.');
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

export default EmployerTeamPage;
