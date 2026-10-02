import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { adminApi } from "../service/adminApi";

import type { DashboardStats } from "../types/admin.types";

import { AdminPageHeader } from "../components/AdminPageHeader";

import {
  AdminLoadingState,
  AdminErrorState,
} from "../components/AdminStates";

import { useAdminSessionStore } from "../store/adminSessionStore";

import { roleLabel } from "../components/AdminRoleBadge";

import "../styles/AdminDashboard.scss";

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

interface DashboardStat {
  title: string;
  value: string | number;
  icon: string;
  variant?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info";
}

export function AdminDashboardPage() {
  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const admin = useAdminSessionStore(
    (state) => state.currentAdmin,
  );

  useEffect(() => {
    let cancelled = false;

    setStats(null);
    setError(null);

    adminApi
      .getDashboard()
      .then((dashboardStats: DashboardStats) => {
        if (!cancelled) {
          setStats(dashboardStats);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [admin.role]);

  const dashboardStats: DashboardStat[] = stats
    ? [
        {
          title: "Total Users",
          value: stats.totalUsers,
          icon: "👥",
        },
        {
          title: "Active Users",
          value: stats.activeUsers,
          icon: "🟢",
          variant: "success",
        },
        {
          title: "Blocked Users",
          value: stats.blockedUsers,
          icon: "🚫",
          variant: "danger",
        },
        {
          title: "Suspended Users",
          value: stats.suspendedUsers,
          icon: "⏸️",
          variant: "warning",
        },
        {
          title: "Pending Recovery Cases",
          value: stats.pendingRecoveryCases,
          icon: "🔑",
          variant: "warning",
        },
        {
          title: "Pending Moderation Cases",
          value: stats.pendingModerationCases,
          icon: "🛡️",
          variant: "warning",
        },
        {
          title: "Pending Marketplace Reviews",
          value: stats.pendingMarketplaceReviews,
          icon: "⭐",
          variant: "info",
        },
        {
          title: "Pending Payouts",
          value: stats.pendingPayouts,
          icon: "💸",
          variant: "warning",
        },
        {
          title: "Open Support Cases",
          value: stats.openSupportCases,
          icon: "🎧",
          variant: "info",
        },
        {
          title: "Security Alerts",
          value: stats.securityAlerts,
          icon: "🔐",
          variant: "danger",
        },
        {
          title: "Pending Deletion Requests",
          value: stats.pendingDeletionRequests,
          icon: "🗑️",
          variant: "danger",
        },
        {
          title: "Revenue",
          value: money(stats.revenue),
          icon: "💰",
          variant: "success",
        },
        {
          title: "Marketplace GMV",
          value: money(stats.marketplaceGmv),
          icon: "🛍️",
          variant: "info",
        },
        {
          title: "Active Live Streams",
          value: stats.activeLiveStreams,
          icon: "🔴",
          variant: "danger",
        },
        {
          title: "Active Meetings",
          value: stats.activeMeetings,
          icon: "🎥",
          variant: "info",
        },
        {
          title: "Subscription Revenue",
          value: money(stats.subscriptionRevenue),
          icon: "💎",
          variant: "success",
        },
      ]
    : [];

  return (
    <div className="admin-dashboard-page">
      <AdminPageHeader
        title="Dashboard"
        description={
          "Signed in as " +
          admin.name +
          " · " +
          roleLabel(admin.role)
        }
      />

      {/* ======================================================
          QUICK ACTIONS
          ====================================================== */}

      <section className="admin-dashboard-actions">
        <div className="admin-dashboard-actions__intro">
          <span className="admin-dashboard-actions__eyebrow">
            Platform Management
          </span>

          <h2>Quick Actions</h2>

          <p>
            Manage important Fockis platform settings and
            administrative controls.
          </p>
        </div>

        <div className="admin-dashboard-actions__buttons">
          {/* ==================================================
              ADMIN DASHBOARD
          ================================================== */}

          <Link
            to="/admin/dashboard"
            className="admin-dashboard-action admin-dashboard-action--primary"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🏠
            </span>

            <span>
              <strong>Admin Dashboard</strong>

              <small>
                View platform statistics and administration
                overview
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              FINANCE DASHBOARD
          ================================================== */}

          <Link
            to="/admin/finance"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              💰
            </span>

            <span>
              <strong>Finance Dashboard</strong>

              <small>
                Manage payments, revenue, payouts, refunds,
                and transactions
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              FOCKIS SHOP DASHBOARD
          ================================================== */}

          <Link
            to="/admin/shop"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🛍️
            </span>

            <span>
              <strong>Fockis Shop Dashboard</strong>

              <small>
                Manage stores, sellers, products, orders,
                and Shop rules
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              MARKETING ADMIN
          ================================================== */}

          <Link
            to="/admin/marketing-admin"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🎯
            </span>

            <span>
              <strong>Marketing Admin</strong>

              <small>
                Manage campaigns, ads, advertisers,
                approvals, workflow, and marketing controls
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              USERS
          ================================================== */}

          <Link
            to="/admin/users"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              👥
            </span>

            <span>
              <strong>User Management</strong>

              <small>
                Manage users, accounts, security, and Fockis
                IDs
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              ADMINISTRATORS
          ================================================== */}

          <Link
            to="/admin/administrators"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🛡️
            </span>

            <span>
              <strong>Administrators</strong>

              <small>
                Manage Fockis administrator accounts
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              ROLES
          ================================================== */}

          <Link
            to="/admin/roles"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🔐
            </span>

            <span>
              <strong>Roles</strong>

              <small>
                View and manage administrator roles
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              CREATE ROLE
          ================================================== */}

          <Link
            to="/admin/roles/create"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              ➕
            </span>

            <span>
              <strong>Create Role</strong>

              <small>
                Create a custom role and assign permissions
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              PERMISSIONS
          ================================================== */}

          <Link
            to="/admin/permissions"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🔑
            </span>

            <span>
              <strong>Permissions</strong>

              <small>
                View the Fockis administrator permission
                catalog
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              MUSIC RULES
          ================================================== */}

          <Link
            to="/admin/music/rules"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              🎵
            </span>

            <span>
              <strong>Music Rules</strong>

              <small>
                Manage music platform rules
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>

          {/* ==================================================
              MUSIC PLATFORM
          ================================================== */}

          <Link
            to="/admin/music/rules"
            className="admin-dashboard-action"
          >
            <span
              className="admin-dashboard-action__icon"
              aria-hidden="true"
            >
              ⚙️
            </span>

            <span>
              <strong>Manage Music Platform</strong>

              <small>
                Configure music administration
              </small>
            </span>

            <span
              className="admin-dashboard-action__arrow"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </section>

      {/* ======================================================
          ERROR
          ====================================================== */}

      {error && (
        <AdminErrorState
          message={
            "You don't have permission to view global analytics, or the data failed to load."
          }
        />
      )}

      {/* ======================================================
          LOADING
          ====================================================== */}

      {!stats && !error && (
        <AdminLoadingState label="Loading dashboard..." />
      )}

      {/* ======================================================
          DASHBOARD STATISTICS
          ====================================================== */}

      {stats && (
        <>
          <section className="admin-dashboard-section">
            <div className="admin-dashboard-section__header">
              <div>
                <span className="admin-dashboard-section__eyebrow">
                  Platform Overview
                </span>

                <h2>System Statistics</h2>

                <p>
                  A real-time overview of the most important
                  Fockis platform activity.
                </p>
              </div>

              <div className="admin-dashboard-section__status">
                <span className="admin-dashboard-status-dot" />
                Live Data
              </div>
            </div>

            <div className="fk-stat-grid admin-dashboard-stat-grid">
              {dashboardStats.map((stat) => (
                <div
                  key={stat.title}
                  className={
                    "fk-stat-card admin-dashboard-stat-card admin-dashboard-stat-card--" +
                    (stat.variant ?? "default")
                  }
                >
                  <div className="admin-dashboard-stat-card__top">
                    <div className="admin-dashboard-stat-card__icon">
                      {stat.icon}
                    </div>

                    <span className="admin-dashboard-stat-card__menu">
                      •••
                    </span>
                  </div>

                  <div className="fk-stat-card__label">
                    {stat.title}
                  </div>

                  <div className="fk-stat-card__value">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ==================================================
              USER ADMINISTRATION
              ================================================== */}

          <section className="admin-dashboard-section">
            <div className="admin-dashboard-section__header">
              <div>
                <span className="admin-dashboard-section__eyebrow">
                  User Administration
                </span>

                <h2>Manage Fockis Users</h2>

                <p>
                  View and manage user accounts, profiles,
                  security, subscriptions, Fockis IDs,
                  bookings, payments, reports, messages,
                  and activity.
                </p>
              </div>
            </div>

            <div className="admin-dashboard-actions__buttons">
              <Link
                to="/admin/users"
                className="admin-dashboard-action admin-dashboard-action--primary"
              >
                <span
                  className="admin-dashboard-action__icon"
                  aria-hidden="true"
                >
                  👥
                </span>

                <span>
                  <strong>Open User Management</strong>

                  <small>
                    View all users and manage user accounts
                  </small>
                </span>

                <span
                  className="admin-dashboard-action__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </div>
          </section>

          {/* ==================================================
              SUMMARY
              ================================================== */}

          <section className="admin-dashboard-summary">
            <div className="admin-dashboard-summary__card">
              <div className="admin-dashboard-summary__icon">
                💰
              </div>

              <div>
                <span>Total Revenue</span>

                <strong>
                  {money(stats.revenue)}
                </strong>

                <small>
                  Platform revenue
                </small>
              </div>
            </div>

            <div className="admin-dashboard-summary__card">
              <div className="admin-dashboard-summary__icon">
                🛍️
              </div>

              <div>
                <span>Marketplace GMV</span>

                <strong>
                  {money(stats.marketplaceGmv)}
                </strong>

                <small>
                  Marketplace transaction volume
                </small>
              </div>
            </div>

            <div className="admin-dashboard-summary__card">
              <div className="admin-dashboard-summary__icon">
                💎
              </div>

              <div>
                <span>Subscription Revenue</span>

                <strong>
                  {money(stats.subscriptionRevenue)}
                </strong>

                <small>
                  Subscription income
                </small>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;