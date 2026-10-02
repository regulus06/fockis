import {
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import "../styles/TravelSignInPage.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — SIGN IN
 * ============================================================================
 *
 * Organizations may use Fockis-managed domains or custom domains.
 *
 * Examples:
 *
 *   admin@yourorganization.fockis.com
 *   pastor@yourorganization.fockis.org
 *   pastor@yourorganization.org
 *   pastor@yourorganization.net
 *   pastor@yourorganization.com
 *   pastor@yourorganization.church
 *
 * The frontend does NOT restrict users to .fockis.com.
 *
 * The backend must determine whether the email domain:
 *
 *   1. Exists in OrganizationDomain.
 *   2. Is verified.
 *   3. Is active.
 *   4. Belongs to an organization.
 *   5. Belongs to an active user/member.
 *
 * Frontend validation is only the first layer.
 */

/**
 * ============================================================================
 * EMAIL VALIDATION
 * ============================================================================
 *
 * Validates the basic structure of an organization email.
 *
 * This does NOT restrict the domain suffix.
 *
 * Accepted examples:
 *
 *   user@organization.org
 *   user@organization.net
 *   user@organization.com
 *   user@organization.fockis.com
 *
 * Rejected examples:
 *
 *   user
 *   @organization.org
 *   user@
 *   user@organization
 *   user@@organization.org
 */
function isValidOrganizationEmail(
  value: string,
): boolean {
  const email = value
    .trim()
    .toLowerCase();

  const atIndex =
    email.lastIndexOf("@");

  if (atIndex <= 0) {
    return false;
  }

  /**
   * There must only be one @ character.
   */
  if (email.indexOf("@") !== atIndex) {
    return false;
  }

  const localPart =
    email.slice(0, atIndex);

  const domain =
    email.slice(atIndex + 1);

  if (!localPart || !domain) {
    return false;
  }

  /**
   * Reasonable email length limits.
   */
  if (
    localPart.length > 64 ||
    domain.length > 253
  ) {
    return false;
  }

  /**
   * Require a domain containing at least one dot.
   *
   * Examples:
   *
   *   organization.org
   *   organization.net
   *   organization.com
   *   organization.fockis.com
   */
  if (!domain.includes(".")) {
    return false;
  }

  /**
   * Validate hostname labels.
   */
  const labels =
    domain.split(".");

  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        label.startsWith("-") ||
        label.endsWith("-") ||
        !/^[a-z0-9-]+$/i.test(
          label,
        ),
    )
  ) {
    return false;
  }

  return true;
}

/**
 * ============================================================================
 * EMAIL NORMALIZATION
 * ============================================================================
 */
