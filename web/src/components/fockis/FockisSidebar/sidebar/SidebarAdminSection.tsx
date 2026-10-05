import React from "react";

import {
  IconSettings,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


interface SidebarAdminSectionProps {
  currentUser?: any;
  onNavigate?: () => void;
}


export default function SidebarAdminSection({
  currentUser,
  onNavigate,
}: SidebarAdminSectionProps) {

  const role = String(
    currentUser?.role ??
    "",
  ).toLowerCase();


  const roles = Array.isArray(currentUser?.roles)
    ? currentUser.roles.map((value: unknown) =>
        String(value).toLowerCase(),
      )
    : [];


  const isSuperAdmin =
    currentUser?.isSuperAdmin === true ||
    currentUser?.is_super_admin === true ||
    role === "super_admin" ||
    role === "superadmin" ||
    roles.includes("super_admin") ||
    roles.includes("superadmin");


  const isAdmin =
    isSuperAdmin ||
    currentUser?.isAdmin === true ||
    currentUser?.is_admin === true ||
    role === "admin" ||
    role === "administrator" ||
    roles.includes("admin") ||
    roles.includes("administrator");


  /*
   * Normal users and moderators do not see
   * the Administration section.
   *
   * Admins and Super Admins can see it.
   *
   * Backend RBAC remains the final security authority.
   */
  if (!isAdmin) {
    return null;
  }


  return (
    <div className="fk-sidebar__nav-group">

      <span className="fk-sidebar__section-label">
        Administration
      </span>


      <SidebarNavItem
        to="/admin/dashboard"
        label="Admin Dashboard"
        icon={<IconSettings size={20} />}
        onNavigate={onNavigate}
      />

    </div>
  );
}