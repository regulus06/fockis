import {
  Link,
} from "react-router-dom";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getCampaigns,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
} from "../services/marketingApi";

import type {
  Campaign,
} from "../types/marketingTypes";

import CampaignCard from "../components/CampaignCard";

import "../styles/MarketingCampaignsPage.scss";


export default function MarketingCampaignsPage() {

  const [
    campaigns,
    setCampaigns,
  ] = useState<Campaign[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  /* ========================================================================
     LOAD CAMPAIGNS
  ======================================================================== */

  const loadCampaigns =
    useCallback(
      async () => {

        try {

          setLoading(true);

          setError(null);

          const result =
            await getCampaigns();

          setCampaigns(
            result,
          );

        } catch (err) {

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load campaigns.",
          );

        } finally {

          setLoading(false);

        }

      },
      [],
    );


  useEffect(() => {

    void loadCampaigns();

  }, [
    loadCampaigns,
  ]);


  /* ========================================================================
     PAUSE / RESUME
  ======================================================================== */

  async function handleToggleCampaign(
    campaign: Campaign,
  ) {

    const campaignId =
      campaign._id ??
      campaign.id;

    if (!campaignId) {
      return;
    }

    try {

      if (
        campaign.status ===
        "ACTIVE"
      ) {

        await pauseCampaign(
          campaignId,
        );

      } else if (
        campaign.status ===
        "PAUSED"
      ) {

        await resumeCampaign(
          campaignId,
        );

      }

      await loadCampaigns();

    } catch (err) {

      window.alert(
        err instanceof Error
          ? err.message
          : "Unable to update campaign.",
      );

    }

  }


  /* ========================================================================
     DELETE
  ======================================================================== */

  async function handleDeleted(
    campaignId: string,
  ) {

    try {

      await deleteCampaign(
        campaignId,
      );

      setCampaigns(
        (current) =>
          current.filter(
            (
              campaign,
            ) =>
              (
                campaign._id ??
                campaign.id
              ) !== campaignId,
          ),
      );

    } catch (err) {

      window.alert(
        err instanceof Error
          ? err.message
          : "Unable to delete campaign.",
      );

    }

  }


  /* ========================================================================
     LOADING
  ======================================================================== */

  if (loading) {

    return (

      <main className="fk-marketing-page">

        <div className="fk-marketing-loading">

          Loading campaigns...

        </div>

      </main>

    );

  }


  /* ========================================================================
     ERROR
  ======================================================================== */

  if (error) {

    return (

      <main className="fk-marketing-page">

        <div className="fk-marketing-error">

          {error}

          <button
            type="button"
            className="fk-marketing-primary-button"
            onClick={() => {
              void loadCampaigns();
            }}
          >

            Try again

          </button>

        </div>

      </main>

    );

  }


  /* ========================================================================
     PAGE
  ======================================================================== */

  return (

    <main className="fk-marketing-page">


      {/* ====================================================================
          HEADER
      ==================================================================== */}

      <header className="fk-marketing-header">

        <div>

          <span className="fk-marketing-eyebrow">

            FOCKIS MARKETING

          </span>


          <h1>

            Campaigns

          </h1>


          <p>

            Create, manage, review,
            and monitor your advertising
            campaigns.

          </p>

        </div>


        {/* ================================================================
            NAVIGATION
        ================================================================ */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >

          <Link
            to="/marketing"
            className="fk-marketing-secondary-button"
          >

            Dashboard

          </Link>


          <Link
            to="/marketing/campaigns/create"
            className="fk-marketing-primary-button"
          >

            Create Campaign

          </Link>

        </div>

      </header>


      {/* ====================================================================
          CAMPAIGN COUNT
      ==================================================================== */}

      <section className="fk-marketing-section">

        <div
          className="fk-marketing-section-header"
        >

          <div>

            <h2>

              Your Campaigns

            </h2>


            <p>

              {campaigns.length === 1
                ? "1 campaign"
                : `${campaigns.length} campaigns`}

            </p>

          </div>


          <Link
            to="/marketing/campaigns/create"
            className="fk-marketing-link"
          >

            + New Campaign

          </Link>

        </div>


        {/* ================================================================
            CAMPAIGN GRID
        ================================================================ */}

        {campaigns.length > 0 ? (

          <div className="fk-campaign-grid">

            {campaigns.map(
              (
                campaign,
              ) => {

                const campaignId =
                  campaign._id ??
                  campaign.id;

                return (

                  <div
                    key={
                      campaignId ??
                      campaign.name
                    }
                    className="fk-campaign-wrapper"
                  >

                    <CampaignCard
                      campaign={
                        campaign
                      }
                      onDeleted={
                        handleDeleted
                      }
                    />


                    {/* ==================================================
                        PAUSE / RESUME
                    ================================================== */}

                    {campaignId &&
                      (
                        campaign.status ===
                          "ACTIVE" ||
                        campaign.status ===
                          "PAUSED"
                      ) && (

                        <button
                          type="button"
                          className="fk-campaign-toggle-button"
                          onClick={() => {
                            void handleToggleCampaign(
                              campaign,
                            );
                          }}
                        >

                          {campaign.status ===
                          "ACTIVE"
                            ? "Pause"
                            : "Resume"}

                        </button>

                      )}

                  </div>

                );

              },
            )}

          </div>

        ) : (

          /* ================================================================
             EMPTY STATE
          ================================================================ */

          <div className="fk-marketing-empty">

            <h3>

              No campaigns yet

            </h3>


            <p>

              Create your first advertising
              campaign to start reaching
              customers on Fockis.

            </p>


            <Link
              to="/marketing/campaigns/create"
              className="fk-marketing-primary-button"
            >

              Create Your First Campaign

            </Link>

          </div>

        )}

      </section>

    </main>

  );

}