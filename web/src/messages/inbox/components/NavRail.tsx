import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Ban, Home, Inbox, MessageCircle, Phone, Settings, Star, UserRound } from "lucide-react";

import { currentUserProfile } from "../inboxApi";
import { useInbox, type InboxView } from "../inboxStore";
import { Avatar } from "../ui";

/* ============================================================================
   LEFT NAVIGATION (dark purple rail from the design)
============================================================================ */

const ITEMS: Array<{ view: InboxView; label: string; icon: typeof Home }> = [
  { view: "messages", label: "Messages", icon: MessageCircle },
  { view: "calls", label: "Calls", icon: Phone },
  { view: "contacts", label: "Contacts", icon: UserRound },
  { view: "requests", label: "Requests", icon: Inbox },
  { view: "archived", label: "Archived", icon: Archive },
  { view: "starred", label: "Starred", icon: Star },
  { view: "blocked", label: "Blocked", icon: Ban },
];

export function useNavCounts() {
  const conversations = useInbox((s) => s.conversations);
  const missedCalls = useInbox((s) => s.missedCalls);
  return useMemo(() => {
    let unread = 0;
    let requests = 0;
    for (const c of Object.values(conversations)) {
      if (c.request) {
        requests += 1;
        continue;
      }
      if (!c.archived && !c.muted && (c.unreadCount > 0 || c.markedUnread)) unread += 1;
    }
    return { messages: unread, requests, calls: missedCalls } as Partial<Record<InboxView, number>>;
  }, [conversations, missedCalls]);
}

export default function NavRail() {
  const navigate = useNavigate();
  const view = useInbox((s) => s.view);
  const setView = useInbox((s) => s.setView);
  const connected = useInbox((s) => s.connected);
  const counts = useNavCounts();
  const me = currentUserProfile();

  return (
    <nav className="fki-nav" aria-label="Messages navigation">
      <button type="button" className="fki-nav__brand" onClick={() => navigate("/")} aria-label="Fockis home">
        <span className="fki-nav__logo" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="30" height="30">
            <defs>
              <linearGradient id="fki-logo" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#c7a6ff" />
                <stop offset="1" stopColor="#7b45f5" />
              </linearGradient>
            </defs>
            <path d="M7 4h14a8 8 0 0 1 0 16h-6v8H7z" fill="url(#fki-logo)" />
            <path d="M15 12h6" stroke="#2a1263" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
        <span className="fki-nav__word">Fockis</span>
      </button>

      <ul className="fki-nav__list">
        <li>
          <button type="button" className="fki-nav__item" onClick={() => navigate("/")}>
            <Home size={21} />
            <span>Home</span>
          </button>
        </li>
        {ITEMS.map(({ view: v, label, icon: Icon }) => (
          <li key={v}>
            <button
              type="button"
              className={`fki-nav__item ${view === v ? "is-active" : ""}`}
              aria-current={view === v ? "page" : undefined}
              onClick={() => setView(v)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {Boolean(counts[v]) && <b className="fki-nav__count">{counts[v]! > 99 ? "99+" : counts[v]}</b>}
            </button>
          </li>
        ))}
      </ul>

      <div className="fki-nav__wave" aria-hidden="true" />

      <button type="button" className={`fki-nav__item fki-nav__settings ${view === "settings" ? "is-active" : ""}`} onClick={() => setView("settings")}>
        <Settings size={21} />
        <span>Settings</span>
      </button>

      <div className="fki-nav__me">
        <Avatar name={me.name} src={me.avatar} size={44} online={connected} />
        <span className="fki-nav__me-text">
          <strong>{me.name}</strong>
          <small>{connected ? "Online" : "Connecting…"}</small>
        </span>
      </div>
    </nav>
  );
}

/** Bottom tabs for phones (only on the list screens, never over a chat). */
export function MobileTabs() {
  const view = useInbox((s) => s.view);
  const setView = useInbox((s) => s.setView);
  const counts = useNavCounts();
  const tabs: Array<{ view: InboxView; label: string; icon: typeof Home }> = [
    { view: "messages", label: "Chats", icon: MessageCircle },
    { view: "calls", label: "Calls", icon: Phone },
    { view: "contacts", label: "Contacts", icon: UserRound },
    { view: "settings", label: "More", icon: Settings },
  ];
  return (
    <nav className="fki-tabs" aria-label="Messages sections">
      {tabs.map(({ view: v, label, icon: Icon }) => {
        const active = view === v || (v === "settings" && ["requests", "archived", "blocked", "starred"].includes(view));
        return (
          <button key={v} type="button" className={active ? "is-active" : ""} onClick={() => setView(v)} aria-current={active ? "page" : undefined}>
            <span className="fki-tabs__icon">
              <Icon size={22} />
              {Boolean(counts[v]) && <b>{counts[v]}</b>}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
