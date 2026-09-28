import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  getBookingId,
  type TravelBooking,
} from "../services/bookingsApi";

import {
  travelApi,
  type ApiError,
} from "../services/travelApi";

import "../styles/TravelPartnerReservationsPage.scss";

type TravelCustomer = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  fockisId?: string | null;
  email?: string | null;
  profilePicture?: string | null;
  avatar?: string | null;
};

type TravelListing = {
  name?: string | null;
  title?: string | null;
  type?: string | null;
  category?: string | null;
  city?: string | null;
  country?: string | null;
};

function getCustomer(
  booking: TravelBooking,
): TravelCustomer | null {
  const value = booking.userId;

  if (value && typeof value === "object") {
    return value as TravelCustomer;
  }

  return null;
}

function getListing(
  booking: TravelBooking,
): TravelListing | null {
  const value = booking.listingId;

  if (value && typeof value === "object") {
    return value as TravelListing;
  }

  return null;
}

function getCustomerName(
  booking: TravelBooking,
): string {
  const customer = getCustomer(booking);

  if (!customer) {
    return "Customer";
  }

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .join(" ")
    .trim();

  return (
    fullName ||
    customer.username?.trim() ||
    customer.fockisId?.trim() ||
    "Customer"
  );
}

function getListingName(
  booking: TravelBooking,
): string {
  const listing = getListing(booking);

  if (!listing) {
    return "Travel listing";
  }

  return (
    listing.name?.trim() ||
    listing.title?.trim() ||
    "Travel listing"
  );
}

function getDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
}

function getTime(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function getStartDate(
  booking: TravelBooking,
): string | undefined {
  return (
    booking.startAt ||
    booking.startDate ||
    undefined
  );
}

function getEndDate(
  booking: TravelBooking,
): string | undefined {
  return (
    booking.endAt ||
    booking.endDate ||
    undefined
  );
}

function getStatusClass(
  status?: string | null,
): string {
  const normalized = String(
    status || "pending",
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  switch (normalized) {
    case "confirmed":
      return "confirmed";

    case "completed":
      return "completed";

    case "cancelled":
    case "canceled":
    case "rejected":
      return "cancelled";

    case "refunded":
      return "refunded";

    case "pending":
    default:
      return "pending";
  }
}

function getStatusLabel(
  status?: string | null,
): string {
  const normalized = String(
    status || "pending",
  )
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "confirmed":
      return "Confirmed";

    case "completed":
      return "Completed";

    case "cancelled":
    case "canceled":
      return "Cancelled";

    case "rejected":
      return "Rejected";

    case "refunded":
      return "Refunded";

    case "pending":
    default:
      return "Pending";
  }
}

function formatMoney(
  amount?: number | null,
  currency?: string | null,
): string {
  const value =
    typeof amount === "number"
      ? amount
      : 0;

  const normalizedCurrency =
    typeof currency === "string" &&
    currency.trim()
      ? currency.trim().toUpperCase()
      : "USD";

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency: normalizedCurrency,
      },
    ).format(value);
  } catch {
    return `${normalizedCurrency} ${value.toFixed(2)}`;
  }
}

