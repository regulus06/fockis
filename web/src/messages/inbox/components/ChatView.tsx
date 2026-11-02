import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  Ban,
  Bell,
  BellOff,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Copy,
  Eraser,
  Flag,
  Forward,
  Info,
  Loader2,
  MoreVertical,
  Phone,
  Pin,
  Search,
  Star,
  Trash2,
  Video,
  X,
} from "lucide-react";

import type { ReplyReference } from "../../types";
import { startCall } from "../../calls/callSession";
import { conversationsService, currentUserId, messagesService, type InboxConversation, type InboxMessage } from "../inboxApi";
import {
  acceptRequest,
  blockUser,
  bulkDelete,
  clearConversation,
  copyText,
  discardFailed,
  loadOlder,
  markUnread,
  previewText,
  react,
  retry,
  toggleArchive,
  toggleMute,
  togglePinMessage,
  toggleStar,
} from "../inboxActions";
import { typingUserIds, useInbox } from "../inboxStore";
import { Avatar, Confirm, Empty, conversationTitle, dayLabel, lastSeenText, useClickOutside, usePresence } from "../ui";
import Composer, { type ComposerHandle } from "./Composer";
import { DeleteDialog, ForwardDialog, MediaViewer, ReportDialog } from "./Dialogs";
import { MessageBubble, type MessageAction } from "./MessageBubble";
import ChatInfo from "./ChatInfo";

/* ============================================================================
   CHAT WINDOW
============================================================================ */

const EMPTY: InboxMessage[] = [];

