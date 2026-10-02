import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  adminApi,
} from "../service/adminApi";

import type {
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
  Administrators: [
    "admins.",
    "roles.",
    "permissions.",
  ],
  Users: ["users."],
  Moderation: [
    "moderation.",
  ],
  Support: ["support."],
  Marketplace: [
    "marketplace.",
  ],
  Shipping: ["shipping."],
  Finance: ["finance."],
  Payments: ["payments."],
  Subscriptions: [
    "subscriptions.",
  ],
  Gifts: ["gifts."],
  Marketing: [
    "marketing.",
  ],
  Live: ["live."],
  Meetings: [
    "meetings.",
  ],
  "Real Estate": [
    "realestate.",
  ],
  Documents: [
    "documents.",
  ],
  Design: ["design."],
  Playlists: [
    "playlists.",
  ],
  Reviews: ["reviews."],
  Analytics: [
    "analytics.",
  ],
  Security: [
    "security.",
  ],
  Audit: ["audit."],
  System: ["system."],
  Emergency: [
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

export default function AdminRoleCreatePage() {
  const navigate = useNavigate();

  const grantedPermissions =
    useAdminSessionStore(
      (state) => state.permissions,
    );

  const canCreate =
    grantedPermissions.includes(
      PERMISSIONS.ROLES_CREATE,
    ) &&
    grantedPermissions.includes(
      PERMISSIONS.PERMISSIONS_ASSIGN,
    );

  const [
    catalog,
    setCatalog,
  ] = useState<
    PermissionCatalogItem[]
  >([]);

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

  const [
    selected,
    setSelected,
  ] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const result =
          await adminApi.getPermissions();

        setCatalog(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load permission catalogue.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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
    if (!canCreate) {
      return;
    }

    /*
     * Delegation rule:
     *
     * A non-super-admin should only be able
     * to delegate permissions they themselves
     * possess.
     *
     * The backend MUST enforce this too.
     */
    const canDelegate =
      grantedPermissions.includes(
        permission as never,
      );

    if (!canDelegate) {
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

  const createRole = async () => {
    if (!canCreate) {
      return;
    }

    if (!name.trim()) {
      setError(
        "Role name is required.",
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result =
        await adminApi.createRole({
          name: name.trim(),
          slug:
            slug.trim() ||
            undefined,
          description:
            description.trim(),
          permissions:
            selected,
          isActive: active,
        });

      navigate(
        `/admin/roles/${result._id}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create role.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <div
        style={{
          padding: 32,
        }}
      >
        <Link to="/admin/roles">
          ← Back to Roles
        </Link>

        <h1>
          Create Administrator
          Role
        </h1>

        <div
          style={{
            padding: 16,
            borderRadius: 10,
            background:
              "#fef2f2",
            color: "#991b1b",
          }}
        >
          You need both
          <strong>
            {" "}
            roles.create
          </strong>{" "}
          and
          <strong>
            {" "}
            permissions.assign
          </strong>{" "}
          to create administrator
          roles.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1300,
        margin: "0 auto",
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
          marginTop: 12,
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            margin: 0,
          }}
        >
          Create Administrator
          Role
        </h1>

        <p
          style={{
            color: "#6b7280",
          }}
        >
          Create a custom administrator
          role and assign the permissions
          you are authorized to delegate.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 14,
            marginBottom: 18,
            borderRadius: 10,
            background:
              "#fef2f2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          padding: 20,
          background: "#fff",
          border:
            "1px solid #e5e7eb",
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <h2>
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
            onChange={setName}
            placeholder="Manager"
          />

          <Field
            label="Slug"
            value={slug}
            onChange={setSlug}
            placeholder="manager"
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
              placeholder="Describe what this administrator role is responsible for."
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding: 11,
                border:
                  "1px solid #d1d5db",
                borderRadius: 8,
              }}
            />
          </div>

          <label
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 8,
            }}
          >
            <input
              type="checkbox"
              checked={active}
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
          background: "#fff",
          border:
            "1px solid #e5e7eb",
          borderRadius: 12,
        }}
      >
        <h2>
          Permissions
        </h2>

        <p
          style={{
            color: "#6b7280",
            fontSize: 13,
          }}
        >
          You can only delegate permissions
          that your current administrator
          account is authorized to delegate.
        </p>

        {loading ? (
          <div>
            Loading permissions...
          </div>
        ) : (
          Object.entries(
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
                <h3>
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
                      const allowed =
                        grantedPermissions.includes(
                          item.key as never,
                        );

                      const checked =
                        selected.includes(
                          item.key,
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
                            opacity:
                              allowed
                                ? 1
                                : 0.45,
                            cursor:
                              allowed
                                ? "pointer"
                                : "not-allowed",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              checked
                            }
                            disabled={
                              !allowed
                            }
                            onChange={() =>
                              togglePermission(
                                item.key,
                              )
                            }
                          />

                          <span>
                            <strong>
                              {item.label ||
                                permissionLabel(
                                  item.key,
                                )}
                            </strong>

                            <span
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  3,
                                fontSize:
                                  11,
                                fontFamily:
                                  "monospace",
                                color:
                                  "#6b7280",
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

                            {!allowed && (
                              <span
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    5,
                                  fontSize:
                                    11,
                                  color:
                                    "#b91c1c",
                                }}
                              >
                                You cannot
                                delegate
                                this
                                permission.
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
          )
        )}
      </section>

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
            void createRole()
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
            ? "Creating..."
            : "Create Role"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
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
        placeholder={
          placeholder
        }
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
        }}
      />
    </label>
  );
}