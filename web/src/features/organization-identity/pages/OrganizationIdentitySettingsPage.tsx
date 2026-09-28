import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";

import { useParams } from "react-router-dom";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import SecurityPolicyCard from "../components/SecurityPolicyCard";

import organizationIdentityApi from "../services/organizationIdentityApi";

import type {
  SecurityPolicy,
} from "../types/organizationIdentity.types";

import "../styles/OrganizationIdentity.scss";
import "../styles/OrganizationIdentitySettings.scss";

// ============================================================================
// DOMAIN CONFIGURATION
// ============================================================================
//
// IMPORTANT:
// Every domain remains inside the Fockis namespace.
//
// Examples:
//
//   springfieldchurch.fockis.com
//   springfieldchurch.fockis.org
//   springfieldchurch.fockis.net
//   springfieldchurch.fockis.edu
//   springfieldchurch.fockis.church
//   springfieldchurch.fockis.co
//   springfieldchurch.fockis.io
//
// The user only enters:
//
//   springfieldchurch
//
// The selected Fockis extension is appended automatically.
// ============================================================================

const DOMAIN_SUFFIX_OPTIONS = [
  {
    value: ".fockis.com",
    label: ".fockis.com",
  },
  {
    value: ".fockis.org",
    label: ".fockis.org",
  },
  {
    value: ".fockis.net",
    label: ".fockis.net",
  },
  {
    value: ".fockis.edu",
    label: ".fockis.edu",
  },
  {
    value: ".fockis.church",
    label: ".fockis.church",
  },
  {
    value: ".fockis.co",
    label: ".fockis.co",
  },
  {
    value: ".fockis.io",
    label: ".fockis.io",
  },
] as const;

type DomainSuffix =
  (typeof DOMAIN_SUFFIX_OPTIONS)[number]["value"];

const DEFAULT_DOMAIN_SUFFIX: DomainSuffix =
  ".fockis.com";

// ============================================================================
// DEFAULT SECURITY POLICY
// ============================================================================

const defaultPolicy: SecurityPolicy = {
  // Password security
  strongPasswords: true,
  minimumPasswordLength: 12,
  requirePasswordChange: true,
  passwordHistoryCount: 5,
  forcePasswordChangeAfterAdminReset: true,
  passwordExpirationEnabled: false,
  passwordExpirationDays: 90,
  preventPasswordReuse: true,

  // Login / account lockout
  loginLockoutEnabled: true,
  maxFailedLoginAttempts: 5,
  loginRetryDelaySeconds: 30,
  accountLockoutDurationMinutes: 30,
  failedLoginResetMinutes: 15,
  progressiveLockout: true,

  // Lockout notifications
  notifyUserOnAccountLockout: true,
  notifyAdminOnRepeatedLockout: true,
  repeatedLockoutNotificationThreshold: 3,

  // Session security
  inactivityTimeoutMinutes: 30,
  maximumSessionHours: 24,
  rememberMeDays: 30,
  revokeSessionsAfterPasswordChange: true,
  revokeSessionsAfterSecurityChange: true,

  // Two-factor authentication
  requireTwoFactor: false,
  allowUserTwoFactor: true,
  requireTwoFactorForAdministrators: true,
  allowRecoveryCodes: true,

  // Re-authentication
  requireReauthenticationForSensitiveActions: true,
  requireReauthenticationForSecurityChanges: true,
  requireAdminReauthentication: true,

  // Login / security notifications
  loginAlerts: true,
  suspiciousLoginAlerts: true,
  failedLoginAlerts: true,
  newDeviceAlerts: true,
  newLocationAlerts: true,
  lockoutAlerts: true,
  securityChangeNotifications: true,

  // Account recovery / sensitive changes
  passwordResetProtection: true,
  emailChangeProtection: true,

  // Organization protection
  protectOrganizationOwner: true,
  protectLastAdministrator: true,

  // Auditing
  securityAuditLog: true,

  // Email / identity verification
  requireVerifiedEmail: true,
};

// ============================================================================
// DOMAIN TYPES
// ============================================================================

