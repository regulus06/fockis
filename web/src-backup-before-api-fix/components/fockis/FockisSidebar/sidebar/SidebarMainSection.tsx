import React from "react";
import { NavLink } from "react-router-dom";

interface SidebarMainSectionProps {
  onNavigate?: () => void;
}

export default function SidebarMainSection({
  onNavigate,
}: SidebarMainSectionProps) {
  const handleNavigation = () => {
    onNavigate?.();
  };

  const navClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "fk-sidebar__nav-item",
      isActive ? "fk-sidebar__nav-item--active" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="fk-sidebar__nav-group">
      <span className="fk-sidebar__section-label">
        Main
      </span>

      {/* Feed */}
      <NavLink
        to="/fockis-preview"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Feed"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🏠
        </span>
        <span className="fk-sidebar__nav-label">
          Feed
        </span>
      </NavLink>

      {/* Fockis Music */}
      <NavLink
        to="/music"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis Music"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🎵
        </span>
        <span className="fk-sidebar__nav-label">
          Fockis Music
        </span>
      </NavLink>

      {/* Meetings */}
      <NavLink
        to="/meetings"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Meetings"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🎥
        </span>
        <span className="fk-sidebar__nav-label">
          Meetings
        </span>
      </NavLink>

      {/* My Live */}
      <NavLink
        to="/my-live"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="My Live"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🔴
        </span>
        <span className="fk-sidebar__nav-label">
          My Live
        </span>
      </NavLink>

      {/* Events */}
      <NavLink
        to="/events"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Events"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          📅
        </span>
        <span className="fk-sidebar__nav-label">
          Events
        </span>
      </NavLink>

      {/* Businesses */}
      <NavLink
        to="/businesses"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Businesses"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🏢
        </span>
        <span className="fk-sidebar__nav-label">
          Businesses
        </span>
      </NavLink>

      {/* Fockis Shop */}
      <NavLink
        to="/shop"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis Shop"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🛍️
        </span>
        <span className="fk-sidebar__nav-label">
          Fockis Shop
        </span>
      </NavLink>

      {/* Fockis Travel */}
      <NavLink
        to="/travel"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis Travel"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          ✈️
        </span>
        <span className="fk-sidebar__nav-label">
          Fockis Travel
        </span>
      </NavLink>

      {/* Manage Business */}
      <NavLink
        to="/business/manager"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Manage Business"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          ⚙️
        </span>
        <span className="fk-sidebar__nav-label">
          Manage Business
        </span>
      </NavLink>

      {/* Marketing */}
      <NavLink
        to="/marketing"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Marketing"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          📣
        </span>
        <span className="fk-sidebar__nav-label">
          Marketing
        </span>
      </NavLink>

      {/* Subscriptions */}
      <NavLink
        to="/subscriptions"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Subscriptions"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          💳
        </span>
        <span className="fk-sidebar__nav-label">
          Subscriptions
        </span>
      </NavLink>

      {/* Map */}
      <NavLink
        to="/map"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Map"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🗺️
        </span>
        <span className="fk-sidebar__nav-label">
          Map
        </span>
      </NavLink>

      {/* Create */}
      <NavLink
        to="/create"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis Create"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          ✨
        </span>
        <span className="fk-sidebar__nav-label">
          Create
        </span>
      </NavLink>

      {/* AI Studio */}
      <NavLink
        to="/create/ai"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis AI Studio"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🤖
        </span>
        <span className="fk-sidebar__nav-label">
          AI Studio
        </span>
      </NavLink>

      {/* Fockis AI */}
      <NavLink
        to="/fockis-ai"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis AI"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          ✦
        </span>
        <span className="fk-sidebar__nav-label">
          Fockis AI
        </span>
      </NavLink>

      {/* Fockis Academy */}
      <NavLink
        to="/academy"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis Academy"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🎓
        </span>
        <span className="fk-sidebar__nav-label">
          Fockis Academy
        </span>
      </NavLink>

      {/* Fockis Org */}
      <NavLink
        to="/church"
        end
        className={navClass}
        onClick={handleNavigation}
        aria-label="Fockis Org"
      >
        <span className="fk-sidebar__nav-icon" aria-hidden="true">
          🏛️
        </span>
        <span className="fk-sidebar__nav-label">
          Fockis Org
        </span>
      </NavLink>
    </div>
  );
}