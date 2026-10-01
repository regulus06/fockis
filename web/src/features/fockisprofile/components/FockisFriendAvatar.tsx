import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import React, { useState } from "react";

interface Props {
  user: any;
  size?: number;
  className?: string;
  square?: boolean;
}

function getInitial(user: any): string {
  const first =
    user?.firstName ||
    user?.fullName ||
    user?.username ||
    "?";

  return first
    .charAt(0)
    .toUpperCase();
}

function getAvatarSource(user: any): string | null {
  return (
    user?.avatar ||
    user?.profileImage ||
    user?.profilePicture ||
    null
  );
}

function getImageUrl(src: string | null): string | null {
  if (!src) {
    return null;
  }

  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return src;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    FOCKIS_API_URL;

  if (src.startsWith("/")) {
    return `${apiUrl}${src}`;
  }

  return `${apiUrl}/${src}`;
}

export default function FockisFriendAvatar({
  user,
  size = 50,
  className = "",
  square = false,
}: Props) {
  const [failed, setFailed] =
    useState(false);

  const src =
    getImageUrl(
      getAvatarSource(user),
    );

  const borderRadius =
    square ? 0 : "50%";

  if (!src || failed) {
    return (
      <div
        className={`fk-avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {getInitial(user)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={
        user?.firstName ||
        user?.fullName ||
        user?.username ||
        "avatar"
      }
      className={className}
      onError={() => {
        setFailed(true);
      }}
      style={{
        width: size,
        height: size,
        borderRadius,
        objectFit: "cover",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}