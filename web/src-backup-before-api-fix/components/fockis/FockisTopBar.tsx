import React, { useState } from "react";

import "../../styles/FockisTopBar.scss";

import {
  IconSearch,
  IconMessages,
  IconSun,
  IconMoon,
} from "./FockisIcons";

import { ListVideo } from "lucide-react";

import NotificationBell from "../../features/notifications/components/NotificationBell";

/* ============================================================================
   TYPES
============================================================================ */

export interface FockisTopBarProps {
  onSearch?: (query: string) => void;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  onPlaylistsClick?: () => void;
  onToggleTheme?: () => void;

  messageCount?: number;
  notificationCount?: number;

  isPlaylistsActive?: boolean;

  theme?: "light" | "dark";
}

/* ============================================================================
   FOCKIS TOP BAR
============================================================================ */

export default function FockisTopBar({
  onSearch,
  onMessagesClick,
  onNotificationsClick,
  onPlaylistsClick,
  onToggleTheme,
  messageCount = 0,
  notificationCount = 0,
  isPlaylistsActive = false,
  theme = "light",
}: FockisTopBarProps) {
  const [query, setQuery] = useState("");

  const handleSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    setQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="fk-topbar fk-feed-topbar">
      {/* =====================================================================
          LOGO
      ====================================================================== */}

      <div className="fk-topbar__logo">
        <img
          src="/Fockis-Logo/fockis1.png"
          alt="Fockis"
          className="fk-topbar__logo-image"
        />

        <span className="fk-topbar__logo-text">
          Fockis
        </span>
      </div>

      {/* =====================================================================
          SEARCH
      ====================================================================== */}

      <label className="fk-topbar__search">
        <IconSearch
          size={18}
          className="fk-topbar__search-icon"
        />

        <input
          type="search"
          value={query}
          placeholder="Search Fockis"
          onChange={handleSearchChange}
          aria-label="Search Fockis"
        />
      </label>

      {/* =====================================================================
          ACTIONS
      ====================================================================== */}

      <div className="fk-topbar__actions">
        {/* PLAYLISTS */}

        <button
          type="button"
          className={`fk-icon-btn fk-topbar__action ${
            isPlaylistsActive
              ? "fk-topbar__action--active"
              : ""
          }`}
          onClick={onPlaylistsClick}
          aria-label="Playlists"
          aria-current={
            isPlaylistsActive
              ? "page"
              : undefined
          }
          title="Playlists"
        >
          <ListVideo size={20} />
        </button>

        {/* MESSAGES */}

        <button
          type="button"
          className="fk-icon-btn fk-topbar__action"
          onClick={onMessagesClick}
          aria-label="Messages"
          title="Messages"
        >
          <IconMessages size={20} />

          {messageCount > 0 && (
            <span
              className="fk-topbar__badge"
              aria-label={`${messageCount} unread messages`}
            >
              {messageCount > 99
                ? "99+"
                : messageCount}
            </span>
          )}
        </button>

        {/* NOTIFICATIONS */}

        <div className="fk-topbar__notification-wrapper">
          <NotificationBell />
        </div>

        {/* THEME */}

        {onToggleTheme && (
          <button
            type="button"
            className="fk-icon-btn fk-topbar__action"
            onClick={onToggleTheme}
            aria-label={
              theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
            }
            title={
              theme === "light"
                ? "Dark mode"
                : "Light mode"
            }
          >
            {theme === "light" ? (
              <IconMoon size={20} />
            ) : (
              <IconSun size={20} />
            )}
          </button>
        )}
      </div>
    </header>
  );
}