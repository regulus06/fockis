import React from "react";

import {
  Check,
  UserPlus,
} from "lucide-react";

import {
  useFockisFriendSuggestions,
} from "../hooks/useFockisFriendSuggestions";

import FockisMutualFriends from "./FockisMutualFriends";

export default function FockisFriendSuggestionsList() {
  const {
    suggestions,
    sentIds,
    sendRequest,
  } = useFockisFriendSuggestions();

  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="friends-grid">
      {suggestions.map((user) => {
        const sent =
          sentIds.has(user.id);

        const avatar =
          user.avatar ||
          user.profilePicture ||
          "";

        return (
          <div
            key={user.id}
            className="friend-card"
          >
            {/* ============================================================
                AVATAR
            ============================================================ */}

            <div className="friend-card__avatar">
              {avatar ? (
                <img
                  src={avatar}
                  alt={user.fullName}
                  className="friend-card__avatar-image"
                />
              ) : (
                <div className="friend-card__avatar-placeholder">
                  {user.fullName
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            {/* ============================================================
                USER INFO
            ============================================================ */}

            <div className="friend-card__info">
              <h3>
                {user.fullName}
              </h3>

              {user.username && (
                <p>
                  @{user.username}
                </p>
              )}

              {typeof user.mutualFriends ===
                "number" &&
                user.mutualFriends >
                  0 && (
                  <FockisMutualFriends
                    count={
                      user.mutualFriends
                    }
                  />
                )}
            </div>

            {/* ============================================================
                ACTION
            ============================================================ */}

            <button
              type="button"
              className={
                sent
                  ? "friend-card__button friend-card__button--sent"
                  : "friend-card__button"
              }
              disabled={sent}
              onClick={() => {
                void sendRequest(
                  user.id,
                );
              }}
            >
              {sent ? (
                <>
                  <Check
                    size={17}
                    strokeWidth={2.5}
                  />

                  <span>
                    Request Sent
                  </span>
                </>
              ) : (
                <>
                  <UserPlus
                    size={17}
                    strokeWidth={2.5}
                  />

                  <span>
                    Add Friend
                  </span>
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}