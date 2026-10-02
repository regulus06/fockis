import type { ReactNode } from "react";
import React from "react";
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AdminLayout } from "../layouts/AdminLayout";

import { AdminRouteGuard } from "./AdminRouteGuard";
import { PermissionRouteGuard } from "./PermissionRouteGuard";

import {
  PERMISSIONS,
  type PermissionValue,
} from "../permissions/permission.constants";

import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdministratorsPage } from "../pages/AdministratorsPage";
import { AuditLogsPage } from "../pages/AuditLogsPage";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";
import { ModulePendingPage } from "../pages/ModulePendingPage";

/* ================================================================
   ADMIN RBAC
================================================================ */

import AdminRolesPage from "../pages/AdminRolesPage";
import AdminRoleDetailsPage from "../pages/AdminRoleDetailsPage";
import AdminRoleCreatePage from "../pages/AdminRoleCreatePage";
import AdminPermissionsPage from "../pages/AdminPermissionsPage";

/* ================================================================
   USER ADMIN
================================================================ */

import UserAdminRoutes from "../users/routes/UserAdminRoutes";

/* ================================================================
   MUSIC ADMIN
================================================================ */

import MusicRulesPage from "../pages/MusicRulesPage";
import MusicProducerApplicationsPage from "../pages/MusicProducerApplicationsPage";

/* ================================================================
   FOCKIS AI / VAPI ADMIN
================================================================ */

import AiAdminRoutes from "../fockis-ai-admin-frontend/routes/AiAdminRoutes";

/* ================================================================
   DOMAIN ADMIN
================================================================ */

import DomainAdminDashboard from "../domains/pages/DomainAdminDashboard";
import DomainSettingsPage from "../domains/pages/DomainSettingsPage";
import DomainCampaignsPage from "../domains/pages/DomainCampaignsPage";
import DomainAuthorizationsPage from "../domains/pages/DomainAuthorizationsPage";
import DomainManagementPage from "../domains/pages/DomainManagementPage";

/* ================================================================
   MESSAGES ADMIN
================================================================ */

import MessageAdminDashboard from "../messages/pages/MessageAdminDashboard";
import MessageUsersPage from "../messages/pages/MessageUsersPage";
import FockisIdManagementPage from "../messages/pages/FockisIdManagementPage";
import FockisIdPricingPage from "../messages/pages/FockisIdPricingPage";
import MessageSettingsPage from "../messages/pages/MessageSettingsPage";
import CallSettingsPage from "../messages/pages/CallSettingsPage";
import AttachmentSettingsPage from "../messages/pages/AttachmentSettingsPage";
import MessageReportsPage from "../messages/pages/MessageReportsPage";

/* ================================================================
   FOCKIS TRAVEL ADMIN
================================================================ */

import TravelAdminDashboard from "../travel/pages/TravelAdminDashboard";
import TravelUsersPage from "../travel/pages/TravelUsersPage";
import TravelPartnersPage from "../travel/pages/TravelPartnersPage";
import TravelPartnerDetailsPage from "../travel/pages/TravelPartnerDetailsPage";
import TravelPartnerApplicationsPage from "../travel/pages/TravelPartnerApplicationsPage";
import TravelPartnerApplicationDetailsPage from "../travel/pages/TravelPartnerApplicationDetailsPage";
import TravelListingsPage from "../travel/pages/TravelListingsPage";
import TravelBookingsPage from "../travel/pages/TravelBookingsPage";

/* ================================================================
   FOCKIS FINANCE ADMIN
================================================================ */

import FinanceAdminRoutes from "../finance/routes/FinanceAdminRoutes";

/* ================================================================
   FOCKIS SHOP PLATFORM ADMIN
================================================================ */

import ShopAdminRoutes from "../shop/routes/ShopAdminRoutes";

/* ================================================================
   FOCKIS MARKETING ADMIN
================================================================ */

import MarketingAdminRoutes from "../marketing-admin-frontend/MarketingAdminRoutes";

