import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CalendarClock,
  ExternalLink,
  Globe,
  Lock,
  MapPin,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import EventAttendees from "../components/EventAttendees";
import EventCover from "../components/EventCover";
import EventDateBadge from "../components/EventDateBadge";
import EventDiscoverySection from "../components/EventDiscoverySection";
import EventEmptyState from "../components/EventEmptyState";
import EventInviteDialog from "../components/EventInviteDialog";
import EventOrganizer from "../components/EventOrganizer";
import EventRsvpActions from "../components/EventRsvpActions";
import EventShareButton from "../components/EventShareButton";
import EventSkeleton from "../components/EventSkeleton";
import EventSocialProof from "../components/EventSocialProof";
import EventStatusBadge from "../components/EventStatusBadge";
import EventsShell from "../components/EventsShell";
import { categoryMeta } from "../constants/eventCategories";
import { publishEventPatch, useSyncedEvent } from "../hooks/eventSync";
import { useEventClock } from "../hooks/useEventClock";
import { eventsApi, EventsApiError, isAbortError } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";
import {
  countdown,
  differsFromViewerZone,
  fullRange,
  getEventStatus,
  isEventActive,
} from "../utils/eventTime";

const VISIBILITY_LABEL: Record<string, { label: string; icon: typeof Globe }> = {
  public: { label: "Public event", icon: Globe },
  friends: { label: "Friends of the organizer", icon: Users },
  private: { label: "Private · invite only", icon: Lock },
  organization: { label: "Organization · invite only", icon: Lock },
};

function mapLink(event: FockisEvent): string {
  if (typeof event.latitude === "number" && typeof event.longitude === "number") {
    return `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`;
  }

  const query = [event.locationName, event.address].filter(Boolean).join(", ");

  return query ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}` : "";
}

function mapEmbed(event: FockisEvent): string {
  if (typeof event.latitude !== "number" || typeof event.longitude !== "number") return "";

  const d = 0.008;
  const bbox = [event.longitude - d, event.latitude - d, event.longitude + d, event.latitude + d].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${event.latitude},${event.longitude}`;
}

