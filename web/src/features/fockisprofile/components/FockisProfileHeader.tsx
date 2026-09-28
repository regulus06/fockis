import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type {
  FockisUser,
} from "../types/fockisprofiletypes";

import "../../../styles/FockisProfileHeader.scss";

interface Props {
  user?: FockisUser;

  onAvatarChange?: (
    file: File
  ) => void | Promise<void>;
}

function IconCamera({
  size = 16,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function FockisProfileHeader({
  user,
  onAvatarChange,
}: Props) {
  const avatarInputRef =
    useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    setAvatarPreview((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }

      return null;
    });

    setUploadingAvatar(false);
  }, [user?.avatar]);

  function handleAvatarClick() {
    avatarInputRef.current?.click();
  }

  async function handleAvatarFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const preview =
      URL.createObjectURL(file);

    setAvatarPreview(preview);
    setUploadingAvatar(true);

    try {
      await onAvatarChange?.(file);
    } catch (error) {
      console.error(
        "Avatar upload failed:",
        error
      );

      setAvatarPreview((previous) => {
        if (previous) {
          URL.revokeObjectURL(previous);
        }

        return null;
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!user) {
    return (
      <section className="fk-profile-header">
        <p>Loading profile...</p>
      </section>
    );
  }

  const avatarSrc =
    avatarPreview || user.avatar;

  const initial =
    user.fullName
      ?.charAt(0)
      .toUpperCase() ||
    user.username
      ?.charAt(0)
      .toUpperCase() ||
    "F";

  return (
    <section className="fk-profile-header">
      <div className="fk-profile-header__cover">
        {user.coverImage ? (
          <img
            src={user.coverImage}
            alt="Profile cover"
          />
        ) : (
          <div className="fk-profile-header__cover-fallback" />
        )}
      </div>

      <div className="fk-profile-header__content">
        {onAvatarChange ? (
          <button
            type="button"
            className="fk-profile-header__avatar fk-profile-header__avatar--editable"
            onClick={handleAvatarClick}
            aria-label="Change profile photo"
          >
            <span className="fk-profile-header__avatar-clip">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={
                    user.username ||
                    "User"
                  }
                />
              ) : (
                <span className="fk-profile-header__avatar-fallback">
                  {initial}
                </span>
              )}
            </span>

            <span
              className="fk-profile-header__avatar-edit"
              aria-hidden="true"
            >
              <IconCamera size={15} />
            </span>

            {uploadingAvatar && (
              <span
                className="fk-profile-header__avatar-uploading"
                aria-hidden="true"
              >
                Uploading...
              </span>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={
                handleAvatarFileChange
              }
            />
          </button>
        ) : (
          <div className="fk-profile-header__avatar">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={
                  user.username ||
                  "User"
                }
              />
            ) : (
              <span>
                {initial}
              </span>
            )}
          </div>
        )}

        <div className="fk-profile-header__info">
          <h1>
            {user.fullName ||
              user.username ||
              "Fockis User"}

            {user.verified && (
              <span className="fk-profile-header__verified">
                ✓
              </span>
            )}
          </h1>

          {user.username && (
            <p>
              @{user.username}
            </p>
          )}

          {user.location && (
            <span>
              📍 {user.location}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}