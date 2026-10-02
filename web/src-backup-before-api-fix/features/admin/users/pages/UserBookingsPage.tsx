import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import adminUsersApi from "../adminUsersApi";
import UserStatusBadge from "../components/UserStatusBadge";
import type { AdminUserBooking } from "../types/adminUsers.types";

const UserBookingsPage: React.FC = () => {
const { id } = useParams<{ id: string }>();

const [bookings, setBookings] = useState<AdminUserBooking[]>([]);
const [status, setStatus] = useState("");
const [type, setType] = useState("");
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const loadBookings = useCallback(async () => {
if (!id) {
setError("No user ID was provided.");
setLoading(false);
return;
}

setLoading(true);
setError("");

try {
  const result = await adminUsersApi.getUserBookings(id, {
    status: status || undefined,
    type: type || undefined,
    limit: 100,
  });

  setBookings(result);
} catch (err) {
  console.error("Failed to load user bookings:", err);

  setError(
    err instanceof Error
      ? err.message
      : "Unable to load user bookings.",
  );

  setBookings([]);
} finally {
  setLoading(false);
}

}, [id, status, type]);

useEffect(() => {
void loadBookings();
}, [loadBookings]);

const totalValue = bookings.reduce(
(sum, booking) =>
sum + Number(booking.total ?? 0),
0,
);

const currency =
bookings.find(
(booking) => booking.currency,
)?.currency ?? "USD";

const confirmedCount = bookings.filter(
(booking) => booking.status === "confirmed",
).length;

const completedCount = bookings.filter(
(booking) => booking.status === "completed",
).length;

const formatDate = (
value?: string | Date | null,
): string => {
if (!value) {
return "—";
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
  return "—";
}

return date.toLocaleDateString();

};

const formatType = (value?: string): string => {
if (!value) {
return "—";
}

return value
  .replace(/_/g, " ")
  .replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );

};

return ( <div className="admin-user-subpage"> <div className="admin-user-subpage__toolbar"> <div>
<Link
to={`/admin/users/${id}`}
className="admin-user-subpage__back"
>
← User Overview </Link>

      <span className="admin-user-subpage__eyebrow">
        USER MANAGEMENT
      </span>

      <h1>Bookings</h1>

      <p>
        View and monitor all travel bookings
        associated with this user.
      </p>
    </div>

    <button
      type="button"
      className="admin-user-subpage__refresh"
      onClick={() => void loadBookings()}
      disabled={loading}
    >
      {loading ? "Loading..." : "↻ Refresh"}
    </button>
  </div>

  <section className="admin-user-subpage__summary">
    <div>
      <span>Total Bookings</span>

      <strong>
        {bookings.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Confirmed</span>

      <strong>
        {confirmedCount.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Completed</span>

      <strong>
        {completedCount.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Total Value</span>

      <strong>
        {currency}{" "}
        {totalValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </strong>
    </div>
  </section>

  <section className="admin-user-subpage__panel">
    <div className="admin-user-subpage__filters">
      <select
        value={status}
        onChange={(event) =>
          setStatus(event.target.value)
        }
        aria-label="Filter bookings by status"
      >
        <option value="">
          All statuses
        </option>

        <option value="pending">
          Pending
        </option>

        <option value="confirmed">
          Confirmed
        </option>

        <option value="cancelled">
          Cancelled
        </option>

        <option value="completed">
          Completed
        </option>

        <option value="refunded">
          Refunded
        </option>
      </select>

      <select
        value={type}
        onChange={(event) =>
          setType(event.target.value)
        }
        aria-label="Filter bookings by type"
      >
        <option value="">
          All booking types
        </option>

        <option value="stay">
          Stay
        </option>

        <option value="rental">
          Rental
        </option>

        <option value="meeting">
          Meeting
        </option>

        <option value="event">
          Event
        </option>

        <option value="restaurant">
          Restaurant
        </option>

        <option value="car">
          Car
        </option>

        <option value="flight">
          Flight
        </option>

        <option value="transfer">
          Transfer
        </option>

        <option value="experience">
          Experience
        </option>

        <option value="attraction">
          Attraction
        </option>

        <option value="thing">
          Thing
        </option>
      </select>
    </div>

    {error && (
      <div
        className="admin-user-subpage__error"
        role="alert"
      >
        <strong>
          Unable to load bookings
        </strong>

        <span>{error}</span>

        <button
          type="button"
          onClick={() => void loadBookings()}
        >
          Try Again
        </button>
      </div>
    )}

    <div className="admin-user-table-wrapper">
      <table className="admin-user-table">
        <thead>
          <tr>
            <th>Booking</th>
            <th>Listing</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Guests</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {loading &&
            Array.from({ length: 6 }).map(
              (_, index) => (
                <tr
                  key={`booking-loading-${index}`}
                >
                  <td colSpan={8}>
                    <div className="admin-user-table__skeleton" />
                  </td>
                </tr>
              ),
            )}

          {!loading &&
            bookings.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="admin-user-table__empty"
                >
                  <strong>
                    No bookings found
                  </strong>

                  <span>
                    This user has no bookings
                    matching the selected
                    filters.
                  </span>
                </td>
              </tr>
            )}

          {!loading &&
            bookings.map(
              (booking, index) => {
                const bookingId =
                  booking._id ??
                  booking.id ??
                  booking.bookingCode ??
                  `booking-${index}`;

                const startDate =
                  formatDate(
                    booking.startAt,
                  );

                const endDate =
                  formatDate(
                    booking.endAt,
                  );

                const bookingCurrency =
                  booking.currency ||
                  currency;

                const bookingTotal =
                  Number(
                    booking.total ?? 0,
                  );

                return (
                  <tr key={bookingId}>
                    <td>
                      <div className="admin-user-table__primary">
                        <strong>
                          {booking.bookingCode ||
                            bookingId}
                        </strong>

                        {booking.createdAt && (
                          <small>
                            Created{" "}
                            {formatDate(
                              booking.createdAt,
                            )}
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="admin-user-table__primary">
                        <strong>
                          {booking.listingName ||
                            "Listing unavailable"}
                        </strong>

                        {booking.partnerName && (
                          <small>
                            {
                              booking.partnerName
                            }
                          </small>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="admin-user-table__type">
                        {formatType(
                          booking.type,
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="admin-user-table__primary">
                        <strong>
                          {startDate}
                        </strong>

                        <small>
                          to {endDate}
                        </small>
                      </div>
                    </td>

                    <td>
                      {Number(
                        booking.guests ?? 0,
                      ).toLocaleString()}
                    </td>

                    <td>
                      <strong>
                        {bookingCurrency}{" "}
                        {bookingTotal.toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </strong>
                    </td>

                    <td>
                      <UserStatusBadge
                        status={
                          booking.paymentStatus ||
                          "unpaid"
                        }
                        size="sm"
                      />
                    </td>

                    <td>
                      <UserStatusBadge
                        status={
                          booking.status ||
                          "unknown"
                        }
                        size="sm"
                      />
                    </td>
                  </tr>
                );
              },
            )}
        </tbody>
      </table>
    </div>
  </section>
</div>

);
};

export default UserBookingsPage;