interface DomainAvailabilityState {
  available: boolean;
  domain: string;
  message: string;
}

// ============================================================================
// ERROR HELPER
// ============================================================================

function getErrorMessage(
  errorValue: unknown,
  fallback: string,
): string {
  if (
    errorValue &&
    typeof errorValue === "object"
  ) {
    const error = errorValue as {
      response?: {
        data?: {
          message?: unknown;
        };
      };
      message?: unknown;
    };

    const backendMessage =
      error.response?.data?.message;

    if (
      typeof backendMessage === "string" &&
      backendMessage.trim()
    ) {
      return backendMessage;
    }

    if (Array.isArray(backendMessage)) {
      return backendMessage.join(", ");
    }

    if (
      typeof error.message === "string" &&
      error.message.trim()
    ) {
      return error.message;
    }
  }

  return fallback;
}

// ============================================================================
// DOMAIN HELPERS
// ============================================================================

/**
 * Normalize only the editable portion of the domain.
 *
 * Examples:
 *
 *   springfieldchurch
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   https://springfieldchurch.fockis.net
 *
 * all become:
 *
 *   springfieldchurch
 */
function normalizeDomainPrefix(
  value: string,
): string {
  let normalized = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0];

  /*
   * Remove any supported Fockis suffix.
   *
   * This allows the user to paste:
   *
   * springfieldchurch.fockis.org
   *
   * while keeping only:
   *
   * springfieldchurch
   */
  for (const option of DOMAIN_SUFFIX_OPTIONS) {
    if (
      normalized.endsWith(option.value)
    ) {
      normalized = normalized.slice(
        0,
        -option.value.length,
      );
      break;
    }
  }

  /*
   * Also remove a trailing dot if someone pastes
   * a fully-qualified domain.
   */
  normalized = normalized.replace(/\.$/, "");

  return normalized
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Build the complete Fockis domain.
 *
 * Example:
 *
 *   springfieldchurch + .fockis.org
 *
 * becomes:
 *
 *   springfieldchurch.fockis.org
 */
function buildDomain(
  prefix: string,
  suffix: DomainSuffix,
): string {
  const normalized =
    normalizeDomainPrefix(prefix);

  return normalized
    ? `${normalized}${suffix}`
    : "";
}

/**
 * Validate the editable domain prefix.
 */
function isValidDomainPrefix(
  prefix: string,
): boolean {
  if (!prefix) {
    return false;
  }

  if (
    prefix.length < 2 ||
    prefix.length > 63
  ) {
    return false;
  }

  return (
    /^[a-z0-9-]+$/.test(prefix) &&
    !prefix.startsWith("-") &&
    !prefix.endsWith("-")
  );
}

/**
 * Validate that the suffix is one of the
 * Fockis-owned extensions.
 */
function isAllowedDomainSuffix(
  suffix: string,
): suffix is DomainSuffix {
  return DOMAIN_SUFFIX_OPTIONS.some(
    (option) => option.value === suffix,
  );
}

/**
 * Validate a complete Fockis domain.
 *
 * This intentionally rejects:
 *
 *   fockis.com
 *   fockis.org
 *   springfieldchurch.org
 *   springfieldchurch.com
 *
 * and accepts only domains containing:
 *
 *   .fockis.com
 *   .fockis.org
 *   .fockis.net
 *   etc.
 */
