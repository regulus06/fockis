import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  UserPlus,
  UserCheck,
  Clock,
  X,
} from "lucide-react";

import {
  fockisFriendsApi,
} from "../../../features/gifts/fockisprofile/service/fockisFriendsApi";

import FockisRail from "./FockisRail";

/*
 * ============================================================================
 * TYPES
 * ============================================================================
 */

interface SuggestedUser {
  _id?: string;
  id?: string;

  username?: string;
  firstName?: string;
  lastName?: string;

  avatar?: string;
  profilePicture?: string;

  verified?: boolean;
  premium?: boolean;
  accountType?: string;

  mutualFriendsCount?: number;

  friendshipStatus?:
    | "none"
    | "pending"
    | "accepted"
    | "rejected"
    | "blocked"
    | "self";

  friendshipDirection?:
    | "incoming"
    | "outgoing"
    | null;
}

/*
 * ============================================================================
 * HELPERS
 * ============================================================================
 */

function getUserId(
  user: SuggestedUser,
): string {
  return String(
    user._id ||
      user.id ||
      "",
  );
}

function getName(
  user: SuggestedUser,
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
    user.username ||
    "Unknown"
  );
}

function getAvatar(
  user: SuggestedUser,
): string {
  return (
    user.avatar ||
    user.profilePicture ||
    ""
  );
}

/*
 * ============================================================================
 * PEOPLE YOU MAY KNOW RAIL
 * ============================================================================
 */

