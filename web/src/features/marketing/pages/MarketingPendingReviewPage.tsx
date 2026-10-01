import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import "../styles/MarketingCampaignsPage.scss";

/* ============================================================================
   TYPES
============================================================================ */

interface PendingCampaign {
  _id?: string;
  id?: string;

  name: string;

  headline?: string;

  description?: string;

  objective?: string;

  adFormat?: string;

  mediaUrl?: string;

  thumbnailUrl?: string;

  appIconUrl?: string;

  appName?: string;

  appStoreUrl?: string;

  googlePlayUrl?: string;

  dailyBudget?: number;

  totalBudget?: number;

  startDate?: string;

  endDate?: string;

  placements?: string[];

  status:
    | "PENDING_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | string;

  createdAt?: string;

  updatedAt?: string;

  rejectionReason?: string;

  advertiser?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  };

  user?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  };
}


/* ============================================================================
   API RESPONSE
============================================================================ */

interface CampaignResponse {
  campaigns?: PendingCampaign[];

  data?: PendingCampaign[];

  items?: PendingCampaign[];

  total?: number;
}


/* ============================================================================
   API
============================================================================ */

const API_BASE_URL =
  FOCKIS_API_URL;


function getAuthToken(): string | null {
  return (
    localStorage.getItem("accessToken") ??
    localStorage.getItem("token") ??
    localStorage.getItem("jwt")
  );
}


async function adminRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {

  const token =
    getAuthToken();

  const headers =
    new Headers(
      options.headers,
    );

  headers.set(
    "Content-Type",
    "application/json",
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  const response =
    await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      },
    );

  const text =
    await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data =
        JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {

    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(
            (
              data as {
                message?: unknown;
              }
            ).message,
          )
        : `Request failed with status ${response.status}`;

    throw new Error(
      message,
    );
  }

  return data as T;
}


/* ============================================================================
   GET PENDING CAMPAIGNS
============================================================================ */

async function getPendingCampaigns(): Promise<
  PendingCampaign[]
> {

  const result =
    await adminRequest<
      PendingCampaign[] |
      CampaignResponse
    >(
      "/marketing/admin/campaigns/pending-review",
    );

  if (Array.isArray(result)) {
    return result;
  }

  return (
    result.campaigns ??
    result.data ??
    result.items ??
    []
  );
}


/* ============================================================================
   APPROVE
============================================================================ */

async function approveCampaign(
  campaignId: string,
): Promise<void> {

  await adminRequest(
    `/marketing/admin/campaigns/${campaignId}/approve`,
    {
      method: "PATCH",
    },
  );
}


/* ============================================================================
   REJECT
============================================================================ */

async function rejectCampaign(
  campaignId: string,
  reason: string,
): Promise<void> {

  await adminRequest(
    `/marketing/admin/campaigns/${campaignId}/reject`,
    {
      method: "PATCH",

      body: JSON.stringify({
        reason,
      }),
    },
  );
}


/* ============================================================================
   PAGE
============================================================================ */

