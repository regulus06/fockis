import { FOCKIS_API_URL } from "../../../../config/fockisConfig";

import { Link } from "react-router-dom";

import type {
  FockisFriend,
} from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfileFriends.scss";

interface Props {
  friends: FockisFriend[];
}

/**
 * Get the actual user ID from the friend object.
 *
 * Supports both:
 * - id
 * - _id
 */
function getFriendId(friend: FockisFriend): string {
  const value =
    friend.id ??
    (friend as FockisFriend & { _id?: string })._id;

  return typeof value === "string" ? value : "";
}

/**
 * Get the profile image from all supported backend/frontend fields.
 *
 * Backend may use:
 * - profilePicture
 *
 * Older/frontend objects may use:
 * - avatar
 * - profileImage
 */
function getProfileImage(friend: FockisFriend): string {
  const extendedFriend = friend as FockisFriend & {
    _id?: string;
    profilePicture?: unknown;
    profileImage?: unknown;
    avatar?: unknown;
  };

  const possibleImages = [
    extendedFriend.profilePicture,
    extendedFriend.avatar,
    extendedFriend.profileImage,
  ];

  for (const value of possibleImages) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    // Handles cases where an image is returned as an object
    // such as { url: "..." } or { path: "..." }.
    if (
      value &&
      typeof value === "object"
    ) {
      const imageObject = value as {
        url?: unknown;
        path?: unknown;
        filename?: unknown;
        fileName?: unknown;
      };

      const objectValue =
        imageObject.url ??
        imageObject.path ??
        imageObject.filename ??
        imageObject.fileName;

      if (
        typeof objectValue === "string" &&
        objectValue.trim()
      ) {
        return objectValue.trim();
      }
    }
  }

  return "";
}

/**
 * Convert the backend image value into a browser URL.
 */
function getImageUrl(image: string): string {
  if (!image) {
    return "";
  }

  // Already a complete URL.
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("blob:") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  const apiUrl =
    import.meta.env.VITE_API_URL ||
    FOCKIS_API_URL;

  const baseUrl = apiUrl.replace(/\/+$/, "");

  // Backend already returned /uploads/...
  if (image.startsWith("/")) {
    return `${baseUrl}${image}`;
  }

  // Backend returned uploads/...
  if (image.startsWith("uploads/")) {
    return `${baseUrl}/${image}`;
  }

  // Backend returned only the filename.
  return `${baseUrl}/uploads/${image}`;
}

export default function FockisProfileFriends({
  friends,
}: Props) {
  if (!friends || friends.length === 0) {
    return (
      <div className="fk-profile-friends__empty">
        No friends found.
      </div>
    );
  }

  return (
    <section className="fk-profile-friends">
      <h3>Friends</h3>

      <div className="fk-profile-friends__grid">
        {friends.map((friend) => {
          const friendId = getFriendId(friend);

          const profilePath = friendId
            ? `/profile/${friendId}`
            : "/profile";

          const fullName =
            friend.fullName ||
            "";

          const username =
            friend.username ||
            "";

          const displayName =
            fullName ||
            username ||
            "Fockis User";

          const initial =
            displayName
              .charAt(0)
              .toUpperCase() ||
            "F";

          const imageValue =
            getProfileImage(friend);

          const imageUrl =
            getImageUrl(imageValue);

          return (
            <div
              key={
                friendId ||
                username ||
                displayName
              }
              className="fk-profile-friend"
            >
              <Link
                to={profilePath}
                className="fk-profile-friend__link"
                aria-label={`View ${displayName}'s profile`}
              >
                <div className="fk-profile-friend__avatar">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={displayName}
                      onError={(event) => {
                        console.error(
                          "[FOCKIS FRIENDS] PROFILE IMAGE FAILED:",
                          {
                            friendId,
                            displayName,
                            imageValue,
                            imageUrl,
                          },
                        );

                        event.currentTarget.style.display =
                          "none";

                        const fallback =
                          event.currentTarget
                            .nextElementSibling;

                        if (
                          fallback instanceof HTMLElement
                        ) {
                          fallback.style.display =
                            "flex";
                        }
                      }}
                    />
                  ) : null}

                  <span
                    style={{
                      display: imageUrl
                        ? "none"
                        : "flex",
                    }}
                  >
                    {initial}
                  </span>
                </div>

                <div className="fk-profile-friend__info">
                  <strong>
                    {displayName}
                  </strong>

                  {username && (
                    <span>
                      @{username}
                    </span>
                  )}

                  {friend.mutualFriends !==
                    undefined && (
                    <small>
                      {friend.mutualFriends} mutual friends
                    </small>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

