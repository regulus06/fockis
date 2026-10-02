import { create } from "zustand";

import type {
  Conversation,
  Participant,
} from "../types";

import { conversationsApi } from "../services/conversationsApi";

/* ============================================================================
   TYPES
============================================================================ */

interface ConversationsState {
  conversations: Conversation[];

  participants: Record<string, Participant>;

  activeConversationId: string | null;

  loading: boolean;

  loadConversations: () => Promise<void>;

  setActiveConversation: (id: string | null) => void;

  markAsRead: (id: string) => void;

  toggleMute: (id: string) => void;

  upsertConversation: (conversation: Conversation) => void;

  bumpConversation: (
    id: string,
    lastMessageId: string,
    updatedAt: string,
    incrementUnread?: boolean,
  ) => void;

  updatePresence: (
    userId: string,
    presence: "online" | "offline",
    lastSeen: string,
  ) => void;

  startConversationWith: (
    participantId: string,
  ) => Promise<string>;
}

/* ============================================================================
   HELPERS
============================================================================ */

/**
 * Convert the API's otherUser object into the frontend Participant shape.
 *
 * IMPORTANT:
 * - id = internal Mongo/user ID
 * - fockisId = public Fockis ID
 *
 * Calls and conversation creation use `id`.
 * Fockis ID is only used for public lookup/display.
 */
function toParticipant(
  user: NonNullable<Conversation["otherUser"]>,
): Participant {
  return {
    id: String(user.id),

    fockisId: String(user.fockisId || ""),

    name:
      user.name ||
      user.username ||
      "User",

    username:
      user.username ||
      "",

    avatar:
      user.avatar ||
      user.profilePicture ||
      "",

    profilePicture:
      user.profilePicture,

    presence:
      user.presence ||
      "offline",

    lastSeen:
      user.lastSeen ||
      "",

    bio:
      user.bio,

    verified:
      user.verified,
  };
}

/**
 * Keep conversations ordered newest first.
 */
function sortConversations(
  conversations: Conversation[],
): Conversation[] {
  return [...conversations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime(),
  );
}

/* ============================================================================
   STORE
============================================================================ */

