// ============================================================
// FOCKIS ADMIN API — ABSTRACTION LAYER
//
// Pages and hooks should import from this file.
//
// Existing user/dashboard modules that do not yet have their
// complete backend implementation remain on their current
// mock implementations.
//
// Administrator + RBAC management uses the real NestJS API.
// ============================================================

import * as realAdminApi from "../api/adminApi";

import * as mockUsersApi from "../api/mockUsersApi";
import * as mockAuditApi from "../api/mockAuditApi";
import * as mockDashboardApi from "../api/mockDashboardApi";

/*
 * Keep this false for administrator/RBAC management.
 *
 * We intentionally keep the mock modules because several
 * existing Admin Center screens still depend on them.
 */
export const USE_MOCK_ADMIN_API = false;

/**
 * Existing user-management screens still use the mock API
 * until their corresponding NestJS endpoints are connected.
 */
const usersImpl = mockUsersApi;

/**
 * ============================================================
 * ADMIN API
 * ============================================================
 */

export const adminApi = {
  // ==========================================================
  // Dashboard
  // ==========================================================

  /**
   * Dashboard now uses the real NestJS endpoint.
   *
   * This avoids the TypeScript union problem caused by trying
   * to access getDashboardStats through a conditional module.
   */
  getDashboard: realAdminApi.getAdminDashboard,

  getMetrics: realAdminApi.getAdminMetrics,

  // ==========================================================
  // Users
  //
  // Existing implementation remains untouched.
  // ==========================================================

  getUsers: usersImpl.getUsers,

  getUser: usersImpl.getUser,

  activateUser: usersImpl.activateUser,

  deactivateUser: usersImpl.deactivateUser,

  suspendUser: usersImpl.suspendUser,

  blockUser: usersImpl.blockUser,

  restoreUser: usersImpl.restoreUser,

  forceLogoutUser: usersImpl.forceLogoutUser,

  sendPasswordReset: usersImpl.sendPasswordReset,

  requestUserDeletion:
    usersImpl.requestUserDeletion,

  permanentlyDeleteUser:
    usersImpl.permanentlyDeleteUser,

  viewSensitiveData:
    usersImpl.viewSensitiveData,

  // ==========================================================
  // Administrators
  // ==========================================================

  getAdministrators:
    realAdminApi.getAdministrators,

  getAdministrator:
    realAdminApi.getAdministrator,

  createAdministrator:
    realAdminApi.createAdministrator,

  updateAdministrator:
    realAdminApi.updateAdministrator,

  /**
   * Suspend administrator.
   */
  suspendAdministrator:
    async (id: string) => {
      return realAdminApi.updateAdministrator(id, {
        status: "SUSPENDED",
      });
    },

  /**
   * Restore administrator.
   */
  restoreAdministrator:
    async (id: string) => {
      return realAdminApi.updateAdministrator(id, {
        status: "ACTIVE",
      });
    },

  // ==========================================================
  // Roles / RBAC
  // ==========================================================

  /**
   * Get all dynamic administrator roles.
   */
  getRoles:
    realAdminApi.getAdminRoles,

  /**
   * Get one dynamic administrator role.
   */
  getRole:
    realAdminApi.getAdminRole,

  /**
   * Create a custom administrator role.
   */
  createRole:
    realAdminApi.createAdminRole,

  /**
   * Update a custom administrator role.
   */
  updateRole:
    realAdminApi.updateAdminRole,

  /**
   * Delete a custom administrator role.
   */
  deleteRole:
    realAdminApi.deleteAdminRole,

  // ==========================================================
  // Permissions
  // ==========================================================

  /**
   * Get the backend permission catalogue.
   */
  getPermissions:
    realAdminApi.getAdminPermissions,

  // ==========================================================
  // Audit
  // ==========================================================

  /**
   * Audit logs currently use the real API because the Admin
   * Center has a real NestJS audit endpoint available.
   */
  getAuditLogs:
    realAdminApi.getAuditLogs,

  /**
   * User-specific audit history remains on the existing mock
   * implementation until the corresponding backend endpoint
   * is connected.
   */
  getUserAuditHistory:
    mockAuditApi.getUserAuditHistory,
};

export type AdminApi = typeof adminApi;