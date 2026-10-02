import { Route, Routes } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import TravelAdminDashboard from "../pages/TravelAdminDashboard";
import TravelBookingsPage from "../pages/TravelBookingsPage";
import TravelListingsPage from "../pages/TravelListingsPage";
import TravelPartnerApplicationDetailsPage from "../pages/TravelPartnerApplicationDetailsPage";
import TravelPartnerApplicationsPage from "../pages/TravelPartnerApplicationsPage";
import TravelPartnerDetailsPage from "../pages/TravelPartnerDetailsPage";
import TravelPartnersPage from "../pages/TravelPartnersPage";
import AdminRouteGuard from "./AdminRouteGuard";
import PermissionRouteGuard from "./PermissionRouteGuard";

/**
 * Mount at /admin/travel/* from the parent app's router, e.g.:
 *
 *   <Route path="/admin/travel/*" element={<TravelAdminRoutes />} />
 */
export default function AdminRoutes() {
  return (
    <AdminRouteGuard>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route
            index
            element={
              <PermissionRouteGuard permission="travel.dashboard.view">
                <TravelAdminDashboard />
              </PermissionRouteGuard>
            }
          />

          <Route
            path="applications"
            element={
              <PermissionRouteGuard permission="travel.applications.view">
                <TravelPartnerApplicationsPage />
              </PermissionRouteGuard>
            }
          />

          <Route
            path="applications/:id"
            element={
              <PermissionRouteGuard permission="travel.applications.manage">
                <TravelPartnerApplicationDetailsPage />
              </PermissionRouteGuard>
            }
          />

          <Route
            path="partners"
            element={
              <PermissionRouteGuard permission="travel.partners.view">
                <TravelPartnersPage />
              </PermissionRouteGuard>
            }
          />

          <Route
            path="partners/:id"
            element={
              <PermissionRouteGuard permission="travel.partners.view">
                <TravelPartnerDetailsPage />
              </PermissionRouteGuard>
            }
          />

          <Route
            path="listings"
            element={
              <PermissionRouteGuard permission="travel.listings.view">
                <TravelListingsPage />
              </PermissionRouteGuard>
            }
          />

          <Route
            path="bookings"
            element={
              <PermissionRouteGuard permission="travel.bookings.view">
                <TravelBookingsPage />
              </PermissionRouteGuard>
            }
          />
        </Route>
      </Routes>
    </AdminRouteGuard>
  );
}
