import React, { useEffect, useRef, useState } from "react";
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

type NavigationIconProps = {
  size?: number;
  className?: string;
};

type NavigationIcon =
  React.ComponentType<NavigationIconProps>;

type BottomNavItem = {
  label: string;
  path: string;
  icon: NavigationIcon;
  end?: boolean;
};

// ============================================================================
// ICONS
// ============================================================================

const PlusIcon: NavigationIcon = ({
  size = 22,
  className,
}) => (
  <Plus
    size={size}
    className={className}
  />
);

const ShoppingCartIcon: NavigationIcon = ({
  size = 22,
  className,
}) => (
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

// ============================================================================
// NAVIGATION ORDER
//
// Feed → Marketplace → Cart → + → Real Estate → Messages → Profile
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
    label: "Cart",
    path: "/marketplace/cart",
    icon: ShoppingCartIcon,
  },
  {
    label: "Create",
    path: "/fockis/create",
    icon: PlusIcon,
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
// REELS / WAVES
// ============================================================================

function isReelRoute(pathname: string): boolean {
  const path = pathname.toLowerCase();

  return (
    path === "/reels" ||
    path.startsWith("/reels/") ||
    path === "/waves" ||
    path.startsWith("/waves/") ||
    path === "/fockis/reels" ||
    path.startsWith("/fockis/reels/") ||
    path === "/fockis/waves" ||
    path.startsWith("/fockis/waves/")
  );
}

// ============================================================================
// GET SCROLL POSITION
// ============================================================================

function getScrollPosition(
  target: EventTarget | null,
): number {
  if (
    target === window ||
    target === document ||
    target === document.documentElement ||
    target === document.body
  ) {
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    );
  }

  if (target instanceof HTMLElement) {
    return target.scrollTop;
  }

  return (
    window.scrollY ||
    window.pageYOffset ||
    0
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FockisBottomNav() {
  const location = useLocation();

  const [isHidden, setIsHidden] =
    useState(false);

  const lastScrollPosition =
    useRef(0);

  const ticking =
    useRef(false);

  // ==========================================================================
  // FACEBOOK-STYLE SCROLL
  //
  // Scroll DOWN → hide
  // Scroll UP   → show
  // At TOP      → show
  // ==========================================================================

  useEffect(() => {
    if (isReelRoute(location.pathname)) {
      return;
    }

    const handleScroll = (
      event: Event,
    ): void => {
      /*
       * Only use this behavior on phones.
       */
      if (window.innerWidth > 767) {
        setIsHidden(false);
        return;
      }

      const currentPosition =
        getScrollPosition(
          event.target,
        );

      const previousPosition =
        lastScrollPosition.current;

      const difference =
        currentPosition -
        previousPosition;

      /*
       * Ignore very small movement.
       */
      if (Math.abs(difference) < 4) {
        return;
      }

      lastScrollPosition.current =
        currentPosition;

      /*
       * Prevent excessive React updates
       * while scrolling.
       */
      if (ticking.current) {
        return;
      }

      ticking.current = true;

      window.requestAnimationFrame(() => {
        /*
         * Always show at the top.
         */
        if (currentPosition <= 10) {
          setIsHidden(false);
        }

        /*
         * Scrolling DOWN.
         */
        else if (difference > 0) {
          setIsHidden(true);
        }

        /*
         * Scrolling UP.
         */
        else if (difference < 0) {
          setIsHidden(false);
        }

        ticking.current = false;
      });
    };

    /*
     * Initialize position.
     */
    lastScrollPosition.current =
      window.scrollY ||
      window.pageYOffset ||
      0;

    /*
     * Listen to the window.
     */
    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      },
    );

    /*
     * IMPORTANT:
     *
     * Capture scroll events from ANY
     * scrollable element inside Fockis.
     *
     * This is what makes the navigation
     * work even if Feed scrolls inside
     * a container instead of window.
     */
    document.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
        capture: true,
      },
    );

    /*
     * Show again after resizing.
     */
    const handleResize = (): void => {
      setIsHidden(false);

      lastScrollPosition.current =
        window.scrollY ||
        window.pageYOffset ||
        0;
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );

      document.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, [location.pathname]);

  // ==========================================================================
  // SHOW WHEN ROUTE CHANGES
  // ==========================================================================

  useEffect(() => {
    setIsHidden(false);

    lastScrollPosition.current =
      window.scrollY ||
      window.pageYOffset ||
      0;
  }, [location.pathname]);

  // ==========================================================================
  // HIDE ON REELS / WAVES
  // ==========================================================================

  if (
    isReelRoute(location.pathname)
  ) {
    return null;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <nav
      className="fk-bottom-nav"
      aria-label="Fockis main navigation"
      style={{
        transform: isHidden
          ? "translateY(calc(100% + env(safe-area-inset-bottom, 0px)))"
          : "translateY(0)",
        opacity: isHidden ? 0 : 1,
        visibility: isHidden
          ? "hidden"
          : "visible",
        pointerEvents: isHidden
          ? "none"
          : "auto",
        transition:
          "transform 220ms ease, opacity 180ms ease, visibility 220ms ease",
      }}
    >
      <div className="fk-bottom-nav__inner">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isCreate =
            item.label === "Create";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "fk-bottom-nav__item",

                  isActive
                    ? "fk-bottom-nav__item--active"
                    : "",

                  isCreate
                    ? "fk-bottom-nav__item--create"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
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