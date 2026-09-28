import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ShieldBan,
  ShieldOff,
  User,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

import { Link } from "react-router-dom";

import fockisFriendsApi from "../service/fockisFriendsApi";

import "../../../styles/FockisFriendsPage.scss";

/* ============================================================================
   TYPES
============================================================================ */

interface BlockedUser {
  _id?: string;
  id?: string;

  username?: string;
  firstName?: string;
  lastName?: string;
  name?: string;

  profilePicture?: string;
  profileImage?: string;
  avatar?: string;

  fockisId?: string;

  email?: string;
}

/* ============================================================================
   HELPERS
============================================================================ */

function getUserId(
  user: BlockedUser,
): string {
  return String(
    user.id ??
      user._id ??
      "",
  );
}

function getDisplayName(
  user: BlockedUser,
): string {
  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.name ||
    user.username ||
    "Fockis User"
  );
}

function getUsername(
  user: BlockedUser,
): string {
  if (user.username) {
    return `@${user.username}`;
  }

  return "";
}

function getAvatar(
  user: BlockedUser,
): string | null {
  const value =
    user.profilePicture ??
    user.profileImage ??
    user.avatar ??
    null;

  if (!value) {
    return null;
  }

  return String(value);
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function FockisBlockedUsersPage() {
  const [
    blockedUsers,
    setBlockedUsers,
  ] = useState<BlockedUser[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    unblockingId,
    setUnblockingId,
  ] = useState<string | null>(null);

  /* ==========================================================================
     LOAD BLOCKED USERS
  ========================================================================== */

  const loadBlockedUsers =
    useCallback(
      async (
        isRefresh = false,
      ): Promise<void> => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          console.log(
            "[FOCKIS BLOCKED USERS] LOADING",
          );

          /*
           * The backend endpoint is:
           *
           * GET /friends/blocked
           *
           * The service returns the populated receiver
           * for every relationship where blockedBy = current user.
           */
          const users =
            await fockisFriendsApi.getBlockedUsers();

          const normalized =
            Array.isArray(users)
              ? users
              : [];

          console.log(
            "[FOCKIS BLOCKED USERS] LOADED",
            {
              count:
                normalized.length,
              users:
                normalized.map(
                  (user: any) => ({
                    id:
                      user?._id ??
                      user?.id ??
                      null,
                    username:
                      user?.username ??
                      null,
                  }),
                ),
            },
          );

          setBlockedUsers(
            normalized as BlockedUser[],
          );
        } catch (err) {
          console.error(
            "[FOCKIS BLOCKED USERS] LOAD FAILED",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load blocked users.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {
    void loadBlockedUsers();
  }, [
    loadBlockedUsers,
  ]);

  /* ==========================================================================
     UNBLOCK USER
  ========================================================================== */

  const handleUnblock =
    useCallback(
      async (
        user: BlockedUser,
      ): Promise<void> => {
        const userId =
          getUserId(user);

        if (
          !userId ||
          unblockingId
        ) {
          return;
        }

        const displayName =
          getDisplayName(user);

        const confirmed =
          window.confirm(
            `Unblock ${displayName}?`,
          );

        if (!confirmed) {
          return;
        }

        try {
          setUnblockingId(
            userId,
          );

          setError(null);

          console.log(
            "[FOCKIS BLOCKED USERS] UNBLOCK",
            {
              userId,
              displayName,
            },
          );

          /*
           * Uses:
           *
           * DELETE /friends/:userId/block
           */
          await fockisFriendsApi.unblockUser(
            userId,
          );

          console.log(
            "[FOCKIS BLOCKED USERS] UNBLOCK SUCCESS",
            {
              userId,
            },
          );

          /*
           * Remove immediately from the page.
           * This makes the UI feel instant instead of requiring
           * another page refresh.
           */
          setBlockedUsers(
            (current) =>
              current.filter(
                (item) =>
                  getUserId(item) !==
                  userId,
              ),
          );
        } catch (err) {
          console.error(
            "[FOCKIS BLOCKED USERS] UNBLOCK FAILED",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to unblock this user.",
          );
        } finally {
          setUnblockingId(null);
        }
      },
      [
        unblockingId,
      ],
    );

  /* ==========================================================================
     LOADING
  ========================================================================== */

  if (loading) {
    return (
      <div className="fk-friends-page">
        <header className="fk-friends-page__header">
          <div className="fk-friends-page__title-area">
            <div className="fk-friends-page__icon">
              <ShieldBan
                size={26}
              />
            </div>

            <div>
              <h1>
                Blocked Users
              </h1>

              <p>
                Manage people you have
                blocked on Fockis.
              </p>
            </div>
          </div>
        </header>

        <div className="fk-friends-empty">
          <Loader2
            size={28}
            className="animate-spin"
          />

          <h3>
            Loading blocked users...
          </h3>

          <p>
            Please wait while Fockis
            loads your blocked users.
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================================
     PAGE
  ========================================================================== */

  return (
    <div className="fk-friends-page">
      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <header className="fk-friends-page__header">
        <div className="fk-friends-page__title-area">
          <div className="fk-friends-page__icon">
            <ShieldBan
              size={26}
            />
          </div>

          <div>
            <h1>
              Blocked Users
            </h1>

            <p>
              Manage people you have
              blocked on Fockis.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadBlockedUsers(
              true,
            )
          }
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh blocked users"
        >
          {refreshing ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <RefreshCw
              size={16}
            />
          )}

          Refresh
        </button>
      </header>

      {/* ================================================================== */}
      {/* ERROR                                                             */}
      {/* ================================================================== */}

      {error && (
        <div
          role="alert"
          className="fk-friends-error"
        >
          <strong>
            Unable to load blocked users
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadBlockedUsers(
                true,
              )
            }
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            <RefreshCw
              size={16}
            />

            Try Again
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* EMPTY                                                             */}
      {/* ================================================================== */}

      {!error &&
        blockedUsers.length === 0 && (
          <div className="fk-friends-empty">
            <ShieldOff
              size={42}
            />

            <h3>
              No blocked users
            </h3>

            <p>
              You are not currently
              blocking anyone on Fockis.
            </p>

            <Link
              to="/friends"
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              <User
                size={16}
              />

              Find Friends
            </Link>
          </div>
        )}

      {/* ================================================================== */}
      {/* BLOCKED USERS LIST                                                */}
      {/* ================================================================== */}

      {blockedUsers.length > 0 && (
        <section className="fk-friends-list">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2>
                Blocked People
              </h2>

              <p>
                {blockedUsers.length}{" "}
                {blockedUsers.length ===
                1
                  ? "person"
                  : "people"}{" "}
                blocked
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {blockedUsers.map(
              (user, index) => {
                const userId =
                  getUserId(user);

                const displayName =
                  getDisplayName(
                    user,
                  );

                const username =
                  getUsername(
                    user,
                  );

                const avatar =
                  getAvatar(user);

                const isUnblocking =
                  unblockingId ===
                  userId;

                /*
                 * Avoid rendering a broken profile link
                 * if an old database record has no ID.
                 */
                const profileHref =
                  userId
                    ? `/profile/${encodeURIComponent(
                        userId,
                      )}`
                    : "#";

                return (
                  <article
                    key={
                      userId ||
                      `${displayName}-${index}`
                    }
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    {/* -------------------------------------------------- */}
                    {/* USER                                                */}
                    {/* -------------------------------------------------- */}

                    <div className="flex min-w-0 items-center gap-3">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={
                            displayName
                          }
                          className="h-12 w-12 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200">
                          <User
                            size={22}
                          />
                        </div>
                      )}

                      <div className="min-w-0">
                        {userId ? (
                          <Link
                            to={
                              profileHref
                            }
                            className="font-semibold hover:underline"
                          >
                            {
                              displayName
                            }
                          </Link>
                        ) : (
                          <span className="font-semibold">
                            {
                              displayName
                            }
                          </span>
                        )}

                        {username && (
                          <p className="text-sm opacity-70">
                            {
                              username
                            }
                          </p>
                        )}

                        {user.fockisId && (
                          <p className="text-xs opacity-60">
                            Fockis ID:{" "}
                            {
                              user.fockisId
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* -------------------------------------------------- */}
                    {/* ACTIONS                                              */}
                    {/* -------------------------------------------------- */}

                    <div className="flex shrink-0 items-center gap-2">
                      {userId && (
                        <Link
                          to={
                            profileHref
                          }
                          title={`View ${displayName}'s profile`}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 p-2 hover:bg-gray-100"
                        >
                          <ExternalLink
                            size={16}
                          />
                        </Link>
                      )}

                      <button
                        type="button"
                        disabled={
                          isUnblocking
                        }
                        onClick={() =>
                          void handleUnblock(
                            user,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUnblocking ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <ShieldOff
                            size={16}
                          />
                        )}

                        {isUnblocking
                          ? "Unblocking..."
                          : "Unblock"}
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </section>
      )}
    </div>
  );
}