import React from "react";

import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  CampaignActionButtons,
  AdActionButtons,
  statusClass,
  formatDate,
  useCampaigns,
  useAds,
} from "./shared";

export default function MarketingPendingReviewPage() {
  const campaigns =
    useCampaigns("PENDING_REVIEW");

  const ads =
    useAds("PENDING_REVIEW");

  const handleRefreshAll = () => {
    void campaigns.refresh();
    void ads.refresh();
  };

  return (
    <>
      <PageHeader
        title="Pending Review"
        description="Review campaigns and advertisements awaiting administrative approval."
      />

      {/* =====================================================================
          CAMPAIGNS
      ===================================================================== */}

      <section className="marketing-admin__card">
        <div className="marketing-admin__card-header">
          <div>
            <h2>
              Campaigns awaiting review
            </h2>

            <p>
              Campaign-level approval queue.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={
              campaigns.loading ||
              ads.loading
            }
          >
            Refresh All
          </button>
        </div>

        {campaigns.loading ? (
          <LoadingState />
        ) : campaigns.error ? (
          <ErrorState
            message={campaigns.error}
          />
        ) : campaigns.data.length === 0 ? (
          <EmptyState
            message="No campaigns are waiting for review."
          />
        ) : (
          <div className="marketing-admin__table-wrap">
            <table className="marketing-admin__table">
              <thead>
                <tr>
                  <th>
                    Campaign
                  </th>

                  <th>
                    Advertiser
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {campaigns.data.map(
                  (campaign) => (
                    <tr
                      key={campaign.id}
                    >
                      <td>
                        <strong>
                          {campaign.name}
                        </strong>

                        <small>
                          {campaign.id}
                        </small>
                      </td>

                      <td>
                        {
                          campaign.advertiserName
                        }
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            campaign.status,
                          )}
                        >
                          {
                            campaign.status
                          }
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          campaign.updatedAt,
                        )}
                      </td>

                      <td>
                        <CampaignActionButtons
                          campaign={campaign}
                          onRefresh={() =>
                            void campaigns.refresh()
                          }
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================================
          ADVERTISEMENTS
      ===================================================================== */}

      <section className="marketing-admin__card">
        <div className="marketing-admin__card-header">
          <div>
            <h2>
              Advertisements awaiting review
            </h2>

            <p>
              Creative-level approval queue.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void ads.refresh()
            }
            disabled={ads.loading}
          >
            Refresh Ads
          </button>
        </div>

        {ads.loading ? (
          <LoadingState />
        ) : ads.error ? (
          <ErrorState
            message={ads.error}
          />
        ) : ads.data.length === 0 ? (
          <EmptyState
            message="No advertisements are waiting for review."
          />
        ) : (
          <div className="marketing-admin__table-wrap">
            <table className="marketing-admin__table">
              <thead>
                <tr>
                  <th>
                    Ad
                  </th>

                  <th>
                    Campaign
                  </th>

                  <th>
                    Advertiser
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Submitted
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {ads.data.map(
                  (ad) => (
                    <tr
                      key={ad.id}
                    >
                      <td>
                        <strong>
                          {ad.id}
                        </strong>
                      </td>

                      <td>
                        {
                          ad.campaignName
                        }
                      </td>

                      <td>
                        {
                          ad.advertiserName
                        }
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            ad.status,
                          )}
                        >
                          {
                            ad.status
                          }
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          ad.updatedAt,
                        )}
                      </td>

                      <td>
                        <AdActionButtons
                          ad={ad}
                          onRefresh={() =>
                            void ads.refresh()
                          }
                        />
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}