import type {
  SecurityPolicy,
} from "../types/organizationIdentity.types";

interface Props {
  policy: SecurityPolicy;

  onChange: (
    patch: Partial<SecurityPolicy>,
  ) => void;

  saving?: boolean;
}

// ============================================================================
// TOGGLE
// ============================================================================

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

function SecurityToggle({
  checked,
  onChange,
  disabled = false,
  label,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={[
        "security-toggle",
        checked
          ? "security-toggle--on"
          : "security-toggle--off",
      ].join(" ")}
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
    >
      <span className="security-toggle__track">
        <span className="security-toggle__thumb" />
      </span>

      <span className="security-toggle__label">
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SecurityPolicyCard({
  policy,
  onChange,
  saving = false,
}: Props) {
  // ==========================================================================
  // SAFE NUMBER HELPER
  // ==========================================================================

  const numberValue = (
    value: number | undefined,
    fallback: number,
  ) => {
    return typeof value === "number" &&
      Number.isFinite(value)
      ? value
      : fallback;
  };

  // ==========================================================================
  // TOGGLE HELPER
  // ==========================================================================

  const toggle = (
    key: keyof SecurityPolicy,
    label: string,
  ) => {
    const value = Boolean(policy[key]);

    return (
      <SecurityToggle
        checked={value}
        label={label}
        disabled={saving}
        onChange={(checked) =>
          onChange({
            [key]: checked,
          } as Partial<SecurityPolicy>)
        }
      />
    );
  };

  // ==========================================================================
  // NUMBER HELPER
  // ==========================================================================

  const numberInput = (
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    key: keyof SecurityPolicy,
    unit?: string,
  ) => {
    return (
      <div className="setting-number-group">
        <input
          className="setting-number"
          type="number"
          min={min}
          max={max}
          value={numberValue(value, fallback)}
          disabled={saving}
          onChange={(event) => {
            const raw = Number(event.target.value);

            onChange({
              [key]: Math.max(
                min,
                Math.min(
                  max,
                  Number.isFinite(raw)
                    ? raw
                    : fallback,
                ),
              ),
            } as Partial<SecurityPolicy>);
          }}
        />

        {unit && (
          <span className="setting-number-unit">
            {unit}
          </span>
        )}
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <section
      className={[
        "settings-card",
        saving ? "settings-card--saving" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ====================================================================
          HEADER
          ==================================================================== */}

      <div className="settings-card__heading">
        <div className="settings-card__title-area">
          <span className="eyebrow">
            Protection
          </span>

          <h2>
            Security policies
          </h2>

          <p>
            These settings apply to
            organization-managed users.
          </p>
        </div>

        {saving && (
          <span className="settings-saving">
            <span className="settings-saving__dot" />
            Saving...
          </span>
        )}
      </div>

      <div className="settings-list">

        {/* ==================================================================
            PASSWORD SECURITY
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--password">
          <span className="eyebrow">
            Password security
          </span>

          <h3>
            Password protection
          </h3>

          <p>
            Control password strength,
            reuse, expiration, and
            administrator resets.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              First-login password change
            </strong>

            <span>
              Require newly created
              managed users to change
              their temporary password
              when they first sign in.
            </span>
          </div>

          {toggle(
            "requirePasswordChange",
            "First-login password change",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Strong passwords
            </strong>

            <span>
              Require secure passwords
              containing uppercase,
              lowercase, numbers, and
              special characters.
            </span>
          </div>

          {toggle(
            "strongPasswords",
            "Strong passwords",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Minimum password length
            </strong>

            <span>
              Minimum number of characters
              required for passwords.
            </span>
          </div>

          {numberInput(
            policy.minimumPasswordLength,
            12,
            1,
            128,
            "minimumPasswordLength",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Password history
            </strong>

            <span>
              Number of previous passwords
              that cannot be reused.
            </span>
          </div>

          {numberInput(
            policy.passwordHistoryCount,
            5,
            0,
            50,
            "passwordHistoryCount",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Force password change after
              admin reset
            </strong>

            <span>
              Require users to replace a
              password after an administrator
              resets it.
            </span>
          </div>

          {toggle(
            "forcePasswordChangeAfterAdminReset",
            "Force password change after administrator reset",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Password expiration
            </strong>

            <span>
              Require users to periodically
              change their passwords.
            </span>
          </div>

          {toggle(
            "passwordExpirationEnabled",
            "Password expiration",
          )}
        </label>

        {policy.passwordExpirationEnabled && (
          <label className="setting-row setting-row--nested">
            <div className="setting-row__content">
              <strong>
                Password expiration period
              </strong>

              <span>
                Number of days before a
                password expires.
              </span>
            </div>

            {numberInput(
              policy.passwordExpirationDays,
              90,
              1,
              3650,
              "passwordExpirationDays",
              "days",
            )}
          </label>
        )}

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Prevent password reuse
            </strong>

            <span>
              Prevent users from reusing
              recently used passwords.
            </span>
          </div>

          {toggle(
            "preventPasswordReuse",
            "Prevent password reuse",
          )}
        </label>

        {/* ==================================================================
            LOGIN LOCKOUT
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--login">
          <span className="eyebrow">
            Login protection
          </span>

          <h3>
            Login lockout
          </h3>

          <p>
            Protect accounts against
            repeated password attempts
            and automated attacks.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Login lockout
            </strong>

            <span>
              Temporarily lock an account
              after too many failed
              authentication attempts.
            </span>
          </div>

          {toggle(
            "loginLockoutEnabled",
            "Login lockout",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Failed login attempts
            </strong>

            <span>
              Number of failed attempts
              before account lockout.
            </span>
          </div>

          {numberInput(
            policy.maxFailedLoginAttempts,
            5,
            1,
            100,
            "maxFailedLoginAttempts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Retry delay
            </strong>

            <span>
              Seconds users must wait
              between failed login attempts.
            </span>
          </div>

          {numberInput(
            policy.loginRetryDelaySeconds,
            30,
            0,
            86400,
            "loginRetryDelaySeconds",
            "sec",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Account lockout duration
            </strong>

            <span>
              How long an account remains
              locked after reaching the
              failed-attempt limit.
            </span>
          </div>

          {numberInput(
            policy.accountLockoutDurationMinutes,
            15,
            1,
            10080,
            "accountLockoutDurationMinutes",
            "min",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Failed-attempt reset
            </strong>

            <span>
              Reset the failed-attempt
              counter after this period
              without another failure.
            </span>
          </div>

          {numberInput(
            policy.failedLoginResetMinutes,
            30,
            1,
            10080,
            "failedLoginResetMinutes",
            "min",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Progressive lockout
            </strong>

            <span>
              Increase protection when an
              account experiences repeated
              lockouts.
            </span>
          </div>

          {toggle(
            "progressiveLockout",
            "Progressive lockout",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Notify user on lockout
            </strong>

            <span>
              Notify the user when their
              account is locked.
            </span>
          </div>

          {toggle(
            "notifyUserOnAccountLockout",
            "Notify user on account lockout",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Notify administrators
            </strong>

            <span>
              Notify administrators after
              repeated account lockouts.
            </span>
          </div>

          {toggle(
            "notifyAdminOnRepeatedLockout",
            "Notify administrators on repeated lockout",
          )}
        </label>

        {policy.notifyAdminOnRepeatedLockout && (
          <label className="setting-row setting-row--nested">
            <div className="setting-row__content">
              <strong>
                Repeated lockout threshold
              </strong>

              <span>
                Number of lockouts before
                administrator notification.
              </span>
            </div>

            {numberInput(
              policy.repeatedLockoutNotificationThreshold,
              3,
              1,
              100,
              "repeatedLockoutNotificationThreshold",
            )}
          </label>
        )}

        {/* ==================================================================
            SESSION SECURITY
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--session">
          <span className="eyebrow">
            Session security
          </span>

          <h3>
            Sessions and inactivity
          </h3>

          <p>
            Control how long authenticated
            sessions remain active.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Inactivity timeout
            </strong>

            <span>
              Automatically require the
              user to authenticate again
              after inactivity.
            </span>
          </div>

          {numberInput(
            policy.inactivityTimeoutMinutes,
            15,
            0,
            10080,
            "inactivityTimeoutMinutes",
            "min",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Maximum session
            </strong>

            <span>
              Maximum lifetime of an
              authenticated session.
            </span>
          </div>

          {numberInput(
            policy.maximumSessionHours,
            12,
            0,
            720,
            "maximumSessionHours",
            "hrs",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Remember me
            </strong>

            <span>
              Number of days a remembered
              login may remain valid.
            </span>
          </div>

          {numberInput(
            policy.rememberMeDays,
            30,
            0,
            3650,
            "rememberMeDays",
            "days",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Revoke sessions after
              password change
            </strong>

            <span>
              Sign out existing sessions
              after a password is changed.
            </span>
          </div>

          {toggle(
            "revokeSessionsAfterPasswordChange",
            "Revoke sessions after password change",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Revoke sessions after security
              changes
            </strong>

            <span>
              Invalidate existing sessions
              after important security
              settings are changed.
            </span>
          </div>

          {toggle(
            "revokeSessionsAfterSecurityChange",
            "Revoke sessions after security changes",
          )}
        </label>

        {/* ==================================================================
            TWO FACTOR
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--authentication">
          <span className="eyebrow">
            Authentication
          </span>

          <h3>
            Two-factor authentication
          </h3>

          <p>
            Add an additional authentication
            layer to organization accounts.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Require 2FA
            </strong>

            <span>
              Require two-factor authentication
              for organization-managed users.
            </span>
          </div>

          {toggle(
            "requireTwoFactor",
            "Require two-factor authentication",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Require 2FA for administrators
            </strong>

            <span>
              Require administrators to use
              two-factor authentication.
            </span>
          </div>

          {toggle(
            "requireTwoFactorForAdministrators",
            "Require two-factor authentication for administrators",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              User-controlled 2FA
            </strong>

            <span>
              Allow users to enable and
              manage two-factor authentication
              themselves.
            </span>
          </div>

          {toggle(
            "allowUserTwoFactor",
            "User-controlled two-factor authentication",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Recovery codes
            </strong>

            <span>
              Allow users to use recovery
              codes if they lose access to
              their second factor.
            </span>
          </div>

          {toggle(
            "allowRecoveryCodes",
            "Recovery codes",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Sensitive-action reauthentication
            </strong>

            <span>
              Require authentication again
              before sensitive account actions.
            </span>
          </div>

          {toggle(
            "requireReauthenticationForSensitiveActions",
            "Sensitive-action reauthentication",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Reauthentication for security
              changes
            </strong>

            <span>
              Require users to authenticate
              again before changing security
              settings.
            </span>
          </div>

          {toggle(
            "requireReauthenticationForSecurityChanges",
            "Reauthentication for security changes",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Administrator reauthentication
            </strong>

            <span>
              Require administrators to
              reauthenticate for protected
              organization actions.
            </span>
          </div>

          {toggle(
            "requireAdminReauthentication",
            "Administrator reauthentication",
          )}
        </label>

        {/* ==================================================================
            NOTIFICATIONS
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--notifications">
          <span className="eyebrow">
            Notifications
          </span>

          <h3>
            Login alerts
          </h3>

          <p>
            Notify users and administrators
            about important authentication
            activity.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Successful login alerts
            </strong>

            <span>
              Notify users about successful
              sign-ins.
            </span>
          </div>

          {toggle(
            "loginAlerts",
            "Successful login alerts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Failed login alerts
            </strong>

            <span>
              Notify users about failed
              authentication attempts.
            </span>
          </div>

          {toggle(
            "failedLoginAlerts",
            "Failed login alerts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Suspicious login alerts
            </strong>

            <span>
              Notify users about suspicious
              authentication activity.
            </span>
          </div>

          {toggle(
            "suspiciousLoginAlerts",
            "Suspicious login alerts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              New-device alerts
            </strong>

            <span>
              Notify users when a new device
              signs into their account.
            </span>
          </div>

          {toggle(
            "newDeviceAlerts",
            "New-device alerts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              New-location alerts
            </strong>

            <span>
              Notify users when a login
              originates from a new location.
            </span>
          </div>

          {toggle(
            "newLocationAlerts",
            "New-location alerts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Lockout alerts
            </strong>

            <span>
              Notify users about account
              lockouts.
            </span>
          </div>

          {toggle(
            "lockoutAlerts",
            "Lockout alerts",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Security-change notifications
            </strong>

            <span>
              Notify users about password,
              2FA, email, and other security
              changes.
            </span>
          </div>

          {toggle(
            "securityChangeNotifications",
            "Security-change notifications",
          )}
        </label>

        {/* ==================================================================
            ACCOUNT PROTECTION
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--protection">
          <span className="eyebrow">
            Account protection
          </span>

          <h3>
            Organization safeguards
          </h3>

          <p>
            Protect important accounts and
            prevent unauthorized security
            changes.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Verified email required
            </strong>

            <span>
              Require email verification
              before full account access.
            </span>
          </div>

          {toggle(
            "requireVerifiedEmail",
            "Verified email required",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Password reset protection
            </strong>

            <span>
              Add additional protection to
              password reset operations.
            </span>
          </div>

          {toggle(
            "passwordResetProtection",
            "Password reset protection",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Email change protection
            </strong>

            <span>
              Protect account email changes
              with additional verification.
            </span>
          </div>

          {toggle(
            "emailChangeProtection",
            "Email change protection",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Protect organization owner
            </strong>

            <span>
              Prevent accidental removal or
              demotion of the organization owner.
            </span>
          </div>

          {toggle(
            "protectOrganizationOwner",
            "Protect organization owner",
          )}
        </label>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Protect last administrator
            </strong>

            <span>
              Prevent the organization from
              being left without an administrator.
            </span>
          </div>

          {toggle(
            "protectLastAdministrator",
            "Protect last administrator",
          )}
        </label>

        {/* ==================================================================
            COMPLIANCE
            ================================================================== */}

        <div className="settings-section-heading settings-section-heading--compliance">
          <span className="eyebrow">
            Compliance
          </span>

          <h3>
            Security auditing
          </h3>

          <p>
            Keep a record of important
            organization security events.
          </p>
        </div>

        <label className="setting-row">
          <div className="setting-row__content">
            <strong>
              Security audit log
            </strong>

            <span>
              Record important security
              changes and authentication
              events.
            </span>
          </div>

          {toggle(
            "securityAuditLog",
            "Security audit log",
          )}
        </label>
      </div>
    </section>
  );
}