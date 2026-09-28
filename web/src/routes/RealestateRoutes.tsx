import { Route } from "react-router-dom";

import RealEstatePage
  from "../features/realestate/pages/RealEstatePage";

import PropertyDetailsPage
  from "../features/realestate/pages/PropertyDetailsPage";

import CreatePropertyPage
  from "../features/realestate/pages/CreatePropertyPage";

import EditPropertyPage
  from "../features/realestate/pages/EditPropertyPage";

import SavedPropertiesPage
  from "../features/realestate/pages/SavedPropertiesPage";

import AgentProfilePage
  from "../features/realestate/pages/AgentProfilePage";


/* ============================================================================
   REAL ESTATE ROUTES
============================================================================ */

export function RealestateRoutes() {
  return (
    <>
      <Route
        path="/realestate"
        element={<RealEstatePage />}
      />

      <Route
        path="/realestate/create"
        element={<CreatePropertyPage />}
      />

      <Route
        path="/realestate/saved"
        element={<SavedPropertiesPage />}
      />

      <Route
        path="/realestate/property/:id"
        element={<PropertyDetailsPage />}
      />

      <Route
        path="/realestate/property/:id/edit"
        element={<EditPropertyPage />}
      />

      <Route
        path="/realestate/agent/:agentId"
        element={<AgentProfilePage />}
      />
    </>
  );
}