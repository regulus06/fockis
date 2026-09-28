import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  bookingsApi,
  getBookingId,
  getCustomerId,
  getListingId,
  type OwnerBookingStatus,
  type TravelBooking,
  type TravelBookingCustomer,
  type TravelBookingListing,
} from "../services/bookingsApi";
import "../styles/TravelPartnerReservationDetailsPage.scss";

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
}

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
}

function formatMoney(
  amount?: number | null,
  currency?: string | null,
): string {
  if (
    amount === undefined ||
    amount === null
  ) {
    return "—";
  }

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
    ).format(amount);
  } catch {
    return `${normalizedCurrency} ${Number(
      amount,
    ).toFixed(2)}`;
  }
}

function getCustomer(
  booking: TravelBooking,
): TravelBookingCustomer | null {
  const value = booking.userId;

  if (
    value &&
    typeof value === "object"
  ) {
    return value as TravelBookingCustomer;
  }

  return null;
}

function getListing(
  booking: TravelBooking,
): TravelBookingListing | null {
  const value = booking.listingId;

  if (
    value &&
    typeof value === "object"
  ) {
    return value as TravelBookingListing;
  }

  return null;
}

function getCustomerName(
  customer: TravelBookingCustomer | null,
): string {
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

  if (fullName) {
    return fullName;
  }

  if (
    typeof customer.username ===
      "string" &&
    customer.username.trim()
  ) {
    return customer.username.trim();
  }

  return "Customer";
}

function getListingName(
  listing: TravelBookingListing | null,
): string {
  if (!listing) {
    return "Travel reservation";
  }

  if (
    typeof listing.name === "string" &&
    listing.name.trim()
  ) {
    return listing.name.trim();
  }

  if (
    typeof listing.title === "string" &&
    listing.title.trim()
  ) {
    return listing.title.trim();
  }

  return "Travel reservation";
}

function getStatusClass(
  status?: string | null,
): string {
  switch (
    String(status || "")
      .trim()
      .toLowerCase()
  ) {
    case "confirmed":
      return "confirmed";

    case "cancelled":
    case "canceled":
    case "rejected":
      return "cancelled";

    case "completed":
      return "completed";

    case "refunded":
      return "refunded";

    default:
      return "pending";
  }
}

function getStatusLabel(
  status?: string | null,
): string {
  if (!status) {
    return "Pending";
  }

  const normalized = String(status)
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "cancelled":
    case "canceled":
      return "Cancelled";

    case "confirmed":
      return "Confirmed";

    case "completed":
      return "Completed";

    case "refunded":
      return "Refunded";

    case "pending":
      return "Pending";

    case "rejected":
      return "Rejected";

    default:
      return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
      );
  }
}

function getPaymentStatusLabel(
  status?: string | null,
): string {
  if (!status) {
    return "Unknown";
  }

  const normalized = String(status)
    .trim()
    .toLowerCase();

  switch (normalized) {
    case "paid":
      return "Paid";

    case "pending":
      return "Pending";

    case "failed":
      return "Failed";

    case "refunded":
      return "Refunded";

    default:
      return (
        status.charAt(0).toUpperCase() +
        status.slice(1)
      );
  }
}

function getInitials(
  customer: TravelBookingCustomer | null,
): string {
  if (!customer) {
    return "C";
  }

  const first =
    typeof customer.firstName ===
    "string"
      ? customer.firstName.charAt(0)
      : "";

  const last =
    typeof customer.lastName ===
    "string"
      ? customer.lastName.charAt(0)
      : "";

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  if (
    typeof customer.username ===
      "string" &&
    customer.username.trim()
  ) {
    return customer.username
      .trim()
      .slice(0, 2)
      .toUpperCase();
  }

  return "C";
}

function getActionErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return "Unable to update this reservation.";
}

