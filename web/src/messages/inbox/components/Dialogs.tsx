import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Download, Loader2, Search, Users, X } from "lucide-react";

import { peopleService, type InboxMessage, type InboxUser } from "../inboxApi";
import { createGroup, deleteForEveryone, deleteForMe, forwardMessage, reportUser, startDirect } from "../inboxActions";
import { useInbox } from "../inboxStore";
import { Avatar, Modal, conversationTitle, mediaUrl } from "../ui";

/* ============================================================================
   DIALOGS: delete, forward, report, new chat / group, media viewer
============================================================================ */

export function DeleteDialog({ messages, mine, onClose, onBulk }: { messages: InboxMessage[]; mine: boolean; onClose: () => void; onBulk?: (scope: "me" | "everyone") => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const count = messages.length;
  const canEveryone = mine && messages.every((m) => !m.deletedForEveryone);
  const run = async (scope: "me" | "everyone") => {
    setBusy(true);
    try {
      if (onBulk) await onBulk(scope);
      else if (scope === "everyone") await deleteForEveryone(messages[0]);
      else await deleteForMe(messages[0]);
    } finally {
      setBusy(false);
      onClose();
    }
  };
  return (
    <Modal title={count > 1 ? `Delete ${count} messages?` : "Delete message?"} onClose={onClose}>
      <div className="fki-confirm">
        <p>{canEveryone ? "You can remove it just for you, or for everyone in this chat." : "This removes it from your view of the chat. Others will still see it."}</p>
        <div className="fki-stack">
          {canEveryone && (
            <button type="button" className="fki-btn fki-btn--danger fki-btn--block" disabled={busy} onClick={() => void run("everyone")}>
              Delete for everyone
            </button>
          )}
          <button type="button" className={`fki-btn ${canEveryone ? "fki-btn--soft-danger" : "fki-btn--danger"} fki-btn--block`} disabled={busy} onClick={() => void run("me")}>
            Delete for me
          </button>
          <button type="button" className="fki-btn fki-btn--ghost fki-btn--block" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ForwardDialog({ messages, onClose, onDone }: { messages: InboxMessage[]; onClose: () => void; onDone?: () => void }) {
  const conversations = useInbox((s) => s.conversations);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const list = useMemo(
    () =>
      Object.values(conversations)
        .filter((c) => !c.request)
        .filter((c) => conversationTitle(c).toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime() - new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime()),
    [conversations, query],
  );
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 5 ? p : [...p, id]));

  return (
    <Modal
      title={messages.length > 1 ? `Forward ${messages.length} messages` : "Forward message"}
      onClose={onClose}
      footer={
        <>
          <span className="fki-muted">{picked.length ? `${picked.length} selected (max 5)` : "Choose up to 5 chats"}</span>
          <button
            type="button"
            className="fki-btn fki-btn--primary"
            disabled={!picked.length || busy}
            onClick={async () => {
              setBusy(true);
              let ok = true;
              for (const m of messages) ok = (await forwardMessage(m, picked)) && ok;
              setBusy(false);
              if (ok) {
                onDone?.();
                onClose();
              }
            }}
          >
            {busy ? <Loader2 size={18} className="fki-spin" /> : "Forward"}
          </button>
        </>
      }
    >
      <label className="fki-search fki-search--modal">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats" aria-label="Search chats" />
      </label>
      <ul className="fki-pick">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" className={picked.includes(c.id) ? "is-on" : ""} onClick={() => toggle(c.id)} aria-pressed={picked.includes(c.id)}>
              <Avatar name={conversationTitle(c)} src={c.isGroup ? c.groupAvatar : c.otherUser?.avatar} group={c.isGroup} size={42} />
              <span>{conversationTitle(c)}</span>
              <i className="fki-pick__check">{picked.includes(c.id) && <Check size={14} />}</i>
            </button>
          </li>
        ))}
        {!list.length && <li className="fki-muted fki-pad">No chats found.</li>}
      </ul>
    </Modal>
  );
}

const REPORT_REASONS = [
  ["harassment", "Harassment or bullying"],
  ["spam", "Spam"],
  ["scam", "Scam or fraud"],
  ["hate_speech", "Hate speech"],
  ["violence", "Violence or threats"],
  ["impersonation", "Fake account or impersonation"],
  ["inappropriate_behavior", "Inappropriate behavior"],
  ["underage", "Suspected underage account"],
  ["other", "Something else"],
] as const;

