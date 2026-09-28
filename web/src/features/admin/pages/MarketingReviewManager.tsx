import { useCallback, useEffect, useState } from "react";

interface MarketingCampaign {
  id: string;
  name: string;
  status: string;
  advertiser?: string;
  createdAt?: string;
  objective?: string;
  adFormat?: string;
  headline?: string;
  description?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  dailyBudget?: number;
  totalBudget?: number;
  placements?: string[];
}

const API_BASE_URL = "http://localhost:3000";

export default function MarketingReviewManager() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ============================================================
     LOAD PENDING CAMPAIGNS
  ============================================================ */

  const loadCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/marketing/admin/campaigns/pending-review`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        },
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to load campaigns (${response.status})`,
        );
      }

      const data = await response.json();

      setCampaigns(
        Array.isArray(data)
          ? data.map((campaign) => ({
              id: String(
                campaign.id ??
                  campaign._id,
              ),

              name:
                campaign.name ??
                "Untitled Campaign",

              status:
                campaign.status ??
                "PENDING_REVIEW",

              advertiser:
                campaign.advertiser ??
                campaign.advertiserName,

              createdAt:
                campaign.createdAt,

              objective:
                campaign.objective,

              adFormat:
                campaign.adFormat,

              headline:
                campaign.headline,

              description:
                campaign.description,

              mediaUrl:
                campaign.mediaUrl,

              thumbnailUrl:
                campaign.thumbnailUrl,

              dailyBudget:
                campaign.dailyBudget,

              totalBudget:
                campaign.totalBudget,

              placements:
                campaign.placements ?? [],
            }))
          : [],
      );
    } catch (err) {
      console.error(
        "[MarketingReviewManager] Failed to load campaigns:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load campaigns.",
      );

      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  /* ============================================================
     APPROVE CAMPAIGN
  ============================================================ */

  const approveCampaign = async (
    campaignId: string,
  ) => {
    try {
      setProcessingId(campaignId);
      setError(null);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/marketing/admin/campaigns/${campaignId}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        },
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to approve campaign (${response.status})`,
        );
      }

      /*
       * Remove the approved campaign from
       * the pending-review list.
       */
      setCampaigns((current) =>
        current.filter(
          (campaign) =>
            campaign.id !== campaignId,
        ),
      );
    } catch (err) {
      console.error(
        "[MarketingReviewManager] Approve failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to approve campaign.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* ============================================================
     REJECT CAMPAIGN
  ============================================================ */

  const rejectCampaign = async (
    campaignId: string,
  ) => {
    try {
      setProcessingId(campaignId);
      setError(null);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/marketing/admin/campaigns/${campaignId}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
        },
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            `Failed to reject campaign (${response.status})`,
        );
      }

      /*
       * Remove the rejected campaign from
       * the pending-review list.
       */
      setCampaigns((current) =>
        current.filter(
          (campaign) =>
            campaign.id !== campaignId,
        ),
      );
    } catch (err) {
      console.error(
        "[MarketingReviewManager] Reject failed:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to reject campaign.",
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* ============================================================
     REVIEW
  ============================================================ */

  const reviewCampaign = (
    campaign: MarketingCampaign,
  ) => {
    /*
     * Temporary review behavior.
     *
     * Once the detailed campaign-review page exists,
     * navigate to it here.
     */
    console.log(
      "[MarketingReviewManager] Review campaign:",
      campaign,
    );
  };

  /* ============================================================
     FORMAT DATE
  ============================================================ */

  const formatDate = (
    value?: string,
  ) => {
    if (!value) {
      return "Unknown";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString();
  };

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <main className="marketing-review-manager">
      <header className="marketing-review-manager__header">
        <div>
          <span className="marketing-review-manager__eyebrow">
            FOCKIS ADMIN
          </span>

          <h1>Marketing Review</h1>

          <p>
            Review sponsored campaigns before they are
            approved and displayed throughout Fockis.
          </p>
        </div>

        <div className="marketing-review-manager__stats">
          <div className="marketing-review-manager__stat">
            <strong>
              {campaigns.length}
            </strong>

            <span>
              Pending Review
            </span>
          </div>
        </div>
      </header>

      <section className="marketing-review-manager__content">
        {error && (
          <div
            className="marketing-review-manager__error"
            role="alert"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => {
                void loadCampaigns();
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="marketing-review-manager__state">
            <p>
              Loading campaigns...
            </p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="marketing-review-manager__state">
            <div className="marketing-review-manager__icon">
              ✓
            </div>

            <h2>
              No campaigns pending review
            </h2>

            <p>
              New advertiser campaigns will
              appear here when they are submitted
              for approval.
            </p>
          </div>
        ) : (
          <div className="marketing-review-manager__list">
            {campaigns.map(
              (campaign) => {
                const isProcessing =
                  processingId ===
                  campaign.id;

                return (
                  <article
                    key={campaign.id}
                    className="marketing-review-manager__card"
                  >
                    <div>
                      <h2>
                        {campaign.name}
                      </h2>

                      {campaign.advertiser && (
                        <p>
                          Advertiser:{" "}
                          {campaign.advertiser}
                        </p>
                      )}

                      {campaign.objective && (
                        <p>
                          Objective:{" "}
                          {campaign.objective}
                        </p>
                      )}

                      {campaign.adFormat && (
                        <p>
                          Format:{" "}
                          {campaign.adFormat}
                        </p>
                      )}

                      {campaign.placements &&
                        campaign.placements.length >
                          0 && (
                          <p>
                            Placement:{" "}
                            {campaign.placements.join(
                              ", ",
                            )}
                          </p>
                        )}

                      {campaign.dailyBudget !==
                        undefined && (
                        <p>
                          Daily Budget: $
                          {campaign.dailyBudget.toFixed(
                            2,
                          )}
                        </p>
                      )}

                      {campaign.totalBudget !==
                        undefined && (
                        <p>
                          Total Budget: $
                          {campaign.totalBudget.toFixed(
                            2,
                          )}
                        </p>
                      )}

                      <p>
                        Submitted:{" "}
                        {formatDate(
                          campaign.createdAt,
                        )}
                      </p>

                      <span>
                        {campaign.status}
                      </span>
                    </div>

                    {campaign.thumbnailUrl ||
                    campaign.mediaUrl ? (
                      <div className="marketing-review-manager__preview">
                        <img
                          src={
                            campaign.thumbnailUrl ??
                            campaign.mediaUrl
                          }
                          alt={
                            campaign.name
                          }
                        />
                      </div>
                    ) : null}

                    <div className="marketing-review-manager__actions">
                      <button
                        type="button"
                        disabled={
                          isProcessing
                        }
                        onClick={() =>
                          reviewCampaign(
                            campaign,
                          )
                        }
                      >
                        Review
                      </button>

                      <button
                        type="button"
                        disabled={
                          isProcessing
                        }
                        onClick={() => {
                          void approveCampaign(
                            campaign.id,
                          );
                        }}
                      >
                        {isProcessing
                          ? "Processing..."
                          : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          isProcessing
                        }
                        onClick={() => {
                          void rejectCampaign(
                            campaign.id,
                          );
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </main>
  );
}