/**
 * OrganizationGroupsPage.tsx
 * -----------------------------------------------------------------------------
 * Group directory for any Fockis organization.
 *
 * Groups can belong directly to the organization or optionally
 * belong to a department.
 *
 * This page is organization-agnostic and can be used by:
 * - Churches
 * - Businesses
 * - Nonprofits
 * - Schools
 * - Ministries
 * - Clubs
 * - Community organizations
 * - Teams
 * - Other Fockis organizations
 *
 * IMPORTANT:
 * The frontend is NOT the security boundary.
 * The backend GroupsService must enforce authentication and
 * active organization membership where required.
 * -----------------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import ChurchHeader from "../components/ChurchHeader";
import ChurchSidebar from "../components/ChurchSidebar";
import ChurchGroupCard from "../components/ChurchGroupCard";

import {
  joinGroup,
  leaveGroup,
  listGroups,
} from "../api/groupsApi";

import {
  GroupType,
  type ChurchGroup,
} from "../types/church.types";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchOrganizationPage.scss";
import "../styles/ChurchGroupsPage.scss";

/* ============================================================================
   ERROR HELPERS
   ========================================================================== */

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  return "Unable to load groups.";
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function isForbiddenError(error: unknown): boolean {
  const message =
    getErrorMessage(error).toLowerCase();

  return (
    message.includes("403") ||
    message.includes("forbidden") ||
    message.includes("active member") ||
    message.includes("membership") ||
    message.includes("not a member") ||
    message.includes("organization access")
  );
}

function isUnauthorizedError(error: unknown): boolean {
  const message =
    getErrorMessage(error).toLowerCase();

  return (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("authenticated") ||
    message.includes("login required") ||
    message.includes("sign in")
  );
}

/* ============================================================================
   COMPONENT
   ========================================================================== */

