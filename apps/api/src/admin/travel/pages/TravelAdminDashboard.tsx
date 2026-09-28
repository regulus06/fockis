import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import type { TravelAdminStats } from "../types/travelAdmin.types";
import "../styles/TravelAdminDashboard.scss";

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export default function TravelAdminDashboard() {
  const [stats, setStats] = useState<TravelAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await travelPartnerAdminApi.getStats();
      setStats(result);
    } catch {
      setError("Unable to load Travel admin stats right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <div className="travel-admin-dashboard">
      <div className="travel-admin-page-head">
        <h1>Travel Dashboard</h1>
        <p>Overview of partners, listings and bookings across Fockis Travel.</p>
      </div>

      {error && <div className="admin-panel admin-panel-error">{error}</div>}

      {loading && !stats ? (
        <div className="admin-panel">Loading dashboard…</div>
      ) : (
        <>
          <div className="travel-stat-grid">
            <div className="travel-stat-card">
              <span className="label">Active partners</span>
              <span className="value">
                {stats?.activePartners ?? "—"}
                <span className="sub"> / {stats?.totalPartners ?? "—"}</span>
              </span>
              <Link to="/admin/travel/partners">Manage partners →</Link>
            </div>

            <div className="travel-stat-card highlight">
              <span className="label">Pending applications</span>
              <span className="value">{stats?.pendingApplications ?? "—"}</span>
              <Link to="/admin/travel/applications">Review applications →</Link>
            </div>

            <div className="travel-stat-card">
              <span className="label">Published listings</span>
              <span className="value">
                {stats?.publishedListings ?? "—"}
                <span className="sub"> / {stats?.totalListings ?? "—"}</span>
              </span>
              <Link to="/admin/travel/listings">View listings →</Link>
            </div>

            <div className="travel-stat-card warning">
              <span className="label">Pending review</span>
              <span className="value">{stats?.pendingReviewListings ?? "—"}</span>
              <Link to="/admin/travel/listings?status=pending_review">
                Review now →
              </Link>
            </div>

            <div className="travel-stat-card danger">
              <span className="label">Flagged listings</span>
              <span className="value">{stats?.flaggedListings ?? "—"}</span>
              <Link to="/admin/travel/listings?flaggedOnly=true">
                Investigate →
              </Link>
            </div>

            <div className="travel-stat-card">
              <span className="label">Bookings this month</span>
              <span className="value">{stats?.totalBookingsThisMonth ?? "—"}</span>
              <Link to="/admin/travel/bookings">View bookings →</Link>
            </div>

            <div className="travel-stat-card">
              <span className="label">Revenue this month</span>
              <span className="value">
                {stats
                  ? formatCurrency(stats.revenueThisMonth, stats.currency)
                  : "—"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
