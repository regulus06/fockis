import {
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
  adminApi,
} from "../service/adminApi";

import type {
  AdminRoleRecord,
  PermissionCatalogItem,
} from "../api/adminApi";

import {
  PERMISSIONS,
} from "../permissions/permission.constants";

import {
  useAdminSessionStore,
} from "../store/adminSessionStore";

const GROUPS: Record<
  string,
  string[]
> = {
  "Administrators": [
    "admins.",
    "roles.",
    "permissions.",
  ],

  "Users": [
    "users.",
  ],

  "Moderation": [
    "moderation.",
  ],

  "Support": [
    "support.",
  ],

  "Marketplace": [
    "marketplace.",
  ],

  "Shipping": [
    "shipping.",
  ],

  "Finance": [
    "finance.",
  ],

  "Payments": [
    "payments.",
  ],

  "Subscriptions": [
    "subscriptions.",
  ],

  "Gifts": [
    "gifts.",
  ],

  "Marketing": [
    "marketing.",
  ],

  "Live": [
    "live.",
  ],

  "Meetings": [
    "meetings.",
  ],

  "Real Estate": [
    "realestate.",
  ],

  "Documents": [
    "documents.",
  ],

  "Design": [
    "design.",
  ],

  "Playlists": [
    "playlists.",
  ],

  "Reviews": [
    "reviews.",
  ],

  "Analytics": [
    "analytics.",
  ],

  "Security": [
    "security.",
  ],

  "Audit": [
    "audit.",
  ],

  "System": [
    "system.",
  ],

  "Emergency": [
    "emergency.",
  ],

  "Fockis AI / Vapi": [
    "ai.",
  ],
};

function permissionLabel(
  permission: string,
) {
  return permission
    .split(".")
    .map(
      (part) =>
        part
          .replace(/_/g, " ")
          .replace(
            /\b\w/g,
            (char) =>
              char.toUpperCase(),
          ),
    )
    .join(" / ");
}

function groupForPermission(
  permission: string,
) {
  for (const [
    group,
    prefixes,
  ] of Object.entries(GROUPS)) {
    if (
      prefixes.some((prefix) =>
        permission.startsWith(prefix),
      )
    ) {
      return group;
    }
  }

  return "Other";
}

