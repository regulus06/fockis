import { useEffect, useState } from "react";

import { adminApi } from "../service/adminApi";

import type { AdminUser } from "../types/admin.types";

import { AdminPageHeader } from "../components/AdminPageHeader";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "../components/AdminDataTable";
import { AdminStatusBadge } from "../components/AdminStatusBadge";
import { AdminRoleBadge } from "../components/AdminRoleBadge";
import { AdminErrorState } from "../components/AdminStates";

import { useAdminSessionStore } from "../store/adminSessionStore";

export function AdministratorsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const switchToken = useAdminSessionStore(
    (state) => state.switchToken,
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    adminApi
      .getAdministrators()
      .then((res: AdminUser[]) => {
        if (!cancelled) {
          setAdmins(res);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load administrators",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [switchToken]);

  const columns: AdminTableColumn<AdminUser>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (admin) => admin.name,
      render: (admin) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {admin.name}
          </div>

          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--fk-text-tertiary)",
            }}
          >
            {admin.id}
          </div>
        </div>
      ),
    },

    {
      key: "email",
      header: "Email",
      render: (admin) => admin.email,
    },

    {
      key: "role",
      header: "Role",
      render: (admin) => (
        <AdminRoleBadge role={admin.role} />
      ),
    },

    {
      key: "status",
      header: "Status",
      render: (admin) => (
        <AdminStatusBadge status={admin.status} />
      ),
    },

    {
      key: "twoFactor",
      header: "2FA",
      render: (admin) =>
        admin.twoFactorEnabled ? "✅" : "—",
    },

    {
      key: "lastLogin",
      header: "Last Login",
      sortable: true,
      sortValue: (admin) => admin.lastLogin ?? "",
      render: (admin) =>
        admin.lastLogin
          ? new Date(admin.lastLogin).toLocaleDateString()
          : "—",
    },

    {
      key: "sessions",
      header: "Sessions",
      render: (admin) => admin.activeSessions,
    },
  ];

  if (error) {
    return <AdminErrorState message={error} />;
  }

  return (
    <div>
      <AdminPageHeader
        title="Administrators"
        description="Manage Fockis platform administrators and their roles."
      />

      <AdminDataTable
        columns={columns}
        rows={admins}
        rowKey={(admin) => admin.id}
        loading={loading}
        emptyTitle="No administrators found"
      />
    </div>
  );
}

export default AdministratorsPage;