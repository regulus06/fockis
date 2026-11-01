
import { useMemo, useState } from 'react';
import EmployerStatusBadge from './EmployerStatusBadge';
import '../styles/TeamPermissions.scss';

export type EmployerPermissionKey =
  | 'manage_company'
  | 'manage_jobs'
  | 'manage_applicants'
  | 'manage_interviews'
  | 'manage_team'
  | 'view_analytics'
  | 'manage_billing';

export type EmployerPermissionRole =
  | 'admin'
  | 'recruiter'
  | 'hiring_manager'
  | 'interviewer'
  | 'viewer';

export interface TeamPermissionDefinition {
  key: EmployerPermissionKey;
  label: string;
  description: string;
  category: string;
}

export type TeamPermissionGrants = Record<
  EmployerPermissionRole,
  EmployerPermissionKey[]
>;

export interface TeamPermissionsProps {
  permissions: TeamPermissionDefinition[];
  grants: TeamPermissionGrants;
  onChange?: (
    role: EmployerPermissionRole,
    permission: EmployerPermissionKey,
    granted: boolean,
  ) => void;
  onSave?: (grants: TeamPermissionGrants) => void | Promise<void>;
  loading?: boolean;
  saving?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  canManage?: boolean;
  error?: string | null;
  successMessage?: string | null;
  allowedRoles?: EmployerPermissionRole[];
  title?: string;
  description?: string;
  showDescriptions?: boolean;
  showSaveButton?: boolean;
}

const ROLE_DETAILS: Record<
  EmployerPermissionRole,
  { label: string; description: string }
> = {
  admin: {
    label: 'Administrator',
    description: 'Broad access to employer operations.',
  },
  recruiter: {
    label: 'Recruiter',
    description: 'Manage recruitment and candidate workflows.',
  },
  hiring_manager: {
    label: 'Hiring manager',
    description: 'Manage hiring decisions and interview activity.',
  },
  interviewer: {
    label: 'Interviewer',
    description: 'Access assigned interview workflows.',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to permitted information.',
  },
};

const ROLE_ORDER: EmployerPermissionRole[] = [
  'admin',
  'recruiter',
  'hiring_manager',
  'interviewer',
  'viewer',
];

const cloneGrants = (grants: TeamPermissionGrants): TeamPermissionGrants => ({
  admin: [...(grants.admin ?? [])],
  recruiter: [...(grants.recruiter ?? [])],
  hiring_manager: [...(grants.hiring_manager ?? [])],
  interviewer: [...(grants.interviewer ?? [])],
  viewer: [...(grants.viewer ?? [])],
});

