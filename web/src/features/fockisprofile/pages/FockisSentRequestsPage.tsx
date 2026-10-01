import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Clock,
  UserRound,
  MapPin,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import { fockisFriendsApi } from "../service/fockisFriendsApi";

interface FriendRequestUser {
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

  requester?: FriendRequestUser | string;
  receiver?: FriendRequestUser | string;

  requesterId?:
    | string
    | FriendRequestUser;

  receiverId?:
    | string
    | FriendRequestUser;

  status?: string;
}

/* ============================================================================
   HELPERS
============================================================================ */

function getUser(
  value: unknown,
): FriendRequestUser | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  return value as FriendRequestUser;
}

function getUserId(
  value: unknown,
): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const user =
      value as FriendRequestUser;

    return (
      user._id ||
      user.id ||
      ""
    );
  }

  return "";
}

function getName(
  user: FriendRequestUser | null,
): string {
  if (!user) {
    return "Unknown";
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
    "Unknown"
  );
}

function getAvatar(
  user: FriendRequestUser | null,
): string | null {
  return (
    user?.avatar ||
    user?.profileImage ||
    user?.profilePicture ||
    null
  );
}

function getImageUrl(
  src: string | null,
): string | null {
  if (!src) {
    return null;
  }

  /*
   * Already an absolute URL.
   */
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

  /*
   * Backend upload such as:
   *
   * /uploads/profile/abc.jpg
   */
  if (src.startsWith("/")) {
    return `${apiUrl}${src}`;
  }

  return `${apiUrl}/${src}`;
}

/*
 * The backend normally returns:
 *
 * {
 *   requester: ...,
 *   receiver: ...,
 *   status: "pending"
 * }
 *
 * receiverId remains supported for older responses.
 */
function getReceiver(
  request: FriendRequest,
): FriendRequestUser | null {
  const populatedReceiver =
    getUser(request.receiver);

  if (populatedReceiver) {
    return populatedReceiver;
  }

  const receiverId =
    getUser(request.receiverId);

  if (receiverId) {
    return receiverId;
  }

  return null;
}

function getRequestId(
  request: FriendRequest,
): string {
  return (
    request._id ||
    request.id ||
    ""
  );
}

/* ============================================================================
   PAGE
============================================================================ */

export default function FockisSentRequestsPage() {
  const [
    requests,
    setRequests,
  ] = useState<FriendRequest[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  /* ==========================================================================
     LOAD SENT REQUESTS
  ========================================================================== */

  const load = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await fockisFriendsApi
            .getOutgoingRequests();

        setRequests(
          Array.isArray(response)
            ? (
                response as FriendRequest[]
              )
            : [],
        );
      } catch (err) {
        console.error(
          "[FOCKIS SENT REQUESTS] Failed to load:",
          err,
        );

        setRequests([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sent requests.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    void load();
  }, [load]);

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <div className="fk-friends-page">

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <header className="fk-friends-page__header">

        <div className="fk-friends-page__title-area">

          <div className="fk-friends-page__icon">
            <Clock size={26} />
          </div>

          <div>
            <h1>
              Sent Requests
            </h1>

            <p>
              Friend requests you have sent
              to other people.
            </p>
          </div>

        </div>

      </header>

      {/* ================================================================== */}
      {/* LOADING                                                            */}
      {/* ================================================================== */}

      {loading ? (

        <div className="fk-friends-empty">

          <p>
            Loading sent requests...
          </p>

        </div>

      ) : error ? (

        /* ================================================================ */
        /* ERROR                                                            */
        /* ================================================================ */

        <div className="fk-friends-empty">

          <h3>
            Unable to load requests
          </h3>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="fk-rail-card__btn fk-rail-card__btn--primary"
            onClick={() => {
              void load();
            }}
          >
            Try Again
          </button>

        </div>

      ) : requests.length === 0 ? (

        /* ================================================================ */
        /* EMPTY                                                            */
        /* ================================================================ */

        <div className="fk-friends-empty">

          <div
            className="fk-friends-empty__icon"
          >
            <UserRound size={32} />
          </div>

          <h3>
            No pending sent requests
          </h3>

          <p>
            Friend requests that you send
            will appear here.
          </p>

        </div>

      ) : (

        /* ================================================================ */
        /* REQUESTS                                                         */
        /* ================================================================ */

        <div className="fk-friend-requests-grid">

          {requests.map(
            (
              request,
              index,
            ) => {

              const receiver =
                getReceiver(request);

              const name =
                getName(receiver);

              const avatar =
                getImageUrl(
                  getAvatar(receiver),
                );

              const receiverId =
                getUserId(
                  request.receiver ??
                  request.receiverId,
                );

              const requestId =
                getRequestId(request);

              /*
               * Prefer the real database ID.
               *
               * The index is only a final fallback
               * for rendering.
               */
              const key =
                requestId ||
                `sent-request-${index}`;

              const profilePath =
                receiverId
                  ? `/profile/${receiverId}`
                  : "#";

              return (
                <article
                  key={key}
                  className="fk-rail-card fk-rail-card--suggestion"
                >

                  {/* ==================================================== */}
                  {/* CLICKABLE PROFILE                                    */}
                  {/* ==================================================== */}

                  <Link
                    to={profilePath}
                    className="fk-rail-card__profile-link"
                    onClick={(event) => {
                      if (!receiverId) {
                        event.preventDefault();
                      }
                    }}
                  >

                    {/* ================================================= */}
                    {/* AVATAR                                             */}
                    {/* ================================================= */}

                    <div className="fk-rail-card__photo">

                      {avatar ? (

                        <img
                          src={avatar}
                          alt={name}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";

                            const fallback =
                              event.currentTarget
                                .parentElement
                                ?.querySelector(
                                  ".fk-rail-card__initial",
                                ) as HTMLElement | null;

                            if (fallback) {
                              fallback.style.display =
                                "flex";
                            }
                          }}
                        />

                      ) : null}

                      <div
                        className="fk-rail-card__initial"
                        style={{
                          display: avatar
                            ? "none"
                            : "flex",
                        }}
                      >
                        {name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                    </div>

                    {/* ================================================= */}
                    {/* USER INFO                                         */}
                    {/* ================================================= */}

                    <div className="fk-rail-card__body">

                      <h3>
                        {name}
                      </h3>

                      {receiver?.username && (
                        <p className="fk-rail-card__meta">
                          @{receiver.username}
                        </p>
                      )}

                      {receiver?.location && (
                        <p className="fk-rail-card__meta">
                          <MapPin size={13} />
                          {receiver.location}
                        </p>
                      )}

                      <p className="fk-rail-card__meta">
                        Request pending
                      </p>

                    </div>

                  </Link>

                  {/* ==================================================== */}
                  {/* STATUS                                               */}
                  {/* ==================================================== */}

                  <div className="fk-rail-card__actions">

                    <span className="fk-rail-card__btn fk-rail-card__btn--ghost">

                      <Clock size={15} />

                      Pending

                    </span>

                  </div>

                </article>
              );
            },
          )}

        </div>

      )}

    </div>
  );
}