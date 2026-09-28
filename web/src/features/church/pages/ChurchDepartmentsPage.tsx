/**
 * OrganizationDepartmentsPage.tsx
 * -----------------------------------------------------------------------------
 * Protected department directory for any Fockis organization.
 *
 * Backend remains the security boundary.
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
import DepartmentCard from "../components/DepartmentCard";

import {
  joinDepartment,
  leaveDepartment,
  listDepartments,
} from "../api/departmentsApi";

import {
  DEPARTMENT_TYPE_LABELS,
  DepartmentType,
  type Department,
} from "../types/church.types";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchOrganizationPage.scss";
import "../styles/ChurchDepartmentsPage.scss";

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  return "Unable to load departments.";
}

function isAbortError(
  error: unknown,
): boolean {
  return (
    error instanceof DOMException &&
    error.name === "AbortError"
  );
}

function isForbiddenError(
  error: unknown,
): boolean {
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

function isUnauthorizedError(
  error: unknown,
): boolean {
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

export default function OrganizationDepartmentsPage(): React.JSX.Element {
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

  const { t } =
    useFockisTranslation();

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>([]);

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

  const search =
    searchParams.get("search") ?? "";

  const departmentTypeParam =
    searchParams.get("type");

  const departmentType =
    Object.values(
      DepartmentType,
    ).includes(
      departmentTypeParam as DepartmentType,
    )
      ? (departmentTypeParam as DepartmentType)
      : undefined;

  const loadDepartments =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        if (!organizationId) {
          setDepartments([]);

          setError(
            t(
              "church.departments.errors.noOrganization",
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
            await listDepartments(
              organizationId,
              {
                search:
                  search.trim() ||
                  undefined,

                departmentType,

                page: 1,

                pageSize: 24,

                includeArchived: false,
              },
              signal,
            );

          if (signal?.aborted) {
            return;
          }

          const activeItems =
            result.items.filter(
              (department) =>
                !department.isArchived,
            );

          setDepartments(
            activeItems,
          );
        } catch (err) {
          if (
            isAbortError(err)
          ) {
            return;
          }

          if (
            isUnauthorizedError(
              err,
            )
          ) {
            setDepartments([]);

            setIsUnauthorized(
              true,
            );

            setAccessDenied(
              false,
            );

            setError(
              t(
                "church.departments.errors.signInRequired",
              ),
            );

            return;
          }

          if (
            isForbiddenError(err)
          ) {
            setDepartments([]);

            setAccessDenied(
              true,
            );

            setIsUnauthorized(
              false,
            );

            setError(
              t(
                "church.departments.errors.activeMemberRequired",
              ),
            );

            return;
          }

          setDepartments([]);

          setError(
            getErrorMessage(err),
          );
        } finally {
          if (
            !signal?.aborted
          ) {
            setIsLoading(false);
          }
        }
      },
      [
        organizationId,
        search,
        departmentType,
        t,
      ],
    );

  useEffect(() => {
    const controller =
      new AbortController();

    void loadDepartments(
      controller.signal,
    );

    return () => {
      controller.abort();
    };
  }, [loadDepartments]);

  const updateParam =
    useCallback(
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

  const clearFilters =
    useCallback(() => {
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

  const handleJoin =
    useCallback(
      async (
        departmentId: string,
      ) => {
        if (!organizationId) {
          setError(
            t(
              "church.departments.errors.noOrganization",
            ),
          );

          return;
        }

        setError(null);

        try {
          await joinDepartment(
            organizationId,
            departmentId,
          );

          setDepartments(
            (items) =>
              items.map(
                (item) => {
                  if (
                    item.id !==
                    departmentId
                  ) {
                    return item;
                  }

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
                      item.memberCount +
                      1,
                  };
                },
              ),
          );
        } catch (err) {
          if (
            isUnauthorizedError(
              err,
            )
          ) {
            setIsUnauthorized(
              true,
            );

            setAccessDenied(
              false,
            );

            setError(
              t(
                "church.departments.errors.sessionExpired",
              ),
            );

            return;
          }

          if (
            isForbiddenError(
              err,
            )
          ) {
            setAccessDenied(
              true,
            );

            setIsUnauthorized(
              false,
            );

            setError(
              t(
                "church.departments.errors.activeMemberJoin",
              ),
            );

            return;
          }

          setError(
            getErrorMessage(err),
          );
        }
      },
      [organizationId, t],
    );

  const handleLeave =
    useCallback(
      async (
        departmentId: string,
      ) => {
        if (!organizationId) {
          setError(
            t(
              "church.departments.errors.noOrganization",
            ),
          );

          return;
        }

        setError(null);

        try {
          await leaveDepartment(
            organizationId,
            departmentId,
          );

          setDepartments(
            (items) =>
              items.map(
                (item) =>
                  item.id ===
                  departmentId
                    ? {
                        ...item,

                        isCurrentUserMember:
                          false,

                        memberCount:
                          Math.max(
                            0,
                            item.memberCount -
                              1,
                          ),
                      }
                    : item,
              ),
          );
        } catch (err) {
          if (
            isUnauthorizedError(
              err,
            )
          ) {
            setIsUnauthorized(
              true,
            );

            setAccessDenied(
              false,
            );

            setError(
              t(
                "church.departments.errors.sessionExpired",
              ),
            );

            return;
          }

          if (
            isForbiddenError(
              err,
            )
          ) {
            setAccessDenied(
              true,
            );

            setIsUnauthorized(
              false,
            );

            setError(
              t(
                "church.departments.errors.activeMemberLeave",
              ),
            );

            return;
          }

          setError(
            getErrorMessage(err),
          );
        }
      },
      [organizationId, t],
    );

  const handleCreateDepartment =
    useCallback(() => {
      if (!organizationId) {
        setError(
          t(
            "church.departments.errors.noOrganization",
          ),
        );

        return;
      }

      navigate(
        `/organizations/${encodeURIComponent(
          organizationId,
        )}/admin/departments`,
      );
    }, [
      navigate,
      organizationId,
      t,
    ]);

  const visibleDepartments =
    useMemo(
      () =>
        departments.filter(
          (department) =>
            !department.isArchived,
        ),
      [departments],
    );

  const hasFilters =
    search.trim().length > 0 ||
    Boolean(departmentType);

  return (
    <div className="church-page church-departments-page organization-departments-page">
      <ChurchHeader />

      <div className="church-container church-org-layout">
        <ChurchSidebar
          organizationId={
            organizationId
          }
        />

        <main className="church-org-content church-departments-content">
          <section className="church-departments-hero organization-departments-hero">
            <div className="church-departments-hero__icon">
              <span aria-hidden="true">
                ◈
              </span>
            </div>

            <div className="church-departments-hero__content">
              <div className="church-departments-hero__eyebrow">
                {t(
                  "church.departments.eyebrow",
                ).toUpperCase()}
              </div>

              <h1>
                {t(
                  "church.departments.title",
                )}
              </h1>

              <p>
                {t(
                  "church.departments.description",
                )}
              </p>

              <div className="church-departments-hero__stats">
                <div className="church-departments-stat">
                  <strong>
                    {isLoading
                      ? "—"
                      : visibleDepartments.length}
                  </strong>

                  <span>
                    {t(
                      "church.departments.activeDepartments",
                    )}
                  </span>
                </div>

                <div className="church-departments-stat__divider" />

                <div className="church-departments-stat">
                  <strong>
                    {hasFilters
                      ? t(
                          "church.departments.filtered",
                        )
                      : t(
                          "church.departments.all",
                        )}
                  </strong>

                  <span>
                    {t(
                      "church.departments.directoryView",
                    )}
                  </span>
                </div>
              </div>
            </div>

            {!accessDenied &&
              !isUnauthorized &&
              organizationId && (
                <div className="church-departments-hero__action">
                  <button
                    type="button"
                    className="church-button church-button--primary church-departments-create-button"
                    onClick={
                      handleCreateDepartment
                    }
                  >
                    <span aria-hidden="true">
                      +
                    </span>

                    {t(
                      "church.departments.create",
                    )}
                  </button>
                </div>
              )}

            <div className="church-departments-hero__language">
              <LanguageSelector />
            </div>
          </section>

          {!accessDenied &&
            !isUnauthorized && (
              <section className="church-departments-toolbar">
                <div className="church-departments-toolbar__heading">
                  <div>
                    <span className="church-departments-toolbar__label">
                      {t(
                        "church.departments.findDepartment",
                      ).toUpperCase()}
                    </span>

                    <h2>
                      {t(
                        "church.departments.browse",
                      )}
                    </h2>
                  </div>

                  {hasFilters && (
                    <button
                      type="button"
                      className="church-departments-clear-button"
                      onClick={
                        clearFilters
                      }
                    >
                      {t(
                        "church.departments.clearFilters",
                      )}
                    </button>
                  )}
                </div>

                <div className="church-departments-filters">
                  <label className="church-departments-filter">
                    <span>
                      {t(
                        "church.departments.search",
                      )}
                    </span>

                    <div className="church-departments-search">
                      <span
                        className="church-departments-search__icon"
                        aria-hidden="true"
                      >
                        ⌕
                      </span>

                      <input
                        type="search"
                        className="church-input"
                        placeholder={t(
                          "church.departments.searchPlaceholder",
                        )}
                        value={search}
                        onChange={(
                          event,
                        ) =>
                          updateParam(
                            "search",
                            event
                              .target
                              .value ||
                              null,
                          )
                        }
                        aria-label={t(
                          "church.departments.searchAria",
                        )}
                        disabled={
                          isLoading
                        }
                      />
                    </div>
                  </label>

                  <label className="church-departments-filter">
                    <span>
                      {t(
                        "church.departments.departmentType",
                      )}
                    </span>

                    <select
                      className="church-select"
                      value={
                        departmentType ??
                        ""
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
                        "church.departments.filterTypeAria",
                      )}
                      disabled={
                        isLoading
                      }
                    >
                      <option value="">
                        {t(
                          "church.departments.allDepartmentTypes",
                        )}
                      </option>

                      {Object.values(
                        DepartmentType,
                      ).map(
                        (value) => (
                          <option
                            key={value}
                            value={value}
                          >
                            {
                              DEPARTMENT_TYPE_LABELS[
                                value
                              ]
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </section>
            )}

          {error && (
            <div
              className="church-alert church-alert--error church-departments-alert"
              role="alert"
            >
              <div className="church-departments-alert__icon">
                !
              </div>

              <div className="church-departments-alert__content">
                <strong>
                  {isUnauthorized
                    ? t(
                        "church.departments.alert.authenticationRequired",
                      )
                    : accessDenied
                      ? t(
                          "church.departments.alert.accessDenied",
                        )
                      : t(
                          "church.departments.alert.loadError",
                        )}
                </strong>

                <p>{error}</p>

                <div className="church-departments-alert__actions">
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
                        "church.departments.signIn",
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
                        "church.departments.backToOrganization",
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isLoading &&
            !accessDenied &&
            !isUnauthorized &&
            visibleDepartments.length >
              0 && (
              <div className="church-departments-list-heading">
                <div>
                  <span>
                    {t(
                      "church.departments.activeDepartments",
                    ).toUpperCase()}
                  </span>

                  <h2>
                    {hasFilters
                      ? t(
                          "church.departments.matchingDepartments",
                        )
                      : t(
                          "church.departments.organizationDepartments",
                        )}
                  </h2>
                </div>

                <div className="church-departments-count">
                  {
                    visibleDepartments.length
                  }{" "}
                  {visibleDepartments.length ===
                  1
                    ? t(
                        "church.departments.department",
                      )
                    : t(
                        "church.departments.departments",
                      )}
                </div>
              </div>
            )}

          {isLoading ? (
            <div
              className="church-departments-loading"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="church-departments-loading__header">
                <div className="church-skeleton church-skeleton--title" />
                <div className="church-skeleton church-skeleton--text" />
              </div>

              <div className="church-departments-skeleton-grid">
                {Array.from(
                  { length: 6 },
                  (_, index) => (
                    <div
                      className="church-department-skeleton-card"
                      key={index}
                    >
                      <div className="church-skeleton church-skeleton--avatar" />

                      <div className="church-department-skeleton-card__body">
                        <div className="church-skeleton church-skeleton--line" />

                        <div className="church-skeleton church-skeleton--line church-skeleton--short" />

                        <div className="church-skeleton church-skeleton--button" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : accessDenied ||
            isUnauthorized ? (
            <div className="church-empty-state church-departments-empty">
              <div className="church-departments-empty__icon">
                🔒
              </div>

              <h2>
                {t(
                  "church.departments.informationUnavailable",
                )}
              </h2>

              <p>
                {t(
                  "church.departments.informationUnavailableDescription",
                )}
              </p>
            </div>
          ) : visibleDepartments.length ===
            0 ? (
            <div className="church-empty-state church-departments-empty">
              <div className="church-departments-empty__icon">
                ◈
              </div>

              <h2>
                {hasFilters
                  ? t(
                      "church.departments.noDepartmentsFound",
                    )
                  : t(
                      "church.departments.noDepartments",
                    )}
              </h2>

              <p>
                {hasFilters
                  ? t(
                      "church.departments.noDepartmentsFiltered",
                    )
                  : t(
                      "church.departments.noDepartmentsDescription",
                    )}
              </p>

              <div className="church-departments-empty__actions">
                {hasFilters && (
                  <button
                    type="button"
                    className="church-button church-button--secondary"
                    onClick={
                      clearFilters
                    }
                  >
                    {t(
                      "church.departments.clearFilters",
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="church-button church-button--primary"
                  onClick={
                    handleCreateDepartment
                  }
                  disabled={
                    !organizationId
                  }
                >
                  +
                  {" "}
                  {t(
                    "church.departments.createFirst",
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="church-panel-grid church-departments-grid">
              {visibleDepartments.map(
                (department) => (
                  <DepartmentCard
                    key={department.id}
                    organizationId={
                      organizationId
                    }
                    department={
                      department
                    }
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