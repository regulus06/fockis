
import { useId } from 'react';
import '../styles/TeamRoleSelector.scss';

export type TeamRole =
  | 'owner'
  | 'admin'
  | 'recruiter'
  | 'hiring_manager'
  | 'interviewer'
  | 'viewer'
  | 'custom';

export interface TeamRoleOption {
  value: TeamRole;
  label: string;
  description: string;
  permissionSummary?: string[];
  disabled?: boolean;
  recommended?: boolean;
}

export interface TeamRoleSelectorProps {
  value: TeamRole;
  onChange: (role: TeamRole) => void;
  options?: TeamRoleOption[];
  label?: string;
  description?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  showDescriptions?: boolean;
  showPermissionSummary?: boolean;
  showCurrentRole?: boolean;
  currentRoleLabel?: string;
  id?: string;
  name?: string;
}

const DEFAULT_ROLE_OPTIONS: TeamRoleOption[] = [
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Manage company settings, team access, and hiring operations.',
    permissionSummary: [
      'Manage company profile',
      'Manage jobs and applicants',
      'Manage team members',
      'Access billing and analytics',
    ],
  },
  {
    value: 'recruiter',
    label: 'Recruiter',
    description: 'Manage job postings, applicants, and recruitment workflows.',
    permissionSummary: [
      'Manage job postings',
      'Review applicants',
      'Coordinate interviews',
    ],
    recommended: true,
  },
  {
    value: 'hiring_manager',
    label: 'Hiring manager',
    description: 'Review candidates and coordinate hiring decisions.',
    permissionSummary: [
      'Review assigned applicants',
      'Participate in hiring decisions',
      'Coordinate interviews',
    ],
  },
  {
    value: 'interviewer',
    label: 'Interviewer',
    description: 'Access interview information and provide candidate feedback.',
    permissionSummary: [
      'View assigned interviews',
      'Submit interview feedback',
    ],
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View permitted employer information without managing it.',
    permissionSummary: [
      'View permitted job information',
      'View permitted recruitment information',
    ],
  },
  {
    value: 'custom',
    label: 'Custom role',
    description: 'Use a custom permission configuration assigned by an administrator.',
    permissionSummary: [
      'Permissions depend on the custom configuration',
    ],
  },
];

export function TeamRoleSelector({
  value,
  onChange,
  options = DEFAULT_ROLE_OPTIONS,
  label = 'Team member role',
  description = 'Choose the access level this team member should have.',
  disabled = false,
  readOnly = false,
  error = null,
  showDescriptions = true,
  showPermissionSummary = false,
  showCurrentRole = true,
  currentRoleLabel = 'Current role',
  id,
  name = 'team-role',
}: TeamRoleSelectorProps) {
  const generatedId = useId();
  const selectId = id ?? `team-role-selector-${generatedId}`;
  const descriptionId = `${selectId}-description`;
  const errorId = `${selectId}-error`;
  const summaryId = `${selectId}-summary`;

  const selectedOption = options.find((option) => option.value === value);
  const isDisabled = disabled || readOnly;

  const handleChange = (nextValue: string) => {
    const selected = options.find(
      (option) => option.value === nextValue && !option.disabled,
    );

    if (!selected || isDisabled) return;

    onChange(selected.value);
  };

  return (
    <section
      className={`team-role-selector${readOnly ? ' team-role-selector--readonly' : ''}`}
      aria-label={label}
    >
      <div className="team-role-selector__heading">
        <label htmlFor={selectId}>{label}</label>
        {description && (
          <p id={descriptionId}>{description}</p>
        )}
      </div>

      <div className="team-role-selector__control">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          disabled={isDisabled}
          aria-invalid={Boolean(error)}
          aria-describedby={[
            description ? descriptionId : null,
            error ? errorId : null,
            showPermissionSummary && selectedOption ? summaryId : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined}
        >
          {!selectedOption && (
            <option value={value} disabled>
              Unavailable role
            </option>
          )}

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
              {option.recommended ? ' — Recommended' : ''}
            </option>
          ))}
        </select>

        <span className="team-role-selector__chevron" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path
              d="m5 7.5 5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      {selectedOption && (
        <div className="team-role-selector__selected">
          <div className="team-role-selector__selected-heading">
            <div>
              {showCurrentRole && (
                <span className="team-role-selector__eyebrow">
                  {currentRoleLabel}
                </span>
              )}
              <strong>{selectedOption.label}</strong>
            </div>

            {selectedOption.recommended && (
              <span className="team-role-selector__recommended">
                Recommended
              </span>
            )}
          </div>

          {showDescriptions && (
            <p className="team-role-selector__role-description">
              {selectedOption.description}
            </p>
          )}

          {showPermissionSummary &&
            selectedOption.permissionSummary &&
            selectedOption.permissionSummary.length > 0 && (
              <div
                className="team-role-selector__summary"
                id={summaryId}
              >
                <span>Permission summary</span>
                <ul>
                  {selectedOption.permissionSummary.map((permission) => (
                    <li key={permission}>
                      <span aria-hidden="true">✓</span>
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {readOnly && (
        <p className="team-role-selector__readonly-note">
          You do not have permission to change this team member's role.
        </p>
      )}

      {error && (
        <p className="team-role-selector__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default TeamRoleSelector;
