import React from "react";

import {
  IconProfile,
  IconDiscover,
  IconMarketplace,
  IconSettings,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


interface SidebarSubscriptionSectionProps {
  onNavigate?: () => void;
}


export default function SidebarSubscriptionSection({
  onNavigate,
}: SidebarSubscriptionSectionProps) {

  return (
    <div className="fk-sidebar__nav-group">

      <span className="fk-sidebar__section-label">
        Subscriptions
      </span>


      <SidebarNavItem
        to="/subscriptions"
        label="My Subscription"
        icon={<IconProfile size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/subscriptions/plans"
        label="Plans"
        icon={<IconDiscover size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/subscriptions/billing"
        label="Billing"
        icon={<IconMarketplace size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/admin/subscription-plans"
        label="Manage Plans"
        icon={<IconSettings size={20} />}
        onNavigate={onNavigate}
      />

    </div>
  );
}