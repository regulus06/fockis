
import { useState } from 'react';
import '../styles/InterviewParticipants.scss';

export type InterviewParticipantRole =
  | 'candidate'
  | 'interviewer'
  | 'organizer'
  | 'observer';

export type InterviewParticipantStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'tentative'
  | 'attended'
  | 'absent';

export type InterviewParticipant = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: InterviewParticipantRole;
  status: InterviewParticipantStatus;
  isRequired?: boolean;
};

export type InterviewParticipantInvite = {
  name: string;
  email: string;
  role: Exclude<InterviewParticipantRole, 'candidate'>;
  isRequired: boolean;
};

export type InterviewParticipantsProps = {
  participants: InterviewParticipant[];
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
  removingParticipantId?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  canManageParticipants?: boolean;
  onRetry?: () => void;
  onAddParticipant?: (
    participant: InterviewParticipantInvite,
  ) => void | Promise<void>;
  onRemoveParticipant?: (
    participant: InterviewParticipant,
  ) => void | Promise<void>;
  onStatusChange?: (
    participant: InterviewParticipant,
    status: InterviewParticipantStatus,
  ) => void | Promise<void>;
  emptyMessage?: string;
};

type InviteErrors = {
  name?: string;
  email?: string;
  role?: string;
};

const ROLE_LABELS: Record<InterviewParticipantRole, string> = {
  candidate: 'Candidate',
  interviewer: 'Interviewer',
  organizer: 'Organizer',
  observer: 'Observer',
};

const STATUS_LABELS: Record<InterviewParticipantStatus, string> = {
  pending: 'Awaiting response',
  accepted: 'Accepted',
  declined: 'Declined',
  tentative: 'Tentative',
  attended: 'Attended',
  absent: 'Absent',
};

const STATUS_OPTIONS: InterviewParticipantStatus[] = [
  'pending',
  'accepted',
  'declined',
  'tentative',
  'attended',
  'absent',
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ParticipantsSkeleton() {
  return (
    <div
      className="interview-participants__skeleton"
      aria-label="Loading interview participants"
      aria-busy="true"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          className="interview-participants__skeleton-row"
          key={index}
        >
          <span className="interview-participants__skeleton-avatar" />
          <div>
            <span className="interview-participants__skeleton-line" />
            <span className="interview-participants__skeleton-line interview-participants__skeleton-line--short" />
          </div>
          <span className="interview-participants__skeleton-status" />
        </div>
      ))}
    </div>
  );
}

