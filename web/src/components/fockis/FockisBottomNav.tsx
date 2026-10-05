import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

import {
  IconHome,
  IconMessages,
  IconProfile,
  IconMarketplace,
  IconShop,
} from "./FockisIcons";

import "../../styles/FockisNavigation.scss";

// ============================================================================
// TYPES
// ============================================================================

type NavigationIconProps = {
  size?: number;
  className?: string;
};

type NavigationIcon = React.ComponentType<NavigationIconProps>;

type BottomNavItem = {
  label: string;
  path: string;
  icon: NavigationIcon;
  end?: boolean;
};

// ============================================================================
// CREATE ICON
// ============================================================================

const PlusIcon: NavigationIcon = ({
  size = 22,
  className,
}) => {
  return (
    <Plus
      size={size}
      className={className}
    />
  );
};

// ============================================================================
// SHOPPING CART ICON
// ============================================================================

const ShoppingCartIcon: NavigationIcon = ({
  size = 22,
  className,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="20" cy="20" r="1" />

      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
};

// ============================================================================
// NAVIGATION
// ============================================================================

const navItems: BottomNavItem[] = [
  {
    label: "Feed",
    path: "/fockis",
    icon: IconHome,
    end: true,
  },

  {
    label: "Marketplace",
    path: "/marketplace",
    icon: IconMarketplace,
  },

  {
    label: "Create",
    path: "/fockis/create",
    icon: PlusIcon,
  },

  {
    label: "Cart",
    path: "/marketplace/cart",
    icon: ShoppingCartIcon,
  },

  {
    label: "Real Estate",
    path: "/realestate",
    icon: IconShop,
  },

  {
    label: "Messages",
    path: "/messages",
    icon: IconMessages,
  },

  {
    label: "Profile",
    path: "/profile",
    icon: IconProfile,
  },
];

// ============================================================================
// REEL / WAVES ROUTE DETECTION
// ============================================================================

function isReelRoute(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase();

  return (
    normalizedPath === "/reels" ||
    normalizedPath.startsWith("/reels/") ||
    normalizedPath === "/waves" ||
    normalizedPath.startsWith("/waves/") ||
    normalizedPath === "/fockis/reels" ||
    normalizedPath.startsWith("/fockis/reels/") ||
    normalizedPath === "/fockis/waves" ||
    normalizedPath.startsWith("/fockis/waves/")
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FockisBottomNav() {
  const location = useLocation();

  // Hide the bottom navigation while viewing Reels / Waves.
  if (isReelRoute(location.pathname)) {
    return null;
  }

  return (
    <nav
      className="fk-bottom-nav"
      aria-label="Fockis main navigation"
    >
      <div className="fk-bottom-nav__inner">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                [
                  "fk-bottom-nav__item",

                  isActive
                    ? "fk-bottom-nav__item--active"
                    : "",

                  item.label === "Create"
                    ? "fk-bottom-nav__item--create"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              aria-label={item.label}
            >
              <span className="fk-bottom-nav__icon">
                <Icon size={22} />
              </span>

              <span className="fk-bottom-nav__label">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}