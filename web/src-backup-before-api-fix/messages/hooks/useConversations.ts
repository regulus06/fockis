import {
  useEffect,
  useMemo,
} from "react";

import {
  useConversationsStore,
} from "../store/conversationsStore";

import {
  getMessagePreview,
} from "../utils/messageFormatting";

import {
  useMessagesStore,
} from "../store/messagesStore";


/* ============================================================================
   FOCKIS USE CONVERSATIONS
============================================================================ */

export function useConversations() {

  /* ==========================================================================
     CONVERSATIONS
  ========================================================================== */

  const conversations =
    useConversationsStore(
      (state) =>
        state.conversations,
    );

  const participants =
    useConversationsStore(
      (state) =>
        state.participants,
    );

  const loading =
    useConversationsStore(
      (state) =>
        state.loading,
    );

  const loadConversations =
    useConversationsStore(
      (state) =>
        state.loadConversations,
    );

  const activeConversationId =
    useConversationsStore(
      (state) =>
        state.activeConversationId,
    );

  const setActiveConversation =
    useConversationsStore(
      (state) =>
        state.setActiveConversation,
    );

  const startConversationWith =
    useConversationsStore(
      (state) =>
        state.startConversationWith,
    );


  /* ==========================================================================
     MESSAGES
  ========================================================================== */

  const messagesByConversation =
    useMessagesStore(
      (state) =>
        state.messagesByConversation,
    );


  /* ==========================================================================
     INITIAL LOAD
  ========================================================================== */

  useEffect(() => {

    if (
      conversations.length > 0 ||
      loading
    ) {
      return;
    }


    void loadConversations();

  }, [
    conversations.length,
    loading,
    loadConversations,
  ]);


  /* ==========================================================================
     KEEP ACTIVE CONVERSATION VALID

     IMPORTANT:

     Do NOT clear the active conversation while the conversation list is
     still loading.

     This prevents this race:

       create conversation
            ↓
       activeConversationId = NEW_ID
            ↓
       conversation list refresh begins
            ↓
       conversations temporarily becomes []
            ↓
       old code sees "NEW_ID not found"
            ↓
       setActiveConversation(null)
            ↓
       ChatBox disappears

     That was the main reason the screen could return to EmptyConversation.
  ========================================================================== */

  useEffect(() => {

    if (!activeConversationId) {
      return;
    }


    /*
     * While the server is loading the conversation list, preserve the
     * active conversation.
     */
    if (loading) {
      return;
    }


    /*
     * If the conversation exists, everything is fine.
     */
    const exists =
      conversations.some(
        (conversation) =>
          String(
            conversation.id,
          ) ===
          String(
            activeConversationId,
          ),
      );


    if (exists) {
      return;
    }


    /*
     * If there are no conversations at all, do not immediately clear the
     * active ID. A newly-created conversation may still be settling into
     * the store.
     */
    if (conversations.length === 0) {
      return;
    }


    /*
     * Only clear an active ID when the conversation list has finished
     * loading and contains other conversations but not this one.
     */
    console.warn(
      "[FOCKIS MESSAGES] Active conversation no longer exists:",
      activeConversationId,
    );


    setActiveConversation(null);

  }, [
    activeConversationId,
    conversations,
    loading,
    setActiveConversation,
  ]);


  /* ==========================================================================
     ENRICH CONVERSATIONS
  ========================================================================== */

  const items =
    useMemo(() => {

      return conversations.map(
        (conversation) => {

          /* ================================================================
             DIRECT MESSAGE
          ================================================================ */

          if (
            !conversation.isGroup &&
            conversation.otherUser
          ) {

            const user =
              conversation.otherUser;


            const messages =
              messagesByConversation[
                String(
                  conversation.id,
                )
              ];


            const lastMessage =
              messages &&
              messages.length > 0
                ? messages[
                    messages.length - 1
                  ]
                : undefined;


            /*
             * Prefer the participant already stored in Zustand.
             *
             * If it does not exist yet, construct one directly from
             * conversation.otherUser.
             */
            const participant =
              participants[
                String(user.id)
              ] ||
              {
                id:
                  String(
                    user.id,
                  ),

                fockisId:
                  user.fockisId ||
                  "",

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


            return {

              conversation,

              participant,

              preview:
                getMessagePreview(
                  lastMessage,
                ),

              title:
                user.name ||
                user.username ||
                "User",

              avatar:
                user.avatar ||
                user.profilePicture ||
                "",

            };

          }


          /* ================================================================
             GROUP
          ================================================================ */

          const messages =
            messagesByConversation[
              String(
                conversation.id,
              )
            ];


          const lastMessage =
            messages &&
            messages.length > 0
              ? messages[
                  messages.length - 1
                ]
              : undefined;


          return {

            conversation,

            participant:
              undefined,

            preview:
              getMessagePreview(
                lastMessage,
              ),

            title:
              conversation.groupName ||
              "Group",

            avatar:
              conversation.groupAvatar ||
              "",

          };

        },
      );

    }, [
      conversations,
      participants,
      messagesByConversation,
    ]);


  /* ==========================================================================
     ACTIVE ITEM
  ========================================================================== */

  const activeItem =
    useMemo(() => {

      if (!activeConversationId) {
        return undefined;
      }


      return items.find(
        (item) =>
          String(
            item.conversation.id,
          ) ===
          String(
            activeConversationId,
          ),
      );

    }, [
      items,
      activeConversationId,
    ]);


  /* ==========================================================================
     DEBUG
  ========================================================================== */

  useEffect(() => {

    console.log(
      "[FOCKIS MESSAGES] useConversations:",
      {
        conversationCount:
          conversations.length,

        loading,

        activeConversationId,

        activeItemFound:
          Boolean(
            activeItem,
          ),

        activeItemId:
          activeItem?.conversation?.id ??
          null,

        activeTitle:
          activeItem?.title ??
          null,

        participantId:
          activeItem?.participant?.id ??
          null,

        participantFockisId:
          activeItem?.participant?.fockisId ??
          null,
      },
    );

  }, [
    conversations,
    loading,
    activeConversationId,
    activeItem,
  ]);


  /* ==========================================================================
     RETURN
  ========================================================================== */

  return {

    items,

    conversations,

    participants,

    loading,

    activeConversationId,

    activeItem,

    setActiveConversation,

    startConversationWith,

  };

}