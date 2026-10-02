import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";

import type {
  Campaign,
} from "../types/marketingTypes";

import CampaignStatus from "./CampaignStatus";

import {
  deleteCampaign,
} from "../services/marketingApi";


interface Props {
  campaign: Campaign;

  onDeleted?: (
    campaignId: string,
  ) => void;
}


export default function CampaignCard({
  campaign,
  onDeleted,
}: Props) {

  const navigate =
    useNavigate();


  const [
    deleting,
    setDeleting,
  ] = useState(false);


  /* ========================================================================
     CAMPAIGN ID
  ======================================================================== */

  const rawCampaignId =
    campaign._id ??
    campaign.id;


  /*
   * Do not render a campaign card if the
   * backend did not provide an ID.
   */
  if (
    !rawCampaignId
  ) {
    return null;
  }


  /*
   * From this point forward, TypeScript knows
   * this is a real string.
   *
   * Using a separate constant also prevents
   * TypeScript from losing the narrowing inside
   * nested functions.
   */
  const id: string =
    rawCampaignId;


  /* ========================================================================
     DELETE CAMPAIGN
  ======================================================================== */

  async function handleDelete(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {

    event.preventDefault();

    event.stopPropagation();


    if (deleting) {
      return;
    }


    const confirmed =
      window.confirm(
        `Remove "${campaign.name}"? This action cannot be undone.`,
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeleting(true);


      /*
       * DELETE:
       *
       * DELETE /marketing/campaigns/:id
       */
      await deleteCampaign(
        id,
      );


      /*
       * Notify the parent so the deleted
       * campaign disappears immediately.
       */
      onDeleted?.(
        id,
      );


    } catch (error) {

      console.error(
        "Failed to delete campaign:",
        error,
      );


      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to remove campaign.",
      );


    } finally {

      setDeleting(false);

    }

  }


  /* ========================================================================
     OPEN CAMPAIGN
  ======================================================================== */

  function handleCardClick(
    event: React.MouseEvent,
  ) {

    const target =
      event.target as HTMLElement;


    /*
     * Do not navigate when clicking
     * the Remove button.
     */
    if (
      target.closest(
        "button",
      )
    ) {
      return;
    }


    /*
     * Do not navigate when clicking
     * the View campaign link.
     */
    if (
      target.closest(
        "a",
      )
    ) {
      return;
    }


    navigate(
      `/marketing/campaigns/${id}`,
    );

  }


  /* ========================================================================
     KEYBOARD NAVIGATION
  ======================================================================== */

  function handleKeyDown(
    event: React.KeyboardEvent,
  ) {

    if (
      event.key ===
      "Enter"
    ) {

      navigate(
        `/marketing/campaigns/${id}`,
      );

    }

  }


  /* ========================================================================
     CARD
  ======================================================================== */

  return (

    <article
      className="fk-campaign-card"
      onClick={
        handleCardClick
      }
      role="link"
      tabIndex={0}
      onKeyDown={
        handleKeyDown
      }
    >

      {/* ==================================================================
          TOP
      ================================================================== */}

      <div
        className="fk-campaign-card-top"
      >

        <CampaignStatus
          status={
            campaign.status
          }
        />

        <span>
          {campaign.objective ??
            "Advertising"}
        </span>

      </div>


      {/* ==================================================================
          CAMPAIGN NAME
      ================================================================== */}

      <h3>
        {campaign.name}
      </h3>


      {/* ==================================================================
          DESCRIPTION
      ================================================================== */}

      {campaign.description && (

        <p>
          {campaign.description}
        </p>

      )}


      {/* ==================================================================
          STATS
      ================================================================== */}

      <div
        className="fk-campaign-card-stats"
      >

        <div>

          <strong>

            $
            {Number(
              campaign.totalBudget ??
                campaign.budget ??
                0,
            ).toFixed(2)}

          </strong>

          <span>
            Budget
          </span>

        </div>


        <div>

          <strong>

            $
            {Number(
              campaign.spent ??
                0,
            ).toFixed(2)}

          </strong>

          <span>
            Spent
          </span>

        </div>

      </div>


      {/* ==================================================================
          ACTIONS
      ================================================================== */}

      <div
        className="fk-campaign-card-actions"
        onClick={(
          event,
        ) => {
          event.stopPropagation();
        }}
      >

        <Link
          to={`/marketing/campaigns/${id}`}
          className="fk-campaign-card-view"
        >
          View campaign
        </Link>


        <button
          type="button"
          className="fk-campaign-card-delete"
          onClick={
            handleDelete
          }
          disabled={
            deleting
          }
        >

          {deleting
            ? "Removing..."
            : "Remove"}

        </button>

      </div>

    </article>

  );
}