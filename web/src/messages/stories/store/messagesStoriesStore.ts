import { create } from "zustand";

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

interface MessagesStoryProfile {
  userId: string;
  fockisId?: string | null;
  name: string;
  username?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

interface CreateMessagesStoryInput {
  type: MessagesStoryType;
  text?: string;
  mediaFile?: File | null;
  mediaUrl?: string | null;
}

const STORAGE_KEY =
  "fockis_messages_stories";

const PROFILE_STORAGE_KEY =
  "fockis_messages_profile";

const DAY_MS =
  24 * 60 * 60 * 1000;

interface MessagesStoriesState {
  stories: MessagesStory[];

  profile: MessagesStoryProfile | null;

  viewerStoryId: string | null;

  createOpen: boolean;

  loading: boolean;

  error: string | null;

  setStories: (
    stories: MessagesStory[],
  ) => void;

  setProfile: (
    profile: MessagesStoryProfile | null,
  ) => void;

  addStory: (
    input: CreateMessagesStoryInput,
  ) => MessagesStory | null;

  removeStory: (
    storyId: string,
  ) => void;

  markSeen: (
    storyId: string,
  ) => void;

  openViewer: (
    storyId: string,
  ) => void;

  closeViewer: () => void;

  openCreate: () => void;

  closeCreate: () => void;

  setLoading: (
    loading: boolean,
  ) => void;

  setError: (
    error: string | null,
  ) => void;

  removeExpiredStories: () => void;

  loadLocalState: () => void;
}

/*
 * ============================================================
 * SAFE JSON PARSER
 * ============================================================
 */

function safeParse<T>(
  value: string | null,
  fallback: T,
): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(
      value,
    ) as T;
  } catch {
    return fallback;
  }
}

/*
 * ============================================================
 * LOCAL STORAGE — STORIES
 * ============================================================
 */

function saveStories(
  stories: MessagesStory[],
): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stories),
    );
  } catch {
    /*
     * Storage can fail in private browsing,
     * quota errors, or restricted environments.
     *
     * The application should continue working.
     */
  }
}

/*
 * ============================================================
 * LOCAL STORAGE — PROFILE
 * ============================================================
 */

function saveProfile(
  profile: MessagesStoryProfile | null,
): void {
  try {
    if (!profile) {
      localStorage.removeItem(
        PROFILE_STORAGE_KEY,
      );

      return;
    }

    localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify(profile),
    );
  } catch {
    /*
     * Ignore localStorage failures.
     */
  }
}

/*
 * ============================================================
 * STORY ID
 * ============================================================
 */

