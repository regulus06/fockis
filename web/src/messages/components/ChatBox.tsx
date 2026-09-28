/**
 * ============================================================================
 * FOCKIS MESSAGES - CHAT BOX
 * ============================================================================
 *
 * Real conversation UI.
 *
 * Responsibilities:
 * - Display real messages from messagesStore
 * - Load messages for the active conversation
 * - Join/leave the real-time conversation socket room
 * - Display the real participant information
 * - Connect ChatHeader actions
 * - Render the shared MessageComposer
 *
 * IMPORTANT:
 * - conversation.id is the internal conversation ID.
 * - participant.id is the internal user ID.
 * - participant.fockisId is the public Fockis ID.
 *
 * IMPORTANT:
 * - MessageComposer owns the message input.
 * - MessageComposer owns attachments.
 * - MessageComposer owns emoji.
 * - MessageComposer owns voice recording.
 * - MessageComposer owns sending text/audio messages.
 *
 * DO NOT add another composer here.
 * ============================================================================
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  Conversation,
  Participant,
} from "../types";

import ChatHeader from "./ChatHeader";
import MessageComposer from "./MessageComposer";

import {
  useMessagesStore,
} from "../store/messagesStore";

import {
  messageSocket,
} from "../services/messageSocket";

import "../styles/chatbox.scss";


/* ============================================================================
   TYPES
============================================================================ */

interface ChatBoxProps {
  conversation: Conversation;
  participant?: Participant;
  title: string;
  avatar: string;
  onBack: () => void;
  onToggleInfo: () => void;
  infoOpen: boolean;
}


/* ============================================================================
   STABLE EMPTY VALUES
============================================================================ */

/*
 * IMPORTANT:
 *
 * These values MUST NOT be created inside Zustand selectors.
 *
 * Bad:
 *
 *   state.messagesByConversation[id] ?? []
 *
 * Every evaluation can create a new array.
 *
 * Good:
 *
 *   state.messagesByConversation[id] ?? EMPTY_MESSAGES
 */

const EMPTY_MESSAGES: any[] = [];

const EMPTY_DRAFT = {
  text: "",
};


/* ============================================================================
   HELPERS
============================================================================ */

function getMessageText(
  message: any,
): string {
  return typeof message?.text === "string"
    ? message.text
    : "";
}


function getMessageSenderId(
  message: any,
): string {
  return String(
    message?.senderId ??
      message?.sender?._id ??
      message?.sender?.id ??
      "",
  );
}


function getMessageCreatedAt(
  message: any,
): string {
  return String(
    message?.createdAt ??
      message?.updatedAt ??
      new Date().toISOString(),
  );
}


/* ============================================================================
   COMPONENT
============================================================================ */

