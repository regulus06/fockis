/* ============================================================================
   FOCKIS ADS — ROUTES

   Mounted at /ads/* in App.tsx. /marketing/* stays with Fockis Mail.
   Every sidebar item in AdsShell points at one of these routes.
============================================================================ */

import { Navigate, Route, Routes } from "react-router-dom";

import AdsShell from "../ads/AdsShell";
import AdsOverviewPage from "../ads/AdsOverviewPage";
import AdsCampaignsPage from "../ads/AdsCampaignsPage";
import AdsAnalyticsPage from "../ads/AdsAnalyticsPage";
import AdsEditCampaignPage from "../ads/AdsEditCampaignPage";
import AdsBillingPage from "../ads/AdsBillingPage";
import AdsCreateCampaignPage from "../ads/AdsCreateCampaignPage";

import CampaignDetailsPage from "../pages/CampaignDetailsPage";
import CampaignAnalyticsPage from "../pages/CampaignAnalyticsPage";
import AdsManagerPage from "../pages/AdsManagerPage";
import MarketingBillingPage from "../pages/MarketingBillingPage";

export default function AdsRoutes() {
  return (
    <Routes>
      <Route element={<AdsShell />}>
        <Route index element={<AdsOverviewPage />} />
        <Route path="campaigns" element={<AdsCampaignsPage />} />
        <Route path="campaigns/create" element={<AdsCreateCampaignPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetailsPage />} />
        <Route path="campaigns/:campaignId/edit" element={<AdsEditCampaignPage />} />
        <Route path="campaigns/:campaignId/analytics" element={<CampaignAnalyticsPage />} />
        <Route path="creatives" element={<AdsManagerPage />} />
        <Route path="analytics" element={<AdsAnalyticsPage />} />
        <Route path="campaigns/:campaignId/budget" element={<MarketingBillingPage />} />
        <Route path="billing" element={<AdsBillingPage />} />
        <Route path="*" element={<Navigate to="/ads" replace />} />
      </Route>
    </Routes>
  );
}
