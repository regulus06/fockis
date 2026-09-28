import { api } from "../../../api/api";

/* ============================================================
   FOCKIS ADMIN — REAL ADMIN API
   ============================================================ */

/* DASHBOARD */

export const getAdminDashboard = async () => {
  const res = await api.get("/admin/dashboard");
  return res.data;
};

export const getAdminMetrics = async () => {
  const res = await api.get("/admin/dashboard/metrics");
  return res.data;
};

/* ============================================================
   AUDIT
   ============================================================ */

export const getAuditLogs = async () => {
  const res = await api.get("/admin/audit");
  return res.data;
};

/* ============================================================
   ADMINISTRATORS
   ============================================================ */

export const getAdministrators = async () => {
  const res = await api.get("/admin/administrators");
  return res.data;
};

export const getAdministrator = async (id: string) => {
  const res = await api.get(`/admin/administrators/${id}`);
  return res.data;
};

export const createAdministrator = async (payload: {
  name: string;
  email: string;
  role?: string;
  adminRoleId?: string | null;
}) => {
  const res = await api.post("/admin/administrators", payload);
  return res.data;
};

export const updateAdministrator = async (
  id: string,
  payload: {
    name?: string;
    email?: string;
    role?: string;
    adminRoleId?: string | null;
    status?: string;
  },
) => {
  const res = await api.patch(
    `/admin/administrators/${id}`,
    payload,
  );

  return res.data;
};

/* ============================================================
   ADMINISTRATOR ROLES
   ============================================================ */

export interface AdminRoleRecord {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  isSystemRole: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionCatalogItem {
  key: string;
  label: string;
  description?: string;
  group?: string;
}

/* GET ALL ROLES */

export const getAdminRoles = async (): Promise<
  AdminRoleRecord[]
> => {
  const res = await api.get("/admin/roles");
  return res.data;
};

/* GET ONE ROLE */

export const getAdminRole = async (
  id: string,
): Promise<AdminRoleRecord> => {
  const res = await api.get(`/admin/roles/${id}`);
  return res.data;
};

/* GET PERMISSION CATALOG */

export const getAdminPermissions = async (): Promise<
  PermissionCatalogItem[]
> => {
  const res = await api.get("/admin/roles/permissions");
  return res.data;
};

/* CREATE ROLE */

export const createAdminRole = async (payload: {
  name: string;
  slug?: string;
  description?: string;
  permissions: string[];
  isActive?: boolean;
}) => {
  const res = await api.post("/admin/roles", payload);
  return res.data as AdminRoleRecord;
};

/* UPDATE ROLE */

export const updateAdminRole = async (
  id: string,
  payload: {
    name?: string;
    slug?: string;
    description?: string;
    permissions?: string[];
    isActive?: boolean;
  },
) => {
  const res = await api.patch(
    `/admin/roles/${id}`,
    payload,
  );

  return res.data as AdminRoleRecord;
};

/* DELETE ROLE */

export const deleteAdminRole = async (
  id: string,
) => {
  const res = await api.delete(`/admin/roles/${id}`);
  return res.data;
};