function isAllowedDomain(
  domain: string,
): boolean {
  return DOMAIN_SUFFIX_OPTIONS.some(
    (option) =>
      domain.endsWith(option.value) &&
      domain !== option.value,
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function OrganizationIdentitySettingsPage() {
  const {
    organizationId = "",
  } = useParams<{
    organizationId: string;
  }>();

  // ==========================================================================
  // SECURITY POLICY STATE
  // ==========================================================================

  const [policy, setPolicy] =
    useState<SecurityPolicy>(
      defaultPolicy,
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // ==========================================================================
  // DOMAIN STATE
  // ==========================================================================

  /**
   * Editable domain prefix only.
   *
   * Example:
   *
   *   springfieldchurch
   */
  const [domainName, setDomainName] =
    useState("");

  /**
   * Selected Fockis extension.
   *
   * Default:
   *
   *   .fockis.com
   */
  const [domainSuffix, setDomainSuffix] =
    useState<DomainSuffix>(
      DEFAULT_DOMAIN_SUFFIX,
    );

  const [checkingDomain, setCheckingDomain] =
    useState(false);

  const [
    domainAvailability,
    setDomainAvailability,
  ] =
    useState<DomainAvailabilityState | null>(
      null,
    );

  // ==========================================================================
  // COMPLETE DOMAIN
  // ==========================================================================

  const fullDomain = useMemo(
    () =>
      buildDomain(
        domainName,
        domainSuffix,
      ),
    [
      domainName,
      domainSuffix,
    ],
  );

  // ==========================================================================
  // LOAD SECURITY POLICY
  // ==========================================================================

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setMessage("");

      try {
        const result =
          await organizationIdentityApi.getSecurityPolicy(
            organizationId,
          );

        if (!mounted) {
          return;
        }

        setPolicy({
          ...defaultPolicy,
          ...(result ?? {}),
        });
      } catch {
        if (!mounted) {
          return;
        }

        setPolicy(defaultPolicy);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (organizationId) {
      void load();
    } else {
      setLoading(false);
      setMessage(
        "Organization ID is missing.",
      );
    }

    return () => {
      mounted = false;
    };
  }, [organizationId]);

  // ==========================================================================
  // SECURITY POLICY CHANGE
  // ==========================================================================

  async function change(
    patch: Partial<SecurityPolicy>,
  ) {
    if (!organizationId) {
      setMessage(
        "Organization ID is missing.",
      );
      return;
    }

    const previous = policy;

    const next: SecurityPolicy = {
      ...policy,
      ...patch,
    };

    setPolicy(next);
    setSaving(true);
    setMessage("");

    try {
      const result =
        await organizationIdentityApi.updateSecurityPolicy(
          organizationId,
          patch,
        );

      setPolicy({
        ...defaultPolicy,
        ...(result ?? {}),
      });

      setMessage(
        "Security settings saved.",
      );
    } catch (errorValue) {
      setPolicy(previous);

      setMessage(
        getErrorMessage(
          errorValue,
          "Unable to save security settings.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================================
  // DOMAIN PREFIX CHANGE
  // ==========================================================================

  function handleDomainChange(
    value: string,
  ) {
    const normalized =
      normalizeDomainPrefix(value);

    setDomainName(normalized);

    /*
     * A changed prefix invalidates the previous
     * availability result.
     */
    setDomainAvailability(null);
    setMessage("");
  }

  // ==========================================================================
  // DOMAIN SUFFIX CHANGE
  // ==========================================================================

  function handleDomainSuffixChange(
    value: string,
  ) {
    if (
      !isAllowedDomainSuffix(value)
    ) {
      return;
    }

    setDomainSuffix(value);

    /*
     * Changing:
     *
     * .fockis.com
     *
     * to:
     *
     * .fockis.org
     *
     * creates a completely different domain.
     *
     * Therefore the old availability result
     * must be cleared.
     */
    setDomainAvailability(null);
    setMessage("");
  }

  // ==========================================================================
  // CHECK DOMAIN AVAILABILITY
  // ==========================================================================

  async function handleCheckDomainAvailability() {
    const prefix =
      normalizeDomainPrefix(domainName);

    // ------------------------------------------------------------------------
    // Missing prefix
    // ------------------------------------------------------------------------

    if (!prefix) {
      setDomainAvailability({
        available: false,
        domain: "",
        message:
          "Enter the beginning of your domain.",
      });

      return;
    }

    // ------------------------------------------------------------------------
    // Validate prefix
    // ------------------------------------------------------------------------

    if (!isValidDomainPrefix(prefix)) {
      let validationMessage =
        "Use only letters, numbers, and hyphens.";

      if (prefix.length < 2) {
        validationMessage =
          "The domain name must contain at least 2 characters.";
      } else if (prefix.length > 63) {
        validationMessage =
          "The domain name cannot exceed 63 characters.";
      } else if (
        prefix.startsWith("-") ||
        prefix.endsWith("-")
      ) {
        validationMessage =
          "The domain name cannot begin or end with a hyphen.";
      }

      setDomainAvailability({
        available: false,
        domain: buildDomain(
          prefix,
          domainSuffix,
        ),
        message: validationMessage,
      });

      return;
    }

    // ------------------------------------------------------------------------
    // Validate selected suffix
    // ------------------------------------------------------------------------

    if (
      !isAllowedDomainSuffix(
        domainSuffix,
      )
    ) {
      setDomainAvailability({
        available: false,
        domain: buildDomain(
          prefix,
          DEFAULT_DOMAIN_SUFFIX,
        ),
        message:
          "Please select a valid Fockis domain extension.",
      });

      return;
    }

    // ------------------------------------------------------------------------
    // Build complete domain
    // ------------------------------------------------------------------------

    const normalized =
      buildDomain(
        prefix,
        domainSuffix,
      );

    // ------------------------------------------------------------------------
    // Safety validation
    // ------------------------------------------------------------------------

    if (!isAllowedDomain(normalized)) {
      setDomainAvailability({
        available: false,
        domain: normalized,
        message:
          "The selected domain extension is not allowed.",
      });

      return;
    }

    // ------------------------------------------------------------------------
    // Organization validation
    // ------------------------------------------------------------------------

    if (!organizationId) {
      setDomainAvailability({
        available: false,
        domain: normalized,
        message:
          "Organization ID is missing.",
      });

      return;
    }

    // ------------------------------------------------------------------------
    // Start request
    // ------------------------------------------------------------------------

    setCheckingDomain(true);
    setDomainAvailability(null);
    setMessage("");

    try {
      /*
       * The API receives the COMPLETE Fockis domain.
       *
       * Example:
       *
       *   springfieldchurch.fockis.org
       *
       * NOT:
       *
       *   springfieldchurch
       */

      const result =
        await organizationIdentityApi.checkDomainAvailability(
          organizationId,
          normalized,
        );

      setDomainAvailability({
        available:
          Boolean(result?.available),

        domain:
          result?.domain ??
          normalized,

        message:
          result?.message ??
          (
            result?.available
              ? "Domain is available."
              : "Domain is unavailable."
          ),
      });
    } catch (errorValue) {
      setDomainAvailability({
        available: false,
        domain: normalized,
        message:
          getErrorMessage(
            errorValue,
            "Unable to check domain availability.",
          ),
      });
    } finally {
      setCheckingDomain(false);
    }
  }

  // ==========================================================================
  // ENTER KEY
  // ==========================================================================

  function handleDomainKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    void handleCheckDomainAvailability();
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="identity-layout">
      <OrganizationIdentitySidebar
        organizationId={organizationId}
      />

      <main className="identity-main">
        {/* ================================================================
            HEADER
            ================================================================ */}

        <header className="identity-header">
          <div>
            <span className="eyebrow">
              Organization administration
            </span>

            <h1>
              Security &amp; Settings
            </h1>

            <p>
              Control authentication, password,
              2FA, email verification, security
              notifications, and organization
              domain availability.
            </p>
          </div>
        </header>

        {/* ================================================================
            GENERAL NOTICE
            ================================================================ */}

        {message && (
          <div
            className="notice"
            role="status"
          >
            {message}
          </div>
        )}

        {/* ================================================================
            ORGANIZATION DOMAIN
            ================================================================ */}

        <section className="domain-settings-card">
          <div className="domain-settings-header">
            <div>
              <span className="eyebrow">
                Organization identity
              </span>

              <h2>
                Organization Domain
              </h2>

              <p>
                Choose a domain name and an
                available Fockis domain extension
                for your organization.
              </p>
            </div>
          </div>

          <div className="domain-check">
            <label htmlFor="organization-domain">
              Domain
            </label>

            {/* ==========================================================
                DOMAIN INPUT

                Example:

                [ springfieldchurch ][ .fockis.com ▼ ]

                Only "springfieldchurch" is editable.
                Every extension remains under Fockis.
                ========================================================== */}

            <div className="domain-check-row">
              <div className="domain-input-wrapper">
                <input
                  id="organization-domain"
                  type="text"
                  value={domainName}
                  onChange={(event) =>
                    handleDomainChange(
                      event.target.value,
                    )
                  }
                  onKeyDown={
                    handleDomainKeyDown
                  }
                  placeholder="yourorganization"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={63}
                  disabled={checkingDomain}
                  aria-describedby="organization-domain-help"
                />

                {/* ======================================================
                    FOCKIS DOMAIN EXTENSION
                    ====================================================== */}

                <div className="domain-suffix-selector">
                  <select
                    className="domain-suffix-select"
                    value={domainSuffix}
                    onChange={(event) =>
                      handleDomainSuffixChange(
                        event.target.value,
                      )
                    }
                    disabled={checkingDomain}
                    aria-label="Fockis domain extension"
                  >
                    {DOMAIN_SUFFIX_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  void handleCheckDomainAvailability()
                }
                disabled={
                  checkingDomain ||
                  !isValidDomainPrefix(
                    domainName,
                  )
                }
              >
                {checkingDomain
                  ? "Checking..."
                  : "Check Availability"}
              </button>
            </div>

            {/* ==========================================================
                HELP
                ========================================================== */}

            <p
              id="organization-domain-help"
              className="domain-help"
            >
              Enter only the beginning of your
              organization domain. Fockis will
              automatically add the selected
              Fockis extension.
            </p>

            {/* ==========================================================
                LIVE DOMAIN PREVIEW
                ========================================================== */}

            {fullDomain && (
              <div className="domain-preview">
                <span className="domain-preview__label">
                  Complete domain
                </span>

                <strong className="domain-preview__value">
                  {fullDomain}
                </strong>
              </div>
            )}

            {/* ==========================================================
                AVAILABLE
                ========================================================== */}

            {domainAvailability?.available && (
              <div
                className="domain-available"
                role="status"
              >
                <span
                  className="domain-status-icon"
                  aria-hidden="true"
                >
                  ✓
                </span>

                <div>
                  <strong>
                    {domainAvailability.domain}
                  </strong>

                  <span>
                    {" "}
                    is available.
                  </span>
                </div>
              </div>
            )}

            {/* ==========================================================
                UNAVAILABLE
                ========================================================== */}

            {domainAvailability &&
              !domainAvailability.available && (
                <div
                  className="domain-unavailable"
                  role="alert"
                >
                  <span
                    className="domain-status-icon"
                    aria-hidden="true"
                  >
                    ×
                  </span>

                  <div>
                    <strong>
                      Domain unavailable
                    </strong>

                    <span>
                      {" "}
                      {domainAvailability.message}
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* ==============================================================
              DOMAIN RULES
              ============================================================== */}

          <div className="domain-rules">
            <div className="domain-rule">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                All organization domains remain
                inside the Fockis namespace.
              </p>
            </div>

            <div className="domain-rule">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                Choose from the Fockis domain
                extensions provided by the
                selector.
              </p>
            </div>

            <div className="domain-rule">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                Enter only the beginning of your
                organization domain name.
              </p>
            </div>

            <div className="domain-rule">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                The selected Fockis extension is
                added automatically.
              </p>
            </div>

            <div className="domain-rule">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                A registered domain cannot be
                claimed by another organization.
              </p>
            </div>

            <div className="domain-rule">
              <span aria-hidden="true">
                ✓
              </span>

              <p>
                A domain can belong to only one
                organization or managed identity.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECURITY POLICY
            ================================================================ */}

        {loading ? (
          <div className="loading-state">
            Loading security settings...
          </div>
        ) : (
          <SecurityPolicyCard
            policy={policy}
            onChange={(patch) =>
              void change(patch)
            }
            saving={saving}
          />
        )}
      </main>
    </div>
  );
}