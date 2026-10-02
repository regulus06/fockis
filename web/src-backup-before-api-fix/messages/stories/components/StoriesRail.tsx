import {
  useEffect,
} from "react";

import StoryCard from "./StoryCard";
import CreateStory from "./CreateStory";
import StoryViewer from "./StoryViewer";

import {
  useMessagesStories,
} from "../hooks/useMessagesStories";

import "../styles/messages-stories.scss";

interface MessagesStoryProfile {
  userId: string;
  fockisId?: string | null;
  name: string;
  username?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

interface StoriesRailProps {
  profile?: MessagesStoryProfile | null;
}

export default function StoriesRail({
  profile,
}: StoriesRailProps) {
  const {
    stories,
    myStories,
    otherStories,
    setMessagesProfile,
    openCreate,
    openViewer,
  } = useMessagesStories();

  /*
   * Synchronize the Messages-specific
   * profile with the Stories system.
   */
  useEffect(() => {
    if (!profile) {
      return;
    }

    setMessagesProfile(
      profile,
    );
  }, [
    profile,
    setMessagesProfile,
  ]);

  const currentUserId =
    profile?.userId;

  const currentUserName =
    profile?.name || "You";

  const currentUserAvatar =
    profile?.avatar || null;

  const myStory =
    myStories[0];

  /*
   * Temporary fallback profile used
   * until the authenticated Messages
   * profile is loaded.
   */
  const messagesProfile: MessagesStoryProfile =
    {
      userId:
        currentUserId ||
        "messages-user",

      name:
        currentUserName,

      avatar:
        currentUserAvatar,

      fockisId:
        profile?.fockisId ||
        null,

      username:
        profile?.username ||
        null,

      bio:
        profile?.bio ||
        null,
    };

  /*
   * The first card is always the
   * user's Add Story / Your Story card.
   */
  const createStoryData = {
    id:
      myStory?.id ||
      "create-story",

    userId:
      messagesProfile.userId,

    name:
      messagesProfile.name,

    avatar:
      messagesProfile.avatar,

    type:
      myStory?.type ||
      "text",

    mediaUrl:
      myStory?.mediaUrl ||
      null,

    text:
      myStory?.text ||
      null,

    createdAt:
      myStory?.createdAt ||
      new Date().toISOString(),

    expiresAt:
      myStory?.expiresAt ||
      new Date(
        Date.now() +
          24 *
            60 *
            60 *
            1000,
      ).toISOString(),

    seen:
      myStory?.seen ??
      false,
  };

  return (
    <>
      <section className="messages-stories">
        <div className="messages-stories__header">
          <div>
            <h2>
              Stories
            </h2>

            <p>
              Share moments with
              your Messages contacts
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
          >
            + Create Story
          </button>
        </div>

        <div className="messages-stories__rail">
          {/* =================================================
              YOUR STORY / ADD STORY
             ================================================= */}

          <StoryCard
            story={
              createStoryData
            }
            currentUserId={
              currentUserId
            }
            isCreate
            onClick={
              myStory
                ? () =>
                    openViewer(
                      myStory.id,
                    )
                : openCreate
            }
          />

          {/* =================================================
              OTHER USERS' STORIES
             ================================================= */}

          {otherStories.map(
            (story) => (
              <StoryCard
                key={
                  story.id
                }
                story={story}
                currentUserId={
                  currentUserId
                }
                onClick={() =>
                  openViewer(
                    story.id,
                  )
                }
              />
            ),
          )}

          {/* =================================================
              YOUR ACTIVE STORIES
             ================================================= */}

          {myStories.map(
            (story) => (
              <StoryCard
                key={
                  `mine-${story.id}`
                }
                story={story}
                currentUserId={
                  currentUserId
                }
                onClick={() =>
                  openViewer(
                    story.id,
                  )
                }
              />
            ),
          )}

          {/* =================================================
              EMPTY STATE
             ================================================= */}

          {stories.length ===
            0 && (
            <div className="messages-stories__empty">
              <strong>
                No stories yet
              </strong>

              <span>
                Be the first to
                share something.
              </span>

              <button
                type="button"
                onClick={
                  openCreate
                }
              >
                Create Story
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          CREATE STORY MODAL
         ===================================================== */}

      <CreateStory />

      {/* =====================================================
          STORY VIEWER
         ===================================================== */}

      <StoryViewer />
    </>
  );
}