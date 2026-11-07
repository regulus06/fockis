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

import { Globe, Lock, Users } from "lucide-react";

import { useRelativeNow } from "../../hooks/useRelativeNow";

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

  /** Backend audience value: "public" | "friends" | "private". */
  audience?: string;

  menuOpen: boolean;

  canDelete: boolean;

  onMenu: () => void;

  onEdit: () => void;

  onDelete: () => void;

  /** Shown as "Report post" on other people's posts when provided. */
  onReport?: () => void;

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

const WEEK =
  7 * DAY;

/** Weeks are shown up to this age; older posts show their date. */
const MAX_WEEKS_MS =
  4 * WEEK;


/**
 * Facebook-style post age, always from the post's creation time:
 *   < 1 min   "Just now"
 *   < 1 h     "1m" … "59m"
 *   < 1 day   "1h" … "23h"
 *   < 1 week  "1d" … "6d"
 *   < 4 weeks "1w" … "3w"
 *   older     "Mar 5" (this year) or "Mar 5, 2025"
 *
 * `now` is optional so existing callers keep working; post headers pass
 * the shared 60-second clock (useRelativeNow) so labels stay current.
 */
export function formatRelativeTime(
  value?: string,
  now: number = Date.now(),
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


  // Small clock skew between server and device must not show "-1m".
  const elapsed =
    Math.max(
      now - date.getTime(),
      0,
    );


  if (elapsed < MINUTE) {
    return "Just now";
  }

  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m`;
  }

  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h`;
  }

  if (elapsed < WEEK) {
    return `${Math.floor(elapsed / DAY)}d`;
  }

  if (elapsed < MAX_WEEKS_MS) {
    return `${Math.floor(elapsed / WEEK)}w`;
  }


  const sameYear =
    date.getFullYear() ===
    new Date(now).getFullYear();


  return date.toLocaleDateString(
    undefined,
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}


/**
 * The post's age label. Subscribes to the shared clock itself, so only
 * this <time> element re-renders each minute, not the post card.
 */
function PostTime({
  createdAt,
  title,
}: {
  createdAt?: string;
  title?: string;
}) {

  const now =
    useRelativeNow();


  return (
    <time
      dateTime={createdAt}
      title={title}
    >
      {formatRelativeTime(
        createdAt,
        now,
      )}
    </time>
  );
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

  audience,

  menuOpen,

  canDelete,

  onMenu,

  onEdit,

  onDelete,

  onReport,

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


  // Signed-in viewers can report posts that aren't their own.
  const canReport =
    Boolean(
      onReport &&
      currentUserId &&
      normalizedUserId &&
      !isOwnPost,
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

  const absoluteTime =
    formatAbsoluteTime(
      createdAt,
    );


  /* ==========================================================================
     AUDIENCE (only shown when the backend sent one)
  ========================================================================== */

  const normalizedAudience =
    String(audience || "").toLowerCase();

  const audienceInfo =
    normalizedAudience === "public"
      ? { label: "Public", Icon: Globe }
      : normalizedAudience === "friends"
        ? { label: "Friends", Icon: Users }
        : normalizedAudience === "private"
          ? { label: "Only me", Icon: Lock }
          : null;


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

          <PostTime
            createdAt={createdAt}
            title={absoluteTime}
          />

          {audienceInfo && (
            <>
              <span
                className="fk-post__meta-dot"
                aria-hidden="true"
              />

              <span
                className="fk-post__audience"
                title={audienceInfo.label}
              >
                <audienceInfo.Icon aria-hidden="true" />
                {audienceInfo.label}
              </span>
            </>
          )}

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
          (canDelete || canReport) && (

          <div
            className="fk-post-menu"
            role="menu"
          >

            {canDelete && isOwnPost && (
              <button
                type="button"
                className="fk-post-menu__edit"
                onClick={onEdit}
                role="menuitem"
              >
                Edit post
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="fk-post-menu__delete"
                onClick={onDelete}
                role="menuitem"
              >
                Delete post
              </button>
            )}

            {canReport && (
              <button
                type="button"
                className="fk-post-menu__edit fk-post-menu__report"
                onClick={onReport}
                role="menuitem"
              >
                Report post
              </button>
            )}

          </div>

        )}

      </div>

    </header>

  );

}
