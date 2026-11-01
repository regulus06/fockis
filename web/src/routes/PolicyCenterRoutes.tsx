import { Navigate, Route } from "react-router-dom";

import PolicyOverviewPage from "../features/user-policy/pages/PolicyOverviewPage";
import PolicyGuidelinesPage from "../features/user-policy/pages/PolicyGuidelinesPage";
import PolicyPrivacyPage from "../features/user-policy/pages/PolicyPrivacyPage";
import PolicyDataPage from "../features/user-policy/pages/PolicyDataPage";
import PolicyConsentPage from "../features/user-policy/pages/PolicyConsentPage";
import PolicySafetyPage from "../features/user-policy/pages/PolicySafetyPage";
import PolicyAppealsPage from "../features/user-policy/pages/PolicyAppealsPage";
import PolicyHistoryPage from "../features/user-policy/pages/PolicyHistoryPage";
import LegalPolicyPage from "../pages/legal/LegalPolicyPage";

/**
 * Policy, Privacy & Safety (/settings/policy/*) for members, and the public
 * policy pages (/policies, /policies/:slug). Policy text always comes from the
 * published versions managed in Admin → Policy & Compliance.
 */
export function PolicyCenterRoutes() {
  return (
    <>
      <Route path="/settings/policy" element={<PolicyOverviewPage />} />
      <Route path="/settings/policy/guidelines" element={<PolicyGuidelinesPage />} />
      <Route path="/settings/policy/guidelines/:slug" element={<PolicyGuidelinesPage />} />
      <Route path="/settings/policy/privacy" element={<PolicyPrivacyPage />} />
      <Route path="/settings/policy/data" element={<PolicyDataPage />} />
      <Route path="/settings/policy/consent" element={<PolicyConsentPage />} />
      <Route path="/settings/policy/safety" element={<PolicySafetyPage />} />
      <Route path="/settings/policy/appeals" element={<PolicyAppealsPage />} />
      <Route path="/settings/policy/history" element={<PolicyHistoryPage />} />
      <Route path="/settings/policy/*" element={<Navigate to="/settings/policy" replace />} />

      <Route path="/policies" element={<LegalPolicyPage />} />
      <Route path="/policies/:slug" element={<LegalPolicyPage />} />
      <Route path="/fockis-shop-policy" element={<LegalPolicyPage slug="fockis-shop" />} />
    </>
  );
}
