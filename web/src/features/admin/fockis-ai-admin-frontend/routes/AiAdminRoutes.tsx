import React from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AiAdminDashboard from "../pages/AiAdminDashboard";
import AiPlansPage from "../pages/AiPlansPage";
import AiUsersPage from "../pages/AiUsersPage";
import AiConversationsPage from "../pages/AiConversationsPage";
import AiToolsPage from "../pages/AiToolsPage";
import AiRecommendationsPage from "../pages/AiRecommendationsPage";
import AiSpecialAdsPage from "../pages/AiSpecialAdsPage";
import AiUsagePage from "../pages/AiUsagePage";
import AiSettingsPage from "../pages/AiSettingsPage";

export default function AiAdminRoutes() {
  return (
    <Routes>
      {/* =====================================================
          AI ADMIN DASHBOARD
      ===================================================== */}

      <Route
        index
        element={<AiAdminDashboard />}
      />

      {/* =====================================================
          PLANS & ACCESS
      ===================================================== */}

      <Route
        path="plans"
        element={<AiPlansPage />}
      />

      {/* =====================================================
          USER AI ACCESS
      ===================================================== */}

      <Route
        path="users"
        element={<AiUsersPage />}
      />

      {/* =====================================================
          AI CONVERSATIONS
      ===================================================== */}

      <Route
        path="conversations"
        element={<AiConversationsPage />}
      />

      {/* =====================================================
          AI TOOLS / VAPI TOOLS
      ===================================================== */}

      <Route
        path="tools"
        element={<AiToolsPage />}
      />

      {/* =====================================================
          AI RECOMMENDATIONS
      ===================================================== */}

      <Route
        path="recommendations"
        element={<AiRecommendationsPage />}
      />

      {/* =====================================================
          SPECIAL AI ADS
      ===================================================== */}

      <Route
        path="special-ads"
        element={<AiSpecialAdsPage />}
      />

      {/* =====================================================
          AI USAGE
      ===================================================== */}

      <Route
        path="usage"
        element={<AiUsagePage />}
      />

      {/* =====================================================
          AI SETTINGS
      ===================================================== */}

      <Route
        path="settings"
        element={<AiSettingsPage />}
      />

      {/* =====================================================
          UNKNOWN AI ROUTE
          Send the administrator back to the dashboard.
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/admin/ai"
            replace
          />
        }
      />
    </Routes>
  );
}