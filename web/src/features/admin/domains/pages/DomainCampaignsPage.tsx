import {
  useState,
} from "react";

import DomainCampaignForm from "../components/DomainCampaignForm";

import useDomainAdmin from "../hooks/useDomainAdmin";

import "../styles/DomainCampaigns.scss";

export default function DomainCampaignsPage() {
  const {
    campaigns,
    loading,
    error,
    createCampaign,
  } = useDomainAdmin();

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  async function handleCreate(
    payload: Parameters<
      typeof createCampaign
    >[0],
  ) {
    setSaving(true);

    try {
      await createCampaign(
        payload,
      );

      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="domain-campaigns-page">
      <header className="domain-admin-header">
        <div>
          <span className="domain-eyebrow">
            Super App Administration
          </span>

          <h1>
            Free Domain Campaigns
          </h1>

          <p>
            Create marketing promotions such
            as "1,000 free Fockis domains this
            month."
          </p>
        </div>

        <button
          type="button"
          className="domain-primary-button"
          onClick={() =>
            setShowForm(
              (current) => !current,
            )
          }
        >
          {showForm
            ? "Close"
            : "+ Create Campaign"}
        </button>
      </header>

      {error && (
        <div
          className="domain-admin-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {showForm && (
        <section className="domain-panel">
          <h2>
            Create Free Domain Campaign
          </h2>

          <DomainCampaignForm
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() =>
              setShowForm(false)
            }
          />
        </section>
      )}

      {loading ? (
        <div className="domain-table-state">
          Loading campaigns...
        </div>
      ) : (
        <section className="domain-campaign-list">
          {campaigns.length === 0 ? (
            <div className="domain-table-state">
              <strong>
                No campaigns yet.
              </strong>

              <p>
                Create your first free-domain
                promotion.
              </p>
            </div>
          ) : (
            campaigns.map(
              (campaign) => {
                const percentage =
                  campaign.freeDomainLimit >
                  0
                    ? Math.min(
                        100,
                        Math.round(
                          (campaign.freeDomainsClaimed /
                            campaign.freeDomainLimit) *
                            100,
                        ),
                      )
                    : 0;

                return (
                  <article
                    className="domain-campaign-card"
                    key={campaign.id}
                  >
                    <div className="domain-campaign-card__top">
                      <div>
                        <span className="domain-eyebrow">
                          {campaign.status}
                        </span>

                        <h2>
                          {campaign.name}
                        </h2>

                        {campaign.description && (
                          <p>
                            {
                              campaign.description
                            }
                          </p>
                        )}
                      </div>

                      <span
                        className={`domain-status domain-status--${campaign.status}`}
                      >
                        {
                          campaign.status
                        }
                      </span>
                    </div>

                    <div className="domain-campaign-progress">
                      <div>
                        <strong>
                          {
                            campaign.freeDomainsClaimed
                          }
                        </strong>

                        <span>
                          {" "}
                          /{" "}
                          {
                            campaign.freeDomainLimit
                          } claimed
                        </span>
                      </div>

                      <strong>
                        {
                          campaign.freeDomainsRemaining
                        }{" "}
                        remaining
                      </strong>
                    </div>

                    <div className="domain-progress">
                      <span
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                    <div className="domain-campaign-meta">
                      <span>
                        {campaign.startDate} →{" "}
                        {campaign.endDate}
                      </span>

                      <span>
                        {
                          campaign.domainsPerUser
                        }{" "}
                        free/user
                      </span>
                    </div>
                  </article>
                );
              },
            )
          )}
        </section>
      )}
    </div>
  );
}