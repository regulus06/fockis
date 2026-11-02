import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArchiveRestore,
  BellOff,
  Bell,
  Check,
  Inbox,
  Mail,
  MailOpen,
  MessageSquarePlus,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Trash2,
  Users,
  WifiOff,
  X,
} from "lucide-react";

import { conversationsService, currentUserId, type InboxConversation } from "../inboxApi";
import {
  acceptRequest,
  clearConversation,
  loadConversations,
  markConversationRead,
  markUnread,
  previewText,
  toggleArchive,
  toggleMute,
  togglePinConversation,
} from "../inboxActions";
import { typingUserIds, useInbox } from "../inboxStore";
import { Avatar, Badge, Confirm, Empty, Skeleton, Ticks, conversationTitle, listTime, useClickOutside, usePresence } from "../ui";

/* ============================================================================
   CONVERSATION LIST
   Used for Messages, Archived and Message requests.
============================================================================ */

type Filter = "all" | "unread" | "groups";
type Mode = "messages" | "archived" | "requests";

const TITLES: Record<Mode, string> = { messages: "Messages", archived: "Archived", requests: "Message requests" };

export default function ConversationList({
  mode,
  onNewChat,
  onNewGroup,
  onOpen,
}: {
  mode: Mode;
  onNewChat: () => void;
  onNewGroup: () => void;
  onOpen: (id: string) => void;
}) {
  const conversations = useInbox((s) => s.conversations);
  const loaded = useInbox((s) => s.loaded);
  const loadError = useInbox((s) => s.loadError);
  const connected = useInbox((s) => s.connected);
  const activeId = useInbox((s) => s.activeId);
  const setView = useInbox((s) => s.setView);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const scoped = useMemo(() => {
    const all = Object.values(conversations);
    return all.filter((c) => (mode === "requests" ? c.request : mode === "archived" ? c.archived && !c.request : !c.archived && !c.request));
  }, [conversations, mode]);

  const unreadCount = scoped.filter((c) => c.unreadCount > 0 || c.markedUnread).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped
      .filter((c) => (filter === "unread" ? c.unreadCount > 0 || c.markedUnread : filter === "groups" ? c.isGroup : true))
      .filter((c) => {
        if (!q) return true;
        const hay = [conversationTitle(c), c.otherUser?.username, c.lastMessage?.text, ...(c.members?.map((m) => m.name) ?? [])].join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (mode === "messages" && Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        const at = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
        const bt = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
        return bt - at;
      });
  }, [scoped, filter, query, mode]);

  const markAllRead = async () => {
    setMenuOpen(false);
    await Promise.all(scoped.filter((c) => c.unreadCount || c.markedUnread).map((c) => markConversationRead(c.id)));
  };

  return (
    <section className="fki-list" aria-label={TITLES[mode]}>
      <header className="fki-list__head">
        <h1>{TITLES[mode]}</h1>
        {mode === "messages" ? (
          <div className="fki-list__tools">
            <button type="button" className="fki-soft-btn" onClick={onNewChat} aria-label="New message" title="New message">
              <SquarePen size={21} />
            </button>
            <div className="fki-menu-anchor" ref={menuRef}>
              <button type="button" className="fki-icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="More options" aria-expanded={menuOpen}>
                <MoreHorizontal size={22} />
              </button>
              {menuOpen && (
                <div className="fki-menu fki-menu--right" role="menu">
                  <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), onNewChat())}>
                    <MessageSquarePlus size={18} /> New message
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), onNewGroup())}>
                    <Users size={18} /> New group
                  </button>
                  <button type="button" role="menuitem" onClick={() => void markAllRead()} disabled={!unreadCount}>
                    <Check size={18} /> Mark all as read
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), setView("archived"))}>
                    <Archive size={18} /> Archived chats
                  </button>
                  <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), setView("requests"))}>
                    <Inbox size={18} /> Message requests
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button type="button" className="fki-link-btn" onClick={() => setView("messages")}>
            Back to chats
          </button>
        )}
      </header>

      <label className="fki-search">
        <Search size={19} aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations…" aria-label="Search conversations" />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </label>

      {mode === "messages" && (
        <div className="fki-chips" role="tablist" aria-label="Filter conversations">
          {(["all", "unread", "groups"] as Filter[]).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? "is-active" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "unread" ? "Unread" : "Groups"}
              {f === "unread" && unreadCount > 0 && <b>{unreadCount}</b>}
            </button>
          ))}
        </div>
      )}

      {mode === "requests" && rows.length > 0 && (
        <p className="fki-list__hint">People you aren't friends with. They won't know you've seen their message until you reply or accept.</p>
      )}

      {!connected && loaded && (
        <div className="fki-offline" role="status">
          <WifiOff size={15} /> Reconnecting… new messages will appear when you're back online.
        </div>
      )}

      <div className="fki-list__scroll">
        {!loaded ? (
          <Skeleton rows={8} />
        ) : loadError && !rows.length ? (
          <Empty
            icon={<WifiOff size={26} />}
            title="Couldn't load conversations"
            text={loadError}
            action={
              <button type="button" className="fki-btn fki-btn--primary" onClick={() => void loadConversations()}>
                Try again
              </button>
            }
          />
        ) : rows.length === 0 ? (
          query || filter !== "all" ? (
            <Empty icon={<Search size={26} />} title="No matches" text="Try another name or filter." />
          ) : mode === "archived" ? (
            <Empty icon={<Archive size={26} />} title="No archived chats" text="Archive a chat to tidy your list without deleting it." />
          ) : mode === "requests" ? (
            <Empty icon={<Inbox size={26} />} title="No message requests" text="Messages from people you aren't friends with appear here." />
          ) : (
            <Empty
              icon={<MessageSquarePlus size={26} />}
              title="No conversations yet"
              text="Start a chat with a friend or anyone on Fockis."
              action={
                <button type="button" className="fki-btn fki-btn--primary" onClick={onNewChat}>
                  New message
                </button>
              }
            />
          )
        ) : (
          <ul className="fki-rows">
            {rows.map((c) => (
              <ConversationRow key={c.id} conversation={c} active={c.id === activeId} mode={mode} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ConversationRow({ conversation: c, active, mode, onOpen }: { conversation: InboxConversation; active: boolean; mode: Mode; onOpen: (id: string) => void }) {
  const me = currentUserId();
  const presence = usePresence(c.otherUser);
  const typing = typingUserIds(useInbox((s) => s.typing[c.id]));
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const press = useRef<number | null>(null);
  const close = useCallback(() => setMenu(null), []);
  useClickOutside(menuRef, close, Boolean(menu));

  const title = conversationTitle(c);
  const last = c.lastMessage;
  const unread = c.unreadCount > 0 || Boolean(c.markedUnread);
  const typingName = typing.length
    ? c.isGroup
      ? `${c.members?.find((m) => m.id === typing[0])?.name.split(" ")[0] ?? "Someone"} is typing…`
      : "typing…"
    : "";
  const sender = last && c.isGroup && last.type !== "system" ? (last.senderId === me ? "You" : c.members?.find((m) => m.id === last.senderId)?.name.split(" ")[0]) : "";
  const preview = last ? previewText(last) : c.request ? "Wants to send you a message" : "No messages yet";

  const openMenu = (x: number, y: number) => setMenu({ x: Math.min(x, window.innerWidth - 240), y: Math.min(y, window.innerHeight - 300) });

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className={`fki-row ${active ? "is-active" : ""} ${unread ? "is-unread" : ""}`}
        onClick={() => {
          if (!menu) onOpen(c.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen(c.id);
          }
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            openMenu(r.right - 240, r.top + 20);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          press.current = window.setTimeout(() => openMenu(t.clientX, t.clientY), 520);
        }}
        onTouchEnd={() => press.current && window.clearTimeout(press.current)}
        onTouchMove={() => press.current && window.clearTimeout(press.current)}
      >
        <Avatar name={title} src={c.isGroup ? c.groupAvatar : c.otherUser?.avatar} group={c.isGroup} size={56} online={!c.isGroup && presence?.presence === "online"} />
        <span className="fki-row__body">
          <span className="fki-row__top">
            <strong className="fki-row__name">{title}</strong>
            <time className="fki-row__time">{listTime(last?.createdAt ?? c.updatedAt)}</time>
          </span>
          <span className="fki-row__bottom">
            {typingName ? (
              <span className="fki-row__typing">{typingName}</span>
            ) : (
              <span className={`fki-row__preview ${last?.deletedForEveryone ? "is-deleted" : ""}`}>
                {sender && <em>{sender}: </em>}
                {preview}
              </span>
            )}
            <span className="fki-row__meta">
              {c.muted && <BellOff size={15} aria-label="Muted" />}
              {c.pinned && mode === "messages" && <Pin size={15} aria-label="Pinned" />}
              {unread ? <Badge count={c.unreadCount || 1} muted={c.muted} /> : last?.senderId === me && last.type !== "system" ? <Ticks status={last.status} /> : null}
            </span>
          </span>
          {mode === "requests" && (
            <span className="fki-row__actions" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="fki-btn fki-btn--primary fki-btn--sm" onClick={() => void acceptRequest(c)}>
                Accept
              </button>
              <button type="button" className="fki-btn fki-btn--ghost fki-btn--sm" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </span>
          )}
        </span>
      </div>

      {menu &&
        createPortal(
        <div ref={menuRef} className="fki-menu fki-menu--floating" style={{ left: menu.x, top: menu.y }} role="menu">
          {mode === "messages" && (
            <button type="button" role="menuitem" onClick={() => (close(), void togglePinConversation(c))}>
              {c.pinned ? <PinOff size={18} /> : <Pin size={18} />} {c.pinned ? "Unpin" : "Pin to top"}
            </button>
          )}
          {unread ? (
            <button type="button" role="menuitem" onClick={() => (close(), void markConversationRead(c.id))}>
              <MailOpen size={18} /> Mark as read
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={() => (close(), void markUnread(c))}>
              <Mail size={18} /> Mark as unread
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => (close(), void toggleMute(c))}>
            {c.muted ? <Bell size={18} /> : <BellOff size={18} />} {c.muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" role="menuitem" onClick={() => (close(), void toggleArchive(c))}>
            {c.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />} {c.archived ? "Unarchive" : "Archive"}
          </button>
          <button type="button" role="menuitem" className="is-danger" onClick={() => (close(), setConfirmDelete(true))}>
            <Trash2 size={18} /> Delete chat
          </button>
        </div>,
          document.querySelector(".fki-app") ?? document.body,
        )}

      {confirmDelete && (
        <Confirm
          title="Delete this chat?"
          body={
            <p>
              Messages in your chat with <strong>{title}</strong> will be removed for you. {c.isGroup ? "Other members" : title} will still see them.
            </p>
          }
          confirmLabel="Delete chat"
          danger
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await clearConversation(c);
            // Hide the empty chat until a new message arrives.
            if (!c.archived) {
              await conversationsService
                .setFlag(c.id, "archive", true)
                .then((updated) => useInbox.getState().upsertConversation({ ...updated, lastMessage: undefined }))
                .catch(() => undefined);
              if (useInbox.getState().activeId === c.id) useInbox.getState().setActive(null);
            }
          }}
        />
      )}
    </li>
  );
}

