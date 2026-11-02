import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Ban, Bell, BellOff, Eraser, FileText, Flag, Phone, Pin, Star, UserRound, Video, X } from "lucide-react";

import { startCall } from "../../calls/callSession";
import type { InboxConversation, InboxMessage } from "../inboxApi";
import { previewText, toggleArchive, toggleMute, togglePinConversation } from "../inboxActions";
import { Avatar, conversationTitle, lastSeenText, mediaUrl, usePresence } from "../ui";

/* ============================================================================
   CONTACT / GROUP INFO PANEL
============================================================================ */

export default function ChatInfo({
  conversation: c,
  messages,
  onClose,
  onOpenMedia,
  onJump,
  onBlock,
  onReport,
  onClear,
}: {
  conversation: InboxConversation;
  messages: InboxMessage[];
  onClose: () => void;
  onOpenMedia: (m: InboxMessage, index: number) => void;
  onJump: (id: string) => void;
  onBlock: () => void;
  onReport: () => void;
  onClear: () => void;
}) {
  const navigate = useNavigate();
  const presence = usePresence(c.otherUser);
  const [tab, setTab] = useState<"media" | "docs" | "starred">("media");
  const title = conversationTitle(c);

  const media = useMemo(
    () => messages.flatMap((m) => (m.deletedForEveryone ? [] : m.attachments.map((a, i) => ({ m, a, i })).filter(({ a }) => a.kind === "image" || a.kind === "video"))).reverse(),
    [messages],
  );
  const docs = useMemo(() => messages.flatMap((m) => (m.deletedForEveryone ? [] : m.attachments.filter((a) => a.kind === "document").map((a) => ({ m, a })))).reverse(), [messages]);
  const starred = useMemo(() => messages.filter((m) => m.starred && !m.deletedForEveryone).reverse(), [messages]);

  const peer = c.otherUser;
  return (
    <aside className="fki-info" aria-label={c.isGroup ? "Group info" : "Contact info"}>
      <header className="fki-info__head">
        <strong>{c.isGroup ? "Group info" : "Contact info"}</strong>
        <button type="button" className="fki-icon-btn" onClick={onClose} aria-label="Close info">
          <X size={20} />
        </button>
      </header>
      <div className="fki-info__scroll">
        <div className="fki-info__hero">
          <Avatar name={title} src={c.isGroup ? c.groupAvatar : peer?.avatar} group={c.isGroup} size={104} online={!c.isGroup && presence?.presence === "online"} />
          <h3>{title}</h3>
          {peer?.username && <p className="fki-muted">@{peer.username}</p>}
          {!c.isGroup && <p className="fki-muted">{lastSeenText(presence)}</p>}
          {c.isGroup && <p className="fki-muted">{c.participantIds.length} members</p>}
          {peer && (
            <div className="fki-info__quick">
              <button type="button" onClick={() => void startCall({ id: peer.id, name: peer.name, username: peer.username, avatar: peer.avatar }, "voice")}>
                <Phone size={20} /> Call
              </button>
              <button type="button" onClick={() => void startCall({ id: peer.id, name: peer.name, username: peer.username, avatar: peer.avatar }, "video")}>
                <Video size={20} /> Video
              </button>
              <button type="button" onClick={() => navigate(`/messages/profile/${peer.id}`)}>
                <UserRound size={20} /> Profile
              </button>
            </div>
          )}
          {peer?.bio && <p className="fki-info__bio">{peer.bio}</p>}
        </div>

        {c.isGroup && c.members?.length ? (
          <section className="fki-info__section">
            <h4>Members</h4>
            <ul className="fki-info__members">
              {c.members.map((m) => (
                <li key={m.id}>
                  <Avatar name={m.name} src={m.avatar} size={36} online={m.presence === "online"} />
                  <span>{m.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="fki-info__section">
          <div className="fki-info__tabs" role="tablist">
            {(["media", "docs", "starred"] as const).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-active" : ""} onClick={() => setTab(t)}>
                {t === "media" ? `Media (${media.length})` : t === "docs" ? `Docs (${docs.length})` : `Starred (${starred.length})`}
              </button>
            ))}
          </div>
          {tab === "media" &&
            (media.length ? (
              <div className="fki-info__grid">
                {media.slice(0, 60).map(({ m, a, i }) => (
                  <button key={`${m.id}-${i}`} type="button" onClick={() => onOpenMedia(m, i)} aria-label="Open media">
                    {a.kind === "image" ? <img src={mediaUrl(a.thumbnailUrl || a.url)} alt="" loading="lazy" /> : <video src={mediaUrl(a.url)} muted preload="metadata" />}
                  </button>
                ))}
              </div>
            ) : (
              <p className="fki-muted fki-pad">No photos or videos in the loaded messages.</p>
            ))}
          {tab === "docs" &&
            (docs.length ? (
              <ul className="fki-info__list">
                {docs.map(({ m, a }) => (
                  <li key={`${m.id}-${a.id}`}>
                    <a href={mediaUrl(a.url)} target="_blank" rel="noopener noreferrer">
                      <FileText size={18} /> {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fki-muted fki-pad">No documents yet.</p>
            ))}
          {tab === "starred" &&
            (starred.length ? (
              <ul className="fki-info__list">
                {starred.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => onJump(m.id)}>
                      <Star size={16} /> {previewText(m)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fki-muted fki-pad">No starred messages in this chat.</p>
            ))}
        </section>

        <section className="fki-info__section fki-info__actions">
          <button type="button" onClick={() => void toggleMute(c)}>
            {c.muted ? <Bell size={18} /> : <BellOff size={18} />} {c.muted ? "Unmute notifications" : "Mute notifications"}
          </button>
          <button type="button" onClick={() => void togglePinConversation(c)}>
            <Pin size={18} /> {c.pinned ? "Unpin chat" : "Pin chat"}
          </button>
          <button type="button" onClick={() => void toggleArchive(c)}>
            <Archive size={18} /> {c.archived ? "Unarchive chat" : "Archive chat"}
          </button>
          <button type="button" onClick={onClear}>
            <Eraser size={18} /> Clear chat
          </button>
          {peer && (
            <>
              <button type="button" className="is-danger" onClick={onBlock}>
                <Ban size={18} /> Block {peer.name.split(" ")[0]}
              </button>
              <button type="button" className="is-danger" onClick={onReport}>
                <Flag size={18} /> Report {peer.name.split(" ")[0]}
              </button>
            </>
          )}
        </section>
      </div>
    </aside>
  );
}
