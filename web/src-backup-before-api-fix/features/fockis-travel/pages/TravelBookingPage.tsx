import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";


import { travelApi, unwrapApiData } from "../services/travelApi";
import "../styles/TravelBookingPage.scss";
interface TravelListing {
  _id: string;
  id?: string;
  name: string;
  type: string;
  description?: string;
  country?: string;
  city?: string;
  address?: string;
  images?: string[];
  amenities?: string[];
  currency?: string;
  price?: number;
  priceUnit?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

interface BookingResponse {
  _id: string;
  bookingCode: string;
  userId: string;
  listingId: TravelListing | string;
  type: string;
  startAt: string;
  endAt: string;
  quantity: number;
  guests: number;
  currency: string;
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  snapshot?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiError {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  response?: {
    message?: string | string[];
    error?: string;
    statusCode?: number;
  };
}

function getApiErrorMessage(error: unknown): string {
  const apiError = error as ApiError | undefined;

  const message =
    apiError?.response?.message ??
    apiError?.message ??
    apiError?.response?.error ??
    apiError?.error;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return "Unable to complete your booking right now. Please try again.";
}

function formatCurrency(
  amount: number,
  currency = "USD",
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateValue: string): string {
  if (!dateValue) {
    return "Not selected";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateValue: string): string {
  if (!dateValue) {
    return "Not selected";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getDateInputValue(value: string): string {
  if (!value) {
    return "";
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  return value;
}

function getTodayString(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTomorrowString(): string {
  const now = new Date();

  now.setDate(now.getDate() + 1);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateDuration(
  startAt: string,
  endAt: string,
): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end <= start
  ) {
    return 0;
  }

  return end - start;
}

function calculateDays(
  startAt: string,
  endAt: string,
): number {
  const duration = calculateDuration(
    startAt,
    endAt,
  );

  if (!duration) {
    return 0;
  }

  return Math.max(
    1,
    Math.ceil(duration / 86400000),
  );
}

function calculateHours(
  startAt: string,
  endAt: string,
): number {
  const duration = calculateDuration(
    startAt,
    endAt,
  );

  if (!duration) {
    return 0;
  }

  return Math.max(
    1,
    Math.ceil(duration / 3600000),
  );
}

function getPriceUnitLabel(
  priceUnit?: string,
): string {
  const normalizedUnit = (
    priceUnit || "night"
  ).toLowerCase();

  switch (normalizedUnit) {
    case "hour":
      return "hour";

    case "day":
      return "day";

    case "person":
      return "person";

    case "night":
      return "night";

    default:
      return normalizedUnit;
  }
}

function getPriceMultiplier(
  priceUnit: string | undefined,
  startAt: string,
  endAt: string,
  quantity: number,
): number {
  const normalizedUnit = (
    priceUnit || "night"
  ).toLowerCase();

  switch (normalizedUnit) {
    case "hour":
      return calculateHours(
        startAt,
        endAt,
      );

    case "day":
      return calculateDays(
        startAt,
        endAt,
      );

    case "night":
      return calculateDays(
        startAt,
        endAt,
      );

    case "person":
      return Math.max(
        1,
        quantity,
      );

    default:
      return Math.max(
        1,
        quantity,
      );
  }
}

export default function TravelBookingPage() {
  const navigate = useNavigate();

  const {
    listingId: routeListingId,
  } = useParams<{
    listingId: string;
  }>();

  const [searchParams] =
    useSearchParams();

  const queryListingId =
    searchParams.get(
      "listingId",
    ) || "";

  const listingId =
    routeListingId ||
    queryListingId;

  const today = useMemo(
    () => getTodayString(),
    [],
  );

  const tomorrow = useMemo(
    () => getTomorrowString(),
    [],
  );

  const initialCheckIn =
    getDateInputValue(
      searchParams.get(
        "startAt",
      ) || "",
    ) || today;

  const initialCheckOut =
    getDateInputValue(
      searchParams.get(
        "endAt",
      ) || "",
    ) || tomorrow;

  const initialGuests = Math.max(
    1,
    Number(
      searchParams.get(
        "guests",
      ) || 1,
    ),
  );

  const initialQuantity =
    Math.max(
      1,
      Number(
        searchParams.get(
          "quantity",
        ) || 1,
      ),
    );

  const initialStartTime =
    searchParams.get(
      "startAt",
    )?.includes("T")
      ? (
          searchParams
            .get("startAt") || ""
        )
          .split("T")[1]
          ?.slice(0, 5) ||
        "15:00"
      : "15:00";

  const initialEndTime =
    searchParams.get(
      "endAt",
    )?.includes("T")
      ? (
          searchParams
            .get("endAt") || ""
        )
          .split("T")[1]
          ?.slice(0, 5) ||
        "11:00"
      : "11:00";

  const [listing, setListing] =
    useState<TravelListing | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<BookingResponse | null>(
      null,
    );

  const [checkIn, setCheckIn] =
    useState(initialCheckIn);

  const [checkOut, setCheckOut] =
    useState(initialCheckOut);

  const [guests, setGuests] =
    useState(initialGuests);

  const [quantity, setQuantity] =
    useState(initialQuantity);

  const [notes, setNotes] =
    useState("");

  const [startTime, setStartTime] =
    useState(initialStartTime);

  const [endTime, setEndTime] =
    useState(initialEndTime);

  const loadListing =
    useCallback(async () => {
      if (!listingId) {
        setListing(null);
        setError(
          "No travel listing was selected.",
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response =
          await travelApi.get<TravelListing>(
            `/travel/listings/${listingId}`,
          );

        setListing(
          unwrapApiData(response),
        );
      } catch (err) {
        setListing(null);

        setError(
          getApiErrorMessage(err),
        );
      } finally {
        setLoading(false);
      }
    }, [listingId]);

  useEffect(() => {
    void loadListing();
  }, [loadListing]);

  const currency =
    listing?.currency || "USD";

  const price =
    Number(
      listing?.price || 0,
    );

  const priceUnit =
    listing?.priceUnit ||
    "night";

  const startAt = useMemo(() => {
    if (!checkIn) {
      return "";
    }

    return `${checkIn}T${
      startTime || "15:00"
    }:00`;
  }, [
    checkIn,
    startTime,
  ]);

  const endAt = useMemo(() => {
    if (!checkOut) {
      return "";
    }

    return `${checkOut}T${
      endTime || "11:00"
    }:00`;
  }, [
    checkOut,
    endTime,
  ]);

  const durationDays =
    useMemo(
      () =>
        calculateDays(
          startAt,
          endAt,
        ),
      [
        startAt,
        endAt,
      ],
    );

  const durationHours =
    useMemo(
      () =>
        calculateHours(
          startAt,
          endAt,
        ),
      [
        startAt,
        endAt,
      ],
    );

  const multiplier =
    useMemo(
      () =>
        getPriceMultiplier(
          priceUnit,
          startAt,
          endAt,
          quantity,
        ),
      [
        priceUnit,
        startAt,
        endAt,
        quantity,
      ],
    );

  const estimatedSubtotal =
    useMemo(() => {
      return (
        Math.round(
          price *
            multiplier *
            100,
        ) / 100
      );
    }, [
      price,
      multiplier,
    ]);

  const estimatedFees =
    useMemo(() => {
      return (
        Math.round(
          estimatedSubtotal *
            0.05 *
            100,
        ) / 100
      );
    }, [
      estimatedSubtotal,
    ]);

  const estimatedTax =
    useMemo(() => {
      return (
        Math.round(
          estimatedSubtotal *
            0.1 *
            100,
        ) / 100
      );
    }, [
      estimatedSubtotal,
    ]);

  const estimatedTotal =
    useMemo(() => {
      return (
        Math.round(
          (
            estimatedSubtotal +
            estimatedFees +
            estimatedTax
          ) *
            100,
        ) / 100
      );
    }, [
      estimatedSubtotal,
      estimatedFees,
      estimatedTax,
    ]);

  const location =
    useMemo(() => {
      if (!listing) {
        return "";
      }

      return [
        listing.city,
        listing.country,
      ]
        .filter(Boolean)
        .join(", ");
    }, [listing]);

  const listingImage =
    listing?.images?.[0] ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1000";

  const durationLabel =
    priceUnit.toLowerCase() ===
    "hour"
      ? `${durationHours} hour${
          durationHours === 1
            ? ""
            : "s"
        }`
      : `${durationDays} night${
          durationDays === 1
            ? ""
            : "s"
        }`;

  function validateBooking():
    string | null {
    if (!listingId) {
      return "No travel listing was selected.";
    }

    if (!listing) {
      return "The travel listing could not be loaded.";
    }

    if (!listing.active) {
      return "This listing is currently unavailable.";
    }

    if (!checkIn) {
      return "Please select a check-in date.";
    }

    if (!checkOut) {
      return "Please select a check-out date.";
    }

    if (!startAt || !endAt) {
      return "Please select valid booking dates and times.";
    }

    const start =
      new Date(startAt);

    const end =
      new Date(endAt);

    if (
      Number.isNaN(
        start.getTime(),
      ) ||
      Number.isNaN(
        end.getTime(),
      )
    ) {
      return "Please select valid booking dates and times.";
    }

    if (end <= start) {
      return "Your check-out date and time must be after check-in.";
    }

    if (
      checkIn < today
    ) {
      return "Check-in cannot be in the past.";
    }

    if (
      checkOut <= checkIn
    ) {
      return "Check-out must be after check-in.";
    }

    if (guests < 1) {
      return "At least one guest is required.";
    }

    if (quantity < 1) {
      return "Quantity must be at least 1.";
    }

    if (price <= 0) {
      return "This listing does not currently have a valid price.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError(null);

    const validationError =
      validateBooking();

    if (validationError) {
      setError(
        validationError,
      );
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await travelApi.post<BookingResponse>(
          "/travel/bookings",
          {
            listingId,
            startAt,
            endAt,
            quantity,
            guests,
            ...(notes.trim()
              ? {
                  notes:
                    notes.trim(),
                }
              : {}),
          },
        );

      const booking =
        unwrapApiData(response);

      setSuccess(booking);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      const message =
        getApiErrorMessage(err);

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "no longer available",
        )
      ) {
        setError(
          "Those dates or times are no longer available. Please choose different dates and try again.",
        );
      } else if (
        normalizedMessage.includes(
          "unauthorized",
        ) ||
        normalizedMessage.includes(
          "jwt",
        ) ||
        normalizedMessage.includes(
          "token",
        ) ||
        (err as ApiError)
          ?.statusCode ===
          401 ||
        (err as ApiError)
          ?.response
          ?.statusCode === 401
      ) {
        setError(
          "Please sign in before completing your booking.",
        );
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (listingId) {
      navigate(
        `/travel/stays/${listingId}`,
      );
      return;
    }

    navigate("/travel/stays");
  }

  function handleCheckInChange(
    value: string,
  ) {
    setError(null);
    setCheckIn(value);

    if (
      checkOut &&
      value &&
      checkOut <= value
    ) {
      const date =
        new Date(
          `${value}T12:00:00`,
        );

      date.setDate(
        date.getDate() + 1,
      );

      const year =
        date.getFullYear();

      const month =
        String(
          date.getMonth() + 1,
        ).padStart(2, "0");

      const day =
        String(
          date.getDate(),
        ).padStart(2, "0");

      setCheckOut(
        `${year}-${month}-${day}`,
      );
    }
  }

  function handleCheckOutChange(
    value: string,
  ) {
    setError(null);
    setCheckOut(value);
  }

  if (loading) {
    return (
      <div className="travel-booking-page">
        <div className="travel-booking-loading">
          <Loader2
            size={32}
            className="travel-booking-spinner"
          />

          <h2>
            Loading booking
          </h2>

          <p>
            We are loading the
            selected stay.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    const successListing =
      listing ||
      (typeof success.listingId ===
      "object"
        ? success.listingId
        : null);

    const successLocation =
      successListing
        ? [
            successListing.city,
            successListing.country,
          ]
            .filter(Boolean)
            .join(", ")
        : location;

    return (
      <div className="travel-booking-page">
        <div className="travel-booking-success">
          <div className="travel-booking-success-icon">
            <CheckCircle2 size={46} />
          </div>

          <span className="travel-booking-eyebrow">
            Booking created
          </span>

          <h1>
            Your booking is confirmed
          </h1>

          <p className="travel-booking-success-text">
            Your booking has been
            created successfully.
            Keep your booking code
            for your records.
          </p>

          <div className="travel-booking-confirmation-card">
            <div className="travel-booking-confirmation-header">
              <div>
                <span>
                  Booking code
                </span>

                <strong>
                  {success.bookingCode}
                </strong>
              </div>

              <span className="travel-booking-status">
                {success.status}
              </span>
            </div>

            {successListing && (
              <div className="travel-booking-confirmation-listing">
                <img
                  src={
                    successListing
                      .images?.[0] ||
                    listingImage
                  }
                  alt={
                    successListing.name ||
                    "Travel stay"
                  }
                />

                <div>
                  <h2>
                    {successListing.name ||
                      "Your stay"}
                  </h2>

                  {successLocation && (
                    <p>
                      <MapPin
                        size={15}
                      />

                      {successLocation}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="travel-booking-confirmation-grid">
              <div>
                <span>
                  Check-in
                </span>

                <strong>
                  {formatDateTime(
                    success.startAt,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Check-out
                </span>

                <strong>
                  {formatDateTime(
                    success.endAt,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Guests
                </span>

                <strong>
                  {success.guests}
                </strong>
              </div>

              <div>
                <span>
                  Total
                </span>

                <strong>
                  {formatCurrency(
                    success.total,
                    success.currency ||
                      currency,
                  )}
                </strong>
              </div>
            </div>

            <div className="travel-booking-payment-status">
              <span>
                Payment status
              </span>

              <strong>
                {success.paymentStatus}
              </strong>
            </div>
          </div>

          <div className="travel-booking-success-actions">
            <Link
              to="/travel/my-trips"
              className="travel-booking-primary-button"
            >
              View my trips
            </Link>

            <Link
              to="/travel/stays"
              className="travel-booking-secondary-button"
            >
              Browse more stays
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="travel-booking-page">
        <div className="travel-booking-error-state">
          <div className="travel-booking-error-icon">
            <AlertCircle size={38} />
          </div>

          <h1>
            Unable to load this stay
          </h1>

          <p>
            {error ||
              "The selected travel listing could not be found."}
          </p>

          <div className="travel-booking-error-actions">
            <button
              type="button"
              onClick={() =>
                void loadListing()
              }
              className="travel-booking-primary-button"
            >
              Try again
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="travel-booking-secondary-button"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="travel-booking-page">
      <div className="travel-booking-container">
        <button
          type="button"
          className="travel-booking-back-button"
          onClick={handleBack}
        >
          <ArrowLeft size={18} />
          Back to stay
        </button>

        <div className="travel-booking-header">
          <span className="travel-booking-eyebrow">
            Fockis Travel
          </span>

          <h1>
            Complete your booking
          </h1>

          <p>
            Review your stay details
            and submit your booking.
          </p>
        </div>

        {error && (
          <div
            className="travel-booking-alert"
            role="alert"
          >
            <AlertCircle size={20} />

            <div>
              <strong>
                Booking could not be
                completed
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        <form
          className="travel-booking-layout"
          onSubmit={handleSubmit}
        >
          <section className="travel-booking-main">
            <div className="travel-booking-card">
              <div className="travel-booking-listing-preview">
                <img
                  src={listingImage}
                  alt={listing.name}
                />

                <div>
                  <h2>
                    {listing.name}
                  </h2>

                  {location && (
                    <p>
                      <MapPin size={16} />
                      {location}
                    </p>
                  )}

                  <div className="travel-booking-price-preview">
                    <strong>
                      {formatCurrency(
                        price,
                        currency,
                      )}
                    </strong>

                    <span>
                      /{" "}
                      {getPriceUnitLabel(
                        priceUnit,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="travel-booking-card">
              <div className="travel-booking-card-header">
                <div>
                  <span className="travel-booking-card-eyebrow">
                    01
                  </span>

                  <h2>
                    Booking dates
                  </h2>

                  <p>
                    Choose when you want
                    to stay.
                  </p>
                </div>

                <CalendarDays size={24} />
              </div>

              <div className="travel-booking-form-grid">
                <label className="travel-booking-field">
                  <span>
                    Check-in date
                  </span>

                  <input
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(event) =>
                      handleCheckInChange(
                        event.target
                          .value,
                      )
                    }
                    required
                  />
                </label>

                <label className="travel-booking-field">
                  <span>
                    Check-out date
                  </span>

                  <input
                    type="date"
                    value={checkOut}
                    min={
                      checkIn ||
                      tomorrow
                    }
                    onChange={(event) =>
                      handleCheckOutChange(
                        event.target
                          .value,
                      )
                    }
                    required
                  />
                </label>
              </div>

              <div className="travel-booking-form-grid">
                <label className="travel-booking-field">
                  <span>
                    Check-in time
                  </span>

                  <div className="travel-booking-input-with-icon">
                    <Clock3 size={17} />

                    <input
                      type="time"
                      value={startTime}
                      onChange={(event) =>
                        setStartTime(
                          event.target
                            .value,
                        )
                      }
                      required
                    />
                  </div>
                </label>

                <label className="travel-booking-field">
                  <span>
                    Check-out time
                  </span>

                  <div className="travel-booking-input-with-icon">
                    <Clock3 size={17} />

                    <input
                      type="time"
                      value={endTime}
                      onChange={(event) =>
                        setEndTime(
                          event.target
                            .value,
                        )
                      }
                      required
                    />
                  </div>
                </label>
              </div>

              <div className="travel-booking-date-summary">
                <CalendarDays size={18} />

                <div>
                  <strong>
                    {formatDate(
                      checkIn,
                    )}{" "}
                    →{" "}
                    {formatDate(
                      checkOut,
                    )}
                  </strong>

                  <span>
                    {durationDays > 0
                      ? durationLabel
                      : "Select valid dates"}
                  </span>
                </div>
              </div>
            </div>

            <div className="travel-booking-card">
              <div className="travel-booking-card-header">
                <div>
                  <span className="travel-booking-card-eyebrow">
                    02
                  </span>

                  <h2>
                    Guests and quantity
                  </h2>

                  <p>
                    Tell us how many
                    people are traveling.
                  </p>
                </div>

                <Users size={24} />
              </div>

              <div className="travel-booking-form-grid">
                <label className="travel-booking-field">
                  <span>
                    Guests
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={guests}
                    onChange={(event) =>
                      setGuests(
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value,
                          ) || 1,
                        ),
                      )
                    }
                    required
                  />
                </label>

                <label className="travel-booking-field">
                  <span>
                    Quantity
                  </span>

                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        Math.max(
                          1,
                          Number(
                            event.target
                              .value,
                          ) || 1,
                        ),
                      )
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <div className="travel-booking-card">
              <div className="travel-booking-card-header">
                <div>
                  <span className="travel-booking-card-eyebrow">
                    03
                  </span>

                  <h2>
                    Additional notes
                  </h2>

                  <p>
                    Add anything you
                    would like the
                    partner to know.
                  </p>
                </div>
              </div>

              <label className="travel-booking-field">
                <span>
                  Notes{" "}
                  <small>
                    (optional)
                  </small>
                </span>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target
                        .value,
                    )
                  }
                  rows={5}
                  maxLength={1000}
                  placeholder="Special requests, arrival information, accessibility needs, or other notes..."
                />

                <small className="travel-booking-character-count">
                  {notes.length}/1000
                </small>
              </label>
            </div>
          </section>

          <aside className="travel-booking-sidebar">
            <div className="travel-booking-card travel-booking-summary-card">
              <div className="travel-booking-summary-header">
                <h2>
                  Booking summary
                </h2>

                <span>
                  {listing.active
                    ? "Available"
                    : "Unavailable"}
                </span>
              </div>

              <div className="travel-booking-summary-dates">
                <div>
                  <span>
                    Check-in
                  </span>

                  <strong>
                    {formatDate(
                      checkIn,
                    )}
                  </strong>

                  <small>
                    {startTime}
                  </small>
                </div>

                <div>
                  <span>
                    Check-out
                  </span>

                  <strong>
                    {formatDate(
                      checkOut,
                    )}
                  </strong>

                  <small>
                    {endTime}
                  </small>
                </div>
              </div>

              <div className="travel-booking-summary-row">
                <span>
                  {formatCurrency(
                    price,
                    currency,
                  )}{" "}
                  × {multiplier}{" "}
                  {getPriceUnitLabel(
                    priceUnit,
                  )}
                  {multiplier !== 1
                    ? "s"
                    : ""}
                </span>

                <strong>
                  {formatCurrency(
                    estimatedSubtotal,
                    currency,
                  )}
                </strong>
              </div>

              <div className="travel-booking-summary-row">
                <span>
                  Service fee
                </span>

                <strong>
                  {formatCurrency(
                    estimatedFees,
                    currency,
                  )}
                </strong>
              </div>

              <div className="travel-booking-summary-row">
                <span>
                  Estimated tax
                </span>

                <strong>
                  {formatCurrency(
                    estimatedTax,
                    currency,
                  )}
                </strong>
              </div>

              <div className="travel-booking-summary-total">
                <span>
                  Estimated total
                </span>

                <strong>
                  {formatCurrency(
                    estimatedTotal,
                    currency,
                  )}
                </strong>
              </div>

              <button
                type="submit"
                className="travel-booking-submit-button"
                disabled={
                  submitting ||
                  !listing.active
                }
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={19}
                      className="travel-booking-spinner"
                    />

                    Creating booking...
                  </>
                ) : (
                  "Confirm booking"
                )}
              </button>

              <p className="travel-booking-disclaimer">
                Your booking will use
                the final pricing
                calculated by the
                Fockis Travel backend.
              </p>
            </div>

            <div className="travel-booking-card travel-booking-help-card">
              <h3>
                Booking details
              </h3>

              <p>
                Your booking is created
                under your Fockis
                account and will appear
                in My Trips after it is
                successfully submitted.
              </p>

              <Link
                to="/travel/my-trips"
                className="travel-booking-text-link"
              >
                View my trips
              </Link>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}