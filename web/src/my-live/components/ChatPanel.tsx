import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  EyeOff,
  MessageSquare,
  MoreHorizontal,
  Pin,
  SendHorizontal,
  Smile,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import type {
  Analytics,
  ChatMessage,
  Guest,
  Phase,
} from "../types";
import { formatCount } from "../utils";
import { Avatar, EmptyState, Menu } from "./ui/Primitives";

/** Only the most recent messages are rendered to keep long lives smooth. */
const MAX_RENDERED_MESSAGES = 200;

const EMOJIS = [
  "😀", "😂", "😍", "🥰", "😎", "🤩", "😮", "😢",
  "🔥", "💙", "❤️", "👏", "🙌", "👍", "🎉", "✨",
  "💯", "🙏", "👀", "🤝", "🎮", "🌹", "⭐", "🚀",
];

type RightTab = "chat" | "guests" | "viewers";

const GUEST_STATUS_LABEL: Record<Guest["status"], string> = {
  invited: "Invited",
  accepted: "Connecting…",
  connected: "Connected",
  muted: "Muted",
  declined: "Declined",
  removed: "Removed",
  left: "Disconnected",
};

/* ============================================================================
   CHAT ROW
   ============================================================================ */

const ChatMessageRow = memo(function ChatMessageRow({
  message,
  onPin,
  onHide,
  onHideUser,
}: {
  message: ChatMessage;
  onPin: (id: string) => void;
  onHide: (id: string) => void;
  onHideUser?: (username: string) => void;
}) {
  return (
    <li className={`chat-row ${message.isPinned ? "chat-row--pinned" : ""}`}>
      <Avatar name={message.username} tone={message.avatarTone} size="md" />

      <div className="chat-row__body">
        <span className={`chat-row__username ${message.isModerator ? "chat-row__username--mod" : ""}`}>
          {message.username}
          {message.isPinned && <span className="chat-row__pin-tag">Highlighted</span>}
        </span>
        <p className="chat-row__text">
          {message.message}
          {message.timestamp && (
            <span className="chat-row__time">{message.timestamp}</span>
          )}
        </p>
      </div>

      <Menu
        label={`Actions for ${message.username}'s message`}
        trigger={<MoreHorizontal size={18} />}
        triggerClassName="chat-row__more"
        items={[
          {
            id: "pin",
            label: message.isPinned ? "Remove highlight" : "Highlight message",
            icon: <Pin size={15} />,
            onSelect: () => onPin(message.id),
          },
          {
            id: "hide",
            label: "Hide message",
            icon: <EyeOff size={15} />,
            onSelect: () => onHide(message.id),
          },
          ...(onHideUser && !message.isModerator
            ? [
                {
                  id: "hide-user",
                  label: `Hide messages from ${message.username}`,
                  icon: <UserX size={15} />,
                  danger: true,
                  onSelect: () => onHideUser(message.username),
                },
              ]
            : []),
        ]}
      />
    </li>
  );
});

/* ============================================================================
   RIGHT PANEL: Chat · Guests · Viewers
   ============================================================================ */

