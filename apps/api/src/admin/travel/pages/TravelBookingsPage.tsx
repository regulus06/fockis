import { useCallback, useEffect, useState } from "react";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import type {
  AdminTravelBooking,
  TravelBookingFilters,
  TravelBookingStatus,
} from "../types/travelAdmin.types";

const BOOKING_STATUSES: Array<TravelBookingStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
];

export default function TravelBookingsPage() {
  const [bookings, setBookings] = useState<AdminTravelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    TravelBookingStatus | "all"
  >("all");
  const [search, setSearch] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    const filters: TravelBookingFilters = {
      status: statusFilter,
      search: search.trim() || undefined,
      limit: 50,
    };

    try {
      const result = await travelPartnerAdminApi.getBookings(filters);
      setBookings(result.items);
    } catch {
      setError("Unable to load bookings right now.");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  return (
    <div className="travel-bookings-page">
      <div className="travel-admin-page-head">
        <h1>Travel Bookings</h1>
        <p>Every reservation made across Fockis Travel partners.</p>
      </div>

      {error && <div className="admin-panel admin-panel-error">{error}</div>}

      <div className="travel-admin-filters">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as TravelBookingStatus | "all")
          }
        >
          {BOOKING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status}
            </option>
          ))}
        </select>

        <input
          type="search"
          placeholder="Search by customer, listing or partner"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="admin-panel">Loading bookings…</div>
      ) : bookings.length === 0 ? (
        <div className="admin-panel">No bookings match these filters.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Partner</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.listingName}</td>
                  <td>{booking.partnerName}</td>
                  <td>
                    {booking.customerName}
                    <div className="admin-table-subtext">
                      {booking.customerEmail}
                    </div>
                  </td>
                  <td>{booking.status}</td>
                  <td>
                    {booking.currency} {booking.amount}
                  </td>
                  <td>
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
