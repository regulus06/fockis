import React from "react";
import { useNavigate } from "react-router-dom";

import {
  IconProfile,
  IconSettings,
  IconHelp,
} from "../../FockisIcons";

import {
  CreditCard,
  ShieldCheck,
  FileText,
  Users,
  Baby,
  Copyright,
  ShoppingBag,
} from "lucide-react";

import SidebarNavItem from "./SidebarNavItem";

/* ============================================================================
   TYPES
============================================================================ */

interface SidebarAccountSectionProps {
  currentUser?: {
    username?: string;
    fullName?: string;
    avatar?: string;
  } | null;

  onNavigate?: () => void;
}

/* ============================================================================
   ACCOUNT SECTION
============================================================================ */

export default function SidebarAccountSection({
  currentUser,
  onNavigate,
}: SidebarAccountSectionProps) {
  const navigate = useNavigate();

  function handleNavigation() {
    onNavigate?.();
  }

  function navigateTo(path: string) {
    handleNavigation();
    navigate(path);
  }

  return (
    <div className="fk-sidebar__nav-group">
      <span className="fk-sidebar__section-label">
        Account
      </span>

      {/* PROFILE / LOGIN */}
      {currentUser ? (
        <button
          type="button"
          className="fk-sidebar__nav-item"
          onClick={() => navigateTo("/profile")}
        >
          <span className="fk-sidebar__nav-icon">
            <IconProfile size={20} />
          </span>

          <span className="fk-sidebar__nav-label">
            Profile
          </span>
        </button>
      ) : (
        <SidebarNavItem
          to="/login"
          label="Login"
          icon={<IconProfile size={20} />}
          onNavigate={handleNavigation}
        />
      )}

      {currentUser && (
        <>
          {/* ACCOUNT SETTINGS */}
          <SidebarNavItem
            to="/settings"
            label="Settings"
            icon={<IconSettings size={20} />}
            onNavigate={handleNavigation}
          />

          {/* SUBSCRIPTIONS */}
          <SidebarNavItem
            to="/subscriptions"
            label="Subscription"
            icon={<CreditCard size={20} />}
            onNavigate={handleNavigation}
          />

          {/* LEGAL POLICIES */}
          <span className="fk-sidebar__section-label">
            Legal &amp; Policies
          </span>

          <SidebarNavItem
            to="/privacy"
            label="Privacy Policy"
            icon={<ShieldCheck size={20} />}
            onNavigate={handleNavigation}
          />

          <SidebarNavItem
            to="/terms"
            label="Terms of Service"
            icon={<FileText size={20} />}
            onNavigate={handleNavigation}
          />

          <SidebarNavItem
            to="/community-guidelines"
            label="Community Guidelines"
            icon={<Users size={20} />}
            onNavigate={handleNavigation}
          />

          <SidebarNavItem
            to="/child-safety"
            label="Child Safety Policy"
            icon={<Baby size={20} />}
            onNavigate={handleNavigation}
          />

          <SidebarNavItem
            to="/payments"
            label="Payments Policy"
            icon={<CreditCard size={20} />}
            onNavigate={handleNavigation}
          />

          <SidebarNavItem
            to="/copyright"
            label="Copyright Policy"
            icon={<Copyright size={20} />}
            onNavigate={handleNavigation}
          />

          <SidebarNavItem
            to="/shop-advertising"
            label="Shop & Advertising Policy"
            icon={<ShoppingBag size={20} />}
            onNavigate={handleNavigation}
          />
        </>
      )}

      {/* HELP & SUPPORT */}
      <SidebarNavItem
        to="/privacy-policy"
        label="Help & Support"
        icon={<IconHelp size={20} />}
        onNavigate={handleNavigation}
      />
    </div>
  );
}