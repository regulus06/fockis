import { create } from "zustand";

import type {
  Message,
  ReactionEmoji,
  ReplyReference,
} from "../types";

import { messagesApi } from "../services/messagesApi";
import { useConversationsStore } from "./conversationsStore";

/* ============================================================================
   TYPES
============================================================================ */

interface DraftInfo {
  text: string;
  replyTo?: ReplyReference;
  editingMessageId?: string;
}

interface MessagesState {
  messagesByConversation: Record<string, Message[]>;
  loadingByConversation: Record<string, boolean>;
  drafts: Record<string, DraftInfo>;
  typingByConversation: Record<string, string[]>;
  starredIds: Set<string>;

  loadMessages: (
    conversationId: string,
  ) => Promise<void>;

  loadMore: (
    conversationId: string,
  ) => Promise<void>;

  sendMessage: (
    conversationId: string,
    payload: Partial<Message>,
  ) => Promise<void>;

  editMessage: (
    conversationId: string,
    messageId: string,
    text: string,
  ) => Promise<void>;

  deleteForMe: (
    conversationId: string,
    messageId: string,
  ) => Promise<void>;

  deleteForEveryone: (
    conversationId: string,
    messageId: string,
  ) => Promise<void>;

  toggleStar: (
    conversationId: string,
    messageId: string,
  ) => Promise<void>;

  toggleReaction: (
    conversationId: string,
    messageId: string,
    emoji: ReactionEmoji,
  ) => Promise<void>;

  setDraftText: (
    conversationId: string,
    text: string,
  ) => void;

  setReplyTo: (
    conversationId: string,
    replyTo: ReplyReference | undefined,
  ) => void;

  startEditing: (
    conversationId: string,
    messageId: string,
    text: string,
  ) => void;

  cancelEditing: (
    conversationId: string,
  ) => void;

  clearDraft: (
    conversationId: string,
  ) => void;

  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ) => void;

  receiveMessage: (
    message: Message,
  ) => void;

  simulateIncoming: (
    message: Message,
  ) => void;

  updateMessageStatus: (
    conversationId: string,
    messageId: string,
    status: Message["status"],
  ) => void;

  removeMessage: (
    conversationId: string,
    messageId: string,
  ) => void;

  updateMessage: (
    conversationId: string,
    messageId: string,
    patch: Partial<Message>,
  ) => void;
}

/* ============================================================================
   HELPERS
============================================================================ */

function normalizeMessage(
  message: Message,
): Message {
  return {
    ...message,

    id: String(message.id),

    conversationId: String(
      message.conversationId,
    ),

    senderId: String(
      message.senderId,
    ),

    status:
      message.status ??
      "sent",

    createdAt:
      message.createdAt ??
      new Date().toISOString(),
  };
}

/* ============================================================================
   SOCKET PAYLOAD NORMALIZER
============================================================================ */

/**
 * Socket.IO backend sends:
 *
 * {
 *   message: {...}
 * }
 *
 * Some versions may send the message directly.
 *
 * This helper supports both formats.
 */
function extractSocketMessage(
  payload: unknown,
): Message | null {
  if (!payload) {
    return null;
  }

  const value =
    payload as any;

  const candidate =
    value?.message ??
    value?.data?.message ??
    value?.data ??
    value;

  if (
    !candidate ||
    typeof candidate !== "object"
  ) {
    return null;
  }

  if (
    !candidate.id ||
    !candidate.conversationId ||
    !candidate.senderId
  ) {
    console.warn(
      "[MESSAGES] Ignoring invalid socket message:",
      payload,
    );

    return null;
  }

  return normalizeMessage(
    candidate as Message,
  );
}

/* ============================================================================
   STORE
============================================================================ */

