import {
  useEffect,
  useState,
} from "react";

import {
  Globe,
  MapPin,
  Save,
  User,
} from "lucide-react";

interface ProfileUser {
  id?: string;
  _id?: string;
  userId?: string;

  fockisId?: string;
  username?: string;
  displayName?: string;
  name?: string;

  bio?: string | null;
  location?: string | null;
  website?: string | null;
}

interface ProfileForm {
  displayName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
}

interface FockisProfileSettingsProps {
  user: ProfileUser;

  onSave: (
    value: ProfileForm,
  ) => Promise<void> | void;

  onClose: () => void;
}

export default function FockisProfileSettings({
  user,
  onSave,
  onClose,
}: FockisProfileSettingsProps) {
  const [
    form,
    setForm,
  ] = useState<ProfileForm>({
    displayName:
      user.displayName ||
      user.name ||
      "",
    username:
      user.username ||
      "",
    bio:
      user.bio || "",
    location:
      user.location ||
      "",
    website:
      user.website ||
      "",
  });

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setForm({
      displayName:
        user.displayName ||
        user.name ||
        "",
      username:
        user.username ||
        "",
      bio:
        user.bio || "",
      location:
        user.location ||
        "",
      website:
        user.website ||
        "",
    });
  }, [user]);

  const updateField =
    (
      field: keyof ProfileForm,
      value: string,
    ) => {
      setForm(
        (current) => ({
          ...current,
          [field]: value,
        }),
      );
    };

  const handleSubmit =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        !form.displayName.trim()
      ) {
        setError(
          "Display name is required.",
        );
        return;
      }

      setSaving(true);
      setError(null);

      try {
        await onSave({
          displayName:
            form.displayName.trim(),

          username:
            form.username.trim(),

          bio:
            form.bio.trim(),

          location:
            form.location.trim(),

          website:
            form.website.trim(),
        });
      } catch (saveError) {
        console.error(
          "[FOCKIS PROFILE] Save failed:",
          saveError,
        );

        setError(
          saveError instanceof
            Error
            ? saveError.message
            : "Unable to save your profile.",
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <form
      className="fockis-profile-settings-form"
      onSubmit={handleSubmit}
    >
      <div className="fockis-profile-settings-form__grid">
        <label>
          <span>
            <User size={16} />
            Display name
          </span>

          <input
            type="text"
            value={
              form.displayName
            }
            onChange={(event) =>
              updateField(
                "displayName",
                event.target.value,
              )
            }
            maxLength={80}
            placeholder="Your name"
          />
        </label>

        <label>
          <span>
            <User size={16} />
            Username
          </span>

          <input
            type="text"
            value={
              form.username
            }
            onChange={(event) =>
              updateField(
                "username",
                event.target.value,
              )
            }
            maxLength={40}
            placeholder="username"
          />
        </label>

        <label className="is-full">
          <span>
            Bio
          </span>

          <textarea
            value={form.bio}
            onChange={(event) =>
              updateField(
                "bio",
                event.target.value,
              )
            }
            maxLength={500}
            rows={5}
            placeholder="Tell people a little about yourself..."
          />

          <small>
            {form.bio.length}/500
          </small>
        </label>

        <label>
          <span>
            <MapPin size={16} />
            Location
          </span>

          <input
            type="text"
            value={
              form.location
            }
            onChange={(event) =>
              updateField(
                "location",
                event.target.value,
              )
            }
            maxLength={100}
            placeholder="City, State"
          />
        </label>

        <label>
          <span>
            <Globe size={16} />
            Website
          </span>

          <input
            type="url"
            value={
              form.website
            }
            onChange={(event) =>
              updateField(
                "website",
                event.target.value,
              )
            }
            maxLength={255}
            placeholder="https://example.com"
          />
        </label>
      </div>

      {error && (
        <div
          className="fockis-profile-settings-form__error"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="fockis-profile-settings-form__actions">
        <button
          type="button"
          className="fockis-profile-secondary-button"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="fockis-profile-primary-button"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="fockis-profile-spinner" />
              Saving...
            </>
          ) : (
            <>
              <Save size={17} />
              Save Profile
            </>
          )}
        </button>
      </div>
    </form>
  );
}