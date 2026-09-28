import React from "react";

import FockisFriendRequestCard from "./FockisFriendRequestCard";

interface Props {
  requests: any[];
  accept: (id: string) => void;
  reject: (id: string) => void;
}

export default function FockisFriendRequestsList({
  requests,
  accept,
  reject,
}: Props) {
  if (!requests.length) {
    return null;
  }

  return (
    <div className="fk-friend-requests-list">

      {requests.map((request, index) => {
        const key =
          request?._id ??
          request?.id ??
          `friend-request-${index}`;

        return (
          <FockisFriendRequestCard
            key={key}
            request={request}
            accept={accept}
            reject={reject}
          />
        );
      })}

    </div>
  );
}