export function TeamPermissions({
  permissions,
  grants,
  onChange,
  onSave,
  loading = false,
  saving = false,
  disabled = false,
  readOnly = false,
  canManage = true,
  error = null,
  successMessage = null,
  allowedRoles = ROLE_ORDER,
  title = 'Team permissions',
  description = 'Control what each team role can access and manage.',
  showDescriptions = true,
  showSaveButton = false,
}: TeamPermissionsProps) {
  const [selectedRole, setSelectedRole] =
    useState<EmployerPermissionRole>('recruiter');
  const [draftGrants, setDraftGrants] = useState<TeamPermissionGrants>(
    () => cloneGrants(grants),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = loading || saving;
  const isReadOnly = readOnly || !canManage || disabled;
  const visibleRoles = ROLE_ORDER.filter((role) =>
    allowedRoles.includes(role),
  );

  const selectedRoleValue = visibleRoles.includes(selectedRole)
    ? selectedRole
    : visibleRoles[0];

  const currentGrants = draftGrants[selectedRoleValue] ?? [];

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, TeamPermissionDefinition[]>>(
      (groups, permission) => {
        const category = permission.category || 'General';
        groups[category] = [...(groups[category] ?? []), permission];
        return groups;
      },
      {},
    );
  }, [permissions]);

  const updateGrant = (
    permission: EmployerPermissionKey,
    granted: boolean,
  ) => {
    if (isReadOnly || busy || !selectedRoleValue) return;

    const nextRoleGrants = granted
      ? [...new Set([...currentGrants, permission])]
      : currentGrants.filter((item) => item !== permission);

    const nextGrants = {
      ...draftGrants,
      [selectedRoleValue]: nextRoleGrants,
    };

    setDraftGrants(nextGrants);
    setLocalError(null);

    onChange?.(selectedRoleValue, permission, granted);
  };

  const handleSave = async () => {
    if (!onSave || isReadOnly || busy) return;

    setLocalError(null);

    try {
      await onSave(cloneGrants(draftGrants));
    } catch (exception) {
      setLocalError(
        exception instanceof Error
          ? exception.message
          : 'Permissions could not be saved. Please try again.',
      );
    }
  };

  const resetDraft = () => {
    setDraftGrants(cloneGrants(grants));
    setLocalError(null);
  };

  const hasChanges = ROLE_ORDER.some((role) => {
    const original = [...(grants[role] ?? [])].sort();
    const current = [...(draftGrants[role] ?? [])].sort();

    return (
      original.length !== current.length ||
      original.some((permission, index) => permission !== current[index])
    );
  });

  if (loading) {
    return (
      <section
        className="team-permissions team-permissions--loading"
        aria-label={title}
        aria-busy="true"
      >
        <div className="team-permissions__skeleton team-permissions__skeleton--heading" />
        <div className="team-permissions__skeleton team-permissions__skeleton--tabs" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="team-permissions__skeleton team-permissions__skeleton--row"
            key={index}
          />
        ))}
        <span className="team-permissions__sr-only">
          Loading team permissions
        </span>
      </section>
    );
  }

  return (
    <section className="team-permissions" aria-label={title}>
      <header className="team-permissions__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        {isReadOnly && (
          <EmployerStatusBadge
            status="read-only"
            label="Read only"
            tone="neutral"
          />
        )}
      </header>

      {visibleRoles.length === 0 ? (
        <div className="team-permissions__empty">
          No team roles are available to configure.
        </div>
      ) : (
        <>
          <div
            className="team-permissions__role-tabs"
            role="tablist"
            aria-label="Select team role"
          >
            {visibleRoles.map((role) => {
              const active = selectedRoleValue === role;

              return (
                <button
                  key={role}
                  type="button"
                  role="tab"
                  id={`team-permissions-tab-${role}`}
                  aria-selected={active}
                  aria-controls="team-permissions-panel"
                  className={
                    active
                      ? 'team-permissions__role-tab is-active'
                      : 'team-permissions__role-tab'
                  }
                  onClick={() => setSelectedRole(role)}
                  disabled={busy}
                >
                  {ROLE_DETAILS[role].label}
                </button>
              );
            })}
          </div>

          <div
            id="team-permissions-panel"
            className="team-permissions__panel"
            role="tabpanel"
            aria-labelledby={`team-permissions-tab-${selectedRoleValue}`}
          >
            <div className="team-permissions__role-heading">
              <div>
                <h3>{ROLE_DETAILS[selectedRoleValue].label}</h3>
                {showDescriptions && (
                  <p>{ROLE_DETAILS[selectedRoleValue].description}</p>
                )}
              </div>

              <span className="team-permissions__count">
                {currentGrants.length} granted
              </span>
            </div>

            {Object.entries(groupedPermissions).map(
              ([category, categoryPermissions]) => (
                <section
                  className="team-permissions__category"
                  key={category}
                  aria-label={category}
                >
                  <h4>{category}</h4>

                  {categoryPermissions.map((permission) => {
                    const checked = currentGrants.includes(permission.key);
                    const checkboxId =
                      `team-permission-${selectedRoleValue}-${permission.key}`;

                    return (
                      <div
                        className="team-permissions__permission"
                        key={permission.key}
                      >
                        <div className="team-permissions__permission-copy">
                          <label htmlFor={checkboxId}>
                            {permission.label}
                          </label>
                          {showDescriptions && (
                            <p>{permission.description}</p>
                          )}
                        </div>

                        <label className="team-permissions__toggle">
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              updateGrant(permission.key, event.target.checked)
                            }
                            disabled={isReadOnly || busy}
                          />
                          <span aria-hidden="true" />
                          <span className="team-permissions__sr-only">
                            {checked ? 'Granted' : 'Not granted'}:{' '}
                            {permission.label}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </section>
              ),
            )}
          </div>
        </>
      )}

      {(localError || error) && (
        <div className="team-permissions__message team-permissions__message--error" role="alert">
          {localError || error}
        </div>
      )}

      {successMessage && (
        <div className="team-permissions__message team-permissions__message--success" role="status">
          {successMessage}
        </div>
      )}

      {showSaveButton && onSave && (
        <footer className="team-permissions__footer">
          <button
            type="button"
            className="team-permissions__reset"
            onClick={resetDraft}
            disabled={isReadOnly || busy || !hasChanges}
          >
            Reset changes
          </button>

          <button
            type="button"
            className="team-permissions__save"
            onClick={handleSave}
            disabled={isReadOnly || busy || !hasChanges}
          >
            {busy ? 'Saving…' : 'Save permissions'}
          </button>
        </footer>
      )}
    </section>
  );
}

export default TeamPermissions;
