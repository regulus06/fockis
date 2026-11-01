
import '../styles/EmployerWelcome.scss';

export type EmployerWelcomeProps = {
  firstName?: string | null;
  companyName?: string | null;
  message?: string;
  verificationStatus?: 'verified' | 'pending' | 'not_submitted' | 'rejected';
  verificationMessage?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const VERIFICATION_LABELS = {
  verified: 'Verified company',
  pending: 'Verification pending',
  not_submitted: 'Verification not submitted',
  rejected: 'Verification requires attention',
} as const;

export function EmployerWelcome({
  firstName,
  companyName,
  message = 'Manage your hiring activity, connect with candidates, and grow your team with Fockis.',
  verificationStatus,
  verificationMessage,
  primaryActionLabel = 'Post a job',
  onPrimaryAction,
  secondaryActionLabel = 'View applicants',
  onSecondaryAction,
  disabled = false,
  loading = false,
}: EmployerWelcomeProps) {
  const displayName = firstName?.trim() || 'there';
  const displayCompany = companyName?.trim();

  if (loading) {
    return (
      <section
        className="employer-welcome employer-welcome--loading"
        aria-label="Loading employer welcome"
        aria-busy="true"
      >
        <div className="employer-welcome__skeleton">
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>
    );
  }

  return (
    <section className="employer-welcome" aria-label="Employer welcome">
      <div className="employer-welcome__background" aria-hidden="true">
        <span className="employer-welcome__orb employer-welcome__orb--one" />
        <span className="employer-welcome__orb employer-welcome__orb--two" />
        <span className="employer-welcome__grid-pattern" />
      </div>

      <div className="employer-welcome__content">
        <div className="employer-welcome__main">
          <span className="employer-welcome__eyebrow">
            <span aria-hidden="true">✦</span>
            FOCKIS EMPLOYER CENTER
          </span>

          <h1>
            Welcome back, <span>{displayName}</span>!
          </h1>

          <p className="employer-welcome__message">{message}</p>

          {displayCompany && (
            <div className="employer-welcome__company">
              <span className="employer-welcome__company-icon" aria-hidden="true">
                {displayCompany.charAt(0).toUpperCase()}
              </span>
              <span>
                Managing <strong>{displayCompany}</strong>
              </span>
            </div>
          )}

          {verificationStatus && (
            <div
              className={`employer-welcome__verification employer-welcome__verification--${verificationStatus}`}
              role="status"
            >
              <span aria-hidden="true">
                {verificationStatus === 'verified'
                  ? '✓'
                  : verificationStatus === 'pending'
                    ? '◷'
                    : verificationStatus === 'rejected'
                      ? '!'
                      : '○'}
              </span>

              <div>
                <strong>{VERIFICATION_LABELS[verificationStatus]}</strong>
                {verificationMessage && <small>{verificationMessage}</small>}
              </div>
            </div>
          )}

          <div className="employer-welcome__actions">
            {onPrimaryAction && (
              <button
                type="button"
                className="employer-welcome__primary-button"
                onClick={onPrimaryAction}
                disabled={disabled}
              >
                <span aria-hidden="true">＋</span>
                {primaryActionLabel}
              </button>
            )}

            {onSecondaryAction && (
              <button
                type="button"
                className="employer-welcome__secondary-button"
                onClick={onSecondaryAction}
                disabled={disabled}
              >
                {secondaryActionLabel}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>

        <div className="employer-welcome__illustration" aria-hidden="true">
          <div className="employer-welcome__illustration-card">
            <div className="employer-welcome__illustration-top">
              <span />
              <span />
              <span />
            </div>

            <div className="employer-welcome__illustration-profile">
              <div className="employer-welcome__illustration-avatar">
                <span>F</span>
              </div>
              <div className="employer-welcome__illustration-lines">
                <span />
                <span />
              </div>
            </div>

            <div className="employer-welcome__illustration-stats">
              <span />
              <span />
              <span />
            </div>

            <div className="employer-welcome__illustration-chart">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="employer-welcome__floating-badge employer-welcome__floating-badge--top">
            <span>✓</span>
            Hiring made easier
          </div>

          <div className="employer-welcome__floating-badge employer-welcome__floating-badge--bottom">
            <span>✦</span>
            Find your next great hire
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmployerWelcome;
