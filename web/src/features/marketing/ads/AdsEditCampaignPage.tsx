/* ============================================================================
   FOCKIS ADS — EDIT CAMPAIGN

   Loads GET /marketing/campaigns/:id and edits it with the same multistep
   builder (PATCH on save). The API refuses edits to ACTIVE or
   PENDING_REVIEW campaigns, so this page explains that instead of showing
   a form that cannot be saved.
============================================================================ */

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { getCampaign } from "../services/campaignApi";

import { STATUS_LABEL, adsPaths, normalizeCampaign } from "./adsModel";
import { adsErrorMessage } from "./useAdsData";
import AdsCampaignBuilder from "./builder/AdsCampaignBuilder";
import { stateFromCampaign } from "./builder/builderModel";

export default function AdsEditCampaignPage() {
  const { campaignId = "" } = useParams<{ campaignId: string }>();
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setRaw(null);
    setLoadError(null);

    getCampaign(campaignId)
      .then((result) => {
        if (!cancelled) setRaw(result as unknown as Record<string, unknown>);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(adsErrorMessage(error, "Unable to load this campaign."));
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const campaign = useMemo(() => (raw ? normalizeCampaign(raw) : null), [raw]);
  const initial = useMemo(() => (raw ? stateFromCampaign(raw) : null), [raw]);
  const locked = campaign?.status === "ACTIVE" || campaign?.status === "PENDING_REVIEW";
  const canSubmit = campaign?.status === "DRAFT" || campaign?.status === "REJECTED";

  return (
    <div className="fk-ads-page">
      <header className="fk-ads-pagehead">
        <div>
          <span className="fk-ads-eyebrow">Edit campaign</span>
          <h1>{campaign ? campaign.name : "Loading…"}</h1>
          {campaign?.status === "PAUSED" && (
            <p>Changing the ad’s content sends it back to draft so it can be reviewed again. Budget and schedule changes keep it paused.</p>
          )}
        </div>
        <Link to={adsPaths.campaign(campaignId)} className="fk-ads-btn fk-ads-btn--ghost">
          <ArrowLeft size={16} aria-hidden="true" /> Back to campaign
        </Link>
      </header>

      {loadError && (
        <div className="fk-ads-alert" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {!raw && !loadError && <span className="fk-ads-skeleton" aria-busy="true" aria-label="Loading campaign" />}

      {campaign && locked && (
        <div className="fk-ads-empty fk-ads-empty--page">
          <strong>This campaign can’t be edited right now</strong>
          <p>
            It is {STATUS_LABEL[campaign.status].toLowerCase()}.{" "}
            {campaign.status === "ACTIVE" ? "Pause it first, then edit it." : "Wait for the review to finish."}
          </p>
          <Link to={adsPaths.campaign(campaign.id)} className="fk-ads-btn fk-ads-btn--soft">
            Back to campaign
          </Link>
        </div>
      )}

      {campaign && !locked && initial && (
        <AdsCampaignBuilder key={campaign.id} mode="edit" campaignId={campaign.id} initial={initial} canSubmit={canSubmit} />
      )}
    </div>
  );
}