export default function MarketingPendingReviewPage() {

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<
      PendingCampaign[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<string | null>(
      null,
    );

  const [
    rejectId,
    setRejectId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    rejectionReason,
    setRejectionReason,
  ] =
    useState("");


  /* ========================================================================== */
  /* LOAD */
  /* ========================================================================== */

  const loadCampaigns =
    useCallback(
      async () => {

        setLoading(true);

        setError(null);

        try {

          const result =
            await getPendingCampaigns();

          setCampaigns(
            result.filter(
              (campaign) =>
                campaign.status ===
                "PENDING_REVIEW",
            ),
          );

        } catch (err) {

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load pending advertisements.",
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


  /* ========================================================================== */
  /* APPROVE */
  /* ========================================================================== */

  async function handleApprove(
    campaign: PendingCampaign,
  ) {

    const id =
      campaign._id ??
      campaign.id;

    if (!id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Approve "${campaign.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    setActionLoading(id);

    setError(null);

    try {

      await approveCampaign(
        id,
      );

      setCampaigns(
        (current) =>
          current.filter(
            (item) =>
              (
                item._id ??
                item.id
              ) !== id,
          ),
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve advertisement.",
      );

    } finally {

      setActionLoading(null);

    }
  }


  /* ========================================================================== */
  /* REJECT */
  /* ========================================================================== */

  async function handleReject() {

    if (!rejectId) {
      return;
    }

    const reason =
      rejectionReason.trim();

    if (!reason) {

      setError(
        "Please provide a rejection reason.",
      );

      return;
    }

    setActionLoading(
      rejectId,
    );

    setError(null);

    try {

      await rejectCampaign(
        rejectId,
        reason,
      );

      setCampaigns(
        (current) =>
          current.filter(
            (item) =>
              (
                item._id ??
                item.id
              ) !== rejectId,
          ),
      );

      setRejectId(null);

      setRejectionReason("");

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject advertisement.",
      );

    } finally {

      setActionLoading(null);

    }
  }


  /* ========================================================================== */
  /* HELPERS */
  /* ========================================================================== */

  function getCampaignId(
    campaign: PendingCampaign,
  ) {
    return (
      campaign._id ??
      campaign.id ??
      ""
    );
  }


  function getAdvertiserName(
    campaign: PendingCampaign,
  ) {

    return (
      campaign.advertiser?.name ??
      campaign.user?.name ??
      campaign.advertiser?.email ??
      campaign.user?.email ??
      "Unknown advertiser"
    );
  }


  function formatDate(
    value?: string,
  ) {

    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
  }


  function formatMoney(
    value?: number,
  ) {

    return `$${Number(
      value ?? 0,
    ).toFixed(2)}`;
  }


  /* ========================================================================== */
  /* LOADING */
  /* ========================================================================== */

  if (loading) {

    return (
      <main className="fk-marketing-page">

        <div className="fk-marketing-loading">

          Loading pending
          advertisements...

        </div>

      </main>
    );
  }


  /* ========================================================================== */
  /* PAGE */
  /* ========================================================================== */

  return (

    <main className="fk-marketing-page">

      {/* ======================================================================
          HEADER
      ====================================================================== */}

      <header className="fk-marketing-header">

        <div>

          <span className="fk-marketing-eyebrow">
            FOCKIS MARKETING ADMIN
          </span>

          <h1>
            Pending Review
          </h1>

          <p>
            Review advertisements submitted
            by advertisers before they are
            allowed to run on Fockis.
          </p>

        </div>


        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >

          <button
            type="button"
            className="fk-marketing-secondary-button"
            onClick={() =>
              void loadCampaigns()
            }
            disabled={loading}
          >
            Refresh
          </button>

          <Link
            to="/marketing"
            className="fk-marketing-secondary-button"
          >
            Dashboard
          </Link>

        </div>

      </header>


      {/* ======================================================================
          ERROR
      ====================================================================== */}

      {error && (

        <div
          role="alert"
          className="fk-marketing-error"
        >
          {error}
        </div>

      )}


      {/* ======================================================================
          REVIEW COUNT
      ====================================================================== */}

      <section
        className="fk-marketing-section"
      >

        <div
          className="fk-marketing-section-header"
        >

          <div>

            <h2>
              Advertisements awaiting approval
            </h2>

            <p>
              {campaigns.length}{" "}
              advertisement
              {campaigns.length === 1
                ? ""
                : "s"}{" "}
              waiting for review.
            </p>

          </div>

        </div>


        {/* ====================================================================
            EMPTY
        ==================================================================== */}

        {campaigns.length === 0 && (

          <div
            className="fk-marketing-empty"
          >

            <strong>
              No advertisements waiting
              for review.
            </strong>

            <p>
              New advertisements submitted
              by advertisers will appear here.
            </p>

          </div>

        )}


        {/* ====================================================================
            CAMPAIGN LIST
        ==================================================================== */}

        {campaigns.length > 0 && (

          <div
            className="fk-campaign-grid"
          >

            {campaigns.map(
              (
                campaign,
              ) => {

                const id =
                  getCampaignId(
                    campaign,
                  );

                const busy =
                  actionLoading ===
                  id;

                return (

                  <article
                    key={id}
                    className="fk-campaign-card"
                  >

                    {/* ========================================================
                        PREVIEW
                    ======================================================== */}

                    <div
                      className="fk-campaign-card__media"
                    >

                      {campaign.mediaUrl ? (

                        campaign.adFormat ===
                        "VIDEO" ? (

                          <video
                            src={
                              campaign.mediaUrl
                            }
                            poster={
                              campaign.thumbnailUrl
                            }
                            muted
                            playsInline
                            controls
                          />

                        ) : (

                          <img
                            src={
                              campaign.mediaUrl
                            }
                            alt={
                              campaign.headline ??
                              campaign.name
                            }
                          />

                        )

                      ) : (

                        <div
                          style={{
                            minHeight:
                              "180px",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                          }}
                        >
                          No media
                        </div>

                      )}

                    </div>


                    {/* ========================================================
                        CONTENT
                    ======================================================== */}

                    <div
                      className="fk-campaign-card__content"
                    >

                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: "12px",
                          alignItems:
                            "flex-start",
                        }}
                      >

                        <div>

                          <span
                            className="fk-marketing-eyebrow"
                          >
                            PENDING REVIEW
                          </span>

                          <h3>
                            {
                              campaign.name
                            }
                          </h3>

                        </div>

                        <span
                          className="fk-campaign-status"
                        >
                          PENDING REVIEW
                        </span>

                      </div>


                      <p>
                        {
                          campaign.headline ??
                          "No headline"
                        }
                      </p>


                      {campaign.description && (

                        <p>
                          {
                            campaign.description
                          }
                        </p>

                      )}


                      {/* ======================================================
                          DETAILS
                      ====================================================== */}

                      <div
                        className="fk-campaign-card__details"
                      >

                        <div>

                          <span>
                            Advertiser
                          </span>

                          <strong>
                            {
                              getAdvertiserName(
                                campaign,
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Format
                          </span>

                          <strong>
                            {
                              campaign.adFormat ??
                              "—"
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Objective
                          </span>

                          <strong>
                            {
                              campaign.objective ??
                              "—"
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Daily budget
                          </span>

                          <strong>
                            {
                              formatMoney(
                                campaign.dailyBudget,
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Total budget
                          </span>

                          <strong>
                            {
                              formatMoney(
                                campaign.totalBudget,
                              )
                            }
                          </strong>

                        </div>


                        <div>

                          <span>
                            Submitted
                          </span>

                          <strong>
                            {
                              formatDate(
                                campaign.createdAt,
                              )
                            }
                          </strong>

                        </div>

                      </div>


                      {/* ======================================================
                          PLACEMENTS
                      ====================================================== */}

                      {campaign.placements &&
                        campaign.placements.length >
                          0 && (

                        <div>

                          <span>
                            Placements
                          </span>

                          <div
                            style={{
                              display:
                                "flex",
                              flexWrap:
                                "wrap",
                              gap:
                                "6px",
                              marginTop:
                                "6px",
                            }}
                          >

                            {campaign.placements.map(
                              (
                                placement,
                              ) => (

                                <span
                                  key={
                                    placement
                                  }
                                  className="fk-campaign-status"
                                >
                                  {
                                    placement
                                  }
                                </span>

                              ),
                            )}

                          </div>

                        </div>

                      )}


                      {/* ======================================================
                          ACTIONS
                      ====================================================== */}

                      <div
                        style={{
                          display:
                            "flex",
                          flexWrap:
                            "wrap",
                          gap:
                            "10px",
                          marginTop:
                            "20px",
                        }}
                      >

                        <Link
                          to={`/marketing/campaigns/${id}`}
                          className="fk-marketing-secondary-button"
                        >
                          Open / Review
                        </Link>


                        <button
                          type="button"
                          className="fk-marketing-primary-button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void handleApprove(
                              campaign,
                            )
                          }
                        >

                          {busy
                            ? "Processing..."
                            : "Approve"}

                        </button>


                        <button
                          type="button"
                          className="fk-marketing-danger-button"
                          disabled={
                            busy
                          }
                          onClick={() => {

                            setRejectId(
                              id,
                            );

                            setRejectionReason(
                              "",
                            );

                            setError(
                              null,
                            );

                          }}
                        >
                          Reject
                        </button>

                      </div>

                    </div>

                  </article>

                );

              },
            )}

          </div>

        )}

      </section>


      {/* ======================================================================
          REJECT MODAL
      ====================================================================== */}

      {rejectId && (

        <div
          role="dialog"
          aria-modal="true"
          className="fk-marketing-modal-backdrop"
        >

          <div
            className="fk-marketing-modal"
          >

            <div>

              <span className="fk-marketing-eyebrow">
                ADVERTISEMENT REVIEW
              </span>

              <h2>
                Reject advertisement
              </h2>

              <p>
                Provide a reason why this
                advertisement is being rejected.
                The advertiser can use this
                feedback to correct and resubmit
                the campaign.
              </p>

            </div>


            <div
              className="fk-form-field"
            >

              <label>
                Rejection reason
              </label>

              <textarea
                value={
                  rejectionReason
                }
                onChange={(event) =>
                  setRejectionReason(
                    event.target.value,
                  )
                }
                placeholder="Explain why this advertisement cannot be approved."
                rows={5}
                maxLength={1000}
                autoFocus
              />

              <small>
                {
                  rejectionReason.length
                }
                /1000
              </small>

            </div>


            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap:
                  "10px",
              }}
            >

              <button
                type="button"
                className="fk-marketing-secondary-button"
                disabled={
                  actionLoading ===
                  rejectId
                }
                onClick={() => {

                  setRejectId(
                    null,
                  );

                  setRejectionReason(
                    "",
                  );

                }}
              >
                Cancel
              </button>


              <button
                type="button"
                className="fk-marketing-danger-button"
                disabled={
                  actionLoading ===
                    rejectId ||
                  !rejectionReason.trim()
                }
                onClick={() =>
                  void handleReject()
                }
              >

                {actionLoading ===
                rejectId
                  ? "Rejecting..."
                  : "Reject advertisement"}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}