function Details({ initial, onChanged }: { initial: FockisEvent; onChanged: (event: FockisEvent) => void }) {
  const navigate = useNavigate();
  const event = useSyncedEvent(initial);
  const now = useEventClock([event]);
  const status = getEventStatus(event, now);
  const active = isEventActive(event, now);
  const category = categoryMeta(event.category);
  const visibility = VISIBILITY_LABEL[event.visibility] ?? VISIBILITY_LABEL.public;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviting, setInviting] = useState(false);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const [related, setRelated] = useState<FockisEvent[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    setRelatedLoading(true);
    eventsApi
      .related(event.id, controller.signal)
      .then(setRelated)
      .catch(() => setRelated([]))
      .finally(() => {
        if (!controller.signal.aborted) setRelatedLoading(false);
      });

    return () => controller.abort();
  }, [event.id]);

  // The meeting link is only sent to people on the event: fetch it as soon
  // as the viewer RSVPs.
  useEffect(() => {
    if (!event.isOnline || event.onlineUrl || !event.viewerRsvp) return;

    const controller = new AbortController();

    eventsApi
      .getById(event.id, controller.signal)
      .then((fresh) => {
        if (fresh.onlineUrl) publishEventPatch({ id: fresh.id, onlineUrl: fresh.onlineUrl });
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [event.id, event.isOnline, event.onlineUrl, event.viewerRsvp]);

  async function cancelEvent() {
    setBusy(true);
    setError("");

    try {
      const updated = await eventsApi.cancel(event.id, reason);

      publishEventPatch({ id: updated.id, isCancelled: true, status: "cancelled", cancellationReason: updated.cancellationReason });
      onChanged(updated);
      setConfirming(null);
      setNotice("Event cancelled. It no longer appears in discovery or the feed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel the event.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent() {
    setBusy(true);
    setError("");

    try {
      await eventsApi.delete(event.id);
      navigate("/events/my-events", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete the event.");
      setBusy(false);
    }
  }

  const place = [event.locationName, event.address].filter(Boolean).join(" · ");
  const map = mapLink(event);
  const embed = mapEmbed(event);

  return (
    <article className={`fke-details ${active ? "" : "is-inactive"}`}>
      <Link to="/events" className="fke-back">
        <ArrowLeft size={16} aria-hidden="true" /> All events
      </Link>

      <div className="fke-details__hero">
        <EventCover event={event} controls className="fke-details__cover" />
        <span className="fke-details__scrim" aria-hidden="true" />
        <div className="fke-details__hero-content">
          <EventDateBadge date={event.startDate} size="lg" />
          <div>
            <div className="fke-details__badges">
              <span className="fke-pill fke-pill--glass">
                <category.icon size={14} aria-hidden="true" /> {category.label}
              </span>
              <EventStatusBadge event={event} now={now} />
            </div>
            <h1>{event.title}</h1>
            {active && <p className="fke-details__countdown">{countdown(event, now)}</p>}
          </div>
        </div>
      </div>

      {status === "cancelled" && (
        <div className="fke-banner fke-banner--danger" role="status">
          <Ban size={18} aria-hidden="true" />
          <div>
            <strong>This event was cancelled.</strong>
            {event.cancellationReason && <p>{event.cancellationReason}</p>}
          </div>
        </div>
      )}
      {status === "ended" && (
        <div className="fke-banner" role="status">
          <CalendarClock size={18} aria-hidden="true" />
          <strong>This event has ended.</strong>
        </div>
      )}
      {error && <div className="fke-banner fke-banner--danger" role="alert">{error}</div>}
      {notice && <div className="fke-banner fke-banner--success" role="status">{notice}</div>}

      <div className="fke-details__layout">
        <div className="fke-details__main">
          <section className="fke-panel fke-details__actions-panel">
            <div className="fke-details__actions">
              <EventRsvpActions event={event} now={now} />
              <EventShareButton event={event} />
              {event.isOwner && active && (
                <button type="button" className="fke-btn fke-btn--ghost" onClick={() => setInviting(true)}>
                  <UserPlus size={16} aria-hidden="true" /> Invite
                </button>
              )}
            </div>
            <EventSocialProof event={event} className="fke-details__proof" />
          </section>

          <section className="fke-panel">
            <ul className="fke-facts">
              <li>
                <CalendarClock size={20} aria-hidden="true" />
                <div>
                  <strong>{fullRange(event)}</strong>
                  {differsFromViewerZone(event.timeZone) && fullRange(event, event.timeZone) !== fullRange(event) && (
                    <small>Organizer's time: {fullRange(event, event.timeZone)}</small>
                  )}
                </div>
              </li>
              <li>
                {event.isOnline ? <Globe size={20} aria-hidden="true" /> : <MapPin size={20} aria-hidden="true" />}
                <div>
                  <strong>{event.isOnline ? "Online event" : place || "Location to be announced"}</strong>
                  {event.isOnline ? (
                    event.onlineUrl ? (
                      active ? (
                        <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer" className="fke-link">
                          Join online <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      ) : null
                    ) : (
                      active && <small>The link appears once you're going or interested.</small>
                    )
                  ) : (
                    map && (
                      <a href={map} target="_blank" rel="noopener noreferrer" className="fke-link">
                        Open map <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )
                  )}
                </div>
              </li>
              <li>
                <visibility.icon size={20} aria-hidden="true" />
                <div>
                  <strong>{visibility.label}</strong>
                  {event.capacity !== null && (
                    <small>
                      {event.spotsLeft === 0 ? "Full" : `${event.spotsLeft} of ${event.capacity} spots left`}
                    </small>
                  )}
                </div>
              </li>
            </ul>

            {embed && (
              <iframe
                className="fke-map"
                title={`Map of ${event.locationName || "the venue"}`}
                src={embed}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )}
          </section>

          <section className="fke-panel">
            <h2 className="fke-panel__title">About this event</h2>
            <p className="fke-description">{event.description || "The organizer hasn't added a description yet."}</p>
          </section>

          <EventDiscoverySection
            id="related"
            title="You might also like"
            events={related}
            loading={relatedLoading}
          />
        </div>

        <aside className="fke-details__side">
          <section className="fke-panel">
            <EventOrganizer organizer={event.organizer} creatorId={event.creatorId} isOwner={event.isOwner} />
          </section>

          {event.isOwner && (
            <section className="fke-panel fke-owner">
              <h2 className="fke-panel__title">Manage</h2>
              <div className="fke-owner__actions">
                {!event.isCancelled && (
                  <Link to={`/events/${event.id}/edit`} className="fke-btn fke-btn--outline">
                    <Pencil size={16} aria-hidden="true" /> Edit event
                  </Link>
                )}
                {active && (
                  <button
                    type="button"
                    className="fke-btn fke-btn--danger-ghost"
                    disabled={busy}
                    aria-expanded={confirming === "cancel"}
                    onClick={() => setConfirming(confirming === "cancel" ? null : "cancel")}
                  >
                    <Ban size={16} aria-hidden="true" /> Cancel event
                  </button>
                )}
                <button
                  type="button"
                  className="fke-btn fke-btn--danger-ghost"
                  disabled={busy}
                  aria-expanded={confirming === "delete"}
                  onClick={() => setConfirming(confirming === "delete" ? null : "delete")}
                >
                  <Trash2 size={16} aria-hidden="true" /> Delete
                </button>
              </div>

              {confirming === "cancel" && (
                <div className="fke-confirm" role="group" aria-label="Confirm cancellation">
                  <p>
                    Cancelling removes the event from discovery and the feed. People who RSVP'd will see it as
                    cancelled.
                  </p>
                  <label className="fke-field">
                    <span>Reason (optional, shown on the event)</span>
                    <textarea rows={2} maxLength={1000} value={reason} onChange={(changeEvent) => setReason(changeEvent.target.value)} />
                  </label>
                  <div className="fke-confirm__actions">
                    <button type="button" className="fke-btn fke-btn--ghost" onClick={() => setConfirming(null)} disabled={busy}>
                      Keep event
                    </button>
                    <button type="button" className="fke-btn fke-btn--danger" onClick={() => void cancelEvent()} disabled={busy}>
                      {busy ? "Cancelling…" : "Cancel event"}
                    </button>
                  </div>
                </div>
              )}

              {confirming === "delete" && (
                <div className="fke-confirm" role="group" aria-label="Confirm deletion">
                  <p>Permanently delete this event and its RSVPs? This can't be undone. Cancelling keeps the history.</p>
                  <div className="fke-confirm__actions">
                    <button type="button" className="fke-btn fke-btn--ghost" onClick={() => setConfirming(null)} disabled={busy}>
                      Keep event
                    </button>
                    <button type="button" className="fke-btn fke-btn--danger" onClick={() => void deleteEvent()} disabled={busy}>
                      {busy ? "Deleting…" : "Delete permanently"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <EventAttendees event={event} />
        </aside>
      </div>

      {inviting && (
        <EventInviteDialog
          eventId={event.id}
          onClose={() => setInviting(false)}
          onInvited={(count) => setNotice(`Invited ${count} ${count === 1 ? "person" : "people"}.`)}
        />
      )}
    </article>
  );
}

export default function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<FockisEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!eventId) return;

      setLoading(true);
      setError(null);

      eventsApi
        .getById(eventId, signal)
        .then(setEvent)
        .catch((caught) => {
          if (isAbortError(caught)) return;

          setError({
            message: caught instanceof Error ? caught.message : "Unable to load the event.",
            status: caught instanceof EventsApiError ? caught.status : undefined,
          });
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [eventId],
  );

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal);

    return () => controller.abort();
  }, [load]);

  return (
    <EventsShell hideTabs>
      {loading && !event && <EventSkeleton variant="details" />}

      {error && !event && (
        <EventEmptyState
          tone={error.status === 404 ? "default" : "error"}
          title={error.status === 404 ? "Event not found" : "This event couldn't load"}
          body={error.status === 404 ? "It may have been deleted, or it's private." : error.message}
          action={
            <Link to="/events" className="fke-btn fke-btn--primary">
              Browse events
            </Link>
          }
        />
      )}

      {event && <Details key={event.id} initial={event} onChanged={setEvent} />}
    </EventsShell>
  );
}
