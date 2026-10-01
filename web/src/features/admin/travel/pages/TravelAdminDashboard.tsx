import { FOCKIS_API_URL } from "../../../../config/fockisConfig";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import type {
  PaginatedResult,
  TravelAdminStats,
  AdminTravelPartner,
} from "../types/travelAdmin.types";
import "../styles/TravelAdminDashboard.scss";

interface TravelUser {
  id?: string;
  _id?: string;
}

const DEFAULT_API_BASE_URL = FOCKIS_API_URL;

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ??
    import.meta.env.VITE_API_BASE_URL ??
    DEFAULT_API_BASE_URL,
).replace(/\/+$/, "");

function formatCurrency(
  amount: number,
  currency: string,
): string {
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

async function fetchTravelUserCount(): Promise<number> {
  const result =
    await travelPartnerAdminApi.getUsers({
      page: 1,
      limit: 1,
    });

  if (
    result &&
    typeof result.total === "number" &&
    Number.isFinite(result.total)
  ) {
    return result.total;
  }

  if (Array.isArray(result.data)) {
    return result.data.length;
  }

  if (Array.isArray(result.users)) {
    return result.users.length;
  }

  if (Array.isArray(result.items)) {
    return result.items.length;
  }

  return 0;
}

export default function TravelAdminDashboard() {
  const [stats, setStats] =
    useState<TravelAdminStats | null>(null);

  const [userCount, setUserCount] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");

  const loadDashboard = useCallback(
    async (): Promise<void> => {
      setLoading(true);
      setError("");

      try {
        const [statsResult, usersResult] =
          await Promise.all([
            travelPartnerAdminApi.getStats(),
            fetchTravelUserCount(),
          ]);

        setStats(statsResult);
        setUserCount(usersResult);
      } catch (err) {
        console.error(
          "Failed to load Travel admin dashboard:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load Travel admin dashboard right now.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="travel-admin-dashboard">
      <div className="travel-admin-page-head">
        <h1>Travel Dashboard</h1>

        <p>
          Overview of partners, listings, bookings,
          and users across Fockis Travel.
        </p>
      </div>

      {error && (
        <div className="admin-panel admin-panel-error">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="admin-panel">
          Loading dashboard…
        </div>
      ) : (
        <div className="travel-stat-grid">
          <div className="travel-stat-card">
            <span className="label">
              Travel users
            </span>

            <span className="value">
              {userCount ?? "—"}
            </span>

            <p className="sub">
              Manage users who use Fockis Travel.
            </p>

            <Link to="/admin/travel/users">
              Manage users →
            </Link>
          </div>

          <div className="travel-stat-card">
            <span className="label">
              Active partners
            </span>

            <span className="value">
              {stats?.activePartners ?? "—"}

              <span className="sub">
                {" "}
                / {stats?.totalPartners ?? "—"}
              </span>
            </span>

            <Link to="/admin/travel/partners">
              Manage partners →
            </Link>
          </div>

          <div className="travel-stat-card highlight">
            <span className="label">
              Pending applications
            </span>

            <span className="value">
              {stats?.pendingApplications ?? "—"}
            </span>

            <Link to="/admin/travel/applications">
              Review applications →
            </Link>
          </div>

          <div className="travel-stat-card">
            <span className="label">
              Published listings
            </span>

            <span className="value">
              {stats?.publishedListings ?? "—"}

              <span className="sub">
                {" "}
                / {stats?.totalListings ?? "—"}
              </span>
            </span>

            <Link to="/admin/travel/listings">
              View listings →
            </Link>
          </div>

          <div className="travel-stat-card warning">
            <span className="label">
              Pending review
            </span>

            <span className="value">
              {stats?.pendingReviewListings ?? "—"}
            </span>

            <Link to="/admin/travel/listings?status=pending_review">
              Review now →
            </Link>
          </div>

          <div className="travel-stat-card danger">
            <span className="label">
              Flagged listings
            </span>

            <span className="value">
              {stats?.flaggedListings ?? "—"}
            </span>

            <Link to="/admin/travel/listings?flaggedOnly=true">
              Investigate →
            </Link>
          </div>

          <div className="travel-stat-card">
            <span className="label">
              Bookings this month
            </span>

            <span className="value">
              {stats?.totalBookingsThisMonth ?? "—"}
            </span>

            <Link to="/admin/travel/bookings">
              View bookings →
            </Link>
          </div>

          <div className="travel-stat-card">
            <span className="label">
              Revenue this month
            </span>

            <span className="value">
              {stats
                ? formatCurrency(
                    stats.revenueThisMonth,
                    stats.currency,
                  )
                : "—"}
            </span>

            <Link to="/admin/travel/bookings">
              View booking revenue →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}