import React from "react";
import { MessageCircle } from "lucide-react";

import { useFockisFriends } from "../../hooks/useFockisFriends";
import FockisRail from "../../../../components/fockis/rails/FockisRail";

interface Props {
  currentUserId?: string;
}

export default function FockisMyFriendsRail({ currentUserId }: Props) {
  const { friends } = useFockisFriends(currentUserId);

  if (!friends || friends.length === 0) {
    return null;
  }

  return (
    <FockisRail title="My Friends" seeAllHref="/friends">
      {friends.map((friend) => (
        <article key={friend.id} className="fk-rail-card fk-rail-card--friend">
          <div className="fk-rail-card__avatar-wrap">
            {friend.avatar ? (
              <img
                src={friend.avatar}
                alt={friend.fullName}
                className="fk-rail-card__avatar"
              />
            ) : (
              <div className="fk-rail-card__avatar fk-rail-card__initial">
                {friend.fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h3 className="fk-rail-card__friend-name">{friend.fullName}</h3>

          <div className="fk-rail-card__actions fk-rail-card__actions--friend">
            <button
              type="button"
              className="fk-rail-card__btn fk-rail-card__btn--primary"
            >
              <MessageCircle size={14} />
              Message
            </button>
          </div>
        </article>
      ))}
    </FockisRail>
  );
}