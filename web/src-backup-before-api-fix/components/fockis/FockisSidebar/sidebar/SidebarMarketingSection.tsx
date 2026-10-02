import React from "react";

import {
  IconDiscover,
  IconWaves,
  IconMarketplace,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


interface SidebarMarketingSectionProps {
  onNavigate?: () => void;
}


export default function SidebarMarketingSection({
  onNavigate,
}: SidebarMarketingSectionProps) {

  return (
    <div className="fk-sidebar__nav-group">

      <span className="fk-sidebar__section-label">
        Marketing
      </span>


      <SidebarNavItem
        to="/marketing/dashboard"
        label="Marketing"
        icon={<IconDiscover size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/marketing/campaigns"
        label="Campaigns"
        icon={<IconWaves size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/marketing/ads"
        label="Ads Manager"
        icon={<IconMarketplace size={20} />}
        onNavigate={onNavigate}
      />

    </div>
  );
}