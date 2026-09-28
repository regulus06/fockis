import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  getAcademyStats,
  getRecentActivity,
  AcademyApiError,
  AcademyStats,
  ActivityItem,
} from "../../../lib/academyApi";

import {
  AdminLoading,
  AdminError,
} from "../../../components/academy/admin/AdminStates";

import AdminStatCard from "../../../components/academy/admin/AdminStatCard";
import AdminStatusBadge from "../../../components/academy/admin/AdminStatusBadge";

const QUICK_ACTIONS = [
  {
    label: "Add Program",
    href: "/academy/admin/programs",
  },
  {
    label: "Post a Job",
    href: "/academy/admin/jobs",
  },
  {
    label: "Publish News",
    href: "/academy/admin/news",
  },
  {
    label: "Review Applications",
    href: "/academy/admin/admissions",
  },
];

export default function AcademyAdminDashboard() {
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);

    Promise.all([
      getAcademyStats(),
      getRecentActivity(12),
    ])
      .then(([statsResult, activityResult]) => {
        setStats(statsResult);
        setActivity(activityResult);
      })
      .catch((err) => {
        setError(
          err instanceof AcademyApiError
            ? err.message
            : "Failed to load dashboard data.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <AdminLoading label="Loading dashboard…" />;
  }

  if (error || !stats) {
    return (
      <AdminError
        label={error ?? "Unable to load dashboard."}
        onRetry={load}
      />
    );
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>
            A live snapshot of Fockis Academy — every number below
            is a real MongoDB count.
          </p>
        </div>
      </div>

      <div className="admin-stat-grid">
        <AdminStatCard
          label="Programs"
          value={stats.programs}
        />

        <AdminStatCard
          label="Courses"
          value={stats.courses}
          sub={`${stats.enrollments} enrollments`}
        />

        <AdminStatCard
          label="Faculty"
          value={stats.faculty}
        />

        <AdminStatCard
          label="Students"
          value={stats.students}
        />

        <AdminStatCard
          label="Events"
          value={stats.events}
        />

        <AdminStatCard
          label="News Articles"
          value={stats.news}
        />

        <AdminStatCard
          label="Applications"
          value={stats.applications}
          sub={`${stats.pendingApplications} pending review`}
        />

        <AdminStatCard
          label="Job Listings"
          value={stats.jobs}
          sub={`${stats.jobApplications} applications`}
        />

        <AdminStatCard
          label="Contact Messages"
          value={stats.contactMessages}
          sub={`${stats.newContactMessages} unread`}
        />
      </div>

      <div
        className="grid grid-2"
        style={{
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        <div
          className="card"
          style={{
            padding: 22,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            Recent Activity
          </h3>

          {activity.length === 0 ? (
            <p
              style={{
                fontSize: 13.5,
                color: "var(--ink-soft)",
              }}
            >
              No recent activity yet.
            </p>
          ) : (
            <div>
              {activity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      "1px solid var(--line)",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-soft)",
                        marginTop: 2,
                      }}
                    >
                      {new Date(
                        item.createdAt,
                      ).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <AdminStatusBadge
                    status={item.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="card"
          style={{
            padding: 22,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            Quick Actions
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                className="btn btn-outline btn-sm"
                style={{
                  justifyContent: "flex-start",
                }}
                to={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}