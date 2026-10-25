/* ============================================================================
   FOCKIS ADS — CREATE CAMPAIGN (multistep builder)
   Accepts ?objective=&format=&placement= presets from the overview.
============================================================================ */

import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import AdsCampaignBuilder from "./builder/AdsCampaignBuilder";
import { applyPreset, emptyState } from "./builder/builderModel";
import { readPreset } from "./adsPresets";

export default function AdsCreateCampaignPage() {
  const location = useLocation();

  const initial = useMemo(
    () => applyPreset(emptyState(), readPreset(location.search)),
    [location.search],
  );

  return (
    <div className="fk-ads-page">
      <header className="fk-ads-pagehead">
        <div>
          <span className="fk-ads-eyebrow">New campaign</span>
          <h1>Create a campaign</h1>
          <p>Campaigns are saved as drafts and start delivering only after Fockis review approves them.</p>
        </div>
      </header>

      <AdsCampaignBuilder key={location.search} mode="create" initial={initial} />
    </div>
  );
}
