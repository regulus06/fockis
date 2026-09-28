import {
  useEffect,
  useRef,
} from "react";

import {
  Reply,
  Copy,
  Forward,
  Star,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import type { Message } from "../types";

import {
  canEditMessage,
} from "../utils/messageHelpers";

import {
  useCurrentUserId,
} from "../hooks/useCurrentUserId";

interface MessageContextMenuProps {
  message: Message;
  x: number;
  y: number;

  onClose: () => void;

  onReply: () => void;

  onCopy: () => void;

  onForward: () => void;

  onStar: () => void;

  onEdit: () => void;

  onDelete: () => void;

  onDeleteForEveryone: () => void;
}

export default function MessageContextMenu({
  message,
  x,
  y,
  onClose,
  onReply,
  onCopy,
  onForward,
  onStar,
  onEdit,
  onDelete,
  onDeleteForEveryone,
}: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  const currentUserId = useCurrentUserId();

  /*
   * Normalize IDs before comparing them.
   *
   * This protects against:
   *   "123" vs 123
   *   ObjectId-like values
   *   accidental whitespace
   */
  const senderId = String(
    message.senderId ?? "",
  ).trim();

  const userId = String(
    currentUserId ?? "",
  ).trim();

  const isOwn =
    Boolean(senderId) &&
    Boolean(userId) &&
    senderId === userId;

  const editable =
    isOwn &&
    message.type === "text" &&
    !message.deletedForEveryone;

  /*
   * Temporary diagnostic logging.
   *
   * This will tell us immediately whether the
   * logged-in user's ID matches the message sender.
   */
  console.log("[MESSAGES] Context menu ownership:", {
    messageId: message.id,
    messageSenderId: senderId,
    currentUserId: userId,
    messageType: message.type,
    deletedForEveryone: message.deletedForEveryone,
    isOwn,
    editable,
  });

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(
          event.target as Node,
        )
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "mousedown",
      handler,
    );

    document.addEventListener(
      "contextmenu",
      handler,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handler,
      );

      document.removeEventListener(
        "contextmenu",
        handler,
      );
    };
  }, [onClose]);

  const item = (
    icon: React.ReactNode,
    label: string,
    action: () => void,
    danger = false,
  ) => (
    <button
      type="button"
      className={`message-context-menu__item ${
        danger ? "is-danger" : ""
      }`}
      onClick={() => {
        action();
        onClose();
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={ref}
      className="message-context-menu"
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 99999,
      }}
      role="menu"
    >
      {item(
        <Reply size={16} />,
        "Reply",
        onReply,
      )}

      {message.type === "text" &&
        item(
          <Copy size={16} />,
          "Copy",
          onCopy,
        )}

      {item(
        <Forward size={16} />,
        "Forward",
        onForward,
      )}

      {item(
        <Star size={16} />,
        message.starred
          ? "Unstar"
          : "Star",
        onStar,
      )}

      {editable &&
        item(
          <Pencil size={16} />,
          "Edit",
          onEdit,
        )}

      {item(
        <Trash2 size={16} />,
        "Delete for me",
        onDelete,
        true,
      )}

      {isOwn &&
        item(
          <Users size={16} />,
          "Delete for everyone",
          onDeleteForEveryone,
          true,
        )}
    </div>
  );
}