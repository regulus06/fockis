import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Filter, MoreVertical, Plus, Search } from "lucide-react";

import { adminApi } from "../service/adminApi";

import type { AdminRole, AdminUser } from "../types/admin.types";

import { AdminPageHeader } from "../components/AdminPageHeader";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "../components/AdminDataTable";
import { AdminErrorState } from "../components/AdminStates";
import { roleLabel } from "../components/AdminRoleBadge";

import { PERMISSIONS } from "../permissions/permission.constants";
import { useAdminAccess } from "../permissions/adminAccess";
import { useAdminSessionStore } from "../store/adminSessionStore";

/* ============================================================================
   ADMINISTRATORS

   Same data source as before (GET /admin/administrators via adminApi).
   The backend may return either the typed AdminUser shape or its own record
   shape (role "super_admin", status "active"/"offline", lastSeen …), so rows
   are normalised for display only — nothing is sent back differently.
============================================================================ */

type AdminRecord = AdminUser & {
  _id?: string;
  username?: string | null;
  online?: boolean;
  lastSeen?: string | null;
};

interface Row {
  key: string;
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleText: string;
  statusKey: string;
  statusText: string;
  lastActive: string | null;
  twoFactor: boolean | null;
  sessions: number | null;
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function displayRole(record: AdminRecord): { key: string; text: string } {
  const key = normalizeKey(record.role) || "ADMIN";
  if (record.adminRoleName) return { key, text: record.adminRoleName };
  if (key === "SUPERADMIN" || key === "SUPER_ADMIN") return { key: "SUPER_ADMIN", text: "Super Admin" };
  if (key === "ADMIN" || key === "ADMINISTRATOR") return { key: "ADMIN", text: "Administrator" };
  return { key, text: roleLabel(key as AdminRole) };
}

function displayStatus(record: AdminRecord): { key: string; text: string } {
  const key = normalizeKey(record.status) || (record.online ? "ACTIVE" : "UNKNOWN");
  const text = key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, " ");
  return { key, text };
}

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: "success",
  ONLINE: "success",
  OFFLINE: "neutral",
  INACTIVE: "danger",
  DEACTIVATED: "neutral",
  SUSPENDED: "warning",
  BLOCKED: "danger",
  PENDING_REVIEW: "info",
};

const ROLE_VARIANT: Record<string, string> = {
  SUPER_ADMIN: "gold",
  ADMIN: "navy",
};

