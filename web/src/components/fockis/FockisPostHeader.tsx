/* ============================================================================
   FOCKIS POST HEADER
============================================================================ */

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  IconMore,
} from "./FockisIcons";

import {
  fockisFollowApi,
} from "../../features/gifts/fockisprofile/service/fockisFollowApi";


/* ============================================================================
   TYPES
============================================================================ */

export interface FockisPostHeaderProps {

  user: string;

  userId?: string;

  userPhoto?: string;

  createdAt?: string;

  menuOpen: boolean;

  canDelete: boolean;

  onMenu: () => void;

  onEdit: () => void;

  onDelete: () => void;

}


/* ============================================================================
   RELATIVE TIME
============================================================================ */

const SECOND = 1000;

const MINUTE =
  60 * SECOND;

const HOUR =
  60 * MINUTE;

const DAY =
  24 * HOUR;

const MONTH =
  30.44 * DAY;

const YEAR =
  365.25 * DAY;


export function formatRelativeTime(
  value?: string,
): string {

  if (!value) {
    return "Just now";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }


  const diffMs =
    Date.now() -
    date.getTime();


  const elapsed =
    Math.max(
      diffMs,
      0,
    );


  if (
    elapsed < MINUTE
  ) {
    return "now";
  }


  if (
    elapsed < HOUR
  ) {
    return `${Math.floor(
      elapsed / MINUTE,
    )}m`;
  }


  if (
    elapsed < DAY
  ) {
    return `${Math.floor(
      elapsed / HOUR,
    )}h`;
  }


  if (
    elapsed < MONTH
  ) {
    return `${Math.floor(
      elapsed / DAY,
    )}d`;
  }


  if (
    elapsed < YEAR
  ) {
    return `${Math.floor(
      elapsed / MONTH,
    )}mo`;
  }


  return `${Math.floor(
    elapsed / YEAR,
  )}y`;
}


/* ============================================================================
   ABSOLUTE TIME
============================================================================ */

function formatAbsoluteTime(
  value?: string,
): string | undefined {

  if (!value) {
    return undefined;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }


  return date.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );
}


/* ============================================================================
   CURRENT USER ID
============================================================================ */

function getCurrentUserId(): string | null {

  if (
    typeof window === "undefined"
  ) {
    return null;
  }


  const token =
    localStorage.getItem(
      "token",
    );


  if (!token) {
    return null;
  }


  try {

    const parts =
      token.split(".");


    if (
      parts.length !== 3
    ) {
      return null;
    }


    const base64Payload =
      parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");


    const payload =
      JSON.parse(
        atob(
          base64Payload,
        ),
      );


    const id =
      payload?.sub ??
      payload?._id ??
      payload?.id;


    if (
      id === undefined ||
      id === null ||
      id === ""
    ) {
      return null;
    }


    return String(id);

  } catch {

    return null;

  }
}


/* ============================================================================
   AVATAR
============================================================================ */

function AvatarContent({
  name,
  photo,
}: {
  name: string;
  photo?: string;
}) {

  if (photo) {

    return (

      <div className="fk-avatar">

        <img
          src={photo}
          alt={
            name ||
            "User"
          }
        />

      </div>

    );

  }


  const initial =
    name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() ||
    "?";


  return (

    <div
      className="fk-avatar"
      aria-hidden="true"
    >
      {initial}
    </div>

  );

}


/* ============================================================================
   POST HEADER
============================================================================ */

