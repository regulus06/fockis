/**
 * ChurchAdminDashboard.tsx
 * -----------------------------------------------------------------------------
 * Fockis Church — Organization Administration Dashboard
 *
 * Access rules:
 *
 *   • Organization owner
 *       → full administrative access
 *
 *   • Active Church Administrator
 *       → administrative dashboard access
 *
 *   • Non-admin members
 *       → denied
 *
 *   • Pending / inactive members
 *       → denied
 *
 * IMPORTANT
 * -----------------------------------------------------------------------------
 *
 * This frontend check controls dashboard visibility only.
 *
 * Backend MembersService / other Church services MUST continue enforcing
 * permissions on every protected API operation.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ChurchApiError,
  ChurchAuthError,
  ChurchForbiddenError,
  churchGet,
} from "../api/churchApi";

import "../styles/ChurchAdmin.scss";

/* ============================================================================
   TYPES
============================================================================ */

interface MembershipSummary {
  id?: string;
  _id?: string;

  organizationId?: string;

  userId?: string;

  status?: string;

  role?: string;

  isOwner?: boolean;

  permissions?: string[];

  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}

interface MyMembershipResponse {
  membership:
    | MembershipSummary
    | null
    | undefined;

  isAdmin: boolean;

  canApproveMembers: boolean;
}

/* ============================================================================
   ADMIN CARD
============================================================================ */

interface AdminCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  accent?: "primary" | "gold" | "success" | "danger";
}

