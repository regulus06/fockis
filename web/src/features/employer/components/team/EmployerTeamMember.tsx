
import { useState } from 'react';
import EmployerStatusBadge from './EmployerStatusBadge';
import '../styles/EmployerTeamMember.scss';

export type EmployerTeamMemberRole =
  | 'owner'
  | 'admin'
  | 'recruiter'
  | 'hiring_manager'
  | 'interviewer'
  | 'viewer'
  | 'custom';

export type EmployerTeamMemberStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'revoked';

export interface EmployerTeamMemberData {
  id: string;
  name: string;
  email: string;
  role: EmployerTeamMemberRole;
  status: EmployerTeamMemberStatus;
  avatarUrl?: string | null;
  jobTitle?: string;
  department?: string;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  invitedAt?: string | null;
  isCurrentUser?: boolean;
}

export interface EmployerTeamMemberProps {
  member: EmployerTeamMemberData;
  onView?: (member: EmployerTeamMemberData) => void;
  onEditRole?: (member: EmployerTeamMemberData) => void;
  onResendInvitation?: (member: EmployerTeamMemberData) => void;
  onSuspend?: (member: EmployerTeamMemberData) => void;
  onReactivate?: (member: EmployerTeamMemberData) => void;
  onRemove?: (member: EmployerTeamMemberData) => void;
  loading?: boolean;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  canManage?: boolean;
  error?: string | null;
  compact?: boolean;
  showLastActive?: boolean;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
}

function formatRole(role: EmployerTeamMemberRole): string {
  const labels: Record<EmployerTeamMemberRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    recruiter: 'Recruiter',
    hiring_manager: 'Hiring manager',
    interviewer: 'Interviewer',
    viewer: 'Viewer',
    custom: 'Custom role',
  };

  return labels[role] ?? 'Team member';
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatLastActive(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const elapsed = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return 'Active just now';
  if (minutes < 60) return `Active ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Active ${days}d ago`;

  return `Last active ${formatDate(value)}`;
}

