import {
  MessageCircle,
  Send,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";

import type {
  ViewerChatMessage,
} from "../hooks/useLiveViewer";

interface ViewerChatProps {
  messages: ViewerChatMessage[];
  onSend: (
    message: string,
  ) => void | Promise<void>;
}

export function ViewerChat({
  messages,
  onSend,
}: ViewerChatProps) {
  const [message, setMessage] =
    useState("");

  const submit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const value =
      message.trim();

    if (!value) {
      return;
    }

    await onSend(value);
    setMessage("");
  };

  return (
    <aside className="viewer-chat">
      <div className="viewer-chat__header">
        <div>
          <MessageCircle
            size={18}
          />

          <strong>
            Live Chat
          </strong>
        </div>

        <span>
          {messages.length}
        </span>
      </div>

      <div className="viewer-chat__messages">
        {messages.length === 0 ? (
          <div className="viewer-chat__empty">
            <MessageCircle
              size={28}
            />

            <strong>
              Welcome to the live
            </strong>

            <span>
              Be the first person to
              say something.
            </span>
          </div>
        ) : (
          messages.map(
            (item) => (
              <div
                className="viewer-chat__message"
                key={item.id}
              >
                <div className="viewer-chat__avatar">
                  {item.avatarUrl ? (
                    <img
                      src={
                        item.avatarUrl
                      }
                      alt=""
                    />
                  ) : (
                    (
                      item.displayName ??
                      item.username
                    )
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="viewer-chat__body">
                  <span className="viewer-chat__username">
                    {item.displayName ??
                      item.username}
                  </span>

                  <p>
                    {item.message}
                  </p>
                </div>
              </div>
            )
          )
        )}
      </div>

      <form
        className="viewer-chat__form"
        onSubmit={submit}
      >
        <input
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value,
            )
          }
          placeholder="Say something..."
          maxLength={500}
          aria-label="Live chat message"
        />

        <button
          type="submit"
          disabled={
            !message.trim()
          }
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </form>
    </aside>
  );
}