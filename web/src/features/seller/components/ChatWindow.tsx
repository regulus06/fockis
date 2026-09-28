import { useEffect, useState } from "react";

import { chatApi } from "../services/chatApi";

type SellerMessage = {
  _id: string;
  conversationId?: string;

  senderId?: string;

  sender?: {
    _id?: string;
    username?: string;
  };

  text?: string;
  content?: string;
};

type MessagesResponse =
  | SellerMessage[]
  | {
      messages?: SellerMessage[];
    };

function getCurrentUserId(): string {
  /*
   * Support the common auth keys used by the app.
   * We do not hardcode a fake seller/user ID.
   */
  const possibleKeys = [
    "userId",
    "currentUserId",
    "authUserId",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  /*
   * Some apps store the authenticated user inside a JSON object.
   */
  const possibleUserKeys = [
    "user",
    "currentUser",
    "authUser",
    "userData",
  ];

  for (const key of possibleUserKeys) {
    const raw = localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      const id =
        parsed?._id ??
        parsed?.id ??
        parsed?.userId;

      if (id) {
        return String(id);
      }
    } catch {
      // Ignore invalid JSON and continue checking.
    }
  }

  return "";
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<SellerMessage[]>([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMessages();
  }, []);

  async function loadMessages() {
    try {
      setLoading(true);
      setError(null);

      const data =
        (await chatApi.getSellerMessages()) as MessagesResponse;

      if (Array.isArray(data)) {
        setMessages(data);
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        Array.isArray(data.messages)
      ) {
        setMessages(data.messages);
        return;
      }

      setMessages([]);
    } catch (err) {
      console.error("MESSAGES LOAD ERROR:", err);

      setMessages([]);
      setError("Unable to load customer messages.");
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const message = text.trim();

    if (!message || sending) {
      return;
    }

    const conversationId =
      messages[0]?.conversationId;

    if (!conversationId) {
      setError("No conversation is available for this message.");
      return;
    }

    const senderId = getCurrentUserId();

    if (!senderId) {
      setError(
        "Your account could not be identified. Please sign in again."
      );
      return;
    }

    try {
      setSending(true);
      setError(null);

      await chatApi.sendMessage({
        conversationId,
        senderId,
        content: message,
      });

      setText("");

      await loadMessages();
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);

      setError(
        "Something went wrong sending your message. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card">
      <h2>💬 Customer Messages</h2>

      {error && (
        <p
          style={{
            color: "var(--danger)",
            marginBottom: "12px",
          }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <div>
          {messages.map((msg) => (
            <div
              key={msg._id}
              className="message"
            >
              <strong>
                {msg.sender?.username || "Customer"}
              </strong>

              <p>
                {msg.content ||
                  msg.text ||
                  ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          value={text}
          placeholder="Reply customer..."
          disabled={
            sending ||
            messages.length === 0
          }
          onChange={(e) =>
            setText(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void send();
            }
          }}
        />

        <button
          type="button"
          onClick={() => void send()}
          disabled={
            sending ||
            !text.trim() ||
            messages.length === 0
          }
        >
          {sending
            ? "Sending..."
            : "Send"}
        </button>
      </div>
    </div>
  );
}