function normalizeEmail(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

/**
 * ============================================================================
 * PAGE
 * ============================================================================
 */
export default function TravelSignInPage() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [remember, setRemember] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  /**
   * ==========================================================================
   * SUBMIT
   * ==========================================================================
   */
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    const normalizedEmail =
      normalizeEmail(email);

    /**
     * ------------------------------------------------------------------------
     * EMAIL
     * ------------------------------------------------------------------------
     */
    if (!normalizedEmail) {
      setError(
        "Enter your organization email address.",
      );
      return;
    }

    if (
      !isValidOrganizationEmail(
        normalizedEmail,
      )
    ) {
      setError(
        "Enter a valid organization email address, such as pastor@yourorganization.org or admin@yourorganization.fockis.com.",
      );
      return;
    }

    /**
     * ------------------------------------------------------------------------
     * PASSWORD
     * ------------------------------------------------------------------------
     */
    if (!password) {
      setError(
        "Enter your password.",
      );
      return;
    }

    /**
     * ------------------------------------------------------------------------
     * AUTHENTICATION
     * ------------------------------------------------------------------------
     *
     * The email has passed client-side validation.
     *
     * The backend must resolve:
     *
     *   pastor@yourorganization.org
     *              ↓
     *   yourorganization.org
     *              ↓
     *   OrganizationDomain
     *              ↓
     *   Organization
     *              ↓
     *   OrganizationIdentity / User
     *              ↓
     *   Password verification
     *              ↓
     *   JWT
     *
     * Do not use the frontend to determine whether
     * a domain is actually registered with Fockis.
     */
    setLoading(true);

    try {
      /**
       * IMPORTANT:
       *
       * This is intentionally not a fake API request.
       *
       * Connect your existing Fockis authentication
       * service here.
       *
       * Example:
       *
       * await authApi.login({
       *   email: normalizedEmail,
       *   password,
       *   remember,
       * });
       */

      console.log(
        "[Fockis Travel] Sign-in validated",
        {
          email: normalizedEmail,
          remember,
        },
      );
    } catch (err) {
      console.error(
        "[Fockis Travel] Sign-in failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================================
   * EMAIL CHANGE
   * ==========================================================================
   */
  function handleEmailChange(
    value: string,
  ) {
    setEmail(value);

    if (error) {
      setError(null);
    }
  }

  /**
   * ==========================================================================
   * PASSWORD CHANGE
   * ==========================================================================
   */
  function handlePasswordChange(
    value: string,
  ) {
    setPassword(value);

    if (error) {
      setError(null);
    }
  }

  return (
    <div className="travel-sign-in-page">
      <div className="travel-sign-in-page__card">

        {/* ================================================================
            HEADER
        ================================================================= */}

        <div className="travel-sign-in-page__header">
          <Link
            to="/travel"
            className="logo"
            style={{
              justifyContent: "center",
              display: "flex",
            }}
          >
            <span
              className="logo-mark"
              aria-hidden="true"
            />

            Fockis{" "}
            <small>
              TRAVEL
            </small>
          </Link>

          <h1
            style={{
              fontSize: 22,
              marginTop: 18,
            }}
          >
            Welcome back
          </h1>

          <p
            style={{
              color:
                "var(--slate, #5B6B76)",
              fontSize: 13.5,
              marginTop: 6,
            }}
          >
            Sign in with your
            organization account to
            manage your trips and
            bookings.
          </p>
        </div>

        {/* ================================================================
            ORGANIZATION DOMAIN NOTICE
        ================================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 18,
            padding: "11px 13px",
            border:
              "1px solid rgba(14, 110, 103, 0.18)",
            borderRadius: 10,
            background:
              "rgba(14, 110, 103, 0.055)",
            color:
              "var(--petrol, #0E6E67)",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <ShieldCheck
            size={17}
            aria-hidden="true"
            style={{
              flexShrink: 0,
              marginTop: 1,
            }}
          />

          <span>
            <strong>
              Organization account
              required
            </strong>
            <br />

            Use the email address
            associated with your
            Fockis organization.
            Fockis supports both
            Fockis-managed domains
            and verified custom
            organization domains.
          </span>
        </div>

        {/* ================================================================
            FORM
        ================================================================= */}

        <form
          onSubmit={handleSubmit}
          noValidate
        >

          {/* ==============================================================
              ERROR
          ============================================================== */}

          {error && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems:
                  "flex-start",
                gap: 9,
                marginBottom: 16,
                padding:
                  "11px 13px",
                border:
                  "1px solid #efc4c4",
                borderRadius: 10,
                background:
                  "#fff5f5",
                color:
                  "#a12f2f",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              <AlertCircle
                size={16}
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />

              <span>
                {error}
              </span>
            </div>
          )}

          {/* ==============================================================
              EMAIL
          ============================================================== */}

          <div className="ft-field">
            <label htmlFor="si-email">
              <Mail
                size={11}
                aria-hidden="true"
                style={{
                  verticalAlign: -1,
                }}
              />{" "}
              Organization Email
            </label>

            <input
              id="si-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={email}
              placeholder="you@yourorganization.org"
              onChange={(event) =>
                handleEmailChange(
                  event.target.value,
                )
              }
              aria-invalid={
                Boolean(error) &&
                email.length > 0
              }
            />

            <div
              style={{
                marginTop: 5,
                fontSize: 11.5,
                color:
                  "var(--slate, #5B6B76)",
                lineHeight: 1.5,
              }}
            >
              Examples:{" "}
              <strong>
                pastor@yourorganization.org
              </strong>
              {" "}or{" "}
              <strong>
                admin@yourorganization.fockis.com
              </strong>
            </div>
          </div>

          {/* ==============================================================
              PASSWORD
          ============================================================== */}

          <div className="ft-field">
            <label htmlFor="si-password">
              <Lock
                size={11}
                aria-hidden="true"
                style={{
                  verticalAlign: -1,
                }}
              />{" "}
              Password
            </label>

            <div
              style={{
                position: "relative",
              }}
            >
              <input
                id="si-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  handlePasswordChange(
                    event.target.value,
                  )
                }
                style={{
                  paddingRight: 42,
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value,
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                style={{
                  position:
                    "absolute",
                  right: 10,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  background:
                    "none",
                  border: "none",
                  color:
                    "var(--slate, #5B6B76)",
                  cursor:
                    "pointer",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  padding: 4,
                }}
              >
                {showPassword ? (
                  <EyeOff
                    size={16}
                    aria-hidden="true"
                  />
                ) : (
                  <Eye
                    size={16}
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
          </div>

          {/* ==============================================================
              REMEMBER / FORGOT
          ============================================================== */}

          <div className="travel-sign-in-page__row">
            <label className="ft-checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) =>
                  setRemember(
                    event.target.checked,
                  )
                }
              />

              Remember me
            </label>

            <a
              href="#forgot"
              className="section-link"
            >
              Forgot password?
            </a>
          </div>

          {/* ==============================================================
              SUBMIT
          ============================================================== */}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{
              opacity: loading
                ? 0.7
                : 1,
              cursor: loading
                ? "wait"
                : "pointer",
            }}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {/* ================================================================
            SOCIAL LOGIN
        ================================================================= */}

        <div className="travel-sign-in-page__divider">
          or continue with
        </div>

        <div className="travel-sign-in-page__social">
          <button
            type="button"
            className="btn btn-outline btn-block"
          >
            Continue with Google
          </button>

          <button
            type="button"
            className="btn btn-outline btn-block"
          >
            Continue with Apple
          </button>
        </div>

        {/* ================================================================
            FOOTER
        ================================================================= */}

        <div className="travel-sign-in-page__footer">
          Don't have a Fockis account?{" "}
          <a
            href="#create-account"
            style={{
              fontWeight: 600,
              color:
                "var(--petrol, #0E6E67)",
            }}
          >
            Create one
          </a>
        </div>

      </div>
    </div>
  );
}