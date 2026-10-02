import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import adminUsersApi from "../adminUsersApi";
import UserStatusBadge from "../components/UserStatusBadge";

type MessageValue = string | null | undefined;

interface AdminMessage {
_id?: MessageValue;
id?: MessageValue;

text?: MessageValue;
content?: MessageValue;
body?: MessageValue;

type?: MessageValue;
messageType?: MessageValue;

createdAt?: string | Date | null;
sentAt?: string | Date | null;

conversationId?: MessageValue;
threadId?: MessageValue;

senderName?: MessageValue;
senderUsername?: MessageValue;
senderFockisId?: MessageValue;

recipientName?: MessageValue;
receiverName?: MessageValue;
recipientFockisId?: MessageValue;

flagged?: boolean;
isReported?: boolean;
deleted?: boolean;
isDeleted?: boolean;

moderationStatus?: MessageValue;
}

const UserMessagesPage: React.FC = () => {
const { id } = useParams<{ id: string }>();

const [messages, setMessages] = useState<AdminMessage[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string>("");

const loadMessages = useCallback(async (): Promise<void> => {
if (!id) {
setMessages([]);
setError("User ID is missing.");
setLoading(false);
return;
}

setLoading(true);
setError("");

try {
  const response = await adminUsersApi.getUserMessages(id);

  if (Array.isArray(response)) {
    setMessages(response as AdminMessage[]);
  } else {
    setMessages([]);
  }
} catch (err: unknown) {
  console.error("Failed to load user messages:", err);

  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("Failed to load user messages.");
  }

  setMessages([]);
} finally {
  setLoading(false);
}

}, [id]);

useEffect(() => {
void loadMessages();
}, [loadMessages]);

const getMessageId = (
message: AdminMessage,
index: number,
): string => {
if (message._id) {
return String(message._id);
}

if (message.id) {
  return String(message.id);
}

return "message-" + String(index);

};

const getMessageText = (
message: AdminMessage,
): string => {
if (message.text) {
return String(message.text);
}

if (message.content) {
  return String(message.content);
}

if (message.body) {
  return String(message.body);
}

if (message.messageType) {
  return "[" + String(message.messageType) + "]";
}

if (message.type) {
  return "[" + String(message.type) + "]";
}

return "[Message]";

};

const getSenderName = (
message: AdminMessage,
): string => {
if (message.senderName) {
return String(message.senderName);
}

if (message.senderUsername) {
  return String(message.senderUsername);
}

return "Unknown user";

};

const getRecipientName = (
message: AdminMessage,
): string => {
if (message.recipientName) {
return String(message.recipientName);
}

if (message.receiverName) {
  return String(message.receiverName);
}

return "Unknown user";

};

const getConversationId = (
message: AdminMessage,
): string => {
if (message.conversationId) {
return String(message.conversationId);
}

if (message.threadId) {
  return String(message.threadId);
}

return "—";
};

const getMessageType = (
message: AdminMessage,
): string => {
if (message.messageType) {
return String(message.messageType);
}

if (message.type) {
  return String(message.type);
}

return "text";

};

const getModerationStatus = (
message: AdminMessage,
): string => {
if (
message.deleted === true ||
message.isDeleted === true
) {
return "removed";
}

if (
  message.flagged === true ||
  message.isReported === true
) {
  return "flagged";
}

if (message.moderationStatus) {
  return String(message.moderationStatus);
}

return "normal";

};

const formatDate = (
value: string | Date | null | undefined,
): string => {
if (!value) {
return "—";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
  return "—";
}

return date.toLocaleString();

};

let flaggedCount = 0;
let deletedCount = 0;

const conversationIds: string[] = [];

messages.forEach((message) => {
if (
message.flagged === true ||
message.isReported === true ||
message.moderationStatus === "flagged" ||
message.moderationStatus === "pending"
) {
flaggedCount += 1;
}

if (
  message.deleted === true ||
  message.isDeleted === true ||
  message.moderationStatus === "removed"
) {
  deletedCount += 1;
}

const conversationId = getConversationId(message);

if (
  conversationId !== "—" &&
  conversationIds.indexOf(conversationId) === -1
) {
  conversationIds.push(conversationId);
}

});

const conversationCount = conversationIds.length;

const backPath = id
? "/admin/users/" + id
: "/admin/users";

return ( <div className="admin-user-subpage"> <div className="admin-user-subpage__toolbar"> <div> <Link
         to={backPath}
         className="admin-user-subpage__back"
       >
← User Overview </Link>

      <span className="admin-user-subpage__eyebrow">
        USER MANAGEMENT
      </span>

      <h1>Messages</h1>

      <p>
        Review messaging activity associated with
        this user.
      </p>
    </div>

    <button
      type="button"
      className="admin-user-subpage__refresh"
      onClick={() => {
        void loadMessages();
      }}
      disabled={loading}
    >
      {loading ? "Loading..." : "Refresh"}
    </button>
  </div>

  <div className="admin-user-subpage__notice">
    <strong>Read-only moderation view</strong>

    <span>
      Messages are displayed for authorized
      administrative review.
    </span>
  </div>

  <section className="admin-user-subpage__summary">
    <div>
      <span>Total Messages</span>
      <strong>
        {messages.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Flagged</span>
      <strong>
        {flaggedCount.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Deleted</span>
      <strong>
        {deletedCount.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Conversations</span>
      <strong>
        {conversationCount.toLocaleString()}
      </strong>
    </div>
  </section>

  <section className="admin-user-subpage__panel">
    {error !== "" && (
      <div
        className="admin-user-subpage__error"
        role="alert"
      >
        <strong>
          Unable to load messages
        </strong>

        <span>{error}</span>

        <button
          type="button"
          onClick={() => {
            void loadMessages();
          }}
        >
          Try Again
        </button>
      </div>
    )}

    <div className="admin-user-table-wrapper">
      <table className="admin-user-table">
        <thead>
          <tr>
            <th>Message</th>
            <th>From</th>
            <th>To</th>
            <th>Conversation</th>
            <th>Type</th>
            <th>Moderation</th>
            <th>Sent</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <>
              <tr>
                <td colSpan={7}>
                  Loading messages...
                </td>
              </tr>

              <tr>
                <td colSpan={7}>
                  Loading messages...
                </td>
              </tr>

              <tr>
                <td colSpan={7}>
                  Loading messages...
                </td>
              </tr>
            </>
          )}

          {!loading &&
            error === "" &&
            messages.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="admin-user-table__empty"
                >
                  No messages found.
                </td>
              </tr>
            )}

          {!loading &&
            messages.length > 0 &&
            messages.map((message, index) => {
              const messageId = getMessageId(
                message,
                index,
              );

              const messageText =
                getMessageText(message);

              const senderName =
                getSenderName(message);

              const recipientName =
                getRecipientName(message);

              const conversationId =
                getConversationId(message);

              const messageType =
                getMessageType(message);

              const moderationStatus =
                getModerationStatus(message);

              return (
                <tr key={messageId}>
                  <td>
                    <div className="admin-user-table__primary">
                      <strong>
                        {messageText.length > 100
                          ? messageText.substring(
                              0,
                              100,
                            ) + "..."
                          : messageText}
                      </strong>

                      <small>
                        ID: {messageId}
                      </small>
                    </div>
                  </td>

                  <td>
                    <div className="admin-user-table__primary">
                      <strong>
                        {senderName}
                      </strong>

                      {message.senderFockisId && (
                        <small>
                          Fockis ID:{" "}
                          {String(
                            message.senderFockisId,
                          )}
                        </small>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="admin-user-table__primary">
                      <strong>
                        {recipientName}
                      </strong>

                      {message.recipientFockisId && (
                        <small>
                          Fockis ID:{" "}
                          {String(
                            message.recipientFockisId,
                          )}
                        </small>
                      )}
                    </div>
                  </td>

                  <td>{conversationId}</td>

                  <td>{messageType}</td>

                  <td>
                    <UserStatusBadge
                      status={moderationStatus}
                      size="sm"
                    />
                  </td>

                  <td>
                    {formatDate(
                      message.createdAt ??
                        message.sentAt,
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </section>
</div>

);
};

export default UserMessagesPage;
