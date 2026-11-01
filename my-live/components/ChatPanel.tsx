import { useEffect, useRef, useState } from "react";
import { Ban, Heart, MessageSquare, MicOff, Pin, Send, Share2, Trash2, UserPlus } from "lucide-react";
import { initialActivity } from "../data";
import type { ActivityItem, ActivityType, ChatMessage, Phase } from "../types";
import { Avatar, EmptyState } from "./ui/Primitives";

const ACTIVITY_ICON: Record<ActivityType, typeof Heart> = {
  follow: UserPlus,
  gift: Heart,
  join: MessageSquare,
  share: Share2,
  "like-burst": Heart
};

function ChatMessageRow({ message, onPin, onDelete }: { message: ChatMessage; onPin: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className={`chat-row ${message.isPinned ? "chat-row--pinned" : ""}`}>
      <Avatar name={message.username} tone={message.avatarTone} size="sm" />
      <div className="chat-row__body">
        <div className="chat-row__meta">
          <span className={`chat-row__username ${message.isModerator ? "chat-row__username--mod" : ""}`}>{message.username}</span>
          <span className="chat-row__time">{message.timestamp}</span>
          {message.isPinned && <span className="chat-row__pin-tag">Pinned</span>}
        </div>
        <p className="chat-row__text">{message.message}</p>
      </div>
      <div className="chat-row__controls">
        <button title="Pin message" onClick={() => onPin(message.id)} type="button">
          <Pin size={13} />
        </button>
        <button title="Mute user" type="button">
          <MicOff size={13} />
        </button>
        <button title="Block user" type="button">
          <Ban size={13} />
        </button>
        <button title="Delete message" onClick={() => onDelete(message.id)} type="button" className="chat-row__delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function ChatPanel({
  chatMessages,
  chatTab,
  setChatTab,
  sendChatMessage,
  pinMessage,
  deleteMessage,
  phase
}: {
  chatMessages: ChatMessage[];
  chatTab: "chat" | "questions" | "activity";
  setChatTab: (tab: "chat" | "questions" | "activity") => void;
  sendChatMessage: (text: string) => void;
  pinMessage: (id: string) => void;
  deleteMessage: (id: string) => void;
  phase: Phase;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages, chatTab]);

  const questions = chatMessages.filter((m) => m.isQuestion);
  const isLive = phase === "live";

  return (
    <aside className="chat-panel">
      <div className="chat-panel__header">
        <h3 className="chat-panel__title">Live chat</h3>
        <div className="chat-panel__tabs">
          <TabButton label="Chat" active={chatTab === "chat"} onClick={() => setChatTab("chat")} count={chatMessages.length} />
          <TabButton label="Questions" active={chatTab === "questions"} onClick={() => setChatTab("questions")} count={questions.length} />
          <TabButton label="Activity" active={chatTab === "activity"} onClick={() => setChatTab("activity")} />
        </div>
      </div>

      <div className="chat-panel__list" ref={listRef}>
        {!isLive && (
          <EmptyState icon={<MessageSquare size={20} />} title="Chat is quiet for now" description="Once you go live, viewer messages will appear here in real time." />
        )}
        {isLive && chatTab === "chat" && chatMessages.length === 0 && (
          <EmptyState icon={<MessageSquare size={20} />} title="No messages yet" description="Say hi to get the conversation started." />
        )}
        {isLive && chatTab === "chat" && chatMessages.map((m) => <ChatMessageRow key={m.id} message={m} onPin={pinMessage} onDelete={deleteMessage} />)}

        {isLive && chatTab === "questions" && questions.length === 0 && (
          <EmptyState icon={<MessageSquare size={20} />} title="No questions yet" description="Viewer questions will be collected here for easy Q&A." />
        )}
        {isLive && chatTab === "questions" && questions.map((m) => <ChatMessageRow key={m.id} message={m} onPin={pinMessage} onDelete={deleteMessage} />)}

        {isLive && chatTab === "activity" && (
          <div className="activity-list">
            {initialActivity.map((item: ActivityItem) => {
              const Icon = ACTIVITY_ICON[item.type];
              return (
                <div className="activity-row" key={item.id}>
                  <span className={`activity-row__icon activity-row__icon--${item.type}`}>
                    <Icon size={13} />
                  </span>
                  <span className="activity-row__text">
                    <strong>{item.username}</strong>{" "}
                    {item.type === "follow" && "started following you"}
                    {item.type === "gift" && item.detail}
                    {item.type === "join" && "joined the stream"}
                    {item.type === "share" && "shared your stream"}
                    {item.type === "like-burst" && item.detail}
                  </span>
                  <span className="activity-row__time">{item.timestamp}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          sendChatMessage(draft);
          setDraft("");
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Say something…" className="chat-composer__input" disabled={!isLive} />
        <button type="submit" className="chat-composer__send" disabled={!isLive || !draft.trim()} aria-label="Send message">
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
}

function TabButton({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button className={`chat-tab ${active ? "chat-tab--active" : ""}`} onClick={onClick} type="button">
      {label}
      {count !== undefined && count > 0 && <span className="chat-tab__count">{count}</span>}
    </button>
  );
}
