import { useEffect, useId, useRef, useState } from "react";
import {
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Globe,
  Link2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Share2,
  Star,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useSyncedEvent } from "../../hooks/eventSync";
import { useEventRsvp } from "../../hooks/useEventRsvp";
import type { FockisEvent } from "../../types/event.types";
import { downloadIcs } from "../../utils/eventCalendar";
import { absoluteEventUrl, eventPlace, eventUrl } from "../../utils/eventMedia";
import { isEventActive, relativeDay, timeLabel } from "../../utils/eventTime";
import EventCover from "../EventCover";
import EventStatusBadge from "../EventStatusBadge";
import EventDateTile from "./EventDateTile";

interface Props {
  event: FockisEvent;
  now: number;
}

/** Compact list row: thumbnail · date · details · attendance · RSVP · menu. */
export default function UpcomingEventRow({ event: source, now }: Props) {
  const navigate = useNavigate();
  const event = useSyncedEvent(source);
  const { choose, pending, error } = useEventRsvp(event);
  const active = isEventActive(event, now);
  const going = event.viewerRsvp === "going";
  const interested = event.viewerRsvp === "interested";
  const fullForViewer = event.isFull && !going;
  const busy = pending !== null;
  const href = eventUrl(event.id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const close = (domEvent: MouseEvent | KeyboardEvent) => {
      if (domEvent instanceof KeyboardEvent) {
        if (domEvent.key === "Escape") setMenuOpen(false);
        return;
      }

      if (!menuRef.current?.contains(domEvent.target as Node)) setMenuOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  async function share() {
    const url = absoluteEventUrl(event.id);

    setMenuOpen(false);

    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  }

  async function copyLink() {
    setMenuOpen(false);

    try {
      await navigator.clipboard.writeText(absoluteEventUrl(event.id));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked.
    }
  }

  return (
    <article className={`fkd-row ${active ? "" : "is-inactive"}`}>
      <Link to={href} className="fkd-row__thumb" tabIndex={-1} aria-hidden="true">
        <EventCover event={event} />
      </Link>

      <EventDateTile date={event.startDate} variant="plain" className="fkd-row__date" />

      <div className="fkd-row__info">
        <h3 className="fkd-row__title">
          <Link to={href}>{event.title}</Link>
          {!active || event.isFull || new Date(event.startDate).getTime() <= now ? (
            <EventStatusBadge event={event} now={now} relative={false} />
          ) : null}
        </h3>
        <span className="fkd-meta">
          {event.isOnline ? <Globe size={14} aria-hidden="true" /> : <MapPin size={14} aria-hidden="true" />}
          <span className="fke-truncate">{eventPlace(event)}</span>
        </span>
        <span className="fkd-meta">
          <Clock size={14} aria-hidden="true" />
          <span className="fke-truncate">
            {relativeDay(event.startDate, now)} • {timeLabel(event.startDate)}
          </span>
        </span>
      </div>

      <span className="fkd-row__going">
        <Users size={17} aria-hidden="true" />
        <strong>{event.attendeeCount.toLocaleString()}</strong> going
      </span>

      <div className="fkd-row__actions">
        {active && !event.isOwner && (
          <>
            <button
              type="button"
              className={`fkd-btn fkd-btn--interested ${interested ? "is-active" : ""}`}
              aria-pressed={interested}
              disabled={busy}
              onClick={() => void choose("interested")}
            >
              <Star size={15} strokeWidth={2.2} fill={interested ? "currentColor" : "none"} aria-hidden="true" />
              Interested
            </button>
            <button
              type="button"
              className={`fkd-btn fkd-btn--going ${going ? "is-active" : ""}`}
              aria-pressed={going}
              disabled={busy || fullForViewer}
              title={fullForViewer ? "This event is full" : undefined}
              onClick={() => void choose("going")}
            >
              {fullForViewer ? "Full" : "Going"}
              {going && <Check size={15} strokeWidth={2.6} aria-hidden="true" />}
            </button>
          </>
        )}

        {active && event.isOwner && <span className="fkd-pill fkd-pill--navy">Hosting</span>}

        <div className="fkd-menu" ref={menuRef}>
          <button
            type="button"
            className="fkd-menu__toggle"
            aria-label={`More actions for ${event.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div className="fkd-menu__list" id={menuId} role="menu">
              <button type="button" role="menuitem" onClick={() => navigate(href)}>
                <ExternalLink size={15} aria-hidden="true" /> View details
              </button>
              <button type="button" role="menuitem" onClick={() => void share()}>
                <Share2 size={15} aria-hidden="true" /> Share
              </button>
              <button type="button" role="menuitem" onClick={() => void copyLink()}>
                <Link2 size={15} aria-hidden="true" /> Copy link
              </button>
              {active && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    downloadIcs(event, absoluteEventUrl(event.id));
                  }}
                >
                  <CalendarPlus size={15} aria-hidden="true" /> Add to calendar
                </button>
              )}
              {event.isOwner && !event.isCancelled && (
                <button type="button" role="menuitem" onClick={() => navigate(`${href}/edit`)}>
                  <Pencil size={15} aria-hidden="true" /> Edit event
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {(error || copied) && (
        <small className={copied ? "fkd-row__note" : "fke-rsvp__error"} role={error ? "alert" : "status"}>
          {error || "Link copied"}
        </small>
      )}
    </article>
  );
}
