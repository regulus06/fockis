import React from "react";

export default function FockisFriendCounter({ count }: { count: number }) {
  return (
    <div className="fk-friend-counter">
      <strong>{count}</strong> {count === 1 ? "Friend" : "Friends"}
    </div>
  );
}