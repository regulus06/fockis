import {
  useState,
  type KeyboardEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import OrganizationIdentitySidebar from "../components/OrganizationIdentitySidebar";
import DomainCard from "../components/DomainCard";

import {
  useOrganizationDomains,
} from "../hooks/useOrganizationDomains";

import organizationIdentityApi from "../services/organizationIdentityApi";

/*
 * LAYOUT NOTE:
 *
 * OrganizationIdentity.scss is the single source of truth for:
 *
 * .identity-layout
 * .identity-main
 * .identity-header
 * .eyebrow
 *
 * OrganizationDomains.scss contains domain-page-specific styles.
 */

import "../styles/OrganizationIdentity.scss";
import "../styles/OrganizationDomains.scss";

interface Props {
  organizationId: string;
}

interface DomainAvailability {
  available: boolean;
  domain: string;
  message: string;
}

/*
 * Fockis domain suffix.
 *
 * The user NEVER types this part.
 *
 * User enters:
 *
 *   springfieldchurch
 *
 * Application sends:
 *
 *   springfieldchurch.fockis.com
 */
const FOCKIS_SUFFIX = ".fockis.com";

/**
 * Normalize the user's domain prefix.
 *
 * Examples:
 *
 *   SpringfieldChurch
 *   springfieldchurch.fockis.com
 *   https://springfieldchurch.fockis.com/
 *
 * become:
 *
 *   springfieldchurch
 */
function normalizePrefix(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .replace(/\.fockis\.com$/i, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

/**
 * Normalize an existing domain returned by the API.
 */
function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .replace(/\.$/, "");
}

/**
 * Validate the user-entered domain prefix.
 */
function isValidPrefix(prefix: string): boolean {
  if (!prefix) {
    return false;
  }

  if (prefix.length < 2 || prefix.length > 63) {
    return false;
  }

  if (!/^[a-z0-9-]+$/.test(prefix)) {
    return false;
  }

  if (
    prefix.startsWith("-") ||
    prefix.endsWith("-")
  ) {
    return false;
  }

  return true;
}

/**
 * Only Fockis organization/member domains are allowed.
 *
 * Valid:
 *
 *   springfieldchurch.fockis.com
 *   john.springfieldchurch.fockis.com
 *
 * Invalid:
 *
 *   fockis.com
 *   google.com
 *   example.org
 */
function isFockisDomain(domain: string): boolean {
  return (
    domain !== "fockis.com" &&
    domain.endsWith(FOCKIS_SUFFIX)
  );
}

/**
 * Determine whether a domain is the organization's
 * base domain.
 *
 * Example:
 *
 *   springfieldchurch.fockis.com
 *
 * has exactly one label before .fockis.com.
 *
 * Member domains normally look like:
 *
 *   john.springfieldchurch.fockis.com
 */
function isOrganizationBaseDomain(
  domain: string,
): boolean {
  if (!domain.endsWith(FOCKIS_SUFFIX)) {
    return false;
  }

  const subdomain = domain.slice(
    0,
    -FOCKIS_SUFFIX.length,
  );

  if (!subdomain) {
    return false;
  }

  return !subdomain.includes(".");
}

export default function OrganizationDomainsPage({
  organizationId,
}: Props) {
  const navigate = useNavigate();

  const {
    domains,
    loading,
    error,
  } = useOrganizationDomains(
    organizationId,
  );

  /*
   * This contains ONLY the beginning of the domain.
   *
   * Example:
   *
   *   springfieldchurch
   */
  const [domain, setDomain] = useState("");

  const [checking, setChecking] =
    useState(false);

  const [availability, setAvailability] =
    useState<DomainAvailability | null>(null);

  const [message, setMessage] =
    useState("");

  /**
   * Find the organization's base domain.
   */
  const organizationDomain =
    domains.find((item) => {
      const value =
        typeof item.domain === "string"
          ? normalizeDomain(item.domain)
          : "";

      return isOrganizationBaseDomain(value);
    }) ?? null;

  const hasOrganizationDomain =
    Boolean(organizationDomain);

  /**
   * Build the complete domain.
   *
   * Example:
   *
   * domain = "springfieldchurch"
   *
   * fullDomain =
   * "springfieldchurch.fockis.com"
   */
  const normalizedPrefix =
    normalizePrefix(domain);

  const fullDomain = normalizedPrefix
    ? `${normalizedPrefix}${FOCKIS_SUFFIX}`
    : "";

  /**
   * Change the domain prefix.
   *
   * The user only edits the beginning.
   */
  function handleDomainChange(
    value: string,
  ) {
    const normalized =
      normalizePrefix(value);

    setDomain(normalized);
    setAvailability(null);
    setMessage("");
  }

  /**
   * Check whether the generated Fockis domain
   * is available.
   */
  async function checkAvailability() {
    setMessage("");
    setAvailability(null);

    if (!organizationId) {
      setMessage(
        "Organization ID is missing.",
      );
      return;
    }

    if (!normalizedPrefix) {
      setMessage(
        "Enter the beginning of your Fockis domain.",
      );
      return;
    }

    if (!isValidPrefix(normalizedPrefix)) {
      if (normalizedPrefix.length < 2) {
        setMessage(
          "The domain name must contain at least 2 characters.",
        );
      } else if (
        normalizedPrefix.length > 63
      ) {
        setMessage(
          "The domain name cannot exceed 63 characters.",
        );
      } else {
        setMessage(
          "Use only letters, numbers, and hyphens. The name cannot begin or end with a hyphen.",
        );
      }

      return;
    }

    if (!isFockisDomain(fullDomain)) {
      setMessage(
        "Only Fockis domains ending in .fockis.com are allowed.",
      );
      return;
    }

    setChecking(true);

    try {
      const result =
        await organizationIdentityApi.checkDomainAvailability(
          organizationId,
          fullDomain,
        );

      setAvailability({
        available: result.available,
        domain: result.domain,
        message: result.message,
      });
    } catch (errorValue: any) {
      const backendMessage =
        errorValue?.response?.data?.message;

      const resolvedMessage =
        Array.isArray(backendMessage)
          ? backendMessage.join(", ")
          : typeof backendMessage === "string"
            ? backendMessage
            : errorValue instanceof Error
              ? errorValue.message
              : "Unable to check domain availability.";

      setMessage(resolvedMessage);
    } finally {
      setChecking(false);
    }
  }

  /**
   * Allow Enter to check availability.
   */
  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    void checkAvailability();
  }

  /**
   * Navigate to the domain creation page.
   */
  function handleCreateOrganizationDomain() {
    navigate(
      `/organizations/${organizationId}/identity/domains/new`,
    );
  }

  return (
    <div className="identity-layout">
      <OrganizationIdentitySidebar
        organizationId={organizationId}
      />

      <main className="identity-main">
        {/* ================================================================
            PAGE HEADER
            ================================================================ */}

        <header className="identity-header">
          <div>
            <span className="eyebrow">
              Organization identity
            </span>

            <h1>Domains</h1>

            <p>
              Manage the Fockis domains available to
              your organization. Your organization needs
              a base Fockis domain before members can
              receive their own organization domains.
            </p>
          </div>
        </header>

        {/* ================================================================
            REQUIRED ORGANIZATION DOMAIN
            ================================================================ */}

        {!hasOrganizationDomain && !loading && (
          <section
            className="domain-add-card"
            aria-labelledby="organization-domain-required"
          >
            <div>
              <span className="eyebrow">
                Required
              </span>

              <h2 id="organization-domain-required">
                Create your organization domain
              </h2>

              <p>
                This organization does not have a base
                Fockis domain yet. Create one before
                adding members or assigning member
                domains.
              </p>

              <p>
                Your organization domain will look like:
              </p>

              <strong>
                yourorganization.fockis.com
              </strong>
            </div>

            <button
              type="button"
              className="domain-add-link"
              onClick={
                handleCreateOrganizationDomain
              }
            >
              + Create Organization Domain
            </button>
          </section>
        )}

        {/* ================================================================
            EXISTING ORGANIZATION DOMAIN
            ================================================================ */}

        {hasOrganizationDomain && (
          <section className="domain-add-card">
            <div>
              <span className="eyebrow">
                Organization domain
              </span>

              <h2>
                Organization domain
              </h2>

              <p>
                Your organization has a base Fockis
                domain.
              </p>

              <strong>
                {organizationDomain?.domain}
              </strong>
            </div>

            <Link
              className="domain-add-link"
              to={`/organizations/${organizationId}/identity/domains/new`}
            >
              + Add Domain
            </Link>
          </section>
        )}

        {/* ================================================================
            AVAILABILITY CHECKER
            ================================================================ */}

        <section className="standalone-form">
          <span className="eyebrow">
            Domain availability
          </span>

          <h2>
            Check Domain Availability
          </h2>

          <p>
            Enter only the beginning of your Fockis
            domain. Fockis automatically adds{" "}
            <strong>.fockis.com</strong>.
          </p>

          <label htmlFor="fockis-domain">
            Fockis Domain
          </label>

          <div className="domain-input-row">
            <div className="domain-name-composer">
              <input
                id="fockis-domain"
                type="text"
                value={domain}
                onChange={(event) =>
                  handleDomainChange(
                    event.target.value,
                  )
                }
                onKeyDown={handleKeyDown}
                placeholder="yourorganization"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={63}
                disabled={checking}
                aria-describedby="fockis-domain-help"
              />

              <span
                className="domain-suffix"
                aria-hidden="true"
              >
                {FOCKIS_SUFFIX}
              </span>
            </div>

            <button
              type="button"
              className="secondary-button"
              disabled={
                checking ||
                !isValidPrefix(
                  normalizedPrefix,
                )
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
            id="fockis-domain-help"
            className="domain-help"
          >
            Example:{" "}
            <strong>
              springfieldchurch.fockis.com
            </strong>
          </p>

          {/* ==============================================================
              DOMAIN PREVIEW
              ============================================================== */}

          {fullDomain && (
            <div className="domain-preview">
              <span className="domain-preview__label">
                Fockis domain
              </span>

              <strong className="domain-preview__value">
                {fullDomain}
              </strong>
            </div>
          )}

          {/* ==============================================================
              AVAILABLE
              ============================================================== */}

          {availability?.available && (
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
                  is available.
                </span>
              </div>
            </div>
          )}

          {/* ==============================================================
              UNAVAILABLE
              ============================================================== */}

          {availability &&
            !availability.available && (
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
                    {availability.message}
                  </span>
                </div>
              </div>
            )}

          {/* ==============================================================
              ERROR / MESSAGE
              ============================================================== */}

          {message && (
            <div
              className="notice"
              role="alert"
            >
              {message}
            </div>
          )}

          {/* ==============================================================
              RULES
              ============================================================== */}

          <div className="domain-rules">
            <div className="domain-rule">
              <span>✓</span>

              <p>
                Domains always end in{" "}
                <strong>.fockis.com</strong>.
              </p>
            </div>

            <div className="domain-rule">
              <span>✓</span>

              <p>
                Enter only the beginning of the
                domain name.
              </p>
            </div>

            <div className="domain-rule">
              <span>✓</span>

              <p>
                Use letters, numbers, and hyphens.
              </p>
            </div>

            <div className="domain-rule">
              <span>✓</span>

              <p>
                Every organization must have a
                base organization domain before
                members can receive member domains.
              </p>
            </div>

            <div className="domain-rule">
              <span>✓</span>

              <p>
                A domain can only belong to one
                organization or member.
              </p>
            </div>

            <div className="domain-rule">
              <span>✓</span>

              <p>
                A user or member can have only one
                Fockis domain.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            CONNECTED DOMAINS
            ================================================================ */}

        <div className="domain-page-heading">
          <div>
            <h2>
              Connected domains
            </h2>

            <p>
              {domains.length} domain
              {domains.length === 1
                ? ""
                : "s"}{" "}
              connected.
            </p>
          </div>

          <div className="domain-page-heading__actions">
            {!hasOrganizationDomain ? (
              <button
                type="button"
                className="domain-add-link"
                onClick={
                  handleCreateOrganizationDomain
                }
              >
                + Create Organization Domain
              </button>
            ) : (
              <Link
                className="domain-add-link"
                to={`/organizations/${organizationId}/identity/domains/new`}
              >
                + Add Domain
              </Link>
            )}

            <Link
              className="domain-users-link"
              to={`/organizations/${organizationId}/identity/users`}
            >
              Manage users →
            </Link>
          </div>
        </div>

        {/* ================================================================
            LOADING / ERROR / DOMAIN LIST
            ================================================================ */}

        {loading ? (
          <div className="loading-state">
            Loading domains...
          </div>
        ) : error ? (
          <div
            className="notice"
            role="alert"
          >
            {typeof error === "string"
              ? error
              : "Unable to load organization domains."}
          </div>
        ) : domains.length === 0 ? (
          <div className="empty-state">
            <strong>
              Your organization needs a domain
            </strong>

            <p>
              No base Fockis domain has been created
              for this organization. Create your
              organization domain before adding
              members.
            </p>

            <button
              type="button"
              className="domain-add-link"
              onClick={
                handleCreateOrganizationDomain
              }
            >
              + Create Organization Domain
            </button>
          </div>
        ) : (
          <section className="domain-grid">
            {domains.map((item) => (
              <DomainCard
                key={item.id}
                domain={item}
                onOpen={() =>
                  navigate(
                    `/organizations/${organizationId}/identity/domains/${item.id}`,
                  )
                }
              />
            ))}
          </section>
        )}

        {/* ================================================================
            MEMBER DOMAIN INFORMATION
            ================================================================ */}

        {hasOrganizationDomain && (
          <section className="standalone-form">
            <span className="eyebrow">
              Member domains
            </span>

            <h2>
              Organization member domains
            </h2>

            <p>
              Members can receive a domain under
              your organization's base domain.
              For example:
            </p>

            <div className="domain-rules">
              <div className="domain-rule">
                <span>→</span>

                <p>
                  <strong>
                    john.
                    {organizationDomain?.domain}
                  </strong>
                </p>
              </div>

              <div className="domain-rule">
                <span>→</span>

                <p>
                  <strong>
                    mary.
                    {organizationDomain?.domain}
                  </strong>
                </p>
              </div>
            </div>

            <p>
              Manage your organization members
              to create or assign their domains.
            </p>

            <Link
              className="domain-users-link"
              to={`/organizations/${organizationId}/identity/users`}
            >
              Manage organization members →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}