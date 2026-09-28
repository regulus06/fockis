import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useMessagesStories,
} from "../hooks/useMessagesStories";

import "../styles/messages-stories.scss";

export default function MessagesStoryProfilePage() {
  const {
    profile,
    setMessagesProfile,
    myStories,
    openViewer,
    openCreate,
  } = useMessagesStories();

  const [
    name,
    setName,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    bio,
    setBio,
  ] = useState("");

  /*
   * Keep the form synchronized with
   * the Messages-specific profile.
   */
  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(profile.name || "");
    setUsername(
      profile.username || "",
    );
    setBio(profile.bio || "");
  }, [profile]);

  const saveProfile = () => {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return;
    }

    /*
     * Do not create a new user identity
     * when a Messages profile already exists.
     *
     * The Messages profile keeps its own
     * identity while remaining associated
     * with the authenticated Fockis user.
     */
    setMessagesProfile({
      userId:
        profile?.userId ||
        `messages-${Date.now()}`,

      fockisId:
        profile?.fockisId || null,

      name:
        trimmedName,

      username:
        username.trim() || null,

      avatar:
        profile?.avatar || null,

      bio:
        bio.trim() || null,
    });
  };

  const initials =
    (
      name ||
      profile?.name ||
      "Y"
    )
      .trim()
      .charAt(0)
      .toUpperCase();

  return (
    <div className="messages-story-profile-page">
      <header className="messages-story-profile-page__topbar">
        <Link to="/messages">
          ← Messages
        </Link>

        <h1>
          Messages Profile
        </h1>
      </header>

      <main className="messages-story-profile-page__content">
        {/* =====================================================
            PROFILE HEADER
           ===================================================== */}

        <section className="messages-profile-card">
          <div className="messages-profile-card__avatar">
            {profile?.avatar ? (
              <img
                src={profile.avatar}
                alt={
                  profile.name ||
                  "Messages profile"
                }
              />
            ) : (
              <span>
                {initials}
              </span>
            )}
          </div>

          <div className="messages-profile-card__identity">
            <small>
              Fockis Messages
            </small>

            <h2>
              {name ||
                profile?.name ||
                "Your Messages Profile"}
            </h2>

            {profile?.username && (
              <div>
                @{profile.username}
              </div>
            )}

            {profile?.fockisId && (
              <span>
                Fockis ID:{" "}
                {profile.fockisId}
              </span>
            )}

            {profile?.bio && (
              <p>
                {profile.bio}
              </p>
            )}
          </div>
        </section>

        {/* =====================================================
            PROFILE EDITOR
           ===================================================== */}

        <section className="messages-profile-editor">
          <div className="messages-profile-editor__heading">
            <div>
              <small>
                MESSAGES IDENTITY
              </small>

              <h2>
                Messages Profile
              </h2>
            </div>
          </div>

          <p>
            This profile is used inside
            Fockis Messages, Calls, and
            Stories. It can have its own
            display information separate
            from your main Fockis social
            profile.
          </p>

          <label>
            Display name

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Your Messages name"
              maxLength={80}
            />
          </label>

          <label>
            Username

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                    .replace(
                      /\s+/g,
                      "",
                    ),
                )
              }
              placeholder="username"
              maxLength={40}
            />
          </label>

          <label>
            Bio

            <textarea
              value={bio}
              onChange={(event) =>
                setBio(
                  event.target.value,
                )
              }
              placeholder="Tell people about yourself"
              maxLength={160}
            />

            <small>
              {bio.length}/160
            </small>
          </label>

          <div className="messages-profile-editor__actions">
            <button
              type="button"
              onClick={saveProfile}
              disabled={!name.trim()}
            >
              Save Messages Profile
            </button>
          </div>
        </section>

        {/* =====================================================
            STORIES
           ===================================================== */}

        <section className="messages-profile-stories">
          <div className="messages-profile-stories__header">
            <div>
              <small>
                FOCKIS MESSAGES
              </small>

              <h2>
                My Stories
              </h2>

              <p>
                Stories automatically
                disappear after 24 hours.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
            >
              + Add Story
            </button>
          </div>

          {myStories.length > 0 ? (
            <div className="messages-profile-stories__grid">
              {myStories.map(
                (story) => (
                  <button
                    type="button"
                    key={story.id}
                    onClick={() =>
                      openViewer(
                        story.id,
                      )
                    }
                    aria-label={`Open story by ${story.name}`}
                  >
                    {story.type ===
                      "image" &&
                    story.mediaUrl ? (
                      <img
                        src={
                          story.mediaUrl
                        }
                        alt=""
                      />
                    ) : story.type ===
                        "video" &&
                      story.mediaUrl ? (
                      <video
                        src={
                          story.mediaUrl
                        }
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <span>
                        {story.text ||
                          "Text Story"}
                      </span>
                    )}

                    {!story.seen && (
                      <i
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ),
              )}
            </div>
          ) : (
            <div className="messages-profile-stories__empty">
              <div className="messages-profile-stories__empty-icon">
                +
              </div>

              <strong>
                You have no active
                stories
              </strong>

              <p>
                Share a photo, video, or
                message with your
                Messages contacts.
              </p>

              <button
                type="button"
                onClick={openCreate}
              >
                Create Your First Story
              </button>
            </div>
          )}
        </section>

        {/* =====================================================
            PROFILE INFORMATION
           ===================================================== */}

        <section className="messages-profile-info">
          <div>
            <strong>
              Messages Profile
            </strong>

            <span>
              Separate from your main
              Fockis profile
            </span>
          </div>

          <div>
            <strong>
              Stories
            </strong>

            <span>
              {myStories.length} active{" "}
              {myStories.length === 1
                ? "story"
                : "stories"}
            </span>
          </div>

          <div>
            <strong>
              Expiration
            </strong>

            <span>
              24 hours
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}