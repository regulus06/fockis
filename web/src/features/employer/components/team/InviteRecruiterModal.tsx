
import { useEffect, useId, useState, type FormEvent } from 'react';
import EmployerModal from './EmployerModal';
import '../styles/InviteRecruiterModal.scss';

export type RecruiterInviteRole =
  | 'admin'
  | 'recruiter'
  | 'hiring_manager'
  | 'interviewer'
  | 'viewer';

export interface RecruiterInvitePayload {
  name: string;
  email: string;
  role: RecruiterInviteRole;
  message: string;
}

export interface InviteRecruiterModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (
    payload: RecruiterInvitePayload,
  ) => void | Promise<void>;
  saving?: boolean;
  disabled?: boolean;
  error?: string | null;
  successMessage?: string | null;
  allowedRoles?: RecruiterInviteRole[];
  defaultRole?: RecruiterInviteRole;
  companyName?: string;
}

const ROLE_OPTIONS: {
  value: RecruiterInviteRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Manage employer settings and hiring operations.',
  },
  {
    value: 'recruiter',
    label: 'Recruiter',
    description: 'Manage job applicants and recruitment workflows.',
  },
  {
    value: 'hiring_manager',
    label: 'Hiring manager',
    description: 'Review candidates and coordinate hiring decisions.',
  },
  {
    value: 'interviewer',
    label: 'Interviewer',
    description: 'Participate in assigned candidate interviews.',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View permitted employer information without managing it.',
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteRecruiterModal({
  open,
  onClose,
  onInvite,
  saving = false,
  disabled = false,
  error = null,
  successMessage = null,
  allowedRoles = [
    'recruiter',
    'hiring_manager',
    'interviewer',
    'viewer',
  ],
  defaultRole = 'recruiter',
  companyName,
}: InviteRecruiterModalProps) {
  const nameId = useId();
  const emailId = useId();
  const roleId = useId();
  const messageId = useId();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RecruiterInviteRole>(defaultRole);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = saving || submitting;
  const isDisabled = disabled || busy;

  const availableRoles = ROLE_OPTIONS.filter((option) =>
    allowedRoles.includes(option.value),
  );

  useEffect(() => {
    if (!open) return;

    setName('');
    setEmail('');
    setMessage('');
    setRole(
      allowedRoles.includes(defaultRole)
        ? defaultRole
        : allowedRoles[0] ?? 'recruiter',
    );
    setLocalError(null);
  }, [open, defaultRole, allowedRoles]);

  const validate = (): boolean => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setLocalError('Enter the recruiter's name.');
      return false;
    }

    if (normalizedName.length > 120) {
      setLocalError('The name cannot exceed 120 characters.');
      return false;
    }

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      setLocalError('Enter a valid email address.');
      return false;
    }

    if (normalizedEmail.length > 254) {
      setLocalError('The email address is too long.');
      return false;
    }

    if (!availableRoles.some((option) => option.value === role)) {
      setLocalError('Select an available team role.');
      return false;
    }

    if (message.trim().length > 1000) {
      setLocalError('The invitation message cannot exceed 1,000 characters.');
      return false;
    }

    setLocalError(null);
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDisabled || !validate()) return;

    setSubmitting(true);

    try {
      await onInvite({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        message: message.trim(),
      });
    } catch (exception) {
      setLocalError(
        exception instanceof Error
          ? exception.message
          : 'The invitation could not be sent. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EmployerModal
      open={open}
      onClose={onClose}
      title="Invite a team member"
      description={
        companyName
          ? `Invite someone to join ${companyName}'s hiring team.`
          : 'Invite a colleague to collaborate in your Employer Center.'
      }
      size="medium"
      loading={saving}
      closeOnBackdrop={!busy}
      closeOnEscape={!busy}
      footer={
        <div className="invite-recruiter-modal__footer">
          <button
            type="button"
            className="invite-recruiter-modal__cancel"
            onClick={onClose}
            disabled={isDisabled}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="invite-recruiter-form"
            className="invite-recruiter-modal__submit"
            disabled={isDisabled || availableRoles.length === 0}
          >
            {busy ? 'Sending invitation…' : 'Send invitation'}
          </button>
        </div>
      }
    >
      <form
        id="invite-recruiter-form"
        className="invite-recruiter-modal"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="invite-recruiter-modal__intro">
          <span className="invite-recruiter-modal__intro-icon">
            +
          </span>
          <div>
            <strong>Add to your hiring team</strong>
            <p>
              The invited person will receive access according to the role
              you assign.
            </p>
          </div>
        </div>

        <div className="invite-recruiter-modal__field">
          <label htmlFor={nameId}>
            Full name <span>*</span>
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setLocalError(null);
            }}
            placeholder="Enter full name"
            maxLength={120}
            disabled={isDisabled}
            required
          />
        </div>

        <div className="invite-recruiter-modal__field">
          <label htmlFor={emailId}>
            Work email address <span>*</span>
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setLocalError(null);
            }}
            placeholder="name@company.com"
            maxLength={254}
            disabled={isDisabled}
            required
          />
          <small>
            Use the email address where the invitation should be delivered.
          </small>
        </div>

        <div className="invite-recruiter-modal__field">
          <label htmlFor={roleId}>
            Team role <span>*</span>
          </label>
          <select
            id={roleId}
            value={role}
            onChange={(event) => {
              setRole(event.target.value as RecruiterInviteRole);
              setLocalError(null);
            }}
            disabled={isDisabled || availableRoles.length === 0}
            required
          >
            {availableRoles.length === 0 && (
              <option value="">No roles available</option>
            )}

            {availableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {availableRoles.length > 0 && (
            <small>
              {availableRoles.find((option) => option.value === role)
                ?.description}
            </small>
          )}
        </div>

        <div className="invite-recruiter-modal__field">
          <label htmlFor={messageId}>
            Personal message <span className="optional">(optional)</span>
          </label>
          <textarea
            id={messageId}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              setLocalError(null);
            }}
            placeholder="Add a short message to your invitation..."
            rows={3}
            maxLength={1000}
            disabled={isDisabled}
          />
          <div className="invite-recruiter-modal__counter">
            {message.length}/1,000
          </div>
        </div>

        {(localError || error) && (
          <div className="invite-recruiter-modal__error" role="alert">
            {localError || error}
          </div>
        )}

        {successMessage && (
          <div className="invite-recruiter-modal__success" role="status">
            {successMessage}
          </div>
        )}

        <p className="invite-recruiter-modal__security">
          Team access is subject to your organization's permissions and
          the invitation recipient's account verification.
        </p>
      </form>
    </EmployerModal>
  );
}

export default InviteRecruiterModal;