export default function TravelPartnerReservationDetailsPage(): React.ReactElement {
  const { id } =
    useParams<{ id: string }>();

  const navigate = useNavigate();

  const [booking, setBooking] =
    useState<TravelBooking | null>(null);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const [actionError, setActionError] =
    useState<string>("");

  const [updating, setUpdating] =
    useState<boolean>(false);

  const [
    customerReservations,
    setCustomerReservations,
  ] = useState<TravelBooking[]>([]);

  const loadBooking =
    useCallback(
      async (): Promise<void> => {
        const cleanId = String(
          id || "",
        ).trim();

        if (!cleanId) {
          setBooking(null);
          setError(
            "Reservation ID is missing.",
          );
          setLoading(false);
          return;
        }

        setLoading(true);
        setError("");
        setActionError("");

        try {
          const result =
            await bookingsApi.getOwnerById(
              cleanId,
            );

          setBooking(result);
        } catch (err) {
          setBooking(null);
          setError(
            getActionErrorMessage(err),
          );
        } finally {
          setLoading(false);
        }
      },
      [id],
    );

  const loadOwnerBookings =
    useCallback(
      async (): Promise<void> => {
        try {
          const results =
            await bookingsApi.listOwnerBookings();

          setCustomerReservations(
            Array.isArray(results)
              ? results
              : [],
          );
        } catch {
          setCustomerReservations([]);
        }
      },
      [],
    );

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    void loadOwnerBookings();
  }, [loadOwnerBookings]);

  const customer = useMemo(
    (): TravelBookingCustomer | null => {
      if (!booking) {
        return null;
      }

      return getCustomer(booking);
    },
    [booking],
  );

  const listing = useMemo(
    (): TravelBookingListing | null => {
      if (!booking) {
        return null;
      }

      return getListing(booking);
    },
    [booking],
  );

  const bookingId = useMemo(() => {
    if (!booking) {
      return "";
    }

    return getBookingId(booking);
  }, [booking]);

  const listingId = useMemo(() => {
    if (!booking) {
      return "";
    }

    return getListingId(booking);
  }, [booking]);

  const customerId = useMemo(() => {
    if (!booking) {
      return "";
    }

    return getCustomerId(booking);
  }, [booking]);

  const customerName = useMemo(
    () => getCustomerName(customer),
    [customer],
  );

  const listingName = useMemo(
    () => getListingName(listing),
    [listing],
  );

  const customerBookingHistory =
    useMemo(() => {
      if (!customerId) {
        return [];
      }

      return customerReservations.filter(
        (item) => {
          const itemCustomerId =
            getCustomerId(item);

          const itemBookingId =
            getBookingId(item);

          return (
            itemCustomerId ===
              customerId &&
            itemBookingId !==
              bookingId
          );
        },
      );
    }, [
      customerId,
      customerReservations,
      bookingId,
    ]);

  const handleStatusUpdate =
    useCallback(
      async (
        status: OwnerBookingStatus,
      ): Promise<void> => {
        const cleanId = String(
          id || "",
        ).trim();

        if (!cleanId) {
          setActionError(
            "Reservation ID is missing.",
          );
          return;
        }

        if (!booking) {
          setActionError(
            "Reservation could not be loaded.",
          );
          return;
        }

        if (updating) {
          return;
        }

        setUpdating(true);
        setActionError("");

        try {
          const updated =
            await bookingsApi.updateOwnerStatus(
              cleanId,
              status,
            );

          setBooking(updated);

          await loadOwnerBookings();
        } catch (err) {
          setActionError(
            getActionErrorMessage(err),
          );
        } finally {
          setUpdating(false);
        }
      },
      [
        booking,
        id,
        updating,
        loadOwnerBookings,
      ],
    );

  const handleConfirm =
    useCallback(
      async (): Promise<void> => {
        await handleStatusUpdate(
          "confirmed",
        );
      },
      [handleStatusUpdate],
    );

  const handleCancel =
    useCallback(
      async (): Promise<void> => {
        const confirmed =
          window.confirm(
            "Are you sure you want to cancel this reservation?",
          );

        if (!confirmed) {
          return;
        }

        await handleStatusUpdate(
          "cancelled",
        );
      },
      [handleStatusUpdate],
    );

  const handleComplete =
    useCallback(
      async (): Promise<void> => {
        await handleStatusUpdate(
          "completed",
        );
      },
      [handleStatusUpdate],
    );

  if (loading) {
    return (
      <main className="travel-page travel-partner-reservation-details-page">
        <div className="travel-container">
          <div className="travel-loading-state">
            <div className="travel-loading-spinner" />

            <p>
              Loading reservation...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="travel-page travel-partner-reservation-details-page">
        <div className="travel-container">
          <button
            type="button"
            className="travel-back-button"
            onClick={() =>
              navigate(
                "/travel/partner/reservations",
              )
            }
          >
            <ArrowLeft size={18} />

            Back to reservations
          </button>

          <div className="travel-error-state">
            <XCircle size={42} />

            <h1>
              Unable to load reservation
            </h1>

            <p>
              {error ||
                "This reservation could not be found."}
            </p>

            <Link
              to="/travel/partner/reservations"
              className="travel-primary-button"
            >
              View reservations
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const status = String(
    booking.status || "pending",
  );

  const normalizedStatus =
    status.trim().toLowerCase();

  const statusClass =
    getStatusClass(status);

  const statusLabel =
    getStatusLabel(status);

  const paymentStatus =
    getPaymentStatusLabel(
      booking.paymentStatus,
    );

  const isConfirmed =
    normalizedStatus === "confirmed";

  const isCancelled =
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled" ||
    normalizedStatus === "rejected";

  const isCompleted =
    normalizedStatus === "completed";

  const canConfirm =
    !isConfirmed &&
    !isCompleted &&
    !isCancelled;

  const canCancel =
    !isCancelled &&
    !isCompleted;

  const canComplete =
    isConfirmed;

  const listingLocation = [
    listing?.city,
    listing?.state,
    listing?.country,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .join(", ");

  const customerAvatar =
    customer?.profilePicture ||
    customer?.avatar ||
    "";

  return (
    <main className="travel-page travel-partner-reservation-details-page">
      <div className="travel-container">
        <div className="travel-page-header">
          <button
            type="button"
            className="travel-back-button"
            onClick={() =>
              navigate(
                "/travel/partner/reservations",
              )
            }
          >
            <ArrowLeft size={18} />

            Back to reservations
          </button>

          <div className="travel-reservation-header">
            <div>
              <span className="travel-eyebrow">
                Reservation management
              </span>

              <h1>
                Reservation{" "}
                {booking.bookingCode ||
                  bookingId ||
                  "—"}
              </h1>

              <p>
                Manage this guest
                reservation, booking
                status, and customer
                information.
              </p>
            </div>

            <div
              className={`travel-status-badge ${statusClass}`}
            >
              {isConfirmed && (
                <CheckCircle2
                  size={16}
                />
              )}

              {isCancelled && (
                <XCircle size={16} />
              )}

              {!isConfirmed &&
                !isCancelled &&
                !isCompleted && (
                  <Clock3 size={16} />
                )}

              {isCompleted && (
                <CheckCircle2
                  size={16}
                />
              )}

              {statusLabel}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="travel-alert travel-alert-error">
            <XCircle size={18} />

            <span>
              {actionError}
            </span>
          </div>
        )}

        <div className="travel-reservation-actions">
          {canConfirm && (
            <button
              type="button"
              className="travel-primary-button"
              onClick={() =>
                void handleConfirm()
              }
              disabled={updating}
            >
              <CheckCircle2 size={18} />

              {updating
                ? "Updating..."
                : "Confirm reservation"}
            </button>
          )}

          {canComplete && (
            <button
              type="button"
              className="travel-primary-button"
              onClick={() =>
                void handleComplete()
              }
              disabled={updating}
            >
              <CheckCircle2 size={18} />

              {updating
                ? "Updating..."
                : "Mark completed"}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              className="travel-secondary-button danger"
              onClick={() =>
                void handleCancel()
              }
              disabled={updating}
            >
              <XCircle size={18} />

              Cancel reservation
            </button>
          )}

          {customerId && (
            <Link
              to={`/messages?userId=${encodeURIComponent(
                customerId,
              )}`}
              className="travel-secondary-button"
            >
              <MessageCircle
                size={18}
              />

              Message customer
            </Link>
          )}
        </div>

        <div className="travel-reservation-grid">
          <section className="travel-card travel-reservation-summary">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Reservation
                </span>

                <h2>
                  Booking details
                </h2>
              </div>

              <CalendarDays
                size={22}
              />
            </div>

            <div className="travel-detail-list">
              <div className="travel-detail-row">
                <span>
                  Booking code
                </span>

                <strong>
                  {booking.bookingCode ||
                    bookingId ||
                    "—"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Status</span>

                <strong>
                  {statusLabel}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>
                  Payment status
                </span>

                <strong>
                  {paymentStatus}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Category</span>

                <strong>
                  {booking.type ||
                    listing?.type ||
                    listing?.category ||
                    "Travel"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Created</span>

                <strong>
                  {formatDateTime(
                    booking.createdAt,
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="travel-card travel-listing-summary">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Listing
                </span>

                <h2>
                  {listingName}
                </h2>
              </div>

              <MapPin size={22} />
            </div>

            <div className="travel-detail-list">
              <div className="travel-detail-row">
                <span>Type</span>

                <strong>
                  {listing?.type ||
                    listing?.category ||
                    booking.type ||
                    "Travel"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Location</span>

                <strong>
                  {listingLocation ||
                    "—"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Address</span>

                <strong>
                  {listing?.address ||
                    "—"}
                </strong>
              </div>

              {listingId && (
                <div className="travel-detail-row">
                  <span>
                    Listing ID
                  </span>

                  <strong>
                    {listingId}
                  </strong>
                </div>
              )}
            </div>

            {listingId && (
              <Link
                to={`/travel/business/${encodeURIComponent(
                  listingId,
                )}`}
                className="travel-inline-link"
              >
                View listing

                <ExternalLink
                  size={15}
                />
              </Link>
            )}
          </section>

          <section className="travel-card travel-date-summary">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Schedule
                </span>

                <h2>
                  Dates and guests
                </h2>
              </div>

              <Clock3 size={22} />
            </div>

            <div className="travel-detail-list">
              <div className="travel-detail-row">
                <span>
                  Check-in / Start
                </span>

                <strong>
                  {formatDateTime(
                    booking.startAt ||
                      booking.startDate,
                  )}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>
                  Check-out / End
                </span>

                <strong>
                  {formatDateTime(
                    booking.endAt ||
                      booking.endDate,
                  )}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Guests</span>

                <strong>
                  {booking.guests ??
                    "—"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Quantity</span>

                <strong>
                  {booking.quantity ??
                    "—"}
                </strong>
              </div>
            </div>
          </section>

          <section className="travel-card travel-pricing-summary">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Payment
                </span>

                <h2>Pricing</h2>
              </div>

              <CreditCard size={22} />
            </div>

            <div className="travel-detail-list">
              <div className="travel-detail-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatMoney(
                    booking.subtotal,
                    booking.currency,
                  )}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Fees</span>

                <strong>
                  {formatMoney(
                    booking.fees,
                    booking.currency,
                  )}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Tax</span>

                <strong>
                  {formatMoney(
                    booking.tax,
                    booking.currency,
                  )}
                </strong>
              </div>

              <div className="travel-detail-row total">
                <span>Total</span>

                <strong>
                  {formatMoney(
                    booking.total,
                    booking.currency,
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="travel-card travel-customer-card">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Customer
                </span>

                <h2>
                  Guest information
                </h2>
              </div>

              <User size={22} />
            </div>

            <div className="travel-customer-profile">
              <div className="travel-customer-avatar">
                {customerAvatar ? (
                  <img
                    src={
                      customerAvatar
                    }
                    alt={customerName}
                  />
                ) : (
                  <span>
                    {getInitials(
                      customer,
                    )}
                  </span>
                )}
              </div>

              <div>
                <h3>
                  {customerName}
                </h3>

                {customer?.username && (
                  <p>
                    @
                    {
                      customer.username
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="travel-detail-list">
              <div className="travel-detail-row">
                <span>
                  Fockis ID
                </span>

                <strong>
                  {customer?.fockisId ||
                    "Not available"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Email</span>

                <strong>
                  {customer?.email ||
                    "Not available"}
                </strong>
              </div>

              <div className="travel-detail-row">
                <span>Phone</span>

                <strong>
                  {customer?.phone ||
                    "Not available"}
                </strong>
              </div>
            </div>

            <div className="travel-customer-actions">
              {customer?.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="travel-secondary-button"
                >
                  <Mail size={17} />
                  Email
                </a>
              )}

              {customer?.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="travel-secondary-button"
                >
                  <Phone size={17} />
                  Call
                </a>
              )}

              {customerId && (
                <Link
                  to={`/messages?userId=${encodeURIComponent(
                    customerId,
                  )}`}
                  className="travel-primary-button"
                >
                  <MessageCircle
                    size={17}
                  />
                  Message
                </Link>
              )}
            </div>
          </section>

          <section className="travel-card travel-notes-card">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Reservation notes
                </span>

                <h2>Notes</h2>
              </div>
            </div>

            <div className="travel-notes-content">
              {booking.notes ? (
                <p>
                  {booking.notes}
                </p>
              ) : (
                <p className="travel-muted">
                  No notes were
                  added to this
                  reservation.
                </p>
              )}
            </div>
          </section>

          <section className="travel-card travel-history-card">
            <div className="travel-card-header">
              <div>
                <span className="travel-section-label">
                  Customer history
                </span>

                <h2>
                  Previous reservations
                </h2>
              </div>
            </div>

            {customerBookingHistory.length ===
            0 ? (
              <div className="travel-empty-state">
                <CalendarDays
                  size={30}
                />

                <p>
                  No previous
                  reservations
                  were found for
                  this customer.
                </p>
              </div>
            ) : (
              <div className="travel-reservation-history">
                {customerBookingHistory.map(
                  (item) => {
                    const itemId =
                      getBookingId(
                        item,
                      );

                    const itemListing =
                      getListing(
                        item,
                      );

                    const historyKey =
                      itemId ||
                      `${item.createdAt || "booking"}-${item.total ?? 0}`;

                    if (!itemId) {
                      return null;
                    }

                    return (
                      <Link
                        key={
                          historyKey
                        }
                        to={`/travel/partner/reservations/${encodeURIComponent(
                          itemId,
                        )}`}
                        className="travel-history-item"
                      >
                        <div>
                          <strong>
                            {item.bookingCode ||
                              itemId ||
                              "Reservation"}
                          </strong>

                          <span>
                            {getListingName(
                              itemListing,
                            )}
                          </span>
                        </div>

                        <div>
                          <strong>
                            {getStatusLabel(
                              item.status,
                            )}
                          </strong>

                          <span>
                            {formatDate(
                              item.createdAt,
                            )}
                          </span>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}