import React from "react";

import {
  NavLink,
} from "react-router-dom";


/* ============================================================================
   TYPES
============================================================================ */

interface SidebarNavItemProps {

  to: string;

  label: string;

  icon: React.ReactNode;

  end?: boolean;

  badge?: number;

  onNavigate?: () => void;

}


/* ============================================================================
   NAV ITEM
============================================================================ */

export default function SidebarNavItem({
  to,
  label,
  icon,
  end = false,
  badge,
  onNavigate,
}: SidebarNavItemProps) {


  return (

    <NavLink

      to={to}

      end={end}

      onClick={onNavigate}

      className={({ isActive }: { isActive: boolean }) =>

        `fk-sidebar__nav-item${

          isActive

            ? " is-active"

            : ""

        }`

      }

    >

      <span className="fk-sidebar__nav-icon">

        {icon}

      </span>


      <span className="fk-sidebar__nav-label">

        {label}

      </span>



      {badge !== undefined && badge > 0 && (

        <span className="fk-sidebar__badge">

          {badge > 99 ? "99+" : badge}

        </span>

      )}


    </NavLink>

  );

}