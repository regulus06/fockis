import {
  useNavigate,
} from "react-router-dom";

import {
  businessesApi,
} from "../services/businessesApi";

import type {
  Business,
} from "../types/business.types";


interface Props {
  business: Business;
}


/* ============================================================================
   CATEGORY LABELS
============================================================================ */

const categoryLabels: Record<
  Business["category"],
  string
> = {
  AUTOMOTIVE: "🚗 Automotive",
  RESTAURANT: "🍔 Restaurant",
  REAL_ESTATE: "🏠 Real Estate",
  RETAIL: "🛍️ Retail",
  BEAUTY: "💄 Beauty",
  HEALTH: "❤️ Health",
  FITNESS: "🏋️ Fitness",
  TECHNOLOGY: "💻 Technology",
  PROFESSIONAL_SERVICES:
    "💼 Professional Services",
  HOME_SERVICES: "🔨 Home Services",
  ENTERTAINMENT: "🎬 Entertainment",
  TRAVEL: "✈️ Travel",
  EDUCATION: "🎓 Education",
  FINANCE: "💰 Finance",
  OTHER: "🏢 Business",
};


/* ============================================================================
   COMPONENT
============================================================================ */

export default function BusinessSpotlightCard({
  business,
}: Props) {

  const navigate = useNavigate();


  /* ==========================================================================
     PRIMARY DEAL
  ========================================================================== */

  const primaryDeal =
    business.deals?.find(
      (deal) =>
        deal.active &&
        (
          !deal.expiresAt ||
          new Date(
            deal.expiresAt,
          ).getTime() > Date.now()
        ),
    ) ||
    business.deals?.[0];


  /* ==========================================================================
     VIEW BUSINESS
  ========================================================================== */

  const handleViewBusiness = () => {

    if (!business.id) {
      console.error(
        "Unable to view business: missing business ID.",
        business,
      );

      return;
    }

    businessesApi
      .trackView(
        business.id,
      )
      .catch((error: unknown) => {
        console.error(
          "Unable to track business view:",
          error,
        );
      });

    navigate(
      `/business/${business.id}`,
    );
  };


  /* ==========================================================================
     WEBSITE
  ========================================================================== */

  const handleWebsite = () => {

    if (
      !business.websiteUrl ||
      !business.id
    ) {
      return;
    }

    businessesApi
      .trackWebsiteClick(
        business.id,
      )
      .catch((error: unknown) => {
        console.error(
          "Unable to track website click:",
          error,
        );
      });

    let url =
      business.websiteUrl.trim();

    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {
      url =
        `https://${url}`;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );
  };


  /* ==========================================================================
     LOCATION
  ========================================================================== */

  const location = [
    business.city,
    business.state,
  ]
    .filter(Boolean)
    .join(", ");


  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <article
      className="fk-business-card"
    >

      {/* ======================================================================
         IMAGE
      ====================================================================== */}

      <button
        type="button"
        className="fk-business-card__image-button"
        onClick={handleViewBusiness}
      >

        {business.coverImageUrl ? (

          <img
            src={business.coverImageUrl}
            alt={`${business.name} business`}
            className="fk-business-card__cover"
          />

        ) : (

          <div className="fk-business-card__placeholder">
            🏢
          </div>

        )}


        {(
          business.isVerified ??
          business.verified
        ) && (

          <span className="fk-business-card__verified">
            ✓ Verified
          </span>

        )}

      </button>


      {/* ======================================================================
         CONTENT
      ====================================================================== */}

      <div className="fk-business-card__content">


        {/* ====================================================================
           IDENTITY
        ==================================================================== */}

        <div className="fk-business-card__identity">

          {business.logoUrl ? (

            <img
              src={business.logoUrl}
              alt=""
              className="fk-business-card__logo"
            />

          ) : (

            <div className="fk-business-card__logo fk-business-card__logo--placeholder">
              🏢
            </div>

          )}


          <div className="fk-business-card__name-block">

            <h3>
              {business.name}
            </h3>

            <span>
              {
                categoryLabels[
                  business.category
                ]
              }
            </span>

          </div>

        </div>


        {/* ====================================================================
           DEAL
        ==================================================================== */}

        {primaryDeal && (

          <div className="fk-business-card__deal">

            <div className="fk-business-card__deal-icon">
              🎁
            </div>

            <div>

              <strong>
                {primaryDeal.discount ||
                  primaryDeal.title}
              </strong>

              <p>
                {primaryDeal.title}
              </p>

              {primaryDeal.expiresAt && (

                <small>
                  Expires{" "}
                  {new Date(
                    primaryDeal.expiresAt,
                  ).toLocaleDateString()}
                </small>

              )}

            </div>

          </div>

        )}


        {/* ====================================================================
           LOCATION
        ==================================================================== */}

        {location && (

          <div className="fk-business-card__meta">

            <span>
              📍
            </span>

            <span>
              {location}
            </span>

          </div>

        )}


        {/* ====================================================================
           PHONE
        ==================================================================== */}

        {business.phone && (

          <a
            className="fk-business-card__contact"
            href={`tel:${business.phone}`}
          >
            📞 {business.phone}
          </a>

        )}


        {/* ====================================================================
           ACTIONS
        ==================================================================== */}

        <div className="fk-business-card__actions">

          <button
            type="button"
            onClick={handleViewBusiness}
            className="fk-business-card__view"
          >
            View Business
          </button>


          {business.websiteUrl && (

            <button
              type="button"
              onClick={handleWebsite}
              className="fk-business-card__website"
            >
              🌐 Visit Website
            </button>

          )}

        </div>

      </div>

    </article>
  );
}