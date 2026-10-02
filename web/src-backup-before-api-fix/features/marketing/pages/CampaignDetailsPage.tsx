/* ============================================================================
   CAMPAIGN DETAILS PAGE
============================================================================ */

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getCampaign,
  submitCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
} from "../services/campaignApi";

import {
  getAdsByCampaign,
  activateAd,
  pauseAd,
  deleteAd,
} from "../services/marketingApi";

import CreateAdModal from "../components/CreateAdModal";

import type {
  Campaign,
  Advertisement,
} from "../types/marketingTypes";

import "../styles/CampaignDetailsPage.scss";


export default function CampaignDetailsPage() {

  const {
    campaignId: routeCampaignId,
  } = useParams<{
    campaignId: string;
  }>();

  const navigate = useNavigate();

  /*
   * Always keep campaignId as a string.
   * React Router can return undefined, so we
   * convert the missing value to an empty string.
   */
  const campaignId =
    routeCampaignId ?? "";


  const [
    campaign,
    setCampaign,
  ] = useState<Campaign | null>(
    null,
  );


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


  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);


  /* ============================================================
     ADS
  ============================================================ */

  const [
    ads,
    setAds,
  ] = useState<Advertisement[]>(
    [],
  );

  const [
    adsLoading,
    setAdsLoading,
  ] = useState(true);

  const [
    adActionLoadingId,
    setAdActionLoadingId,
  ] = useState<string | null>(
    null,
  );

  const [
    createAdModalOpen,
    setCreateAdModalOpen,
  ] = useState(false);


  const loadAds = useCallback(
    async () => {

      if (!campaignId) {
        return;
      }

      try {

        setAdsLoading(true);

        const result =
          await getAdsByCampaign(
            campaignId,
          );

        setAds(
          Array.isArray(result)
            ? result
            : [],
        );

      } catch (err) {

        console.error(
          "Failed to load ads:",
          err,
        );

        setAds([]);

      } finally {

        setAdsLoading(false);
      }
    },
    [campaignId],
  );


  useEffect(() => {

    void loadAds();

  }, [loadAds]);


  const adId = (
    ad: Advertisement,
  ): string =>
    String(
      ad._id ?? ad.id ?? "",
    );


  async function handleActivateAd(
    id: string,
  ) {

    try {

      setAdActionLoadingId(id);

      const updated =
        await activateAd(id);

      setAds(
        (previous) =>
          previous.map(
            (item) =>
              adId(item) === id
                ? updated
                : item,
          ),
      );

    } catch (err) {

      console.error(
        "Failed to activate ad:",
        err,
      );

    } finally {

      setAdActionLoadingId(
        null,
      );
    }
  }


  async function handlePauseAd(
    id: string,
  ) {

    try {

      setAdActionLoadingId(id);

      const updated =
        await pauseAd(id);

      setAds(
        (previous) =>
          previous.map(
            (item) =>
              adId(item) === id
                ? updated
                : item,
          ),
      );

    } catch (err) {

      console.error(
        "Failed to pause ad:",
        err,
      );

    } finally {

      setAdActionLoadingId(
        null,
      );
    }
  }


  async function handleDeleteAd(
    id: string,
  ) {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this ad?",
      );

    if (!confirmed) {
      return;
    }

    try {

      setAdActionLoadingId(id);

      await deleteAd(id);

      setAds(
        (previous) =>
          previous.filter(
            (item) =>
              adId(item) !== id,
          ),
      );

    } catch (err) {

      console.error(
        "Failed to delete ad:",
        err,
      );

    } finally {

      setAdActionLoadingId(
        null,
      );
    }
  }


  /* ============================================================
     LOAD CAMPAIGN
  ============================================================ */

  useEffect(() => {

    if (!campaignId) {

      setError(
        "Campaign ID is missing.",
      );

      setLoading(false);

      return;
    }

    let cancelled = false;

    async function loadCampaign() {

      try {

        setLoading(true);

        setError(null);

        const result =
          await getCampaign(
            campaignId,
          );

        if (!cancelled) {

          setCampaign(
            result,
          );
        }

      } catch (err) {

        console.error(
          "Failed to load campaign:",
          err,
        );

        if (!cancelled) {

          setError(
            "Unable to load this campaign.",
          );
        }

      } finally {

        if (!cancelled) {

          setLoading(false);
        }
      }
    }

    loadCampaign();

    return () => {

      cancelled = true;
    };

  }, [
    campaignId,
  ]);


  /* ============================================================
     MISSING CAMPAIGN ID
  ============================================================ */

  if (!campaignId) {

    return (
      <div className="fk-marketing-page">

        <div className="fk-marketing-empty">

          <h2>
            Campaign not found
          </h2>

          <p>
            No campaign ID was provided.
          </p>

          <button
            type="button"
            className="fk-marketing-primary-button"
            onClick={() =>
              navigate(
                "/marketing/campaigns",
              )
            }
          >
            Back to Campaigns
          </button>

        </div>

      </div>
    );
  }


  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {

    return (
      <div className="fk-marketing-page">

        <div className="fk-marketing-loading">
          Loading campaign...
        </div>

      </div>
    );
  }


  /* ============================================================
     ERROR
  ============================================================ */

  if (error || !campaign) {

    return (
      <div className="fk-marketing-page">

        <div className="fk-marketing-empty">

          <h2>
            Unable to load campaign
          </h2>

          <p>
            {error ??
              "Campaign was not found."}
          </p>

          <button
            type="button"
            className="fk-marketing-primary-button"
            onClick={() =>
              navigate(
                "/marketing/campaigns",
              )
            }
          >
            Back to Campaigns
          </button>

        </div>

      </div>
    );
  }


  /* ============================================================
     ACTIONS
  ============================================================ */

  async function handleSubmit() {

    try {

      setActionLoading(true);

      setError(null);

      const updated =
        await submitCampaign(
          campaignId,
        );

      setCampaign(
        updated,
      );

    } catch (err) {

      console.error(
        "Failed to submit campaign:",
        err,
      );

      setError(
        "Unable to submit campaign.",
      );

    } finally {

      setActionLoading(false);
    }
  }


  async function handlePause() {

    try {

      setActionLoading(true);

      setError(null);

      const updated =
        await pauseCampaign(
          campaignId,
        );

      setCampaign(
        updated,
      );

    } catch (err) {

      console.error(
        "Failed to pause campaign:",
        err,
      );

      setError(
        "Unable to pause campaign.",
      );

    } finally {

      setActionLoading(false);
    }
  }


  async function handleResume() {

    try {

      setActionLoading(true);

      setError(null);

      const updated =
        await resumeCampaign(
          campaignId,
        );

      setCampaign(
        updated,
      );

    } catch (err) {

      console.error(
        "Failed to resume campaign:",
        err,
      );

      setError(
        "Unable to resume campaign.",
      );

    } finally {

      setActionLoading(false);
    }
  }


  /* ============================================================
     DELETE
  ============================================================ */

  async function handleDelete() {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this campaign?",
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(true);

      setError(null);

      await deleteCampaign(
        campaignId,
      );

      navigate(
        "/marketing/campaigns",
      );

    } catch (err) {

      console.error(
        "Failed to delete campaign:",
        err,
      );

      setError(
        "Unable to delete campaign.",
      );

      setActionLoading(false);
    }
  }


  /* ============================================================
     STATUS
  ============================================================ */

  const status =
    String(
      campaign.status ??
        "DRAFT",
    ).toUpperCase();


  /* ============================================================
     SAFE DISPLAY HELPERS
  ============================================================ */

  const displayValue = (
    value: unknown,
    fallback = "—",
  ): string => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    return String(value);
  };


  const formatMoney = (
    value: unknown,
  ): string => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    const numericValue =
      Number(value);

    if (
      Number.isNaN(
        numericValue,
      )
    ) {
      return "—";
    }

    return `$${numericValue.toFixed(2)}`;
  };


  const formatDate = (
    value: unknown,
    fallback: string,
  ): string => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    const date =
      new Date(
        String(value),
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return fallback;
    }

    return date.toLocaleDateString();
  };


  /* ============================================================
     RENDER
  ============================================================ */

  return (

    <div className="fk-marketing-page fk-marketing-page--wide">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="fk-marketing-header">

        <div>

          <Link
            to="/marketing/campaigns"
            className="fk-marketing-link"
          >
            ← Campaigns
          </Link>

          <h1>
            {displayValue(
              campaign.name,
              "Campaign",
            )}
          </h1>

          <p>
            Campaign details and management
          </p>

        </div>


        <div className="fk-marketing-header-actions">

          <Link
            to={`/marketing/campaigns/${campaignId}/analytics`}
            className="fk-marketing-secondary-button"
          >
            View Analytics
          </Link>


          <Link
            to={`/marketing/campaigns/${campaignId}/edit`}
            className="fk-marketing-primary-button"
          >
            Edit Campaign
          </Link>

        </div>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="fk-marketing-error">

          {error}

        </div>

      )}


      <div className="fk-marketing-grid">


        {/* ======================================================
            CAMPAIGN INFORMATION
        ====================================================== */}

        <section className="fk-marketing-card">

          <div className="fk-marketing-card-header">

            <h2>
              Campaign Information
            </h2>

            <span
              className={`fk-marketing-status fk-marketing-status-${status.toLowerCase()}`}
            >
              {status}
            </span>

          </div>


          <div className="fk-marketing-detail-list">

            <div>

              <span>
                Campaign ID
              </span>

              <strong>
                {campaignId}
              </strong>

            </div>


            <div>

              <span>
                Name
              </span>

              <strong>
                {displayValue(
                  campaign.name,
                )}
              </strong>

            </div>


            <div>

              <span>
                Objective
              </span>

              <strong>
                {displayValue(
                  campaign.objective,
                )}
              </strong>

            </div>


            <div>

              <span>
                Status
              </span>

              <strong>
                {status}
              </strong>

            </div>

          </div>

        </section>


        {/* ======================================================
            ACTIONS
        ====================================================== */}

        <section className="fk-marketing-card">

          <div className="fk-marketing-card-header">

            <h2>
              Campaign Actions
            </h2>

          </div>


          <div className="fk-marketing-action-list">

            {status === "DRAFT" && (

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmit}
                className="fk-marketing-primary-button"
              >
                {actionLoading
                  ? "Submitting..."
                  : "Submit for Review"}
              </button>

            )}


            {status === "ACTIVE" && (

              <button
                type="button"
                disabled={actionLoading}
                onClick={handlePause}
                className="fk-marketing-warning-button"
              >
                {actionLoading
                  ? "Pausing..."
                  : "Pause Campaign"}
              </button>

            )}


            {status === "PAUSED" && (

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleResume}
                className="fk-marketing-primary-button"
              >
                {actionLoading
                  ? "Resuming..."
                  : "Resume Campaign"}
              </button>

            )}


            <button
              type="button"
              disabled={actionLoading}
              onClick={handleDelete}
              className="fk-marketing-danger-button"
            >
              Delete Campaign
            </button>

          </div>

        </section>


        {/* ======================================================
            DESCRIPTION
        ====================================================== */}

        <section className="fk-marketing-card fk-marketing-card-full">

          <div className="fk-marketing-card-header">

            <h2>
              Description
            </h2>

          </div>


          <p className="fk-marketing-description">

            {displayValue(
              campaign.description,
              "No campaign description provided.",
            )}

          </p>

        </section>


        {/* ======================================================
            SCHEDULE
        ====================================================== */}

        <section className="fk-marketing-card">

          <div className="fk-marketing-card-header">

            <h2>
              Schedule
            </h2>

          </div>


          <div className="fk-marketing-detail-list">

            <div>

              <span>
                Start Date
              </span>

              <strong>
                {formatDate(
                  campaign.startDate,
                  "—",
                )}
              </strong>

            </div>


            <div>

              <span>
                End Date
              </span>

              <strong>
                {formatDate(
                  campaign.endDate,
                  "No end date",
                )}
              </strong>

            </div>

          </div>

        </section>


        {/* ======================================================
            BUDGET
        ====================================================== */}

        <section className="fk-marketing-card">

          <div className="fk-marketing-card-header">

            <h2>
              Budget
            </h2>

          </div>


          <div className="fk-marketing-detail-list">

            <div>

              <span>
                Daily Budget
              </span>

              <strong>
                {formatMoney(
                  campaign.dailyBudget,
                )}
              </strong>

            </div>


            <div>

              <span>
                Total Budget
              </span>

              <strong>
                {formatMoney(
                  campaign.totalBudget,
                )}
              </strong>

            </div>

          </div>

        </section>


        {/* ======================================================
            ADS

            This is the button you asked about: "+ Create Ad" in
            this section's header. Requires campaign to exist
            (which it does here — this page always has a real
            campaignId), and pre-fills campaignId into the modal.
        ====================================================== */}

        <section className="fk-marketing-card fk-marketing-card-full">

          <div className="fk-marketing-card-header">

            <h2>
              Ads
            </h2>

            <button
              type="button"
              className="fk-marketing-primary-button"
              onClick={() =>
                setCreateAdModalOpen(true)
              }
            >
              + Create Ad
            </button>

          </div>


          {adsLoading && (

            <div className="fk-marketing-loading">
              Loading ads...
            </div>

          )}


          {!adsLoading &&
            ads.length === 0 && (

              <p className="fk-marketing-description">
                No ads yet for this campaign. Click
                "Create Ad" to add a video, image,
                website, or app-install ad.
              </p>

            )}


          {!adsLoading &&
            ads.length > 0 && (

              <div className="fk-marketing-detail-list">

                {ads.map((ad) => {

                  const id = adId(ad);

                  const adStatus =
                    String(
                      ad.status ??
                        "DRAFT",
                    ).toUpperCase();


                  return (

                    <div key={id}>

                      <span>
                        {displayValue(
                          ad.headline ??
                            ad.name ??
                            ad.title,
                          "Untitled ad",
                        )}
                        {" — "}
                        {displayValue(
                          ad.type,
                        )}
                        {" — "}
                        {adStatus}
                      </span>

                      <div className="fk-marketing-action-list">

                        {adStatus !==
                          "ACTIVE" && (

                          <button
                            type="button"
                            disabled={
                              adActionLoadingId ===
                              id
                            }
                            onClick={() =>
                              void handleActivateAd(
                                id,
                              )
                            }
                            className="fk-marketing-primary-button"
                          >
                            Activate
                          </button>

                        )}


                        {adStatus ===
                          "ACTIVE" && (

                          <button
                            type="button"
                            disabled={
                              adActionLoadingId ===
                              id
                            }
                            onClick={() =>
                              void handlePauseAd(
                                id,
                              )
                            }
                            className="fk-marketing-warning-button"
                          >
                            Pause
                          </button>

                        )}


                        <button
                          type="button"
                          disabled={
                            adActionLoadingId ===
                            id
                          }
                          onClick={() =>
                            void handleDeleteAd(
                              id,
                            )
                          }
                          className="fk-marketing-danger-button"
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

        </section>


        {/* ======================================================
            ANALYTICS
        ====================================================== */}

        <section className="fk-marketing-card fk-marketing-card-full">

          <div className="fk-marketing-card-header">

            <h2>
              Analytics
            </h2>

            <Link
              to={`/marketing/campaigns/${campaignId}/analytics`}
              className="fk-marketing-link"
            >
              View Full Analytics →
            </Link>

          </div>


          <div className="fk-marketing-metrics">


            {/* IMPRESSIONS */}

            <div className="fk-marketing-metric">

              <span>
                Impressions
              </span>

              <strong>
                {displayValue(
                  campaign.impressions,
                  "0",
                )}
              </strong>

            </div>


            {/* CLICKS */}

            <div className="fk-marketing-metric">

              <span>
                Clicks
              </span>

              <strong>
                {displayValue(
                  campaign.clicks,
                  "0",
                )}
              </strong>

            </div>


            {/* CONVERSIONS */}

            <div className="fk-marketing-metric">

              <span>
                Conversions
              </span>

              <strong>
                {displayValue(
                  campaign.conversions,
                  "0",
                )}
              </strong>

            </div>


            {/* SPEND */}

            <div className="fk-marketing-metric">

              <span>
                Spend
              </span>

              <strong>
                {formatMoney(
                  campaign.spend,
                )}
              </strong>

            </div>


          </div>

        </section>


      </div>


      {/* ======================================================
          CREATE AD MODAL
      ====================================================== */}

      {createAdModalOpen && (

        <CreateAdModal
          campaignId={campaignId}
          onClose={() =>
            setCreateAdModalOpen(false)
          }
          onCreated={(ad) =>
            setAds(
              (previous) => [
                ad,
                ...previous,
              ],
            )
          }
        />

      )}

    </div>
  );
}