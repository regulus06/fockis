import React from "react";

interface Props {
  count?: number;
  avatars?: string[];
}

export default function FockisMutualFriends({ count = 0, avatars = [] }: Props) {
  if (!count) {
    return null;
  }

  return (
    <div className="mutual-friends">
      {avatars.length > 0 && (
        <div className="mutual-friends__stack">
          {avatars.slice(0, 3).map((src, index) => (
            <img
              key={index}
              src={src}
              alt=""
              className="mutual-friends__avatar"
            />
          ))}
        </div>
      )}

      <span className="mutual-friends__label">
        {count} mutual friend{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}