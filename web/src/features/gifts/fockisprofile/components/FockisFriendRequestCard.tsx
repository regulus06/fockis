import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import React from "react";
import { Check, UserPlus, X, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface FriendUser {
  _id?: string;
  id?: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  username?: string;

  avatar?: string;
  profileImage?: string;
  profilePicture?: string;

  location?: string;
  bio?: string;
}

interface FriendRequest {
  _id?: string;
  id?: string;

  requester?: FriendUser | string;
  receiver?: FriendUser | string;

  requesterId?: FriendUser | string;
  receiverId?: FriendUser | string;

  sender?: FriendUser | string;
  user?: FriendUser | string;

  status?: string;
}

interface Props {
  request: FriendRequest;
  accept: (id: string) => void;
  reject: (id: string) => void;
}

function getUserId(user: unknown): string {
  if (!user) return "";

  if (typeof user === "string") {
    return user;
  }

  if (typeof user === "object") {
    const value = user as FriendUser;
    return value._id || value.id || "";
  }

  return "";
}

function getUser(value: unknown): FriendUser | null {
  if (!value) return null;

  if (typeof value !== "object") {
    return null;
  }

  return value as FriendUser;
}

function getName(user: FriendUser | null): string {
  if (!user) {
    return "Unknown User";
  }

  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.fullName ||
    user.username ||
    "Unknown User"
  );
}

function getAvatar(user: FriendUser | null): string | null {
  return (
    user?.avatar ||
    user?.profileImage ||
    user?.profilePicture ||
    null
  );
}

function getInitial(user: FriendUser | null): string {
  return getName(user).charAt(0).toUpperCase();
}

function getImageUrl(src: string | null): string | null {
  if (!src) return null;

  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    FOCKIS_API_URL;

  if (src.startsWith("/")) {
    return `${apiUrl}${src}`;
  }

  return `${apiUrl}/${src}`;
}

export default function FockisFriendRequestCard({
  request,
  accept,
  reject,
}: Props) {
  const requestId =
    request._id ||
    request.id ||
    "";

  /*
   * IMPORTANT:
   *
   * Current backend returns:
   *
   * requester: populated user
   *
   * Older responses may use:
   *
   * requesterId
   * sender
   * user
   */
  const requesterValue =
    request.requester ??
    request.requesterId ??
    request.sender ??
    request.user;

  const requester =
    getUser(requesterValue);

  const userId =
    getUserId(requesterValue);

  const name =
    getName(requester);

  const username =
    requester?.username;

  const avatar =
    getImageUrl(
      getAvatar(requester),
    );

  const profilePath =
    userId
      ? `/profile/${userId}`
      : "#";

  return (
    <article className="fk-friend-request-card">

      {/* ============================================================ */}
      {/* PROFILE                                                       */}
      {/* ============================================================ */}

      <Link
        to={profilePath}
        className="fk-friend-request-card__profile"
        onClick={(event) => {
          if (!userId) {
            event.preventDefault();
          }
        }}
      >

        {/* AVATAR */}

        <div className="fk-friend-request-card__avatar-wrap">

          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="fk-friend-request-card__avatar"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";

                const fallback =
                  event.currentTarget
                    .parentElement
                    ?.querySelector(
                      ".fk-friend-request-card__avatar--fallback",
                    ) as HTMLElement | null;

                if (fallback) {
                  fallback.style.display =
                    "flex";
                }
              }}
            />
          ) : null}

          <div
            className="fk-friend-request-card__avatar fk-friend-request-card__avatar--fallback"
            style={{
              display: avatar ? "none" : "flex",
            }}
          >
            {getInitial(requester)}
          </div>

        </div>

        {/* USER INFORMATION */}

        <div className="fk-friend-request-card__info">

          <h3>
            {name}
          </h3>

          {username && (
            <span className="fk-friend-request-card__username">
              @{username}
            </span>
          )}

          {requester?.location && (
            <span className="fk-friend-request-card__location">
              <MapPin size={13} />
              {requester.location}
            </span>
          )}

          <p>
            <UserPlus size={14} />
            Wants to be your friend
          </p>

        </div>

      </Link>

      {/* ============================================================ */}
      {/* ACTIONS                                                       */}
      {/* ============================================================ */}

      <div className="fk-friend-request-card__actions">

        <button
          type="button"
          className="
            fk-friend-request-card__button
            fk-friend-request-card__button--accept
          "
          disabled={!requestId}
          onClick={() => {
            if (requestId) {
              accept(requestId);
            }
          }}
        >
          <Check size={17} />
          Accept
        </button>

        <button
          type="button"
          className="
            fk-friend-request-card__button
            fk-friend-request-card__button--reject
          "
          disabled={!requestId}
          onClick={() => {
            if (requestId) {
              reject(requestId);
            }
          }}
        >
          <X size={17} />
          Reject
        </button>

      </div>

    </article>
  );
}