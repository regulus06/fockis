import {
  useCallback,
  useEffect,
  useMemo,
} from "react";

import {
  useMessagesStoriesStore,
} from "../store/messagesStoriesStore";

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

const DEMO_STORIES: MessagesStory[] =
  [
    {
      id: "demo-story-john",
      userId: "demo-john",
      name: "John",
      avatar: null,
      type: "text",
      mediaUrl: null,
      text:
        "Have a great day! 👋",
      createdAt:
        new Date().toISOString(),
      expiresAt:
        new Date(
          Date.now() +
            24 *
              60 *
              60 *
              1000,
        ).toISOString(),
      seen: false,
    },

    {
      id: "demo-story-maria",
      userId: "demo-maria",
      name: "Maria",
      avatar: null,
      type: "text",
      mediaUrl: null,
      text:
        "Welcome to Fockis Messages 💬",
      createdAt:
        new Date().toISOString(),
      expiresAt:
        new Date(
          Date.now() +
            24 *
              60 *
              60 *
              1000,
        ).toISOString(),
      seen: false,
    },

    {
      id: "demo-story-david",
      userId: "demo-david",
      name: "David",
      avatar: null,
      type: "text",
      mediaUrl: null,
      text:
        "Good vibes ✨",
      createdAt:
        new Date().toISOString(),
      expiresAt:
        new Date(
          Date.now() +
            24 *
              60 *
              60 *
              1000,
        ).toISOString(),
      seen: true,
    },
  ];

