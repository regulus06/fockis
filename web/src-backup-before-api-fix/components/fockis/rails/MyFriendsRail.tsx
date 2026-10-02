import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Users,
} from "lucide-react";

import {
  fockisFriendsApi,
} from "../../../features/fockisprofile/service/fockisFriendsApi";

import FockisRail from "./FockisRail";

interface Friend {
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
}

function getName(
  friend: Friend,
): string {
  const fullName = [
    friend.firstName,
    friend.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    friend.username ||
    "Unknown"
  );
}

function getAvatar(
  friend: Friend,
): string {
  return (
    friend.avatar ||
    friend.profilePicture ||
    ""
  );
}

export default function MyFriendsRail() {
  const [
    friends,
    setFriends,
  ] = useState<Friend[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ============================================================
  // LOAD MY FRIENDS
  // ============================================================

  const loadFriends =
    useCallback(async () => {
      try {
        setLoading(true);

        const response =
          await fockisFriendsApi.getMyFriends(
            1,
            20,
          );

        /*
         * Supports:
         *
         * [
         *   friend,
         *   friend
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
         *   friends: [...]
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
                (response as any)?.friends,
              )
            ? (response as any).friends
            : [];

        setFriends(data);
      } catch (error) {
        console.error(
          "[MyFriendsRail] Failed to load friends:",
          error,
        );

        setFriends([]);
      } finally {
        setLoading(false);
      }
    }, []);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    void loadFriends();
  }, [loadFriends]);

  // ============================================================
  // NOTHING TO DISPLAY
  // ============================================================

  if (
    !loading &&
    friends.length === 0
  ) {
    return null;
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <FockisRail
      title="My Friends"
      seeAllHref="/friends"
    >
      {loading ? (
        <div className="fk-rail-card">
          <div className="fk-rail-card__body">
            <p className="fk-rail-card__meta">
              Loading friends...
            </p>
          </div>
        </div>
      ) : (
        friends.map((friend) => {
          const friendId =
            friend._id ||
            friend.id ||
            "";

          const name =
            getName(friend);

          const avatar =
            getAvatar(friend);

          return (
            <article
              key={friendId}
              className="fk-rail-card"
            >
              {/* ====================================================
                  AVATAR
                  ==================================================== */}

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

              {/* ====================================================
                  FRIEND INFORMATION
                  ==================================================== */}

              <div className="fk-rail-card__body">
                <h3>
                  {name}
                </h3>

                {friend.username &&
                  friend.username !==
                    name && (
                    <p className="fk-rail-card__meta">
                      @{friend.username}
                    </p>
                  )}

                {friend.verified && (
                  <p className="fk-rail-card__meta">
                    Verified
                  </p>
                )}
              </div>
            </article>
          );
        })
      )}

      {/* ==========================================================
          FRIEND COUNT
          ========================================================== */}

      {!loading &&
        friends.length > 0 && (
          <div className="fk-rail-card__footer">
            <Users
              size={15}
            />

            <span>
              {friends.length}{" "}
              {friends.length === 1
                ? "friend"
                : "friends"}
            </span>
          </div>
        )}
    </FockisRail>
  );
}