import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AcademyApiError,
  CourseModuleInput,
  getCourse,
  getCourseAssignments,
} from "../../lib/academyApi";

interface Assignment {
  id: string;
  title: string;
  dueDate?: string;
  status?: string;
  gradeLabel?: string;
}

interface LmsCoursePageProps {
  courseCode: string;
  progress?: number;
  grade?: string;
  completedModuleOrders?: number[];
}

type Tab =
  | "modules"
  | "assignments"
  | "materials";

const SIDE_LINKS = [
  "Dashboard",
  "My Courses",
  "Calendar",
  "Assignments",
  "Grades",
  "Messages",
  "Discussions",
  "Library",
  "Help",
];

function normalizeAssignment(
  value: unknown,
  index: number,
): Assignment | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const item =
    value as Record<string, unknown>;

  const title =
    typeof item.title === "string"
      ? item.title.trim()
      : "";

  if (!title) {
    return null;
  }

  const rawId =
    item._id ?? item.id;

  const id =
    typeof rawId === "string" &&
    rawId.trim()
      ? rawId
      : `assignment-${index}`;

  return {
    id,
    title,
    dueDate:
      typeof item.dueDate === "string"
        ? item.dueDate
        : undefined,
    status:
      typeof item.status === "string"
        ? item.status.toLowerCase()
        : undefined,
    gradeLabel:
      typeof item.gradeLabel === "string"
        ? item.gradeLabel
        : typeof item.grade === "string"
          ? item.grade
          : undefined,
  };
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function normalizeProgress(
  value?: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, value),
  );
}