export const useMessagesStore =
  create<MessagesState>((set, get) => ({

    /* ========================================================================
       INITIAL STATE
    ======================================================================== */

    messagesByConversation: {},

    loadingByConversation: {},

    drafts: {},

    typingByConversation: {},

    starredIds:
      new Set<string>(),

    /* ========================================================================
       LOAD MESSAGES
    ======================================================================== */

    loadMessages: async (
      conversationId,
    ) => {

      if (!conversationId) {
        return;
      }

      set((state) => ({
        loadingByConversation: {
          ...state.loadingByConversation,

          [conversationId]: true,
        },
      }));

      try {

        const messages =
          await messagesApi.list(
            conversationId,
          );

        const normalized =
          messages.map(
            normalizeMessage,
          );

        set((state) => {

          /*
           * IMPORTANT:
           *
           * Do not blindly replace messages that arrived through
           * Socket.IO while the REST request was running.
           *
           * Merge REST data with any messages already received live.
           */

          const liveMessages =
            state.messagesByConversation[
              conversationId
            ] ?? [];

          const byId =
            new Map<string, Message>();

          for (
            const message of normalized
          ) {
            byId.set(
              message.id,
              message,
            );
          }

          for (
            const message of liveMessages
          ) {
            byId.set(
              message.id,
              message,
            );
          }

          const merged =
            Array.from(
              byId.values(),
            ).sort(
              (a, b) =>
                new Date(
                  a.createdAt,
                ).getTime() -
                new Date(
                  b.createdAt,
                ).getTime(),
            );

          return {
            messagesByConversation: {
              ...state.messagesByConversation,

              [conversationId]:
                merged,
            },

            loadingByConversation: {
              ...state.loadingByConversation,

              [conversationId]: false,
            },
          };
        });

      } catch (error) {

        console.error(
          "[MESSAGES] Failed to load messages:",
          error,
        );

        set((state) => ({
          loadingByConversation: {
            ...state.loadingByConversation,

            [conversationId]: false,
          },
        }));
      }
    },

    /* ========================================================================
       LOAD OLDER MESSAGES
    ======================================================================== */

    loadMore: async (
      conversationId,
    ) => {

      const current =
        get()
          .messagesByConversation[
            conversationId
          ] ?? [];

      if (
        current.length === 0
      ) {
        return;
      }

      try {

        const older =
          await messagesApi.list(
            conversationId,
            {
              before:
                current[0].id,

              limit: 30,
            },
          );

        if (
          older.length === 0
        ) {
          return;
        }

        const normalized =
          older.map(
            normalizeMessage,
          );

        set((state) => {

          const existing =
            state.messagesByConversation[
              conversationId
            ] ?? [];

          const existingIds =
            new Set(
              existing.map(
                (message) =>
                  message.id,
              ),
            );

          const uniqueOlder =
            normalized.filter(
              (message) =>
                !existingIds.has(
                  message.id,
                ),
            );

          return {
            messagesByConversation: {
              ...state.messagesByConversation,

              [conversationId]: [
                ...uniqueOlder,
                ...existing,
              ],
            },
          };
        });

      } catch (error) {

        console.error(
          "[MESSAGES] Failed to load older messages:",
          error,
        );
      }
    },

    /* ========================================================================
       SEND MESSAGE
    ======================================================================== */

    sendMessage: async (
      conversationId,
      payload,
    ) => {

      if (!conversationId) {
        return;
      }

      try {

        const requestPayload = {
          conversationId,

          type:
            payload.type ??
            "text",

          text:
            payload.text,

          attachments:
            payload.attachments,

          replyTo:
            payload.replyTo,
        };

        console.log(
          "[MESSAGES] Sending message:",
          {
            conversationId,
            requestPayload,
          },
        );

        const saved =
          await messagesApi.send(
            requestPayload as any,
          );

        /*
         * If REST returns the created message,
         * immediately place it in the sender's store.
         */

        if (
          saved &&
          typeof saved === "object"
        ) {

          const normalized =
            normalizeMessage(
              saved as Message,
            );

          get().receiveMessage(
            normalized,
          );

          /*
           * Sender's own message should not increase
           * unread count.
           */
          useConversationsStore
            .getState()
            .bumpConversation(
              conversationId,
              normalized.id,
              normalized.createdAt,
              false,
            );

          return;
        }

        /*
         * If the API returns void, reload.
         *
         * The backend socket broadcast will still update
         * the receiver when properly configured.
         */
        await get().loadMessages(
          conversationId,
        );

      } catch (error) {

        console.error(
          "[MESSAGES] Send failed:",
          error,
        );

        throw error;
      }
    },

    /* ========================================================================
       EDIT MESSAGE
    ======================================================================== */

    editMessage: async (
      conversationId,
      messageId,
      text,
    ) => {

      try {

        await messagesApi.edit(
          conversationId,
          messageId,
          text,
        );

        await get().loadMessages(
          conversationId,
        );

      } catch (error) {

        console.error(
          "[MESSAGES] Edit failed:",
          error,
        );

        throw error;
      }
    },

    /* ========================================================================
       DELETE FOR ME
    ======================================================================== */

    deleteForMe: async (
      conversationId,
      messageId,
    ) => {

      try {

        await messagesApi.deleteForMe(
          conversationId,
          messageId,
        );

        await get().loadMessages(
          conversationId,
        );

      } catch (error) {

        console.error(
          "[MESSAGES] Delete-for-me failed:",
          error,
        );

        throw error;
      }
    },

    /* ========================================================================
       DELETE FOR EVERYONE
    ======================================================================== */

    deleteForEveryone: async (
      conversationId,
      messageId,
    ) => {

      try {

        await messagesApi.deleteForEveryone(
          conversationId,
          messageId,
        );

        await get().loadMessages(
          conversationId,
        );

      } catch (error) {

        console.error(
          "[MESSAGES] Delete-for-everyone failed:",
          error,
        );

        throw error;
      }
    },

    /* ========================================================================
       STAR
    ======================================================================== */

    toggleStar: async (
      conversationId,
      messageId,
    ) => {

      try {

        await messagesApi.toggleStar(
          conversationId,
          messageId,
        );

        await get().loadMessages(
          conversationId,
        );

      } catch (error) {

        console.error(
          "[MESSAGES] Star failed:",
          error,
        );

        throw error;
      }
    },

    /* ========================================================================
       REACTION
    ======================================================================== */

    toggleReaction: async (
      conversationId,
      messageId,
      emoji,
    ) => {

      try {

        await messagesApi.react(
          conversationId,
          messageId,
          emoji,
        );

        await get().loadMessages(
          conversationId,
        );

      } catch (error) {

        console.error(
          "[MESSAGES] Reaction failed:",
          error,
        );

        throw error;
      }
    },

    /* ========================================================================
       DRAFT
    ======================================================================== */

    setDraftText: (
      conversationId,
      text,
    ) => {

      set((state) => ({
        drafts: {
          ...state.drafts,

          [conversationId]: {
            ...state.drafts[
              conversationId
            ],

            text,
          },
        },
      }));
    },

    /* ========================================================================
       REPLY
    ======================================================================== */

    setReplyTo: (
      conversationId,
      replyTo,
    ) => {

      set((state) => ({
        drafts: {
          ...state.drafts,

          [conversationId]: {
            ...state.drafts[
              conversationId
            ],

            text:
              state.drafts[
                conversationId
              ]?.text ?? "",

            replyTo,
          },
        },
      }));
    },

    /* ========================================================================
       START EDITING
    ======================================================================== */

    startEditing: (
      conversationId,
      messageId,
      text,
    ) => {

      set((state) => ({
        drafts: {
          ...state.drafts,

          [conversationId]: {
            text,

            editingMessageId:
              messageId,

            replyTo:
              undefined,
          },
        },
      }));
    },

    /* ========================================================================
       CANCEL EDITING
    ======================================================================== */

    cancelEditing: (
      conversationId,
    ) => {

      set((state) => ({
        drafts: {
          ...state.drafts,

          [conversationId]: {
            text: "",

            editingMessageId:
              undefined,

            replyTo:
              undefined,
          },
        },
      }));
    },

    /* ========================================================================
       CLEAR DRAFT
    ======================================================================== */

    clearDraft: (
      conversationId,
    ) => {

      set((state) => ({
        drafts: {
          ...state.drafts,

          [conversationId]: {
            text: "",

            replyTo:
              undefined,

            editingMessageId:
              undefined,
          },
        },
      }));
    },

    /* ========================================================================
       TYPING
    ======================================================================== */

    setTyping: (
      conversationId,
      userId,
      isTyping,
    ) => {

      set((state) => {

        const current =
          state.typingByConversation[
            conversationId
          ] ?? [];

        const next = isTyping
          ? Array.from(
              new Set([
                ...current,
                userId,
              ]),
            )
          : current.filter(
              (id) =>
                id !== userId,
            );

        return {
          typingByConversation: {
            ...state.typingByConversation,

            [conversationId]:
              next,
          },
        };
      });
    },

    /* ========================================================================
       REAL-TIME INCOMING MESSAGE
    ======================================================================== */

    receiveMessage: (
      message,
    ) => {

      const normalized =
        normalizeMessage(
          message,
        );

      console.log(
        "[MESSAGES] REAL-TIME MESSAGE RECEIVED:",
        normalized,
      );

      let wasAdded = false;

      set((state) => {

        const current =
          state.messagesByConversation[
            normalized.conversationId
          ] ?? [];

        /*
         * Strong duplicate protection.
         */
        if (
          current.some(
            (item) =>
              String(item.id) ===
              String(normalized.id),
          )
        ) {
          console.log(
            "[MESSAGES] Duplicate realtime message ignored:",
            normalized.id,
          );

          return state;
        }

        wasAdded = true;

        return {
          messagesByConversation: {
            ...state.messagesByConversation,

            [normalized.conversationId]:
              [
                ...current,
                normalized,
              ],
          },
        };
      });

      /*
       * Only bump the conversation if the message
       * was actually new.
       */
      if (wasAdded) {

        useConversationsStore
          .getState()
          .bumpConversation(
            normalized.conversationId,
            normalized.id,
            normalized.createdAt,
            true,
          );
      }
    },

    /* ========================================================================
       SOCKET COMPATIBILITY
    ======================================================================== */

    simulateIncoming: (
      message,
    ) => {

      const extracted =
        extractSocketMessage(
          message,
        );

      if (!extracted) {
        return;
      }

      get().receiveMessage(
        extracted,
      );
    },

    /* ========================================================================
       MESSAGE STATUS
    ======================================================================== */

    updateMessageStatus: (
      conversationId,
      messageId,
      status,
    ) => {

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,

          [conversationId]:
            (
              state
                .messagesByConversation[
                  conversationId
                ] ?? []
            ).map(
              (message) =>
                message.id ===
                messageId
                  ? {
                      ...message,
                      status,
                    }
                  : message,
            ),
        },
      }));
    },

    /* ========================================================================
       UPDATE MESSAGE
    ======================================================================== */

    updateMessage: (
      conversationId,
      messageId,
      patch,
    ) => {

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,

          [conversationId]:
            (
              state
                .messagesByConversation[
                  conversationId
                ] ?? []
            ).map(
              (message) =>
                message.id ===
                messageId
                  ? {
                      ...message,
                      ...patch,
                    }
                  : message,
            ),
        },
      }));
    },

    /* ========================================================================
       REMOVE MESSAGE
    ======================================================================== */

    removeMessage: (
      conversationId,
      messageId,
    ) => {

      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,

          [conversationId]:
            (
              state
                .messagesByConversation[
                  conversationId
                ] ?? []
            ).filter(
              (message) =>
                message.id !==
                messageId,
            ),
        },
      }));
    },
  }));
