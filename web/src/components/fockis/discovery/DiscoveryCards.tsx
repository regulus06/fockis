import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  Church,
  Clapperboard,
  Compass,
  Hash,
  Map,
  MoreHorizontal,
  Plane,
  Plus,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

import { buildMediaUrl } from "../../../utils/fockisFeedHelpers";
import { useHideBottomNav } from "../FockisBottomNav";
import { useDiscovery } from "./discoveryStore";
import type { SuggestedPerson } from "./discoveryApi";
import "./DiscoveryCards.scss";

/* ============================================================================
   FEED DISCOVERY CARDS — real data only
   Used in the desktop right sidebar ("rail") and, on phones, as compact
   cards between posts ("inline"). Nothing here is invented: empty data
   hides the card.
============================================================================ */

type Variant = "rail" | "inline";

const compact = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);

function Avatar({ person }: { person: Pick<SuggestedPerson, "name" | "avatar"> }) {
  const [failed, setFailed] = useState(false);
  const src = person.avatar && !failed ? buildMediaUrl(person.avatar) : "";
  return (
    <span className="fkd-avatar" aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : (person.name.trim()[0] || "?").toUpperCase()}
    </span>
  );
}

/* ---------------------------------------------------------------- trending */

export function TrendingCard({ variant = "rail" }: { variant?: Variant }) {
  const trending = useDiscovery((s) => s.trending);
  const state = useDiscovery((s) => s.trendingState);
  const load = useDiscovery((s) => s.loadTrending);
  const [all, setAll] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading" && !trending.length) {
    return (
      <section className={`fkd-card is-${variant}`} aria-busy="true" aria-label="Trending on Fockis">
        <CardHead icon={TrendingUp} title="Trending on Fockis" />
        <div className="fkd-skeleton" />
        <div className="fkd-skeleton" />
        <div className="fkd-skeleton" />
      </section>
    );
  }
  if (!trending.length) return null;

  const list = all ? trending : trending.slice(0, variant === "inline" ? 4 : 5);
  return (
    <section className={`fkd-card is-${variant}`} aria-label="Trending on Fockis">
      <CardHead
        icon={TrendingUp}
        title="Trending on Fockis"
        action={trending.length > list.length || all ? { label: all ? "Show less" : "See all", onClick: () => setAll((v) => !v) } : undefined}
      />
      <ol className={`fkd-trends ${variant === "inline" ? "is-grid" : ""}`}>
        {list.map((t, i) => (
          <li key={t.tag} className="fkd-trend">
            {t.thumbnail && t.thumbnailType === "image" ? (
              <img className="fkd-trend__thumb" src={buildMediaUrl(t.thumbnail)} alt="" loading="lazy" />
            ) : t.thumbnail && t.thumbnailType === "video" ? (
              <span className="fkd-trend__thumb is-video" aria-hidden="true">
                <Video size={18} />
              </span>
            ) : (
              <span className="fkd-trend__thumb is-rank" aria-hidden="true">
                {i + 1}
              </span>
            )}
            <span className="fkd-trend__body">
              <strong>
                <Hash size={14} aria-hidden="true" />
                {t.tag}
              </strong>
              <small>
                {compact(t.posts)} {t.posts === 1 ? "post" : "posts"}
              </small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------------------------------------------------------- people */

export function PeopleToFollowCard({ variant = "rail", batch = 0 }: { variant?: Variant; batch?: number }) {
  const people = useDiscovery((s) => s.people);
  const state = useDiscovery((s) => s.peopleState);
  const following = useDiscovery((s) => s.following);
  const load = useDiscovery((s) => s.loadPeople);
  const follow = useDiscovery((s) => s.follow);
  const dismiss = useDiscovery((s) => s.dismiss);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const size = variant === "inline" ? 6 : 4;

  // Each inline card (batch) asks for people not shown before.
  useEffect(() => {
    if (people.length < size * (batch + 1)) void load(size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch]);

  // Later batches take the next people; if there aren't enough, the card
  // still shows whoever is there (the sidebar / panel shows the first ones).
  const list = people.slice(batch * size, batch * size + size);
  if (state === "loading" && !list.length) {
    return (
      <section className={`fkd-card is-${variant}`} aria-busy="true" aria-label="People you may follow">
        <CardHead icon={Users} title="People you may follow" />
        <div className="fkd-skeleton fkd-skeleton--row" />
        <div className="fkd-skeleton fkd-skeleton--row" />
      </section>
    );
  }
  if (!list.length) return null;

  return (
    <section className={`fkd-card is-${variant}`} aria-label="People you may follow">
      <CardHead icon={Users} title="People you may follow" />
      {error && (
        <p className="fkd-error" role="alert">
          {error}
        </p>
      )}
      <ul className={`fkd-people ${variant === "inline" ? "is-scroll" : ""}`}>
        {list.map((p) => {
          const done = following[p.id] === "yes";
          return (
            <li key={p.id} className="fkd-person">
              {variant === "inline" && (
                <button type="button" className="fkd-person__x" onClick={() => dismiss(p.id)} aria-label={`Hide ${p.name}`}>
                  <X size={14} />
                </button>
              )}
              <button type="button" className="fkd-person__who" onClick={() => navigate(`/profile/${p.id}`)}>
                <Avatar person={p} />
                <span className="fkd-person__text">
                  <strong>
                    {p.name}
                    {p.verified && <BadgeCheck size={15} className="fkd-verified" aria-label="Verified" />}
                  </strong>
                  <small>
                    {p.mutualCount > 0
                      ? `Followed by ${p.mutualCount} ${p.mutualCount === 1 ? "person" : "people"} you follow`
                      : p.bio || (p.username ? `@${p.username}` : `${compact(p.followersCount)} followers`)}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className={`fkd-follow${done ? " is-done" : ""}`}
                disabled={done}
                aria-pressed={done}
                onClick={() => {
                  setError("");
                  follow(p).catch((e: Error) => setError(e.message));
                }}
              >
                {done ? <Check size={15} /> : <UserPlus size={15} />} {done ? "Following" : "Follow"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- explore */

// Only routes that exist in App.tsx.
const EXPLORE: Array<{ to: string; label: string; icon: LucideIcon }> = [
  { to: "/waves", label: "Waves", icon: Clapperboard },
  { to: "/shop", label: "Fockis Shop", icon: ShoppingBag },
  { to: "/travel", label: "Travel", icon: Plane },
  { to: "/careers", label: "Careers", icon: Briefcase },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/church", label: "Church", icon: Church },
  { to: "/academy", label: "Academy", icon: BookOpen },
  { to: "/realestate", label: "Real Estate", icon: Building2 },
  { to: "/map", label: "Maps", icon: Map },
  { to: "/create", label: "Create", icon: Plus },
];

export function ExploreMoreCard({ variant = "rail" }: { variant?: Variant }) {
  return (
    <section className={`fkd-card is-${variant}`} aria-label="Explore more on Fockis">
      <CardHead icon={Compass} title="Explore more on Fockis" />
      <ul className="fkd-explore">
        {EXPLORE.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to}>
              <span className="fkd-explore__icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- shared */

function CardHead({ icon: Icon, title, action }: { icon: LucideIcon; title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <header className="fkd-card__head">
      <span className="fkd-card__icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <h2>{title}</h2>
      {action && (
        <button type="button" className="fkd-link" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </header>
  );
}

/** Desktop right sidebar. */
export function DiscoverySidebar() {
  return (
    <div className="fkd-sidebar">
      <TrendingCard />
      <PeopleToFollowCard />
      <ExploreMoreCard />
    </div>
  );
}

/**
 * Phones/tablets: a discovery card after some posts (the desktop sidebar
 * already shows them). Each kind appears once, people again later with
 * new suggestions; nothing sits above the feed.
 */
export const INLINE_DISCOVERY: Record<number, "trending" | "people" | "explore" | "people-2"> = {
  6: "trending",
  16: "people",
  26: "explore",
  46: "people-2",
};

export function InlineDiscovery({ position }: { position: number }) {
  const kind = INLINE_DISCOVERY[position];
  if (!kind) return null;
  return (
    <div className="fkd-inline">
      {kind === "trending" ? (
        <TrendingCard variant="inline" />
      ) : kind === "explore" ? (
        <ExploreMoreCard variant="inline" />
      ) : (
        <PeopleToFollowCard variant="inline" batch={kind === "people-2" ? 1 : 0} />
      )}
    </div>
  );
}

/* ============================================================================
   PHONES / SMALL SCREENS — "⋯" in the top bar opens the sidebar content
   (Trending, People you may follow, Explore more) in a slide-in panel.
   Hidden on wide screens, where the sidebar is always visible.
============================================================================ */

export function DiscoveryMenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="fkd-menu-button"
        onClick={() => setOpen(true)}
        aria-label="Open trending, people to follow and more"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MoreHorizontal size={24} />
      </button>
      {open && createPortal(<DiscoveryDrawer onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function DiscoveryDrawer({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useHideBottomNav(true);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    // Close if the screen becomes wide enough to show the real sidebar.
    const wide = window.matchMedia("(min-width: 901px)");
    const onWide = () => wide.matches && onClose();
    wide.addEventListener?.("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener?.("change", onWide);
    };
  }, [onClose]);

  return (
    <div className="fkd-drawer" role="dialog" aria-modal="true" aria-labelledby="fkd-drawer-title">
      <button type="button" className="fkd-drawer__backdrop" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <div className="fkd-drawer__panel">
        <header className="fkd-drawer__head">
          <h2 id="fkd-drawer-title">Discover</h2>
          <button ref={closeRef} type="button" className="fkd-drawer__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        {/* Links inside close the panel as they navigate. */}
        <div className="fkd-drawer__body" onClick={(event) => (event.target as HTMLElement).closest("a, .fkd-person__who") && onClose()}>
          <DiscoverySidebar />
        </div>
      </div>
    </div>
  );
}
