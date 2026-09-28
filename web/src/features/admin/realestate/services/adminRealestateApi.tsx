/*
 * ============================================================================
 * FOCKIS ADMIN REAL ESTATE API
 * ============================================================================
 */

import api from "../../../../api/api";

/* ============================================================================
 * DASHBOARD
 * ============================================================================ */

export const getDashboard = () =>
  api.get("/admin/realestate/dashboard");

/* ============================================================================
 * PROPERTIES
 * ============================================================================ */

export const getProperties = () =>
  api.get("/admin/realestate/properties");

export const getProperty = (id: string) =>
  api.get(`/admin/realestate/property/${id}`);

/* ============================================================================
 * APPROVE
 * ============================================================================ */

export const approveProperty = (id: string) =>
  api.patch(`/admin/realestate/property/${id}/approve`);

/* ============================================================================
 * REJECT
 * ============================================================================ */

export const rejectProperty = (id: string) =>
  api.patch(`/admin/realestate/property/${id}/reject`);

/* ============================================================================
 * FEATURE
 * ============================================================================ */

export const featureProperty = (id: string) =>
  api.patch(`/admin/realestate/property/${id}/feature`);

/* ============================================================================
 * UNFEATURE
 * ============================================================================ */

export const unfeatureProperty = (id: string) =>
  api.patch(`/admin/realestate/property/${id}/unfeature`);

/* ============================================================================
 * DELETE
 * ============================================================================ */

export const deleteProperty = (id: string) =>
  api.delete(`/admin/realestate/property/${id}`);