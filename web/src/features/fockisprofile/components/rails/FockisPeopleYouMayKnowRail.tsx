import React from "react";
import { UserPlus, Check, X } from "lucide-react";

import { useFockisFriendSuggestions } from "../../hooks/useFockisFriendSuggestions";
import FockisRail from "../../../../components/fockis/rails/FockisRail";

export default function FockisPeopleYouMayKnowRail() {
  const { suggestions, sentIds, sendRequest, dismiss } =
    useFockisFriendSuggestions();

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <FockisRail title="People You May Know" seeAllHref="/friends/suggestions">
      {suggestions.map((user) => {
        const sent = sentIds.has(user.id);

        return (
          <article
            key={user.id}
            className="fk-rail-card fk-rail-card--suggestion"
          >
            <button
              type="button"
              className="fk-rail-card__dismiss"
              onClick={() => dismiss(user.id)}
              aria-label="Remove suggestion"
            >
              <X size={14} />
            </button>

            <div className="fk-rail-card__photo">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} />
              ) : (
                <div className="fk-rail-card__initial">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="fk-rail-card__body">
              <h3>{user.fullName}</h3>

              {typeof user.mutualFriends === "number" &&
                user.mutualFriends > 0 && (
                  <p className="fk-rail-card__meta">
                    {user.mutualFriends} mutual friend
                    {user.mutualFriends === 1 ? "" : "s"}
                  </p>
                )}
            </div>

            <div className="fk-rail-card__actions">
              <button
                type="button"
                className={`fk-rail-card__btn fk-rail-card__btn--primary ${
                  sent ? "fk-rail-card__btn--sent" : ""
                }`}
                disabled={sent}
                onClick={() => void sendRequest(user.id)}
              >
                {sent ? (
                  <>
                    <Check size={15} />
                    Request Sent
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    Add Friend
                  </>
                )}
              </button>
            </div>
          </article>
        );
      })}
    </FockisRail>
  );
}