export default function OrganizationGroupsPage(): React.JSX.Element {
  const {
    organizationId = "",
  } = useParams<{
    organizationId: string;
  }>();

  const navigate = useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    groups,
    setGroups,
  ] = useState<ChurchGroup[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    accessDenied,
    setAccessDenied,
  ] = useState(false);

  const [
    isUnauthorized,
    setIsUnauthorized,
  ] = useState(false);

  const {
    t,
  } = useFockisTranslation();

  /* ==========================================================================
     FILTER PARAMETERS
     ========================================================================== */

  const search =
    searchParams.get("search") ?? "";

  const groupTypeParam =
    searchParams.get("type");

  const groupType =
    Object.values(GroupType).includes(
      groupTypeParam as GroupType,
    )
      ? (groupTypeParam as GroupType)
      : undefined;

  /* ==========================================================================
     LOAD GROUPS
     ========================================================================== */

  const loadGroups = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId) {
        setGroups([]);

        setError(
          t(
            "church.groups.errors.organization",
          ),
        );

        setAccessDenied(false);
        setIsUnauthorized(false);
        setIsLoading(false);

        return;
      }

      setIsLoading(true);
      setError(null);
      setAccessDenied(false);
      setIsUnauthorized(false);

      try {
        const result =
          await listGroups(
            organizationId,
            {
              search:
                search.trim() ||
                undefined,

              groupType,

              pageSize: 24,
            },
            signal,
          );

        if (signal?.aborted) {
          return;
        }

        setGroups(
          result.items,
        );
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }

        setGroups([]);

        if (isUnauthorizedError(err)) {
          setIsUnauthorized(true);
          setAccessDenied(false);

          setError(
            t(
              "church.groups.errors.signInToView",
            ),
          );

          return;
        }

        if (isForbiddenError(err)) {
          setAccessDenied(true);
          setIsUnauthorized(false);

          setError(
            t(
              "church.groups.errors.activeMemberToView",
            ),
          );

          return;
        }

        setError(
          getErrorMessage(err),
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [
      organizationId,
      search,
      groupType,
      t,
    ],
  );

  /* ==========================================================================
     INITIAL / FILTERED LOAD
     ========================================================================== */

  useEffect(() => {
    const controller =
      new AbortController();

    void loadGroups(
      controller.signal,
    );

    return () =>
      controller.abort();
  }, [loadGroups]);

  /* ==========================================================================
     FILTER PARAMETERS
     ========================================================================== */

  const updateParam = useCallback(
    (
      key: string,
      value: string | null,
    ) => {
      const next =
        new URLSearchParams(
          searchParams,
        );

      if (
        value !== null &&
        value.trim() !== ""
      ) {
        next.set(
          key,
          value,
        );
      } else {
        next.delete(key);
      }

      setSearchParams(next);
    },
    [
      searchParams,
      setSearchParams,
    ],
  );

  /* ==========================================================================
     CLEAR FILTERS
     ========================================================================== */

  const clearFilters = useCallback(() => {
    const next =
      new URLSearchParams(
        searchParams,
      );

    next.delete("search");
    next.delete("type");

    setSearchParams(next);
  }, [
    searchParams,
    setSearchParams,
  ]);

  /* ==========================================================================
     JOIN GROUP
     ========================================================================== */

  const handleJoin = useCallback(
    async (groupId: string) => {
      if (!organizationId) {
        setError(
          t(
            "church.groups.errors.organization",
          ),
        );

        return;
      }

      setError(null);
      setAccessDenied(false);
      setIsUnauthorized(false);

      try {
        await joinGroup(
          organizationId,
          groupId,
        );

        setGroups((items) =>
          items.map((item) => {
            if (
              item.id !== groupId
            ) {
              return item;
            }

            /*
             * Prevent accidental double counting
             * if the join action is triggered twice.
             */
            if (
              item.isCurrentUserMember
            ) {
              return item;
            }

            return {
              ...item,

              isCurrentUserMember:
                true,

              memberCount:
                item.memberCount + 1,
            };
          }),
        );
      } catch (err) {
        if (isUnauthorizedError(err)) {
          setIsUnauthorized(true);
          setAccessDenied(false);

          setError(
            t(
              "church.groups.errors.sessionExpired",
            ),
          );

          return;
        }

        if (isForbiddenError(err)) {
          setAccessDenied(true);
          setIsUnauthorized(false);

          setError(
            t(
              "church.groups.errors.activeMemberToJoin",
            ),
          );

          return;
        }

        setError(
          getErrorMessage(err),
        );
      }
    },
    [
      organizationId,
      t,
    ],
  );

  /* ==========================================================================
     LEAVE GROUP
     ========================================================================== */

  const handleLeave = useCallback(
    async (groupId: string) => {
      if (!organizationId) {
        setError(
          t(
            "church.groups.errors.organization",
          ),
        );

        return;
      }

      setError(null);
      setAccessDenied(false);
      setIsUnauthorized(false);

      try {
        await leaveGroup(
          organizationId,
          groupId,
        );

        setGroups((items) =>
          items.map((item) =>
            item.id === groupId
              ? {
                  ...item,

                  isCurrentUserMember:
                    false,

                  memberCount:
                    Math.max(
                      0,
                      item.memberCount - 1,
                    ),
                }
              : item,
          ),
        );
      } catch (err) {
        if (isUnauthorizedError(err)) {
          setIsUnauthorized(true);
          setAccessDenied(false);

          setError(
            t(
              "church.groups.errors.sessionExpired",
            ),
          );

          return;
        }

        if (isForbiddenError(err)) {
          setAccessDenied(true);
          setIsUnauthorized(false);

          setError(
            t(
              "church.groups.errors.activeMemberToLeave",
            ),
          );

          return;
        }

        setError(
          getErrorMessage(err),
        );
      }
    },
    [
      organizationId,
      t,
    ],
  );

  /* ==========================================================================
     ADMIN MANAGEMENT
     ========================================================================== */

  const handleCreateGroup =
    useCallback(() => {
      if (!organizationId) {
        setError(
          t(
            "church.groups.errors.organization",
          ),
        );

        return;
      }

      /*
       * Generic organization administration route.
       *
       * App.tsx should expose:
       *
       * /organizations/:organizationId/admin/groups
       */
      navigate(
        `/organizations/${encodeURIComponent(
          organizationId,
        )}/admin/groups`,
      );
    }, [
      navigate,
      organizationId,
      t,
    ]);

  /* ==========================================================================
     DERIVED STATE
     ========================================================================== */

  const visibleGroups =
    useMemo(
      () => groups,
      [groups],
    );

  const hasFilters =
    search.trim().length > 0 ||
    Boolean(groupType);

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="church-page church-groups-page organization-groups-page">
      {/* ======================================================================
          SHARED HEADER
      ====================================================================== */}

      <ChurchHeader />

      <div className="church-container church-org-layout">
        {/* ====================================================================
            ORGANIZATION SIDEBAR
        ==================================================================== */}

        <ChurchSidebar
          organizationId={
            organizationId
          }
        />

        {/* ====================================================================
            MAIN CONTENT
        ==================================================================== */}

        <main className="church-org-content church-groups-content">
          {/* ==================================================================
              PAGE HERO
          ================================================================== */}

          <section className="church-groups-hero organization-groups-hero">
            <div className="church-groups-hero__icon">
              <span aria-hidden="true">
                ◉
              </span>
            </div>

            <div className="church-groups-hero__content">
              <div className="church-groups-hero__eyebrow">
                {t(
                  "church.groups.eyebrow",
                )}
              </div>

              <h1>
                {t(
                  "church.groups.title",
                )}
              </h1>

              <p>
                {t(
                  "church.groups.description",
                )}
              </p>

              <div className="church-groups-hero__stats">
                <div className="church-groups-stat">
                  <strong>
                    {isLoading
                      ? "—"
                      : visibleGroups.length}
                  </strong>

                  <span>
                    {t(
                      "church.groups.available",
                    )}
                  </span>
                </div>

                <div className="church-groups-stat__divider" />

                <div className="church-groups-stat">
                  <strong>
                    {hasFilters
                      ? t(
                          "church.groups.filtered",
                        )
                      : t(
                          "church.groups.all",
                        )}
                  </strong>

                  <span>
                    {t(
                      "church.groups.directoryView",
                    )}
                  </span>
                </div>
              </div>
            </div>

            {!accessDenied &&
              !isUnauthorized &&
              organizationId && (
                <div className="church-groups-hero__action">
                  <button
                    type="button"
                    className="church-button church-button--primary church-groups-create-button"
                    onClick={
                      handleCreateGroup
                    }
                  >
                    <span
                      aria-hidden="true"
                    >
                      +
                    </span>

                    {t(
                      "church.groups.create",
                    )}
                  </button>
                </div>
              )}
          </section>

          {/* ==================================================================
              LANGUAGE SELECTOR
          ================================================================== */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "16px",
            }}
          >
            <LanguageSelector />
          </div>

          {/* ==================================================================
              FILTER TOOLBAR
          ================================================================== */}

          {!accessDenied &&
            !isUnauthorized && (
              <section className="church-groups-toolbar">
                <div className="church-groups-toolbar__heading">
                  <div>
                    <span className="church-groups-toolbar__label">
                      {t(
                        "church.groups.findCommunity",
                      )}
                    </span>

                    <h2>
                      {t(
                        "church.groups.browse",
                      )}
                    </h2>
                  </div>

                  {hasFilters && (
                    <button
                      type="button"
                      className="church-groups-clear-button"
                      onClick={
                        clearFilters
                      }
                    >
                      {t(
                        "church.groups.clearFilters",
                      )}
                    </button>
                  )}
                </div>

                <div className="church-groups-filters">
                  {/* ==========================================================
                      SEARCH
                  ========================================================== */}

                  <label className="church-groups-filter">
                    <span>
                      {t(
                        "church.groups.search",
                      )}
                    </span>

                    <div className="church-groups-search">
                      <span
                        className="church-groups-search__icon"
                        aria-hidden="true"
                      >
                        ⌕
                      </span>

                      <input
                        type="search"
                        className="church-input"
                        placeholder={t(
                          "church.groups.searchPlaceholder",
                        )}
                        value={search}
                        onChange={(
                          event,
                        ) =>
                          updateParam(
                            "search",
                            event.target
                              .value ||
                              null,
                          )
                        }
                        aria-label={t(
                          "church.groups.searchAriaLabel",
                        )}
                        disabled={
                          isLoading
                        }
                      />
                    </div>
                  </label>

                  {/* ==========================================================
                      GROUP TYPE
                  ========================================================== */}

                  <label className="church-groups-filter">
                    <span>
                      {t(
                        "church.groups.groupType",
                      )}
                    </span>

                    <select
                      className="church-select"
                      value={
                        groupType ?? ""
                      }
                      onChange={(
                        event,
                      ) =>
                        updateParam(
                          "type",
                          event
                            .target
                            .value ||
                            null,
                        )
                      }
                      aria-label={t(
                        "church.groups.filterByType",
                      )}
                      disabled={
                        isLoading
                      }
                    >
                      <option value="">
                        {t(
                          "church.groups.allGroupTypes",
                        )}
                      </option>

                      {Object.values(
                        GroupType,
                      ).map(
                        (value) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {t(
                              `church.group.types.${value}`,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </section>
            )}

          {/* ==================================================================
              ERROR
          ================================================================== */}

          {error && (
            <div
              className="church-alert church-alert--error church-groups-alert"
              role="alert"
            >
              <div className="church-groups-alert__icon">
                !
              </div>

              <div className="church-groups-alert__content">
                <strong>
                  {isUnauthorized
                    ? t(
                        "church.groups.authenticationRequired",
                      )
                    : accessDenied
                      ? t(
                          "church.groups.accessDenied",
                        )
                      : t(
                          "church.groups.unableToLoad",
                        )}
                </strong>

                <p>
                  {error}
                </p>

                <div className="church-groups-alert__actions">
                  {isUnauthorized && (
                    <button
                      type="button"
                      className="church-button church-button--primary"
                      onClick={() =>
                        navigate(
                          "/login",
                        )
                      }
                    >
                      {t(
                        "church.groups.signIn",
                      )}
                    </button>
                  )}

                  {accessDenied && (
                    <button
                      type="button"
                      className="church-button church-button--secondary"
                      onClick={() =>
                        navigate(
                          `/organizations/${encodeURIComponent(
                            organizationId,
                          )}`,
                        )
                      }
                    >
                      {t(
                        "church.groups.backToOrganization",
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              LIST HEADER
          ================================================================== */}

          {!isLoading &&
            !accessDenied &&
            !isUnauthorized &&
            visibleGroups.length >
              0 && (
              <div className="church-groups-list-heading">
                <div>
                  <span>
                    {t(
                      "church.groups.activeCommunities",
                    )}
                  </span>

                  <h2>
                    {hasFilters
                      ? t(
                          "church.groups.matchingGroups",
                        )
                      : t(
                          "church.groups.organizationGroups",
                        )}
                  </h2>
                </div>

                <div className="church-groups-count">
                  {
                    visibleGroups.length
                  }{" "}
                  {visibleGroups.length ===
                  1
                    ? t(
                        "church.groups.groupCount.one",
                      )
                    : t(
                        "church.groups.groupCount.many",
                      )}
                </div>
              </div>
            )}

          {/* ==================================================================
              LOADING STATE
          ================================================================== */}

          {isLoading ? (
            <div
              className="church-groups-loading"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="church-groups-loading__header">
                <div className="church-skeleton church-skeleton--title" />

                <div className="church-skeleton church-skeleton--text" />
              </div>

              <div className="church-groups-skeleton-grid">
                {Array.from(
                  { length: 6 },
                  (_, index) => (
                    <div
                      className="church-group-skeleton-card"
                      key={index}
                    >
                      <div className="church-skeleton church-skeleton--avatar" />

                      <div className="church-group-skeleton-card__body">
                        <div className="church-skeleton church-skeleton--line" />

                        <div className="church-skeleton church-skeleton--line church-skeleton--short" />

                        <div className="church-skeleton church-skeleton--line church-skeleton--tiny" />

                        <div className="church-skeleton church-skeleton--button" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : accessDenied ||
            isUnauthorized ? (
            /* ================================================================
               ACCESS DENIED
            ================================================================ */

            <div className="church-empty-state church-groups-empty">
              <div className="church-groups-empty__icon">
                🔒
              </div>

              <h2>
                {t(
                  "church.groups.informationUnavailable",
                )}
              </h2>

              <p>
                {t(
                  "church.groups.informationUnavailableDescription",
                )}
              </p>

              <div className="church-groups-empty__actions">
                {isUnauthorized && (
                  <button
                    type="button"
                    className="church-button church-button--primary"
                    onClick={() =>
                      navigate(
                        "/login",
                      )
                    }
                  >
                    {t(
                      "church.groups.signIn",
                    )}
                  </button>
                )}

                {accessDenied && (
                  <button
                    type="button"
                    className="church-button church-button--secondary"
                    onClick={() =>
                      navigate(
                        `/organizations/${encodeURIComponent(
                          organizationId,
                        )}`,
                      )
                    }
                  >
                    {t(
                      "church.groups.backToOrganization",
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : visibleGroups.length ===
            0 ? (
            /* ================================================================
               EMPTY STATE
            ================================================================ */

            <div className="church-empty-state church-groups-empty">
              <div className="church-groups-empty__icon">
                ◉
              </div>

              <h2>
                {hasFilters
                  ? t(
                      "church.groups.noGroupsFound",
                    )
                  : t(
                      "church.groups.noGroupsYet",
                    )}
              </h2>

              <p>
                {hasFilters
                  ? t(
                      "church.groups.tryChangingFilters",
                    )
                  : t(
                      "church.groups.noGroupsDescription",
                    )}
              </p>

              <div className="church-groups-empty__actions">
                {hasFilters && (
                  <button
                    type="button"
                    className="church-button church-button--secondary"
                    onClick={
                      clearFilters
                    }
                  >
                    {t(
                      "church.groups.clearFilters",
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="church-button church-button--primary"
                  onClick={
                    handleCreateGroup
                  }
                  disabled={
                    !organizationId
                  }
                >
                  +{" "}
                  {t(
                    "church.groups.createFirst",
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ================================================================
               GROUP GRID
            ================================================================ */

            <div className="church-panel-grid church-groups-grid">
              {visibleGroups.map(
                (group) => (
                  <ChurchGroupCard
                    key={
                      group.id
                    }
                    organizationId={
                      organizationId
                    }
                    group={group}
                    onJoin={
                      handleJoin
                    }
                    onLeave={
                      handleLeave
                    }
                  />
                ),
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