export function ReportDialog({ user, message, onClose, onBlock }: { user: { id: string; name: string }; message?: InboxMessage; onClose: () => void; onBlock?: () => void }) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={message ? "Report message" : `Report ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="fki-btn fki-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="fki-btn fki-btn--danger"
            disabled={!reason || busy}
            onClick={async () => {
              setBusy(true);
              const ok = await reportUser(user.id, reason, details, message?.id);
              setBusy(false);
              if (ok) {
                if (alsoBlock) onBlock?.();
                onClose();
              }
            }}
          >
            Send report
          </button>
        </>
      }
    >
      {message?.text && <blockquote className="fki-report-quote">{message.text}</blockquote>}
      <fieldset className="fki-radios">
        <legend>Why are you reporting this?</legend>
        {REPORT_REASONS.map(([value, label]) => (
          <label key={value}>
            <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      <textarea className="fki-textarea" rows={3} maxLength={1000} placeholder="Add details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      {onBlock && (
        <label className="fki-check-row">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} /> Also block {user.name}
        </label>
      )}
      <p className="fki-muted">Reports are confidential. {user.name} won't know who reported them.</p>
    </Modal>
  );
}

export function NewChatDialog({ group: startAsGroup, onClose }: { group?: boolean; onClose: () => void }) {
  const [group, setGroup] = useState(Boolean(startAsGroup));
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<InboxUser[] | null>(null);
  const [results, setResults] = useState<InboxUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<InboxUser[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    peopleService
      .friends()
      .then(setFriends)
      .catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      peopleService
        .search(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const shown = query.trim().length >= 2 ? results : (friends ?? []);
  const toggle = (u: InboxUser) => setPicked((p) => (p.some((x) => x.id === u.id) ? p.filter((x) => x.id !== u.id) : [...p, u]));

  const choose = async (u: InboxUser) => {
    if (group) return toggle(u);
    setBusy(true);
    const c = await startDirect(u.id);
    setBusy(false);
    if (c) onClose();
  };

  return (
    <Modal
      title={group ? "New group" : "New message"}
      onClose={onClose}
      footer={
        group ? (
          <>
            <button type="button" className="fki-btn fki-btn--ghost" onClick={() => setGroup(false)}>
              Back
            </button>
            <button
              type="button"
              className="fki-btn fki-btn--primary"
              disabled={busy || picked.length < 2 || !name.trim()}
              onClick={async () => {
                setBusy(true);
                const c = await createGroup(name.trim(), picked.map((p) => p.id));
                setBusy(false);
                if (c) onClose();
              }}
            >
              Create group
            </button>
          </>
        ) : undefined
      }
    >
      {group ? (
        <>
          <input className="fki-field" placeholder="Group name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-label="Group name" />
          {picked.length > 0 && (
            <div className="fki-picked">
              {picked.map((p) => (
                <button key={p.id} type="button" onClick={() => toggle(p)}>
                  {p.name} <X size={12} />
                </button>
              ))}
            </div>
          )}
          <p className="fki-muted">Add at least 2 people.</p>
        </>
      ) : (
        <button type="button" className="fki-newgroup" onClick={() => setGroup(true)}>
          <span className="fki-avatar is-group" style={{ width: 42, height: 42 }}>
            <Users size={20} />
          </span>
          New group
        </button>
      )}

      <label className="fki-search fki-search--modal">
        <Search size={18} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people on Fockis" aria-label="Search people" autoFocus />
        {searching && <Loader2 size={16} className="fki-spin" />}
      </label>
      <h4 className="fki-subhead">{query.trim().length >= 2 ? "Results" : "Friends"}</h4>
      <ul className="fki-pick">
        {friends === null && query.trim().length < 2 && <li className="fki-muted fki-pad">Loading…</li>}
        {shown.map((u) => {
          const on = picked.some((p) => p.id === u.id);
          return (
            <li key={u.id}>
              <button type="button" className={on ? "is-on" : ""} onClick={() => void choose(u)} disabled={busy}>
                <Avatar name={u.name} src={u.avatar} size={42} online={u.presence === "online"} />
                <span>
                  {u.name}
                  {u.username && <small>@{u.username}</small>}
                </span>
                {group && <i className="fki-pick__check">{on && <Check size={14} />}</i>}
              </button>
            </li>
          );
        })}
        {friends !== null && !shown.length && (
          <li className="fki-muted fki-pad">{query.trim().length >= 2 ? (searching ? "Searching…" : "No one found.") : "Search for someone to message."}</li>
        )}
      </ul>
    </Modal>
  );
}

export function MediaViewer({ message, index, onClose }: { message: InboxMessage; index: number; onClose: () => void }) {
  const items = message.attachments.filter((a) => a.kind === "image" || a.kind === "video");
  const startAt = Math.max(0, items.indexOf(message.attachments[index]));
  const [i, setI] = useState(startAt);
  const item = items[i];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => Math.min(items.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose]);
  if (!item) return null;
  return (
    <div className="fki-viewer" role="dialog" aria-modal="true" aria-label="Media viewer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fki-viewer__bar">
        <span>
          {i + 1} / {items.length}
        </span>
        <a className="fki-icon-btn" href={mediaUrl(item.url)} download={item.name} target="_blank" rel="noopener noreferrer" aria-label="Download">
          <Download size={20} />
        </a>
        <button type="button" className="fki-icon-btn" onClick={onClose} aria-label="Close">
          <X size={22} />
        </button>
      </div>
      {i > 0 && (
        <button type="button" className="fki-viewer__nav is-prev" onClick={() => setI(i - 1)} aria-label="Previous">
          <ChevronLeft size={28} />
        </button>
      )}
      {item.kind === "image" ? <img src={mediaUrl(item.url)} alt={item.caption || item.name || "Photo"} /> : <video src={mediaUrl(item.url)} controls autoPlay playsInline />}
      {i < items.length - 1 && (
        <button type="button" className="fki-viewer__nav is-next" onClick={() => setI(i + 1)} aria-label="Next">
          <ChevronRight size={28} />
        </button>
      )}
      {message.text && <p className="fki-viewer__caption">{message.text}</p>}
    </div>
  );
}
