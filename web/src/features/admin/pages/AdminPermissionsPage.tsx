import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
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

export default function AdminPermissionsPage() {
  const currentPermissions =
    useAdminSessionStore(
      (state) => state.permissions,
    );

  const canView =
    currentPermissions.includes(
      PERMISSIONS.PERMISSIONS_VIEW,
    );

  const [
    permissions,
    setPermissions,
  ] = useState<
    PermissionCatalogItem[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const result =
          await adminApi.getPermissions();

        setPermissions(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load permissions.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filtered =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return permissions;
      }

      return permissions.filter(
        (permission) =>
          permission.key
            .toLowerCase()
            .includes(query) ||
          (
            permission.label ??
            ""
          )
            .toLowerCase()
            .includes(query) ||
          (
            permission.description ??
            ""
          )
            .toLowerCase()
            .includes(query) ||
          (
            permission.group ??
            ""
          )
            .toLowerCase()
            .includes(query),
      );
    }, [permissions, search]);

  const grouped =
    useMemo(() => {
      const groups: Record<
        string,
        PermissionCatalogItem[]
      > = {};

      for (const permission of filtered) {
        const group =
          permission.group ||
          "Other";

        if (!groups[group]) {
          groups[group] = [];
        }

        groups[group].push(
          permission,
        );
      }

      return groups;
    }, [filtered]);

  if (!canView) {
    return (
      <div
        style={{
          padding: 32,
        }}
      >
        You do not have permission to view
        the Fockis permission catalogue.
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
      <div
        style={{
          marginBottom: 24,
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

        <h1
          style={{
            margin:
              "12px 0 6px",
          }}
        >
          Permission Catalogue
        </h1>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
          }}
        >
          The permissions available to
          Fockis administrators.
        </p>
      </div>

      <input
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search permissions..."
        style={{
          width: "100%",
          boxSizing:
            "border-box",
          padding: 12,
          border:
            "1px solid #d1d5db",
          borderRadius: 9,
          marginBottom: 20,
        }}
      />

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

      {loading ? (
        <div>
          Loading permission catalogue...
        </div>
      ) : (
        Object.entries(
          grouped,
        ).map(
          ([
            group,
            items,
          ]) => (
            <section
              key={group}
              style={{
                marginBottom: 20,
                padding: 18,
                background:
                  "#fff",
                border:
                  "1px solid #e5e7eb",
                borderRadius: 12,
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
                  marginBottom:
                    14,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 17,
                  }}
                >
                  {group}
                </h2>

                <span
                  style={{
                    fontSize: 12,
                    color:
                      "#6b7280",
                  }}
                >
                  {items.length} permissions
                </span>
              </div>

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
                  (permission) => (
                    <div
                      key={
                        permission.key
                      }
                      style={{
                        padding: 12,
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            700,
                          fontSize:
                            13,
                        }}
                      >
                        {permission.label ||
                          permission.key}
                      </div>

                      <div
                        style={{
                          marginTop:
                            4,
                          fontSize:
                            11,
                          fontFamily:
                            "monospace",
                          color:
                            "#2563eb",
                        }}
                      >
                        {permission.key}
                      </div>

                      {permission.description && (
                        <div
                          style={{
                            marginTop:
                              7,
                            fontSize:
                              12,
                            color:
                              "#6b7280",
                            lineHeight:
                              1.45,
                          }}
                        >
                          {
                            permission.description
                          }
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}