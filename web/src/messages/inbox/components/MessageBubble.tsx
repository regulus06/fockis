import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  CheckSquare,
  Copy,
  Download,
  FileText,
  Flag,
  Forward,
  MailMinus,
  MoreVertical,
  Pause,
  Pencil,
  Phone,
  PhoneMissed,
  Pin,
  PinOff,
  Play,
  Reply,
  RotateCcw,
  SmilePlus,
  Star,
  StarOff,
  Trash2,
  Video,
} from "lucide-react";

import { REACTION_EMOJIS } from "../../types";
import type { InboxMessage } from "../inboxApi";
import { Ticks, clock, mediaUrl, useClickOutside } from "../ui";

/* ============================================================================
   MESSAGE BUBBLE + ACTION MENUS
============================================================================ */

export type MessageAction =
  | "reply"
  | "copy"
  | "edit"
  | "delete"
  | "forward"
  | "pin"
  | "star"
  | "select"
  | "report"
  | "unread"
  | "retry"
  | "discard"
  | "callback";

interface BubbleProps {
  message: InboxMessage;
  mine: boolean;
  senderName?: string;
  showSender: boolean;
  grouped: boolean;
  selecting: boolean;
  selected: boolean;
  highlight: boolean;
  query: string;
  onAction: (action: MessageAction, message: InboxMessage) => void;
  onReact: (message: InboxMessage, emoji: string) => void;
  onToggleSelect: (message: InboxMessage) => void;
  onOpenMedia: (message: InboxMessage, index: number) => void;
  onJump: (messageId: string) => void;
  myId: string;
}

function formatBytes(size: number) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function Linkified({ text, query }: { text: string; query: string }) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow">
            {part}
          </a>
        ) : (
          <Highlighted key={i} text={part} query={query} />
        ),
      )}
    </>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const out: ReactNode[] = [];
  let rest = text;
  let key = 0;
  for (;;) {
    const i = rest.toLowerCase().indexOf(q);
    if (i < 0) break;
    out.push(rest.slice(0, i), <mark key={key++}>{rest.slice(i, i + q.length)}</mark>);
    rest = rest.slice(i + q.length);
  }
  out.push(rest);
  return <>{out}</>;
}

/** Voice note / audio player with a waveform. */
function VoicePlayer({ src, duration, waveform, mine }: { src: string; duration?: number; waveform?: number[]; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [length, setLength] = useState(duration ?? 0);
  const bars = waveform?.length ? waveform.slice(0, 40) : Array.from({ length: 32 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => undefined);
    else a.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !length) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - r.left) / r.width) * length;
  };

  const shown = playing || progress > 0 ? Math.floor(progress * length) : Math.floor(length);
  return (
    <div className={`fki-voice ${mine ? "is-mine" : ""}`}>
      <button type="button" className="fki-voice__play" onClick={toggle} aria-label={playing ? "Pause" : "Play voice message"}>
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="fki-voice__wave" onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} tabIndex={0}>
        {bars.map((b, i) => (
          <i key={i} className={i / bars.length <= progress ? "is-played" : ""} style={{ height: `${Math.max(14, Math.min(100, b * 100))}%` }} />
        ))}
      </div>
      <span className="fki-voice__time">
        {Math.floor(shown / 60)}:{String(shown % 60).padStart(2, "0")}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLength(e.currentTarget.duration)}
        onTimeUpdate={(e) => length && setProgress(e.currentTarget.currentTime / length)}
      />
    </div>
  );
}

