import { useCallback, useEffect, useState } from "react";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import TravelPartnerApplicationTable from "../components/TravelPartnerApplicationTable";
import type {
  TravelPartnerApplication,
  TravelPartnerApplicationFilters,
  TravelPartnerApplicationStatus,
} from "../types/travelAdmin.types";
import "../styles/TravelPartnerApplications.scss";

const STATUS_TABS: Array<{
  value: TravelPartnerApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "more_info_requested", label: "Awaiting info" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function TravelPartnerApplicationsPage() {
  const [applications, setApplications] = useState<
    TravelPartnerApplication[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    TravelPartnerApplicationStatus | "all"
  >("pending");
  const [search, setSearch] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    const filters: TravelPartnerApplicationFilters = {
      status: statusFilter,
      search: search.trim() || undefined,
      limit: 50,
    };

    try {
      const result = await travelPartnerAdminApi.getPartnerApplications(
        filters,
      );
      setApplications(result.items);
    } catch {
      setError("Unable to load partner applications right now.");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await travelPartnerAdminApi.updatePartnerApplicationStatus(
          id,
          "approved",
        );
        await loadApplications();
      } catch {
        setError("Unable to approve this application right now.");
      }
    },
    [loadApplications],
  );

  const handleReject = useCallback(
    async (id: string) => {
      const reason = window.prompt(
        "Reason for rejecting this application (shown to the applicant):",
      );

      if (reason === null) return;

      try {
        await travelPartnerAdminApi.updatePartnerApplicationStatus(
          id,
          "rejected",
          { rejectionReason: reason },
        );
        await loadApplications();
      } catch {
        setError("Unable to reject this application right now.");
      }
    },
    [loadApplications],
  );

  const handleRequestInfo = useCallback(
    async (id: string) => {
      const message = window.prompt(
        "What additional information do you need from the applicant?",
      );

      if (!message) return;

      try {
        await travelPartnerAdminApi.requestMoreInfo(id, message);
        await loadApplications();
      } catch {
        setError("Unable to send this request right now.");
      }
    },
    [loadApplications],
  );

  return (
    <div className="travel-partner-applications-page">
      <div className="travel-admin-page-head">
        <h1>Partner Applications</h1>
        <p>Review businesses applying to join Fockis Travel.</p>
      </div>

      {error && <div className="admin-panel admin-panel-error">{error}</div>}

      <div className="travel-admin-filters">
        <div className="status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`status-tab${
                statusFilter === tab.value ? " active" : ""
              }`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search by business name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <TravelPartnerApplicationTable
        applications={applications}
        loading={loading}
        onApprove={handleApprove}
        onReject={handleReject}
        onRequestInfo={handleRequestInfo}
      />
    </div>
  );
}
