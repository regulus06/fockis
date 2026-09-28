import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import TravelPartnerStatusBadge from "../components/TravelPartnerStatusBadge";
import type {
  AdminTravelPartner,
  TravelPartnerFilters,
  TravelPartnerStatus,
} from "../types/travelAdmin.types";
import "../styles/TravelPartners.scss";

export default function TravelPartnersPage() {
  const [partners, setPartners] = useState<AdminTravelPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    TravelPartnerStatus | "all"
  >("all");
  const [search, setSearch] = useState("");

  const loadPartners = useCallback(async () => {
    setLoading(true);
    setError("");

    const filters: TravelPartnerFilters = {
      status: statusFilter,
      search: search.trim() || undefined,
      limit: 50,
    };

    try {
      const result = await travelPartnerAdminApi.getPartners(filters);
      setPartners(result.items);
    } catch {
      setError("Unable to load partners right now.");
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadPartners();
  }, [loadPartners]);

  const handleStatusChange = useCallback(
    async (id: string, status: TravelPartnerStatus) => {
      let reason: string | undefined;

      if (status === "suspended") {
        reason =
          window.prompt("Reason for suspending this partner:") ?? undefined;

        if (reason === undefined) return;
      }

      try {
        await travelPartnerAdminApi.updatePartnerStatus(id, status, reason);
        await loadPartners();
      } catch {
        setError("Unable to update this partner's status right now.");
      }
    },
    [loadPartners],
  );

  return (
    <div className="travel-partners-page">
      <div className="travel-admin-page-head">
        <h1>Travel Partners</h1>
        <p>Manage the businesses currently active on Fockis Travel.</p>
      </div>

      {error && <div className="admin-panel admin-panel-error">{error}</div>}

      <div className="travel-admin-filters">
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as TravelPartnerStatus | "all")
          }
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deactivated">Deactivated</option>
          <option value="pending">Pending</option>
        </select>

        <input
          type="search"
          placeholder="Search by business name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {loading ? (
        <div className="admin-panel">Loading partners…</div>
      ) : partners.length === 0 ? (
        <div className="admin-panel">No partners match these filters.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Categories</th>
                <th>Location</th>
                <th>Listings</th>
                <th>Bookings</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id}>
                  <td>
                    <Link to={`/admin/travel/partners/${partner.id}`}>
                      {partner.businessName}
                    </Link>
                    <div className="admin-table-subtext">{partner.email}</div>
                  </td>

                  <td>{partner.categories.join(", ") || "—"}</td>

                  <td>
                    {[partner.city, partner.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>

                  <td>
                    {partner.activeListingCount} / {partner.listingCount}
                  </td>

                  <td>{partner.totalBookings}</td>

                  <td>
                    <TravelPartnerStatusBadge status={partner.status} />
                  </td>

                  <td>
                    <div className="admin-table-actions">
                      {partner.status !== "active" && (
                        <button
                          type="button"
                          className="btn btn-small btn-approve"
                          onClick={() =>
                            handleStatusChange(partner.id, "active")
                          }
                        >
                          Activate
                        </button>
                      )}

                      {partner.status === "active" && (
                        <button
                          type="button"
                          className="btn btn-small btn-reject"
                          onClick={() =>
                            handleStatusChange(partner.id, "suspended")
                          }
                        >
                          Suspend
                        </button>
                      )}
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