export default function PeopleYouMayKnowRail() {
  const [
    suggestions,
    setSuggestions,
  ] = useState<SuggestedUser[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    dismissed,
    setDismissed,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null,
  );

  /*
   * ========================================================================
   * LOAD SUGGESTIONS
   * ========================================================================
   */

  const loadSuggestions =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await fockisFriendsApi.getSuggestions(
            1,
            20,
          );

        /*
         * API may return:
         *
         * [
         *   ...
         * ]
         *
         * OR:
         *
         * {
         *   data: [...]
         * }
         *
         * OR:
         *
         * {
         *   suggestions: [...]
         * }
         */

        const data =
          Array.isArray(response)
            ? response
            : Array.isArray(
                (response as any)?.data,
              )
            ? (response as any).data
            : Array.isArray(
                (response as any)?.suggestions,
              )
            ? (response as any).suggestions
            : [];

        setSuggestions(
          data as SuggestedUser[],
        );
      } catch (error) {
        console.error(
          "[PeopleYouMayKnowRail] Failed to load suggestions:",
          error,
        );

        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, []);

  /*
   * ========================================================================
   * INITIAL LOAD
   * ========================================================================
   */

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  /*
   * ========================================================================
   * DISMISS SUGGESTION
   * ========================================================================
   */

  const handleDismiss =
    useCallback(
      (userId: string) => {
        if (!userId) {
          return;
        }

        setDismissed(
          (current) => {
            const next =
              new Set(current);

            next.add(userId);

            return next;
          },
        );
      },
      [],
    );

  /*
   * ========================================================================
   * SEND FRIEND REQUEST
   * ========================================================================
   */

  const handleAddFriend =
    useCallback(
      async (
        userId: string,
      ) => {
        if (
          !userId ||
          processingId
        ) {
          return;
        }

        try {
          setProcessingId(userId);

          await fockisFriendsApi.sendRequest(
            userId,
          );

          /*
           * Update the local suggestion instead
           * of removing it immediately.
           */

          setSuggestions(
            (current) =>
              current.map(
                (user) => {
                  if (
                    getUserId(user) !==
                    userId
                  ) {
                    return user;
                  }

                  return {
                    ...user,
                    friendshipStatus:
                      "pending",
                    friendshipDirection:
                      "outgoing",
                  };
                },
              ),
          );
        } catch (error) {
          console.error(
            "[PeopleYouMayKnowRail] Failed to send friend request:",
            error,
          );
        } finally {
          setProcessingId(null);
        }
      },
      [processingId],
    );

  /*
   * ========================================================================
   * VISIBLE SUGGESTIONS
   * ========================================================================
   */

  const visibleSuggestions =
    suggestions.filter(
      (user) => {
        const id =
          getUserId(user);

        return (
          id &&
          !dismissed.has(id)
        );
      },
    );

  /*
   * ========================================================================
   * NOTHING TO SHOW
   * ========================================================================
   */

  if (
    !loading &&
    visibleSuggestions.length === 0
  ) {
    return null;
  }

  /*
   * ========================================================================
   * RENDER
   * ========================================================================
   */

  return (
    <FockisRail
      title="People You May Know"
      seeAllHref="/friends/suggestions"
    >
      {loading ? (
        <div className="fk-rail-card fk-rail-card--suggestion">
          <div className="fk-rail-card__body">
            <p className="fk-rail-card__meta">
              Loading suggestions...
            </p>
          </div>
        </div>
      ) : (
        visibleSuggestions.map(
          (user) => {
            const userId =
              getUserId(user);

            const name =
              getName(user);

            const avatar =
              getAvatar(user);

            const isProcessing =
              processingId ===
              userId;

            const status =
              user.friendshipStatus ||
              "none";

            const direction =
              user.friendshipDirection;

            /*
             * ==============================================================
             * BUTTON STATE
             * ==============================================================
             */

            const isFriend =
              status ===
              "accepted";

            const isPending =
              status ===
                "pending" &&
              direction ===
                "outgoing";

            const isIncoming =
              status ===
                "pending" &&
              direction ===
                "incoming";

            const isBlocked =
              status ===
              "blocked";

            return (
              <article
                key={userId}
                className="fk-rail-card fk-rail-card--suggestion"
              >
                {/* ======================================================
                    DISMISS
                    ====================================================== */}

                <button
                  type="button"
                  className="fk-rail-card__dismiss"
                  onClick={() =>
                    handleDismiss(
                      userId,
                    )
                  }
                  aria-label={`Dismiss ${name}`}
                >
                  <X size={14} />
                </button>

                {/* ======================================================
                    AVATAR
                    ====================================================== */}

                <div className="fk-rail-card__photo">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                    />
                  ) : (
                    <div className="fk-rail-card__initial">
                      {name
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                {/* ======================================================
                    USER INFORMATION
                    ====================================================== */}

                <div className="fk-rail-card__body">
                  <h3>
                    {name}
                  </h3>

                  {user.username &&
                    user.username !==
                      name && (
                      <p className="fk-rail-card__meta">
                        @{user.username}
                      </p>
                    )}

                  {typeof user.mutualFriendsCount ===
                    "number" &&
                    user.mutualFriendsCount >
                      0 && (
                      <p className="fk-rail-card__meta">
                        {
                          user.mutualFriendsCount
                        }{" "}
                        mutual friend
                        {user.mutualFriendsCount ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    )}
                </div>

                {/* ======================================================
                    ACTION
                    ====================================================== */}

                <div className="fk-rail-card__actions">
                  {isFriend ? (
                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--ghost"
                      disabled
                    >
                      <UserCheck
                        size={15}
                      />
                      Friends
                    </button>
                  ) : isPending ? (
                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--ghost"
                      disabled
                    >
                      <Clock
                        size={15}
                      />
                      Requested
                    </button>
                  ) : isIncoming ? (
                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--primary"
                      disabled
                    >
                      <Clock
                        size={15}
                      />
                      Pending
                    </button>
                  ) : isBlocked ? (
                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--ghost"
                      disabled
                    >
                      Blocked
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="fk-rail-card__btn fk-rail-card__btn--primary"
                      disabled={
                        isProcessing
                      }
                      onClick={() =>
                        void handleAddFriend(
                          userId,
                        )
                      }
                    >
                      <UserPlus
                        size={15}
                      />

                      {isProcessing
                        ? "..."
                        : "Add Friend"}
                    </button>
                  )}
                </div>
              </article>
            );
          },
        )
      )}
    </FockisRail>
  );
}