export function ChatPanel({
  chatMessages,
  sendChatMessage,
  pinMessage,
  deleteMessage,
  phase,
  viewers = 0,
  analytics,
  guests = [],
  onOpenGuests,
  mutedUsernames = [],
  onMuteUser,
  onUnmuteUser,
}: {
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void | Promise<void>;
  pinMessage: (id: string) => void;
  deleteMessage: (id: string) => void;
  phase: Phase;
  viewers?: number;
  analytics?: Analytics;
  guests?: Guest[];
  onOpenGuests?: () => void;
  mutedUsernames?: string[];
  onMuteUser?: (username: string) => void;
  onUnmuteUser?: (username: string) => void;
}) {
  const [tab, setTab] = useState<RightTab>("chat");
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const stickToNewestRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const isLive = phase === "live";

  const hidden = new Set(mutedUsernames);
  // Newest message first, like the stage comment feed.
  const visibleMessages = chatMessages
    .filter((message) => !hidden.has(message.username))
    .slice(-MAX_RENDERED_MESSAGES)
    .reverse();

  /* Keep the newest message in view unless the host scrolled down to read. */
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && stickToNewestRef.current) {
      list.scrollTop = 0;
    }
  }, [visibleMessages.length, tab]);

  useEffect(() => {
    if (!emojiOpen) return;

    const close = (event: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setEmojiOpen(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEmojiOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || !isLive || sending) return;

    setSending(true);
    try {
      await sendChatMessage(text);
      setDraft("");
      stickToNewestRef.current = true;
    } finally {
      setSending(false);
    }
  };

  const tabs: { id: RightTab; label: string }[] = [
    { id: "chat", label: "Chat" },
    { id: "guests", label: guests.length ? `Guests (${guests.length})` : "Guests" },
    { id: "viewers", label: `Viewers (${formatCount(isLive ? viewers : 0)})` },
  ];

  return (
    <section className="chat-panel" aria-label="Live interaction">
      <div className="chat-panel__tabs" role="tablist" aria-label="Live interaction">
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`fls-tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            aria-controls={`fls-tabpanel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className={`chat-tab ${tab === item.id ? "chat-tab--active" : ""}`}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const index = tabs.findIndex((t) => t.id === tab);
              const next =
                tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
              setTab(next.id);
              document.getElementById(`fls-tab-${next.id}`)?.focus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ CHAT */}
      {tab === "chat" && (
        <div
          className="chat-panel__tabpanel"
          role="tabpanel"
          id="fls-tabpanel-chat"
          aria-labelledby="fls-tab-chat"
        >
          <div
            className="chat-panel__list"
            ref={listRef}
            onScroll={(event) => {
              const el = event.currentTarget;
              stickToNewestRef.current = el.scrollTop < 48;
            }}
            aria-live="polite"
            aria-relevant="additions"
          >
            {!isLive && visibleMessages.length === 0 && (
              <EmptyState
                icon={<MessageSquare size={20} />}
                title="Chat opens when you go live"
                description="Viewer messages will appear here in real time."
              />
            )}

            {isLive && visibleMessages.length === 0 && (
              <EmptyState
                icon={<MessageSquare size={20} />}
                title="No messages yet"
                description="Say hi to get the conversation started."
              />
            )}

            {visibleMessages.length > 0 && (
              <ul className="chat-list">
                {visibleMessages.map((message) => (
                  <ChatMessageRow
                    key={message.id}
                    message={message}
                    onPin={pinMessage}
                    onHide={deleteMessage}
                    onHideUser={onMuteUser}
                  />
                ))}
              </ul>
            )}
          </div>

          {mutedUsernames.length > 0 && onUnmuteUser && (
            <div className="chat-panel__muted">
              <EyeOff size={14} aria-hidden="true" />
              <span>
                Hiding {mutedUsernames.length} {mutedUsernames.length === 1 ? "person" : "people"}
              </span>
              <button
                type="button"
                onClick={() => mutedUsernames.forEach((name) => onUnmuteUser(name))}
              >
                Show all
              </button>
            </div>
          )}

          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="chat-composer__field" ref={emojiRef}>
              <label className="sr-only" htmlFor="fls-chat-input">Chat message</label>
              <input
                id="fls-chat-input"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isLive ? "Say something…" : "Go live to chat with viewers"}
                className="chat-composer__input"
                disabled={!isLive}
                maxLength={500}
                autoComplete="off"
                enterKeyHint="send"
              />

              <button
                type="button"
                className="chat-composer__emoji"
                aria-label="Insert emoji"
                aria-expanded={emojiOpen}
                disabled={!isLive}
                onClick={() => setEmojiOpen((value) => !value)}
              >
                <Smile size={22} />
              </button>

              {emojiOpen && (
                <div className="emoji-picker" role="dialog" aria-label="Emoji picker">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="emoji-picker__item"
                      aria-label={`Insert ${emoji}`}
                      onClick={() => {
                        setDraft((value) => `${value}${emoji}`);
                        inputRef.current?.focus();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="chat-composer__send"
              disabled={!isLive || !draft.trim() || sending}
              aria-label="Send message"
            >
              <SendHorizontal size={20} />
            </button>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------------- GUESTS */}
      {tab === "guests" && (
        <div
          className="chat-panel__tabpanel chat-panel__tabpanel--padded"
          role="tabpanel"
          id="fls-tabpanel-guests"
          aria-labelledby="fls-tab-guests"
        >
          {guests.length === 0 ? (
            <EmptyState
              icon={<UserPlus size={20} />}
              title="No guests yet"
              description={
                isLive
                  ? "Invite a follower or any Fockis user to join your stage."
                  : "Go live, then invite guests to join your stage."
              }
              action={
                onOpenGuests && (
                  <button type="button" className="btn btn--outline btn--sm" onClick={onOpenGuests}>
                    Invite guest
                  </button>
                )
              }
            />
          ) : (
            <ul className="mini-guest-list">
              {guests.map((guest) => (
                <li key={guest.id} className="mini-guest">
                  <Avatar name={guest.name} tone={guest.avatarTone} size="md" src={guest.avatarUrl} />
                  <span className="mini-guest__name">{guest.name}</span>
                  <span className={`guest-status guest-status--${guest.status}`}>
                    <span className="guest-status__dot" aria-hidden="true" />
                    {GUEST_STATUS_LABEL[guest.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- VIEWERS */}
      {tab === "viewers" && (
        <div
          className="chat-panel__tabpanel chat-panel__tabpanel--padded"
          role="tabpanel"
          id="fls-tabpanel-viewers"
          aria-labelledby="fls-tab-viewers"
        >
          <div className="viewer-stats">
            <div className="viewer-stats__item">
              <span className="viewer-stats__value">{formatCount(isLive ? viewers : 0)}</span>
              <span className="viewer-stats__label">Watching now</span>
            </div>
            <div className="viewer-stats__item">
              <span className="viewer-stats__value">{formatCount(analytics?.peakViewers ?? 0)}</span>
              <span className="viewer-stats__label">Peak viewers</span>
            </div>
            <div className="viewer-stats__item">
              <span className="viewer-stats__value">{formatCount(analytics?.newFollowers ?? 0)}</span>
              <span className="viewer-stats__label">New followers</span>
            </div>
          </div>

          <EmptyState
            icon={<Users size={20} />}
            title="Viewer list not available yet"
            description="Fockis currently reports viewer counts for your live, not individual viewers."
          />
        </div>
      )}
    </section>
  );
}