function createStoryId(): string {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return [
    "story",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

/*
 * ============================================================
 * STORY STORE
 * ============================================================
 */

export const useMessagesStoriesStore =
  create<MessagesStoriesState>(
    (set, get) => ({
      stories: [],

      profile: null,

      viewerStoryId: null,

      createOpen: false,

      loading: false,

      error: null,

      /*
       * ========================================================
       * SET STORIES
       * ========================================================
       */

      setStories: (
        stories,
      ) => {
        const activeStories =
          stories.filter(
            (story) =>
              new Date(
                story.expiresAt,
              ).getTime() >
              Date.now(),
          );

        saveStories(
          activeStories,
        );

        set({
          stories:
            activeStories,

          error: null,
        });
      },

      /*
       * ========================================================
       * SET PROFILE
       * ========================================================
       */

      setProfile: (
        profile,
      ) => {
        saveProfile(
          profile,
        );

        set({
          profile,

          error: null,
        });
      },

      /*
       * ========================================================
       * ADD STORY
       * ========================================================
       */

      addStory: (
        input,
      ) => {
        const profile =
          get().profile;

        if (!profile) {
          set({
            error:
              "Your Messages profile is not available.",
          });

          return null;
        }

        if (
          !profile.userId
        ) {
          set({
            error:
              "Your Messages profile does not have a valid user ID.",
          });

          return null;
        }

        if (
          !profile.name.trim()
        ) {
          set({
            error:
              "Your Messages profile needs a name before you can create a story.",
          });

          return null;
        }

        /*
         * Validate text stories.
         */

        if (
          input.type ===
            "text" &&
          !input.text?.trim()
        ) {
          set({
            error:
              "Write something before sharing your story.",
          });

          return null;
        }

        /*
         * Validate media stories.
         */

        if (
          input.type !==
            "text" &&
          !input.mediaUrl
        ) {
          set({
            error:
              "Please select an image or video before sharing your story.",
          });

          return null;
        }

        const now =
          new Date();

        const expiresAt =
          new Date(
            now.getTime() +
              DAY_MS,
          );

        const story: MessagesStory =
          {
            id:
              createStoryId(),

            userId:
              profile.userId,

            name:
              profile.name,

            avatar:
              profile.avatar ??
              null,

            type:
              input.type,

            mediaUrl:
              input.mediaUrl ??
              null,

            text:
              input.text?.trim() ||
              null,

            createdAt:
              now.toISOString(),

            expiresAt:
              expiresAt.toISOString(),

            seen: false,
          };

        const stories =
          [
            story,
            ...get().stories,
          ];

        saveStories(
          stories,
        );

        set({
          stories,

          createOpen: false,

          error: null,
        });

        return story;
      },

      /*
       * ========================================================
       * REMOVE STORY
       * ========================================================
       */

      removeStory: (
        storyId,
      ) => {
        const stories =
          get().stories.filter(
            (story) =>
              story.id !==
              storyId,
          );

        saveStories(
          stories,
        );

        const currentViewer =
          get().viewerStoryId;

        set({
          stories,

          viewerStoryId:
            currentViewer ===
            storyId
              ? null
              : currentViewer,
        });
      },

      /*
       * ========================================================
       * MARK STORY AS SEEN
       * ========================================================
       */

      markSeen: (
        storyId,
      ) => {
        const stories =
          get().stories.map(
            (story) =>
              story.id ===
              storyId
                ? {
                    ...story,

                    seen: true,
                  }
                : story,
          );

        saveStories(
          stories,
        );

        set({
          stories,
        });
      },

      /*
       * ========================================================
       * OPEN STORY VIEWER
       * ========================================================
       */

      openViewer: (
        storyId,
      ) => {
        const story =
          get().stories.find(
            (item) =>
              item.id ===
              storyId,
          );

        if (!story) {
          set({
            error:
              "This story is no longer available.",
          });

          return;
        }

        const expired =
          new Date(
            story.expiresAt,
          ).getTime() <=
          Date.now();

        if (expired) {
          get().removeStory(
            storyId,
          );

          set({
            error:
              "This story has expired.",
          });

          return;
        }

        /*
         * Opening a story automatically
         * marks it as seen.
         */

        get().markSeen(
          storyId,
        );

        set({
          viewerStoryId:
            storyId,

          error: null,
        });
      },

      /*
       * ========================================================
       * CLOSE STORY VIEWER
       * ========================================================
       */

      closeViewer: () => {
        set({
          viewerStoryId:
            null,
        });
      },

      /*
       * ========================================================
       * OPEN CREATE STORY
       * ========================================================
       */

      openCreate: () => {
        set({
          createOpen: true,

          error: null,
        });
      },

      /*
       * ========================================================
       * CLOSE CREATE STORY
       * ========================================================
       */

      closeCreate: () => {
        set({
          createOpen: false,

          error: null,
        });
      },

      /*
       * ========================================================
       * LOADING
       * ========================================================
       */

      setLoading: (
        loading,
      ) => {
        set({
          loading,
        });
      },

      /*
       * ========================================================
       * ERROR
       * ========================================================
       */

      setError: (
        error,
      ) => {
        set({
          error,
        });
      },

      /*
       * ========================================================
       * REMOVE EXPIRED STORIES
       * ========================================================
       */

      removeExpiredStories:
        () => {
          const now =
            Date.now();

          const currentStories =
            get().stories;

          const activeStories =
            currentStories.filter(
              (story) =>
                new Date(
                  story.expiresAt,
                ).getTime() >
                now,
            );

          /*
           * If the currently opened story
           * expired, close the viewer.
           */

          const viewerStoryId =
            get().viewerStoryId;

          const viewerStillExists =
            activeStories.some(
              (story) =>
                story.id ===
                viewerStoryId,
            );

          saveStories(
            activeStories,
          );

          set({
            stories:
              activeStories,

            viewerStoryId:
              viewerStillExists
                ? viewerStoryId
                : null,
          });
        },

      /*
       * ========================================================
       * LOAD LOCAL STATE
       * ========================================================
       */

      loadLocalState:
        () => {
          let stories =
            safeParse<
              MessagesStory[]
            >(
              localStorage.getItem(
                STORAGE_KEY,
              ),
              [],
            );

          const profile =
            safeParse<
              MessagesStoryProfile | null
            >(
              localStorage.getItem(
                PROFILE_STORAGE_KEY,
              ),
              null,
            );

          const now =
            Date.now();

          /*
           * Remove expired stories immediately
           * when Messages opens.
           */

          stories =
            stories.filter(
              (story) =>
                new Date(
                  story.expiresAt,
                ).getTime() >
                now,
            );

          saveStories(
            stories,
          );

          set({
            stories,

            profile,

            viewerStoryId:
              null,

            createOpen:
              false,

            loading:
              false,

            error: null,
          });
        },
    }),
  );