function isSafeAvatarUrl(value?: string | null): boolean {
  if (!value) return false;

  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function EmployerTeamMember({
  member,
  onView,
  onEditRole,
  onResendInvitation,
  onSuspend,
  onReactivate,
  onRemove,
  loading = false,
  actionLoading = false,
  disabled = false,
  readOnly = false,
  canManage = false,
  error = null,
  compact = false,
  showLastActive = true,
}: EmployerTeamMemberProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const busy = loading || actionLoading;
  const canModify = canManage && !disabled && !readOnly && !busy;

  const avatarAvailable =
    !avatarFailed && isSafeAvatarUrl(member.avatarUrl);

  const statusLabel: Record<EmployerTeamMemberStatus, string> = {
    active: 'Active',
    pending: 'Invitation pending',
    suspended: 'Suspended',
    revoked: 'Access revoked',
  };

  const statusTone: Record<
    EmployerTeamMemberStatus,
    'success' | 'warning' | 'danger' | 'neutral'
  > = {
    active: 'success',
    pending: 'warning',
    suspended: 'danger',
    revoked: 'neutral',
  };

  const joinedDate = formatDate(member.joinedAt);
  const invitedDate = formatDate(member.invitedAt);
  const lastActive = formatLastActive(member.lastActiveAt);

  const handleAction = (
    callback?: (member: EmployerTeamMemberData) => void,
  ) => {
    if (!canModify || !callback) return;

    setMenuOpen(false);
    callback(member);
  };

  if (loading) {
    return (
      <div
        className="employer-team-member employer-team-member--skeleton"
        aria-label="Loading team member"
        aria-busy="true"
      >
        <span className="employer-team-member__skeleton-avatar" />
        <span className="employer-team-member__skeleton-lines">
          <span />
          <span />
          <span />
        </span>
      </div>
    );
  }

  const hasMenuActions =
    (member.status === 'pending' && Boolean(onResendInvitation)) ||
    (member.status === 'active' &&
      (Boolean(onEditRole) || Boolean(onSuspend))) ||
    (member.status === 'suspended' && Boolean(onReactivate)) ||
    Boolean(onRemove);

  return (
    <article
      className={[
        'employer-team-member',
        compact ? 'employer-team-member--compact' : '',
        member.status !== 'active'
          ? `employer-team-member--${member.status}`
          : '',
        disabled ? 'employer-team-member--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="employer-team-member__main">
        <div className="employer-team-member__identity">
          <div className="employer-team-member__avatar">
            {avatarAvailable ? (
              <img
                src={member.avatarUrl!}
                alt=""
                loading="lazy"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span aria-hidden="true">{getInitials(member.name)}</span>
            )}
          </div>

          <div className="employer-team-member__details">
            <div className="employer-team-member__name-line">
              <h3>{member.name}</h3>

              {member.isCurrentUser && (
                <span className="employer-team-member__you">
                  You
                </span>
              )}
            </div>

            <a
              className="employer-team-member__email"
              href={`mailto:${member.email}`}
            >
              {member.email}
            </a>

            {(member.jobTitle || member.department) && (
              <span className="employer-team-member__job">
                {[member.jobTitle, member.department]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </div>
        </div>

        <div className="employer-team-member__metadata">
          <span className="employer-team-member__role">
            {formatRole(member.role)}
          </span>

          <EmployerStatusBadge
            status={member.status}
            label={statusLabel[member.status]}
            tone={statusTone[member.status]}
            size="small"
          />

          {member.status === 'active' && showLastActive && lastActive && (
            <span className="employer-team-member__last-active">
              {lastActive}
            </span>
          )}

          {member.status === 'active' && joinedDate && (
            <span className="employer-team-member__date">
              Joined {joinedDate}
            </span>
          )}

          {member.status === 'pending' && invitedDate && (
            <span className="employer-team-member__date">
              Invited {invitedDate}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="employer-team-member__error" role="alert">
          {error}
        </p>
      )}

      <div className="employer-team-member__actions">
        {onView && (
          <button
            type="button"
            className="employer-team-member__view"
            onClick={() => onView(member)}
            disabled={disabled || busy}
          >
            View
          </button>
        )}

        {canManage && !readOnly && hasMenuActions && (
          <div className="employer-team-member__menu-wrap">
            <button
              type="button"
              className="employer-team-member__menu-trigger"
              onClick={() => setMenuOpen((previous) => !previous)}
              disabled={disabled || busy}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={`Actions for ${member.name}`}
            >
              <span aria-hidden="true">•••</span>
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  className="employer-team-member__menu-backdrop"
                  aria-label="Close actions menu"
                  onClick={() => setMenuOpen(false)}
                />

                <div
                  className="employer-team-member__menu"
                  role="menu"
                  aria-label={`Manage ${member.name}`}
                >
                  {member.status === 'pending' && onResendInvitation && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction(onResendInvitation)}
                      disabled={!canModify}
                    >
                      Resend invitation
                    </button>
                  )}

                  {member.status === 'active' && onEditRole && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction(onEditRole)}
                      disabled={!canModify || member.role === 'owner'}
                    >
                      Change role
                    </button>
                  )}

                  {member.status === 'active' && onSuspend && (
                    <button
                      type="button"
                      role="menuitem"
                      className="is-danger"
                      onClick={() => handleAction(onSuspend)}
                      disabled={!canModify || member.role === 'owner'}
                    >
                      Suspend access
                    </button>
                  )}

                  {member.status === 'suspended' && onReactivate && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleAction(onReactivate)}
                      disabled={!canModify}
                    >
                      Reactivate access
                    </button>
                  )}

                  {onRemove && (
                    <button
                      type="button"
                      role="menuitem"
                      className="is-danger"
                      onClick={() => handleAction(onRemove)}
                      disabled={!canModify || member.role === 'owner'}
                    >
                      Remove member
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default EmployerTeamMember;
