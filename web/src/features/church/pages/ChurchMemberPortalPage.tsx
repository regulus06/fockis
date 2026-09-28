/**
 * OrganizationMemberPortalPage.tsx
 * -----------------------------------------------------------------------------
 * Fockis — Organization Member Portal
 *
 * Generic member-facing portal for any Fockis organization.
 *
 * Supported organization examples:
 * - Church
 * - Business
 * - Nonprofit
 * - School
 * - Ministry
 * - Club
 * - Community
 * - Team
 * - Other organization types
 *
 * Route:
 *   /organization/member-portal
 *
 * Optional selected organization:
 *   /organization/member-portal?organizationId=<id>
 *
 * IMPORTANT:
 * ---------------------------------------------------------------------------
 * This page intentionally does NOT assume the member belongs to only one
 * organization.
 *
 * The authenticated user may belong to multiple organizations. The user can
 * switch between organizations using the organization selector.
 *
 * The frontend is NOT the security boundary.
 * The backend must continue enforcing:
 * - authentication
 * - active organization membership
 * - organization permissions
 * - administrator permissions
 * -----------------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";

import {
  listOrganizations,
} from "../api/organizationsApi";

import {
  membersApi,
} from "../api/membersApi";

import type {
  MyMembership,
  OrganizationSummary,
} from "../types/church.types";

import "../styles/ChurchOrganizationPage.scss";
import "../styles/ChurchMemberPortalPage.scss";

/* ============================================================================
 * ROUTES
 * ========================================================================== */

const organizationRoutes = {
  home: "/organizations",

  memberPortal:
    "/organization/member-portal",

  messages:
    "/messages",

  events:
    "/events",

  friends:
    "/friends",

  memberSettings:
    "/organization/member/settings",
};

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  return "Unable to load your organization membership.";
}

function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function encodeId(
  value: string,
): string {
  return encodeURIComponent(value);
}

/* ============================================================================
 * ORGANIZATION ROUTES
 * ========================================================================== */

function getOrganizationBasePath(
  organizationId: string,
): string {
  return `/organizations/${encodeId(
    organizationId,
  )}`;
}

function getOrganizationHomePath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}`;
}

function getOrganizationMemberProfileRoute(
  membership: MyMembership | null,
): string | null {
  if (
    !membership?.organizationId ||
    !membership.id
  ) {
    return null;
  }

  return `${getOrganizationBasePath(
    membership.organizationId,
  )}/members/${encodeId(
    membership.id,
  )}`;
}

function getOrganizationEventsPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/events`;
}

function getOrganizationGroupsPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/groups`;
}

function getOrganizationDepartmentsPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/departments`;
}

function getOrganizationLivePath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/live`;
}

function getOrganizationMediaPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/media`;
}

function getOrganizationAttendancePath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/attendance`;
}

function getOrganizationCommunicationPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/communication`;
}

function getOrganizationVisitPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/visit`;
}

function getOrganizationAdminPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/admin`;
}

function getOrganizationAdminSettingsPath(
  organizationId: string,
): string {
  return `${getOrganizationBasePath(
    organizationId,
  )}/admin/settings`;
}

/* ============================================================================
 * ORGANIZATION LABELS
 * ========================================================================== */

/**
 * The current organization model can evolve independently from this portal.
 *
 * We deliberately do not require a `type` field here.
 * That prevents this page from breaking if OrganizationSummary currently
 * exposes only id/name.
 *
 * Once organization type metadata is available, this helper can be expanded
 * to provide terminology such as:
 *
 * Church:
 *   Ministries / Sermons / Worship
 *
 * Business:
 *   Teams / Departments / Resources
 *
 * School:
 *   Classes / Departments / Courses
 *
 * Club:
 *   Groups / Committees / Events
 */
interface OrganizationTerminology {
  organization: string;
  member: string;
  groups: string;
  departments: string;
  events: string;
  media: string;
  resources: string;
  communication: string;
  live: string;
  attendance: string;
  visit: string;
}

const DEFAULT_TERMINOLOGY: OrganizationTerminology =
  {
    organization: "Organization",
    member: "Member",
    groups: "Groups",
    departments: "Departments & Teams",
    events: "Events",
    media: "Media",
    resources: "Resources",
    communication: "Communication",
    live: "Live",
    attendance: "Attendance",
    visit: "Visit",
  };

