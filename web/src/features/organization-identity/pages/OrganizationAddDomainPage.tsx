import {
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import { useOrganizationDomains } from "../hooks/useOrganizationDomains";
import organizationIdentityApi from "../services/organizationIdentityApi";

/*
 * LAYOUT NOTE (FIXED):
 * OrganizationIdentity.scss is the single source of truth for the shared
 * .identity-layout / .identity-main / .identity-header / .eyebrow classes,
 * including the mobile breakpoint that collapses the sidebar + main flex
 * row into a stacked column below 650px. It must be imported here (and by
 * every other page that renders <OrganizationIdentitySidebar>) so this
 * page's layout can't be affected by CSS load order.
 *
 * OrganizationDomains.scss now only contains domain-page-specific styles.
 */
import "../styles/OrganizationIdentity.scss";
import "../styles/OrganizationDomains.scss";

interface DomainAvailability {
  available: boolean;
  domain: string;
  message: string;
}

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

function normalizePrefix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//gi, "")
    .replace(/^www\./i, "")
    .replace(/\.fockis\.com$/i, "")
    .split("/")[0]
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

function isValidPrefix(value: string): boolean {
  if (!value) {
    return false;
  }

  if (value.length < 2 || value.length > 63) {
    return false;
  }

  if (
    value.startsWith("-") ||
    value.endsWith("-")
  ) {
    return false;
  }

  return /^[a-z0-9-]+$/.test(value);
}

function isFockisDomain(domain: string): boolean {
  return (
    domain.length > 0 &&
    domain !== "fockis.com" &&
    domain.endsWith(".fockis.com")
  );
}

function getErrorMessage(
  errorValue: unknown,
  fallback: string,
): string {
  const error = errorValue as {
    response?: {
      data?: {
        message?: unknown;
      };
    };
    message?: unknown;
  };

  const backendMessage =
    error?.response?.data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(", ");
  }

  if (typeof backendMessage === "string") {
    return backendMessage;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return fallback;
}

export default function OrganizationAddDomainPage() {
  const { organizationId = "" } =
    useParams<{ organizationId: string }>();

  const navigate = useNavigate();

  const { addDomain } =
    useOrganizationDomains(organizationId);

  const [prefix, setPrefix] = useState("");

  const [checking, setChecking] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [availability, setAvailability] =
    useState<DomainAvailability | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /**
   * Build the complete Fockis domain.
   *
   * Example:
   * mychurch -> mychurch.fockis.com
   */
  const fullDomain = useMemo(() => {
    const normalizedPrefix =
      normalizePrefix(prefix);

    if (!normalizedPrefix) {
      return "";
    }

    return `${normalizedPrefix}.fockis.com`;
  }, [prefix]);

  /**
   * Handle the domain name field.
   *
   * The user only enters the prefix.
   * Fockis automatically supplies .fockis.com.
   */
  function handlePrefixChange(value: string) {
    const cleaned = value
      .toLowerCase()
      .replace(/https?:\/\//gi, "")
      .replace(/^www\./i, "")
      .replace(/\.fockis\.com$/i, "")
      .split("/")[0]
      .replace(/[^a-z0-9-]/g, "");

    setPrefix(cleaned);

    // A changed domain must be checked again.
    setAvailability(null);
    setError("");
    setSuccess("");
  }

  /**
   * Check whether the current Fockis domain is available.
   */
  async function checkAvailability() {
    setError("");
    setSuccess("");
    setAvailability(null);

    if (!organizationId) {
      setError("Organization ID is missing.");
      return;
    }

    const normalizedPrefix =
      normalizePrefix(prefix);

    if (!normalizedPrefix) {
      setError("Enter a domain name.");
      return;
    }

    if (!isValidPrefix(normalizedPrefix)) {
      setError(
        "Use 2–63 lowercase letters, numbers, or hyphens. The domain cannot start or end with a hyphen.",
      );
      return;
    }

    const normalizedDomain =
      `${normalizedPrefix}.fockis.com`;

    if (!isFockisDomain(normalizedDomain)) {
      setError("Invalid Fockis domain.");
      return;
    }

    setChecking(true);

    try {
      const result =
        await organizationIdentityApi.checkDomainAvailability(
          organizationId,
          normalizedDomain,
        );

      const checkedDomain =
        normalizeDomain(
          result.domain ||
            normalizedDomain,
        );

      setAvailability({
        available: result.available,
        domain: checkedDomain,
        message:
          result.message ||
          (result.available
            ? "This domain is available."
            : "This domain is not available."),
      });

      if (!result.available) {
        setError(
          result.message ||
            "This domain is not available.",
        );
      }
    } catch (errorValue: unknown) {
      setAvailability(null);

      setError(
        getErrorMessage(
          errorValue,
          "Unable to check domain availability.",
        ),
      );
    } finally {
      setChecking(false);
    }
  }

  /**
   * Create the domain after availability has
   * been successfully confirmed.
   */
  async function createDomain() {
    setError("");
    setSuccess("");

    if (!organizationId) {
      setError("Organization ID is missing.");
      return;
    }

    const normalizedPrefix =
      normalizePrefix(prefix);

    if (!isValidPrefix(normalizedPrefix)) {
      setError("Enter a valid domain name.");
      return;
    }

    const normalizedDomain =
      `${normalizedPrefix}.fockis.com`;

    /**
     * IMPORTANT:
     * Only allow creation when the exact
     * current domain was checked and confirmed
     * available.
     */
    const hasValidAvailability =
      availability?.available === true &&
      normalizeDomain(
        availability.domain,
      ) === normalizedDomain;

    if (!hasValidAvailability) {
      setError(
        "Check availability before creating the domain.",
      );
      return;
    }

    setCreating(true);

    try {
      await addDomain({
        domain: normalizedDomain,
      });

      setSuccess(
        `${normalizedDomain} was created successfully.`,
      );

      setPrefix("");
      setAvailability(null);

      window.setTimeout(() => {
        navigate(
          `/organizations/${organizationId}/identity/domains`,
          {
            replace: true,
          },
        );
      }, 800);
    } catch (errorValue: unknown) {
      setError(
        getErrorMessage(
          errorValue,
          "Unable to create the domain.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  /**
   * Form submission:
   *
   * If the current domain has not been checked,
   * check it first.
   *
   * If it has already been confirmed available,
   * create it.
   */
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (checking || creating) {
      return;
    }

    const currentDomain =
      normalizeDomain(fullDomain);

    const checkedCurrentDomain =
      availability !== null &&
      normalizeDomain(
        availability.domain,
      ) === currentDomain;

    if (
      availability?.available === true &&
      checkedCurrentDomain
    ) {
      void createDomain();
      return;
    }

    void checkAvailability();
  }

  /**
   * Allow Enter to perform the same two-step flow.
   */
  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (checking || creating) {
      return;
    }

    const currentDomain =
      normalizeDomain(fullDomain);

    const checkedCurrentDomain =
      availability !== null &&
      normalizeDomain(
        availability.domain,
      ) === currentDomain;

    if (
      availability?.available === true &&
      checkedCurrentDomain
    ) {
      void createDomain();
      return;
    }

    void checkAvailability();
  }

  /**
   * Make sure the availability result belongs
   * to the domain currently displayed.
   */
  const domainIsChecked =
    availability !== null &&
    normalizeDomain(
      availability.domain,
    ) === normalizeDomain(fullDomain);

  /**
   * Create Domain is enabled ONLY when:
   *
   * 1. Domain is valid
   * 2. Availability was checked
   * 3. Exact current domain is available
   * 4. We are not already creating/checking
   */
  const canCreate =
    !checking &&
    !creating &&
    isValidPrefix(
      normalizePrefix(prefix),
    ) &&
    availability?.available === true &&
    domainIsChecked;

  return (
    <div className="identity-layout">
      <OrganizationIdentitySidebar
        organizationId={organizationId}
      />

      <main className="identity-main">
        <header className="identity-header">
          <div>
            <span className="eyebrow">
              Fockis domain
            </span>

            <h1>Create Domain</h1>

            <p>
              Create a unique Fockis domain
              for this organization.
            </p>
          </div>
        </header>

        <section className="standalone-form">
          <span className="eyebrow">
            Domain registration
          </span>

          <h2>
            Create your Fockis domain
          </h2>

          <p>
            Choose the name you want to use.
            Fockis will automatically add{" "}
            <strong>.fockis.com</strong>.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="fockis-domain-name">
              Domain Name
            </label>

            <div className="domain-input-row">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  minWidth: 0,
                  border:
                    "1px solid #ccd8e0",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <input
                  id="fockis-domain-name"
                  type="text"
                  value={prefix}
                  onChange={(event) =>
                    handlePrefixChange(
                      event.target.value,
                    )
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="yourdomain"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  disabled={
                    checking ||
                    creating
                  }
                  aria-describedby="domain-preview"
                  style={{
                    border: 0,
                    outline: 0,
                    flex: 1,
                    minWidth: 0,
                    padding:
                      "12px 14px",
                    background:
                      "transparent",
                    fontSize: "16px",
                  }}
                />

                <span
                  style={{
                    padding:
                      "12px 14px 12px 0",
                    whiteSpace: "nowrap",
                    color: "#66788a",
                    fontWeight: 600,
                  }}
                >
                  .fockis.com
                </span>
              </div>

              <button
                type="button"
                className="secondary-button"
                disabled={
                  checking ||
                  creating ||
                  !prefix.trim()
                }
                onClick={() =>
                  void checkAvailability()
                }
              >
                {checking
                  ? "Checking..."
                  : "Check Availability"}
              </button>
            </div>

            <p
              id="domain-preview"
              className="domain-help"
            >
              Your domain:{" "}
              <strong>
                {fullDomain ||
                  "yourdomain.fockis.com"}
              </strong>
            </p>

            {availability?.available &&
              domainIsChecked && (
                <div
                  className="domain-availability domain-availability--available"
                  role="status"
                >
                  <span
                    className="domain-availability__icon"
                    aria-hidden="true"
                  >
                    ✓
                  </span>

                  <div>
                    <strong>
                      {availability.domain}
                    </strong>

                    <span>
                      {" "}
                      is available and
                      ready to create.
                    </span>
                  </div>
                </div>
              )}

            {availability &&
              !availability.available &&
              domainIsChecked && (
                <div
                  className="domain-availability domain-availability--unavailable"
                  role="status"
                >
                  <span
                    className="domain-availability__icon"
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
                      {availability.message ||
                        "This domain is not available."}
                    </span>
                  </div>
                </div>
              )}

            {error && (
              <div
                className="form-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="notice"
                role="status"
              >
                {success}
              </div>
            )}

            <div className="domain-rules">
              <div className="domain-rule">
                <span>✓</span>

                <p>
                  Your domain will end in{" "}
                  <strong>
                    .fockis.com
                  </strong>
                </p>
              </div>

              <div className="domain-rule">
                <span>✓</span>

                <p>
                  The domain name must be
                  unique.
                </p>
              </div>

              <div className="domain-rule">
                <span>✓</span>

                <p>
                  You must check
                  availability before
                  creating the domain.
                </p>
              </div>
            </div>

            <div className="standalone-form__actions">
              <button
                type="button"
                disabled={
                  checking ||
                  creating
                }
                onClick={() =>
                  navigate(-1)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={!canCreate}
              >
                {creating
                  ? "Creating..."
                  : "Create Domain"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}