import { NavLink } from "react-router-dom";

import "../../styles/FockisFeedTabs.scss";

/* ============================================================================
   TYPES
============================================================================ */

type FeedTab = {
  label: string;
  path: string;
};

/* ============================================================================
   TABS
   Matches the prototype's FeedTabs exactly: For You / Following / Friends /
   Waves / Marketplace — no icons, just labels inside pill buttons.

   IMPORTANT: these paths previously were all "/fockis/*" - a route
   prefix that doesn't exist ANYWHERE in App.tsx. Every tab click was
   falling through to the app's catch-all route and silently
   redirecting to /marketplace. Only "Marketplace" looked like it
   worked, purely by coincidence (its broken redirect target happened
   to match its intended destination anyway).
============================================================================ */

const feedTabs: FeedTab[] = [
  {
    label: "For You",
    /*
     * The feed page itself is registered at /fockis-preview in
     * App.tsx - there is no /fockis route at all.
     */
    path: "/fockis-preview",
  },
  {
    label: "Following",
    /*
     * TODO: no backend/route support for a "following-only" feed
     * exists yet (nothing in App.tsx serves this). Pointing at the
     * main feed for now rather than a nonexistent path, until a real
     * filtered route/endpoint exists.
     */
    path: "/fockis-preview",
  },
  {
    label: "Friends",
    /*
     * TODO: same situation as "Following" - there's a general
     * /friends page (Friends.tsx) but it isn't a filtered version of
     * THIS feed, so it's not a real equivalent destination yet.
     * Pointing at the main feed for now.
     */
    path: "/fockis-preview",
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

/* ============================================================================
   FEED TABS
============================================================================ */

export default function FockisFeedTab() {
  return (
    <div
      className="fk-feed-tabs"
      role="tablist"
      aria-label="Feed navigation"
    >
      {feedTabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.path}
          end={tab.path === "/fockis-preview"}
          role="tab"
          className={({ isActive }) =>
            `fk-feed-tabs__item${
              isActive ? " fk-feed-tabs__item--active" : ""
            }`
          }
          aria-label={tab.label}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}