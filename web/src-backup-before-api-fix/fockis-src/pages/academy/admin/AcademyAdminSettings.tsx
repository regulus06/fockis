import { useEffect, useMemo, useState } from "react";

import {
  getAcademyStats,
  getAcademyApiBaseUrl,
  getAcademyUsers,
  getStudents,
  logout,
} from "../../../lib/academyApi";

import { useAcademyAdminAuth } from "../../../lib/academyAdminAuth";

// ============================================================================
// TYPES
// ============================================================================

type SettingsSection =
  | "account"
  | "security"
  | "students"
  | "administrators"
  | "institution"
  | "platform"
  | "danger";

type BackendStatus = "checking" | "ok" | "down";

// ============================================================================
// HELPERS
// ============================================================================

function SectionIcon({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        width: 30,
        height: 30,
        minWidth: 30,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-soft, #f5f5f5)",
        fontSize: 16,
      }}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: "active" | "disabled" | "connected" | "checking" | "error";
}) {
  const config = {
    active: {
      label: "Active",
      color: "var(--success, #15803d)",
      background: "rgba(21,128,61,.10)",
    },
    disabled: {
      label: "Disabled",
      color: "var(--error, #dc2626)",
      background: "rgba(220,38,38,.10)",
    },
    connected: {
      label: "Connected",
      color: "var(--success, #15803d)",
      background: "rgba(21,128,61,.10)",
    },
    checking: {
      label: "Checking…",
      color: "var(--ink-soft, #777)",
      background: "rgba(100,100,100,.10)",
    },
    error: {
      label: "Unreachable",
      color: "var(--error, #dc2626)",
      background: "rgba(220,38,38,.10)",
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: config.color,
        background: config.background,
      }}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AcademyAdminSettings() {
  const user = useAcademyAdminAuth((s) => s.user);

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("checking");

  const [showPasswordForm, setShowPasswordForm] =
    useState(false);

  const [showCreateStudent, setShowCreateStudent] =
    useState(false);

  const [showCreateAdministrator, setShowCreateAdministrator] =
    useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] =
    useState(false);

  const [admissionsEnabled, setAdmissionsEnabled] =
    useState(true);

  const [lmsEnabled, setLmsEnabled] =
    useState(true);

  const [careersEnabled, setCareersEnabled] =
    useState(true);

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const [studentCount, setStudentCount] =
    useState<number | null>(null);

  const [administratorCount, setAdministratorCount] =
    useState<number | null>(null);

  const [loadingManagementData, setLoadingManagementData] =
    useState(false);

  // ==========================================================================
  // BACKEND HEALTH
  // ==========================================================================

  useEffect(() => {
    getAcademyStats()
      .then(() => setBackendStatus("ok"))
      .catch(() => setBackendStatus("down"));
  }, []);

  // ==========================================================================
  // MANAGEMENT COUNTS
  // ==========================================================================

  useEffect(() => {
    if (
      activeSection !== "students" &&
      activeSection !== "administrators"
    ) {
      return;
    }

    let cancelled = false;

    async function loadCounts() {
      setLoadingManagementData(true);

      try {
        if (activeSection === "students") {
          const students = await getStudents();

          if (!cancelled) {
            setStudentCount(
              Array.isArray(students)
                ? students.length
                : 0,
            );
          }
        }

        if (activeSection === "administrators") {
          const users = await getAcademyUsers();

          if (!cancelled) {
            const administrators = Array.isArray(users)
              ? users.filter(
                  (item) =>
                    item?.role === "administrator",
                )
              : [];

            setAdministratorCount(
              administrators.length,
            );
          }
        }
      } catch (error) {
        console.error(
          "[FOCKIS ACADEMY SETTINGS] Failed to load management data:",
          error,
        );
      } finally {
        if (!cancelled) {
          setLoadingManagementData(false);
        }
      }
    }

    loadCounts();

    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  const sections = useMemo(
    () => [
      {
        id: "account" as SettingsSection,
        icon: "👤",
        label: "Account",
        description: "Your Academy account",
      },
      {
        id: "security" as SettingsSection,
        icon: "🔐",
        label: "Security",
        description: "Password, sessions and security",
      },
      {
        id: "students" as SettingsSection,
        icon: "🎓",
        label: "Student Management",
        description: "Student accounts and IDs",
      },
      {
        id: "administrators" as SettingsSection,
        icon: "👨‍💼",
        label: "Administrator Management",
        description: "Administrators and roles",
      },
      {
        id: "institution" as SettingsSection,
        icon: "🏫",
        label: "Institution",
        description: "Academy information and branding",
      },
      {
        id: "platform" as SettingsSection,
        icon: "⚙️",
        label: "Platform",
        description: "Features and notifications",
      },
      {
        id: "danger" as SettingsSection,
        icon: "⚠️",
        label: "Danger Zone",
        description: "Destructive and maintenance actions",
      },
    ],
    [],
  );

  const currentSection = sections.find(
    (section) => section.id === activeSection,
  );

  // ==========================================================================
  // SIGN OUT
  // ==========================================================================

  function handleSignOut() {
    const confirmed = window.confirm(
      "Are you sure you want to sign out of the Academy administrator account?",
    );

    if (!confirmed) {
      return;
    }

    logout();

    window.location.href =
      "/academy/admin/login";
  }

  // ==========================================================================
  // PASSWORD
  // ==========================================================================

  function handlePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    window.alert(
      "Password change UI is ready. Connect this form to POST /academy/auth/change-password on the NestJS backend.",
    );
  }

  // ==========================================================================
  // CREATE STUDENT
  // ==========================================================================

  function handleCreateStudent(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    window.alert(
      "Student creation UI is ready. Connect it to the Academy student-management endpoint.",
    );

    setShowCreateStudent(false);
  }

  // ==========================================================================
  // CREATE ADMIN
  // ==========================================================================

  function handleCreateAdministrator(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    window.alert(
      "Administrator creation UI is ready. Connect it to the protected Academy administrator endpoint.",
    );

    setShowCreateAdministrator(false);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div>
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}

      <div
        className="admin-page-head"
        style={{
          marginBottom: 22,
        }}
      >
        <div>
          <h1>Settings</h1>

          <p>
            Manage your Academy account, security,
            users, institution and platform settings.
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SETTINGS LAYOUT */}
      {/* ================================================================== */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 280px) minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ================================================================ */}
        {/* LEFT NAVIGATION */}
        {/* ================================================================ */}

        <aside
          className="card"
          style={{
            padding: 10,
            position: "sticky",
            top: 20,
          }}
        >
          {sections.map((section) => {
            const active =
              activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  setActiveSection(section.id)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 10px",
                  marginBottom: 4,
                  border: 0,
                  borderRadius: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  background: active
                    ? "var(--surface-soft, #f5f5f5)"
                    : "transparent",
                  color:
                    active
                      ? "var(--ink, #111)"
                      : "var(--ink-soft, #666)",
                }}
              >
                <SectionIcon>
                  {section.icon}
                </SectionIcon>

                <span
                  style={{
                    minWidth: 0,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: 13,
                      marginBottom: 2,
                    }}
                  >
                    {section.label}
                  </strong>

                  <small
                    style={{
                      display: "block",
                      fontSize: 11,
                      opacity: 0.75,
                    }}
                  >
                    {section.description}
                  </small>
                </span>
              </button>
            );
          })}
        </aside>

        {/* ================================================================ */}
        {/* CONTENT */}
        {/* ================================================================ */}

        <main>
          {/* ============================================================ */}
          {/* SECTION HEADER */}
          {/* ============================================================ */}

          <div
            style={{
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 20,
                margin: 0,
              }}
            >
              {currentSection?.icon}{" "}
              {currentSection?.label}
            </h2>

            <p
              style={{
                marginTop: 5,
                color: "var(--ink-soft)",
                fontSize: 13,
              }}
            >
              {currentSection?.description}
            </p>
          </div>

          {/* ============================================================ */}
          {/* ACCOUNT */}
          {/* ============================================================ */}

          {activeSection === "account" && (
            <>
              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <h3>Account Information</h3>

                <div
                  className="form-grid"
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div className="field">
                    <label>Name</label>

                    <p>
                      {user?.name ?? "—"}
                    </p>
                  </div>

                  <div className="field">
                    <label>Email</label>

                    <p>
                      {user?.email ?? "—"}
                    </p>
                  </div>

                  <div className="field">
                    <label>Role</label>

                    <p>
                      {user?.role ?? "—"}
                    </p>
                  </div>

                  <div className="field">
                    <label>Account ID</label>

                    <p className="mono">
                      {user?.id ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <h3>Account Actions</h3>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setShowPasswordForm(
                        (value) => !value,
                      )
                    }
                  >
                    Change Password
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              {showPasswordForm && (
                <div
                  className="card"
                  style={{
                    padding: 24,
                  }}
                >
                  <h3>Change Password</h3>

                  <form
                    onSubmit={handlePasswordSubmit}
                    style={{
                      marginTop: 16,
                    }}
                  >
                    <div className="form-grid">
                      <div className="field">
                        <label>
                          Current Password
                        </label>

                        <input
                          type="password"
                          required
                          autoComplete="current-password"
                        />
                      </div>

                      <div className="field">
                        <label>
                          New Password
                        </label>

                        <input
                          type="password"
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                      </div>

                      <div className="field">
                        <label>
                          Confirm New Password
                        </label>

                        <input
                          type="password"
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 16,
                      }}
                    >
                      <button
                        type="submit"
                        className="btn btn-primary"
                      >
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {/* ============================================================ */}
          {/* SECURITY */}
          {/* ============================================================ */}

          {activeSection === "security" && (
            <>
              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <h3>Password</h3>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    marginTop: 6,
                  }}
                >
                  Change your Academy administrator
                  password.
                </p>

                <button
                  type="button"
                  className="btn"
                  style={{
                    marginTop: 14,
                  }}
                  onClick={() =>
                    setShowPasswordForm(true)
                  }
                >
                  Change Password
                </button>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <h3>Active Sessions</h3>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    marginTop: 6,
                  }}
                >
                  View and manage devices currently
                  signed into this account.
                </p>

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 10,
                    background:
                      "var(--surface-soft, #f7f7f7)",
                  }}
                >
                  <strong>
                    Current browser session
                  </strong>

                  <p
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      color: "var(--ink-soft)",
                    }}
                  >
                    Session management requires the
                    Academy security-session backend.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn"
                  style={{
                    marginTop: 14,
                  }}
                  onClick={() =>
                    window.alert(
                      "Connect this action to POST /academy/auth/sign-out-all.",
                    )
                  }
                >
                  Sign Out All Sessions
                </button>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <h3>
                  Two-Factor Authentication
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-soft)",
                    marginTop: 6,
                  }}
                >
                  Add another authentication factor
                  to protect administrator accounts.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: 16,
                    marginTop: 18,
                  }}
                >
                  <div>
                    <strong>
                      Two-factor authentication
                    </strong>

                    <p
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color:
                          "var(--ink-soft)",
                      }}
                    >
                      {twoFactorEnabled
                        ? "Enabled"
                        : "Not configured"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      setTwoFactorEnabled(
                        (value) => !value,
                      )
                    }
                  >
                    {twoFactorEnabled
                      ? "Disable"
                      : "Configure"}
                  </button>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                }}
              >
                <h3>Security Activity</h3>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to GET /academy/security/login-history.",
                      )
                    }
                  >
                    View Login History
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to GET /academy/security/events.",
                      )
                    }
                  >
                    View Security Events
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* STUDENTS */}
          {/* ============================================================ */}

          {activeSection === "students" && (
            <>
              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3>Student Management</h3>

                    <p
                      style={{
                        fontSize: 13,
                        color:
                          "var(--ink-soft)",
                        marginTop: 5,
                      }}
                    >
                      Create and manage Academy
                      student accounts.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      setShowCreateStudent(
                        true,
                      )
                    }
                  >
                    + Create Student
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                    marginTop: 20,
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background:
                        "var(--surface-soft, #f7f7f7)",
                    }}
                  >
                    <small>
                      Students
                    </small>

                    <strong
                      style={{
                        display: "block",
                        fontSize: 24,
                        marginTop: 4,
                      }}
                    >
                      {loadingManagementData
                        ? "…"
                        : studentCount ??
                          "—"}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background:
                        "var(--surface-soft, #f7f7f7)",
                    }}
                  >
                    <small>
                      Student ID
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      STU-########
                    </strong>
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                }}
              >
                <h3>Student Actions</h3>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.location.href =
                        "/academy/admin/students"
                    }
                  >
                    Manage Students
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to POST /academy/admin/students/:id/generate-id.",
                      )
                    }
                  >
                    Generate Student ID
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to POST /academy/admin/students/:id/reset-password.",
                      )
                    }
                  >
                    Reset Student Password
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to PATCH /academy/admin/students/:id/disable.",
                      )
                    }
                  >
                    Disable Student
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to DELETE /academy/admin/students/:id with administrator confirmation.",
                      )
                    }
                  >
                    Delete Student Account
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* ADMINISTRATORS */}
          {/* ============================================================ */}

          {activeSection === "administrators" && (
            <>
              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3>
                      Administrator Management
                    </h3>

                    <p
                      style={{
                        fontSize: 13,
                        color:
                          "var(--ink-soft)",
                        marginTop: 5,
                      }}
                    >
                      Manage Academy administrators,
                      roles and administrator
                      accounts.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      setShowCreateAdministrator(
                        true,
                      )
                    }
                  >
                    + Create Administrator
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                    marginTop: 20,
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background:
                        "var(--surface-soft, #f7f7f7)",
                    }}
                  >
                    <small>
                      Administrators
                    </small>

                    <strong
                      style={{
                        display: "block",
                        fontSize: 24,
                        marginTop: 4,
                      }}
                    >
                      {loadingManagementData
                        ? "…"
                        : administratorCount ??
                          "—"}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background:
                        "var(--surface-soft, #f7f7f7)",
                    }}
                  >
                    <small>
                      Administrator ID
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      ADM-########
                    </strong>
                  </div>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                }}
              >
                <h3>Administrator Actions</h3>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.location.href =
                        "/academy/admin/users"
                    }
                  >
                    Manage Administrators
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to PATCH /academy/admin/users/:id/role.",
                      )
                    }
                  >
                    Change Administrator Role
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to POST /academy/admin/users/:id/reset-password.",
                      )
                    }
                  >
                    Reset Admin Password
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to PATCH /academy/admin/users/:id/disable.",
                      )
                    }
                  >
                    Disable Administrator
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Connect to DELETE /academy/admin/users/:id with administrator confirmation.",
                      )
                    }
                  >
                    Delete Administrator
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* INSTITUTION */}
          {/* ============================================================ */}

          {activeSection === "institution" && (
            <>
              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                }}
              >
                <h3>Institution Information</h3>

                <div
                  className="form-grid"
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div className="field">
                    <label>
                      Academy Name
                    </label>

                    <input
                      defaultValue="FAFockis Academy"
                      placeholder="Academy name"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Website
                    </label>

                    <input
                      placeholder="https://..."
                    />
                  </div>

                  <div className="field">
                    <label>
                      Contact Email
                    </label>

                    <input
                      type="email"
                      placeholder="academy@example.com"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Contact Phone
                    </label>

                    <input
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Address
                    </label>

                    <input
                      placeholder="Street address"
                    />
                  </div>

                  <div className="field">
                    <label>
                      City / State
                    </label>

                    <input
                      placeholder="City, State"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    marginTop: 18,
                  }}
                  onClick={() =>
                    window.alert(
                      "Connect this form to GET/PATCH /academy/settings.",
                    )
                  }
                >
                  Save Institution Settings
                </button>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                }}
              >
                <h3>Branding</h3>

                <div
                  className="form-grid"
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div className="field">
                    <label>
                      Academy Logo
                    </label>

                    <input
                      type="file"
                      accept="image/*"
                    />
                  </div>

                  <div className="field">
                    <label>
                      Primary Color
                    </label>

                    <input
                      type="color"
                      defaultValue="#111111"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="btn"
                  style={{
                    marginTop: 18,
                  }}
                  onClick={() =>
                    window.alert(
                      "Branding persistence will use the AcademySettings backend.",
                    )
                  }
                >
                  Save Branding
                </button>
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* PLATFORM */}
          {/* ============================================================ */}

          {activeSection === "platform" && (
            <div
              className="card"
              style={{
                padding: 24,
              }}
            >
              <h3>Platform Features</h3>

              <p
                style={{
                  color: "var(--ink-soft)",
                  fontSize: 13,
                  marginTop: 5,
                }}
              >
                Enable or disable Academy platform
                features.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                {[
                  {
                    label: "Admissions",
                    description:
                      "Allow prospective students to submit applications.",
                    value: admissionsEnabled,
                    setter:
                      setAdmissionsEnabled,
                  },
                  {
                    label: "LMS",
                    description:
                      "Enable courses, modules and online learning.",
                    value: lmsEnabled,
                    setter: setLmsEnabled,
                  },
                  {
                    label: "Careers",
                    description:
                      "Enable Academy career and job features.",
                    value: careersEnabled,
                    setter:
                      setCareersEnabled,
                  },
                  {
                    label: "Notifications",
                    description:
                      "Enable Academy platform notifications.",
                    value:
                      notificationsEnabled,
                    setter:
                      setNotificationsEnabled,
                  },
                ].map((feature) => (
                  <div
                    key={feature.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: 16,
                      padding: 16,
                      border: "1px solid var(--border, #e5e5e5)",
                      borderRadius: 10,
                    }}
                  >
                    <div>
                      <strong>
                        {feature.label}
                      </strong>

                      <p
                        style={{
                          fontSize: 12,
                          color:
                            "var(--ink-soft)",
                          marginTop: 4,
                        }}
                      >
                        {feature.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        feature.setter(
                          (value) => !value,
                        )
                      }
                    >
                      {feature.value
                        ? "Enabled"
                        : "Disabled"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  marginTop: 20,
                }}
                onClick={() =>
                  window.alert(
                    "Connect these feature toggles to PATCH /academy/settings.",
                  )
                }
              >
                Save Platform Settings
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* DANGER */}
          {/* ============================================================ */}

          {activeSection === "danger" && (
            <>
              <div
                className="card"
                style={{
                  padding: 24,
                  marginBottom: 18,
                  borderColor:
                    "var(--error, #dc2626)",
                }}
              >
                <h3
                  style={{
                    color:
                      "var(--error, #dc2626)",
                  }}
                >
                  ⚠️ Danger Zone
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color:
                      "var(--ink-soft)",
                    marginTop: 6,
                  }}
                >
                  These operations can permanently
                  affect Academy accounts and data.
                  They should require administrator
                  confirmation and backend authorization.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    marginTop: 20,
                  }}
                >
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      window.alert(
                        "Account disable endpoint required.",
                      )
                    }
                  >
                    Disable My Account
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const confirmed =
                        window.confirm(
                          "Delete a student account? This should only be performed after selecting a specific student.",
                        );

                      if (confirmed) {
                        window.alert(
                          "Student deletion requires a selected student and protected backend DELETE endpoint.",
                        );
                      }
                    }}
                  >
                    Delete Student Account
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const confirmed =
                        window.confirm(
                          "Delete an administrator account? This operation should require elevated authorization.",
                        );

                      if (confirmed) {
                        window.alert(
                          "Administrator deletion requires a selected administrator and protected backend DELETE endpoint.",
                        );
                      }
                    }}
                  >
                    Delete Administrator
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const confirmed =
                        window.confirm(
                          "Put the Academy into maintenance mode?",
                        );

                      if (confirmed) {
                        window.alert(
                          "Maintenance mode requires an AcademySettings backend field.",
                        );
                      }
                    }}
                  >
                    Academy Maintenance Mode
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const confirmed =
                        window.confirm(
                          "Academy reset controls are destructive. Continue?",
                        );

                      if (confirmed) {
                        window.alert(
                          "Academy reset must be implemented as a protected backend operation.",
                        );
                      }
                    }}
                  >
                    Academy Reset Controls
                  </button>
                </div>
              </div>

              <div
                className="card"
                style={{
                  padding: 24,
                }}
              >
                <h3>Backend Connection</h3>

                <div
                  className="form-grid"
                  style={{
                    marginTop: 16,
                  }}
                >
                  <div className="field">
                    <label>
                      API Base URL
                    </label>

                    <p className="mono">
                      {getAcademyApiBaseUrl()}
                    </p>
                  </div>

                  <div className="field">
                    <label>
                      Status
                    </label>

                    <StatusBadge
                      status={
                        backendStatus ===
                        "checking"
                          ? "checking"
                          : backendStatus ===
                            "ok"
                          ? "connected"
                          : "error"
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ================================================================== */}
      {/* CREATE STUDENT MODAL */}
      {/* ================================================================== */}

      {showCreateStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(600px, 100%)",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <h2>Create Student</h2>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  setShowCreateStudent(false)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateStudent}
              style={{
                marginTop: 18,
              }}
            >
              <div className="form-grid">
                <div className="field">
                  <label>
                    First Name
                  </label>

                  <input
                    name="firstName"
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Last Name
                  </label>

                  <input
                    name="lastName"
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Student ID
                  </label>

                  <input
                    name="studentId"
                    placeholder="Auto-generated"
                  />
                </div>

                <div className="field">
                  <label>
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setShowCreateStudent(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* CREATE ADMINISTRATOR MODAL */}
      {/* ================================================================== */}

      {showCreateAdministrator && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(0,0,0,.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(600px, 100%)",
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
              }}
            >
              <h2>
                Create Administrator
              </h2>

              <button
                type="button"
                className="btn"
                onClick={() =>
                  setShowCreateAdministrator(
                    false,
                  )
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleCreateAdministrator
              }
              style={{
                marginTop: 18,
              }}
            >
              <div className="form-grid">
                <div className="field">
                  <label>
                    Full Name
                  </label>

                  <input
                    name="name"
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    required
                  />
                </div>

                <div className="field">
                  <label>
                    Administrator ID
                  </label>

                  <input
                    name="administratorId"
                    placeholder="Auto-generated"
                  />
                </div>

                <div className="field">
                  <label>
                    Role
                  </label>

                  <select
                    name="role"
                    defaultValue="administrator"
                  >
                    <option value="administrator">
                      Administrator
                    </option>

                    <option value="staff">
                      Staff
                    </option>

                    <option value="admissions">
                      Admissions
                    </option>

                    <option value="advisor">
                      Advisor
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>
                    Temporary Password
                  </label>

                  <input
                    type="password"
                    name="password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    setShowCreateAdministrator(
                      false,
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}