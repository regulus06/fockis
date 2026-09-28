import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import { ListVideo } from "lucide-react";

import {
  IconSearch,
  IconNotifications,
  IconMessages,
  IconPlus,
  IconMore,
  IconClose,
} from "./FockisIcons";

import "../../styles/FockisMobileHeader.scss";

export default function FockisMobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const isPlaylistsActive =
    location.pathname === "/playlists";

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [moreOpen, setMoreOpen] =
    useState(false);

  const handleSearchSubmit = (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    const query =
      searchQuery.trim();

    if (!query) {
      return;
    }

    navigate(
      `/fockis/search?q=${encodeURIComponent(
        query,
      )}`,
    );

    setSearchOpen(false);
  };

  const openMore = () => {
    setMoreOpen(
      (previous) => !previous,
    );
  };

  const closeMore = () => {
    setMoreOpen(false);
  };

  const navigateFromMore = (
    path: string,
  ) => {
    closeMore();
    navigate(path);
  };

  return (
    <header className="fk-mobile-header">

      {/* ============================================================
          MAIN HEADER
      ============================================================ */}

      <div className="fk-mobile-header__main">

        {/* LOGO */}

        <Link
          to="/fockis"
          className="fk-mobile-header__brand"
          aria-label="Fockis Feed"
        >
          <span className="fk-mobile-header__logo">
            F
          </span>

          <span className="fk-mobile-header__wordmark">
            Fockis
          </span>
        </Link>

        {/* ACTIONS */}

        <div className="fk-mobile-header__actions">

          {/* SEARCH */}

          <button
            type="button"
            className="fk-mobile-header__icon-btn"
            onClick={() =>
              setSearchOpen(
                (previous) =>
                  !previous,
              )
            }
            aria-label={
              searchOpen
                ? "Close search"
                : "Search"
            }
            aria-expanded={
              searchOpen
            }
          >
            {searchOpen ? (
              <IconClose size={21} />
            ) : (
              <IconSearch size={21} />
            )}
          </button>

          {/* CREATE */}

          <button
            type="button"
            className="fk-mobile-header__icon-btn fk-mobile-header__create-btn"
            onClick={() =>
              navigate(
                "/fockis/create",
              )
            }
            aria-label="Create post"
          >
            <IconPlus size={21} />
          </button>

          {/* PLAYLISTS */}

          <button
            type="button"
            className={`fk-mobile-header__icon-btn ${
              isPlaylistsActive
                ? "fk-mobile-header__icon-btn--active"
                : ""
            }`}
            onClick={() =>
              navigate("/playlists")
            }
            aria-label="Playlists"
            aria-current={
              isPlaylistsActive
                ? "page"
                : undefined
            }
          >
            <ListVideo size={21} />
          </button>

          {/* MESSAGES */}

          <button
            type="button"
            className="fk-mobile-header__icon-btn"
            onClick={() =>
              navigate(
                "/messages",
              )
            }
            aria-label="Messages"
          >
            <IconMessages size={21} />
          </button>

          {/* NOTIFICATIONS */}

          <button
            type="button"
            className="fk-mobile-header__icon-btn"
            onClick={() =>
              navigate(
                "/notifications",
              )
            }
            aria-label="Notifications"
          >
            <IconNotifications size={21} />
          </button>

          {/* MORE */}

          <button
            type="button"
            className="fk-mobile-header__icon-btn"
            onClick={openMore}
            aria-label="More options"
            aria-expanded={moreOpen}
          >
            {moreOpen ? (
              <IconClose size={21} />
            ) : (
              <IconMore size={21} />
            )}
          </button>

        </div>
      </div>

      {/* ============================================================
          MORE MENU
      ============================================================ */}

      {moreOpen && (
        <div
          className="fk-mobile-header__more-menu"
          role="menu"
        >

          {/* PLAYLISTS */}

          <button
            type="button"
            role="menuitem"
            className="fk-mobile-header__more-item"
            onClick={() =>
              navigateFromMore(
                "/playlists",
              )
            }
          >
            <span className="fk-mobile-header__more-icon">
              🎬
            </span>

            <span className="fk-mobile-header__more-text">
              <strong>
                Playlists
              </strong>

              <small>
                Browse video and music playlists
              </small>
            </span>
          </button>

          {/* CREATOR PLAYLISTS */}

          <button
            type="button"
            role="menuitem"
            className="fk-mobile-header__more-item"
            onClick={() =>
              navigateFromMore(
                "/creator/playlists",
              )
            }
          >
            <span className="fk-mobile-header__more-icon">
              📚
            </span>

            <span className="fk-mobile-header__more-text">
              <strong>
                Creator Playlists
              </strong>

              <small>
                Create and manage your playlists
              </small>
            </span>
          </button>

          {/* PROFILE */}

          <button
            type="button"
            role="menuitem"
            className="fk-mobile-header__more-item"
            onClick={() =>
              navigateFromMore(
                "/profile",
              )
            }
          >
            <span className="fk-mobile-header__more-icon">
              👤
            </span>

            <span className="fk-mobile-header__more-text">
              <strong>
                Profile
              </strong>

              <small>
                View your Fockis profile
              </small>
            </span>
          </button>

          {/* SAVED */}

          <button
            type="button"
            role="menuitem"
            className="fk-mobile-header__more-item"
            onClick={() =>
              navigateFromMore(
                "/saved",
              )
            }
          >
            <span className="fk-mobile-header__more-icon">
              🔖
            </span>

            <span className="fk-mobile-header__more-text">
              <strong>
                Saved
              </strong>

              <small>
                View your saved content
              </small>
            </span>
          </button>

        </div>
      )}

      {/* ============================================================
          SEARCH BAR
      ============================================================ */}

      {searchOpen && (
        <div className="fk-mobile-header__search">

          <form
            onSubmit={
              handleSearchSubmit
            }
            className="fk-mobile-header__search-form"
          >
            <IconSearch size={19} />

            <input
              type="search"
              value={
                searchQuery
              }
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder="Search Fockis..."
              autoFocus
              aria-label="Search Fockis"
            />

            {searchQuery && (
              <button
                type="button"
                className="fk-mobile-header__search-clear"
                onClick={() =>
                  setSearchQuery(
                    "",
                  )
                }
                aria-label="Clear search"
              >
                <IconClose size={17} />
              </button>
            )}
          </form>

        </div>
      )}

    </header>
  );
}