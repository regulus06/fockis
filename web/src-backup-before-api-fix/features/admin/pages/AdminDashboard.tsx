import { Link } from "react-router-dom";

import StatCard from "../components/StatCard";
import AdminSidebar from "../components/AdminSidebar";
import AdminTopbar from "../components/AdminTopbar";

import {
  useMarketplaceDashboard,
} from "../hooks/useMarketplaceDashboard";

import "../styles/AdminDashboard.scss";

export default function AdminDashboard() {
  const {
    dashboard,
    loading,
  } = useMarketplaceDashboard();

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-content">
        <AdminTopbar />

        {/* ================================================================
            PAGE HEADER
        ================================================================ */}

        <section className="admin-dashboard-header">
          <div>
            <h1>Admin Dashboard</h1>

            <p>
              Manage Fockis platform operations, marketplace activity,
              domains, users, and system settings.
            </p>
          </div>

          <div className="admin-dashboard-actions">
            <Link
              to="/admin/domains"
              className="admin-dashboard-action"
            >
              🌐 Domain Administration
            </Link>
          </div>
        </section>

        {/* ================================================================
            MARKETPLACE STATS
        ================================================================ */}

        <section className="stats">
          <StatCard
            title="Total Products"
            value={
              loading
                ? "..."
                : dashboard?.products ?? 0
            }
            icon="📦"
          />

          <StatCard
            title="Total Orders"
            value={
              loading
                ? "..."
                : dashboard?.orders ?? 0
            }
            icon="🛒"
          />

          <StatCard
            title="Revenue"
            value={
              loading
                ? "..."
                : `$${dashboard?.revenue ?? 0}`
            }
            icon="💰"
          />

          <StatCard
            title="Sellers"
            value={
              loading
                ? "..."
                : dashboard?.sellers ?? 0
            }
            icon="🏪"
          />
        </section>

        {/* ================================================================
            ADMIN MODULES
        ================================================================ */}

        <section className="dashboard-grid">
          {/* --------------------------------------------------------------
              MARKETPLACE
          -------------------------------------------------------------- */}

          <div className="dashboard-box">
            <h3>
              Marketplace Activity
            </h3>

            <p>
              Dashboard data loaded from marketplace API.
            </p>
          </div>

          {/* --------------------------------------------------------------
              RECENT ORDERS
          -------------------------------------------------------------- */}

          <div className="dashboard-box">
            <h3>
              Recent Orders
            </h3>

            <p>
              Order analytics will appear here.
            </p>
          </div>

          {/* --------------------------------------------------------------
              DOMAIN ADMINISTRATION
          -------------------------------------------------------------- */}

          <div className="dashboard-box dashboard-box-domain">
            <div className="dashboard-box-icon">
              🌐
            </div>

            <div className="dashboard-box-content">
              <h3>
                Domain Administration
              </h3>

              <p>
                Control free domains, paid domains, pricing,
                promotional campaigns, authorizations, and
                domain assignments.
              </p>

              <Link
                to="/admin/domains"
                className="dashboard-box-button"
              >
                Open Domain Administration
              </Link>
            </div>
          </div>

          {/* --------------------------------------------------------------
              SYSTEM SETTINGS
          -------------------------------------------------------------- */}

          <div className="dashboard-box">
            <h3>
              System Administration
            </h3>

            <p>
              Manage platform-wide configuration and feature
              controls.
            </p>

            <Link
              to="/admin/system/settings"
              className="dashboard-box-button"
            >
              System Settings
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}