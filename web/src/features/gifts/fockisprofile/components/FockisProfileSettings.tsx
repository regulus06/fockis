import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FockisUser,
  UpdateProfilePayload,
} from "../types/fockisprofiletypes";

import "../../../../styles/FockisProfileSettings.scss";

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

interface Props {
  user: FockisUser;

  onSave: (
    data: UpdateProfilePayload
  ) => Promise<void>;

  onClose: () => void;
}

interface ProfileForm {
  fullName: string;
  bio: string;
  location: string;
  website: string;
}

export default function FockisProfileSettings({
  user,
  onSave,
  onClose,
}: Props) {
  const [form, setForm] =
    useState<ProfileForm>({
      fullName: user.fullName || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
    });

  const [saving, setSaving] =
    useState(false);

  const avatarInputRef =
    useRef<HTMLInputElement | null>(null);

  const coverInputRef =
    useRef<HTMLInputElement | null>(null);

  const [avatarFile, setAvatarFile] =
    useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const [coverFile, setCoverFile] =
    useState<File | null>(null);

  const [coverPreview, setCoverPreview] =
    useState<string | null>(null);

  useEffect(() => {
    setForm({
      fullName: user.fullName || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(
          avatarPreview
        );
      }

      if (coverPreview) {
        URL.revokeObjectURL(
          coverPreview
        );
      }
    };
  }, [
    avatarPreview,
    coverPreview,
  ]);

  function handleAvatarPick(
    event: React.ChangeEvent<HTMLInputElement>
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

    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setAvatarFile(file);

    setAvatarPreview(
      URL.createObjectURL(file)
    );
  }

  function handleCoverPick(
    event: React.ChangeEvent<HTMLInputElement>
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

    if (coverPreview) {
      URL.revokeObjectURL(
        coverPreview
      );
    }

    setCoverFile(file);

    setCoverPreview(
      URL.createObjectURL(file)
    );
  }

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >
  ) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);

      const data: UpdateProfilePayload = {
        fullName:
          form.fullName.trim(),

        bio:
          form.bio.trim(),

        location:
          form.location.trim(),

        website:
          form.website.trim(),

        ...(avatarFile
          ? { avatar: avatarFile }
          : {}),

        ...(coverFile
          ? { coverImage: coverFile }
          : {}),
      };

      await onSave(data);

      onClose();
    } catch (error) {
      console.error(
        "Failed to save profile:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc =
    avatarPreview ||
    user.avatar;

  const coverSrc =
    coverPreview ||
    user.coverImage;

  const initial =
    user.fullName
      ?.charAt(0)
      .toUpperCase() ||
    user.username
      ?.charAt(0)
      .toUpperCase() ||
    "F";

  return (
    <div
      className="fk-profile-settings-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <section
        className="fk-profile-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fk-profile-settings-title"
      >
        <header className="fk-profile-settings__header">
          <div>
            <h2 id="fk-profile-settings-title">
              Edit Profile
            </h2>

            <p>
              Update your Fockis profile information.
            </p>
          </div>

          <button
            type="button"
            className="fk-profile-settings__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form
          className="fk-profile-settings__form"
          onSubmit={handleSubmit}
        >
          <div className="fk-profile-settings__cover-field">
            <div className="fk-profile-settings__cover-preview">
              {coverSrc && (
                <img
                  src={coverSrc}
                  alt="Cover"
                />
              )}

              <button
                type="button"
                className="fk-profile-settings__cover-camera"
                onClick={() =>
                  coverInputRef.current?.click()
                }
                aria-label="Change cover photo"
              >
                <IconCamera size={16} />
              </button>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleCoverPick}
            />
          </div>

          <div className="fk-profile-settings__avatar-field">
            <button
              type="button"
              className="fk-profile-settings__avatar-preview"
              onClick={() =>
                avatarInputRef.current?.click()
              }
              aria-label="Change profile photo"
            >
              <span className="fk-profile-settings__avatar-preview-clip">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={
                      user.username ||
                      "User"
                    }
                  />
                ) : (
                  <span className="fk-profile-settings__avatar-preview-fallback">
                    {initial}
                  </span>
                )}
              </span>

              <span className="fk-profile-settings__avatar-camera">
                <IconCamera size={14} />
              </span>
            </button>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarPick}
            />
          </div>

          <label>
            <span>Username</span>

            <input
              type="text"
              value={user.username || ""}
              disabled
              readOnly
            />

            <small>
              Username changes are managed separately.
            </small>
          </label>

          <label>
            <span>Full name</span>

            <input
              type="text"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Full name"
              maxLength={100}
            />
          </label>

          <label>
            <span>Bio</span>

            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Tell people about yourself..."
              rows={5}
              maxLength={500}
            />

            <small>
              {form.bio.length}/500
            </small>
          </label>

          <label>
            <span>Location</span>

            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="City, State, Country"
              maxLength={150}
            />
          </label>

          <label>
            <span>Website</span>

            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://example.com"
              maxLength={250}
            />
          </label>

          <div className="fk-profile-settings__actions">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
