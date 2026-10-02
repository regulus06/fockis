import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  adminApi,
} from "../service/adminApi";

import type {
  AdminRoleRecord,
} from "../api/adminApi";

import {
  useAdminSessionStore,
} from "../store/adminSessionStore";

import {
  PERMISSIONS,
} from "../permissions/permission.constants";

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function AdminRolesPage() {
  const navigate = useNavigate();

  const permissions =
    useAdminSessionStore(
      (state) => state.permissions,
    );

  const canCreate =
    permissions.includes(
      PERMISSIONS.ROLES_CREATE,
    ) &&
    permissions.includes(
      PERMISSIONS.PERMISSIONS_ASSIGN,
    );

  const canEdit =
    permissions.includes(
      PERMISSIONS.ROLES_EDIT,
    );

  const canDelete =
    permissions.includes(
      PERMISSIONS.ROLES_DELETE,
    );

  const [
    roles,
    setRoles,
  ] = useState<AdminRoleRecord[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState<
    "ALL" | "SYSTEM" | "CUSTOM" | "ACTIVE" | "INACTIVE"
  >("ALL");

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(null);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      const result =
        await adminApi.getRoles();

      setRoles(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load administrator roles.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const filteredRoles =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return roles.filter((role) => {
        if (
          filter === "SYSTEM" &&
          !role.isSystemRole
        ) {
          return false;
        }

        if (
          filter === "CUSTOM" &&
          role.isSystemRole
        ) {
          return false;
        }

        if (
          filter === "ACTIVE" &&
          !role.isActive
        ) {
          return false;
        }

        if (
          filter === "INACTIVE" &&
          role.isActive
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return (
          role.name
            .toLowerCase()
            .includes(query) ||
          role.slug
            .toLowerCase()
            .includes(query) ||
          (
            role.description ?? ""
          )
            .toLowerCase()
            .includes(query)
        );
      });
    }, [roles, search, filter]);

  const handleDelete = async (
    role: AdminRoleRecord,
  ) => {
    if (role.isSystemRole) {
      window.alert(
        "System administrator roles cannot be deleted.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete the administrator role "${role.name}"? This cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(role._id);

      await adminApi.deleteRole(
        role._id,
      );

      setRoles((current) =>
        current.filter(
          (item) =>
            item._id !== role._id,
        ),
      );
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Failed to delete role.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1500,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            Fockis Administration
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
            }}
          >
            Administrator Roles
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#6b7280",
            }}
          >
            Manage administrator roles and
            their permission sets.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/roles/create",
              )
            }
            style={{
              border: 0,
              borderRadius: 10,
              padding:
                "11px 16px",
              cursor: "pointer",
              fontWeight: 700,
              background:
                "#2563eb",
              color: "#fff",
            }}
          >
            + Create Role
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Stat
          label="Total Roles"
          value={roles.length}
        />

        <Stat
          label="System Roles"
          value={
            roles.filter(
              (role) =>
                role.isSystemRole,
            ).length
          }
        />

        <Stat
          label="Custom Roles"
          value={
            roles.filter(
              (role) =>
                !role.isSystemRole,
            ).length
          }
        />

        <Stat
          label="Active Roles"
          value={
            roles.filter(
              (role) =>
                role.isActive,
            ).length
          }
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search roles..."
          style={{
            minWidth: 280,
            padding:
              "10px 12px",
            border:
              "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />

        <select
          value={filter}
          onChange={(event) =>
            setFilter(
              event.target.value as
                | "ALL"
                | "SYSTEM"
                | "CUSTOM"
                | "ACTIVE"
                | "INACTIVE",
            )
          }
          style={{
            padding:
              "10px 12px",
            border:
              "1px solid #d1d5db",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <option value="ALL">
            All roles
          </option>
          <option value="SYSTEM">
            System roles
          </option>
          <option value="CUSTOM">
            Custom roles
          </option>
          <option value="ACTIVE">
            Active
          </option>
          <option value="INACTIVE">
            Inactive
          </option>
        </select>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            marginBottom: 16,
            borderRadius: 10,
            background:
              "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          border:
            "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse:
                "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f9fafb",
                }}
              >
                <Th>Role</Th>
                <Th>Type</Th>
                <Th>Permissions</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
                <Th>Actions</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign:
                        "center",
                    }}
                  >
                    Loading roles...
                  </td>
                </tr>
              ) : filteredRoles.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign:
                        "center",
                      color:
                        "#6b7280",
                    }}
                  >
                    No administrator
                    roles found.
                  </td>
                </tr>
              ) : (
                filteredRoles.map(
                  (role) => (
                    <tr
                      key={
                        role._id
                      }
                    >
                      <td
                        style={cell}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {role.name}
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            color:
                              "#6b7280",
                            fontFamily:
                              "monospace",
                          }}
                        >
                          {role.slug}
                        </div>
                      </td>

                      <td
                        style={cell}
                      >
                        <Badge>
                          {role.isSystemRole
                            ? "SYSTEM"
                            : "CUSTOM"}
                        </Badge>
                      </td>

                      <td
                        style={cell}
                      >
                        {role.permissions
                          ?.length ?? 0}
                      </td>

                      <td
                        style={cell}
                      >
                        <Badge
                          active={
                            role.isActive
                          }
                        >
                          {role.isActive
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </Badge>
                      </td>

                      <td
                        style={{
                          ...cell,
                          fontSize: 12,
                        }}
                      >
                        {formatDate(
                          role.updatedAt,
                        )}
                      </td>

                      <td
                        style={cell}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 8,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <Link
                            to={`/admin/roles/${role._id}`}
                            style={
                              linkButton
                            }
                          >
                            View
                          </Link>

                          {canEdit &&
                            !role.isSystemRole && (
                              <Link
                                to={`/admin/roles/${role._id}`}
                                style={
                                  linkButton
                                }
                              >
                                Edit
                              </Link>
                            )}

                          {canDelete &&
                            !role.isSystemRole && (
                              <button
                                type="button"
                                disabled={
                                  deletingId ===
                                  role._id
                                }
                                onClick={() =>
                                  void handleDelete(
                                    role,
                                  )
                                }
                                style={{
                                  ...dangerButton,
                                  opacity:
                                    deletingId ===
                                    role._id
                                      ? 0.6
                                      : 1,
                                }}
                              >
                                {deletingId ===
                                role._id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        padding: 18,
        border:
          "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#6b7280",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: 13,
        fontSize: 12,
        color: "#6b7280",
        borderBottom:
          "1px solid #e5e7eb",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Badge({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        padding:
          "4px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background:
          active === false
            ? "#fef2f2"
            : "#eff6ff",
        color:
          active === false
            ? "#991b1b"
            : "#1d4ed8",
      }}
    >
      {children}
    </span>
  );
}

const cell: React.CSSProperties = {
  padding: 14,
  borderBottom:
    "1px solid #f0f0f0",
  verticalAlign: "middle",
};

const linkButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding:
    "7px 10px",
  borderRadius: 7,
  background: "#eff6ff",
  color: "#1d4ed8",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 700,
};

const dangerButton: React.CSSProperties = {
  border: 0,
  padding:
    "7px 10px",
  borderRadius: 7,
  background: "#fef2f2",
  color: "#b91c1c",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};