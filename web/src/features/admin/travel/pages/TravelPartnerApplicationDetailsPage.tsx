import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";
import { getCategoryMeta } from "../components/travelCategoryMeta";
import TravelPartnerStatusBadge from "../components/TravelPartnerStatusBadge";
import type { TravelPartnerApplication } from "../types/travelAdmin.types";
import "../styles/TravelPartnerApplications.scss";

const STAGES: Array<{
  key: TravelPartnerApplication["verificationStage"];
  title: string;
}> = [
  { key: "submitted", title: "Application submitted" },
  { key: "under_review", title: "Under review" },
  { key: "verified", title: "Verification complete" },
];

function stageIndex(stage: TravelPartnerApplication["verificationStage"]) {
  return STAGES.findIndex((s) => s.key === stage);
}

function formatDate(value?: string): string {
  if (!value) return "—";

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

export default function TravelPartnerApplicationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] =
    useState<TravelPartnerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const result = await travelPartnerAdminApi.getPartnerApplication(id);
      setApplication(result);
    } catch {
      setError("Unable to load this application right now.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = useCallback(async () => {
    if (!id) return;

    setActionPending(true);

    try {
      await travelPartnerAdminApi.updatePartnerApplicationStatus(
        id,
        "approved",
      );
      await load();
    } catch {
      setError("Unable to approve this application right now.");
    } finally {
      setActionPending(false);
    }
  }, [id, load]);

  const handleReject = useCallback(async () => {
    if (!id || !rejectReason.trim()) return;

    setActionPending(true);

    try {
      await travelPartnerAdminApi.updatePartnerApplicationStatus(
        id,
        "rejected",
        { rejectionReason: rejectReason.trim() },
      );
      setShowRejectForm(false);
      setRejectReason("");
      await load();
    } catch {
      setError("Unable to reject this application right now.");
    } finally {
      setActionPending(false);
    }
  }, [id, rejectReason, load]);

  const handleRequestInfo = useCallback(async () => {
    if (!id) return;

    const message = window.prompt(
      "What additional information do you need from the applicant?",
    );

    if (!message) return;

    setActionPending(true);

    try {
      await travelPartnerAdminApi.requestMoreInfo(id, message);
      await load();
    } catch {
      setError("Unable to send this request right now.");
    } finally {
      setActionPending(false);
    }
  }, [id, load]);

  if (loading) {
    return <div className="admin-panel">Loading application…</div>;
  }

  if (error || !application) {
    return (
      <div className="admin-panel admin-panel-error">
        {error || "Application not found."}
      </div>
    );
  }

  const currentStage = stageIndex(application.verificationStage);
  const isDecided =
    application.status === "approved" || application.status === "rejected";

  return (
    <div className="travel-partner-application-details-page">
      <Link to="/admin/travel/applications" className="back-link">
        ← All applications
      </Link>

      <div className="travel-admin-page-head">
        <div>
          <h1>{application.businessName}</h1>
          <p>
            {application.contactName} · {application.email}
            {application.phone ? ` · ${application.phone}` : ""}
          </p>
        </div>

        <TravelPartnerStatusBadge status={application.status} />
      </div>

      {/* -------------------------------------------------------------- */}
      {/* Approval actions — this is the actual "approve" control        */}
      {/* -------------------------------------------------------------- */}

      {!isDecided && (
        <div className="admin-panel application-review-actions">
          <div className="application-review-actions-row">
            <button
              type="button"
              className="btn btn-approve"
              disabled={actionPending}
              onClick={handleApprove}
            >
              ✓ Approve application
            </button>

            <button
              type="button"
              className="btn btn-reject"
              disabled={actionPending}
              onClick={() => setShowRejectForm((value) => !value)}
            >
              ✕ Reject application
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              disabled={actionPending}
              onClick={handleRequestInfo}
            >
              Request more info
            </button>
          </div>

          {showRejectForm && (
            <div className="reject-form">
              <label htmlFor="reject-reason">
                Reason for rejecting (shown to the applicant)
              </label>

              <textarea
                id="reject-reason"
                rows={3}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="e.g. Missing business license documentation"
              />

              <div className="reject-form-actions">
                <button
                  type="button"
                  className="btn btn-reject"
                  disabled={actionPending || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  Confirm rejection
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowRejectForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isDecided && (
        <div
          className={`admin-panel decision-banner ${
            application.status === "approved" ? "approved" : "rejected"
          }`}
        >
          {application.status === "approved" ? (
            <>
              ✓ Approved on {formatDate(application.reviewedAt)}
              {application.reviewedBy ? ` by ${application.reviewedBy}` : ""}.
              The partner has been activated.
            </>
          ) : (
            <>
              ✕ Rejected on {formatDate(application.reviewedAt)}.{" "}
              {application.rejectionReason}
            </>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Verification timeline                                          */}
      {/* -------------------------------------------------------------- */}

      <section>
        <h2>Application status</h2>

        <div className="verification-timeline">
          {STAGES.map((stage, index) => {
            const complete = index <= currentStage;
            const active = index === currentStage;

            return (
              <div
                key={stage.key}
                className={`timeline-step${complete ? " complete" : ""}${
                  active ? " active" : ""
                }`}
              >
                <div className="timeline-dot">{complete ? "✓" : index + 1}</div>

                <div className="timeline-body">
                  <div className="timeline-title">{stage.title}</div>

                  <div className="timeline-date">
                    {stage.key === "submitted"
                      ? formatDate(application.submittedAt)
                      : stage.key === "under_review" && complete
                        ? "Our partnerships team is reviewing your application."
                        : stage.key === "verified" && !complete
                          ? "Completed after the review team approves the application."
                          : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Services requested                                              */}
      {/* -------------------------------------------------------------- */}

      <section>
        <h2>Services ({application.services.length} selected)</h2>

        <div className="service-chip-grid">
          {application.services.map((service) => {
            const meta = getCategoryMeta(service);
            const isPrimary = service === application.primaryCategory;

            return (
              <div
                key={service}
                className={`service-chip${isPrimary ? " primary" : ""}`}
              >
                <span className="icon">{meta.icon}</span>
                <span>{meta.label}</span>
                {isPrimary && <span className="primary-tag">Primary</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Business details                                                */}
      {/* -------------------------------------------------------------- */}

      <section>
        <h2>Business details</h2>

        <div className="admin-panel application-details-grid">
          <div>
            <span className="k">Description</span>
            <span className="v">
              {application.description || "No description provided."}
            </span>
          </div>

          <div>
            <span className="k">Website</span>
            <span className="v">{application.website || "—"}</span>
          </div>

          <div>
            <span className="k">Address</span>
            <span className="v">{application.address || "—"}</span>
          </div>

          <div>
            <span className="k">City</span>
            <span className="v">{application.city || "—"}</span>
          </div>

          <div>
            <span className="k">Country</span>
            <span className="v">{application.country || "—"}</span>
          </div>

          <div>
            <span className="k">Last updated</span>
            <span className="v">{formatDate(application.updatedAt)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
