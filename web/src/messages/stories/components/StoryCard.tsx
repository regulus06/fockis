import "../styles/story-card.scss";

type MessagesStoryType =
  | "image"
  | "video"
  | "text";

interface MessagesStory {
  id: string;
  userId: string;
  name: string;
  avatar?: string | null;
  type: MessagesStoryType;
  mediaUrl?: string | null;
  text?: string | null;
  createdAt: string;
  expiresAt: string;
  seen: boolean;
}

interface StoryCardProps {
  story: MessagesStory;

  currentUserId?: string;

  isCreate?: boolean;

  onClick: () => void;
}

function getInitials(
  name: string,
): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

export default function StoryCard({
  story,
  currentUserId,
  isCreate = false,
  onClick,
}: StoryCardProps) {
  /*
   * ============================================================
   * ADD STORY CARD
   * ============================================================
   */

  if (isCreate) {
    return (
      <button
        type="button"
        className="messages-story-card messages-story-card--create"
        onClick={onClick}
      >
        <div className="messages-story-card__create-image">
          {story.avatar ? (
            <img
              src={story.avatar}
              alt={story.name}
            />
          ) : (
            <span>
              {getInitials(
                story.name,
              )}
            </span>
          )}

          <strong
            aria-hidden="true"
          >
            +
          </strong>
        </div>

        <span className="messages-story-card__name">
          Add Story
        </span>
      </button>
    );
  }

  /*
   * ============================================================
   * STORY OWNERSHIP
   * ============================================================
   */

  const isMine =
    Boolean(
      currentUserId &&
        story.userId ===
          currentUserId,
    );

  /*
   * ============================================================
   * STORY CARD
   * ============================================================
   */

  return (
    <button
      type="button"
      className={[
        "messages-story-card",

        !story.seen
          ? "messages-story-card--unseen"
          : "",

        isMine
          ? "messages-story-card--mine"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      aria-label={
        isMine
          ? "Open your story"
          : `Open story by ${story.name}`
      }
    >
      <div className="messages-story-card__media">
        {/* =====================================================
            IMAGE STORY
           ===================================================== */}

        {story.type ===
          "image" &&
        story.mediaUrl ? (
          <img
            src={story.mediaUrl}
            alt={story.name}
            loading="lazy"
          />
        ) : story.type ===
            "video" &&
          story.mediaUrl ? (
          /* ===================================================
             VIDEO STORY
             =================================================== */

          <video
            src={story.mediaUrl}
            muted
            playsInline
            preload="metadata"
            aria-label={`Video story by ${story.name}`}
          />
        ) : (
          /* ===================================================
             TEXT STORY
             =================================================== */

          <div className="messages-story-card__text">
            {story.text ||
              "Text Story"}
          </div>
        )}

        {/* =====================================================
            PROFILE AVATAR
           ===================================================== */}

        <div className="messages-story-card__avatar">
          {story.avatar ? (
            <img
              src={story.avatar}
              alt=""
            />
          ) : (
            getInitials(
              story.name,
            )
          )}
        </div>
      </div>

      {/* =======================================================
          STORY NAME
         ======================================================= */}

      <span className="messages-story-card__name">
        {isMine
          ? "Your Story"
          : story.name}
      </span>
    </button>
  );
}