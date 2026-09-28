import React from "react";

import {
  IconMarketplace,
  IconShop,
  IconDiscover,
  IconSaved,
} from "../../FockisIcons";

import SidebarNavItem from "./SidebarNavItem";


interface SidebarExploreSectionProps {
  savedCount?: number;
  onNavigate?: () => void;
}


export default function SidebarExploreSection({
  savedCount = 0,
  onNavigate,
}: SidebarExploreSectionProps) {

  return (
    <div className="fk-sidebar__nav-group">

      <span className="fk-sidebar__section-label">
        Explore
      </span>


      <SidebarNavItem
        to="/marketplace"
        label="Marketplace"
        icon={<IconMarketplace size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/realestate"
        label="Real Estate"
        icon={<IconShop size={20} />}
        end
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/careers"
        label="Careers"
        icon={<IconDiscover size={20} />}
        end
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/saved"
        label="Saved"
        icon={<IconSaved size={20} />}
        badge={savedCount}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/marketplace/wishlist"
        label="Wishlist"
        icon={<IconSaved size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/orders"
        label="Orders"
        icon={<IconMarketplace size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/marketplace/cart"
        label="Cart"
        icon={<IconMarketplace size={20} />}
        onNavigate={onNavigate}
      />


      <SidebarNavItem
        to="/seller"
        label="Seller Center"
        icon={<IconShop size={20} />}
        onNavigate={onNavigate}
      />

    </div>
  );
}