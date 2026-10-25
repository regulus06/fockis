import type { ReactNode } from "react";

import { Users } from "lucide-react";

import "./FockisRail.scss";

/*
 * ============================================================================
 * FOCKIS RAIL
 *
 * Shared frame for the friend rails shown between feed posts
 * (MyFriendsRail, PeopleYouMayKnowRail): a header with a title and an
 * optional "See all" link, and the rail's cards below.
 *
 * It renders exactly what it is given. Each rail decides on its own to
 * render nothing when it has nothing to show, so no empty box is left in
 * the feed.
 *
 * Same frame markup as FriendRequestsRail, so all friend rails match.
 * ============================================================================
 */

interface FockisRailProps {
  title: string;
  /** Link for "See all". Omit to hide it. */
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Header icon. Defaults to the people icon. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function FockisRail({
  title,
  seeAllHref,
  seeAllLabel = "See all",
  icon,
  className,
  children,
}: FockisRailProps) {
  return (
    <section
      className={[
        "fk-right-rail__section",
        "fk-friend-rail",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={title}
    >
      <div className="fk-right-rail__section-header">
        <div className="fk-right-rail__section-title">
          {icon ?? <Users size={18} aria-hidden="true" />}

          <h2>{title}</h2>
        </div>

        {seeAllHref && (
          <a
            href={seeAllHref}
            className="fk-right-rail__view-all"
          >
            {seeAllLabel}
          </a>
        )}
      </div>

      <div className="fk-friend-rail__list">
        {children}
      </div>
    </section>
  );
}
