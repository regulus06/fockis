import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { travelApi } from '../services/travelApi';
import '../styles/TravelStayDetailsPage.scss';

interface TravelListing {
  _id: string;
  id?: string;

  name: string;
  title?: string;
  type: string;
  description?: string;

  country: string;
  city: string;
  state?: string;
  address?: string;
  postalCode?: string;

  images?: unknown[];
  amenities?: string[];
  tags?: string[];

  rating?: number;
  reviewCount?: number;

  currency?: string;
  price?: number;
  priceUnit?: string;

  active?: boolean;

  metadata?: Record<string, unknown>;
}

const API_ORIGIN = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://192.168.1.112:3000',
)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/travel$/, '');

function getString(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function resolveMediaUrl(
  value: unknown,
): string {
  const raw = getString(value);

  if (!raw) {
    return '';
  }

  if (
    /^(https?:|blob:|data:)/i.test(
      raw,
    )
  ) {
    return raw;
  }

  if (raw.startsWith('//')) {
    return `${window.location.protocol}${raw}`;
  }

  const normalized = raw.startsWith('/')
    ? raw
    : `/${raw}`;

  return `${API_ORIGIN}${normalized}`;
}

function extractImageUrl(
  value: unknown,
): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    const candidates = [
      record.url,
      record.src,
      record.image,
      record.imageUrl,
      record.media,
      record.mediaUrl,
      record.path,
    ];

    for (const candidate of candidates) {
      const result =
        getString(candidate);

      if (result) {
        return result;
      }
    }
  }

  return '';
}

function getCurrencySymbol(
  currency?: string,
): string {
  const symbols: Record<
    string,
    string
  > = {
    USD: '$',
    HTG: 'G',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    DOP: 'RD$',
    JPY: '¥',
    AUD: 'A$',
  };

  const normalized = String(
    currency || 'USD',
  ).toUpperCase();

  return (
    symbols[normalized] ||
    currency ||
    '$'
  );
}

function formatPrice(
  price: number,
  currency?: string,
): string {
  const safePrice =
    Number.isFinite(price)
      ? price
      : 0;

  return `${getCurrencySymbol(
    currency,
  )}${safePrice.toFixed(2)}`;
}

function getTodayString(): string {
  const today = new Date();

  const year =
    today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    today.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(
  dateString: string,
  days: number,
): string {
  const date = new Date(
    `${dateString}T12:00:00`,
  );

  date.setDate(
    date.getDate() + days,
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function calculateDurationMilliseconds(
  startAt: string,
  endAt: string,
): number {
  if (!startAt || !endAt) {
    return 0;
  }

  const start = new Date(
    startAt,
  );

  const end = new Date(
    endAt,
  );

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(end.getTime())
  ) {
    return 0;
  }

  return (
    end.getTime() -
    start.getTime()
  );
}

function calculateBookingDays(
  checkIn: string,
  checkOut: string,
): number {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const startAt = `${checkIn}T15:00:00`;
  const endAt = `${checkOut}T11:00:00`;

  const difference =
    calculateDurationMilliseconds(
      startAt,
      endAt,
    );

  if (difference <= 0) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil(
      difference / 86400000,
    ),
  );
}

function calculateBookingHours(
  checkIn: string,
  checkOut: string,
): number {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const startAt = `${checkIn}T15:00:00`;
  const endAt = `${checkOut}T11:00:00`;

  const difference =
    calculateDurationMilliseconds(
      startAt,
      endAt,
    );

  if (difference <= 0) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil(
      difference / 3600000,
    ),
  );
}

function normalizePriceUnit(
  priceUnit?: string,
): string {
  return String(
    priceUnit || 'night',
  )
    .trim()
    .toLowerCase();
}

