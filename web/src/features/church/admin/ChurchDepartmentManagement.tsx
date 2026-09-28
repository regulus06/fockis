/**
 * ChurchDepartmentManagement.tsx
 * -----------------------------------------------------------------------------
 * Fockis Organization — Department Management
 *
 * Generic organization administration screen.
 *
 * Supports every organization type:
 * - Church
 * - Business
 * - Nonprofit
 * - School
 * - Ministry
 * - Community
 * - Club
 * - Other
 *
 * Features:
 * - Create departments
 * - Edit active departments
 * - Archive departments using soft-delete semantics
 * - Restore archived departments
 * - Department type filtering
 * - Search
 * - Member counts
 * - Duplicate-name handling through the backend
 * - Loading and saving states
 * - Preserves archived department history
 *
 * IMPORTANT:
 * The component name remains ChurchDepartmentManagement for backwards
 * compatibility with the existing application imports/routes.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import {
  createDepartment,
  listDepartments,
  restoreDepartment,
  updateDepartment,
  archiveDepartment,
} from "../api/departmentsApi";

import {
  DEPARTMENT_TYPE_LABELS,
  DepartmentType,
  type CreateDepartmentInput,
  type Department,
} from "../types/church.types";

import "../styles/OrganizationDepartmentManagement.scss";

/* ============================================================================
   TYPES
   ========================================================================== */

type DepartmentView = "active" | "archived";

/* ============================================================================
   CONSTANTS
   ========================================================================== */

const EMPTY_DRAFT: CreateDepartmentInput = {
  organizationId: "",
  name: "",
  departmentType: DepartmentType.Custom,
  description: "",
};

/* ============================================================================
   COMPONENT
   ========================================================================== */