export function InterviewParticipants({
  participants,
  loading = false,
  error = null,
  saving = false,
  removingParticipantId = null,
  disabled = false,
  readOnly = false,
  canManageParticipants = false,
  onRetry,
  onAddParticipant,
  onRemoveParticipant,
  onStatusChange,
  emptyMessage = 'Participants added to this interview will appear here.',
}: InterviewParticipantsProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<InterviewParticipantInvite>({
    name: '',
    email: '',
    role: 'interviewer',
    isRequired: true,
  });
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [removingParticipant, setRemovingParticipant] =
    useState<InterviewParticipant | null>(null);

  const canManage =
    canManageParticipants && !disabled && !readOnly;

  const candidateCount = participants.filter(
    (participant) => participant.role === 'candidate',
  ).length;

  const interviewerCount = participants.filter(
    (participant) => participant.role === 'interviewer',
  ).length;

  const acceptedCount = participants.filter(
    (participant) =>
      participant.status === 'accepted' ||
      participant.status === 'attended',
  ).length;

  const updateInvite = <K extends keyof InterviewParticipantInvite>(
    field: K,
    value: InterviewParticipantInvite[K],
  ) => {
    setInvite((current) => ({ ...current, [field]: value }));
    setInviteErrors((current) => {
      const next = { ...current };
      delete next[field as keyof InviteErrors];
      return next;
    });
    setActionError(null);
  };

  const handleAddParticipant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!onAddParticipant || !canManage || saving) return;

    const nextErrors: InviteErrors = {};

    if (!invite.name.trim()) {
      nextErrors.name = 'Enter the participant name.';
    }

    if (!invite.email.trim()) {
      nextErrors.email = 'Enter an email address.';
    } else if (!isValidEmail(invite.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    setInviteErrors(nextErrors);
    setActionError(null);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      await onAddParticipant({
        ...invite,
        name: invite.name.trim(),
        email: invite.email.trim().toLowerCase(),
      });

      setInvite({
        name: '',
        email: '',
        role: 'interviewer',
        isRequired: true,
      });
      setInviteOpen(false);
    } catch (submissionError) {
      setActionError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to add this participant. Please try again.',
      );
    }
  };

  const handleRemoveParticipant = async () => {
    if (
      !removingParticipant ||
      !onRemoveParticipant ||
      !canManage ||
      removingParticipantId
    ) {
      return;
    }

    setActionError(null);

    try {
      await onRemoveParticipant(removingParticipant);
      setRemovingParticipant(null);
    } catch (removeError) {
      setActionError(
        removeError instanceof Error
          ? removeError.message
          : 'Unable to remove this participant. Please try again.',
      );
    }
  };

  const handleStatusChange = async (
    participant: InterviewParticipant,
    status: InterviewParticipantStatus,
  ) => {
    if (!onStatusChange || !canManage || saving) return;

    setActionError(null);

    try {
      await onStatusChange(participant, status);
    } catch (statusError) {
      setActionError(
        statusError instanceof Error
          ? statusError.message
          : 'Unable to update participant status.',
      );
    }
  };

  return (
    <section
      className="interview-participants"
      aria-label="Interview participants"
      aria-busy={loading || saving}
    >
      <header className="interview-participants__header">
        <div>
          <span className="interview-participants__eyebrow">
            INTERVIEW TEAM
          </span>
          <h2>Participants</h2>
          <p>Manage the people involved in this interview.</p>
        </div>

        {onAddParticipant && (
          <button
            type="button"
            className="interview-participants__add-button"
            onClick={() => {
              setInviteOpen((current) => !current);
              setActionError(null);
            }}
            disabled={!canManage || saving}
          >
            <span aria-hidden="true">+</span>
            Add participant
          </button>
        )}
      </header>

      <div className="interview-participants__summary">
        <div>
          <strong>{participants.length}</strong>
          <span>Total participants</span>
        </div>
        <div>
          <strong>{candidateCount}</strong>
          <span>Candidates</span>
        </div>
        <div>
          <strong>{interviewerCount}</strong>
          <span>Interviewers</span>
        </div>
        <div>
          <strong>{acceptedCount}</strong>
          <span>Accepted / attended</span>
        </div>
      </div>

      {error && (
        <div className="interview-participants__error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={disabled}>
              Retry
            </button>
          )}
        </div>
      )}

      {actionError && (
        <div className="interview-participants__error" role="alert">
          {actionError}
        </div>
      )}

      {loading ? (
        <ParticipantsSkeleton />
      ) : participants.length === 0 ? (
        <div className="interview-participants__empty">
          <span aria-hidden="true">♙</span>
          <h3>No participants yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="interview-participants__list">
          {participants.map((participant) => {
            const isRemoving =
              removingParticipantId === participant.id;

            return (
              <article
                className="interview-participants__person"
                key={participant.id}
              >
                <div className="interview-participants__identity">
                  <div className="interview-participants__avatar">
                    {participant.avatarUrl ? (
                      <img
                        src={participant.avatarUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span aria-hidden="true">
                        {getInitials(participant.name)}
                      </span>
                    )}
                  </div>

                  <div className="interview-participants__person-info">
                    <div className="interview-participants__name-row">
                      <h3>{participant.name}</h3>
                      {participant.isRequired && (
                        <span className="interview-participants__required">
                          Required
                        </span>
                      )}
                    </div>

                    {participant.email && (
                      <a href={`mailto:${participant.email}`}>
                        {participant.email}
                      </a>
                    )}

                    <span className="interview-participants__role">
                      {ROLE_LABELS[participant.role]}
                    </span>
                  </div>
                </div>

                <div className="interview-participants__person-actions">
                  {onStatusChange ? (
                    <select
                      className={`interview-participants__status interview-participants__status--${participant.status}`}
                      value={participant.status}
                      onChange={(event) =>
                        handleStatusChange(
                          participant,
                          event.target.value as InterviewParticipantStatus,
                        )
                      }
                      disabled={!canManage || saving}
                      aria-label={`Attendance status for ${participant.name}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`interview-participants__status interview-participants__status--${participant.status}`}
                    >
                      {STATUS_LABELS[participant.status]}
                    </span>
                  )}

                  {onRemoveParticipant &&
                    participant.role !== 'candidate' && (
                      <button
                        type="button"
                        className="interview-participants__remove"
                        onClick={() =>
                          setRemovingParticipant(participant)
                        }
                        disabled={!canManage || saving || isRemoving}
                        aria-label={`Remove ${participant.name}`}
                      >
                        {isRemoving ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {inviteOpen && onAddParticipant && (
        <form
          className="interview-participants__invite"
          onSubmit={handleAddParticipant}
          noValidate
        >
          <div className="interview-participants__invite-heading">
            <div>
              <h3>Add interview participant</h3>
              <p>Invite a team member to participate in this interview.</p>
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              disabled={saving}
              aria-label="Close invite form"
            >
              ×
            </button>
          </div>

          <div className="interview-participants__invite-grid">
            <div className="interview-participants__field">
              <label htmlFor="participant-name">Full name *</label>
              <input
                id="participant-name"
                value={invite.name}
                onChange={(event) =>
                  updateInvite('name', event.target.value)
                }
                maxLength={120}
                autoComplete="name"
                aria-invalid={Boolean(inviteErrors.name)}
                disabled={saving}
              />
              {inviteErrors.name && (
                <span>{inviteErrors.name}</span>
              )}
            </div>

            <div className="interview-participants__field">
              <label htmlFor="participant-email">Email address *</label>
              <input
                id="participant-email"
                type="email"
                value={invite.email}
                onChange={(event) =>
                  updateInvite('email', event.target.value)
                }
                maxLength={254}
                autoComplete="email"
                aria-invalid={Boolean(inviteErrors.email)}
                disabled={saving}
              />
              {inviteErrors.email && (
                <span>{inviteErrors.email}</span>
              )}
            </div>

            <div className="interview-participants__field">
              <label htmlFor="participant-role">Role</label>
              <select
                id="participant-role"
                value={invite.role}
                onChange={(event) =>
                  updateInvite(
                    'role',
                    event.target.value as InterviewParticipantInvite['role'],
                  )
                }
                disabled={saving}
              >
                <option value="interviewer">Interviewer</option>
                <option value="organizer">Organizer</option>
                <option value="observer">Observer</option>
              </select>
            </div>
          </div>

          <label className="interview-participants__required-toggle">
            <input
              type="checkbox"
              checked={invite.isRequired}
              onChange={(event) =>
                updateInvite('isRequired', event.target.checked)
              }
              disabled={saving}
            />
            <span>This participant is required</span>
          </label>

          <div className="interview-participants__invite-actions">
            <button
              type="button"
              className="interview-participants__cancel-button"
              onClick={() => setInviteOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="interview-participants__submit-button"
              disabled={saving}
            >
              {saving ? 'Adding participant…' : 'Add participant'}
            </button>
          </div>
        </form>
      )}

      {removingParticipant && (
        <div
          className="interview-participants__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setRemovingParticipant(null);
            }
          }}
        >
          <div
            className="interview-participants__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-participant-title"
            aria-describedby="remove-participant-description"
          >
            <h3 id="remove-participant-title">Remove participant?</h3>
            <p id="remove-participant-description">
              Remove {removingParticipant.name} from this interview?
              This action may affect their access and invitation.
            </p>

            <div>
              <button
                type="button"
                className="interview-participants__cancel-button"
                onClick={() => setRemovingParticipant(null)}
                disabled={saving}
              >
                Keep participant
              </button>
              <button
                type="button"
                className="interview-participants__confirm-remove"
                onClick={handleRemoveParticipant}
                disabled={saving}
              >
                {saving ? 'Removing…' : 'Remove participant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default InterviewParticipants;
