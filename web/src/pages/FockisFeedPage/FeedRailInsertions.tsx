import type { FockisEvent } from "../../features/events/types/event.types";
import EventRail from "../../features/events/components/EventRail";

import BusinessFeedRail from "../../features/businesses/components/BusinessFeedRail";
import SpotlightDealsRail from "../../features/businesses/components/SpotlightDealsRail";

import FriendRequestsRail from "../../components/fockis/rails/FriendRequestsRail";
import PeopleYouMayKnowRail from "../../components/fockis/rails/PeopleYouMayKnowRail";
import MyFriendsRail from "../../components/fockis/rails/MyFriendsRail";

import CreateEventPrompt from "./CreateEventPrompt";

import {
  BUSINESS_RAIL_AFTER_POST,
  DEALS_RAIL_AFTER_POST,
  EVENTS_RAIL_AFTER_POST,
  getRailAfterPost,
  type RailKind,
} from "./railInsertionConfig";

function renderFriendRail(
  kind: RailKind | null,
) {
  if (kind === "requests") {
    return <FriendRequestsRail />;
  }

  if (kind === "suggestions") {
    return <PeopleYouMayKnowRail />;
  }

  if (kind === "friends") {
    return <MyFriendsRail />;
  }

  return null;
}

interface FeedRailInsertionsProps {
  /** Zero-based index of the post this insertion follows. */
  index: number;
  events: FockisEvent[];
  eventsLoading: boolean;
  onCreateEvent: () => void;
}

/**
 * Renders whichever rails (business, deals, events, friend
 * suggestions) should appear immediately after the post at
 * `index` in the feed. Mirrors the original inline
 * renderFeedBusinessRail / renderFeedDealsRail /
 * renderFeedEventsRail / renderRail logic from FockisFeedPage.
 */
export default function FeedRailInsertions({
  index,
  events,
  eventsLoading,
  onCreateEvent,
}: FeedRailInsertionsProps) {
  const position = index + 1;
  const friendRailKind = getRailAfterPost(index);

  return (
    <>
      {position === BUSINESS_RAIL_AFTER_POST && (
        <section
          className="fk-feed-section fk-feed-section--businesses"
          aria-label="Businesses"
        >
          <BusinessFeedRail />
        </section>
      )}

      {position === DEALS_RAIL_AFTER_POST && (
        <section
          className="fk-feed-section fk-feed-section--deals"
          aria-label="Spotlight deals"
        >
          <SpotlightDealsRail />
        </section>
      )}

      {position === EVENTS_RAIL_AFTER_POST && (
        <section
          className="fk-feed-section fk-feed-section--events"
          aria-label="Events"
        >
          {!eventsLoading &&
            events.length > 0 && (
              <EventRail
                events={events}
                title="Upcoming Events"
                maxEvents={10}
              />
            )}

          {!eventsLoading &&
            events.length === 0 && (
              <CreateEventPrompt
                onCreate={onCreateEvent}
              />
            )}

          {eventsLoading && (
            <div
              className="fk-feed-events-loading"
              aria-live="polite"
            >
              Loading events...
            </div>
          )}
        </section>
      )}

      {renderFriendRail(friendRailKind)}
    </>
  );
}