export default function TravelStayDetailsPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate = useNavigate();

  const [listing, setListing] =
    useState<TravelListing | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [activeImage, setActiveImage] =
    useState(0);

  const [saved, setSaved] =
    useState(false);

  const [thumbnailOffset, setThumbnailOffset] =
    useState(0);

  const today = useMemo(
    () => getTodayString(),
    [],
  );

  const [checkIn, setCheckIn] =
    useState(today);

  const [checkOut, setCheckOut] =
    useState(
      addDays(today, 1),
    );

  const [guests, setGuests] =
    useState(1);

  const [quantity, setQuantity] =
    useState(1);

  const [bookingError, setBookingError] =
    useState<string | null>(
      null,
    );

  const loadListing =
    useCallback(
      async () => {
        if (!id) {
          setError(
            'Stay listing was not specified.',
          );

          setLoading(false);

          return;
        }

        setLoading(true);
        setError(null);

        try {
          const response =
            await travelApi.get<TravelListing>(
              `/travel/listings/${id}`,
            );

          setListing(response);
          setActiveImage(0);
          setThumbnailOffset(0);
        } catch (err) {
          const apiError =
            err as {
              message?: string;
            };

          setError(
            apiError.message ||
              'Unable to load this stay.',
          );
        } finally {
          setLoading(false);
        }
      },
      [id],
    );

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  const images = useMemo(
    () => {
      if (!listing) {
        return [];
      }

      const source =
        Array.isArray(
          listing.images,
        )
          ? listing.images
          : [];

      const normalized =
        source
          .map(
            (
              image,
            ) =>
              resolveMediaUrl(
                extractImageUrl(
                  image,
                ),
              ),
          )
          .filter(Boolean);

      if (
        normalized.length > 0
      ) {
        return normalized;
      }

      return [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1400',
      ];
    },
    [listing],
  );

  useEffect(() => {
    if (
      activeImage >=
      images.length
    ) {
      setActiveImage(0);
    }
  }, [
    activeImage,
    images.length,
  ]);

  const price =
    listing?.price ?? 0;

  const priceUnit =
    normalizePriceUnit(
      listing?.priceUnit,
    );

  const durationMilliseconds =
    useMemo(
      () =>
        calculateDurationMilliseconds(
          `${checkIn}T15:00:00`,
          `${checkOut}T11:00:00`,
        ),
      [checkIn, checkOut],
    );

  const nights = useMemo(
    () =>
      calculateBookingDays(
        checkIn,
        checkOut,
      ),
    [checkIn, checkOut],
  );

  const hours = useMemo(
    () =>
      calculateBookingHours(
        checkIn,
        checkOut,
      ),
    [checkIn, checkOut],
  );

  const estimatedSubtotal =
    useMemo(() => {
      if (!listing) {
        return 0;
      }

      const safeQuantity =
        Math.max(
          1,
          quantity || 1,
        );

      if (
        priceUnit === 'hour'
      ) {
        return price * hours;
      }

      if (
        priceUnit === 'day'
      ) {
        return price * nights;
      }

      if (
        priceUnit === 'person'
      ) {
        return (
          price *
          safeQuantity
        );
      }

      if (
        priceUnit === 'night'
      ) {
        return price * nights;
      }

      return (
        price *
        safeQuantity
      );
    }, [
      listing,
      price,
      priceUnit,
      quantity,
      nights,
      hours,
    ]);

  const estimatedFees =
    useMemo(
      () =>
        Math.round(
          estimatedSubtotal *
            0.05 *
            100,
        ) / 100,
      [estimatedSubtotal],
    );

  const estimatedTax =
    useMemo(
      () =>
        Math.round(
          estimatedSubtotal *
            0.1 *
            100,
        ) / 100,
      [estimatedSubtotal],
    );

  const estimatedTotal =
    useMemo(
      () =>
        estimatedSubtotal +
        estimatedFees +
        estimatedTax,
      [
        estimatedSubtotal,
        estimatedFees,
        estimatedTax,
      ],
    );

  function handleCheckInChange(
    value: string,
  ) {
    setBookingError(null);

    setCheckIn(value);

    if (
      checkOut &&
      value &&
      checkOut <= value
    ) {
      setCheckOut(
        addDays(value, 1),
      );
    }
  }

  function handleCheckOutChange(
    value: string,
  ) {
    setBookingError(null);
    setCheckOut(value);
  }

  function handleGuestsChange(
    value: number,
  ) {
    setBookingError(null);

    setGuests(
      Math.max(1, value),
    );
  }

  function handleQuantityChange(
    value: number,
  ) {
    setBookingError(null);

    setQuantity(
      Math.max(1, value),
    );
  }

  function handleReserve() {
    setBookingError(null);

    if (!listing || !id) {
      setBookingError(
        'This stay is not available right now.',
      );

      return;
    }

    if (
      !checkIn ||
      !checkOut
    ) {
      setBookingError(
        'Please select your check-in and check-out dates.',
      );

      return;
    }

    if (checkOut <= checkIn) {
      setBookingError(
        'Check-out must be after check-in.',
      );

      return;
    }

    if (
      durationMilliseconds <=
      0
    ) {
      setBookingError(
        'Please select valid reservation dates.',
      );

      return;
    }

    const safeGuests =
      Math.max(1, guests);

    const safeQuantity =
      Math.max(1, quantity);

    const params =
      new URLSearchParams();

    params.set(
      'listingId',
      id,
    );

    params.set(
      'startAt',
      `${checkIn}T15:00:00`,
    );

    params.set(
      'endAt',
      `${checkOut}T11:00:00`,
    );

    params.set(
      'guests',
      String(safeGuests),
    );

    params.set(
      'quantity',
      String(safeQuantity),
    );

    navigate(
      `/travel/booking/${id}?${params.toString()}`,
    );
  }

  function handlePreviousImage() {
    if (images.length <= 1) {
      return;
    }

    setActiveImage(
      (current) =>
        current <= 0
          ? images.length - 1
          : current - 1,
    );
  }

  function handleNextImage() {
    if (images.length <= 1) {
      return;
    }

    setActiveImage(
      (current) =>
        current >=
        images.length - 1
          ? 0
          : current + 1,
    );
  }

  function handlePreviousThumbnails() {
    if (images.length <= 1) {
      return;
    }

    setThumbnailOffset(
      (current) =>
        current <= 0
          ? images.length - 1
          : current - 1,
    );
  }

  function handleNextThumbnails() {
    if (images.length <= 1) {
      return;
    }

    setThumbnailOffset(
      (current) =>
        current >=
        images.length - 1
          ? 0
          : current + 1,
    );
  }

  function handleImageError(
    event: React.SyntheticEvent<HTMLImageElement>,
  ) {
    event.currentTarget.style.display =
      'none';
  }

  if (loading) {
    return (
      <div className="travel-stay-details">
        <div className="wrap">
          <div className="travel-stay-details__loading">
            <div className="travel-stay-details__loading-icon">
              🏨
            </div>

            <h2>
              Loading stay...
            </h2>

            <p>
              We're getting the
              latest information
              about this
              accommodation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (
    error ||
    !listing
  ) {
    return (
      <div className="travel-stay-details">
        <div className="wrap">
          <div className="travel-stay-details__error">
            <div className="travel-stay-details__error-icon">
              ⚠️
            </div>

            <h2>
              Stay unavailable
            </h2>

            <p>
              {error ||
                'We could not find this stay.'}
            </p>

            <Link
              to="/travel/stays"
              className="btn btn-outline"
            >
              <ArrowLeft
                size={16}
              />

              Back to stays
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const location = [
    listing.city,
    listing.state,
    listing.country,
  ]
    .filter(Boolean)
    .join(', ');

  const rating =
    listing.rating ?? 0;

  const reviewCount =
    listing.reviewCount ?? 0;

  const amenities =
    Array.isArray(
      listing.amenities,
    )
      ? listing.amenities
      : [];

  const description =
    listing.description ||
    'Enjoy a comfortable stay with Fockis Travel. Review the accommodation details, choose your dates, and reserve your stay securely.';

  const safeQuantity =
    Math.max(1, quantity);

  const priceCalculationLabel =
    priceUnit === 'hour'
      ? `${formatPrice(
          price,
          listing.currency,
        )} × ${hours} ${
          hours === 1
            ? 'hour'
            : 'hours'
        }`
      : priceUnit === 'person'
        ? `${formatPrice(
            price,
            listing.currency,
          )} × ${safeQuantity} ${
            safeQuantity === 1
              ? 'unit'
              : 'units'
          }`
        : priceUnit === 'day'
          ? `${formatPrice(
              price,
              listing.currency,
            )} × ${nights} ${
              nights === 1
                ? 'day'
                : 'days'
            }`
          : priceUnit ===
              'night'
            ? `${formatPrice(
                price,
                listing.currency,
              )} × ${nights} ${
                nights === 1
                  ? 'night'
                  : 'nights'
              }`
            : `${formatPrice(
                price,
                listing.currency,
              )} × ${safeQuantity} ${
                safeQuantity === 1
                  ? 'unit'
                  : 'units'
              }`;

  const visibleThumbnailIndexes =
    images.length <= 6
      ? images.map(
          (_, index) =>
            index,
        )
      : Array.from(
          { length: 6 },
          (_, index) =>
            (thumbnailOffset +
              index) %
            images.length,
        );

  const activeImageUrl =
    images[activeImage] ||
    images[0];

  return (
    <div className="travel-stay-details">
      <div className="wrap">
        <div className="travel-stay-details__breadcrumbs">
          <Link to="/travel/stays">
            <ArrowLeft
              size={16}
            />

            Back to stays
          </Link>

          <span>/</span>

          <span>
            {listing.name}
          </span>
        </div>

        <section className="travel-stay-details__hero">
          <div className="travel-stay-details__gallery">
            <div className="travel-stay-details__main-image">
              <img
                src={activeImageUrl}
                alt={listing.name}
                onError={
                  handleImageError
                }
              />

              {images.length >
                1 && (
                <>
                  <button
                    type="button"
                    className="travel-stay-details__gallery-button travel-stay-details__gallery-button--left"
                    onClick={
                      handlePreviousImage
                    }
                    aria-label="Previous image"
                  >
                    <ChevronLeft
                      size={22}
                    />
                  </button>

                  <button
                    type="button"
                    className="travel-stay-details__gallery-button travel-stay-details__gallery-button--right"
                    onClick={
                      handleNextImage
                    }
                    aria-label="Next image"
                  >
                    <ChevronRight
                      size={22}
                    />
                  </button>
                </>
              )}

              <button
                type="button"
                className={`travel-stay-details__save${
                  saved
                    ? ' is-saved'
                    : ''
                }`}
                onClick={() =>
                  setSaved(
                    (current) =>
                      !current,
                  )
                }
                aria-label={
                  saved
                    ? 'Remove from wishlist'
                    : 'Save to wishlist'
                }
                aria-pressed={
                  saved
                }
              >
                <Heart
                  size={18}
                  fill={
                    saved
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>

              {images.length >
                1 && (
                <div className="travel-stay-details__image-counter">
                  {activeImage + 1} /{' '}
                  {images.length}
                </div>
              )}
            </div>

            {images.length >
              1 && (
              <div className="travel-stay-details__thumbnail-row">
                <button
                  type="button"
                  className="travel-stay-details__thumbnail-scroll-button"
                  onClick={
                    handlePreviousThumbnails
                  }
                  aria-label="Previous thumbnails"
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>

                <div className="travel-stay-details__thumbnails">
                  {visibleThumbnailIndexes.map(
                    (imageIndex) => {
                      const image =
                        images[
                          imageIndex
                        ];

                      return (
                        <button
                          key={`${image}-${imageIndex}`}
                          type="button"
                          className={`travel-stay-details__thumbnail${
                            imageIndex ===
                            activeImage
                              ? ' is-active'
                              : ''
                          }`}
                          onClick={() =>
                            setActiveImage(
                              imageIndex,
                            )
                          }
                          aria-label={`View image ${
                            imageIndex +
                            1
                          }`}
                          aria-pressed={
                            imageIndex ===
                            activeImage
                          }
                        >
                          <img
                            src={image}
                            alt={`${listing.name} ${
                              imageIndex +
                              1
                            }`}
                            onError={
                              handleImageError
                            }
                          />
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  type="button"
                  className="travel-stay-details__thumbnail-scroll-button"
                  onClick={
                    handleNextThumbnails
                  }
                  aria-label="Next thumbnails"
                >
                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="travel-stay-details__content">
            <div className="travel-stay-details__eyebrow">
              FOCKIS TRAVEL STAY
            </div>

            <h1>
              {listing.name}
            </h1>

            <div className="travel-stay-details__location">
              <MapPin
                size={17}
                aria-hidden="true"
              />

              <span>
                {listing.address
                  ? `${listing.address}, ${location}`
                  : location}
              </span>
            </div>

            <div className="travel-stay-details__rating">
              <span className="travel-stay-details__rating-star">
                <Star
                  size={15}
                  fill="currentColor"
                />
              </span>

              <strong>
                {rating > 0
                  ? rating.toFixed(
                      1,
                    )
                  : 'New'}
              </strong>

              {reviewCount >
                0 && (
                <span>
                  {reviewCount}{' '}
                  {reviewCount ===
                  1
                    ? 'review'
                    : 'reviews'}
                </span>
              )}
            </div>

            {listing.tags &&
              listing.tags.length >
                0 && (
                <div className="travel-stay-details__tags">
                  {listing.tags.map(
                    (tag) => (
                      <span
                        key={tag}
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              )}

            <div className="travel-stay-details__description">
              <h2>
                About this stay
              </h2>

              <p>
                {description}
              </p>
            </div>

            <div className="travel-stay-details__facts">
              <div>
                <MapPin
                  size={18}
                />

                <span>
                  {location}
                </span>
              </div>

              <div>
                <Users
                  size={18}
                />

                <span>
                  Ideal for
                  travelers
                </span>
              </div>

              <div>
                <Clock3
                  size={18}
                />

                <span>
                  Flexible stay
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="travel-stay-details__body">
          <div className="travel-stay-details__main">
            <section className="travel-stay-details__section">
              <div className="travel-stay-details__section-heading">
                <div>
                  <span className="travel-stay-details__section-eyebrow">
                    FOCKIS TRAVEL
                  </span>

                  <h2>
                    Amenities
                  </h2>
                </div>
              </div>

              {amenities.length >
              0 ? (
                <div className="travel-stay-details__amenities">
                  {amenities.map(
                    (
                      amenity,
                    ) => (
                      <div
                        key={
                          amenity
                        }
                        className="travel-stay-details__amenity"
                      >
                        <Check
                          size={17}
                        />

                        <span>
                          {amenity}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="travel-stay-details__empty">
                  Comfortable
                  stay with
                  Fockis
                  Travel.
                </div>
              )}
            </section>

            <section className="travel-stay-details__section">
              <div className="travel-stay-details__section-heading">
                <div>
                  <span className="travel-stay-details__section-eyebrow">
                    YOUR STAY
                  </span>

                  <h2>
                    Reservation
                    information
                  </h2>
                </div>
              </div>

              <div className="travel-stay-details__info-grid">
                <div>
                  <CalendarDays
                    size={20}
                  />

                  <div>
                    <strong>
                      Check-in
                    </strong>

                    <span>
                      From
                      3:00 PM
                    </span>
                  </div>
                </div>

                <div>
                  <CalendarDays
                    size={20}
                  />

                  <div>
                    <strong>
                      Check-out
                    </strong>

                    <span>
                      By
                      11:00 AM
                    </span>
                  </div>
                </div>

                <div>
                  <Users
                    size={20}
                  />

                  <div>
                    <strong>
                      Guests
                    </strong>

                    <span>
                      Choose
                      during
                      reservation
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="travel-stay-details__booking-card">
            <div className="travel-stay-details__booking-price">
              <strong>
                {formatPrice(
                  price,
                  listing.currency,
                )}
              </strong>

              <span>
                /{' '}
                {priceUnit ===
                'night'
                  ? 'night'
                  : priceUnit}
              </span>
            </div>

            <div className="travel-stay-details__booking-card-title">
              Reserve this stay
            </div>

            <div className="travel-stay-details__booking-fields">
              <label>
                <span>
                  Check-in
                </span>

                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(
                    event,
                  ) =>
                    handleCheckInChange(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Check-out
                </span>

                <input
                  type="date"
                  min={addDays(
                    checkIn ||
                      today,
                    1,
                  )}
                  value={checkOut}
                  onChange={(
                    event,
                  ) =>
                    handleCheckOutChange(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Guests
                </span>

                <select
                  value={guests}
                  onChange={(
                    event,
                  ) =>
                    handleGuestsChange(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                >
                  {Array.from(
                    {
                      length: 10,
                    },
                    (
                      _,
                      index,
                    ) => (
                      <option
                        key={
                          index +
                          1
                        }
                        value={
                          index +
                          1
                        }
                      >
                        {index + 1}{' '}
                        {index ===
                        0
                          ? 'guest'
                          : 'guests'}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>
                  Rooms /
                  quantity
                </span>

                <select
                  value={quantity}
                  onChange={(
                    event,
                  ) =>
                    handleQuantityChange(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                >
                  {Array.from(
                    {
                      length: 5,
                    },
                    (
                      _,
                      index,
                    ) => (
                      <option
                        key={
                          index +
                          1
                        }
                        value={
                          index +
                          1
                        }
                      >
                        {index + 1}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="travel-stay-details__booking-summary">
              <div>
                <span>
                  {
                    priceCalculationLabel
                  }
                </span>

                <strong>
                  {formatPrice(
                    estimatedSubtotal,
                    listing.currency,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Fockis Travel
                  fee
                </span>

                <strong>
                  {formatPrice(
                    estimatedFees,
                    listing.currency,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Estimated tax
                </span>

                <strong>
                  {formatPrice(
                    estimatedTax,
                    listing.currency,
                  )}
                </strong>
              </div>

              <div className="total">
                <span>
                  Estimated total
                </span>

                <strong>
                  {formatPrice(
                    estimatedTotal,
                    listing.currency,
                  )}
                </strong>
              </div>
            </div>

            {bookingError && (
              <div className="travel-stay-details__booking-error">
                {bookingError}
              </div>
            )}

            <button
              type="button"
              className="travel-stay-details__reserve-button"
              onClick={
                handleReserve
              }
              disabled={
                listing.active ===
                false
              }
            >
              {listing.active ===
              false
                ? 'Currently unavailable'
                : 'Reserve this stay'}
            </button>

            <p className="travel-stay-details__booking-note">
              You will review
              your reservation
              details before the
              booking is submitted.
            </p>
          </aside>
        </section>
      </div>
    </div>
  );
}