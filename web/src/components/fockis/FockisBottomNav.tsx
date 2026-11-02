import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { conversationsService, authToken, type InboxConversation } from "../../messages/inbox/inboxApi";
import { useInbox } from "../../messages/inbox/inboxStore";

import "../../styles/FockisNavigation.scss";

/* ============================================================================
   FOCKIS MOBILE BOTTOM NAVIGATION
   Home · Waves · Maps · (Create) · Shop · Messages · Profile

   - Phones only (≤ 767 px); desktop uses the sidebar.
   - Active tab: blue icon + label (#2583F7); others grey. Dark bar
     (#101827) in Sombre, white bar in Lumière (see FockisNavigation.scss).
   - Red badge with the number of unread chats on Messages (9+ above 9).
   - Hidden during full-screen experiences: Waves player (body.fk-reel-open),
     an open chat, a call, turn-by-turn navigation… Screens ask for that with
     useHideBottomNav(true).
   - Pages can leave room for it with var(--fk-bnav-h) while
     body.fk-bnav-on is set (see FockisNavigation.scss).
============================================================================ */

/* ---------------------------------------------------------------- icons */

type IconProps = { active?: boolean };
const SVG = ({ children }: { children: ReactNode }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

function HomeIcon({ active }: IconProps) {
  return active ? (
    <SVG>
      <path d="M3.2 10.4 12 3.2l8.8 7.2V20a1 1 0 0 1-1 1h-4.6v-6.2H8.8V21H4.2a1 1 0 0 1-1-1z" fill="currentColor" />
    </SVG>
  ) : (
    <SVG>
      <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z" />
    </SVG>
  );
}

function WavesIcon({ active }: IconProps) {
  return (
    <SVG>
      <rect x="3" y="3.5" width="18" height="17" rx="5" fill={active ? "currentColor" : "none"} />
      <path d="M10 8.6v6.8l5.6-3.4z" className={active ? "fk-bnav-cut" : undefined} fill="currentColor" stroke="currentColor" strokeWidth="1.4" />
    </SVG>
  );
}

function MapsIcon({ active }: IconProps) {
  return active ? (
    <SVG>
      <path d="M3 6.2 8.7 4l6.6 2.4L21 4.2v13.6L15.3 20l-6.6-2.4L3 19.8z" fill="currentColor" />
      <path className="fk-bnav-cut" d="M8.7 4v13.6M15.3 6.4V20" strokeWidth="1.6" />
    </SVG>
  ) : (
    <SVG>
      <path d="M3 6.2 8.7 4l6.6 2.4L21 4.2v13.6L15.3 20l-6.6-2.4L3 19.8z" />
      <path d="M8.7 4v13.6M15.3 6.4V20" />
    </SVG>
  );
}

function ShopIcon({ active }: IconProps) {
  return (
    <SVG>
      <path d="M5 8h14l-1 12.2a1 1 0 0 1-1 .8H7a1 1 0 0 1-1-.8z" fill={active ? "currentColor" : "none"} />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </SVG>
  );
}

function MessagesIcon({ active }: IconProps) {
  return (
    <SVG>
      <path d="M12 3.5c-5 0-8.8 3.4-8.8 7.8 0 2.3 1 4.3 2.7 5.8L5 20.5l4-1.6c.9.3 2 .4 3 .4 5 0 8.8-3.4 8.8-7.9S17 3.5 12 3.5z" fill={active ? "currentColor" : "none"} />
      <g className={active ? "fk-bnav-cut" : undefined} fill="currentColor" stroke="none">
        <circle cx="8.3" cy="11.4" r="1.15" />
        <circle cx="12" cy="11.4" r="1.15" />
        <circle cx="15.7" cy="11.4" r="1.15" />
      </g>
    </SVG>
  );
}

function ProfileIcon({ active }: IconProps) {
  return (
    <SVG>
      <circle cx="12" cy="8" r="4" fill={active ? "currentColor" : "none"} />
      <path d="M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" fill={active ? "currentColor" : "none"} />
    </SVG>
  );
}

function PlusIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* ---------------------------------------------------------------- tabs */

type Tab = {
  key: string;
  label: string;
  to: string;
  icon: (p: IconProps) => ReactNode;
  /** Path prefixes that make this tab active. */
  match: string[];
  create?: boolean;
};

const TABS: Tab[] = [
  { key: "home", label: "Home", to: "/fockis-preview", icon: HomeIcon, match: ["/fockis-preview"] },
  { key: "waves", label: "Waves", to: "/waves", icon: WavesIcon, match: ["/waves"] },
  { key: "maps", label: "Maps", to: "/map", icon: MapsIcon, match: ["/map"] },
  { key: "create", label: "Create", to: "/create", icon: PlusIcon, match: ["/create"], create: true },
  { key: "shop", label: "Shop", to: "/shop", icon: ShopIcon, match: ["/shop"] },
  { key: "messages", label: "Messages", to: "/messages", icon: MessagesIcon, match: ["/messages"] },
  { key: "profile", label: "Profile", to: "/profile", icon: ProfileIcon, match: ["/profile"] },
];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Screens without page scrolling: the bar stays put instead of hiding on scroll. */
const PINNED = ["/map", "/messages"];

/* ---------------------------------------------------------------- hide API */

let hideRequests = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function syncBodyClass() {
  if (typeof document !== "undefined") document.body.classList.toggle("fk-hide-bottom-nav", hideRequests > 0);
}

/**
 * Hide the bottom navigation while `hidden` is true (full-screen video, an
 * open chat, a call, turn-by-turn navigation…). Safe to use from several
 * screens at once.
 */
export function useHideBottomNav(hidden: boolean) {
  useEffect(() => {
    if (!hidden) return;
    hideRequests += 1;
    syncBodyClass();
    emit();
    return () => {
      hideRequests = Math.max(0, hideRequests - 1);
      syncBodyClass();
      emit();
    };
  }, [hidden]);
}

const useHiddenByScreen = () => useSyncExternalStore(subscribe, () => hideRequests > 0, () => false);

/* ---------------------------------------------------------------- one instance */

// Some pages also render <FockisBottomNav /> themselves inside the Layout
// that already has one; only one instance draws. When it unmounts (leaving
// that page), the next one takes over.
const instances: symbol[] = [];
const ownerListeners = new Set<() => void>();
const subscribeOwner = (l: () => void) => {
  ownerListeners.add(l);
  return () => ownerListeners.delete(l);
};

function useIsOwner() {
  const id = useRef(Symbol("fk-bottom-nav"));
  useEffect(() => {
    const me = id.current;
    instances.push(me);
    ownerListeners.forEach((l) => l());
    return () => {
      const i = instances.indexOf(me);
      if (i >= 0) instances.splice(i, 1);
      ownerListeners.forEach((l) => l());
    };
  }, []);
  return useSyncExternalStore(subscribeOwner, () => instances[0] === id.current, () => false);
}

/* ---------------------------------------------------------------- unread */

const unreadOf = (list: InboxConversation[]) =>
  list.filter((c) => !c.request && !c.archived && !c.muted && (c.unreadCount > 0 || c.markedUnread)).length;

/** Unread chats: live from the inbox when it's loaded, otherwise fetched every minute. */
function useUnreadChats(pathname: string) {
  const loaded = useInbox((s) => s.loaded);
  const live = useInbox((s) => (s.loaded ? unreadOf(Object.values(s.conversations)) : 0));
  const [fetched, setFetched] = useState(0);

  useEffect(() => {
    if (loaded || !authToken()) return;
    let stop = false;
    const load = () =>
      conversationsService
        .list()
        .then((list) => !stop && setFetched(unreadOf(list)))
        .catch(() => {
          /* the badge is optional */
        });
    void load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && void load(), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      stop = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loaded, pathname]);

  return loaded ? live : fetched;
}

/* ---------------------------------------------------------------- scroll */

function scrollTop(target: EventTarget | null): number {
  if (target instanceof HTMLElement && target !== document.documentElement && target !== document.body) return target.scrollTop;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/** Hide while scrolling down, show while scrolling up or at the top. */
function useScrollHidden(pathname: string, enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    setHidden(false);
    last.current = window.scrollY || 0;
    if (!enabled) return;
    const onScroll = (e: Event) => {
      if (window.innerWidth > 767) return setHidden(false);
      const pos = scrollTop(e.target);
      const diff = pos - last.current;
      if (Math.abs(diff) < 4) return;
      last.current = pos;
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(() => {
        setHidden(pos > 10 && diff > 0);
        ticking.current = false;
      });
    };
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [pathname, enabled]);

  return hidden;
}

/* ---------------------------------------------------------------- component */

export default function FockisBottomNav() {
  const { pathname } = useLocation();
  const isOwner = useIsOwner();
  const hiddenByScreen = useHiddenByScreen();
  const pinned = matches(pathname, PINNED);
  const scrollHidden = useScrollHidden(pathname, !pinned);
  const unread = useUnreadChats(pathname);

  // Tell pages the bar is there so they can leave room for it.
  useEffect(() => {
    if (!isOwner) return;
    document.body.classList.add("fk-bnav-on");
    return () => document.body.classList.remove("fk-bnav-on");
  }, [isOwner]);

  if (!isOwner) return null;

  const hidden = scrollHidden && !pinned;

  return (
    <nav className={`fk-bottom-nav${hidden ? " is-scrolled-away" : ""}`} aria-label="Fockis main navigation" aria-hidden={hiddenByScreen || undefined}>
      <div className="fk-bottom-nav__inner">
        {TABS.map((tab) => {
          const active = matches(pathname, tab.match) || (tab.key === "home" && pathname === "/");
          const Icon = tab.icon;
          const badge = tab.key === "messages" && unread > 0 ? (unread > 9 ? "9+" : String(unread)) : null;
          return (
            <NavLink
              key={tab.key}
              to={tab.to}
              className={`fk-bottom-nav__item${active ? " is-active" : ""}${tab.create ? " fk-bottom-nav__item--create" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${tab.label}, ${badge} unread` : tab.label}
            >
              <span className="fk-bottom-nav__icon">
                <Icon active={active} />
                {badge && <span className="fk-bottom-nav__badge">{badge}</span>}
              </span>
              <span className="fk-bottom-nav__label">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