function relative(iso: string | null): string {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

/* ---------- row action menu ---------- */
function RowActions({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="fk-menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="fk-icon-action"
        aria-label={`Actions for ${row.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="fk-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="fk-menu__item"
            onClick={() => navigate(`/admin/administrators/${encodeURIComponent(row.id)}`)}
          >
            <Eye size={16} aria-hidden="true" />
            View details
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   PAGE
============================================================================ */

export function AdministratorsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { can } = useAdminAccess();
  const switchToken = useAdminSessionStore((state) => state.switchToken);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    adminApi
      .getAdministrators()
      .then((res: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { items?: unknown[] })?.items)
            ? (res as { items: unknown[] }).items
            : [];
        setAdmins(list as AdminRecord[]);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load administrators");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [switchToken]);

  const rows = useMemo<Row[]>(
    () =>
      admins.map((record, index) => {
        const role = displayRole(record);
        const status = displayStatus(record);
        const id = String(record.id ?? record._id ?? index);
        return {
          key: `${id}-${index}`,
          id,
          name: record.name || record.username || record.email || "Administrator",
          email: record.email ?? "",
          roleKey: role.key,
          roleText: role.text,
          statusKey: status.key,
          statusText: status.text,
          lastActive: record.lastActivity ?? record.lastSeen ?? record.lastLogin ?? null,
          twoFactor: typeof record.twoFactorEnabled === "boolean" ? record.twoFactorEnabled : null,
          sessions: typeof record.activeSessions === "number" ? record.activeSessions : null,
        };
      }),
    [admins],
  );

  const roleOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => map.set(row.roleKey, row.roleText));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => map.set(row.statusKey, row.statusText));
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (tab !== "ALL" && row.roleKey !== tab) return false;
      if (roleFilter !== "ALL" && row.roleKey !== roleFilter) return false;
      if (statusFilter !== "ALL" && row.statusKey !== statusFilter) return false;
      if (q && !`${row.name} ${row.email} ${row.roleText}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, roleFilter, statusFilter, search]);

  const filtersActive = search || roleFilter !== "ALL" || statusFilter !== "ALL" || tab !== "ALL";

  const showTwoFactor = rows.some((row) => row.twoFactor !== null);
  const showSessions = rows.some((row) => row.sessions !== null);

  const columns: AdminTableColumn<Row>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (row) => row.name.toLowerCase(),
      render: (row) => (
        <div className="fk-person">
          <span className={`fk-avatar${row.roleKey === "SUPER_ADMIN" ? " fk-avatar--gold" : ""}`} aria-hidden="true">
            {initials(row.name)}
          </span>
          <strong>{row.name}</strong>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      sortValue: (row) => row.email.toLowerCase(),
      render: (row) => <span className="fk-muted">{row.email || "—"}</span>,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (row) => row.roleText,
      render: (row) => (
        <span className={`fk-badge fk-badge--${ROLE_VARIANT[row.roleKey] ?? "info"}`}>{row.roleText}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => row.statusText,
      render: (row) => (
        <span className={`fk-badge fk-badge--${STATUS_VARIANT[row.statusKey] ?? "neutral"}`}>{row.statusText}</span>
      ),
    },
    ...(showTwoFactor
      ? [
          {
            key: "twoFactor",
            header: "2FA",
            render: (row: Row) =>
              row.twoFactor === null ? "—" : row.twoFactor ? (
                <span className="fk-badge fk-badge--success">On</span>
              ) : (
                <span className="fk-badge fk-badge--neutral">Off</span>
              ),
          },
        ]
      : []),
    {
      key: "lastActive",
      header: "Last Active",
      sortable: true,
      sortValue: (row) => (row.lastActive ? new Date(row.lastActive).getTime() : 0),
      render: (row) => <span className="fk-muted">{relative(row.lastActive)}</span>,
    },
    ...(showSessions
      ? [
          {
            key: "sessions",
            header: "Sessions",
            render: (row: Row) => (row.sessions === null ? "—" : row.sessions),
          },
        ]
      : []),
    {
      key: "actions",
      header: "Actions",
      render: (row) => <RowActions row={row} />,
    },
  ];

  if (error) {
    return <AdminErrorState message={error} />;
  }

  return (
    <div className="fk-page">
      <AdminPageHeader
        title="Administrators"
        description="Manage administrator accounts and permissions."
        actions={
          can([PERMISSIONS.ADMINS_CREATE]) ? (
            <Link to="/admin/administrators/create" className="fk-btn fk-btn--primary">
              <Plus size={16} aria-hidden="true" />
              Add Administrator
            </Link>
          ) : undefined
        }
      />

      <AdminDataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.key}
        loading={loading}
        emptyTitle={filtersActive ? "No administrators match these filters" : "No administrators found"}
        emptyDescription={filtersActive ? "Try a different search, role, or status." : undefined}
        toolbar={
          <div className="fk-filterbar">
            <div className="fk-pill-tabs" role="tablist" aria-label="Filter by role">
              {[["ALL", "All"] as const, ...roleOptions].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  className={`fk-pill-tab fk-pill-tab--navy${tab === value ? " is-active" : ""}`}
                  onClick={() => setTab(value)}
                >
                  {value === "ALL" ? label : `${label}s`}
                </button>
              ))}
            </div>

            <div className="fk-toolbar">
              <label className="fk-search fk-toolbar__grow">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search administrators..."
                  aria-label="Search administrators"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <select
                className="fk-select"
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                {roleOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="fk-select"
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {filtersActive && (
                <button
                  type="button"
                  className="fk-btn"
                  onClick={() => {
                    setTab("ALL");
                    setSearch("");
                    setRoleFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                >
                  <Filter size={15} aria-hidden="true" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        }
        footer={
          !loading ? (
            <span>
              Showing {filtered.length} of {rows.length} administrator{rows.length === 1 ? "" : "s"}
            </span>
          ) : undefined
        }
      />
    </div>
  );
}

export default AdministratorsPage;