function AdminCard({
  title,
  description,
  icon,
  href,
  accent = "primary",
}: AdminCardProps) {
  return (
    <Link
      to={href}
      className={`church-admin-card church-admin-card--${accent}`}
    >
      <div className="church-admin-card__icon">
        {icon}
      </div>

      <div className="church-admin-card__content">
        <h3>{title}</h3>

        <p>{description}</p>
      </div>

      <span
        className="church-admin-card__arrow"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}

/* ============================================================================
   HELPERS
============================================================================ */

function getOrganizationAdminPath(
  organizationId: string,
  section?: string,
): string {
  const base =
    `/church/organizations/${organizationId}/admin`;

  return section
    ? `${base}/${section}`
    : base;
}

/**
 * MembershipStatus is represented differently in some older Church API
 * responses. Normalize it here so "Active", "ACTIVE", and "active" all work.
 */
function normalizeStatus(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Normalize role values for compatibility with the existing Church
 * membership model.
 */
function normalizeRole(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Owner information is normally supplied by MembersService.toResponse().
 *
 * We intentionally support a few compatibility field names because older
 * membership responses may have used different names.
 */
function isMembershipOwner(
  membership:
    | MembershipSummary
    | null
    | undefined,
): boolean {
  if (!membership) {
    return false;
  }

  if (
    membership.isOwner === true
  ) {
    return true;
  }

  const ownerFlag =
    membership[
      "isOrganizationOwner"
    ];

  if (ownerFlag === true) {
    return true;
  }

  return false;
}

/**
 * Administrative roles are only used as a dashboard-level access check.
 *
 * Individual Church features MUST still use their exact permissions on the
 * backend.
 */
function isAdministrativeRole(
  role: unknown,
): boolean {
  const normalized =
    normalizeRole(role);

  return (
    normalized ===
      "administrator" ||
    normalized ===
      "admin" ||
    normalized ===
      "pastor" ||
    normalized ===
      "director" ||
    normalized ===
      "pastor-director" ||
    normalized ===
      "pastor_director"
  );
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function ChurchAdminDashboard() {
  const {
    organizationId,
  } = useParams<{
    organizationId?: string;
  }>();

  const navigate =
    useNavigate();

  const [membership, setMembership] =
    useState<
      MembershipSummary | null
    >(null);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [
    canApproveMembers,
    setCanApproveMembers,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    authorizationDenied,
    setAuthorizationDenied,
  ] = useState(false);

  /* ==========================================================================
     LOAD CURRENT MEMBERSHIP
  ========================================================================== */

  const loadMembership =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        if (!organizationId) {
          setLoading(false);
          setAuthorizationDenied(
            false,
          );
          setError(
            "No Church organization was specified.",
          );
          return;
        }

        setLoading(true);
        setError(null);
        setAuthorizationDenied(
          false,
        );

        try {
          const response =
            await churchGet<MyMembershipResponse>(
              `/organizations/${organizationId}/members/me`,
              undefined,
              signal,
            );

          if (
            signal?.aborted
          ) {
            return;
          }

          const currentMembership =
            response.membership ??
            null;

          const active =
            normalizeStatus(
              currentMembership?.status,
            ) === "active";

          const owner =
            isMembershipOwner(
              currentMembership,
            );

          const adminRole =
            isAdministrativeRole(
              currentMembership?.role,
            );

          /**
           * The backend already calculates isAdmin.
           *
           * Prefer that authoritative value.
           *
           * Owner is also allowed because the backend's ownership model gives
           * the organization creator full organization authority.
           */
          const administrativeAccess =
            active &&
            (
              owner ||
              Boolean(
                response.isAdmin,
              ) ||
              adminRole
            );

          setMembership(
            currentMembership,
          );

          setCanApproveMembers(
            Boolean(
              response.canApproveMembers,
            ),
          );

          setIsAdmin(
            administrativeAccess,
          );

          if (
            !administrativeAccess
          ) {
            setAuthorizationDenied(
              true,
            );
          }
        } catch (err) {
          if (
            signal?.aborted
          ) {
            return;
          }

          if (
            err instanceof
            ChurchAuthError
          ) {
            setAuthorizationDenied(
              true,
            );

            setError(
              "Your Church session has expired. Please sign in again.",
            );

            return;
          }

          if (
            err instanceof
            ChurchForbiddenError
          ) {
            setAuthorizationDenied(
              true,
            );

            setError(
              "You do not have permission to access this organization's administration dashboard.",
            );

            return;
          }

          if (
            err instanceof
            ChurchApiError
          ) {
            setError(
              err.message ||
                "Unable to load your Church membership.",
            );

            return;
          }

          if (
            err instanceof Error
          ) {
            setError(
              err.message ||
                "Unable to load your Church membership.",
            );

            return;
          }

          setError(
            "Unable to load your Church membership.",
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            setLoading(false);
          }
        }
      },
      [organizationId],
    );

  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    void loadMembership(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [
    loadMembership,
  ]);

  /* ==========================================================================
     ORGANIZATION PATHS
  ========================================================================== */

  const paths = useMemo(() => {
    if (!organizationId) {
      return {
        dashboard:
          "/church/admin",

        edit:
          "/church/admin/organizations/new",

        members:
          "/church/admin/members",

        departments:
          "/church/admin/departments",

        groups:
          "/church/admin/groups",

        events:
          "/church/admin/events",

        live:
          "/church/admin/live",

        media:
          "/church/admin/media",

        domains:
          "/church/admin/domains",

        settings:
          "/church/admin/settings",
      };
    }

    return {
      dashboard:
        getOrganizationAdminPath(
          organizationId,
        ),

      edit:
        `/church/admin/organizations/${organizationId}/edit`,

      members:
        getOrganizationAdminPath(
          organizationId,
          "members",
        ),

      departments:
        getOrganizationAdminPath(
          organizationId,
          "departments",
        ),

      groups:
        getOrganizationAdminPath(
          organizationId,
          "groups",
        ),

      events:
        getOrganizationAdminPath(
          organizationId,
          "events",
        ),

      live:
        getOrganizationAdminPath(
          organizationId,
          "live",
        ),

      media:
        getOrganizationAdminPath(
          organizationId,
          "media",
        ),

      domains:
        getOrganizationAdminPath(
          organizationId,
          "domains",
        ),

      settings:
        getOrganizationAdminPath(
          organizationId,
          "settings",
        ),
    };
  }, [
    organizationId,
  ]);

  /* ==========================================================================
     MISSING ORGANIZATION
  ========================================================================== */

  if (!organizationId) {
    return (
      <main className="church-admin">
        <section className="church-admin__empty">
          <div className="church-admin__empty-icon">
            ⚙
          </div>

          <h1>
            Church Administration
          </h1>

          <p>
            Select a Church organization
            before opening the administration
            dashboard.
          </p>

          <button
            type="button"
            className="church-admin__primary-button"
            onClick={() =>
              navigate(
                "/church/organizations",
              )
            }
          >
            Select Organization
          </button>
        </section>
      </main>
    );
  }

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return (
      <main className="church-admin">
        <section className="church-admin__loading">
          <div
            className="church-admin__spinner"
            aria-hidden="true"
          />

          <h1>
            Checking Church access…
          </h1>

          <p>
            Verifying your organization
            membership and administrative
            access.
          </p>
        </section>
      </main>
    );
  }

  /* ==========================================================================
     ACCESS DENIED
  ========================================================================== */

  if (
    authorizationDenied ||
    !isAdmin
  ) {
    const status =
      normalizeStatus(
        membership?.status,
      );

    const statusMessage =
      status &&
      status !== "active"
        ? `Your organization membership is currently ${status}. Active membership is required for administration access.`
        : "Your current Church membership does not have administrative access to this organization.";

    return (
      <main className="church-admin">
        <section className="church-admin__access-denied">
          <div className="church-admin__access-denied-icon">
            🔒
          </div>

          <span className="church-admin__eyebrow">
            ACCESS RESTRICTED
          </span>

          <h1>
            Church Administration
          </h1>

          <p>
            {error ||
              statusMessage}
          </p>

          <div className="church-admin__access-denied-actions">
            <button
              type="button"
              className="church-admin__primary-button"
              onClick={() =>
                navigate(
                  `/church/organizations/${organizationId}`,
                )
              }
            >
              Return to Church
            </button>

            <button
              type="button"
              className="church-admin__secondary-button"
              onClick={() =>
                void loadMembership()
              }
            >
              Check Access Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ==========================================================================
     ERROR
  ========================================================================== */

  if (error) {
    return (
      <main className="church-admin">
        <section className="church-admin__error">
          <div className="church-admin__error-icon">
            !
          </div>

          <h1>
            Unable to Load Administration
          </h1>

          <p>
            {error}
          </p>

          <div className="church-admin__error-actions">
            <button
              type="button"
              className="church-admin__primary-button"
              onClick={() =>
                void loadMembership()
              }
            >
              Try Again
            </button>

            <button
              type="button"
              className="church-admin__secondary-button"
              onClick={() =>
                navigate(
                  `/church/organizations/${organizationId}`,
                )
              }
            >
              Return to Church
            </button>
          </div>
        </section>
      </main>
    );
  }

  /* ==========================================================================
     DASHBOARD
  ========================================================================== */

  const displayRole =
    membership?.role
      ? String(
          membership.role,
        )
      : "Administrator";

  const owner =
    isMembershipOwner(
      membership,
    );

  return (
    <main className="church-admin">
      {/* ======================================================================
          HEADER
      ====================================================================== */}

      <header className="church-admin__header">
        <div className="church-admin__header-inner">
          <div className="church-admin__header-copy">
            <Link
              to={`/church/organizations/${organizationId}`}
              className="church-admin__back-link"
            >
              ← Church
            </Link>

            <span className="church-admin__eyebrow">
              FOCKIS CHURCH
            </span>

            <h1>
              Administration
            </h1>

            <p>
              Manage your Church organization,
              people, ministries, events, media,
              and settings.
            </p>
          </div>

          <div className="church-admin__header-actions">
            <div className="church-admin__role-badge">
              <span
                className="church-admin__role-badge-icon"
                aria-hidden="true"
              >
                {owner
                  ? "★"
                  : "✓"}
              </span>

              <span>
                {owner
                  ? "Organization Owner"
                  : displayRole}
              </span>
            </div>

            <Link
              to={paths.dashboard}
              className="church-admin__dashboard-badge"
              aria-current="page"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================================
          ORGANIZATION NOTICE
      ====================================================================== */}

      <section className="church-admin__notice">
        <div className="church-admin__notice-icon">
          ✓
        </div>

        <div className="church-admin__notice-content">
          <strong>
            Administrative access verified
          </strong>

          <span>
            You are an active administrator
            for this Church organization.
            Individual management actions
            remain protected by Church
            permissions.
          </span>
        </div>

        {canApproveMembers && (
          <Link
            to={paths.members}
            className="church-admin__notice-action"
          >
            Review Members →
          </Link>
        )}
      </section>

      {/* ======================================================================
          CONTENT
      ====================================================================== */}

      <div className="church-admin__content">
        {/* ====================================================================
            ORGANIZATION MANAGEMENT
        ==================================================================== */}

        <section className="church-admin__section">
          <div className="church-admin__section-heading">
            <div>
              <span className="church-admin__section-kicker">
                ORGANIZATION
              </span>

              <h2>
                Organization Management
              </h2>

              <p>
                Manage the identity, structure,
                and configuration of your
                organization.
              </p>
            </div>
          </div>

          <div className="church-admin__grid">
            <AdminCard
              title="Organization Profile"
              description="Edit the organization name, description, contact information, branding, and public details."
              icon="🏛"
              href={paths.edit}
              accent="primary"
            />

            <AdminCard
              title="Settings"
              description="Configure organization-wide Church settings and administrative options."
              icon="⚙"
              href={paths.settings}
              accent="primary"
            />

            <AdminCard
              title="Domains"
              description="Manage organization domains and identity-related configuration."
              icon="🌐"
              href={paths.domains}
              accent="primary"
            />
          </div>
        </section>

        {/* ====================================================================
            PEOPLE
        ==================================================================== */}

        <section className="church-admin__section">
          <div className="church-admin__section-heading">
            <div>
              <span className="church-admin__section-kicker">
                PEOPLE
              </span>

              <h2>
                People & Membership
              </h2>

              <p>
                Manage members, membership
                requests, leadership, and
                administrative access.
              </p>
            </div>
          </div>

          <div className="church-admin__grid">
            <AdminCard
              title="Members"
              description="View members, review membership requests, update member information, and manage membership."
              icon="👥"
              href={paths.members}
              accent="primary"
            />
          </div>
        </section>

        {/* ====================================================================
            MINISTRIES
        ==================================================================== */}

        <section className="church-admin__section">
          <div className="church-admin__section-heading">
            <div>
              <span className="church-admin__section-kicker">
                MINISTRIES
              </span>

              <h2>
                Departments & Groups
              </h2>

              <p>
                Organize your Church into
                departments and custom groups.
              </p>
            </div>
          </div>

          <div className="church-admin__grid">
            <AdminCard
              title="Departments"
              description="Create and manage Church departments, leaders, responsibilities, and ministry structure."
              icon="🏢"
              href={paths.departments}
              accent="primary"
            />

            <AdminCard
              title="Groups"
              description="Create custom groups for ministries, Bible studies, teams, communities, classes, and other purposes."
              icon="👨‍👩‍👧‍👦"
              href={paths.groups}
              accent="gold"
            />
          </div>
        </section>

        {/* ====================================================================
            EVENTS
        ==================================================================== */}

        <section className="church-admin__section">
          <div className="church-admin__section-heading">
            <div>
              <span className="church-admin__section-kicker">
                EVENTS
              </span>

              <h2>
                Events & Scheduling
              </h2>

              <p>
                Organize Church events and keep
                your community informed.
              </p>
            </div>
          </div>

          <div className="church-admin__grid">
            <AdminCard
              title="Events"
              description="Create, edit, publish, and manage Church events and schedules."
              icon="📅"
              href={paths.events}
              accent="gold"
            />
          </div>
        </section>

        {/* ====================================================================
            LIVESTREAM
        ==================================================================== */}

        <section className="church-admin__section">
          <div className="church-admin__section-heading">
            <div>
              <span className="church-admin__section-kicker">
                BROADCAST
              </span>

              <h2>
                Livestream
              </h2>

              <p>
                Manage Church livestreaming and
                live broadcast configuration.
              </p>
            </div>
          </div>

          <div className="church-admin__grid">
            <AdminCard
              title="Live"
              description="Manage Church livestream sessions, broadcasts, and live content."
              icon="🔴"
              href={paths.live}
              accent="danger"
            />
          </div>
        </section>

        {/* ====================================================================
            MEDIA
        ==================================================================== */}

        <section className="church-admin__section">
          <div className="church-admin__section-heading">
            <div>
              <span className="church-admin__section-kicker">
                CONTENT
              </span>

              <h2>
                Church Media
              </h2>

              <p>
                Manage media published by your
                Church organization.
              </p>
            </div>
          </div>

          <div className="church-admin__grid">
            <AdminCard
              title="Media Library"
              description="Manage Church photos, videos, recordings, documents, and other media."
              icon="🎬"
              href={paths.media}
              accent="primary"
            />
          </div>
        </section>

        {/* ====================================================================
            QUICK NAVIGATION
        ==================================================================== */}

        <section className="church-admin__quick-nav">
          <div className="church-admin__quick-nav-heading">
            <span className="church-admin__section-kicker">
              QUICK NAVIGATION
            </span>

            <h2>
              Administration Shortcuts
            </h2>
          </div>

          <nav
            className="church-admin__quick-nav-links"
            aria-label="Church administration shortcuts"
          >
            <Link to={paths.dashboard}>
              Dashboard
            </Link>

            <Link to={paths.members}>
              Members
            </Link>

            <Link to={paths.departments}>
              Departments
            </Link>

            <Link to={paths.groups}>
              Groups
            </Link>

            <Link to={paths.events}>
              Events
            </Link>

            <Link to={paths.live}>
              Live
            </Link>

            <Link to={paths.media}>
              Media
            </Link>

            <Link to={paths.domains}>
              Domains
            </Link>

            <Link to={paths.settings}>
              Settings
            </Link>
          </nav>
        </section>
      </div>

      {/* ======================================================================
          FOOTER
      ====================================================================== */}

      <footer className="church-admin__footer">
        <div>
          <strong>
            Fockis Church
          </strong>

          <span>
            Organization Administration
          </span>
        </div>

        <Link
          to={`/church/organizations/${organizationId}`}
        >
          Return to Church →
        </Link>
      </footer>
    </main>
  );
}