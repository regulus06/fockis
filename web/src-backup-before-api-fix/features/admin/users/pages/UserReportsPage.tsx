import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import adminUsersApi from "../adminUsersApi";
import UserStatusBadge from "../components/UserStatusBadge";
import type { AdminUserReport } from "../types/adminUsers.types";

const UserReportsPage: React.FC = () => {
const { id } = useParams<{ id: string }>();

const [reports, setReports] = useState<AdminUserReport[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const loadReports = async (): Promise<void> => {
if (!id) {
setError("No user ID was provided.");
setLoading(false);
return;
}

setLoading(true);
setError("");

try {
  const result = await adminUsersApi.getUserReports(id);
  setReports(result);
} catch (err: unknown) {
  console.error("Failed to load user reports:", err);

  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("Unable to load user reports.");
  }

  setReports([]);
} finally {
  setLoading(false);
}

};

useEffect(() => {
void loadReports();
}, [id]);

const pendingReports = reports.filter(
(report) =>
report.status === "pending" ||
report.status === "open" ||
report.status === "under_review",
);

const resolvedReports = reports.filter(
(report) =>
report.status === "resolved" ||
report.status === "closed",
);

const dismissedReports = reports.filter(
(report) =>
report.status === "dismissed" ||
report.status === "rejected",
);

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

return date.toLocaleString();

};

return ( <div className="admin-user-subpage"> <div className="admin-user-subpage__toolbar"> <div>
<Link
to={id ? "/admin/users/" + id : "/admin/users"}
className="admin-user-subpage__back"
>
← User Overview </Link>

```
      <span className="admin-user-subpage__eyebrow">
        USER MANAGEMENT
      </span>

      <h1>Reports</h1>

      <p>
        Review reports involving this user and monitor
        moderation activity.
      </p>
    </div>

    <button
      type="button"
      className="admin-user-subpage__refresh"
      onClick={() => void loadReports()}
      disabled={loading}
    >
      {loading ? "Loading..." : "↻ Refresh"}
    </button>
  </div>

  <section className="admin-user-subpage__summary">
    <div>
      <span>Total Reports</span>
      <strong>
        {reports.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Pending</span>
      <strong>
        {pendingReports.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Resolved</span>
      <strong>
        {resolvedReports.length.toLocaleString()}
      </strong>
    </div>

    <div>
      <span>Dismissed</span>
      <strong>
        {dismissedReports.length.toLocaleString()}
      </strong>
    </div>
  </section>

  <section className="admin-user-subpage__panel">
    {error && (
      <div
        className="admin-user-subpage__error"
        role="alert"
      >
        <strong>Unable to load reports</strong>

        <span>{error}</span>

        <button
          type="button"
          onClick={() => void loadReports()}
        >
          Try Again
        </button>
      </div>
    )}

    <div className="admin-user-table-wrapper">
      <table className="admin-user-table">
        <thead>
          <tr>
            <th>Report</th>
            <th>Reason</th>
            <th>Reporter</th>
            <th>Reported User</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {loading &&
            Array.from({ length: 6 }).map(
              (_, index) => (
                <tr
                  key={
                    "report-loading-" + index
                  }
                >
                  <td colSpan={6}>
                    <div className="admin-user-table__skeleton" />
                  </td>
                </tr>
              ),
            )}

          {!loading && reports.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="admin-user-table__empty"
              >
                <strong>No reports found</strong>

                <span>
                  There are no moderation reports
                  associated with this user.
                </span>
              </td>
            </tr>
          )}

          {!loading &&
            reports.map((report, index) => {
              const reportId =
                report._id ??
                report.id ??
                "report-" + index;

              const reporterName =
                report.reporterName ??
                report.reporterId ??
                "Unknown user";

              const reportedUserName =
                report.reportedUserName ??
                "Unknown user";

              return (
                <tr key={reportId}>
                  <td>
                    <div className="admin-user-table__primary">
                      <strong>
                        {reportId}
                      </strong>

                      {report.description && (
                        <small>
                          {report.description.length > 90
                            ? report.description.slice(
                                0,
                                90,
                              ) + "…"
                            : report.description}
                        </small>
                      )}
                    </div>
                  </td>

                  <td>
                    <span className="admin-user-table__type">
                      {report.reason ||
                        "Unspecified"}
                    </span>
                  </td>

                  <td>
                    <div className="admin-user-table__primary">
                      <strong>
                        {reporterName}
                      </strong>

                      {report.reporterId && (
                        <small>
                          Reporter ID:{" "}
                          {report.reporterId}
                        </small>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="admin-user-table__primary">
                      <strong>
                        {reportedUserName}
                      </strong>
                    </div>
                  </td>

                  <td>
                    <UserStatusBadge
                      status={
                        report.status ||
                        "unknown"
                      }
                      size="sm"
                    />
                  </td>

                  <td>
                    {formatDate(
                      report.createdAt,
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </section>
</div>

);
};

export default UserReportsPage;
