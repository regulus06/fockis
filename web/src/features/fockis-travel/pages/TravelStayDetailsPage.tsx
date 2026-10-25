import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AirVent,
  ArrowLeft,
  BadgeCheck,
  Bath,
  BedDouble,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Coffee,
  CookingPot,
  Dumbbell,
  Flame,
  Heart,
  House,
  Images,
  Mail,
  MapPin,
  Mountain,
  PawPrint,
  Phone,
  Share2,
  SquareParking,
  Star,
  Tv,
  Umbrella,
  Users,
  UtensilsCrossed,
  WashingMachine,
  Waves,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import TravelListingCard from "../components/TravelListingCard";
import { useTravelFavorites } from "../hooks/useTravelFavorites";
import { CANCELLATION_POLICIES } from "./TravelListingCreatePage/constants";
import {
  buildVerifiedPartnerIndex,
  fetchTravelListing,
  fetchTravelListings,
  fetchVerifiedBusinesses,
  findListingPartner,
  formatTravelPrice,
  getBusinessDisplayName,
  getListingId,
  getListingImages,
  getListingName,
  getListingPrice,
  getListingRating,
  getListingType,
  getPriceUnitLabel,
  resolveTravelMedia,
  sortFeaturedFirst,
} from "../services/travelListingView";
import type {
  TravelListingView,
  VerifiedBusinessView,
} from "../services/travelListingView";
import "../styles/TravelStayDetailsPage.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — PROPERTY DETAILS
 * ============================================================================
 *
 * Reference layout: wide scenic photo, thumbnail strip, title + Verified,
 * rating · location, quick facts, About, Amenities, sticky booking card with
 * host, then Similar Stays.
 *
 * Data:
 *   GET /travel/listings/:id         the listing
 *   GET /travel/listings?type=…      similar stays
 *   GET /travel/partners/verified    Verified badge + host business
 *   GET/POST/DELETE /travel/wishlist the heart
 *
 * Booking: "Book Now" opens the existing /travel/booking flow with the
 * selected dates and travelers; that page creates the booking through
 * POST /travel/bookings and only shows a confirmation when the API returns
 * one. The price summary uses the same 5 % fee / 10 % tax the backend's
 * bookings.service applies and is labelled as an estimate.
 * ============================================================================
 */