export default function ChatView({ conversation: c, onBack }: { conversation: InboxConversation; onBack: () => void }) {
  const me = currentUserId();
  const messages = useInbox((s) => s.messages[c.id] ?? EMPTY);
  const loaded = useInbox((s) => s.messages[c.id] !== undefined);
  const hasMore = useInbox((s) => s.hasMore[c.id] !== false);
  const typing = typingUserIds(useInbox((s) => s.typing[c.id]));
  const presence = usePresence(c.otherUser);

  const [replyTo, setReplyTo] = useState<ReplyReference | null>(null);
  const [editing, setEditing] = useState<InboxMessage | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<
    | null
    | { kind: "delete"; messages: InboxMessage[]; bulk?: boolean }
    | { kind: "forward"; messages: InboxMessage[] }
    | { kind: "report"; message?: InboxMessage }
    | { kind: "block" }
    | { kind: "clear" }
    | { kind: "media"; message: InboxMessage; index: number }
  >(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<InboxMessage[]>([]);
  const [hitIndex, setHitIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [highlightId, setHighlightId] = useState("");
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [serverPinned, setServerPinned] = useState<InboxMessage[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [dragging, setDragging] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const restoreFrom = useRef<number | null>(null);
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const title = conversationTitle(c);
  const memberName = useCallback(
    (id: string) => (id === me ? "You" : c.isGroup ? c.members?.find((m) => m.id === id)?.name ?? "Member" : c.otherUser?.name ?? "Them"),
    [c, me],
  );

  /* ---------- reset when switching chats ---------- */
  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
    setSelecting(false);
    setSelected([]);
    setSearchOpen(false);
    setQuery("");
    setHits([]);
    setInfoOpen(false);
    setPinnedIndex(0);
    lastCount.current = 0;
    conversationsService
      .pinned(c.id)
      .then(setServerPinned)
      .catch(() => setServerPinned([]));
  }, [c.id]);

  /* ---------- pinned messages (server list merged with live state) ---------- */
  const pinned = useMemo(() => {
    const map = new Map<string, InboxMessage>();
    for (const m of serverPinned) map.set(m.id, m);
    for (const m of messages) {
      if (m.pinned) map.set(m.id, m);
      else if (map.has(m.id)) map.delete(m.id);
    }
    return [...map.values()].filter((m) => m.pinned && !m.deletedForEveryone).sort((a, b) => new Date(b.pinnedAt ?? b.createdAt).getTime() - new Date(a.pinnedAt ?? a.createdAt).getTime());
  }, [serverPinned, messages]);

  /* ---------- scrolling ---------- */
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setNewBelow(0);
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (restoreFrom.current !== null) {
      // Keep the view still after loading older messages above.
      el.scrollTop = el.scrollHeight - restoreFrom.current;
      restoreFrom.current = null;
    } else if (lastCount.current === 0 && messages.length) {
      el.scrollTop = el.scrollHeight;
    } else if (messages.length > lastCount.current) {
      const newest = messages[messages.length - 1];
      if (atBottom || newest?.senderId === me) scrollToBottom(true);
      else setNewBelow((n) => n + (messages.length - lastCount.current));
    }
    lastCount.current = messages.length;
  }, [messages, atBottom, me, scrollToBottom]);

  const onScroll = async () => {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(bottom);
    if (bottom) setNewBelow(0);
    if (el.scrollTop < 140 && hasMore && !loadingOlder && loaded && messages.length) {
      setLoadingOlder(true);
      restoreFrom.current = el.scrollHeight - el.scrollTop;
      const n = await loadOlder(c.id);
      if (!n) restoreFrom.current = null;
      setLoadingOlder(false);
    }
  };

  /** Scroll to a message, loading older pages if needed. */
  const jumpTo = useCallback(
    async (id: string) => {
      for (let i = 0; i < 8; i += 1) {
        const el = document.getElementById(`msg-${id}`);
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          setHighlightId(id);
          window.setTimeout(() => setHighlightId((h) => (h === id ? "" : h)), 1800);
          return;
        }
        if (useInbox.getState().hasMore[c.id] === false) break;
        const el2 = scroller.current;
        restoreFrom.current = el2 ? el2.scrollHeight - el2.scrollTop : null;
        const n = await loadOlder(c.id);
        if (!n) break;
        await new Promise((r) => window.setTimeout(r, 60));
      }
      useInbox.getState().toast("That message isn't available anymore.", "info");
    },
    [c.id],
  );

  // Other views (Starred) ask the open chat to jump to a message.
  useEffect(() => {
    const onJumpRequest = (e: Event) => {
      const detail = (e as CustomEvent<{ conversationId: string; messageId: string }>).detail;
      if (detail?.conversationId === c.id) void jumpTo(detail.messageId);
    };
    window.addEventListener("fki-jump", onJumpRequest);
    return () => window.removeEventListener("fki-jump", onJumpRequest);
  }, [c.id, jumpTo]);

  /* ---------- search in chat ---------- */
  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      messagesService
        .search(c.id, q)
        .then((r) => {
          const sorted = r.filter((m) => !m.deletedForEveryone).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setHits(sorted);
          setHitIndex(0);
          if (sorted[0]) void jumpTo(sorted[0].id);
        })
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [query, searchOpen, c.id, jumpTo]);

  const stepHit = (dir: 1 | -1) => {
    if (!hits.length) return;
    const next = (hitIndex + dir + hits.length) % hits.length;
    setHitIndex(next);
    void jumpTo(hits[next].id);
  };

  /* ---------- message actions ---------- */
  const onAction = useCallback(
    (action: MessageAction, m: InboxMessage) => {
      switch (action) {
        case "reply":
          setEditing(null);
          setReplyTo({ messageId: m.id, senderName: memberName(m.senderId), preview: previewText(m).slice(0, 120), type: m.type });
          break;
        case "copy":
          void copyText(m);
          break;
        case "edit":
          setReplyTo(null);
          setEditing(m);
          break;
        case "delete":
          setDialog({ kind: "delete", messages: [m] });
          break;
        case "forward":
          setDialog({ kind: "forward", messages: [m] });
          break;
        case "pin":
          void togglePinMessage(m);
          break;
        case "star":
          void toggleStar(m);
          break;
        case "unread":
          void markUnread(c);
          break;
        case "select":
          setSelecting(true);
          setSelected(m.id ? [m.id] : []);
          break;
        case "report":
          setDialog({ kind: "report", message: m });
          break;
        case "retry":
          retry(m);
          break;
        case "discard":
          discardFailed(m);
          break;
        case "callback":
          if (!c.isGroup && c.otherUser) {
            const video = /video/i.test(m.systemLabel || m.text || "");
            void startCall({ id: c.otherUser.id, name: c.otherUser.name, username: c.otherUser.username, avatar: c.otherUser.avatar }, video ? "video" : "voice");
          }
          break;
      }
    },
    [c, memberName],
  );

  const onReact = useCallback((m: InboxMessage, emoji: string) => void react(m, emoji), []);
  const onToggleSelect = useCallback((m: InboxMessage) => setSelected((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id])), []);
  const onOpenMedia = useCallback((m: InboxMessage, index: number) => setDialog({ kind: "media", message: m, index }), []);
  const onJump = useCallback((id: string) => void jumpTo(id), [jumpTo]);

  const selectedMessages = messages.filter((m) => selected.includes(m.id));
  const call = (type: "voice" | "video") => {
    if (!c.otherUser) return;
    void startCall({ id: c.otherUser.id, name: c.otherUser.name, username: c.otherUser.username, avatar: c.otherUser.avatar }, type);
  };

  const status = typing.length
    ? c.isGroup
      ? `${memberName(typing[0]).split(" ")[0]} is typing…`
      : "typing…"
    : c.isGroup
      ? `${c.participantIds.length} members`
      : lastSeenText(presence);

  return (
    <section
      className={`fki-chat ${infoOpen ? "has-info" : ""}`}
      aria-label={`Chat with ${title}`}
      onDragEnter={(e) => e.dataTransfer.types.includes("Files") && setDragging(true)}
    >
      <div className="fki-chat__main">
        {/* ---------------- header ---------------- */}
        {selecting ? (
          <header className="fki-chat__head fki-chat__head--select">
            <button type="button" className="fki-icon-btn" onClick={() => (setSelecting(false), setSelected([]))} aria-label="Cancel selection">
              <X size={22} />
            </button>
            <strong>{selected.length} selected</strong>
            <div className="fki-chat__actions">
              <button type="button" className="fki-icon-btn" disabled={!selected.length} onClick={() => void navigator.clipboard?.writeText(selectedMessages.map((m) => m.text).filter(Boolean).join("\n")).then(() => useInbox.getState().toast("Copied", "success"))} aria-label="Copy selected">
                <Copy size={20} />
              </button>
              <button type="button" className="fki-icon-btn" disabled={!selected.length || selectedMessages.some((m) => m.deletedForEveryone)} onClick={() => setDialog({ kind: "forward", messages: selectedMessages })} aria-label="Forward selected">
                <Forward size={20} />
              </button>
              <button type="button" className="fki-icon-btn is-danger" disabled={!selected.length} onClick={() => setDialog({ kind: "delete", messages: selectedMessages, bulk: true })} aria-label="Delete selected">
                <Trash2 size={20} />
              </button>
            </div>
          </header>
        ) : (
          <header className="fki-chat__head">
            <button type="button" className="fki-icon-btn fki-chat__back" onClick={onBack} aria-label="Back to conversations">
              <ArrowLeft size={22} />
            </button>
            <button type="button" className="fki-chat__who" onClick={() => setInfoOpen(true)}>
              <Avatar name={title} src={c.isGroup ? c.groupAvatar : c.otherUser?.avatar} group={c.isGroup} size={56} online={!c.isGroup && presence?.presence === "online"} />
              <span>
                <strong>{title}</strong>
                <small className={typing.length ? "is-typing" : presence?.presence === "online" && !c.isGroup ? "is-online" : ""}>
                  {!c.isGroup && !typing.length && presence?.presence === "online" && <i className="fki-dot" />}
                  {status}
                </small>
              </span>
            </button>
            <div className="fki-chat__actions">
              {!c.isGroup && c.otherUser && (
                <>
                  <button type="button" className="fki-soft-btn" onClick={() => call("video")} aria-label="Video call" title="Video call">
                    <Video size={22} />
                  </button>
                  <button type="button" className="fki-soft-btn" onClick={() => call("voice")} aria-label="Voice call" title="Voice call">
                    <Phone size={21} />
                  </button>
                </>
              )}
              <button type="button" className={`fki-icon-btn ${searchOpen ? "is-active" : ""}`} onClick={() => setSearchOpen((v) => !v)} aria-label="Search in conversation" title="Search">
                <Search size={22} />
              </button>
              <div className="fki-menu-anchor" ref={menuRef}>
                <button type="button" className="fki-icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Conversation menu" aria-expanded={menuOpen}>
                  <MoreVertical size={22} />
                </button>
                {menuOpen && (
                  <div className="fki-menu fki-menu--right" role="menu">
                    <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), setInfoOpen(true))}>
                      <Info size={18} /> {c.isGroup ? "Group info" : "Contact info"}
                    </button>
                    <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), setSelecting(true))}>
                      <CheckSquare size={18} /> Select messages
                    </button>
                    <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), void toggleMute(c))}>
                      {c.muted ? <Bell size={18} /> : <BellOff size={18} />} {c.muted ? "Unmute notifications" : "Mute notifications"}
                    </button>
                    <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), void toggleArchive(c))}>
                      <Archive size={18} /> {c.archived ? "Unarchive chat" : "Archive chat"}
                    </button>
                    <button type="button" role="menuitem" onClick={() => (setMenuOpen(false), setDialog({ kind: "clear" }))}>
                      <Eraser size={18} /> Clear chat
                    </button>
                    {!c.isGroup && c.otherUser && (
                      <>
                        <button type="button" role="menuitem" className="is-danger" onClick={() => (setMenuOpen(false), setDialog({ kind: "block" }))}>
                          <Ban size={18} /> Block {c.otherUser.name.split(" ")[0]}
                        </button>
                        <button type="button" role="menuitem" className="is-danger" onClick={() => (setMenuOpen(false), setDialog({ kind: "report" }))}>
                          <Flag size={18} /> Report
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {searchOpen && (
          <div className="fki-insearch">
            <Search size={18} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this chat" aria-label="Search this chat" onKeyDown={(e) => {
              if (e.key === "Enter") stepHit(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") setSearchOpen(false);
            }} />
            {searching ? <Loader2 size={16} className="fki-spin" /> : query.trim().length >= 2 && <span className="fki-muted">{hits.length ? `${hitIndex + 1} of ${hits.length}` : "No results"}</span>}
            <button type="button" className="fki-icon-btn" onClick={() => stepHit(1)} disabled={!hits.length} aria-label="Older result">
              <ChevronUp size={18} />
            </button>
            <button type="button" className="fki-icon-btn" onClick={() => stepHit(-1)} disabled={!hits.length} aria-label="Newer result">
              <ChevronDown size={18} />
            </button>
            <button type="button" className="fki-icon-btn" onClick={() => (setSearchOpen(false), setQuery(""))} aria-label="Close search">
              <X size={18} />
            </button>
          </div>
        )}

        {pinned.length > 0 && (
          <div className="fki-pinned">
            <button
              type="button"
              className="fki-pinned__main"
              onClick={() => {
                const m = pinned[pinnedIndex % pinned.length];
                void jumpTo(m.id);
                setPinnedIndex((i) => (i + 1) % pinned.length);
              }}
            >
              <Pin size={16} />
              <span>
                <strong>{pinned.length > 1 ? `Pinned message ${(pinnedIndex % pinned.length) + 1} of ${pinned.length}` : "Pinned message"}</strong>
                <small>{previewText(pinned[pinnedIndex % pinned.length])}</small>
              </span>
            </button>
            <button type="button" className="fki-icon-btn" onClick={() => void togglePinMessage(pinned[pinnedIndex % pinned.length])} aria-label="Unpin">
              <X size={16} />
            </button>
          </div>
        )}

        {c.request && (
          <div className="fki-request">
            <p>
              <strong>{title}</strong> isn't in your friends. Reply or accept to move this chat to your inbox. They won't see that you've read it until then.
            </p>
            <div>
              <button type="button" className="fki-btn fki-btn--primary fki-btn--sm" onClick={() => void acceptRequest(c)}>
                Accept
              </button>
              <button type="button" className="fki-btn fki-btn--ghost fki-btn--sm" onClick={() => setDialog({ kind: "block" })}>
                Block
              </button>
              <button type="button" className="fki-btn fki-btn--ghost fki-btn--sm" onClick={() => setDialog({ kind: "report" })}>
                Report
              </button>
            </div>
          </div>
        )}

        {/* ---------------- messages ---------------- */}
        <div className="fki-thread" ref={scroller} onScroll={() => void onScroll()}>
          {!loaded ? (
            <div className="fki-thread__loading">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={`fki-ghost-bubble ${i % 2 ? "is-mine" : ""}`} style={{ width: `${30 + ((i * 23) % 40)}%` }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <Empty
              icon={<Avatar name={title} src={c.isGroup ? c.groupAvatar : c.otherUser?.avatar} group={c.isGroup} size={72} />}
              title={c.isGroup ? `Welcome to ${title}` : `Say hello to ${title.split(" ")[0]}`}
              text="Messages you send appear here."
            />
          ) : (
            <>
              {loadingOlder && (
                <div className="fki-thread__older">
                  <Loader2 size={18} className="fki-spin" />
                </div>
              )}
              {!hasMore && <div className="fki-thread__start">This is the beginning of your chat with {title}.</div>}
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const grouped = Boolean(prev && !newDay && prev.senderId === m.senderId && prev.type !== "system" && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000);
                return (
                  <Fragment key={m.localId || m.id}>
                    {newDay && (
                      <div className="fki-day">
                        <span>{dayLabel(m.createdAt)}</span>
                      </div>
                    )}
                    <MessageBubble
                      message={m}
                      mine={m.senderId === me}
                      senderName={c.isGroup ? memberName(m.senderId) : undefined}
                      showSender={c.isGroup && !grouped}
                      grouped={grouped}
                      selecting={selecting}
                      selected={selected.includes(m.id)}
                      highlight={highlightId === m.id}
                      query={searchOpen ? query : ""}
                      onAction={onAction}
                      onReact={onReact}
                      onToggleSelect={onToggleSelect}
                      onOpenMedia={onOpenMedia}
                      onJump={onJump}
                      myId={me}
                    />
                  </Fragment>
                );
              })}
              {typing.length > 0 && (
                <div className="fki-typing" aria-live="polite">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </>
          )}
        </div>

        {(!atBottom || newBelow > 0) && messages.length > 0 && (
          <button type="button" className="fki-tobottom" onClick={() => scrollToBottom(true)} aria-label="Scroll to latest">
            <ArrowDown size={20} />
            {newBelow > 0 && <b>{newBelow}</b>}
          </button>
        )}

        <Composer
          ref={composer}
          conversationId={c.id}
          replyTo={replyTo}
          editing={editing}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
        />

        {dragging && (
          <div
            className="fki-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              composer.current?.addFiles([...e.dataTransfer.files]);
            }}
          >
            Drop files to send to {title}
          </div>
        )}
      </div>

      {infoOpen && (
        <ChatInfo
          conversation={c}
          messages={messages}
          onClose={() => setInfoOpen(false)}
          onOpenMedia={onOpenMedia}
          onJump={onJump}
          onBlock={() => setDialog({ kind: "block" })}
          onReport={() => setDialog({ kind: "report" })}
          onClear={() => setDialog({ kind: "clear" })}
        />
      )}

      {/* ---------------- dialogs ---------------- */}
      {dialog?.kind === "delete" && (
        <DeleteDialog
          messages={dialog.messages}
          mine={dialog.messages.every((m) => m.senderId === me)}
          onClose={() => setDialog(null)}
          onBulk={
            dialog.bulk
              ? async (scope) => {
                  const ok = await bulkDelete(c.id, dialog.messages.map((m) => m.id), scope);
                  if (ok) {
                    setSelecting(false);
                    setSelected([]);
                  }
                }
              : undefined
          }
        />
      )}
      {dialog?.kind === "forward" && (
        <ForwardDialog
          messages={dialog.messages}
          onClose={() => setDialog(null)}
          onDone={() => {
            setSelecting(false);
            setSelected([]);
          }}
        />
      )}
      {dialog?.kind === "report" && c.otherUser && (
        <ReportDialog
          user={{ id: c.otherUser.id, name: c.otherUser.name }}
          message={dialog.message}
          onClose={() => setDialog(null)}
          onBlock={() => void blockUser(c.otherUser!.id, c.otherUser!.name)}
        />
      )}
      {dialog?.kind === "report" && !c.otherUser && dialog.message && (
        <ReportDialog user={{ id: dialog.message.senderId, name: memberName(dialog.message.senderId) }} message={dialog.message} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "block" && c.otherUser && (
        <Confirm
          title={`Block ${c.otherUser.name}?`}
          body={<p>They won't be able to message or call you, and they won't be told you blocked them. You can unblock them any time from Blocked.</p>}
          confirmLabel="Block"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            if (await blockUser(c.otherUser!.id, c.otherUser!.name)) {
              useInbox.getState().setActive(null);
              onBack();
            }
          }}
        />
      )}
      {dialog?.kind === "clear" && (
        <Confirm
          title="Clear this chat?"
          body={<p>All messages will be removed for you. {c.isGroup ? "Other members" : title} will still see them.</p>}
          confirmLabel="Clear chat"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => clearConversation(c)}
        />
      )}
      {dialog?.kind === "media" && <MediaViewer message={dialog.message} index={dialog.index} onClose={() => setDialog(null)} />}
    </section>
  );
}

export function NoChatSelected() {
  return (
    <section className="fki-chat fki-chat--empty">
      <Empty
        icon={<Star size={28} />}
        title="Your messages"
        text="Pick a conversation, or start a new one. Calls, reactions, voice notes and files all live here."
      />
    </section>
  );
}
