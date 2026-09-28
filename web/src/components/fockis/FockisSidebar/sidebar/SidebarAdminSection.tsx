import React from "react";

import {
  IconSettings,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


interface SidebarAdminSectionProps {
  onNavigate?: () => void;
}


export default function SidebarAdminSection({
  onNavigate,
}: SidebarAdminSectionProps) {

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