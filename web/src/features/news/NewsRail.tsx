/**
 * NewsRail.tsx — right column of the central news pages:
 * Top Media on Fockis · Live on Fockis · Support Independent Media · Create Your Media.
 */

import { Link } from "react-router-dom";
import { ArrowRight, Heart, MonitorPlay, Play, Radio as RadioIcon, Tv } from "lucide-react";

import { compact, type LiveEntry, type OutletCard } from "./newsApi";
import { FollowControl, OutletLogo, Skeleton, Verified } from "./NewsParts";

export function TopMediaBox({ items, notify }: { items: OutletCard[] | null; notify: (tone: "ok" | "error", text: string) => void }) {
  return (
    <section className="nm-box">
      <header className="nm-box__head">
        <h2>Top Media on Fockis</h2>
        <Link to="/news/directory" className="nm-seemore">
          See all →
        </Link>
      </header>
      {!items && [0, 1, 2, 3].map((i) => <Skeleton key={i} h={44} />)}
      {items && items.length === 0 && <p className="nm-muted">No media organizations yet. Be the first to create one.</p>}
      <ul className="nm-topmedia">
        {items?.map((o) => (
          <li key={o.id}>
            <Link to={`/news/${o.slug}`} className="nm-topmedia__who">
              <OutletLogo outlet={o} size={40} />
              <span>
                <b>
                  <span>{o.name}</span>
                  {o.verified && <Verified size={15} />}
                </b>
                <small>{compact(o.followerCount)} followers</small>
              </span>
            </Link>
            <FollowControl outletId={o.id} outletName={o.name} initial={{ isFollowing: o.isFollowing }} size="sm" notify={notify} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LiveBox({ items }: { items: LiveEntry[] | null }) {
  if (items && items.length === 0) return null;
  return (
    <section className="nm-box">
      <header className="nm-box__head">
        <h2>
          <span className="nm-live-ring" aria-hidden="true" /> Live on Fockis
        </h2>
        <Link to="/news/live" className="nm-seemore">
          See all →
        </Link>
      </header>
      {!items && <Skeleton h={120} />}
      <div className="nm-livegrid">
        {items?.slice(0, 4).map((l) => (
          <Link key={`${l.outlet.id}-${l.kind}`} to={`/news/${l.outlet.slug}?tab=${l.kind === "tv" ? "live" : "radio"}`} className={`nm-livecard nm-livecard--${l.kind}`}>
            <span className="nm-livecard__art">
              {l.outlet.coverUrl ? <img src={l.outlet.coverUrl} alt="" /> : null}
              <span className="nm-livecard__kind">{l.kind === "tv" ? <Tv /> : <RadioIcon />}</span>
              <span className="nm-livecard__play" aria-hidden="true">
                <Play />
              </span>
            </span>
            <b>{l.outlet.name}</b>
            <span className="nm-livetag">
              <span className="nm-live-dot" /> LIVE
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SupportPromo() {
  return (
    <section className="nm-promo nm-promo--support">
      <h2>
        <Heart aria-hidden="true" /> Support Independent Media
      </h2>
      <p>Help media organizations continue their important work.</p>
      <Link to="/news/directory?sort=followers" className="nm-btn nm-btn--white">
        Explore &amp; Support <ArrowRight />
      </Link>
      <span className="nm-promo__heart" aria-hidden="true">
        <Heart />
      </span>
    </section>
  );
}

export function CreatePromo() {
  return (
    <section className="nm-promo nm-promo--create">
      <h2>
        <MonitorPlay aria-hidden="true" /> Create Your Media
      </h2>
      <p>Launch your newspaper, TV channel, radio station or magazine with Fockis Website Studio.</p>
      <Link to="/news/create" className="nm-btn nm-btn--white">
        Create a Media Website <ArrowRight />
      </Link>
      <span className="nm-promo__laptop" aria-hidden="true">
        <span />
      </span>
    </section>
  );
}

export default function NewsRail({ topMedia, live, notify }: { topMedia: OutletCard[] | null; live: LiveEntry[] | null; notify: (tone: "ok" | "error", text: string) => void }) {
  return (
    <>
      <TopMediaBox items={topMedia} notify={notify} />
      <LiveBox items={live} />
      <SupportPromo />
      <CreatePromo />
    </>
  );
}
