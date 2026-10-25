import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Heart,
  ImageOff,
  Luggage,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";

import TravelListingCard from "../components/TravelListingCard";
import { bookingsApi, getBookingId } from "../services/bookingsApi";
import type { TravelBooking } from "../services/bookingsApi";
import { tripsApi } from "../services/tripsApi";
import type { TravelTrip } from "../services/tripsApi";
import { travelApi } from "../services/travelApi";
import { wishlistApi } from "../services/wishlistApi";
import type { WishlistItem } from "../services/wishlistApi";
import {
  formatTravelPrice,
  getListingImage,
  getListingLocation,
  getListingName,
} from "../services/travelListingView";
import type { TravelListingView } from "../services/travelListingView";
import "../styles/TravelMyTripsPage.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — MY TRIPS
 * ============================================================================
 *
 * Tabs (reference mobile screen: Upcoming · Past · Saved, plus the states the
 * backend supports):
 *
 *   Upcoming / Past / Cancelled  GET /travel/bookings (your reservations)
 *   Saved                        GET /travel/wishlist
 *   Trip plans                   GET /travel/trips   (existing planner data)
 *
 * "Manage" shows the booking's real code, status and totals, and can cancel
 * through DELETE /travel/bookings/:id. A booking is only shown as cancelled
 * after the API confirms it.
 * ============================================================================
 */

type TabId = "upcoming" | "past" | "cancelled" | "saved" | "plans";
type LoadState = "loading" | "ready" | "error";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
  { id: "saved", label: "Saved" },
  { id: "plans", label: "Trip plans" },
];

