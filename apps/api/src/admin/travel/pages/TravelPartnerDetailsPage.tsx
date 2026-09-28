import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import TravelPartnerStatusBadge from "../components/TravelPartnerStatusBadge";
import type {
  AdminTravelBooking,
  AdminTravelListing,
  AdminTravelPartner,
} from "../types/travelAdmin.types";
import "../styles/TravelPartnerDetails.scss";

export default function TravelPartnerDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [partner, setPartner] = useState<AdminTravelPartner | null>(null);
  const [listings, setListings] = useState<AdminTravelListing[]>([]);
  const [bookings, setBookings] = useState<AdminTravelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      travelPartnerAdminApi.getPartner(id),
      travelPartnerAdminApi.getPartnerListings(id),
      travelPartnerAdminApi.getPartnerBookings(id),
    ]);

    const [partnerResult, listingsResult, bookingsResult] = results;

    if (partnerResult.status === "fulfilled") {
      setPartner(partnerResult.value);
    } else {
      setError("Unable to load this partner.");
    }

    setListings(
      listingsResult.status === "fulfilled" ? listingsResult.value.items : [],
    );

    setBookings(
      bookingsResult.status === "fulfilled" ? bookingsResult.value.items : [],
    );

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSuspend = useCallback(async () => {
    if (!id) return;

    const reason = window.prompt("Reason for suspending this partner:");
    if (reason === null) return;

    try {
      await travelPartnerAdminApi.updatePartnerStatus(
        id,
        "suspended",
        reason,
      );
      await load();
    } catch {
      setError("Unable to suspend this partner right now.");
    }
  }, [id, load]);

  const handleReactivate = useCallback(async () => {
    if (!id) return;

    try {
      await travelPartnerAdminApi.updatePartnerStatus(id, "active");
      await load();
    } catch {
      setError("Unable to reactivate this partner right now.");
    }
  }, [id, load]);

  if (loading) {
    return <div className="admin-panel">Loading partner…</div>;
  }

  if (error || !partner) {
    return (
      <div className="admin-panel admin-panel-error">
        {error || "Partner not found."}
      </div>
    );
  }

  return (
    <div className="travel-partner-details-page">
      <Link to="/admin/travel/partners" className="back-link">
        ← All partners
      </Link>

      <div className="travel-admin-page-head">
        <div>
          <h1>{partner.businessName}</h1>

          <p>
            {[partner.city, partner.country].filter(Boolean).join(", ") ||
              "Location unavailable"}
            {" · "}
            {partner.categories.join(", ")}
          </p>
        </div>

        <TravelPartnerStatusBadge status={partner.status} />
      </div>

      <div className="travel-stat-grid">
        <div className="travel-stat-card">
          <span className="label">Listings</span>
          <span className="value">
            {partner.activeListingCount} / {partner.listingCount}
          </span>
        </div>

        <div className="travel-stat-card">
          <span className="label">Total bookings</span>
          <span className="value">{partner.totalBookings}</span>
        </div>

        <div className="travel-stat-card">
          <span className="label">Rating</span>
          <span className="value">
            {partner.rating ? partner.rating.toFixed(1) : "—"}
          </span>
        </div>
      </div>

      <div className="travel-admin-actions-row">
        {partner.status === "active" ? (
          <button
            type="button"
            className="btn btn-reject"
            onClick={handleSuspend}
          >
            Suspend partner
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-approve"
            onClick={handleReactivate}
          >
            Reactivate partner
          </button>
        )}
      </div>

      <section>
        <h2>Listings</h2>

        {listings.length === 0 ? (
          <div className="admin-panel">This partner has no listings yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Bookings</th>
                </tr>
              </thead>

              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <Link to={`/admin/travel/listings/${listing.id}`}>
                        {listing.name}
                      </Link>
                    </td>
                    <td>{listing.type}</td>
                    <td>{listing.status}</td>
                    <td>{listing.bookingCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2>Recent bookings</h2>

        {bookings.length === 0 ? (
          <div className="admin-panel">No bookings yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.listingName}</td>
                    <td>{booking.customerName}</td>
                    <td>{booking.status}</td>
                    <td>
                      {booking.currency} {booking.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