const FEE_RATE = 0.05;
const TAX_RATE = 0.1;
const DAY_MS = 86_400_000;

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function isDateString(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/** Reads a field that may live on the listing or inside listing.metadata. */
function readField(listing: TravelListingView, key: string): unknown {
  const record = listing as unknown as Record<string, unknown>;
  if (record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];
  return listing.metadata?.[key];
}

const AMENITY_ICONS: Array<[RegExp, LucideIcon]> = [
  [/pool|swim/i, Waves],
  [/beach|sea|ocean front/i, Umbrella],
  [/wi-?fi|internet/i, Wifi],
  [/air ?con|a\/c|\bac\b|cooling/i, AirVent],
  [/kitchen|cook/i, CookingPot],
  [/parking|garage/i, SquareParking],
  [/gym|fitness/i, Dumbbell],
  [/tv|television|netflix/i, Tv],
  [/breakfast|coffee/i, Coffee],
  [/bath|tub|jacuzzi|hot tub|spa/i, Bath],
  [/pet|dog/i, PawPrint],
  [/washer|laundry|dryer/i, WashingMachine],
  [/fire|heating|bbq|grill/i, Flame],
  [/mountain|view/i, Mountain],
  [/restaurant|dining|bar/i, UtensilsCrossed],
  [/shuttle|transfer|car/i, Car],
];

function amenityIcon(label: string): LucideIcon {
  return AMENITY_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? Check;
}

function typeLabel(type: string): string {
  switch (type) {
    case "stay":
      return "Hotel stay";
    case "rental":
      return "Entire rental";
    case "experience":
      return "Experience";
    case "restaurant":
      return "Restaurant";
    case "meeting":
      return "Meeting space";
    case "event":
      return "Event";
    case "car":
      return "Car rental";
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : "";
  }
}

export default function TravelStayDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isSaved, isPending, toggle } = useTravelFavorites();

  const today = useMemo(todayString, []);
  const initialCheckIn = isDateString(searchParams.get("checkIn")) && searchParams.get("checkIn")! >= today
    ? searchParams.get("checkIn")!
    : today;
  const initialCheckOut = isDateString(searchParams.get("checkOut")) && searchParams.get("checkOut")! > initialCheckIn
    ? searchParams.get("checkOut")!
    : addDays(initialCheckIn, 1);

  const [listing, setListing] = useState<TravelListingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<VerifiedBusinessView[]>([]);
  const [similar, setSimilar] = useState<TravelListingView[]>([]);
  const [similarLoading, setSimilarLoading] = useState(true);

  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(
    Math.min(16, Math.max(1, Number(searchParams.get("guests")) || 1)),
  );
  const [quantity, setQuantity] = useState(1);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const thumbsRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------- loading */

  const loadListing = useCallback(async () => {
    if (!id) {
      setError("This listing link is incomplete.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchTravelListing(id);
      if (!result) throw new Error("This listing could not be found.");
      setListing(result);
      setActiveImage(0);
      setFailedImages(new Set());
    } catch (reason) {
      const message =
        reason && typeof reason === "object" && "message" in reason
          ? String((reason as { message?: unknown }).message || "")
          : "";
      setError(message || "Unable to load this listing.");
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadListing();
    window.scrollTo({ top: 0 });
  }, [loadListing]);

  useEffect(() => {
    let active = true;
    fetchVerifiedBusinesses()
      .then((items) => active && setBusinesses(items))
      .catch((reason) => console.error("[Fockis Travel] Verified businesses:", reason));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!listing) return;
    let active = true;
    const type = getListingType(listing) || "stay";
    const currentId = getListingId(listing);
    setSimilarLoading(true);

    fetchTravelListings({ type })
      .then((items) => {
        if (!active) return;
        const others = items.filter((item) => getListingId(item) !== currentId);
        const sameCountry = (item: TravelListingView) =>
          Boolean(listing.country) &&
          String(item.country || "").toLowerCase() === String(listing.country).toLowerCase();
        others.sort(
          (a, b) => Number(sameCountry(b)) - Number(sameCountry(a)) || sortFeaturedFirst(a, b),
        );
        setSimilar(others.slice(0, 4));
      })
      .catch((reason) => {
        console.error("[Fockis Travel] Similar listings:", reason);
        if (active) setSimilar([]);
      })
      .finally(() => active && setSimilarLoading(false));

    return () => {
      active = false;
    };
  }, [listing]);

  /* ------------------------------------------------------------ derived */

  const verifiedIndex = useMemo(() => buildVerifiedPartnerIndex(businesses), [businesses]);
  const host = listing ? findListingPartner(listing, verifiedIndex) : null;

  const images = useMemo(
    () => (listing ? getListingImages(listing).filter((src) => !failedImages.has(src)) : []),
    [listing, failedImages],
  );

  useEffect(() => {
    if (activeImage >= images.length && images.length > 0) setActiveImage(0);
  }, [activeImage, images.length]);

  useEffect(() => {
    const strip = thumbsRef.current;
    const active = strip?.querySelector<HTMLElement>(`[data-index="${activeImage}"]`);
    if (strip && active) {
      strip.scrollTo({ left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
    }
  }, [activeImage]);

  const price = listing ? getListingPrice(listing) : null;
  const priceUnit = String(listing?.priceUnit || "night").toLowerCase();
  const nights = Math.max(
    1,
    Math.round((new Date(`${checkOut}T12:00:00`).getTime() - new Date(`${checkIn}T12:00:00`).getTime()) / DAY_MS),
  );

  const units =
    priceUnit === "night" || priceUnit === "day" ? nights * Math.max(1, quantity) : Math.max(1, quantity);
  const unitsLabel =
    priceUnit === "night"
      ? `${nights} ${nights === 1 ? "night" : "nights"}${quantity > 1 ? ` × ${quantity}` : ""}`
      : priceUnit === "day"
        ? `${nights} ${nights === 1 ? "day" : "days"}${quantity > 1 ? ` × ${quantity}` : ""}`
        : `${quantity} ${quantity === 1 ? "unit" : "units"}`;

  const subtotal = price !== null ? price * units : 0;
  const fees = Math.round(subtotal * FEE_RATE * 100) / 100;
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + fees + tax;

  /* ------------------------------------------------------------ actions */

  function showImage(index: number) {
    if (images.length === 0) return;
    setActiveImage((index + images.length) % images.length);
  }

  function handleCheckIn(value: string) {
    setBookingError(null);
    setCheckIn(value);
    if (value && checkOut <= value) setCheckOut(addDays(value, 1));
  }

  function handleBook() {
    setBookingError(null);

    if (!listing) return;

    if (!checkIn || !checkOut) {
      setBookingError("Choose your check-in and check-out dates.");
      return;
    }

    if (checkOut <= checkIn) {
      setBookingError("Check-out must be after check-in.");
      return;
    }

    const params = new URLSearchParams({
      listingId: getListingId(listing),
      startAt: `${checkIn}T15:00:00`,
      endAt: `${checkOut}T11:00:00`,
      guests: String(guests),
      quantity: String(quantity),
    });

    navigate(`/travel/booking/${encodeURIComponent(getListingId(listing))}?${params.toString()}`);
  }

  async function handleShare() {
    const url = window.location.origin + location.pathname;
    const title = listing ? getListingName(listing) : "Fockis Travel";

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMessage("Link copied");
    } catch (reason) {
      if ((reason as { name?: string })?.name === "AbortError") return;
      setShareMessage("Couldn’t copy the link");
    }
    window.setTimeout(() => setShareMessage(""), 2200);
  }

  /* ------------------------------------------------------------ states */

  if (loading) {
    return (
      <div className="ft-details">
        <div className="ft-details__wrap" aria-busy="true" aria-live="polite">
          <div className="ft-details__skel-hero ft-skel" />
          <div className="ft-details__skel-grid">
            <div>
              <div className="ft-skel ft-skel--line" style={{ width: "55%", height: 26 }} />
              <div className="ft-skel ft-skel--line" style={{ width: "35%", marginTop: 12 }} />
              <div className="ft-skel ft-skel--line" style={{ marginTop: 28 }} />
              <div className="ft-skel ft-skel--line" style={{ marginTop: 10, width: "90%" }} />
            </div>
            <div className="ft-skel" style={{ height: 320, borderRadius: 14 }} />
          </div>
          <span className="ft-sr-only">Loading listing…</span>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="ft-details">
        <div className="ft-details__wrap">
          <div className="ft-details__error" role="alert">
            <h1>We couldn’t open this listing</h1>
            <p>{error || "This listing is no longer available."}</p>
            <div>
              <button type="button" className="ft-details__btn-outline" onClick={() => void loadListing()}>
                Try again
              </button>
              <Link to="/travel/stays" className="ft-details__btn-primary">
                Browse stays
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ view */

  const listingId = getListingId(listing);
  const name = getListingName(listing);
  const type = getListingType(listing);
  const rating = getListingRating(listing);
  const saved = isSaved(listingId);
  const fullLocation = [listing.city, listing.department || listing.state, listing.country]
    .filter(Boolean)
    .join(", ");
  const description = getText(listing.description);
  const longDescription = description.length > 320;
  const amenities = Array.from(
    new Set([...(listing.amenities ?? []), ...(listing.features ?? [])].map((item) => String(item).trim()).filter(Boolean)),
  );

  const capacity = getNumber(listing.capacity);
  const bedrooms = getNumber(listing.bedrooms);
  const bathrooms = getNumber(listing.bathrooms);
  const facts: Array<{ icon: LucideIcon; label: string }> = [];
  if (type) facts.push({ icon: House, label: typeLabel(type) });
  if (capacity) facts.push({ icon: Users, label: `${capacity} ${capacity === 1 ? "guest" : "guests"}` });
  if (bedrooms) facts.push({ icon: BedDouble, label: `${bedrooms} ${bedrooms === 1 ? "bedroom" : "bedrooms"}` });
  if (bathrooms) facts.push({ icon: Bath, label: `${bathrooms} ${bathrooms === 1 ? "bathroom" : "bathrooms"}` });

  const policyValue = getText(readField(listing, "cancellationPolicy")).toLowerCase();
  const policy = CANCELLATION_POLICIES.find((item) => item.value === policyValue);
  const checkInTime = getText(readField(listing, "checkInTime"));
  const checkOutTime = getText(readField(listing, "checkOutTime"));

  const hostName = host ? getBusinessDisplayName(host) : getText(readField(listing, "hostName"));
  const hostAvatar = host ? resolveTravelMedia(host.logo || host.coverImage || "") : "";
  const hostId = host ? String(host._id || host.id || "") : "";
  const contactEmail =
    getText(listing.email) || getText(host?.contact?.email) || getText(host?.email);
  const contactPhone =
    getText(listing.phone) || getText(host?.contact?.phone) || getText(host?.phone);
  const accepting = listing.active !== false && listing.acceptingBookings !== false;
  const maxGuests = Math.max(1, Math.min(16, capacity ?? 16));
  const activeSrc = images[activeImage];

  return (
    <div className="ft-details">
      <div className="ft-details__wrap">
        <nav className="ft-details__crumbs" aria-label="Breadcrumb">
          <Link to={type === "experience" ? "/travel/experiences" : "/travel/stays"}>
            <ArrowLeft size={16} aria-hidden="true" />
            {type === "experience" ? "Experiences" : "Stays"}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{name}</span>
        </nav>

        {/* =========================== GALLERY =========================== */}
        <section className="ft-gallery" aria-label={`${name} photos`}>
          <div className="ft-gallery__main">
            {activeSrc ? (
              <img
                key={activeSrc}
                src={activeSrc}
                alt={`${name} — photo ${activeImage + 1} of ${images.length}`}
                onError={() => setFailedImages((current) => new Set(current).add(activeSrc))}
              />
            ) : (
              <div className="ft-gallery__empty">
                <Images size={34} aria-hidden="true" />
                <span>The host hasn’t added photos yet</span>
              </div>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="ft-gallery__nav ft-gallery__nav--prev"
                  onClick={() => showImage(activeImage - 1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={22} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="ft-gallery__nav ft-gallery__nav--next"
                  onClick={() => showImage(activeImage + 1)}
                  aria-label="Next photo"
                >
                  <ChevronRight size={22} aria-hidden="true" />
                </button>
              </>
            )}

            <div className="ft-gallery__tools">
              <button
                type="button"
                className={`ft-gallery__tool${saved ? " is-saved" : ""}`}
                onClick={() => void toggle(listingId)}
                disabled={isPending(listingId)}
                aria-pressed={saved}
                aria-label={saved ? "Remove from favorites" : "Save to favorites"}
              >
                <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ft-gallery__tool"
                onClick={() => void handleShare()}
                aria-label="Share this listing"
              >
                <Share2 size={18} aria-hidden="true" />
              </button>
            </div>

            {shareMessage && (
              <span className="ft-gallery__toast" role="status">
                {shareMessage}
              </span>
            )}

            {images.length > 0 && (
              <span className="ft-gallery__count" aria-hidden="true">
                {activeImage + 1}/{images.length}
              </span>
            )}
          </div>
        </section>

        <div className="ft-details__grid">
          {/* =========================== MAIN =========================== */}
          <div className="ft-details__main">
            {images.length > 1 && (
              <div className="ft-gallery__thumbs" ref={thumbsRef} role="list" aria-label="Choose a photo">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    role="listitem"
                    data-index={index}
                    className={`ft-gallery__thumb${index === activeImage ? " is-active" : ""}`}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show photo ${index + 1}`}
                    aria-current={index === activeImage}
                  >
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      onError={() => setFailedImages((current) => new Set(current).add(src))}
                    />
                  </button>
                ))}
              </div>
            )}

            <header className="ft-details__title">
              <h1>
                {name}
                {host && (
                  <span className="ft-details__verified">
                    <BadgeCheck size={14} aria-hidden="true" /> Verified
                  </span>
                )}
              </h1>

              <p className="ft-details__meta">
                {rating && (
                  <span className="ft-details__rating">
                    <Star size={16} fill="currentColor" aria-hidden="true" />
                    <strong>{rating.average.toFixed(1)}</strong>
                    {rating.count > 0 && (
                      <span>
                        ({rating.count.toLocaleString()} {rating.count === 1 ? "review" : "reviews"})
                      </span>
                    )}
                  </span>
                )}
                {rating && fullLocation && <span aria-hidden="true">·</span>}
                {fullLocation && (
                  <span className="ft-details__place">
                    <MapPin size={15} aria-hidden="true" /> {fullLocation}
                  </span>
                )}
              </p>
            </header>

            {/* Mobile-only price row, right under the title (reference). */}
            <p className="ft-details__mobile-price">
              {price !== null ? (
                <>
                  <strong>{formatTravelPrice(price, listing.currency)}</strong>{" "}
                  {getPriceUnitLabel(listing)}
                </>
              ) : (
                "Price on request"
              )}
            </p>

            {facts.length > 0 && (
              <ul className="ft-details__facts" aria-label="Property facts">
                {facts.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <Icon size={22} aria-hidden="true" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}

            <section className="ft-details__section" aria-labelledby="ft-about">
              <h2 id="ft-about">About this {type === "experience" ? "experience" : "stay"}</h2>
              {description ? (
                <>
                  <p
                    id="ft-about-text"
                    className={`ft-details__about${longDescription && !descriptionOpen ? " is-clamped" : ""}`}
                  >
                    {description}
                  </p>
                  {longDescription && (
                    <button
                      type="button"
                      className="ft-details__more"
                      aria-expanded={descriptionOpen}
                      aria-controls="ft-about-text"
                      onClick={() => setDescriptionOpen((open) => !open)}
                    >
                      {descriptionOpen ? "Show less" : "Read more"}
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  )}
                </>
              ) : (
                <p className="ft-details__muted">The host hasn’t added a description yet.</p>
              )}
            </section>

            <section className="ft-details__section" aria-labelledby="ft-amenities">
              <h2 id="ft-amenities">Amenities</h2>
              {amenities.length > 0 ? (
                <ul className="ft-details__amenities">
                  {amenities.map((amenity) => {
                    const Icon = amenityIcon(amenity);
                    return (
                      <li key={amenity}>
                        <Icon size={20} aria-hidden="true" />
                        <span>{amenity}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ft-details__muted">Amenities haven’t been listed for this property.</p>
              )}
            </section>

            {(checkInTime || checkOutTime || policy) && (
              <section className="ft-details__section" aria-labelledby="ft-policies">
                <h2 id="ft-policies">Good to know</h2>
                <ul className="ft-details__policies">
                  {checkInTime && (
                    <li>
                      <strong>Check-in</strong> from {checkInTime}
                    </li>
                  )}
                  {checkOutTime && (
                    <li>
                      <strong>Check-out</strong> by {checkOutTime}
                    </li>
                  )}
                  {policy && (
                    <li>
                      <strong>{policy.label} cancellation</strong> — {policy.description}
                    </li>
                  )}
                </ul>
              </section>
            )}
          </div>

          {/* =========================== BOOKING =========================== */}
          <aside className="ft-book" aria-label="Book this listing">
            <div className="ft-book__card">
              <div className="ft-book__top">
                <p className="ft-book__price">
                  {price !== null ? (
                    <>
                      <strong>{formatTravelPrice(price, listing.currency)}</strong>
                      <span>{getPriceUnitLabel(listing)}</span>
                    </>
                  ) : (
                    <span className="ft-book__price-na">Price on request</span>
                  )}
                </p>
                {rating && (
                  <span className="ft-book__rating">
                    <Star size={14} fill="currentColor" aria-hidden="true" />
                    {rating.average.toFixed(1)}
                    {rating.count > 0 && <small>({rating.count.toLocaleString()})</small>}
                  </span>
                )}
              </div>

              <div className="ft-book__dates">
                <label>
                  <span>Check in</span>
                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(event) => handleCheckIn(event.target.value)}
                  />
                </label>
                <label>
                  <span>Check out</span>
                  <input
                    type="date"
                    value={checkOut}
                    min={addDays(checkIn || today, 1)}
                    onChange={(event) => {
                      setBookingError(null);
                      setCheckOut(event.target.value);
                    }}
                  />
                </label>
              </div>

              <div className="ft-book__selects">
                <label>
                  <span>Travelers</span>
                  <select value={guests} onChange={(event) => setGuests(Number(event.target.value))}>
                    {Array.from({ length: maxGuests }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>
                        {count} {count === 1 ? "traveler" : "travelers"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Rooms / units</span>
                  <select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5].map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {bookingError && (
                <p className="ft-book__error" role="alert">
                  {bookingError}
                </p>
              )}

              <button
                type="button"
                className="ft-book__primary"
                onClick={handleBook}
                disabled={!accepting}
              >
                {accepting ? "Book Now" : "Not accepting bookings"}
              </button>

              {price !== null && accepting && (
                <dl className="ft-book__summary">
                  <div>
                    <dt>
                      {formatTravelPrice(price, listing.currency)} × {unitsLabel}
                    </dt>
                    <dd>{formatTravelPrice(subtotal, listing.currency)}</dd>
                  </div>
                  <div>
                    <dt>Fockis Travel fee</dt>
                    <dd>{formatTravelPrice(fees, listing.currency)}</dd>
                  </div>
                  <div>
                    <dt>Estimated tax</dt>
                    <dd>{formatTravelPrice(tax, listing.currency)}</dd>
                  </div>
                  <div className="ft-book__total">
                    <dt>Estimated total</dt>
                    <dd>{formatTravelPrice(total, listing.currency)}</dd>
                  </div>
                </dl>
              )}

              <p className="ft-book__note">
                <CircleCheck size={15} aria-hidden="true" />
                {policy
                  ? `${policy.label} cancellation: ${policy.description}`
                  : "You won’t be charged yet. You’ll review everything before the booking is sent."}
              </p>
            </div>

            {(hostName || contactEmail || contactPhone) && (
              <div className="ft-book__host">
                <div className="ft-book__host-row">
                  <span className="ft-book__avatar" aria-hidden="true">
                    {hostAvatar ? <img src={hostAvatar} alt="" /> : (hostName || "F").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <span>Hosted by</span>
                    <strong>
                      {hostId ? (
                        <Link to={`/travel/businesses/${encodeURIComponent(hostId)}`}>
                          {hostName || "Fockis Travel partner"}
                        </Link>
                      ) : (
                        hostName || "Fockis Travel partner"
                      )}
                    </strong>
                  </div>
                </div>

                {contactEmail ? (
                  <a
                    className="ft-book__secondary"
                    href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Question about ${name}`)}`}
                  >
                    <Mail size={17} aria-hidden="true" /> Contact Host
                  </a>
                ) : contactPhone ? (
                  <a className="ft-book__secondary" href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}>
                    <Phone size={17} aria-hidden="true" /> Call Host
                  </a>
                ) : hostId ? (
                  <Link className="ft-book__secondary" to={`/travel/businesses/${encodeURIComponent(hostId)}`}>
                    View host profile
                  </Link>
                ) : null}
              </div>
            )}
          </aside>
        </div>

        {/* =========================== SIMILAR =========================== */}
        <section className="ft-details__similar" aria-labelledby="ft-similar">
          <div className="ft-details__similar-head">
            <h2 id="ft-similar">Similar {type === "experience" ? "Experiences" : "Stays"}</h2>
            <Link
              to={type === "experience" ? "/travel/experiences" : type === "stay" ? "/travel/stays" : `/travel/explore?type=${encodeURIComponent(type)}`}
              className="ft-details__view-all"
            >
              View All <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {similarLoading ? (
            <div className="ft-details__similar-grid" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="ft-skel" style={{ height: 230, borderRadius: 12 }} />
              ))}
            </div>
          ) : similar.length > 0 ? (
            <div className="ft-details__similar-grid">
              {similar.map((item) => (
                <TravelListingCard
                  key={getListingId(item)}
                  listing={item}
                  variant="compact"
                  verified={Boolean(findListingPartner(item, verifiedIndex))}
                />
              ))}
            </div>
          ) : (
            <p className="ft-details__muted">No similar listings are available right now.</p>
          )}
        </section>
      </div>

      {/* Phone: booking action stays within reach (reference mobile screen). */}
      <div className="ft-details__mobile-bar">
        <p>
          {price !== null ? (
            <>
              <strong>{formatTravelPrice(price, listing.currency)}</strong>
              <span>{getPriceUnitLabel(listing)}</span>
            </>
          ) : (
            <span>Price on request</span>
          )}
        </p>
        <button type="button" onClick={handleBook} disabled={!accepting}>
          {accepting ? "Book Now" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}