function Attachments({ message, mine, onOpenMedia }: { message: InboxMessage; mine: boolean; onOpenMedia: (m: InboxMessage, i: number) => void }) {
  const visual = message.attachments.filter((a) => a.kind === "image" || a.kind === "video");
  const others = message.attachments.filter((a) => a.kind !== "image" && a.kind !== "video");
  const uploading = message.status === "sending" && message.attachments.some((a) => a.id === "uploading");
  return (
    <>
      {visual.length > 0 && (
        <div className={`fki-media fki-media--${Math.min(visual.length, 4)}`}>
          {visual.slice(0, 4).map((a, i) => (
            <button key={a.id + i} type="button" className="fki-media__item" onClick={() => onOpenMedia(message, message.attachments.indexOf(a))} aria-label={a.kind === "video" ? "Play video" : "Open photo"}>
              {a.kind === "image" ? (
                <img src={mediaUrl(a.thumbnailUrl || a.url)} alt={a.caption || a.name || "Photo"} loading="lazy" />
              ) : (
                <>
                  <video src={mediaUrl(a.url)} preload="metadata" muted playsInline />
                  <span className="fki-media__play">
                    <Play size={22} />
                  </span>
                </>
              )}
              {i === 3 && visual.length > 4 && <span className="fki-media__more">+{visual.length - 4}</span>}
              {uploading && <span className="fki-media__progress">{message.error || "Uploading…"}</span>}
            </button>
          ))}
        </div>
      )}
      {others.map((a, i) =>
        a.kind === "audio" ? (
          <VoicePlayer key={a.id + i} src={mediaUrl(a.url)} duration={a.duration} waveform={a.waveform} mine={mine} />
        ) : (
          <a key={a.id + i} className="fki-doc" href={uploading ? undefined : mediaUrl(a.url)} target="_blank" rel="noopener noreferrer" download={a.name}>
            <span className="fki-doc__icon">
              <FileText size={22} />
            </span>
            <span className="fki-doc__text">
              <strong>{a.name || "Document"}</strong>
              <small>{uploading ? message.error || "Uploading…" : [formatBytes(a.size), a.mimeType?.split("/")[1]?.toUpperCase()].filter(Boolean).join(" · ")}</small>
            </span>
            {!uploading && <Download size={18} className="fki-doc__dl" />}
          </a>
        ),
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   MENUS
--------------------------------------------------------------------------- */

interface MenuItem {
  action: MessageAction;
  label: string;
  icon: ReactNode;
  danger?: boolean;
}

export function menuItems(message: InboxMessage, mine: boolean): MenuItem[] {
  if (message.status === "failed") {
    return [
      { action: "retry", label: "Try again", icon: <RotateCcw size={18} /> },
      { action: "discard", label: "Delete", icon: <Trash2 size={18} />, danger: true },
    ];
  }
  if (message.status === "sending" || !message.id) return [];
  if (message.deletedForEveryone) {
    return [
      { action: "delete", label: "Delete for me", icon: <Trash2 size={18} />, danger: true },
      { action: "select", label: "Select", icon: <CheckSquare size={18} /> },
    ];
  }
  const items: MenuItem[] = [{ action: "reply", label: "Reply", icon: <Reply size={18} /> }];
  if (message.text) items.push({ action: "copy", label: "Copy text", icon: <Copy size={18} /> });
  if (mine && message.type === "text") items.push({ action: "edit", label: "Edit message", icon: <Pencil size={18} /> });
  items.push({ action: "delete", label: "Delete message", icon: <Trash2 size={18} />, danger: true });
  items.push({ action: "forward", label: "Forward", icon: <Forward size={18} /> });
  items.push({ action: "pin", label: message.pinned ? "Unpin" : "Pin", icon: message.pinned ? <PinOff size={18} /> : <Pin size={18} /> });
  items.push({ action: "star", label: message.starred ? "Unstar" : "Star", icon: message.starred ? <StarOff size={18} /> : <Star size={18} /> });
  items.push({ action: "unread", label: "Mark as unread", icon: <MailMinus size={18} /> });
  items.push({ action: "select", label: "Select messages", icon: <CheckSquare size={18} /> });
  if (!mine) items.push({ action: "report", label: "Report", icon: <Flag size={18} />, danger: true });
  return items;
}

export function ActionMenu({
  message,
  mine,
  position,
  onAction,
  onReact,
  onClose,
  myId,
}: {
  message: InboxMessage;
  mine: boolean;
  position: { x: number; y: number };
  onAction: (action: MessageAction, message: InboxMessage) => void;
  onReact: (message: InboxMessage, emoji: string) => void;
  onClose: () => void;
  myId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(position);
  useClickOutside(ref, onClose);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(position.x, window.innerWidth - r.width - 8)),
      y: Math.max(8, Math.min(position.y, window.innerHeight - r.height - 8)),
    });
    el.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
  }, [position]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const items = menuItems(message, mine);
  const canReact = Boolean(message.id) && !message.deletedForEveryone && message.status !== "failed" && message.type !== "system";

  return (
    <div ref={ref} className="fki-msgmenu" style={{ left: pos.x, top: pos.y }} role="menu" aria-label="Message actions">
      {canReact && (
        <div className="fki-msgmenu__reactions">
          {REACTION_EMOJIS.map((emoji) => {
            const active = message.reactions.some((r) => r.emoji === emoji && r.userIds.includes(myId));
            return (
              <button key={emoji} type="button" className={active ? "is-active" : ""} onClick={() => (onReact(message, emoji), onClose())} aria-label={`React ${emoji}`}>
                {emoji}
              </button>
            );
          })}
        </div>
      )}
      {items.map((item) => (
        <button key={item.action} type="button" role="menuitem" className={item.danger ? "is-danger" : ""} onClick={() => (onClose(), onAction(item.action, message))}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   BUBBLE
--------------------------------------------------------------------------- */

function MessageBubbleImpl(props: BubbleProps) {
  const { message: m, mine, selecting, selected, onAction, onReact, onToggleSelect, onOpenMedia, onJump, myId } = props;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [quickReact, setQuickReact] = useState(false);
  const press = useRef<number | null>(null);
  const reactRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  useClickOutside(reactRef, () => setQuickReact(false), quickReact);

  if (m.type === "system") {
    const missed = /missed|declined|no answer|failed/i.test(m.systemLabel || m.text || "");
    const video = /video/i.test(m.systemLabel || m.text || "");
    return (
      <div className="fki-system" id={`msg-${m.id}`}>
        <button type="button" className={`fki-callog ${missed ? "is-missed" : ""}`} onClick={() => m.callId && onAction("callback", m)} title={m.callId ? "Call back" : undefined}>
          {missed ? <PhoneMissed size={16} /> : video ? <Video size={16} /> : <Phone size={16} />}
          <span>{m.systemLabel || m.text}</span>
          <time>{clock(new Date(m.createdAt))}</time>
        </button>
      </div>
    );
  }

  const openAt = (x: number, y: number) => {
    if (selecting) return;
    if (!menuItems(m, mine).length) return;
    setMenu({ x, y });
  };

  const reactions = m.reactions.filter((r) => r.userIds.length);
  const hasMedia = m.attachments.some((a) => a.kind === "image" || a.kind === "video");
  const bubbleClass = [
    "fki-bubble",
    mine ? "is-mine" : "is-theirs",
    props.grouped ? "is-grouped" : "",
    m.deletedForEveryone ? "is-deleted" : "",
    hasMedia && !m.text ? "is-media" : "",
    m.status === "failed" ? "is-failed" : "",
    props.highlight ? "is-highlight" : "",
    menu ? "is-menu-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id={m.id ? `msg-${m.id}` : undefined}
      className={`fki-msg ${mine ? "is-mine" : "is-theirs"} ${selecting ? "is-selecting" : ""} ${selected ? "is-selected" : ""} ${reactions.length ? "has-reactions" : ""}`}
      onClick={selecting && m.id ? () => onToggleSelect(m) : undefined}
    >
      {selecting && m.id && (
        <span className={`fki-check ${selected ? "is-on" : ""}`} role="checkbox" aria-checked={selected} aria-label="Select message" />
      )}

      <div className="fki-msg__col">
        {props.showSender && !mine && props.senderName && <span className="fki-msg__sender">{props.senderName}</span>}

        <div
          className={bubbleClass}
          tabIndex={0}
          onContextMenu={(e) => {
            e.preventDefault();
            openAt(e.clientX, e.clientY);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              openAt(mine ? r.left - 240 : r.right + 8, r.top);
            }
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            press.current = window.setTimeout(() => {
              navigator.vibrate?.(15);
              openAt(t.clientX, t.clientY);
            }, 480);
          }}
          onTouchEnd={() => press.current && window.clearTimeout(press.current)}
          onTouchMove={() => press.current && window.clearTimeout(press.current)}
        >
          {m.forwarded && !m.deletedForEveryone && (
            <span className="fki-bubble__fwd">
              <Forward size={13} /> Forwarded
            </span>
          )}

          {m.replyTo && !m.deletedForEveryone && (
            <button type="button" className="fki-quote" onClick={() => onJump(m.replyTo!.messageId)}>
              <strong>{m.replyTo.senderName}</strong>
              <span>{m.replyTo.preview || "Attachment"}</span>
            </button>
          )}

          {m.deletedForEveryone ? (
            <span className="fki-bubble__deleted">
              <Ban size={15} /> This message was deleted
            </span>
          ) : (
            <>
              <Attachments message={m} mine={mine} onOpenMedia={onOpenMedia} />
              {m.text && (
                <p className="fki-bubble__text">
                  <Linkified text={m.text} query={props.query} />
                </p>
              )}
            </>
          )}

          <span className="fki-bubble__meta">
            {m.pinned && <Pin size={12} aria-label="Pinned" />}
            {m.starred && <Star size={12} aria-label="Starred" className="is-star" />}
            {m.editedAt && !m.deletedForEveryone && <span>Edited</span>}
            <time dateTime={m.createdAt}>{clock(new Date(m.createdAt))}</time>
            {mine && !m.deletedForEveryone && <Ticks status={m.status} />}
          </span>

          {!selecting && m.id && !m.deletedForEveryone && m.status !== "failed" && (
            <div className="fki-hoverbar" role="toolbar" aria-label="Quick actions">
              <div className="fki-hoverbar__react" ref={reactRef}>
                <button type="button" onClick={() => setQuickReact((v) => !v)} aria-label="React" title="React">
                  <SmilePlus size={18} />
                </button>
                {quickReact && (
                  <div className="fki-quickreact">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => (setQuickReact(false), onReact(m, emoji))}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => onAction("reply", m)} aria-label="Reply" title="Reply">
                <Reply size={18} />
              </button>
              {m.text && (
                <button type="button" onClick={() => onAction("copy", m)} aria-label="Copy" title="Copy">
                  <Copy size={17} />
                </button>
              )}
              {mine && m.type === "text" && (
                <button type="button" onClick={() => onAction("edit", m)} aria-label="Edit" title="Edit">
                  <Pencil size={17} />
                </button>
              )}
              <button type="button" className="is-danger" onClick={() => onAction("delete", m)} aria-label="Delete" title="Delete">
                <Trash2 size={17} />
              </button>
              <button type="button" onClick={() => onAction("star", m)} aria-label={m.starred ? "Unstar" : "Star"} title={m.starred ? "Unstar" : "Star"}>
                {m.starred ? <StarOff size={17} /> : <Star size={17} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  openAt(r.left - 200, r.bottom + 6);
                }}
                aria-label="More actions"
                title="More"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          )}
        </div>

        {m.status === "failed" && (
          <span className="fki-failed">
            Not sent{m.error ? ` · ${m.error}` : ""}
            <button type="button" onClick={() => onAction("retry", m)}>
              Retry
            </button>
            <button type="button" onClick={() => onAction("discard", m)}>
              Delete
            </button>
          </span>
        )}

        {reactions.length > 0 && (
          <div className="fki-reactions">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                className={r.userIds.includes(myId) ? "is-mine" : ""}
                onClick={() => onReact(m, r.emoji)}
                aria-label={`${r.emoji} ${r.userIds.length}`}
              >
                {r.emoji}
                {r.userIds.length > 1 && <span>{r.userIds.length}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {menu &&
        createPortal(
          <ActionMenu message={m} mine={mine} position={menu} onAction={onAction} onReact={onReact} onClose={closeMenu} myId={myId} />,
          document.querySelector(".fki-app") ?? document.body,
        )}
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
