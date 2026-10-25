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
  const campaigns = useCampaigns("PENDING_REVIEW");
  const ads = useAds("PENDING_REVIEW");

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

      <section
        className="marketing-admin__card"
        aria-labelledby="pending-campaigns-heading"
      >
        <div className="marketing-admin__card-header">
          <div>
            <h2 id="pending-campaigns-heading">
              Campaigns awaiting review
            </h2>
            <p>Campaign-level approval queue.</p>
          </div>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={campaigns.loading || ads.loading}
          >
            {campaigns.loading || ads.loading ? "Refreshing…" : "Refresh All"}
          </button>
        </div>

        {campaigns.loading ? (
          <LoadingState />
        ) : campaigns.error ? (
          <ErrorState message={campaigns.error} />
        ) : campaigns.data.length === 0 ? (
          <EmptyState message="No campaigns are waiting for review." />
        ) : (
          <div className="marketing-admin__table-wrap">
            <table className="marketing-admin__table">
              <thead>
                <tr>
                  <th scope="col">Campaign</th>
                  <th scope="col">Advertiser</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.data.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>
                      <strong>{campaign.name || "Untitled campaign"}</strong>
                      <small>{campaign.id}</small>
                    </td>
                    <td>{campaign.advertiserName || "Unknown advertiser"}</td>
                    <td>
                      <span className={statusClass(campaign.status)}>
                        {campaign.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td>{formatDate(campaign.updatedAt)}</td>
                    <td>
                      <CampaignActionButtons
                        campaign={campaign}
                        onRefresh={() => void campaigns.refresh()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="marketing-admin__card"
        aria-labelledby="pending-ads-heading"
      >
        <div className="marketing-admin__card-header">
          <div>
            <h2 id="pending-ads-heading">
              Advertisements awaiting review
            </h2>
            <p>Creative-level approval queue.</p>
          </div>

          <button
            type="button"
            onClick={() => void ads.refresh()}
            disabled={ads.loading}
          >
            {ads.loading ? "Refreshing…" : "Refresh Ads"}
          </button>
        </div>

        {ads.loading ? (
          <LoadingState />
        ) : ads.error ? (
          <ErrorState message={ads.error} />
        ) : ads.data.length === 0 ? (
          <EmptyState message="No advertisements are waiting for review." />
        ) : (
          <div className="marketing-admin__table-wrap">
            <table className="marketing-admin__table">
              <thead>
                <tr>
                  <th scope="col">Advertisement</th>
                  <th scope="col">Campaign</th>
                  <th scope="col">Advertiser</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.data.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      <strong>{ad.id}</strong>
                    </td>
                    <td>{ad.campaignName || "Unknown campaign"}</td>
                    <td>{ad.advertiserName || "Unknown advertiser"}</td>
                    <td>
                      <span className={statusClass(ad.status)}>
                        {ad.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td>{formatDate(ad.updatedAt)}</td>
                    <td>
                      <AdActionButtons
                        ad={ad}
                        onRefresh={() => void ads.refresh()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