export default function ChatBox({
  conversation,
  participant,
  title,
  avatar,
  onBack,
  onToggleInfo,
  infoOpen: _infoOpen,
}: ChatBoxProps) {


  /* ==========================================================================
     CONVERSATION ID
  ========================================================================== */

  const conversationId =
    String(
      conversation?.id ??
        (conversation as any)?._id ??
        "",
    ).trim();


  /* ==========================================================================
     STORE
  ========================================================================== */

  /*
   * Messages for this conversation.
   *
   * IMPORTANT:
   * EMPTY_MESSAGES is stable.
   */

  const messages =
    useMessagesStore(
      useCallback(
        (state) => {
          if (!conversationId) {
            return EMPTY_MESSAGES;
          }

          return (
            state.messagesByConversation[
              conversationId
            ] ??
            EMPTY_MESSAGES
          );
        },
        [
          conversationId,
        ],
      ),
    );


  /*
   * Loading state.
   */

  const loading =
    useMessagesStore(
      useCallback(
        (state) => {
          if (!conversationId) {
            return false;
          }

          return (
            state.loadingByConversation?.[
              conversationId
            ] === true
          );
        },
        [
          conversationId,
        ],
      ),
    );


  /*
   * Draft.
   *
   * MessageComposer normally owns the draft interaction,
   * but keeping this selector here is harmless and preserves
   * the existing store subscription behavior.
   */

  const draft =
    useMessagesStore(
      useCallback(
        (state) => {
          if (!conversationId) {
            return EMPTY_DRAFT;
          }

          return (
            state.drafts?.[
              conversationId
            ] ??
            EMPTY_DRAFT
          );
        },
        [
          conversationId,
        ],
      ),
    );


  /*
   * Load messages action.
   */

  const loadMessages =
    useMessagesStore(
      useCallback(
        (state) =>
          state.loadMessages,
        [],
      ),
    );


  /* ==========================================================================
     LOCAL UI REFS
  ========================================================================== */

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null,
    );


  /* ==========================================================================
     LOAD CONVERSATION
  ========================================================================== */

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    console.log(
      "[CHAT BOX] Loading messages:",
      conversationId,
    );

    void loadMessages(
      conversationId,
    );
  }, [
    conversationId,
    loadMessages,
  ]);


  /* ==========================================================================
     JOIN SOCKET CONVERSATION
  ========================================================================== */

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    console.log(
      "[CHAT BOX] Joining conversation:",
      conversationId,
    );

    messageSocket.joinConversation(
      conversationId,
    );

    return () => {
      console.log(
        "[CHAT BOX] Leaving conversation:",
        conversationId,
      );

      messageSocket.leaveConversation(
        conversationId,
      );
    };
  }, [
    conversationId,
  ]);


  /* ==========================================================================
     AUTO SCROLL
  ========================================================================== */

  useEffect(() => {
    const element =
      messagesEndRef.current;

    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    });
  }, [
    messages.length,
  ]);


  /* ==========================================================================
     SEARCH
  ========================================================================== */

  const handleSearch =
    useCallback(() => {
      window.dispatchEvent(
        new CustomEvent(
          "fockis:messages:search",
          {
            detail: {
              conversationId,
            },
          },
        ),
      );
    }, [
      conversationId,
    ]);


  /* ==========================================================================
     MESSAGE LIST
  ========================================================================== */

  const renderedMessages =
    useMemo(() => {
      if (
        !Array.isArray(
          messages,
        )
      ) {
        return EMPTY_MESSAGES;
      }

      return messages.filter(
        Boolean,
      );
    }, [
      messages,
    ]);


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <section
      className="chat-box"
    >

      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <ChatHeader
        title={
          title
        }
        avatar={
          avatar
        }
        participant={
          participant
        }
        onBack={
          onBack
        }
        onToggleInfo={
          onToggleInfo
        }
        onSearch={
          handleSearch
        }
      />


      {/* ====================================================================
          MESSAGE AREA
      ==================================================================== */}

      <div
        className="chat-box__messages"
        aria-live="polite"
        aria-label={
          `Messages with ${title}`
        }
      >

        {/* ------------------------------------------------------------------
            LOADING
        ------------------------------------------------------------------ */}

        {loading &&
          renderedMessages.length ===
            0 && (

          <div
            className="chat-box__loading"
          >
            <div
              className="chat-box__loading-spinner"
            />

            <span>
              Loading messages...
            </span>
          </div>
        )}


        {/* ------------------------------------------------------------------
            EMPTY STATE
        ------------------------------------------------------------------ */}

        {!loading &&
          renderedMessages.length ===
            0 && (

          <div
            className="chat-box__empty"
          >

            <div
              className="chat-box__empty-avatar"
            >

              {avatar ||
              participant?.avatar ||
              participant?.profilePicture ? (

                <img
                  src={
                    avatar ||
                    participant?.avatar ||
                    participant?.profilePicture ||
                    ""
                  }
                  alt=""
                />

              ) : (

                <span>
                  {title
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>

              )}

            </div>


            <h2>
              {title}
            </h2>


            {participant?.fockisId && (
              <p
                className="chat-box__fockis-id"
              >
                Fockis ID:{" "}

                <strong>
                  {participant.fockisId}
                </strong>
              </p>
            )}


            <p>
              Start a conversation
              with {title}.
            </p>


            <p
              className="chat-box__empty-hint"
            >
              Type a message below
              to send it.
            </p>

          </div>
        )}


        {/* ------------------------------------------------------------------
            REAL MESSAGE LIST
        ------------------------------------------------------------------ */}

        {renderedMessages.length >
          0 && (

          <div
            className="chat-box__message-list"
          >

            {renderedMessages.map(
              (
                message: any,
                index: number,
              ) => {

                const messageId =
                  String(
                    message?.id ??
                      message?._id ??
                      `message-${conversationId}-${index}`,
                  );


                const text =
                  getMessageText(
                    message,
                  );


                const senderId =
                  getMessageSenderId(
                    message,
                  );


                const createdAt =
                  getMessageCreatedAt(
                    message,
                  );


                /*
                 * Participant ID is the OTHER user's
                 * internal Mongo user ID.
                 */

                const isIncoming =
                  participant?.id
                    ? senderId ===
                      String(
                        participant.id,
                      )
                    : false;


                const isOutgoing =
                  !isIncoming;


                return (
                  <div
                    key={
                      messageId
                    }
                    className={[
                      "chat-box__message",

                      isOutgoing
                        ? "chat-box__message--outgoing"
                        : "chat-box__message--incoming",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >

                    {/* ====================================================
                        INCOMING AVATAR
                    ==================================================== */}

                    {isIncoming && (
                      <div
                        className="chat-box__message-avatar"
                      >

                        {participant?.avatar ||
                        participant?.profilePicture ? (

                          <img
                            src={
                              participant.avatar ||
                              participant.profilePicture ||
                              ""
                            }
                            alt=""
                          />

                        ) : (

                          <span>
                            {title
                              .trim()
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </span>

                        )}

                      </div>
                    )}


                    {/* ====================================================
                        MESSAGE CONTENT
                    ==================================================== */}

                    <div
                      className="chat-box__message-content"
                    >

                      <div
                        className="chat-box__bubble"
                      >

                        {/*
                         * Text messages continue to render normally.
                         *
                         * Audio/attachment rendering can be handled by
                         * MessageBubble if this ChatBox is later migrated
                         * fully to that component.
                         */}

                        {text}

                      </div>


                      <div
                        className="chat-box__message-meta"
                      >

                        <time
                          className="chat-box__message-time"
                          dateTime={
                            createdAt
                          }
                        >
                          {new Date(
                            createdAt,
                          ).toLocaleTimeString(
                            [],
                            {
                              hour:
                                "numeric",

                              minute:
                                "2-digit",
                            },
                          )}
                        </time>


                        {/* ==================================================
                            MESSAGE STATUS
                        ================================================== */}

                        {isOutgoing &&
                          message?.status && (

                          <span
                            className="chat-box__message-status"
                          >

                            {message.status ===
                            "read"
                              ? "✓✓"
                              : message.status ===
                                  "delivered"
                                ? "✓✓"
                                : "✓"}

                          </span>

                        )}

                      </div>

                    </div>

                  </div>
                );
              },
            )}


            <div
              ref={
                messagesEndRef
              }
              aria-hidden="true"
            />

          </div>
        )}

      </div>


      {/* ====================================================================
          VOICE / TEXT / ATTACHMENT COMPOSER
      ==================================================================== */}

      <MessageComposer
        conversationId={
          conversationId
        }
      />

    </section>
  );
}