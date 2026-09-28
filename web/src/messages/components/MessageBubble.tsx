import { useState } from "react";

import type {
  Message,
  ReactionEmoji,
} from "../types";

import {
  useCurrentUserId,
} from "../hooks/useCurrentUserId";

import {
  formatMessageTime,
} from "../utils/dateHelpers";

import MessageStatus from "./MessageStatus";
import MessageReactions from "./MessageReactions";
import MessageActions from "./MessageActions";
import MessageContextMenu from "./MessageContextMenu";
import ReplyPreview from "./ReplyPreview";
import ImageMessage from "./ImageMessage";
import VideoMessage from "./VideoMessage";
import DocumentMessage from "./DocumentMessage";
import VoiceMessage from "./VoiceMessage";

import {
  useMessagesStore,
} from "../store/messagesStore";

import "../styles/message-bubble.scss";

interface MessageBubbleProps {
  message: Message;
  showAvatar: boolean;
  showTail: boolean;
  senderName: string;
  senderAvatar?: string;
  onReply: () => void;
  onForward: () => void;
  onScrollToReply: (
    messageId: string,
  ) => void;
  onOpenMedia: (
    attachments:
      | Message["attachments"],
    index: number,
  ) => void;
}

export default function MessageBubble({
  message,
  showAvatar,
  showTail,
  senderName,
  senderAvatar,
  onReply,
  onForward,
  onScrollToReply,
  onOpenMedia,
}: MessageBubbleProps) {
  const currentUserId =
    useCurrentUserId();

  const isOwn =
    String(message.senderId) ===
    String(currentUserId);

  const [menuPos, setMenuPos] =
    useState<{
      x: number;
      y: number;
    } | null>(null);

  const toggleReaction =
    useMessagesStore(
      (state) =>
        state.toggleReaction,
    );

  const toggleStar =
    useMessagesStore(
      (state) =>
        state.toggleStar,
    );

  const deleteForMe =
    useMessagesStore(
      (state) =>
        state.deleteForMe,
    );

  const deleteForEveryone =
    useMessagesStore(
      (state) =>
        state.deleteForEveryone,
    );

  const startEditing =
    useMessagesStore(
      (state) =>
        state.startEditing,
    );

  /* --------------------------------------------------------------------------
     CONTEXT MENU
  -------------------------------------------------------------------------- */

  const openMenu = (
    event: React.MouseEvent,
  ) => {
    event.preventDefault();

    setMenuPos({
      x: event.clientX,
      y: event.clientY,
    });
  };

  /* --------------------------------------------------------------------------
     LONG PRESS
  -------------------------------------------------------------------------- */

  let pressTimer:
    | ReturnType<typeof setTimeout>
    | null = null;

  const handleTouchStart = (
    event: React.TouchEvent,
  ) => {
    const touch =
      event.touches[0];

    if (!touch) {
      return;
    }

    pressTimer = setTimeout(() => {
      setMenuPos({
        x: touch.clientX,
        y: touch.clientY,
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  const handleTouchCancel = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  /* --------------------------------------------------------------------------
     REACTION
  -------------------------------------------------------------------------- */

  const handleReact = (
    emoji: ReactionEmoji,
  ) => {
    toggleReaction(
      message.conversationId,
      message.id,
      emoji,
    );
  };

  /* --------------------------------------------------------------------------
     DELETED MESSAGE
  -------------------------------------------------------------------------- */

  if (message.deletedForEveryone) {
    return (
      <div
        className={`message-bubble-row ${
          isOwn ? "is-own" : ""
        }`}
      >
        {!isOwn && (
          <div className="message-bubble-row__avatar-spacer" />
        )}

        <div className="message-bubble message-bubble--deleted">
          <span>
            This message was deleted
          </span>
        </div>
      </div>
    );
  }

  /* --------------------------------------------------------------------------
     MESSAGE
  -------------------------------------------------------------------------- */

  return (
    <div
      className={[
        "message-bubble-row",
        isOwn ? "is-own" : "",
        showTail
          ? "has-tail"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onContextMenu={openMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={
        handleTouchCancel
      }
    >
      {/* --------------------------------------------------------------------
         AVATAR
      -------------------------------------------------------------------- */}

      {!isOwn && (
        <div className="message-bubble-row__avatar">
          {showAvatar &&
          senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
            />
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------
         MESSAGE CONTENT
      -------------------------------------------------------------------- */}

      <div className="message-bubble-row__content">

        {/* MESSAGE ACTIONS */}

        <MessageActions
          isOwn={isOwn}
          onReply={onReply}
          onReact={handleReact}
          onOpenMenu={() =>
            setMenuPos({
              x:
                window.innerWidth /
                2,
              y:
                window.innerHeight /
                2,
            })
          }
        />

        {/* BUBBLE */}

        <div
          className={[
            "message-bubble",
            `message-bubble--${message.type}`,
            isOwn
              ? "is-own"
              : "is-other",
            showTail
              ? "has-tail"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {/* REPLY */}

          {message.replyTo && (
            <ReplyPreview
              reply={
                message.replyTo
              }
              variant="quote"
              onClick={() =>
                onScrollToReply(
                  message.replyTo!
                    .messageId,
                )
              }
            />
          )}

          {/* TEXT */}

          {message.type ===
            "text" && (
            <p className="message-bubble__text">
              {message.text}
            </p>
          )}

          {/* IMAGE */}

          {message.type ===
            "image" &&
            message.attachments &&
            message.attachments
              .length > 0 && (
              <ImageMessage
                attachments={
                  message.attachments
                }
                caption={
                  message.text
                }
                onOpen={(index) =>
                  onOpenMedia(
                    message.attachments!,
                    index,
                  )
                }
              />
            )}

          {/* VIDEO */}

          {message.type ===
            "video" &&
            message.attachments?.[0] && (
              <VideoMessage
                attachment={
                  message.attachments[0]
                }
                onOpenFullscreen={() =>
                  onOpenMedia(
                    message.attachments!,
                    0,
                  )
                }
              />
            )}

          {/* DOCUMENT / FILE */}

          {(message.type ===
            "document" ||
            message.type ===
              "file") &&
            message.attachments?.[0] && (
              <DocumentMessage
                attachment={
                  message.attachments[0]
                }
              />
            )}

          {/* AUDIO */}

          {message.type ===
            "audio" &&
            message.attachments?.[0] && (
              <VoiceMessage
                attachment={
                  message.attachments[0]
                }
              />
            )}

          {/* MESSAGE META */}

          <div className="message-bubble__meta">
            {message.editedAt && (
              <span className="message-bubble__edited">
                edited
              </span>
            )}

            {message.starred && (
              <span className="message-bubble__starred">
                ★
              </span>
            )}

            <span className="message-bubble__time">
              {formatMessageTime(
                message.createdAt,
              )}
            </span>

            {isOwn && (
              <MessageStatus
                status={
                  message.status
                }
              />
            )}
          </div>
        </div>

        {/* REACTIONS */}

        <MessageReactions
          reactions={
            message.reactions
          }
          onToggle={handleReact}
        />
      </div>

      {/* --------------------------------------------------------------------
         CONTEXT MENU
      -------------------------------------------------------------------- */}

      {menuPos && (
        <MessageContextMenu
          message={message}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() =>
            setMenuPos(null)
          }
          onReply={onReply}
          onCopy={() => {
            if (
              message.text &&
              navigator.clipboard
            ) {
              navigator.clipboard.writeText(
                message.text,
              );
            }
          }}
          onForward={onForward}
          onStar={() =>
            toggleStar(
              message.conversationId,
              message.id,
            )
          }
          onEdit={() =>
            startEditing(
              message.conversationId,
              message.id,
              message.text ?? "",
            )
          }
          onDelete={() =>
            deleteForMe(
              message.conversationId,
              message.id,
            )
          }
          onDeleteForEveryone={() =>
            deleteForEveryone(
              message.conversationId,
              message.id,
            )
          }
        />
      )}
    </div>
  );
}