/* ================================================================
   PERMISSION SHORTCUT
================================================================ */

const P = PERMISSIONS;

function guarded(
  anyOf: PermissionValue[],
  element: ReactNode,
): ReactNode {
  return (
    <PermissionRouteGuard requireAny={anyOf}>
      {element}
    </PermissionRouteGuard>
  );
}

/* ================================================================
   MESSAGE SETTINGS ROUTE
================================================================ */

function MessageSettingsRoute(): React.ReactElement {
  return <MessageSettingsPage />;
}

/* ================================================================
   ADMIN ROUTES
================================================================ */

export function AdminRoutes(): React.ReactElement {
  return (
    <AdminRouteGuard>
      <Routes>
        <Route element={<AdminLayout />}>

          {/* ======================================================
              ADMIN ROOT
          ====================================================== */}

          <Route
            index
            element={
              <Navigate
                to="dashboard"
                replace
              />
            }
          />

          {/* ======================================================
              DASHBOARD
          ====================================================== */}

          <Route
            path="dashboard"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <AdminDashboardPage />,
            )}
          />

          {/* ======================================================
              USERS

              All /admin/users/* routes are handled by
              UserAdminRoutes.
          ====================================================== */}

          <Route
            path="users/*"
            element={guarded(
              [P.USERS_VIEW],
              <UserAdminRoutes />,
            )}
          />

          {/* ======================================================
              ADMINISTRATORS
          ====================================================== */}

          <Route
            path="administrators"
            element={guarded(
              [P.ADMINS_VIEW],
              <AdministratorsPage />,
            )}
          />

          <Route
            path="administrators/create"
            element={guarded(
              [P.ADMINS_CREATE],
              <ModulePendingPage
                title="Create Administrator"
                description="Create a new administrator account and assign a role."
              />,
            )}
          />

          <Route
            path="administrators/:id"
            element={guarded(
              [P.ADMINS_VIEW],
              <ModulePendingPage
                title="Administrator Details"
                description="Administrator profile, sessions, and permissions."
              />,
            )}
          />

          {/* ======================================================
              ROLES / PERMISSIONS
          ====================================================== */}

          <Route
            path="roles"
            element={guarded(
              [P.ROLES_VIEW],
              <AdminRolesPage />,
            )}
          />

          <Route
            path="roles/create"
            element={guarded(
              [
                P.ROLES_CREATE,
                P.PERMISSIONS_ASSIGN,
              ],
              <AdminRoleCreatePage />,
            )}
          />

          <Route
            path="roles/:id"
            element={guarded(
              [P.ROLES_VIEW],
              <AdminRoleDetailsPage />,
            )}
          />

          <Route
            path="permissions"
            element={guarded(
              [P.PERMISSIONS_VIEW],
              <AdminPermissionsPage />,
            )}
          />

          {/* ======================================================
              MODERATION
          ====================================================== */}

          <Route
            path="moderation"
            element={guarded(
              [P.MODERATION_VIEW],
              <ModulePendingPage
                title="Moderation"
                description="Reports, moderation cases, and content review."
              />,
            )}
          />

          <Route
            path="moderation/reports"
            element={guarded(
              [P.MODERATION_VIEW],
              <ModulePendingPage
                title="Reports"
                description="User and content reports awaiting review."
              />,
            )}
          />

          <Route
            path="moderation/cases"
            element={guarded(
              [P.MODERATION_VIEW],
              <ModulePendingPage
                title="Moderation Cases"
                description="Open and resolved moderation cases."
              />,
            )}
          />

          {/* ======================================================
              SUPPORT / RECOVERY
          ====================================================== */}

          <Route
            path="support/cases"
            element={guarded(
              [P.SUPPORT_VIEW],
              <ModulePendingPage
                title="Support Cases"
                description="Support tickets raised by platform users."
              />,
            )}
          />

          <Route
            path="recovery"
            element={guarded(
              [P.USERS_RECOVERY],
              <ModulePendingPage
                title="Account Recovery"
                description="Identity verification and password reset cases."
              />,
            )}
          />

          <Route
            path="recovery/:id"
            element={guarded(
              [P.USERS_RECOVERY],
              <ModulePendingPage
                title="Recovery Case"
                description="Case detail and verification steps."
              />,
            )}
          />

          {/* ======================================================
              MARKETPLACE
          ====================================================== */}

          <Route
            path="marketplace/products"
            element={guarded(
              [P.MARKETPLACE_PRODUCTS_VIEW],
              <ModulePendingPage
                title="Marketplace Products"
                description="Product listings pending approval or review."
              />,
            )}
          />

          <Route
            path="marketplace/sellers"
            element={guarded(
              [P.MARKETPLACE_SELLERS_VIEW],
              <ModulePendingPage
                title="Sellers"
                description="Seller accounts and approval status."
              />,
            )}
          />

          <Route
            path="marketplace/stores"
            element={guarded(
              [P.MARKETPLACE_VIEW],
              <ModulePendingPage
                title="Stores"
                description="Storefronts across the marketplace."
              />,
            )}
          />

          <Route
            path="marketplace/orders"
            element={guarded(
              [P.MARKETPLACE_ORDERS_VIEW],
              <ModulePendingPage
                title="Orders"
                description="Marketplace order activity."
              />,
            )}
          />

          <Route
            path="marketplace/disputes"
            element={guarded(
              [P.MARKETPLACE_DISPUTES_MANAGE],
              <ModulePendingPage
                title="Disputes"
                description="Buyer and seller disputes awaiting resolution."
              />,
            )}
          />

          <Route
            path="marketplace/reviews"
            element={guarded(
              [P.MARKETPLACE_REVIEWS_MANAGE],
              <ModulePendingPage
                title="Marketplace Reviews"
                description="Product and seller reviews."
              />,
            )}
          />

          <Route
            path="seller"
            element={guarded(
              [P.MARKETPLACE_SELLERS_VIEW],
              <ModulePendingPage
                title="Seller Center"
                description="Seller management console."
              />,
            )}
          />

          {/* ======================================================
              SHIPPING
          ====================================================== */}

          <Route
            path="shipping"
            element={guarded(
              [P.SHIPPING_VIEW],
              <ModulePendingPage
                title="Shipping"
                description="Shipments, exceptions, and tracking."
              />,
            )}
          />

          {/* ======================================================
              FOCKIS SHOP PLATFORM ADMIN
          ====================================================== */}

          <Route
            path="shop/*"
            element={guarded(
              [P.MARKETPLACE_VIEW],
              <ShopAdminRoutes />,
            )}
          />

          {/* ======================================================
              FOCKIS FINANCE ADMIN

              FinanceAdminRoutes owns ALL /admin/finance/*
              routes.
          ====================================================== */}

          <Route
            path="finance/*"
            element={guarded(
              [P.FINANCE_VIEW],
              <FinanceAdminRoutes />,
            )}
          />

          {/* ======================================================
              SUBSCRIPTIONS / GIFTS
          ====================================================== */}

          <Route
            path="subscriptions"
            element={guarded(
              [P.SUBSCRIPTIONS_VIEW],
              <ModulePendingPage
                title="Subscriptions"
                description="Subscription plans and subscribers."
              />,
            )}
          />

          <Route
            path="gifts"
            element={guarded(
              [P.GIFTS_VIEW],
              <ModulePendingPage
                title="Gifts"
                description="Gift catalog and transactions."
              />,
            )}
          />

          {/* ======================================================
              FOCKIS MARKETING ADMIN

              IMPORTANT:
              MarketingAdminRoutes owns the complete:

              /admin/marketing-admin/*
              
              route tree.
          ====================================================== */}

          <Route
            path="marketing-admin/*"
            element={
              <MarketingAdminRoutes />
            }
          />

          {/* ======================================================
              LEGACY MARKETING ROUTES

              Keep these redirects so old sidebar/bookmarks do
              not produce 403 or dead pages.
          ====================================================== */}

          <Route
            path="marketing/campaigns"
            element={
              <Navigate
                to="/admin/marketing-admin/campaigns"
                replace
              />
            }
          />

          <Route
            path="marketing/ads"
            element={
              <Navigate
                to="/admin/marketing-admin/ads"
                replace
              />
            }
          />

          <Route
            path="marketing/pending-review"
            element={
              <Navigate
                to="/admin/marketing-admin/pending-review"
                replace
              />
            }
          />

          <Route
            path="marketing/analytics"
            element={
              <Navigate
                to="/admin/marketing-admin/analytics"
                replace
              />
            }
          />

          {/* ======================================================
              FOCKIS AI / VAPI ADMIN
          ====================================================== */}

          <Route
            path="ai/*"
            element={guarded(
              [P.AI_VIEW],
              <AiAdminRoutes />,
            )}
          />

          {/* ======================================================
              FOCKIS MUSIC
          ====================================================== */}

          <Route
            path="music/rules"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <MusicRulesPage />,
            )}
          />

          <Route
            path="music/producers"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <MusicProducerApplicationsPage />,
            )}
          />

          {/* ======================================================
              FOCKIS TRAVEL
          ====================================================== */}

          <Route
            path="travel"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelAdminDashboard />,
            )}
          />

          <Route
            path="travel/users"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelUsersPage />,
            )}
          />

          <Route
            path="travel/partners"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelPartnersPage />,
            )}
          />

          <Route
            path="travel/partners/:id"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelPartnerDetailsPage />,
            )}
          />

          <Route
            path="travel/applications"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelPartnerApplicationsPage />,
            )}
          />

          <Route
            path="travel/applications/:id"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelPartnerApplicationDetailsPage />,
            )}
          />

          <Route
            path="travel/listings"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelListingsPage />,
            )}
          />

          <Route
            path="travel/bookings"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <TravelBookingsPage />,
            )}
          />

          {/* ======================================================
              MESSAGES
          ====================================================== */}

          <Route
            path="messages"
            element={guarded(
              [P.USERS_VIEW],
              <MessageAdminDashboard />,
            )}
          />

          <Route
            path="messages/users"
            element={guarded(
              [P.USERS_VIEW],
              <MessageUsersPage />,
            )}
          />

          <Route
            path="messages/fockis-ids"
            element={guarded(
              [P.USERS_VIEW],
              <FockisIdManagementPage />,
            )}
          />

          <Route
            path="messages/fockis-ids/pricing"
            element={guarded(
              [P.FINANCE_VIEW],
              <FockisIdPricingPage />,
            )}
          />

          <Route
            path="messages/settings"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <MessageSettingsRoute />,
            )}
          />

          <Route
            path="messages/calls"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <CallSettingsPage />,
            )}
          />

          <Route
            path="messages/attachments"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <AttachmentSettingsPage />,
            )}
          />

          <Route
            path="messages/reports"
            element={guarded(
              [P.MODERATION_VIEW],
              <MessageReportsPage />,
            )}
          />

          {/* ======================================================
              DOMAIN ADMINISTRATION
          ====================================================== */}

          <Route
            path="domains"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <DomainAdminDashboard />,
            )}
          />

          <Route
            path="domains/settings"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <DomainSettingsPage />,
            )}
          />

          <Route
            path="domains/campaigns"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <DomainCampaignsPage />,
            )}
          />

          <Route
            path="domains/authorizations"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <DomainAuthorizationsPage />,
            )}
          />

          <Route
            path="domains/management"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <DomainManagementPage />,
            )}
          />

          {/* ======================================================
              LIVE / MEETINGS / OTHER MODULES
          ====================================================== */}

          <Route
            path="live"
            element={guarded(
              [P.LIVE_VIEW],
              <ModulePendingPage
                title="Live"
                description="Live streams and moderation."
              />,
            )}
          />

          <Route
            path="meetings"
            element={guarded(
              [P.MEETINGS_VIEW],
              <ModulePendingPage
                title="Meetings"
                description="Meetings and recordings."
              />,
            )}
          />

          <Route
            path="realestate"
            element={guarded(
              [P.REALESTATE_VIEW],
              <ModulePendingPage
                title="Real Estate"
                description="Properties, agents, and listings."
              />,
            )}
          />

          <Route
            path="documents"
            element={guarded(
              [P.DOCUMENTS_VIEW],
              <ModulePendingPage
                title="Documents"
                description="Scanned documents and OCR jobs."
              />,
            )}
          />

          <Route
            path="design"
            element={guarded(
              [P.DESIGN_VIEW],
              <ModulePendingPage
                title="Design Studio"
                description="Design templates and reported designs."
              />,
            )}
          />

          <Route
            path="playlists"
            element={guarded(
              [P.PLAYLISTS_VIEW],
              <ModulePendingPage
                title="Playlists"
                description="Playlists and reports."
              />,
            )}
          />

          <Route
            path="reviews"
            element={guarded(
              [P.REVIEWS_VIEW],
              <ModulePendingPage
                title="Reviews"
                description="Platform-wide review moderation."
              />,
            )}
          />

          {/* ======================================================
              ANALYTICS
          ====================================================== */}

          <Route
            path="analytics"
            element={guarded(
              [P.ANALYTICS_VIEW],
              <ModulePendingPage
                title="Global Analytics"
                description="Platform-wide analytics and charts."
              />,
            )}
          />

          {/* ======================================================
              SECURITY
          ====================================================== */}

          <Route
            path="security"
            element={guarded(
              [P.SECURITY_VIEW],
              <ModulePendingPage
                title="Security Center"
                description="Security events, sessions, and policies."
              />,
            )}
          />

          <Route
            path="security/events"
            element={guarded(
              [P.SECURITY_EVENTS],
              <ModulePendingPage
                title="Security Events"
                description="Failed logins and suspicious activity."
              />,
            )}
          />

          <Route
            path="security/sessions"
            element={guarded(
              [P.SECURITY_SESSIONS],
              <ModulePendingPage
                title="Admin Sessions"
                description="Active administrator sessions."
              />,
            )}
          />

          <Route
            path="security/policies"
            element={guarded(
              [P.SECURITY_POLICIES],
              <ModulePendingPage
                title="Security Policies"
                description="Platform security policy configuration."
              />,
            )}
          />

          {/* ======================================================
              AUDIT
          ====================================================== */}

          <Route
            path="audit"
            element={guarded(
              [P.AUDIT_VIEW],
              <AuditLogsPage />,
            )}
          />

          {/* ======================================================
              SYSTEM
          ====================================================== */}

          <Route
            path="system/settings"
            element={guarded(
              [P.SYSTEM_SETTINGS],
              <ModulePendingPage
                title="System Settings"
                description="Global platform configuration."
              />,
            )}
          />

          <Route
            path="system/features"
            element={guarded(
              [P.SYSTEM_FEATURES],
              <ModulePendingPage
                title="Feature Flags"
                description="Toggle platform features on or off."
              />,
            )}
          />

          <Route
            path="system/emergency"
            element={guarded(
              [
                P.EMERGENCY_EXECUTE,
                P.EMERGENCY_VIEW,
              ],
              <ModulePendingPage
                title="Emergency Center"
                description="Restricted to SUPER_ADMIN and authorized SECURITY_ADMIN users."
              />,
            )}
          />

          {/* ======================================================
              ACCESS DENIED
          ====================================================== */}

          <Route
            path="403"
            element={<AccessDeniedPage />}
          />

          <Route
            path="*"
            element={<AccessDeniedPage />}
          />

        </Route>
      </Routes>
    </AdminRouteGuard>
  );
}

export default AdminRoutes;