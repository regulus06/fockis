import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import type {
  AdminTravelListing,
  TravelListingFilters,
  TravelListingStatus,
  TravelListingType,
} from "../types/travelAdmin.types";
import "../styles/TravelListings.scss";

const LISTING_TYPES: Array<TravelListingType | "all"> = [
  "all",
  "stay",
  "rental",
  "meeting",
  "event",
  "restaurant",
  "car",
  "flight",
  "transfer",
  "experience",
  "attraction",
  "thing",
];

const LISTING_STATUSES: Array<TravelListingStatus | "all"> = [
  "all",
  "draft",
  "pending_review",
  "published",
  "suspended",
  "archived",
  "rejected",
];

export default function TravelListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [listings, setListings] = useState<AdminTravelListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const statusFilter =
    (searchParams.get("status") as TravelListingStatus | "all") ?? "all";

  const typeFilter =
    (searchParams.get("type") as TravelListingType | "all") ?? "all";

  const flaggedOnly = searchParams.get("flaggedOnly") === "true";
  const [search, setSearch] = useState("");

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError("");

    const filters: TravelListingFilters = {
      status: statusFilter,
      type: typeFilter,
      flaggedOnly: flaggedOnly || undefined,
      search: search.trim() || undefined,
      limit: 50,
    };

    try {
      const result = await travelPartnerAdminApi.getListings(filters);
      setListings(result.items);
    } catch {
      setError("Unable to load listings right now.");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, flaggedOnly, search]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);

        if (value === "all" || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }

        return next;
      });
    },
    [setSearchParams],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: TravelListingStatus) => {
      let reason: string | undefined;

      if (status === "suspended" || status === "rejected") {
        reason =
          window.prompt(`Reason for marking this listing "${status}":`) ??
          undefined;

        if (reason === undefined) return;
      }

      try {
        await travelPartnerAdminApi.updateListingStatus(id, status, reason);
        await loadListings();
      } catch {
        setError("Unable to update this listing right now.");
      }
    },
    [loadListings],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Permanently delete this listing?")) return;

      try {
        await travelPartnerAdminApi.deleteListing(id);
        await loadListings();
      } catch {
        setError("Unable to delete this listing right now.");
      }
    },
    [loadListings],
  );

  return (
    <div className="travel-listings-page">
      <div className="travel-admin-page-head">
        <h1>Travel Listings</h1>
        <p>Moderate stays, restaurants, cars and every other listing type.</p>
      </div>

      {error && <div className="admin-panel admin-panel-error">{error}</div>}

      <div className="travel-admin-filters">
        <select
          value={statusFilter}
          onChange={(event) => updateParam("status", event.target.value)}
        >
          {LISTING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All statuses" : status.replace("_", " ")}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => updateParam("type", event.target.value)}
        >
          {LISTING_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "all" ? "All types" : type}
            </option>
          ))}
        </select>

        <label className="flagged-toggle">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(event) =>
              updateParam(
                "flaggedOnly",
                event.target.checked ? "true" : "false",
              )
            }
          />
          Flagged only
        </label>

        <input
          type="search"
          placeholder="Search by listing or partner name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="admin-panel">Loading listings…</div>
      ) : listings.length === 0 ? (
        <div className="admin-panel">No listings match these filters.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Type</th>
                <th>Partner</th>
                <th>Status</th>
                <th>Bookings</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {listings.map((listing) => (
                <tr
                  key={listing.id}
                  className={listing.flagged ? "row-flagged" : undefined}
                >
                  <td>
                    <span>{listing.name}</span>

                    {listing.flagged && (
                      <div className="admin-table-subtext flag-note">
                        🚩 {listing.flagReason || "Flagged for review"}
                      </div>
                    )}
                  </td>

                  <td>{listing.type}</td>

                  <td>
                    <Link to={`/admin/travel/partners/${listing.partnerId}`}>
                      {listing.partnerName}
                    </Link>
                  </td>

                  <td>{listing.status.replace("_", " ")}</td>

                  <td>{listing.bookingCount ?? 0}</td>

                  <td>
                    <div className="admin-table-actions">
                      {listing.status !== "published" && (
                        <button
                          type="button"
                          className="btn btn-small btn-approve"
                          onClick={() =>
                            handleStatusChange(listing.id, "published")
                          }
                        >
                          Publish
                        </button>
                      )}

                      {listing.status === "published" && (
                        <button
                          type="button"
                          className="btn btn-small btn-reject"
                          onClick={() =>
                            handleStatusChange(listing.id, "suspended")
                          }
                        >
                          Suspend
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-small btn-ghost"
                        onClick={() => handleDelete(listing.id)}
                      >
                        Delete
                      </button>
                    </div>
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