export default function AdminRoleDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const permissions =
    useAdminSessionStore(
      (state) => state.permissions,
    );

  const canEdit =
    permissions.includes(
      PERMISSIONS.ROLES_EDIT,
    ) &&
    permissions.includes(
      PERMISSIONS.PERMISSIONS_ASSIGN,
    );

  const [
    role,
    setRole,
  ] = useState<AdminRoleRecord | null>(
    null,
  );

  const [
    catalog,
    setCatalog,
  ] = useState<
    PermissionCatalogItem[]
  >([]);

  const [
    selected,
    setSelected,
  ] = useState<string[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    name,
    setName,
  ] = useState("");

  const [
    slug,
    setSlug,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    active,
    setActive,
  ] = useState(true);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          roleResult,
          permissionsResult,
        ] = await Promise.all([
          adminApi.getRole(id),
          adminApi.getPermissions(),
        ]);

        if (cancelled) {
          return;
        }

        setRole(roleResult);
        setCatalog(
          permissionsResult,
        );

        setName(
          roleResult.name,
        );
        setSlug(
          roleResult.slug,
        );
        setDescription(
          roleResult.description ??
            "",
        );
        setActive(
          roleResult.isActive,
        );
        setSelected(
          roleResult.permissions ??
            [],
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load role.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped =
    useMemo(() => {
      const result: Record<
        string,
        PermissionCatalogItem[]
      > = {};

      for (const item of catalog) {
        const group =
          item.group ||
          groupForPermission(
            item.key,
          );

        if (!result[group]) {
          result[group] = [];
        }

        result[group].push(item);
      }

      return result;
    }, [catalog]);

  const togglePermission = (
    permission: string,
  ) => {
    if (!canEdit || role?.isSystemRole) {
      return;
    }

    setSelected((current) =>
      current.includes(permission)
        ? current.filter(
            (item) =>
              item !== permission,
          )
        : [
            ...current,
            permission,
          ],
    );
  };

  const save = async () => {
    if (!id || !role) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updated =
        await adminApi.updateRole(
          id,
          {
            name: name.trim(),
            slug: slug.trim(),
            description:
              description.trim(),
            permissions: selected,
            isActive: active,
          },
        );

      setRole(updated);

      window.alert(
        "Administrator role updated successfully.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update role.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 32,
        }}
      >
        Loading administrator role...
      </div>
    );
  }

  if (error && !role) {
    return (
      <div
        style={{
          padding: 32,
        }}
      >
        <Link to="/admin/roles">
          ← Back to Roles
        </Link>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background:
              "#fef2f2",
            color: "#991b1b",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div
        style={{
          padding: 32,
        }}
      >
        Role not found.
      </div>
    );
  }

  const readOnly =
    role.isSystemRole ||
    !canEdit;

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1300,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          marginBottom: 22,
        }}
      >
        <Link
          to="/admin/roles"
          style={{
            color: "#2563eb",
            textDecoration:
              "none",
            fontSize: 13,
          }}
        >
          ← Back to Roles
        </Link>

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 20,
            marginTop: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
              }}
            >
              {role.name}
            </h1>

            <div
              style={{
                marginTop: 6,
                color: "#6b7280",
                fontFamily:
                  "monospace",
              }}
            >
              {role.slug}
            </div>
          </div>

          <div
            style={{
              padding:
                "7px 11px",
              borderRadius: 999,
              background:
                role.isSystemRole
                  ? "#eff6ff"
                  : "#f3f4f6",
              color:
                role.isSystemRole
                  ? "#1d4ed8"
                  : "#374151",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {role.isSystemRole
              ? "SYSTEM ROLE"
              : "CUSTOM ROLE"}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            marginBottom: 18,
            background:
              "#fef2f2",
            color: "#991b1b",
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      )}

      {role.isSystemRole && (
        <div
          style={{
            padding: 15,
            marginBottom: 18,
            borderRadius: 10,
            background:
              "#eff6ff",
            color: "#1e40af",
          }}
        >
          This is a system administrator
          role. System roles cannot be modified
          or deleted from this interface.
        </div>
      )}

      {!canEdit &&
        !role.isSystemRole && (
          <div
            style={{
              padding: 15,
              marginBottom: 18,
              borderRadius: 10,
              background:
                "#fff7ed",
              color: "#9a3412",
            }}
          >
            You can view this role, but your
            administrator permissions do not
            allow you to modify its permission
            set.
          </div>
        )}

      <section
        style={{
          padding: 20,
          border:
            "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          Role Information
        </h2>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          <Field
            label="Role Name"
            value={name}
            disabled={readOnly}
            onChange={setName}
          />

          <Field
            label="Slug"
            value={slug}
            disabled={readOnly}
            onChange={setSlug}
          />

          <div
            style={{
              gridColumn:
                "1 / -1",
            }}
          >
            <label
              style={{
                display:
                  "block",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Description
            </label>

            <textarea
              value={
                description
              }
              disabled={
                readOnly
              }
              onChange={(
                event,
              ) =>
                setDescription(
                  event
                    .target
                    .value,
                )
              }
              rows={4}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding: 11,
                border:
                  "1px solid #d1d5db",
                borderRadius: 8,
                resize:
                  "vertical",
              }}
            />
          </div>

          <label
            style={{
              display:
                "flex",
              gap: 8,
              alignItems:
                "center",
            }}
          >
            <input
              type="checkbox"
              checked={active}
              disabled={
                readOnly
              }
              onChange={(
                event,
              ) =>
                setActive(
                  event
                    .target
                    .checked,
                )
              }
            />

            Role is active
          </label>
        </div>
      </section>

      <section
        style={{
          padding: 20,
          border:
            "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
              }}
            >
              Permissions
            </h2>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#6b7280",
              }}
            >
              {selected.length} permission
              {selected.length ===
              1
                ? ""
                : "s"} assigned
            </p>
          </div>
        </div>

        {Object.entries(
          grouped,
        ).map(
          ([
            group,
            items,
          ]) => (
            <div
              key={group}
              style={{
                marginBottom: 24,
              }}
            >
              <h3
                style={{
                  margin:
                    "0 0 10px",
                  fontSize: 15,
                }}
              >
                {group}
              </h3>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {items.map(
                  (item) => {
                    const checked =
                      selected.includes(
                        item.key,
                      );

                    const canDelegate =
                      permissions.includes(
                        item.key as never,
                      ) ||
                      permissions.includes(
                        PERMISSIONS.PERMISSIONS_ASSIGN,
                      ) &&
                      permissions.includes(
                        PERMISSIONS.ROLES_CREATE,
                      );

                    return (
                      <label
                        key={
                          item.key
                        }
                        style={{
                          display:
                            "flex",
                          gap: 10,
                          alignItems:
                            "flex-start",
                          padding:
                            11,
                          border:
                            "1px solid #e5e7eb",
                          borderRadius:
                            9,
                          cursor:
                            readOnly ||
                            !canDelegate
                              ? "default"
                              : "pointer",
                          opacity:
                            !canDelegate &&
                            !checked
                              ? 0.55
                              : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          disabled={
                            readOnly ||
                            !canDelegate
                          }
                          onChange={() =>
                            togglePermission(
                              item.key,
                            )
                          }
                        />

                        <span>
                          <span
                            style={{
                              display:
                                "block",
                              fontWeight:
                                700,
                              fontSize:
                                13,
                            }}
                          >
                            {item.label ||
                              permissionLabel(
                                item.key,
                              )}
                          </span>

                          <span
                            style={{
                              display:
                                "block",
                              marginTop:
                                3,
                              fontSize:
                                11,
                              color:
                                "#6b7280",
                              fontFamily:
                                "monospace",
                            }}
                          >
                            {item.key}
                          </span>

                          {item.description && (
                            <span
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  4,
                                fontSize:
                                  12,
                                color:
                                  "#6b7280",
                              }}
                            >
                              {
                                item.description
                              }
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  },
                )}
              </div>
            </div>
          ),
        )}
      </section>

      {!readOnly && (
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/roles",
              )
            }
            style={{
              padding:
                "10px 16px",
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              background:
                "#fff",
              cursor:
                "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void save()
            }
            style={{
              padding:
                "10px 17px",
              border: 0,
              borderRadius: 8,
              background:
                "#2563eb",
              color: "#fff",
              fontWeight:
                700,
              cursor:
                "pointer",
              opacity:
                saving
                  ? 0.6
                  : 1,
            }}
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label>
      <span
        style={{
          display:
            "block",
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        {label}
      </span>

      <input
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        style={{
          width: "100%",
          boxSizing:
            "border-box",
          padding: 10,
          border:
            "1px solid #d1d5db",
          borderRadius: 8,
          background:
            disabled
              ? "#f9fafb"
              : "#fff",
        }}
      />
    </label>
  );
}