export default function FockisPostHeader({

  user,

  userId,

  userPhoto,

  createdAt,

  menuOpen,

  canDelete,

  onMenu,

  onEdit,

  onDelete,

}: FockisPostHeaderProps) {


  /* ==========================================================================
     FOLLOW STATE
  ========================================================================== */

  const [
    isFollowing,
    setIsFollowing,
  ] = useState(false);


  const [
    followLoading,
    setFollowLoading,
  ] = useState(false);


  const [
    followVisible,
    setFollowVisible,
  ] = useState(false);


  /* ==========================================================================
     CURRENT USER
  ========================================================================== */

  const currentUserId =
    getCurrentUserId();


  const normalizedUserId =
    userId
      ? String(userId)
      : "";


  const isOwnPost =
    Boolean(
      currentUserId &&
      normalizedUserId &&
      currentUserId ===
        normalizedUserId,
    );


  /* ==========================================================================
     CHECK FOLLOW STATUS
  ========================================================================== */

  useEffect(() => {

    let cancelled = false;


    async function loadFollowStatus() {

      if (
        !normalizedUserId ||
        isOwnPost
      ) {

        if (!cancelled) {

          setFollowVisible(
            false,
          );

          setIsFollowing(
            false,
          );

        }

        return;

      }


      try {

        const status =
          await fockisFollowApi.getStatus(
            normalizedUserId,
          );


        if (cancelled) {
          return;
        }


        const following =
          Boolean(
            status?.isFollowing,
          );


        setIsFollowing(
          following,
        );


        setFollowVisible(
          !following,
        );

      } catch (error) {

        console.error(
          "Failed to load follow status:",
          error,
        );


        if (!cancelled) {

          setFollowVisible(
            false,
          );

        }

      }

    }


    void loadFollowStatus();


    return () => {

      cancelled = true;

    };

  }, [
    normalizedUserId,
    isOwnPost,
  ]);


  /* ==========================================================================
     FOLLOW USER
  ========================================================================== */

  async function handleFollow() {

    if (
      !normalizedUserId ||
      isOwnPost ||
      followLoading
    ) {
      return;
    }


    try {

      setFollowLoading(
        true,
      );


      await fockisFollowApi.follow(
        normalizedUserId,
      );


      setIsFollowing(
        true,
      );


      setFollowVisible(
        false,
      );

    } catch (error) {

      console.error(
        "Failed to follow user:",
        error,
      );

    } finally {

      setFollowLoading(
        false,
      );

    }

  }


  /* ==========================================================================
     TIME
  ========================================================================== */

  const relativeTime =
    formatRelativeTime(
      createdAt,
    );


  const absoluteTime =
    formatAbsoluteTime(
      createdAt,
    );


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (

    <header
      className="fk-post__header"
    >

      {/* ======================================================================
          AVATAR
      ====================================================================== */}

      {normalizedUserId ? (

        <Link
          to={`/profile/${normalizedUserId}`}
          aria-label={`View ${
            user ||
            "this user"
          }'s profile`}
        >

          <AvatarContent
            name={user}
            photo={userPhoto}
          />

        </Link>

      ) : (

        <AvatarContent
          name={user}
          photo={userPhoto}
        />

      )}


      {/* ======================================================================
          AUTHOR
      ====================================================================== */}

      <div
        className="fk-post__author-block"
      >

        <div
          className="fk-post__name-row"
        >

          {normalizedUserId ? (

            <Link
              to={`/profile/${normalizedUserId}`}
              className="fk-post__name"
            >
              {user ||
                "Unknown"}
            </Link>

          ) : (

            <span
              className="fk-post__name"
            >
              {user ||
                "Unknown"}
            </span>

          )}

        </div>


        <div
          className="fk-post__meta"
        >

          <time
            dateTime={createdAt}
            title={absoluteTime}
          >
            {relativeTime}
          </time>

        </div>

      </div>


      {/* ======================================================================
          FOLLOW BUTTON
      ====================================================================== */}

      {followVisible &&
        !isFollowing &&
        !isOwnPost &&
        normalizedUserId && (

        <button
          type="button"
          className="fk-post__follow-button"
          onClick={() =>
            void handleFollow()
          }
          disabled={
            followLoading
          }
          aria-label={`Follow ${
            user ||
            "user"
          }`}
        >

          {followLoading
            ? "Following..."
            : "Follow"}

        </button>

      )}


      {/* ======================================================================
          MORE MENU
      ====================================================================== */}

      <div
        className="fk-post__header-actions"
        style={{
          position: "relative",
        }}
      >

        <button
          type="button"
          className="fk-icon-btn"
          onClick={onMenu}
          aria-label="More options"
          aria-expanded={
            menuOpen
          }
          aria-haspopup="menu"
        >

          <IconMore
            size={18}
          />

        </button>


        {menuOpen &&
          canDelete && (

          <div
            className="fk-post-menu"
            role="menu"
          >

            {isOwnPost && (
              <button
                type="button"
                className="fk-post-menu__edit"
                onClick={onEdit}
                role="menuitem"
              >
                Edit post
              </button>
            )}

            <button
              type="button"
              className="fk-post-menu__delete"
              onClick={onDelete}
              role="menuitem"
            >
              Delete post
            </button>

          </div>

        )}

      </div>

    </header>

  );

}
