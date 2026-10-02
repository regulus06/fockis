import React, { useEffect } from "react";
import { Check, X } from "lucide-react";

import { useFockisFriends } from "../../hooks/useFockisFriends";
import FockisRail from "../../../../components/fockis/rails/FockisRail";

function getRequesterName(requesterId: any): string {
  if (!requesterId || typeof requesterId === "string") {
    return "Unknown";
  }

  const full = [requesterId.firstName, requesterId.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    full ||
    requesterId.fullName ||
    requesterId.username ||
    "Unknown"
  );
}

function getRequesterAvatar(requesterId: any): string | undefined {
  if (!requesterId || typeof requesterId === "string") {
    return undefined;
  }

  return requesterId.avatar || requesterId.profileImage;
}

export default function FockisFriendRequestsRail() {
  const {
    incomingRequests,
    acceptRequest,
    rejectRequest,
    reloadRequests,
  } = useFockisFriends();

  useEffect(() => {
    void reloadRequests();
  }, [reloadRequests]);

  if (!incomingRequests || incomingRequests.length === 0) {
    return null;
  }

  return (
    <FockisRail title="Friend Requests" seeAllHref="/friends/requests">
      {incomingRequests.map((request) => {
        const name = getRequesterName(request.requesterId);
        const avatar = getRequesterAvatar(request.requesterId);

        return (
          <article
            key={request._id}
            className="fk-rail-card fk-rail-card--request"
          >
            <div className="fk-rail-card__photo">
              {avatar ? (
                <img src={avatar} alt={name} />
              ) : (
                <div className="fk-rail-card__initial">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="fk-rail-card__body">
              <h3>{name}</h3>
            </div>

            <div className="fk-rail-card__actions">
              <button
                type="button"
                className="fk-rail-card__btn fk-rail-card__btn--primary"
                onClick={() => void acceptRequest(request._id)}
              >
                <Check size={15} />
                Confirm
              </button>

              <button
                type="button"
                className="fk-rail-card__btn fk-rail-card__btn--ghost"
                onClick={() => void rejectRequest(request._id)}
              >
                <X size={15} />
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </FockisRail>
  );
}