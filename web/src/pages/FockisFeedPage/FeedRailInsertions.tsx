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
  /** "Events You Might Like", "Happening Today", "Upcoming Near You"… */
  eventsTitle?: string;
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
  eventsTitle = "Upcoming Events",
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
          {/*
            The rail drops events that end while it is on screen and
            falls back to the create prompt when none are left.
          */}
          <EventRail
            events={events}
            title={eventsTitle}
            maxEvents={10}
            loading={eventsLoading}
            empty={
              <CreateEventPrompt
                onCreate={onCreateEvent}
              />
            }
          />
        </section>
      )}

      {renderFriendRail(friendRailKind)}
    </>
  );
}