function normalizeReservations(
  response: unknown,
): TravelBooking[] {
  if (Array.isArray(response)) {
    return response as TravelBooking[];
  }

  if (
    !response ||
    typeof response !== "object"
  ) {
    return [];
  }

  const value =
    response as Record<
      string,
      unknown
    >;

  if (Array.isArray(value.items)) {
    return value.items as TravelBooking[];
  }

  if (Array.isArray(value.bookings)) {
    return value.bookings as TravelBooking[];
  }

  if (Array.isArray(value.results)) {
    return value.results as TravelBooking[];
  }

  if (Array.isArray(value.data)) {
    return value.data as TravelBooking[];
  }

  if (
    value.data &&
    typeof value.data === "object"
  ) {
    const nested =
      value.data as Record<
        string,
        unknown
      >;

    if (Array.isArray(nested.items)) {
      return nested.items as TravelBooking[];
    }

    if (Array.isArray(nested.bookings)) {
      return nested.bookings as TravelBooking[];
    }

    if (Array.isArray(nested.results)) {
      return nested.results as TravelBooking[];
    }
  }

  return [];
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === "object"
  ) {
    const apiError =
      error as Partial<ApiError>;

    if (
      typeof apiError.message ===
        "string" &&
      apiError.message.trim()
    ) {
      return apiError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load reservations.";
}

export default function TravelPartnerReservationsPage(): React.ReactElement {
  const [
    reservations,
    setReservations,
  ] = useState<TravelBooking[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(null);

  const mountedRef =
    useRef(true);

  const requestInFlightRef =
    useRef(false);

  const loadReservations =
    useCallback(
      async (
        backgroundRefresh = false,
      ): Promise<void> => {
        if (
          requestInFlightRef.current
        ) {
          return;
        }

        requestInFlightRef.current =
          true;

        try {
          if (backgroundRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          console.log(
            "[Travel Partner Reservations] Loading partner reservations...",
          );

          const response =
            await travelApi.get<unknown>(
              "/travel/partner/bookings",
            );

          console.log(
            "[Travel Partner Reservations] Backend response:",
            response,
          );

          const nextReservations =
            normalizeReservations(
              response,
            );

          console.log(
            "[Travel Partner Reservations] Reservations received:",
            nextReservations.length,
          );

          if (!mountedRef.current) {
            return;
          }

          setReservations(
            nextReservations,
          );

          setLastUpdated(
            new Date(),
          );
        } catch (
          caughtError: unknown
        ) {
          console.error(
            "[Travel Partner Reservations] Failed to load reservations:",
            caughtError,
          );

          if (
            !mountedRef.current
          ) {
            return;
          }

          setError(
            getErrorMessage(
              caughtError,
            ),
          );
        } finally {
          requestInFlightRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      },
      [],
    );

  useEffect(() => {
    mountedRef.current = true;

    void loadReservations(false);

    return () => {
      mountedRef.current = false;
    };
  }, [loadReservations]);

  const filteredReservations =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return reservations.filter(
        (booking) => {
          const customerName =
            getCustomerName(
              booking,
            );

          const listingName =
            getListingName(
              booking,
            );

          const bookingCode =
            booking.bookingCode || "";

          const customer =
            getCustomer(booking);

          const fockisId =
            customer?.fockisId || "";

          const normalizedStatus =
            String(
              booking.status ||
                "pending",
            )
              .trim()
              .toLowerCase();

          const matchesSearch =
            !normalizedSearch ||
            customerName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            listingName
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            bookingCode
              .toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            fockisId
              .toLowerCase()
              .includes(
                normalizedSearch,
              );

          const matchesStatus =
            statusFilter === "all" ||
            normalizedStatus ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      reservations,
      search,
      statusFilter,
    ]);

  const counts = useMemo(
    () => ({
      all: reservations.length,

      pending:
        reservations.filter(
          (booking) =>
            String(
              booking.status ||
                "pending",
            )
              .trim()
              .toLowerCase() ===
            "pending",
        ).length,

      confirmed:
        reservations.filter(
          (booking) =>
            String(
              booking.status ||
                "",
            )
              .trim()
              .toLowerCase() ===
            "confirmed",
        ).length,

      completed:
        reservations.filter(
          (booking) =>
            String(
              booking.status ||
                "",
            )
              .trim()
              .toLowerCase() ===
            "completed",
        ).length,

      cancelled:
        reservations.filter(
          (booking) => {
            const status =
              String(
                booking.status ||
                  "",
              )
                .trim()
                .toLowerCase();

            return (
              status ===
                "cancelled" ||
              status ===
                "canceled" ||
              status ===
                "rejected"
            );
          },
        ).length,
    }),
    [reservations],
  );

  return (
    <div className="travel-partner-reservations-page">
      <div className="travel-partner-reservations-container">
        <header className="travel-partner-reservations-header">
          <div>
            <Link
              to="/travel/management"
              className="travel-partner-reservations-back"
            >
              ← Back to management
            </Link>

            <h1>
              Reservations
            </h1>

            <p>
              Manage bookings,
              customers,
              payments, and
              reservation status
              for your Travel
              listings.
            </p>
          </div>

          <div className="travel-partner-reservations-header-actions">
            <button
              type="button"
              className="travel-partner-reservations-refresh"
              onClick={() =>
                void loadReservations(
                  true,
                )
              }
              disabled={
                loading ||
                refreshing
              }
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            {lastUpdated && (
              <div className="travel-partner-reservations-updated">
                Updated{" "}
                {lastUpdated.toLocaleTimeString(
                  undefined,
                  {
                    hour: "numeric",
                    minute:
                      "2-digit",
                    second:
                      "2-digit",
                  },
                )}
              </div>
            )}
          </div>
        </header>

        <section
          className="travel-partner-reservation-stats"
          aria-label="Reservation status filters"
        >
          <button
            type="button"
            className={
              statusFilter ===
              "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setStatusFilter(
                "all",
              )
            }
          >
            <span>
              {counts.all}
            </span>

            <small>
              All
            </small>
          </button>

          <button
            type="button"
            className={
              statusFilter ===
              "pending"
                ? "active"
                : ""
            }
            onClick={() =>
              setStatusFilter(
                "pending",
              )
            }
          >
            <span>
              {counts.pending}
            </span>

            <small>
              Pending
            </small>
          </button>

          <button
            type="button"
            className={
              statusFilter ===
              "confirmed"
                ? "active"
                : ""
            }
            onClick={() =>
              setStatusFilter(
                "confirmed",
              )
            }
          >
            <span>
              {counts.confirmed}
            </span>

            <small>
              Confirmed
            </small>
          </button>

          <button
            type="button"
            className={
              statusFilter ===
              "completed"
                ? "active"
                : ""
            }
            onClick={() =>
              setStatusFilter(
                "completed",
              )
            }
          >
            <span>
              {counts.completed}
            </span>

            <small>
              Completed
            </small>
          </button>

          <button
            type="button"
            className={
              statusFilter ===
              "cancelled"
                ? "active"
                : ""
            }
            onClick={() =>
              setStatusFilter(
                "cancelled",
              )
            }
          >
            <span>
              {counts.cancelled}
            </span>

            <small>
              Cancelled
            </small>
          </button>
        </section>

        <section className="travel-partner-reservations-toolbar">
          <div className="travel-partner-reservations-search">
            <span
              aria-hidden="true"
            >
              🔎
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search customer, Fockis ID, listing, or booking code"
              aria-label="Search reservations"
            />
          </div>
        </section>

        {error && (
          <div
            className="travel-partner-reservations-error"
            role="alert"
          >
            <strong>
              Unable to load
              reservations
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                void loadReservations(
                  true,
                )
              }
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="travel-partner-reservations-loading">
            <div
              className="travel-partner-reservations-spinner"
              aria-hidden="true"
            />

            <h2>
              Loading
              reservations...
            </h2>

            <p>
              Getting your
              latest customer
              bookings.
            </p>
          </div>
        ) : filteredReservations.length ===
          0 ? (
          <div className="travel-partner-reservations-empty">
            <div
              className="travel-partner-reservations-empty-icon"
              aria-hidden="true"
            >
              📅
            </div>

            <h2>
              No reservations
              found
            </h2>

            <p>
              {reservations.length ===
              0
                ? "Reservations made for your Travel listings will appear here automatically."
                : "No reservations match your current search or status filter."}
            </p>

            {(search ||
              statusFilter !==
                "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "all",
                  );
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="travel-partner-reservations-table-card">
            <div className="travel-partner-reservations-table-wrapper">
              <table className="travel-partner-reservations-table">
                <thead>
                  <tr>
                    <th scope="col">
                      Reservation
                    </th>

                    <th scope="col">
                      Customer
                    </th>

                    <th scope="col">
                      Listing
                    </th>

                    <th scope="col">
                      Dates
                    </th>

                    <th scope="col">
                      Guests
                    </th>

                    <th scope="col">
                      Total
                    </th>

                    <th scope="col">
                      Status
                    </th>

                    <th scope="col">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReservations.map(
                    (booking) => {
                      const bookingId =
                        getBookingId(
                          booking,
                        );

                      const customer =
                        getCustomer(
                          booking,
                        );

                      const listing =
                        getListing(
                          booking,
                        );

                      const startDate =
                        getStartDate(
                          booking,
                        );

                      const endDate =
                        getEndDate(
                          booking,
                        );

                      const status =
                        booking.status ||
                        "pending";

                      const customerName =
                        getCustomerName(
                          booking,
                        );

                      const listingName =
                        getListingName(
                          booking,
                        );

                      const rowKey =
                        bookingId ||
                        booking.bookingCode ||
                        `booking-${String(
                          booking.createdAt ||
                            "",
                        )}`;

                      const startTime =
                        getTime(
                          startDate,
                        );

                      const endTime =
                        getTime(
                          endDate,
                        );

                      const guestCount =
                        booking.guests ??
                        booking.quantity ??
                        1;

                      const location =
                        [
                          listing?.city,
                          listing?.country,
                        ]
                          .filter(
                            (
                              value,
                            ): value is string =>
                              typeof value ===
                                "string" &&
                              value.trim()
                                .length >
                                0,
                          )
                          .join(
                            ", ",
                          );

                      return (
                        <tr
                          key={
                            rowKey
                          }
                        >
                          <td>
                            <div className="travel-partner-reservation-code">
                              <strong>
                                {booking.bookingCode ||
                                  bookingId ||
                                  "Reservation"}
                              </strong>

                              <span>
                                {booking.type ||
                                  listing?.type ||
                                  listing?.category ||
                                  "Travel"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="travel-partner-reservation-customer">
                              {customer?.profilePicture ||
                              customer?.avatar ? (
                                <img
                                  src={
                                    customer.profilePicture ||
                                    customer.avatar ||
                                    ""
                                  }
                                  alt=""
                                />
                              ) : (
                                <div
                                  className="travel-partner-reservation-avatar"
                                  aria-hidden="true"
                                >
                                  {customerName
                                    .charAt(
                                      0,
                                    )
                                    .toUpperCase()}
                                </div>
                              )}

                              <div>
                                <strong>
                                  {
                                    customerName
                                  }
                                </strong>

                                {customer?.fockisId ? (
                                  <span>
                                    {
                                      customer.fockisId
                                    }
                                  </span>
                                ) : customer?.email ? (
                                  <span>
                                    {
                                      customer.email
                                    }
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="travel-partner-reservation-listing">
                              <strong>
                                {
                                  listingName
                                }
                              </strong>

                              {location ? (
                                <span>
                                  {
                                    location
                                  }
                                </span>
                              ) : null}
                            </div>
                          </td>

                          <td>
                            <div className="travel-partner-reservation-dates">
                              <strong>
                                {getDate(
                                  startDate,
                                )}
                              </strong>

                              <span>
                                {startTime}

                                {startTime ||
                                endTime
                                  ? " → "
                                  : ""}

                                {getDate(
                                  endDate,
                                )}

                                {endTime
                                  ? ` ${endTime}`
                                  : ""}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="travel-partner-reservation-guests">
                              {
                                guestCount
                              }
                            </span>
                          </td>

                          <td>
                            <strong className="travel-partner-reservation-total">
                              {formatMoney(
                                booking.total,
                                booking.currency,
                              )}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={`travel-partner-reservation-status ${getStatusClass(
                                status,
                              )}`}
                            >
                              {getStatusLabel(
                                status,
                              )}
                            </span>
                          </td>

                          <td>
                            {bookingId ? (
                              <Link
                                to={`/travel/partner/reservations/${encodeURIComponent(
                                  bookingId,
                                )}`}
                                className="travel-partner-reservation-view"
                              >
                                View
                                details
                              </Link>
                            ) : (
                              <span className="travel-partner-reservation-no-action">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}