export function useMessagesStories() {
  const stories =
    useMessagesStoriesStore(
      (state) =>
        state.stories,
    );

  const profile =
    useMessagesStoriesStore(
      (state) =>
        state.profile,
    );

  const viewerStoryId =
    useMessagesStoriesStore(
      (state) =>
        state.viewerStoryId,
    );

  const createOpen =
    useMessagesStoriesStore(
      (state) =>
        state.createOpen,
    );

  const loading =
    useMessagesStoriesStore(
      (state) =>
        state.loading,
    );

  const error =
    useMessagesStoriesStore(
      (state) =>
        state.error,
    );

  const setProfile =
    useMessagesStoriesStore(
      (state) =>
        state.setProfile,
    );

  const addStory =
    useMessagesStoriesStore(
      (state) =>
        state.addStory,
    );

  const removeStory =
    useMessagesStoriesStore(
      (state) =>
        state.removeStory,
    );

  const markSeen =
    useMessagesStoriesStore(
      (state) =>
        state.markSeen,
    );

  const openViewer =
    useMessagesStoriesStore(
      (state) =>
        state.openViewer,
    );

  const closeViewer =
    useMessagesStoriesStore(
      (state) =>
        state.closeViewer,
    );

  const openCreate =
    useMessagesStoriesStore(
      (state) =>
        state.openCreate,
    );

  const closeCreate =
    useMessagesStoriesStore(
      (state) =>
        state.closeCreate,
    );

  const setError =
    useMessagesStoriesStore(
      (state) =>
        state.setError,
    );

  const loadLocalState =
    useMessagesStoriesStore(
      (state) =>
        state.loadLocalState,
    );

  const removeExpiredStories =
    useMessagesStoriesStore(
      (state) =>
        state.removeExpiredStories,
    );

  /*
   * ============================================================
   * LOAD LOCAL STORIES
   * ============================================================
   */

  useEffect(() => {
    loadLocalState();

    const timer =
      window.setInterval(
        () => {
          removeExpiredStories();
        },
        60 * 1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    loadLocalState,
    removeExpiredStories,
  ]);

  /*
   * ============================================================
   * ACTIVE STORIES
   * ============================================================
   */

  const activeStories =
    useMemo(() => {
      const now =
        Date.now();

      return stories.filter(
        (story) => {
          const expiresAt =
            new Date(
              story.expiresAt,
            ).getTime();

          return (
            Number.isFinite(
              expiresAt,
            ) &&
            expiresAt > now
          );
        },
      );
    }, [stories]);

  /*
   * ============================================================
   * MY STORIES
   * ============================================================
   */

  const myStories =
    useMemo(() => {
      if (!profile) {
        return [];
      }

      return activeStories.filter(
        (story) =>
          story.userId ===
          profile.userId,
      );
    }, [
      activeStories,
      profile,
    ]);

  /*
   * ============================================================
   * OTHER USERS' STORIES
   * ============================================================
   */

  const otherStories =
    useMemo(() => {
      if (!profile) {
        return activeStories;
      }

      return activeStories.filter(
        (story) =>
          story.userId !==
          profile.userId,
      );
    }, [
      activeStories,
      profile,
    ]);

  /*
   * ============================================================
   * CURRENT VIEWER STORY
   * ============================================================
   */

  const viewerStory =
    useMemo(
      () =>
        activeStories.find(
          (story) =>
            story.id ===
            viewerStoryId,
        ) ?? null,
      [
        activeStories,
        viewerStoryId,
      ],
    );

  /*
   * ============================================================
   * UNSEEN STORIES
   * ============================================================
   */

  const hasUnseenStories =
    useMemo(
      () =>
        otherStories.some(
          (story) =>
            !story.seen,
        ),
      [otherStories],
    );

  /*
   * ============================================================
   * CREATE TEXT STORY
   * ============================================================
   */

  const createTextStory =
    useCallback(
      (text: string) => {
        const cleanText =
          text.trim();

        if (!cleanText) {
          setError(
            "Write something before sharing your story.",
          );

          return null;
        }

        const input: CreateMessagesStoryInput =
          {
            type: "text",
            text: cleanText,
          };

        return addStory(
          input,
        );
      },
      [
        addStory,
        setError,
      ],
    );

  /*
   * ============================================================
   * CREATE IMAGE / VIDEO STORY
   * ============================================================
   */

  const createMediaStory =
    useCallback(
      (file: File) => {
        const isImage =
          file.type.startsWith(
            "image/",
          );

        const isVideo =
          file.type.startsWith(
            "video/",
          );

        if (
          !isImage &&
          !isVideo
        ) {
          setError(
            "Please choose an image or video.",
          );

          return null;
        }

        if (
          file.size <= 0
        ) {
          setError(
            "The selected media file is empty.",
          );

          return null;
        }

        /*
         * Browser-local preview URL.
         *
         * This is temporary until the
         * Stories backend upload is connected.
         */
        const mediaUrl =
          URL.createObjectURL(
            file,
          );

        const input: CreateMessagesStoryInput =
          {
            type: isVideo
              ? "video"
              : "image",

            mediaFile:
              file,

            mediaUrl,
          };

        return addStory(
          input,
        );
      },
      [
        addStory,
        setError,
      ],
    );

  /*
   * ============================================================
   * MESSAGES PROFILE
   * ============================================================
   */

  const setMessagesProfile =
    useCallback(
      (
        nextProfile: MessagesStoryProfile,
      ) => {
        if (
          !nextProfile.userId
        ) {
          setError(
            "A Messages profile user ID is required.",
          );

          return;
        }

        if (
          !nextProfile.name.trim()
        ) {
          setError(
            "A Messages profile name is required.",
          );

          return;
        }

        setProfile({
          ...nextProfile,

          name:
            nextProfile.name.trim(),

          username:
            nextProfile.username
              ?.trim() ||
            null,

          bio:
            nextProfile.bio
              ?.trim() ||
            null,

          avatar:
            nextProfile.avatar ||
            null,

          fockisId:
            nextProfile.fockisId ||
            null,
        });
      },
      [
        setProfile,
        setError,
      ],
    );

  /*
   * ============================================================
   * RETURN API
   * ============================================================
   */

  return {
    stories:
      activeStories,

    activeStories,

    myStories,

    otherStories,

    profile,

    viewerStory,

    viewerStoryId,

    createOpen,

    loading,

    error,

    hasUnseenStories,

    createTextStory,

    createMediaStory,

    setMessagesProfile,

    removeStory,

    markSeen,

    openViewer,

    closeViewer,

    openCreate,

    closeCreate,

    removeExpiredStories,

    demoStories:
      DEMO_STORIES,
  };
}