export default function LmsCoursePage({
  courseCode,
  progress = 0,
  grade = "—",
  completedModuleOrders = [],
}: LmsCoursePageProps) {
  const [tab, setTab] =
    useState<Tab>("modules");

  const [courseName, setCourseName] =
    useState("");

  const [instructor, setInstructor] =
    useState("");

  const [modules, setModules] =
    useState<CourseModuleInput[]>([]);

  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [courseLoading, setCourseLoading] =
    useState(true);

  const [courseError, setCourseError] =
    useState<string | null>(null);

  const [
    assignmentsLoading,
    setAssignmentsLoading,
  ] = useState(false);

  const [
    assignmentsLoaded,
    setAssignmentsLoaded,
  ] = useState(false);

  const [
    assignmentsError,
    setAssignmentsError,
  ] = useState<string | null>(null);

  const safeProgress =
    normalizeProgress(progress);

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      if (!courseCode?.trim()) {
        setCourseError(
          "Course code is required.",
        );
        setCourseLoading(false);
        return;
      }

      setCourseLoading(true);
      setCourseError(null);

      try {
        const course =
          await getCourse(
            courseCode.trim(),
          );

        if (cancelled) {
          return;
        }

        setCourseName(
          course.name ?? "",
        );

        setInstructor(
          course.instructorUser?.name ??
            course.instructor ??
            "",
        );

        setModules(
          Array.isArray(course.modules)
            ? [...course.modules].sort(
                (a, b) =>
                  a.order - b.order,
              )
            : [],
        );
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        setCourseError(
          err instanceof AcademyApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unable to load course.",
        );
      } finally {
        if (!cancelled) {
          setCourseLoading(false);
        }
      }
    }

    void loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseCode]);

  useEffect(() => {
    if (tab !== "assignments") {
      return;
    }

    if (
      assignmentsLoaded ||
      assignmentsLoading ||
      !courseCode?.trim()
    ) {
      return;
    }

    let cancelled = false;

    async function loadAssignments() {
      setAssignmentsLoading(true);
      setAssignmentsError(null);

      try {
        const result =
          await getCourseAssignments(
            courseCode.trim(),
          );

        if (cancelled) {
          return;
        }

        const normalized = (
          Array.isArray(result)
            ? result
            : []
        )
          .map(normalizeAssignment)
          .filter(
            (
              assignment,
            ): assignment is Assignment =>
              assignment !== null,
          );

        setAssignments(normalized);
        setAssignmentsLoaded(true);
      } catch (err: unknown) {
        if (cancelled) {
          return;
        }

        setAssignmentsError(
          err instanceof AcademyApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unable to load assignments.",
        );
      } finally {
        if (!cancelled) {
          setAssignmentsLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [
    tab,
    courseCode,
    assignmentsLoaded,
    assignmentsLoading,
  ]);

  const completedSet = useMemo(
    () =>
      new Set(
        completedModuleOrders.filter(
          (order) =>
            Number.isInteger(order) &&
            order > 0,
        ),
      ),
    [completedModuleOrders],
  );

  function isModuleComplete(
    module: CourseModuleInput,
  ) {
    return completedSet.has(module.order);
  }

  function getAssignmentStatus(
    assignment: Assignment,
  ) {
    const status =
      assignment.status?.toLowerCase();

    if (
      status === "graded" ||
      status === "complete" ||
      status === "completed"
    ) {
      return "graded";
    }

    if (
      status === "submitted" ||
      status === "turned_in"
    ) {
      return "submitted";
    }

    return "upcoming";
  }

  return (
    <div className="lms-shell">
      <aside className="lms-side">
        {SIDE_LINKS.map((link, index) => (
          <a
            key={link}
            className={
              index === 1
                ? "active"
                : ""
            }
            href="#top"
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            {link}
          </a>
        ))}
      </aside>

      <main className="lms-main" id="top">
        {courseLoading ? (
          <div className="card">
            <p>Loading course…</p>
          </div>
        ) : courseError ? (
          <div className="card">
            <div className="admin-login-error">
              {courseError}
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <div>
                <span className="badge badge-navy mono">
                  {courseCode}
                </span>

                <h2
                  style={{
                    marginTop: 10,
                  }}
                >
                  {courseName ||
                    "Course"}
                </h2>

                {instructor && (
                  <p
                    style={{
                      marginTop: 6,
                    }}
                  >
                    Instructor:{" "}
                    {instructor}
                  </p>
                )}
              </div>

              <div
                style={{
                  textAlign: "right",
                }}
              >
                <span className="badge badge-gold">
                  Grade:{" "}
                  {grade || "—"}
                </span>

                <div
                  className="progress-track"
                  style={{
                    width: 140,
                    marginTop: 10,
                  }}
                  aria-label={`Course progress: ${safeProgress}%`}
                >
                  <div
                    className="progress-fill"
                    style={{
                      width: `${safeProgress}%`,
                    }}
                  />
                </div>

                <small
                  style={{
                    color:
                      "var(--ink-soft)",
                  }}
                >
                  {safeProgress}% complete
                </small>
              </div>
            </div>

            <div className="tabs">
              <button
                type="button"
                className={`tab-btn${
                  tab === "modules"
                    ? " active"
                    : ""
                }`}
                onClick={() =>
                  setTab("modules")
                }
              >
                Modules
              </button>

              <button
                type="button"
                className={`tab-btn${
                  tab === "assignments"
                    ? " active"
                    : ""
                }`}
                onClick={() =>
                  setTab("assignments")
                }
              >
                Assignments
              </button>

              <button
                type="button"
                className={`tab-btn${
                  tab === "materials"
                    ? " active"
                    : ""
                }`}
                onClick={() =>
                  setTab("materials")
                }
              >
                Materials
              </button>
            </div>

            {tab === "modules" && (
              <div>
                {modules.length === 0 ? (
                  <div className="card">
                    <p>
                      No modules have been
                      published for this
                      course yet.
                    </p>
                  </div>
                ) : (
                  modules.map((module) => {
                    const complete =
                      isModuleComplete(
                        module,
                      );

                    return (
                      <div
                        className="module-row"
                        key={`${courseCode}-${module.order}`}
                      >
                        <div
                          className={`module-check${
                            complete
                              ? " done"
                              : ""
                          }`}
                          aria-label={
                            complete
                              ? "Completed"
                              : "Not completed"
                          }
                        >
                          {complete
                            ? "✓"
                            : ""}
                        </div>

                        <div
                          style={{
                            flex: 1,
                          }}
                        >
                          <strong>
                            Module{" "}
                            {module.order}:{" "}
                            {module.title}
                          </strong>
                        </div>

                        {complete ? (
                          <span className="badge badge-success">
                            Complete
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              background:
                                "var(--paper-dim)",
                              color:
                                "var(--ink-soft)",
                            }}
                          >
                            Not Started
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === "assignments" && (
              <div>
                {assignmentsLoading && (
                  <div className="card">
                    <p>
                      Loading
                      assignments…
                    </p>
                  </div>
                )}

                {!assignmentsLoading &&
                  assignmentsError && (
                    <div className="card">
                      <div className="admin-login-error">
                        {assignmentsError}
                      </div>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{
                          marginTop: 12,
                        }}
                        onClick={() => {
                          setAssignmentsLoaded(
                            false,
                          );
                          setAssignmentsError(
                            null,
                          );
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                {!assignmentsLoading &&
                  !assignmentsError &&
                  assignmentsLoaded &&
                  assignments.length ===
                    0 && (
                    <div className="card">
                      <p>
                        No assignments
                        posted yet.
                      </p>
                    </div>
                  )}

                {!assignmentsLoading &&
                  !assignmentsError &&
                  assignments.length >
                    0 && (
                    <div
                      style={{
                        overflowX:
                          "auto",
                      }}
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>
                              Assignment
                            </th>
                            <th>
                              Due
                            </th>
                            <th>
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {assignments.map(
                            (
                              assignment,
                            ) => {
                              const status =
                                getAssignmentStatus(
                                  assignment,
                                );

                              return (
                                <tr
                                  key={
                                    assignment.id
                                  }
                                >
                                  <td>
                                    {
                                      assignment.title
                                    }
                                  </td>

                                  <td className="mono">
                                    {formatDate(
                                      assignment.dueDate,
                                    )}
                                  </td>

                                  <td>
                                    {status ===
                                    "graded" ? (
                                      <span className="badge badge-success">
                                        Graded
                                        {assignment.gradeLabel
                                          ? ` — ${assignment.gradeLabel}`
                                          : ""}
                                      </span>
                                    ) : status ===
                                      "submitted" ? (
                                      <span className="badge badge-navy">
                                        Submitted
                                      </span>
                                    ) : (
                                      <span className="badge badge-gold">
                                        Upcoming
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}

            {tab === "materials" && (
              <div className="card">
                <h3
                  style={{
                    marginBottom: 8,
                  }}
                >
                  Course Materials
                </h3>

                <p>
                  No course materials have
                  been published yet.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}