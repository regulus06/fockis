import { Link, NavLink, useLocation } from "react-router-dom";

import {
  parseFeedMode,
  type FeedMode,
} from "../../api/feedApi";

import "../../styles/FockisFeedTabs.scss";

/* ============================================================================
   TYPES
============================================================================ */

type FeedTab = {
  label: string;
  path: string;
  /** Set for tabs that switch the feed on this page via ?feed=. */
  feedMode?: FeedMode;
};

/* ============================================================================
   TABS
   Same pill tabs as before. For You / Following / Latest / Friends stay on
   the feed page and switch its mode through the ?feed= query parameter;
   For You is the default when no parameter is present.

   The feed page is registered at /fockis-preview in App.tsx.
============================================================================ */

const FEED_PATH = "/fockis-preview";

const feedTabs: FeedTab[] = [
  {
    label: "For You",
    path: FEED_PATH,
    feedMode: "for-you",
  },
  {
    label: "Following",
    path: `${FEED_PATH}?feed=following`,
    feedMode: "following",
  },
  {
    label: "Latest",
    path: `${FEED_PATH}?feed=latest`,
    feedMode: "latest",
  },
  {
    label: "Friends",
    path: `${FEED_PATH}?feed=friends`,
    feedMode: "friends",
  },
  {
    label: "Waves",
    /*
     * TODO: WaveRoutes.tsx hasn't been reviewed yet, so this base
     * path is inferred (not confirmed) from WaveCard.tsx, which
     * navigates to `/waves/${id}` for a SPECIFIC video - implying the
     * list/landing page is very likely at "/waves". Confirm against
     * WaveRoutes.tsx before relying on this.
     */
    path: "/waves",
  },
  {
    label: "Marketplace",
    /*
     * Confirmed real - registered in MarketplaceRoutes.tsx.
     */
    path: "/marketplace",
  },
];

function tabClassName(active: boolean): string {
  return `fk-feed-tabs__item${
    active ? " fk-feed-tabs__item--active" : ""
  }`;
}

/* ============================================================================
   FEED TABS
============================================================================ */

export default function FockisFeedTab() {
  const location = useLocation();

  const onFeedPage = location.pathname === FEED_PATH;

  const currentMode = parseFeedMode(
    new URLSearchParams(location.search).get("feed"),
  );

  return (
    <div
      className="fk-feed-tabs"
      role="tablist"
      aria-label="Feed navigation"
    >
      {feedTabs.map((tab) => {
        if (tab.feedMode) {
          /*
           * NavLink matches on pathname only, so all four feed tabs would
           * look active at once. Compare the ?feed= mode instead.
           */
          const active =
            onFeedPage && currentMode === tab.feedMode;

          return (
            <Link
              key={tab.label}
              to={tab.path}
              replace
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={tabClassName(active)}
              aria-label={tab.label}
            >
              {tab.label}
            </Link>
          );
        }

        return (
          <NavLink
            key={tab.label}
            to={tab.path}
            role="tab"
            className={({ isActive }) => tabClassName(isActive)}
            aria-label={tab.label}
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