function errorMessage(reason: unknown, fallback: string): string {
  if (reason && typeof reason === "object" && "message" in reason) {
    const message = String((reason as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  return fallback;
}

function bookingListing(booking: TravelBooking): TravelListingView | null {
  if (booking.listingId && typeof booking.listingId === "object") {
    return booking.listingId as unknown as TravelListingView;
  }
  const snapshot = booking.snapshot as Record<string, unknown> | undefined;
  if (snapshot && typeof snapshot === "object" && (snapshot.name || snapshot.title)) {
    return snapshot as unknown as TravelListingView;
  }
  return null;
}

function bookingListingId(booking: TravelBooking): string {
  if (typeof booking.listingId === "string") return booking.listingId;
  const listing = bookingListing(booking);
  return listing ? String(listing._id || listing.id || "") : "";
}

function bookingStart(booking: TravelBooking): Date | null {
  const value = booking.startAt || booking.startDate;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function bookingEnd(booking: TravelBooking): Date | null {
  const value = booking.endAt || booking.endDate;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function bookingTab(booking: TravelBooking, now: number): TabId {
  const status = String(booking.status || "").toLowerCase();
  if (status === "cancelled" || status === "canceled" || status === "refunded") return "cancelled";
  if (status === "completed") return "past";
  const end = bookingEnd(booking) ?? bookingStart(booking);
  if (end && end.getTime() < now) return "past";
  return "upcoming";
}

function formatRange(start: Date | null, end: Date | null): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (!start && !end) return "Dates not set";
  if (start && end) {
    const startOptions =
      start.getFullYear() === end.getFullYear() ? options : { ...options, year: "numeric" as const };
    return `${start.toLocaleDateString(undefined, startOptions)} – ${end.toLocaleDateString(undefined, {
      ...options,
      year: "numeric",
    })}`;
  }
  return (start || end)!.toLocaleDateString(undefined, { ...options, year: "numeric" });
}

function statusLabel(status?: string): string {
  const value = String(status || "pending").toLowerCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function TripCard({
  booking,
  onCancelled,
}: {
  booking: TravelBooking;
  onCancelled: (updated: TravelBooking) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  const id = getBookingId(booking) || "";
  const listing = bookingListing(booking);
  const listingId = bookingListingId(booking);
  const name = listing ? getListingName(listing) : "Travel booking";
  const location = listing ? getListingLocation(listing) : "";
  const image = listing ? getListingImage(listing) : "";
  const guests = Number(booking.guests) || 0;
  const status = String(booking.status || "pending").toLowerCase();
  const canCancel = (status === "pending" || status === "confirmed") && bookingTab(booking, Date.now()) === "upcoming";
  const total = Number(booking.total);
  const panelId = `ft-trip-${id}`;

  async function cancel() {
    if (!id) return;
    setCancelling(true);
    setCancelError("");
    try {
      const updated = await bookingsApi.cancel(id);
      onCancelled({ ...booking, ...(updated && typeof updated === "object" ? updated : {}), status: updated?.status || "cancelled" });
      setConfirming(false);
    } catch (reason) {
      setCancelError(errorMessage(reason, "This booking couldn’t be cancelled. Please try again."));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <article className="ft-trip">
      <div className="ft-trip__main">
        <div className="ft-trip__media">
          {image && !imageFailed ? (
            <img src={image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <ImageOff size={22} aria-hidden="true" />
          )}
        </div>

        <div className="ft-trip__info">
          <div className="ft-trip__title-row">
            <h3>{name}</h3>
            <span className={`ft-trip__status ft-trip__status--${status}`}>{statusLabel(status)}</span>
          </div>
          {location && (
            <p className="ft-trip__line">
              <MapPin size={14} aria-hidden="true" /> {location}
            </p>
          )}
          <p className="ft-trip__line">
            <CalendarDays size={14} aria-hidden="true" />
            {formatRange(bookingStart(booking), bookingEnd(booking))}
          </p>
          {guests > 0 && (
            <p className="ft-trip__line">
              <Users size={14} aria-hidden="true" />
              {guests} {guests === 1 ? "traveler" : "travelers"}
            </p>
          )}
        </div>
      </div>

      <div className="ft-trip__actions">
        {listingId ? (
          <Link to={`/travel/stays/${encodeURIComponent(listingId)}`} className="ft-trip__primary">
            View Details
          </Link>
        ) : (
          <span className="ft-trip__primary is-disabled" aria-disabled="true">
            Listing unavailable
          </span>
        )}
        <button
          type="button"
          className="ft-trip__secondary"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          Manage <ChevronDown size={16} aria-hidden="true" className={open ? "is-open" : ""} />
        </button>
      </div>

      {open && (
        <div className="ft-trip__panel" id={panelId}>
          <dl>
            {booking.bookingCode && (
              <div>
                <dt>Booking code</dt>
                <dd>{booking.bookingCode}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>{statusLabel(booking.status)}</dd>
            </div>
            {booking.paymentStatus && (
              <div>
                <dt>Payment</dt>
                <dd>{statusLabel(booking.paymentStatus)}</dd>
              </div>
            )}
            {Number(booking.quantity) > 1 && (
              <div>
                <dt>Rooms / units</dt>
                <dd>{booking.quantity}</dd>
              </div>
            )}
            {Number.isFinite(total) && total > 0 && (
              <div>
                <dt>Total</dt>
                <dd>{formatTravelPrice(total, booking.currency)}</dd>
              </div>
            )}
          </dl>

          {canCancel && !confirming && (
            <button type="button" className="ft-trip__danger" onClick={() => setConfirming(true)}>
              Cancel booking
            </button>
          )}

          {canCancel && confirming && (
            <div className="ft-trip__confirm" role="alertdialog" aria-label="Confirm cancellation">
              <p>Cancel this booking? The host will be notified.</p>
              <div>
                <button type="button" className="ft-trip__danger" disabled={cancelling} onClick={() => void cancel()}>
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  type="button"
                  className="ft-trip__secondary"
                  disabled={cancelling}
                  onClick={() => setConfirming(false)}
                >
                  Keep booking
                </button>
              </div>
            </div>
          )}

          {cancelError && (
            <p className="ft-trip__error" role="alert">
              {cancelError}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function TravelMyTripsPage() {
  const signedIn = travelApi.hasAuthToken();
  const [tab, setTab] = useState<TabId>("upcoming");

  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [bookingsState, setBookingsState] = useState<LoadState>("loading");
  const [bookingsError, setBookingsError] = useState("");

  const [saved, setSaved] = useState<WishlistItem[]>([]);
  const [savedState, setSavedState] = useState<LoadState>("loading");

  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [tripsState, setTripsState] = useState<LoadState>("loading");

  const loadBookings = useCallback(async () => {
    setBookingsState("loading");
    setBookingsError("");
    try {
      const result = await bookingsApi.listMine();
      setBookings(Array.isArray(result) ? result : []);
      setBookingsState("ready");
    } catch (reason) {
      setBookings([]);
      setBookingsError(errorMessage(reason, "Unable to load your bookings."));
      setBookingsState("error");
    }
  }, []);

  const loadSaved = useCallback(async () => {
    setSavedState("loading");
    try {
      setSaved(await wishlistApi.list());
      setSavedState("ready");
    } catch {
      setSaved([]);
      setSavedState("error");
    }
  }, []);

  const loadTrips = useCallback(async () => {
    setTripsState("loading");
    try {
      const response = (await tripsApi.list()) as unknown;
      const record = response as Record<string, unknown> | null;
      setTrips(
        Array.isArray(response)
          ? (response as TravelTrip[])
          : Array.isArray(record?.data)
            ? (record!.data as TravelTrip[])
            : Array.isArray(record?.trips)
              ? (record!.trips as TravelTrip[])
              : [],
      );
      setTripsState("ready");
    } catch {
      setTrips([]);
      setTripsState("error");
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void loadBookings();
    void loadSaved();
    void loadTrips();
  }, [signedIn, loadBookings, loadSaved, loadTrips]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const groups: Record<"upcoming" | "past" | "cancelled", TravelBooking[]> = {
      upcoming: [],
      past: [],
      cancelled: [],
    };
    bookings.forEach((booking) => {
      const key = bookingTab(booking, now) as "upcoming" | "past" | "cancelled";
      groups[key].push(booking);
    });
    groups.upcoming.sort((a, b) => (bookingStart(a)?.getTime() ?? 0) - (bookingStart(b)?.getTime() ?? 0));
    groups.past.sort((a, b) => (bookingStart(b)?.getTime() ?? 0) - (bookingStart(a)?.getTime() ?? 0));
    return groups;
  }, [bookings]);

  const savedListings = useMemo(
    () =>
      saved
        .map((item) => (item.listing && typeof item.listing === "object" ? (item.listing as TravelListingView) : null))
        .filter((item): item is TravelListingView => Boolean(item)),
    [saved],
  );

  const counts: Record<TabId, number | null> = {
    upcoming: bookingsState === "ready" ? grouped.upcoming.length : null,
    past: bookingsState === "ready" ? grouped.past.length : null,
    cancelled: bookingsState === "ready" ? grouped.cancelled.length : null,
    saved: savedState === "ready" ? saved.length : null,
    plans: tripsState === "ready" ? trips.length : null,
  };

  function handleCancelled(updated: TravelBooking) {
    const updatedId = getBookingId(updated);
    setBookings((current) =>
      current.map((booking) => (getBookingId(booking) === updatedId ? { ...booking, ...updated } : booking)),
    );
  }

  if (!signedIn) {
    return (
      <div className="ft-trips">
        <div className="ft-trips__wrap">
          <h1 className="ft-trips__title">My Trips</h1>
          <div className="ft-trips__empty">
            <Luggage size={30} aria-hidden="true" />
            <h2>Sign in to see your trips</h2>
            <p>Your bookings, saved places and trip plans are kept in your Fockis account.</p>
            <Link to="/travel/sign-in" className="ft-trips__primary">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const bookingTabs = tab === "upcoming" || tab === "past" || tab === "cancelled";
  const list = bookingTabs ? grouped[tab] : [];

  return (
    <div className="ft-trips">
      <div className="ft-trips__wrap">
        <h1 className="ft-trips__title">My Trips</h1>

        <div className="ft-trips__tabs" role="tablist" aria-label="Trips">
          {TABS.map((item) => (
            <button
              key={item.id}
              id={`ft-trips-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-controls="ft-trips-panel"
              className={`ft-trips__tab${tab === item.id ? " is-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              {counts[item.id] !== null && counts[item.id]! > 0 && (
                <span className="ft-trips__count">{counts[item.id]}</span>
              )}
            </button>
          ))}
        </div>

        <div id="ft-trips-panel" role="tabpanel" aria-labelledby={`ft-trips-tab-${tab}`} className="ft-trips__panel">
          {bookingTabs &&
            (bookingsState === "loading" ? (
              <div className="ft-trips__list" aria-busy="true">
                {[0, 1].map((index) => (
                  <div key={index} className="ft-skel" style={{ height: 150, borderRadius: 14 }} />
                ))}
              </div>
            ) : bookingsState === "error" ? (
              <div className="ft-trips__empty" role="alert">
                <AlertCircle size={28} aria-hidden="true" />
                <h2>We couldn’t load your bookings</h2>
                <p>{bookingsError}</p>
                <button type="button" className="ft-trips__outline" onClick={() => void loadBookings()}>
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              </div>
            ) : list.length === 0 ? (
              <div className="ft-trips__empty">
                <Luggage size={30} aria-hidden="true" />
                <h2>
                  {tab === "upcoming" ? "No upcoming trips" : tab === "past" ? "No past trips yet" : "No cancelled bookings"}
                </h2>
                <p>
                  {tab === "upcoming"
                    ? "When you book a stay, experience or table, it will appear here."
                    : "Bookings move here automatically."}
                </p>
                {tab === "upcoming" && (
                  <Link to="/travel" className="ft-trips__primary">
                    Start exploring
                  </Link>
                )}
              </div>
            ) : (
              <div className="ft-trips__list">
                {list.map((booking, index) => (
                  <TripCard
                    key={getBookingId(booking) || `${tab}-${index}`}
                    booking={booking}
                    onCancelled={handleCancelled}
                  />
                ))}
              </div>
            ))}

          {tab === "saved" &&
            (savedState === "loading" ? (
              <div className="ft-trips__saved" aria-busy="true">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="ft-skel" style={{ height: 240, borderRadius: 12 }} />
                ))}
              </div>
            ) : savedState === "error" ? (
              <div className="ft-trips__empty" role="alert">
                <AlertCircle size={28} aria-hidden="true" />
                <h2>We couldn’t load your saved places</h2>
                <button type="button" className="ft-trips__outline" onClick={() => void loadSaved()}>
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              </div>
            ) : savedListings.length === 0 ? (
              <div className="ft-trips__empty">
                <Heart size={30} aria-hidden="true" />
                <h2>No saved places yet</h2>
                <p>Tap the heart on any stay or experience to save it here.</p>
                <Link to="/travel/wishlist" className="ft-trips__outline">
                  Open wishlist
                </Link>
              </div>
            ) : (
              <div className="ft-trips__saved">
                {savedListings.map((listing) => (
                  <TravelListingCard key={String(listing._id || listing.id)} listing={listing} variant="compact" />
                ))}
              </div>
            ))}

          {tab === "plans" &&
            (tripsState === "loading" ? (
              <div className="ft-skel" style={{ height: 120, borderRadius: 14 }} />
            ) : tripsState === "error" ? (
              <div className="ft-trips__empty" role="alert">
                <AlertCircle size={28} aria-hidden="true" />
                <h2>We couldn’t load your trip plans</h2>
                <button type="button" className="ft-trips__outline" onClick={() => void loadTrips()}>
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              </div>
            ) : trips.length === 0 ? (
              <div className="ft-trips__empty">
                <CalendarDays size={30} aria-hidden="true" />
                <h2>No trip plans yet</h2>
                <p>Use the trip planner to organise stays, activities and transport in one place.</p>
                <Link to="/travel/trip-planner" className="ft-trips__primary">
                  Open trip planner
                </Link>
              </div>
            ) : (
              <div className="ft-trips__plans">
                {trips.map((trip, index) => {
                  const name = trip.destination || trip.name || trip.title || "Untitled trip";
                  const start = trip.startDate ? new Date(trip.startDate) : null;
                  const end = trip.endDate ? new Date(trip.endDate) : null;
                  const items = Array.isArray(trip.items) ? trip.items.length : 0;
                  return (
                    <article key={String(trip._id || trip.id || index)} className="ft-plan">
                      <div>
                        <h3>{name}</h3>
                        <p>
                          <CalendarDays size={14} aria-hidden="true" />
                          {formatRange(
                            start && !Number.isNaN(start.getTime()) ? start : null,
                            end && !Number.isNaN(end.getTime()) ? end : null,
                          )}
                          {items > 0 && ` · ${items} ${items === 1 ? "item" : "items"}`}
                        </p>
                        {trip.description && <p className="ft-plan__desc">{trip.description}</p>}
                      </div>
                      <Link to="/travel/trip-planner" className="ft-trips__outline">
                        Open planner
                      </Link>
                    </article>
                  );
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
