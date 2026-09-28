import { Link } from "react-router-dom";

import type { TravelPartnerApplication } from "../types/travelAdmin.types";
import { getCategoryMeta } from "./travelCategoryMeta";
import TravelPartnerStatusBadge from "./TravelPartnerStatusBadge";

interface TravelPartnerApplicationTableProps {
  applications: TravelPartnerApplication[];
  loading?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRequestInfo: (id: string) => void;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export default function TravelPartnerApplicationTable({
  applications,
  loading = false,
  onApprove,
  onReject,
  onRequestInfo,
}: TravelPartnerApplicationTableProps) {
  if (loading) {
    return <div className="admin-panel">Loading applications…</div>;
  }

  if (applications.length === 0) {
    return (
      <div className="admin-panel">No partner applications match these filters.</div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table travel-partner-application-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Services</th>
            <th>Location</th>
            <th>Submitted</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>

        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <td>
                <Link to={`/admin/travel/applications/${application.id}`}>
                  {application.businessName}
                </Link>
                <div className="admin-table-subtext">{application.email}</div>
              </td>

              <td>
                {getCategoryMeta(application.primaryCategory).icon}{" "}
                {getCategoryMeta(application.primaryCategory).label}
                {application.services.length > 1 && (
                  <div className="admin-table-subtext">
                    +{application.services.length - 1} more service
                    {application.services.length - 1 === 1 ? "" : "s"}
                  </div>
                )}
              </td>

              <td>
                {[application.city, application.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </td>

              <td>{formatDate(application.submittedAt)}</td>

              <td>
                <TravelPartnerStatusBadge status={application.status} />
              </td>

              <td>
                <div className="admin-table-actions">
                  {application.status !== "approved" && (
                    <button
                      type="button"
                      className="btn btn-small btn-approve"
                      onClick={() => onApprove(application.id)}
                    >
                      Approve
                    </button>
                  )}

                  {application.status !== "rejected" && (
                    <button
                      type="button"
                      className="btn btn-small btn-reject"
                      onClick={() => onReject(application.id)}
                    >
                      Reject
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() => onRequestInfo(application.id)}
                  >
                    Request info
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