export const useConversationsStore =
  create<ConversationsState>((set, get) => ({
    conversations: [],

    participants: {},

    activeConversationId: null,

    loading: false,

    /* ========================================================================
       LOAD CONVERSATIONS
    ======================================================================== */

    loadConversations: async () => {
      set({
        loading: true,
      });

      try {
        const conversations =
          await conversationsApi.list();

        const participants: Record<
          string,
          Participant
        > = {};

        for (const conversation of conversations) {
          const user =
            conversation.otherUser;

          if (!user?.id) {
            continue;
          }

          participants[String(user.id)] =
            toParticipant(user);
        }

        set({
          conversations:
            sortConversations(
              conversations,
            ),

          participants,

          loading: false,
        });
      } catch (error) {
        console.error(
          "[MESSAGES] Failed to load conversations:",
          error,
        );

        set({
          loading: false,
        });
      }
    },

    /* ========================================================================
       ACTIVE CONVERSATION
    ======================================================================== */

    setActiveConversation: (id) => {
      set({
        activeConversationId:
          id || null,
      });
    },

    /* ========================================================================
       MARK AS READ
    ======================================================================== */

    markAsRead: (id) => {
      if (!id) {
        return;
      }

      /*
       * Optimistic UI update.
       */
      set((state) => ({
        conversations:
          state.conversations.map(
            (conversation) =>
              conversation.id === id
                ? {
                    ...conversation,
                    unreadCount: 0,
                  }
                : conversation,
          ),
      }));

      /*
       * Persist on backend.
       */
      conversationsApi
        .markRead(id)
        .catch((error) => {
          console.error(
            "[MESSAGES] Failed to mark conversation read:",
            error,
          );
        });
    },

    /* ========================================================================
       MUTE / UNMUTE
    ======================================================================== */

    toggleMute: (id) => {
      if (!id) {
        return;
      }

      const target =
        get().conversations.find(
          (conversation) =>
            conversation.id === id,
        );

      if (!target) {
        return;
      }

      const muted =
        !Boolean(target.muted);

      /*
       * Optimistic update.
       */
      set((state) => ({
        conversations:
          state.conversations.map(
            (conversation) =>
              conversation.id === id
                ? {
                    ...conversation,
                    muted,
                  }
                : conversation,
          ),
      }));

      /*
       * Persist.
       */
      conversationsApi
        .setMuted(id, muted)
        .catch((error) => {
          console.error(
            "[MESSAGES] Failed to update mute state:",
            error,
          );

          /*
           * Revert optimistic update.
           */
          set((state) => ({
            conversations:
              state.conversations.map(
                (conversation) =>
                  conversation.id === id
                    ? {
                        ...conversation,
                        muted: !muted,
                      }
                    : conversation,
              ),
          }));
        });
    },

    /* ========================================================================
       INSERT / UPDATE CONVERSATION
    ======================================================================== */

    upsertConversation: (
      conversation,
    ) => {
      if (!conversation?.id) {
        return;
      }

      set((state) => {
        const existing =
          state.conversations.some(
            (item) =>
              item.id ===
              conversation.id,
          );

        const conversations =
          existing
            ? state.conversations.map(
                (item) =>
                  item.id ===
                  conversation.id
                    ? {
                        ...item,
                        ...conversation,
                      }
                    : item,
              )
            : [
                conversation,
                ...state.conversations,
              ];

        const user =
          conversation.otherUser;

        let participants =
          state.participants;

        if (user?.id) {
          participants = {
            ...state.participants,

            [String(user.id)]:
              toParticipant(user),
          };
        }

        return {
          conversations:
            sortConversations(
              conversations,
            ),

          participants,
        };
      });
    },

    /* ========================================================================
       BUMP CONVERSATION
    ======================================================================== */

    bumpConversation: (
      id,
      lastMessageId,
      updatedAt,
      incrementUnread = false,
    ) => {
      if (!id) {
        return;
      }

      set((state) => ({
        conversations:
          sortConversations(
            state.conversations.map(
              (conversation) =>
                conversation.id === id
                  ? {
                      ...conversation,

                      lastMessageId,

                      updatedAt,

                      unreadCount:
                        incrementUnread
                          ? conversation.unreadCount +
                            1
                          : conversation.unreadCount,
                    }
                  : conversation,
            ),
          ),
      }));
    },

    /* ========================================================================
       PRESENCE
    ======================================================================== */

    updatePresence: (
      userId,
      presence,
      lastSeen,
    ) => {
      if (!userId) {
        return;
      }

      set((state) => {
        const existing =
          state.participants[
            userId
          ];

        if (!existing) {
          return state;
        }

        return {
          participants: {
            ...state.participants,

            [userId]: {
              ...existing,

              presence,

              lastSeen,
            },
          },
        };
      });
    },

    /* ========================================================================
       START CONVERSATION WITH USER
    ======================================================================== */

    startConversationWith:
      async (participantId) => {
        const normalizedParticipantId =
          String(
            participantId || "",
          ).trim();

        if (!normalizedParticipantId) {
          throw new Error(
            "Participant ID is required.",
          );
        }

        /*
         * IMPORTANT:
         *
         * This function expects the INTERNAL USER ID.
         *
         * The flow is:
         *
         * Fockis ID
         *      ↓
         * /users/fockis/:fockisId
         *      ↓
         * user.id
         *      ↓
         * startConversationWith(user.id)
         *      ↓
         * POST /messages/conversations
         */

        console.log(
          "[MESSAGES] Starting conversation with user:",
          normalizedParticipantId,
        );

        /*
         * Ask backend to create or return the existing
         * one-to-one conversation.
         */
        const conversation =
          await conversationsApi.createWithParticipant(
            normalizedParticipantId,
          );

        if (!conversation) {
          throw new Error(
            "The server did not return a conversation.",
          );
        }

        if (!conversation.id) {
          console.error(
            "[MESSAGES] Invalid conversation response:",
            conversation,
          );

          throw new Error(
            "The server returned a conversation without an ID.",
          );
        }

        const conversationId =
          String(
            conversation.id,
          ).trim();

        if (!conversationId) {
          throw new Error(
            "The conversation ID is empty.",
          );
        }

        console.log(
          "[MESSAGES] Conversation created/found:",
          conversationId,
        );

        /*
         * Add it to the store immediately.
         */
        get().upsertConversation(
          conversation,
        );

        /*
         * Explicitly make it active.
         *
         * MessagesPage uses this value to decide whether
         * ChatBox should be rendered.
         */
        set({
          activeConversationId:
            conversationId,
        });

        /*
         * Verify that the conversation now exists
         * in the local store.
         */
        const storedConversation =
          get().conversations.find(
            (item) =>
              item.id ===
              conversationId,
          );

        if (!storedConversation) {
          console.warn(
            "[MESSAGES] Conversation was created but was not found in local store. Re-inserting.",
          );

          set((state) => ({
            conversations:
              sortConversations([
                conversation,
                ...state.conversations.filter(
                  (item) =>
                    item.id !==
                    conversationId,
                ),
              ]),
          }));
        }

        console.log(
          "[MESSAGES] Active conversation:",
          get()
            .activeConversationId,
        );

        return conversationId;
      },
  }));