export default function ChurchDepartmentManagement(): React.JSX.Element {
  const { organizationId = "" } =
    useParams<{
      organizationId: string;
    }>();

  /* ==========================================================================
     STATE
     ======================================================================== */

  const [departments, setDepartments] =
    useState<Department[]>([]);

  const [draft, setDraft] =
    useState<CreateDepartmentInput>({
      ...EMPTY_DRAFT,
      organizationId,
    });

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [view, setView] =
    useState<DepartmentView>("active");

  const [search, setSearch] =
    useState("");

  const [departmentTypeFilter, setDepartmentTypeFilter] =
    useState<DepartmentType | "all">("all");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================================
     LOAD DEPARTMENTS
     ======================================================================== */

  const loadDepartments = useCallback(
    async (signal?: AbortSignal) => {
      if (!organizationId) {
        setDepartments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result =
          await listDepartments(
            organizationId,
            {
              page: 1,
              pageSize: 100,
              includeArchived: true,
            },
            signal,
          );

        setDepartments(
          Array.isArray(result.items)
            ? result.items
            : [],
        );
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load organization departments.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [organizationId],
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

  /* ==========================================================================
     KEEP DRAFT ORGANIZATION ID IN SYNC
     ======================================================================== */

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      organizationId,
    }));
  }, [organizationId]);

  /* ==========================================================================
     RESET FORM
     ======================================================================== */

  const resetDraft = useCallback(() => {
    setDraft({
      ...EMPTY_DRAFT,
      organizationId,
    });

    setEditingId(null);
    setError(null);
  }, [organizationId]);

  /* ==========================================================================
     DERIVED LISTS
     ======================================================================== */

  const activeDepartments = useMemo(
    () =>
      departments.filter(
        (department) =>
          !department.isArchived,
      ),
    [departments],
  );

  const archivedDepartments = useMemo(
    () =>
      departments.filter(
        (department) =>
          department.isArchived,
      ),
    [departments],
  );

  const visibleDepartments = useMemo(() => {
    const source =
      view === "archived"
        ? archivedDepartments
        : activeDepartments;

    const normalizedSearch =
      search.trim().toLowerCase();

    return source.filter(
      (department) => {
        const name =
          department.name ?? "";

        const description =
          department.description ?? "";

        const matchesSearch =
          !normalizedSearch ||
          name
            .toLowerCase()
            .includes(normalizedSearch) ||
          description
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesType =
          departmentTypeFilter === "all" ||
          department.departmentType ===
            departmentTypeFilter;

        return (
          matchesSearch &&
          matchesType
        );
      },
    );
  }, [
    activeDepartments,
    archivedDepartments,
    departmentTypeFilter,
    search,
    view,
  ]);

  /* ==========================================================================
     STATISTICS
     ======================================================================== */

  const totalDepartments =
    departments.length;

  const activeCount =
    activeDepartments.length;

  const archivedCount =
    archivedDepartments.length;

  /* ==========================================================================
     EDIT
     ======================================================================== */

  const handleEdit = useCallback(
    (department: Department) => {
      if (department.isArchived) {
        setError(
          "Archived departments must be restored before they can be edited.",
        );
        return;
      }

      setEditingId(
        department.id,
      );

      setDraft({
        organizationId,
        name: department.name,
        departmentType:
          department.departmentType,
        description:
          department.description ?? "",
        branchId:
          department.branchId ?? undefined,
        photoUrl:
          department.photoUrl ?? undefined,
        leaderIds:
          department.leaderIds ?? undefined,
      });

      setError(null);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    },
    [organizationId],
  );

  /* ==========================================================================
     SUBMIT
     ======================================================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!organizationId) {
      setError(
        "Organization ID is missing.",
      );
      return;
    }

    const name =
      draft.name
        .trim()
        .replace(/\s+/g, " ");

    if (!name) {
      setError(
        "Department name is required.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated =
          await updateDepartment(
            organizationId,
            editingId,
            {
              name,
              departmentType:
                draft.departmentType,
              description:
                draft.description ?? "",
              branchId:
                draft.branchId,
              photoUrl:
                draft.photoUrl,
              leaderIds:
                draft.leaderIds,
            },
          );

        setDepartments(
          (items) =>
            items.map(
              (item) =>
                item.id === editingId
                  ? updated
                  : item,
            ),
        );
      } else {
        const created =
          await createDepartment({
            ...draft,
            organizationId,
            name,
          });

        setDepartments(
          (items) => [
            created,
            ...items,
          ],
        );

        setView("active");
      }

      resetDraft();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this department.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ==========================================================================
     ARCHIVE
     ======================================================================== */

  const handleArchive = async (
    department: Department,
  ) => {
    if (department.isArchived) {
      setError(
        "This department is already archived.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Archive "${department.name}"?\n\n` +
          "The department will be removed from active organization lists, " +
          "but its ID, creator, members, leaders, and historical data will be preserved.\n\n" +
          "You can restore it later.",
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      department.id,
    );

    setError(null);

    try {
      await archiveDepartment(
        organizationId,
        department.id,
      );

      setDepartments(
        (items) =>
          items.map(
            (item) =>
              item.id === department.id
                ? {
                    ...item,
                    isArchived: true,
                    archivedAt:
                      new Date().toISOString(),
                  }
                : item,
          ),
      );

      if (
        editingId ===
        department.id
      ) {
        resetDraft();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to archive this department.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* ==========================================================================
     RESTORE
     ======================================================================== */

  const handleRestore = async (
    department: Department,
  ) => {
    if (!department.isArchived) {
      setError(
        "This department is already active.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Restore "${department.name}"?\n\n` +
          "The department will become active again using its existing ID, " +
          "members, leaders, creator, and historical dates.",
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      department.id,
    );

    setError(null);

    try {
      const restored =
        await restoreDepartment(
          organizationId,
          department.id,
        );

      setDepartments(
        (items) =>
          items.map(
            (item) =>
              item.id === department.id
                ? restored
                : item,
          ),
      );

      setView("active");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to restore this department.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* ==========================================================================
     VIEW CHANGE
     ======================================================================== */

  const handleViewChange = (
    nextView: DepartmentView,
  ) => {
    setView(nextView);
    setSearch("");
    setDepartmentTypeFilter(
      "all",
    );
    setError(null);
  };

  /* ==========================================================================
     CLEAR FILTERS
     ======================================================================== */

  const clearFilters = () => {
    setSearch("");
    setDepartmentTypeFilter(
      "all",
    );
  };

  const hasFilters =
    search.trim().length > 0 ||
    departmentTypeFilter !== "all";

  /* ==========================================================================
     RENDER
     ======================================================================== */

  return (
    <div className="church-admin-page organization-department-management">
      {/* ======================================================================
          PAGE HEADER
          ==================================================================== */}

      <header className="church-admin-header organization-department-management__header">
        <div>
          <span className="church-admin-eyebrow">
            Organization admin
          </span>

          <h1>
            Department management
          </h1>

          <p className="church-admin-muted">
            Create, organize, manage,
            archive, and restore
            departments for this
            organization.
          </p>
        </div>

        <div className="organization-department-management__header-stats">
          <div className="organization-department-management__header-stat">
            <strong>
              {totalDepartments}
            </strong>

            <span>
              Total
            </span>
          </div>

          <div className="organization-department-management__header-stat">
            <strong>
              {activeCount}
            </strong>

            <span>
              Active
            </span>
          </div>

          <div className="organization-department-management__header-stat">
            <strong>
              {archivedCount}
            </strong>

            <span>
              Archived
            </span>
          </div>
        </div>
      </header>

      {/* ======================================================================
          ERROR
          ==================================================================== */}

      {error && (
        <div
          className="church-admin-alert church-admin-alert--error"
          role="alert"
        >
          <span
            className="organization-department-management__alert-icon"
            aria-hidden="true"
          >
            !
          </span>

          <div>
            <strong>
              Unable to complete request
            </strong>

            <p>
              {error}
            </p>
          </div>

          <button
            type="button"
            className="organization-department-management__alert-close"
            onClick={() =>
              setError(null)
            }
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================================================
          CREATE / EDIT
          ==================================================================== */}

      <section className="church-admin-panel organization-department-management__panel">
        <div className="organization-department-management__panel-heading">
          <div>
            <span className="organization-department-management__section-kicker">
              Department workspace
            </span>

            <h2>
              {editingId
                ? "Edit department"
                : "Create department"}
            </h2>

            <p className="church-admin-muted">
              {editingId
                ? "Update the department while preserving its original creator and organizational history."
                : "Create a department or team that belongs to this organization."}
            </p>
          </div>

          {editingId && (
            <span className="organization-department-management__editing-badge">
              Editing
            </span>
          )}
        </div>

        <form
          className="church-admin-form organization-department-management__form"
          onSubmit={
            handleSubmit
          }
        >
          <div className="organization-department-management__form-grid">
            <label className="church-admin-field">
              <span>
                Department name
              </span>

              <input
                className="church-admin-input"
                type="text"
                value={
                  draft.name
                }
                onChange={(
                  event,
                ) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      name:
                        event.target
                          .value,
                    }),
                  )
                }
                placeholder="e.g. Operations, Youth Team, Human Resources"
                maxLength={100}
                required
                disabled={
                  isSaving
                }
              />

              <small className="church-admin-muted">
                Use a clear name that members will recognize.
              </small>
            </label>

            <label className="church-admin-field">
              <span>
                Department type
              </span>

              <select
                className="church-admin-select"
                value={
                  draft.departmentType
                }
                onChange={(
                  event,
                ) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      departmentType:
                        event.target
                          .value as DepartmentType,
                    }),
                  )
                }
                disabled={
                  isSaving
                }
              >
                {Object.values(
                  DepartmentType,
                ).map(
                  (
                    value,
                  ) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
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

          <label className="church-admin-field">
            <span>
              Description
            </span>

            <textarea
              className="church-admin-textarea"
              rows={4}
              value={
                draft.description ??
                ""
              }
              onChange={(
                event,
              ) =>
                setDraft(
                  (current) => ({
                    ...current,
                    description:
                      event.target
                        .value,
                  }),
                )
              }
              placeholder="Describe the purpose, responsibilities, or role of this department..."
              maxLength={1000}
              disabled={
                isSaving
              }
            />

            <small className="church-admin-muted">
              Optional. Maximum 1,000 characters.
            </small>
          </label>

          <div className="organization-department-management__form-actions">
            <button
              type="submit"
              className="church-admin-btn church-admin-btn--primary"
              disabled={
                isSaving ||
                !organizationId
              }
            >
              {isSaving
                ? editingId
                  ? "Saving changes…"
                  : "Creating department…"
                : editingId
                  ? "Save changes"
                  : "Create department"}
            </button>

            {editingId && (
              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                onClick={
                  resetDraft
                }
                disabled={
                  isSaving
                }
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* ======================================================================
          DEPARTMENT LIBRARY
          ==================================================================== */}

      <section className="church-admin-panel organization-department-management__panel">
        <div className="organization-department-management__panel-heading">
          <div>
            <span className="organization-department-management__section-kicker">
              Organization structure
            </span>

            <h2>
              Departments
            </h2>

            <p className="church-admin-muted">
              Active departments are available to the organization. Archived departments remain preserved for historical records.
            </p>
          </div>
        </div>

        {/* ====================================================================
            STATUS TABS
            ================================================================== */}

        <div
          className="organization-department-management__tabs"
          role="tablist"
          aria-label="Department status"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              view === "active"
            }
            className={
              view === "active"
                ? "church-admin-btn church-admin-btn--primary"
                : "church-admin-btn church-admin-btn--ghost"
            }
            onClick={() =>
              handleViewChange(
                "active",
              )
            }
          >
            Active
            <span>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              view === "archived"
            }
            className={
              view === "archived"
                ? "church-admin-btn church-admin-btn--primary"
                : "church-admin-btn church-admin-btn--ghost"
            }
            onClick={() =>
              handleViewChange(
                "archived",
              )
            }
          >
            Archived
            <span>
              {archivedCount}
            </span>
          </button>
        </div>

        {/* ====================================================================
            SEARCH / FILTER
            ================================================================== */}

        <div className="organization-department-management__filters">
          <label className="church-admin-field organization-department-management__search">
            <span>
              Search departments
            </span>

            <input
              className="church-admin-input"
              type="search"
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search by department name or description..."
            />
          </label>

          <label className="church-admin-field organization-department-management__type-filter">
            <span>
              Department type
            </span>

            <select
              className="church-admin-select"
              value={
                departmentTypeFilter
              }
              onChange={(
                event,
              ) =>
                setDepartmentTypeFilter(
                  event.target
                    .value as
                    | DepartmentType
                    | "all",
                )
              }
            >
              <option value="all">
                All types
              </option>

              {Object.values(
                DepartmentType,
              ).map(
                (
                  value,
                ) => (
                  <option
                    key={
                      value
                    }
                    value={
                      value
                    }
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

          {hasFilters && (
            <button
              type="button"
              className="church-admin-btn church-admin-btn--ghost organization-department-management__clear"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ====================================================================
            RESULT SUMMARY
            ================================================================== */}

        {!isLoading && (
          <div className="organization-department-management__result-summary">
            <strong>
              {visibleDepartments.length}
            </strong>

            <span>
              {visibleDepartments.length ===
              1
                ? "department"
                : "departments"}{" "}
              shown
            </span>

            {search.trim() && (
              <>
                <span>
                  for
                </span>

                <strong>
                  “{search.trim()}”
                </strong>
              </>
            )}
          </div>
        )}

        {/* ====================================================================
            LOADING
            ================================================================== */}

        {isLoading ? (
          <div
            className="organization-department-management__loading"
            role="status"
            aria-live="polite"
          >
            <div
              className="organization-department-management__spinner"
              aria-hidden="true"
            />

            <strong>
              Loading departments…
            </strong>

            <span>
              Retrieving the organization structure.
            </span>
          </div>
        ) : visibleDepartments.length ===
          0 ? (
          /* ==================================================================
             EMPTY
             ================================================================== */

          <div className="organization-department-management__empty">
            <div
              className="organization-department-management__empty-icon"
              aria-hidden="true"
            >
              {view ===
              "archived"
                ? "✓"
                : "＋"}
            </div>

            <h3>
              {view ===
              "archived"
                ? "No archived departments"
                : hasFilters
                  ? "No departments match your filters"
                  : "No active departments yet"}
            </h3>

            <p>
              {view ===
              "archived"
                ? "Archived departments will appear here while their historical records remain preserved."
                : hasFilters
                  ? "Try changing your search or department type filter."
                  : "Create the first department for this organization using the form above."}
            </p>

            {hasFilters && (
              <button
                type="button"
                className="church-admin-btn church-admin-btn--ghost"
                onClick={
                  clearFilters
                }
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          /* ==================================================================
             TABLE
             ================================================================== */

          <div className="church-admin-table-wrap organization-department-management__table-wrap">
            <table className="church-admin-table organization-department-management__table">
              <thead>
                <tr>
                  <th scope="col">
                    Department
                  </th>

                  <th scope="col">
                    Type
                  </th>

                  <th scope="col">
                    Members
                  </th>

                  <th scope="col">
                    Status
                  </th>

                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleDepartments.map(
                  (
                    department,
                  ) => {
                    const isProcessing =
                      processingId ===
                      department.id;

                    const typeLabel =
                      DEPARTMENT_TYPE_LABELS[
                        department
                          .departmentType
                      ] ??
                      department.departmentType;

                    return (
                      <tr
                        key={
                          department.id
                        }
                      >
                        {/* ====================================================
                            DEPARTMENT
                            ================================================== */}

                        <td>
                          <div className="organization-department-management__department-cell">
                            <strong>
                              {
                                department.name
                              }
                            </strong>

                            {department.description && (
                              <p className="church-admin-muted organization-department-management__description">
                                {
                                  department.description
                                }
                              </p>
                            )}

                            {department.createdByUserId && (
                              <small className="church-admin-muted">
                                Created by{" "}
                                {department
                                  .createdBy
                                  ?.displayName ||
                                  department
                                    .createdBy
                                    ?.email ||
                                  "organization member"}
                              </small>
                            )}

                            {department.isArchived &&
                              department.archivedAt && (
                                <small className="church-admin-muted">
                                  Archived{" "}
                                  {new Date(
                                    department.archivedAt,
                                  ).toLocaleDateString()}
                                </small>
                              )}
                          </div>
                        </td>

                        {/* ====================================================
                            TYPE
                            ================================================== */}

                        <td>
                          <span className="organization-department-management__type-badge">
                            {
                              typeLabel
                            }
                          </span>
                        </td>

                        {/* ====================================================
                            MEMBER COUNT
                            ================================================== */}

                        <td>
                          <span className="organization-department-management__member-count">
                            {department.memberCount ??
                              0}
                          </span>
                        </td>

                        {/* ====================================================
                            STATUS
                            ================================================== */}

                        <td>
                          <span
                            className={
                              department.isArchived
                                ? "organization-department-management__status organization-department-management__status--archived"
                                : "organization-department-management__status organization-department-management__status--active"
                            }
                          >
                            <span
                              aria-hidden="true"
                            />

                            {department.isArchived
                              ? "Archived"
                              : "Active"}
                          </span>
                        </td>

                        {/* ====================================================
                            ACTIONS
                            ================================================== */}

                        <td>
                          <div className="church-admin-table__actions organization-department-management__actions">
                            {!department.isArchived && (
                              <>
                                <button
                                  type="button"
                                  className="church-admin-btn church-admin-btn--secondary church-admin-btn--sm"
                                  onClick={() =>
                                    handleEdit(
                                      department,
                                    )
                                  }
                                  disabled={
                                    isProcessing ||
                                    isSaving
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="church-admin-btn church-admin-btn--ghost church-admin-btn--sm"
                                  onClick={() =>
                                    void handleArchive(
                                      department,
                                    )
                                  }
                                  disabled={
                                    isProcessing ||
                                    isSaving
                                  }
                                >
                                  {isProcessing
                                    ? "Archiving…"
                                    : "Archive"}
                                </button>
                              </>
                            )}

                            {department.isArchived && (
                              <button
                                type="button"
                                className="church-admin-btn church-admin-btn--primary church-admin-btn--sm"
                                onClick={() =>
                                  void handleRestore(
                                    department,
                                  )
                                }
                                disabled={
                                  isProcessing ||
                                  isSaving
                                }
                              >
                                {isProcessing
                                  ? "Restoring…"
                                  : "Restore"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}