/* ============================================================================
 * PORTAL CARD
 * ========================================================================== */

interface PortalCardProps {
  icon: string;
  title: string;
  description: string;
  to: string;
  badge?: string;
  primary?: boolean;
}

function PortalCard({
  icon,
  title,
  description,
  to,
  badge,
  primary = false,
}: PortalCardProps): React.JSX.Element {
  return (
    <Link
      to={to}
      className={`church-portal-card${
        primary
          ? " church-portal-card--primary"
          : ""
      }`}
    >
      <div className="church-portal-card__top">
        <div className="church-portal-card__icon">
          {icon}
        </div>

        {badge && (
          <span className="church-portal-card__badge">
            {badge}
          </span>
        )}
      </div>

      <h3 className="church-portal-card__title">
        {title}
      </h3>

      <p className="church-portal-card__description">
        {description}
      </p>

      <span className="church-portal-card__action">
        Open
        <span aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}

/* ============================================================================
 * QUICK LINK
 * ========================================================================== */

interface QuickLinkProps {
  icon: string;
  label: string;
  to: string;
}

function QuickLink({
  icon,
  label,
  to,
}: QuickLinkProps): React.JSX.Element {
  return (
    <Link
      to={to}
      className="church-portal-quick-link"
    >
      <span
        className="church-portal-quick-link__icon"
        aria-hidden="true"
      >
        {icon}
      </span>

      <span className="church-portal-quick-link__label">
        {label}
      </span>

      <span
        className="church-portal-quick-link__arrow"
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}

/* ============================================================================
 * SKELETON
 * ========================================================================== */

function PortalSkeleton(): React.JSX.Element {
  return (
    <div
      className="church-portal-skeleton"
      aria-hidden="true"
    >
      <div className="church-portal-skeleton__hero" />

      <div className="church-portal-skeleton__row">
        <div />
        <div />
        <div />
      </div>

      <div className="church-portal-skeleton__grid">
        <div />
        <div />
        <div />
        <div />
      </div>
    </div>
  );
}

/* ============================================================================
 * PAGE
 * ========================================================================== */

export default function OrganizationMemberPortalPage(): React.JSX.Element {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    organizations,
    setOrganizations,
  ] = useState<
    OrganizationSummary[]
  >([]);

  const [
    memberships,
    setMemberships,
  ] = useState<
    MyMembership[]
  >([]);

  const [
    membership,
    setMembership,
  ] = useState<
    MyMembership | null
  >(null);

  const [
    loadingMembership,
    setLoadingMembership,
  ] = useState(true);

  const [
    membershipError,
    setMembershipError,
  ] = useState<
    string | null
  >(null);

  /* ==========================================================================
     SELECTED ORGANIZATION
     ======================================================================== */

  const requestedOrganizationId =
    searchParams.get(
      "organizationId",
    ) ?? "";

  /* ==========================================================================
     LOAD USER ORGANIZATIONS
     ======================================================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadOrganizations(): Promise<void> {
      setLoadingMembership(true);
      setMembershipError(null);

      try {
        /*
         * Get organizations associated with the authenticated user.
         *
         * No organization ID is hard-coded.
         */
        const result =
          await listOrganizations(
            {
              mine: true,
              page: 1,
              pageSize: 50,
            },
            controller.signal,
          );

        const mine =
          Array.isArray(
            result.items,
          )
            ? result.items
            : [];

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setOrganizations(mine);

        /*
         * Ask the backend for the user's membership
         * in each organization.
         *
         * We intentionally collect all successful memberships
         * instead of stopping at the first organization.
         */
        const foundMemberships: MyMembership[] =
          [];

        for (const organization of mine) {
          if (
            controller.signal.aborted
          ) {
            return;
          }

          if (!organization?.id) {
            continue;
          }

          try {
            const currentMembership =
              await membersApi.getMyMembership(
                organization.id,
                controller.signal,
              );

            if (
              controller.signal.aborted
            ) {
              return;
            }

            if (
              currentMembership
            ) {
              foundMemberships.push(
                currentMembership,
              );
            }
          } catch (error) {
            if (
              controller.signal.aborted
            ) {
              return;
            }

            /*
             * One organization failing membership lookup
             * must not prevent the remaining organizations
             * from being checked.
             */
            if (
              !isAbortError(error)
            ) {
              console.warn(
                "[OrganizationMemberPortal] Unable to check membership:",
                organization.id,
                error,
              );
            }
          }
        }

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setMemberships(
          foundMemberships,
        );

        /*
         * Determine which organization should be active.
         *
         * Priority:
         *
         * 1. organizationId from URL
         * 2. first valid membership
         * 3. none
         */
        let selectedMembership:
          | MyMembership
          | null = null;

        if (
          requestedOrganizationId
        ) {
          selectedMembership =
            foundMemberships.find(
              (item) =>
                item.organizationId ===
                requestedOrganizationId,
            ) ?? null;
        }

        if (
          !selectedMembership &&
          foundMemberships.length > 0
        ) {
          selectedMembership =
            foundMemberships[0];
        }

        setMembership(
          selectedMembership,
        );

        /*
         * If the URL did not contain an organization
         * and we found a membership, synchronize the
         * selected organization into the URL.
         */
        if (
          !requestedOrganizationId &&
          selectedMembership?.organizationId
        ) {
          const next =
            new URLSearchParams(
              searchParams,
            );

          next.set(
            "organizationId",
            selectedMembership.organizationId,
          );

          setSearchParams(
            next,
            {
              replace: true,
            },
          );
        }

        if (
          foundMemberships.length ===
            0 &&
          mine.length === 0
        ) {
          setMembershipError(
            "You are not currently connected to an organization.",
          );
        } else if (
          foundMemberships.length ===
            0 &&
          mine.length > 0
        ) {
          setMembershipError(
            "We found organizations associated with your account, but could not confirm an active membership.",
          );
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          isAbortError(error)
        ) {
          return;
        }

        console.error(
          "[OrganizationMemberPortal] Failed to load organizations:",
          error,
        );

        setMembershipError(
          getErrorMessage(error),
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoadingMembership(
            false,
          );
        }
      }
    }

    void loadOrganizations();

    return () => {
      controller.abort();
    };

    /*
     * The organization selection comes from the URL.
     * We intentionally reload when it changes so that
     * the selected organization is validated against
     * the backend membership record.
     */
  }, [
    requestedOrganizationId,
    setSearchParams,
  ]);

  /* ==========================================================================
     SELECT ORGANIZATION
     * ======================================================================== */

  const handleOrganizationChange =
    useCallback(
      (
        event: React.ChangeEvent<HTMLSelectElement>,
      ) => {
        const organizationId =
          event.target.value;

        const next =
          new URLSearchParams(
            searchParams,
          );

        if (organizationId) {
          next.set(
            "organizationId",
            organizationId,
          );
        } else {
          next.delete(
            "organizationId",
          );
        }

        setSearchParams(
          next,
          {
            replace: false,
          },
        );
      },
      [
        searchParams,
        setSearchParams,
      ],
    );

  /* ==========================================================================
     DERIVED ORGANIZATION
     ======================================================================== */

  const organizationId =
    membership?.organizationId ??
    requestedOrganizationId ??
    "";

  const currentOrganization =
    useMemo(() => {
      if (!organizationId) {
        return null;
      }

      return (
        organizations.find(
          (organization) =>
            organization?.id ===
            organizationId,
        ) ?? null
      );
    }, [
      organizationId,
      organizations,
    ]);

  /*
   * If the requested organization is not one of the
   * organizations returned for this user, do not display
   * organization-specific member data.
   */
  const membershipBelongsToSelection =
    Boolean(
      membership &&
        organizationId &&
        membership.organizationId ===
          organizationId,
    );

  const activeMembership =
    membershipBelongsToSelection
      ? membership
      : null;

  /* ==========================================================================
     TERMINOLOGY
     ======================================================================== */

  const terminology =
    DEFAULT_TERMINOLOGY;

  /* ==========================================================================
     MEMBER PROFILE
     ======================================================================== */

  const memberProfilePath =
    getOrganizationMemberProfileRoute(
      activeMembership,
    );

  const memberDisplayName =
    activeMembership?.profile
      ?.displayName ||
    "Organization Member";

  const memberRole =
    activeMembership?.profile?.role ||
    activeMembership?.role;

  const formattedMemberRole =
    memberRole
      ? String(memberRole).replace(
          /_/g,
          " ",
        )
      : null;

  /* ==========================================================================
     ORGANIZATION DISPLAY
     ======================================================================== */

  const organizationName =
    currentOrganization?.name ||
    "Your Organization";

  /* ==========================================================================
     ORGANIZATION ROUTES
     ======================================================================== */

  const organizationHomePath =
    organizationId
      ? getOrganizationHomePath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const eventsPath =
    organizationId
      ? getOrganizationEventsPath(
          organizationId,
        )
      : organizationRoutes
          .events;

  const groupsPath =
    organizationId
      ? getOrganizationGroupsPath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const departmentsPath =
    organizationId
      ? getOrganizationDepartmentsPath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const livePath =
    organizationId
      ? getOrganizationLivePath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const mediaPath =
    organizationId
      ? getOrganizationMediaPath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const attendancePath =
    organizationId
      ? getOrganizationAttendancePath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const communicationPath =
    organizationId
      ? getOrganizationCommunicationPath(
          organizationId,
        )
      : organizationRoutes
          .messages;

  const visitPath =
    organizationId
      ? getOrganizationVisitPath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const adminPath =
    organizationId
      ? getOrganizationAdminPath(
          organizationId,
        )
      : organizationRoutes
          .home;

  const settingsPath =
    organizationId
      ? getOrganizationAdminSettingsPath(
          organizationId,
        )
      : organizationRoutes
          .home;

  /* ==========================================================================
     MEMBER ORGANIZATION OPTIONS
     ======================================================================== */

  const membershipOrganizationIds =
    useMemo(
      () =>
        new Set(
          memberships
            .map(
              (item) =>
                item.organizationId,
            )
            .filter(Boolean),
        ),
      [memberships],
    );

  const selectableOrganizations =
    useMemo(
      () =>
        organizations.filter(
          (organization) =>
            Boolean(
              organization?.id,
            ) &&
            membershipOrganizationIds.has(
              organization.id,
            ),
        ),
      [
        organizations,
        membershipOrganizationIds,
      ],
    );

  /* ==========================================================================
     RENDER
     ======================================================================== */

  return (
    <div className="church-page church-member-portal-page organization-member-portal-page">
      <ChurchHeader />

      <main className="church-container">
        {/* ==================================================================
            HERO
        ================================================================== */}

        <section className="church-portal-hero">
          <div className="church-portal-hero__inner">
            <div className="church-portal-hero__content">
              <div className="church-portal-eyebrow">
                <span className="church-portal-eyebrow__dot" />

                Fockis Organizations
              </div>

              <h1 className="church-portal-hero__title">
                My Organization
              </h1>

              <p className="church-portal-hero__description">
                Your personal organization
                portal. Stay connected with
                your organization, discover
                events, participate in groups
                and teams, access resources,
                and manage your membership from
                one place.
              </p>

              <div className="church-portal-hero__status">
                {loadingMembership ? (
                  <span className="church-portal-status church-portal-status--loading">
                    <span className="church-portal-status__spinner" />

                    Loading your
                    organization
                    membership…
                  </span>
                ) : activeMembership ? (
                  <>
                    <span className="church-portal-status church-portal-status--member">
                      <span aria-hidden="true">
                        👤
                      </span>

                      {memberDisplayName}
                    </span>

                    {formattedMemberRole && (
                      <span className="church-portal-status church-portal-status--role">
                        {formattedMemberRole}
                      </span>
                    )}

                    {activeMembership.isOwner && (
                      <span className="church-portal-status church-portal-status--owner">
                        <span aria-hidden="true">
                          👑
                        </span>

                        Owner
                      </span>
                    )}

                    {activeMembership.isAdmin &&
                      !activeMembership.isOwner && (
                        <span className="church-portal-status church-portal-status--admin">
                          Administrator
                        </span>
                      )}
                  </>
                ) : null}
              </div>
            </div>

            <div
              className="church-portal-hero__visual"
              aria-hidden="true"
            >
              <div className="church-portal-hero__cross">
                ◈
              </div>

              <div className="church-portal-hero__ring church-portal-hero__ring--one" />

              <div className="church-portal-hero__ring church-portal-hero__ring--two" />

              <div className="church-portal-hero__spark church-portal-hero__spark--one" />

              <div className="church-portal-hero__spark church-portal-hero__spark--two" />

              <div className="church-portal-hero__spark church-portal-hero__spark--three" />
            </div>
          </div>
        </section>

        {/* ==================================================================
            LOADING
        ================================================================== */}

        {loadingMembership && (
          <PortalSkeleton />
        )}

        {/* ==================================================================
            MEMBERSHIP ERROR
        ================================================================== */}

        {!loadingMembership &&
          membershipError && (
            <section className="church-portal-section church-portal-section--compact">
              <div className="church-portal-alert">
                <div className="church-portal-alert__icon">
                  !
                </div>

                <div className="church-portal-alert__content">
                  <strong>
                    Organization membership
                  </strong>

                  <p>
                    {membershipError}
                  </p>
                </div>

                <Link
                  to={
                    organizationRoutes.home
                  }
                  className="church-portal-alert__button"
                >
                  Find Organizations
                </Link>
              </div>
            </section>
          )}

        {/* ==================================================================
            ORGANIZATION SELECTOR
        ================================================================== */}

        {!loadingMembership &&
          selectableOrganizations.length >
            0 && (
            <section className="church-portal-section church-portal-section--compact">
              <div className="church-portal-current-church organization-portal-selector">
                <div className="church-portal-current-church__identity">
                  <div className="church-portal-current-church__icon">
                    ◈
                  </div>

                  <div>
                    <div className="church-portal-section-eyebrow">
                      Current Organization
                    </div>

                    <h2>
                      {organizationId
                        ? organizationName
                        : "Select an organization"}
                    </h2>

                    <p>
                      Switch between the
                      organizations where you
                      have an active membership.
                    </p>
                  </div>
                </div>

                <div className="organization-portal-selector__control">
                  <label
                    htmlFor="organization-member-portal-selector"
                    className="organization-portal-selector__label"
                  >
                    Select organization
                  </label>

                  <select
                    id="organization-member-portal-selector"
                    className="church-select"
                    value={
                      organizationId
                    }
                    onChange={
                      handleOrganizationChange
                    }
                  >
                    <option value="">
                      Select an organization
                    </option>

                    {selectableOrganizations.map(
                      (
                        organization,
                      ) => (
                        <option
                          key={
                            organization.id
                          }
                          value={
                            organization.id
                          }
                        >
                          {
                            organization.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </section>
          )}

        {/* ==================================================================
            CURRENT ORGANIZATION
        ================================================================== */}

        {!loadingMembership && (
          <section className="church-portal-section church-portal-section--compact">
            <div className="church-portal-current-church">
              <div className="church-portal-current-church__identity">
                <div className="church-portal-current-church__icon">
                  ◈
                </div>

                <div>
                  <div className="church-portal-section-eyebrow">
                    My Organization
                  </div>

                  <h2>
                    {organizationId
                      ? organizationName
                      : "Connect to an organization"}
                  </h2>

                  <p>
                    {organizationId
                      ? "Access your organization community, membership tools, events, groups, media, and resources."
                      : "Choose an organization to access its member portal and community features."}
                  </p>
                </div>
              </div>

              <Link
                to={organizationHomePath}
                className="church-portal-button church-portal-button--primary"
              >
                {organizationId
                  ? "Open Organization"
                  : "Find Organization"}

                <span aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </section>
        )}

        {/* ==================================================================
            MEMBER TOOLS
        ================================================================== */}

        <section className="church-portal-section">
          <div className="church-portal-section-heading">
            <div>
              <div className="church-portal-section-eyebrow">
                My Account
              </div>

              <h2>
                Member Tools
              </h2>

              <p>
                Everything you need to manage
                your organization membership and
                stay connected.
              </p>
            </div>
          </div>

          <div className="church-portal-card-grid">
            {memberProfilePath ? (
              <PortalCard
                icon="👤"
                title="My Organization Profile"
                description="View your organization membership profile, role, contact information, groups, departments, and member information."
                to={
                  memberProfilePath
                }
                primary
              />
            ) : (
              <PortalCard
                icon="👤"
                title="My Organization Profile"
                description="Your member profile will become available after an organization membership is connected."
                to={
                  organizationRoutes.home
                }
              />
            )}

            <PortalCard
              icon="⚙️"
              title="Member Settings"
              description="Manage your membership preferences, notifications, privacy, and organization account settings."
              to={
                organizationRoutes.memberSettings
              }
            />

            <PortalCard
              icon="💬"
              title="Messages"
              description="Stay connected with your organization community and Fockis contacts."
              to={
                organizationRoutes.messages
              }
            />

            <PortalCard
              icon="📅"
              title="My Events"
              description="Discover organization events, meetings, activities, and registrations."
              to={eventsPath}
            />

            <PortalCard
              icon="👥"
              title="My Groups"
              description="Find and participate in groups, communities, teams, committees, and other organization communities."
              to={groupsPath}
            />
          </div>
        </section>

        {/* ==================================================================
            ORGANIZATION LIFE
        ================================================================== */}

        <section className="church-portal-section">
          <div className="church-portal-section-heading">
            <div>
              <div className="church-portal-section-eyebrow">
                Organization Life
              </div>

              <h2>
                Get Involved
              </h2>

              <p>
                Explore your organization's
                groups, departments, events,
                communication, and member
                activities.
              </p>
            </div>
          </div>

          <div className="church-portal-card-grid">
            <PortalCard
              icon="👥"
              title={terminology.groups}
              description="Connect with groups, communities, teams, committees, and shared-interest communities."
              to={groupsPath}
              primary
            />

            <PortalCard
              icon="🏢"
              title={
                terminology.departments
              }
              description="Explore departments, teams, ministries, committees, and organizational units."
              to={departmentsPath}
            />

            <PortalCard
              icon="📅"
              title={
                terminology.events
              }
              description="See upcoming organization events, meetings, conferences, activities, and programs."
              to={eventsPath}
              primary
            />

            <PortalCard
              icon="💬"
              title={
                terminology.communication
              }
              description="Read announcements and stay informed about important organization updates."
              to={
                communicationPath
              }
            />

            <PortalCard
              icon="✅"
              title={
                terminology.attendance
              }
              description="View your organization attendance and participation history."
              to={
                attendancePath
              }
            />

            <PortalCard
              icon="📍"
              title={
                terminology.visit
              }
              description="Plan a visit, meeting, appointment, or participation opportunity with the organization."
              to={visitPath}
            />
          </div>
        </section>

        {/* ==================================================================
            ORGANIZATION MEDIA
        ================================================================== */}

        <section className="church-portal-section">
          <div className="church-portal-section-heading">
            <div>
              <div className="church-portal-section-eyebrow">
                Organization Media
              </div>

              <h2>
                Media, Documents &
                Resources
              </h2>

              <p>
                Discover digital content
                published by your organization,
                including videos, photos,
                documents, announcements, and
                useful resources.
              </p>
            </div>
          </div>

          <div className="church-portal-card-grid">
            <PortalCard
              icon="🎥"
              title="Videos"
              description="Watch organization videos, presentations, recordings, interviews, training, and special programs."
              to={mediaPath}
              badge="Videos"
              primary
            />

            <PortalCard
              icon="📷"
              title="Photos"
              description="Browse photos from organization events, activities, meetings, programs, and community events."
              to={mediaPath}
              badge="Photos"
            />

            <PortalCard
              icon="📄"
              title="Documents"
              description="Access forms, newsletters, schedules, policies, guides, reports, and organization documents."
              to={mediaPath}
              badge="Documents"
            />

            <PortalCard
              icon="📚"
              title="Resources"
              description="Find training materials, educational resources, guides, downloads, and useful organization content."
              to={mediaPath}
              badge="Resources"
            />

            <PortalCard
              icon="🗂️"
              title="Media Library"
              description="Browse all published organization media from one centralized library."
              to={mediaPath}
              primary
            />

            <PortalCard
              icon="🔗"
              title="Organization Resources"
              description="Explore shared resources and information provided by your organization."
              to={mediaPath}
            />
          </div>
        </section>

        {/* ==================================================================
            LIVE
        ================================================================== */}

        <section className="church-portal-section">
          <div className="church-portal-live">
            <div className="church-portal-live__glow" />

            <div className="church-portal-live__content">
              <div className="church-portal-live__eyebrow">
                <span className="church-portal-live__dot" />

                Organization Live
              </div>

              <h2>
                Watch Live
              </h2>

              <p>
                Join live events, meetings,
                broadcasts, presentations,
                conferences, training sessions,
                and other organization
                broadcasts.
              </p>
            </div>

            <Link
              to={livePath}
              className="church-portal-button church-portal-button--gold"
            >
              <span aria-hidden="true">
                🔴
              </span>

              Watch Live

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </section>

        {/* ==================================================================
            QUICK NAVIGATION
        ================================================================== */}

        <section className="church-portal-section">
          <div className="church-portal-section-heading">
            <div>
              <div className="church-portal-section-eyebrow">
                Quick Access
              </div>

              <h2>
                Organization Areas
              </h2>

              <p>
                Jump directly to the
                organization areas you use
                most.
              </p>
            </div>
          </div>

          <div className="church-portal-quick-grid">
            <QuickLink
              icon="◈"
              label="Organization Home"
              to={
                organizationHomePath
              }
            />

            <QuickLink
              icon="🏢"
              label="My Organizations"
              to={
                organizationRoutes.home
              }
            />

            {memberProfilePath && (
              <QuickLink
                icon="👤"
                label="My Profile"
                to={
                  memberProfilePath
                }
              />
            )}

            <QuickLink
              icon="⚙️"
              label="Member Settings"
              to={
                organizationRoutes.memberSettings
              }
            />

            <QuickLink
              icon="👥"
              label="Groups"
              to={groupsPath}
            />

            <QuickLink
              icon="🏢"
              label="Departments & Teams"
              to={
                departmentsPath
              }
            />

            <QuickLink
              icon="📅"
              label="Events"
              to={eventsPath}
            />

            <QuickLink
              icon="🎥"
              label="Videos"
              to={mediaPath}
            />

            <QuickLink
              icon="📷"
              label="Photos"
              to={mediaPath}
            />

            <QuickLink
              icon="📄"
              label="Documents"
              to={mediaPath}
            />

            <QuickLink
              icon="📚"
              label="Resources"
              to={mediaPath}
            />

            <QuickLink
              icon="🔴"
              label="Livestream"
              to={livePath}
            />

            <QuickLink
              icon="💬"
              label="Communication"
              to={
                communicationPath
              }
            />

            <QuickLink
              icon="✅"
              label="Attendance"
              to={
                attendancePath
              }
            />
          </div>
        </section>

        {/* ==================================================================
            ADMINISTRATION
        ================================================================== */}

        <section className="church-portal-section">
          <div className="church-portal-admin">
            <div className="church-portal-admin__header">
              <div className="church-portal-admin__identity">
                <div className="church-portal-admin__icon">
                  👑
                </div>

                <div>
                  <div className="church-portal-section-eyebrow">
                    Administration
                  </div>

                  <h2>
                    Organization
                    Administration
                  </h2>

                  <p>
                    Organization
                    administrators can manage
                    members, departments,
                    groups, events, media,
                    announcements, communication,
                    and organization settings.
                  </p>
                </div>
              </div>

              {activeMembership &&
                (activeMembership.isAdmin ||
                  activeMembership.isOwner) && (
                  <span className="church-portal-admin__access">
                    <span aria-hidden="true">
                      ✓
                    </span>

                    Admin Access
                  </span>
                )}
            </div>

            <div className="church-portal-admin__actions">
              <Link
                to={adminPath}
                className="church-portal-button church-portal-button--primary"
              >
                👑 Organization Admin

                <span aria-hidden="true">
                  →
                </span>
              </Link>

              <Link
                to={settingsPath}
                className="church-portal-button church-portal-button--outline"
              >
                ⚙️ Organization Settings

                <span aria-hidden="true">
                  →
                </span>
              </Link>
            </div>

            <div className="church-portal-admin__notice">
              <strong>
                Administrator access
              </strong>

              <span>
                Organization Admin provides
                management tools for members,
                groups, departments, events,
                media, communication, and
                other organization operations.
                Organization Settings controls
                organization-wide configuration
                and administrative settings.
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================================
            FOOTER ACTION
        ================================================================== */}

        <section className="church-portal-footer-action">
          <Link
            to={
              organizationRoutes.home
            }
            className="church-portal-button church-portal-button--outline"
          >
            <span aria-hidden="true">
              ←
            </span>

            Back to Organizations
          </Link>
        </section>
      </main>
    </div>
  );
}