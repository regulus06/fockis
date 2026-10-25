import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import EventCreateForm from "../components/EventCreateForm";
import EventEmptyState from "../components/EventEmptyState";
import EventSkeleton from "../components/EventSkeleton";
import EventsShell from "../components/EventsShell";
import { publishEventPatch } from "../hooks/eventSync";
import { eventsApi, isAbortError } from "../services/eventsApi";
import type { FockisEvent } from "../types/event.types";

export default function EditEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<FockisEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) {
      setError("Missing event ID.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    eventsApi
      .getById(eventId, controller.signal)
      .then(setEvent)
      .catch((caught) => {
        if (!isAbortError(caught)) setError(caught instanceof Error ? caught.message : "Unable to load the event.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [eventId]);

  const blocked = event && (!event.isOwner || event.isCancelled);

  return (
    <EventsShell hideTabs>
      <div className="fke-editor">
        {loading && <EventSkeleton variant="details" />}

        {!loading && (error || blocked) && (
          <EventEmptyState
            tone={error ? "error" : "default"}
            title={error ? "This event couldn't load" : event?.isCancelled ? "Cancelled events can't be edited" : "Only the organizer can edit this event"}
            body={error || undefined}
            action={
              <Link to={event ? `/events/${event.id}` : "/events"} className="fke-btn fke-btn--primary">
                Back
              </Link>
            }
          />
        )}

        {event && !blocked && (
          <EventCreateForm
            mode="edit"
            submitLabel="Save changes"
            initialValues={{
              title: event.title,
              description: event.description,
              category: event.category,
              visibility: event.visibility,
              startDate: event.startDate,
              endDate: event.endDate,
              locationName: event.locationName,
              address: event.address,
              latitude: event.latitude,
              longitude: event.longitude,
              isOnline: event.isOnline,
              onlineUrl: event.onlineUrl,
              capacity: event.capacity,
              coverImageUrl: event.coverImageUrl,
              coverVideoUrl: event.coverVideoUrl,
              coverMediaType: event.coverMediaType,
            }}
            onCancel={() => navigate(`/events/${event.id}`)}
            onSubmit={async (values) => {
              const updated = await eventsApi.update(event.id, values);

              // Other open copies (feed card, rails) pick up the new times at once.
              publishEventPatch({ ...updated });
              navigate(`/events/${updated.id}`, { replace: true });
            }}
          />
        )}
      </div>
    </EventsShell>
  );
}
