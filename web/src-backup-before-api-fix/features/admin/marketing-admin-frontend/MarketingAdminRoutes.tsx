import React from "react";
import { Route, Routes } from "react-router-dom";

import MarketingAdminLayout from "./layout/MarketingAdminLayout";

import {
  MarketingOverviewPage,
  MarketingCampaignsPage,
  MarketingAdsPage,
  MarketingPendingReviewPage,
  MarketingAnalyticsPage,
  MarketingAdvertisersPage,
  MarketingWorkflowPage,
  MarketingAuditPage,
} from "./pages";

export default function MarketingAdminRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route element={<MarketingAdminLayout />}>
        <Route index element={<MarketingOverviewPage />} />

        <Route
          path="campaigns"
          element={<MarketingCampaignsPage />}
        />

        <Route
          path="ads"
          element={<MarketingAdsPage />}
        />

        <Route
          path="pending-review"
          element={<MarketingPendingReviewPage />}
        />

        <Route
          path="analytics"
          element={<MarketingAnalyticsPage />}
        />

        <Route
          path="advertisers"
          element={<MarketingAdvertisersPage />}
        />

        <Route
          path="workflow"
          element={<MarketingWorkflowPage />}
        />

        <Route
          path="audit"
          element={<MarketingAuditPage />}
        />
      </Route>
    </Routes>
  );
}