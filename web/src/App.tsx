import React from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";

import Layout from "./components/Layout";

// ============================================================================
// PAYMENT
// ============================================================================

import StripeProvider from "./features/payments/StripeProvider";
import CheckoutPage from "./features/payments/pages/CheckoutPage";

// ============================================================================
// ROUTES
// ============================================================================

import { SellerRoutes } from "./routes/SellerRoutes";
import { AdminRoutes } from "./features/admin/routes/AdminRoutes";
import { RealestateRoutes } from "./routes/RealestateRoutes";
import { CareersRoutes } from "./routes/CareersRoutes";

// ============================================================================
// FOCKIS SHOP
// ============================================================================

import { shopRoutes } from "./features/fockis-shop/routes/shopRoutes";

// ============================================================================
// FOCKIS TRAVEL
// ============================================================================

import TravelRoutes from "./features/fockis-travel/routes/TravelRoutes";

// ============================================================================
// FOCKIS ACADEMY
// ============================================================================

import AcademyRoutes from "./fockis-src/routes/AcademyRoutes";

// ============================================================================
// FOCKIS ORGANIZATIONS
// ============================================================================

import ChurchHomePage from "./features/church/pages/ChurchHomePage";
import ChurchOrganizationsPage from "./features/church/pages/ChurchOrganizationsPage";
import ChurchOrganizationPage from "./features/church/pages/ChurchOrganizationPage";
import ChurchMembersPage from "./features/church/pages/ChurchMembersPage";
import ChurchMemberProfilePage from "./features/church/pages/ChurchMemberProfilePage";
import ChurchDepartmentsPage from "./features/church/pages/ChurchDepartmentsPage";
import ChurchGroupsPage from "./features/church/pages/ChurchGroupsPage";
import ChurchEventsPage from "./features/church/pages/ChurchEventsPage";
import ChurchLivePage from "./features/church/pages/ChurchLivePage";
import ChurchLivestreamPage from "./features/church/pages/ChurchLivestreamPage";
import ChurchAttendancePage from "./features/church/pages/ChurchAttendancePage";
import ChurchCommunicationPage from "./features/church/pages/ChurchCommunicationPage";
import ChurchMediaPage from "./features/church/pages/ChurchMediaPage";
import ChurchPlanVisitPage from "./features/church/pages/ChurchPlanVisitPage";

// ============================================================================
// ORGANIZATION MEMBER PORTAL
// ============================================================================

import ChurchMemberPortalPage from "./features/church/pages/ChurchMemberPortalPage";
import ChurchMemberSettingsPage from "./features/church/pages/ChurchMemberSettingsPage";

// ============================================================================
// ORGANIZATION ADMIN
// ============================================================================

import ChurchAdminDashboard from "./features/church/admin/ChurchAdminDashboard";
import ChurchDepartmentManagement from "./features/church/admin/ChurchDepartmentManagement";
import ChurchEventManagement from "./features/church/admin/ChurchEventManagement";
import ChurchGroupManagement from "./features/church/admin/ChurchGroupManagement";
import ChurchMemberManagement from "./features/church/admin/ChurchMemberManagement";
import ChurchOrganizationForm from "./features/church/admin/ChurchOrganizationForm";
import ChurchSettings from "./features/church/admin/ChurchSettings";
import ChurchAdminMediaPage from "./features/church/admin/ChurchAdminMediaPage";
import ChurchAdminLivestreamPage from "./features/church/admin/live/ChurchAdminLivestreamPage";

// ============================================================================
// AUTH
// ============================================================================

import Login from "./pages/Login";
import Register from "./pages/Register";

// ============================================================================
// GENERAL
// ============================================================================

import FockisFeedPage from "./pages/FockisFeedPage";
import FockisProfilePage from "./features/fockisprofile/pages/FockisProfilePage";

// ============================================================================
// MESSAGES
// ============================================================================

import MessagesPage from "./messages/pages/MessagesPage";
import FockisIdPage from "./messages/pages/FockisIdPage";

// ============================================================================
// MEETINGS
// ============================================================================

import MeetingsRoutes from "./features/meetings/pages/MeetingsRoutes";
import MeetingJoinPage from "./features/meetings/pages/MeetingJoinPage";

// ============================================================================
// MAP
// ============================================================================

import { FockisMap } from "./map/FockisMap";

// ============================================================================
// FRIENDS
// ============================================================================

import FockisFriendsPage from "./features/fockisprofile/pages/FockisFriendsPage";
import FockisSentRequestsPage from "./features/fockisprofile/pages/FockisSentRequestsPage";
import FockisBlockedUsersPage from "./features/fockisprofile/pages/FockisBlockedUsersPage";

// ============================================================================
// ORDERS
// ============================================================================

import OrdersPage from "./features/orders/pages/OrdersPage";

// ============================================================================
// MY LIVE
// ============================================================================

import MyLiveApp from "./my-live/app";
import LiveManagerPage from "./my-live/manager/LiveManagerPage";
import LiveViewer from "./my-live/viewer/LiveViewer";

import "./my-live/styles/app.scss";
import "./my-live/styles/viewer.scss";

// ============================================================================
// GIFTS
// ============================================================================

import GiftStorePage from "./features/gifts/pages/GiftStorePage";
import GiftHistoryPage from "./features/gifts/pages/GiftHistoryPage";

// ============================================================================
// EARNINGS
// ============================================================================

import EarningsPage from "./features/earnings/pages/EarningsPage";

// ============================================================================
// MARKETING
// ============================================================================

import MarketingDashboard from "./features/marketing/pages/MarketingDashboard";
import MarketingCampaignsPage from "./features/marketing/pages/MarketingCampaignsPage";
import CreateCampaignPage from "./features/marketing/pages/CreateCampaignPage";
import CampaignDetailsPage from "./features/marketing/pages/CampaignDetailsPage";
import CampaignAnalyticsPage from "./features/marketing/pages/CampaignAnalyticsPage";
import MarketingBillingPage from "./features/marketing/pages/MarketingBillingPage";
import AdsManagerPage from "./features/marketing/pages/AdsManagerPage";
import MarketingPendingReviewPage from "./features/marketing/pages/MarketingPendingReviewPage";

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

import SubscriptionPage from "./features/subscriptions/pages/SubscriptionPage";
import SubscriptionPlansPage from "./features/subscriptions/pages/SubscriptionPlansPage";
import SubscriptionBillingPage from "./features/subscriptions/pages/SubscriptionBillingPage";
import SubscriptionSuccessPage from "./features/subscriptions/pages/SubscriptionSuccessPage";
import SubscriptionCancelPage from "./features/subscriptions/pages/SubscriptionCancelPage";
import SubscriptionPlanManagementPage from "./features/subscriptions/pages/SubscriptionPlanManagementPage";

// ============================================================================
// WALLET
// ============================================================================

import BuyCoinsPage from "./features/wallet/pages/BuyCoinsPage";

// ============================================================================
// FOCKIS MUSIC
// ============================================================================

import MusicHomePage from "./features/music/pages/MusicHomePage";
import MusicChartsPage from "./features/music/pages/MusicChartsPage";
import MusicContentDetailsPage from "./features/music/pages/MusicContentDetailsPage";
import MusicProducerDashboardPage from "./features/music/pages/MusicProducerDashboardPage";
import MusicCreateReleasePage from "./features/music/pages/MusicCreateReleasePage";
import MusicBecomeProducerPage from "./features/music/pages/MusicBecomeProducerPage";
import MusicProducerProfilePage from "./features/music/pages/MusicProducerProfilePage";
import MusicProducerTeamPage from "./features/music/pages/MusicProducerTeamPage";

// ============================================================================
// FOCKIS ORGANIZATION IDENTITY
// ============================================================================

import OrganizationIdentityLauncherPage from "./features/organization-identity/pages/OrganizationIdentityLauncherPage";
import OrganizationIdentityHomePage from "./features/organization-identity/pages/OrganizationIdentityHomePage";
import OrganizationManagedUsersPage from "./features/organization-identity/pages/OrganizationManagedUsersPage";
import OrganizationCreateUserPage from "./features/organization-identity/pages/OrganizationCreateUserPage";
import OrganizationUserDetailsPage from "./features/organization-identity/pages/OrganizationUserDetailsPage";
import OrganizationDomainsPage from "./features/organization-identity/pages/OrganizationDomainsPage";
import OrganizationAddDomainPage from "./features/organization-identity/pages/OrganizationAddDomainPage";
import OrganizationDomainDetailsPage from "./features/organization-identity/pages/OrganizationDomainDetailsPage";
import OrganizationIdentitySettingsPage from "./features/organization-identity/pages/OrganizationIdentitySettingsPage";

// ============================================================================
// FOCKIS EVENTS
// ============================================================================

import EventsPage from "./features/events/pages/EventsPage";
import CreateEventPage from "./features/events/pages/CreateEventPage";
import EditEventPage from "./features/events/pages/EditEventPage";
import EventDetailsPage from "./features/events/pages/EventDetailsPage";
import MyEventsPage from "./features/events/pages/MyEventsPage";
import MyRsvpsPage from "./features/events/pages/MyRsvpsPage";

// ============================================================================
// BUSINESSES
// ============================================================================

import BusinessesPage from "./features/businesses/pages/BusinessesPage";
import BusinessPage from "./features/businesses/pages/BusinessPage";
import BusinessManagerPage from "./features/businesses/pages/BusinessManagerPage";
import CreateBusinessPage from "./features/businesses/pages/CreateBusinessPage";

// ============================================================================
// CREATE
// ============================================================================

import FockisCreatePage from "./create/pages/FockisCreatePage";
import CreateDocumentPage from "./create/pages/CreateDocumentPage";
import DocumentEditorPage from "./create/pages/DocumentEditorPage";
import DocumentScannerPage from "./create/pages/DocumentScannerPage";

// ============================================================================
// FOCKIS AI
// ============================================================================

import AiStudioPage from "./features/ai/pages/AiStudioPage";
import AiVideoPage from "./features/ai/pages/AiVideoPage";
import AiVideoResultPage from "./features/ai/pages/AiVideoResultPage";
import AiMusicPage from "./features/ai/pages/AiMusicPage";
import AiImagePage from "./features/ai/pages/AiImagePage";
import AiDesignPage from "./features/ai/pages/AiDesignPage";
import AiVoicePage from "./features/ai/pages/AiVoicePage";
import AiHistoryPage from "./features/ai/pages/AiHistoryPage";
import FockisAiPage from "./features/fockis-ai-user-frontend/pages/FockisAiPage";

// ============================================================================
// ORGANIZATION IDENTITY ROUTE WRAPPERS
// ============================================================================

function OrganizationIdentityHomeRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/fockis-preview" replace />;
  }

  return (
    <OrganizationIdentityHomePage
      organizationId={organizationId}
    />
  );
}

function OrganizationManagedUsersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/fockis-preview" replace />;
  }

  return (
    <OrganizationManagedUsersPage
      organizationId={organizationId}
    />
  );
}

function OrganizationDomainsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/fockis-preview" replace />;
  }

  return (
    <OrganizationDomainsPage
      organizationId={organizationId}
    />
  );
}

// ============================================================================
// GENERIC ORGANIZATION ROUTE WRAPPERS
// ============================================================================

function OrganizationHomeRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchOrganizationPage />;
}

function OrganizationMembersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchMembersPage />;
}

function OrganizationMemberProfileRoute(): React.JSX.Element {
  const { organizationId, memberId } =
    useParams<{
      organizationId: string;
      memberId: string;
    }>();

  if (!organizationId || !memberId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchMemberProfilePage />;
}

function OrganizationDepartmentsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchDepartmentsPage />;
}

function OrganizationGroupsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchGroupsPage />;
}

// ============================================================================
// ORGANIZATION MEMBER PORTAL
// ============================================================================

function OrganizationMemberPortalRoute(): React.JSX.Element {
  return <ChurchMemberPortalPage />;
}

function OrganizationMemberSettingsRoute(): React.JSX.Element {
  return <ChurchMemberSettingsPage />;
}

// ============================================================================
// ORGANIZATION EVENTS
// ============================================================================

function OrganizationEventsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <EventsPage />;
}

function OrganizationCreateEventRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/events/create" replace />;
  }

  return <CreateEventPage />;
}

function OrganizationEventDetailsRoute(): React.JSX.Element {
  const { organizationId, eventId } =
    useParams<{
      organizationId: string;
      eventId: string;
    }>();

  if (!organizationId || !eventId) {
    return <Navigate to="/events" replace />;
  }

  return <EventDetailsPage />;
}

function OrganizationEditEventRoute(): React.JSX.Element {
  const { organizationId, eventId } =
    useParams<{
      organizationId: string;
      eventId: string;
    }>();

  if (!organizationId || !eventId) {
    return <Navigate to="/events" replace />;
  }

  return <EditEventPage />;
}

// ============================================================================
// OTHER ORGANIZATION ROUTES
// ============================================================================

function OrganizationLiveRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchLivePage />;
}

function OrganizationMediaRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchMediaPage />;
}

function OrganizationCommunicationRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchCommunicationPage />;
}

function OrganizationAttendanceRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchAttendancePage />;
}

function OrganizationVisitRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchPlanVisitPage />;
}

// ============================================================================
// ORGANIZATION ADMIN ROUTES
// ============================================================================

function OrganizationAdminDashboardRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchAdminDashboard />;
}

function OrganizationAdminMembersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchMemberManagement />;
}

function OrganizationAdminDepartmentsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchDepartmentManagement />;
}

function OrganizationAdminGroupsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchGroupManagement />;
}

function OrganizationAdminEventsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchEventManagement />;
}

function OrganizationAdminLiveRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchAdminLivestreamPage />;
}

function OrganizationAdminMediaRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchAdminMediaPage />;
}

function OrganizationAdminSettingsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <ChurchSettings />;
}

// ============================================================================
// ORGANIZATION ADMIN IDENTITY
// ============================================================================

function OrganizationAdminIdentityRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <OrganizationIdentityHomePage
      organizationId={organizationId}
    />
  );
}

function OrganizationAdminManagedUsersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <OrganizationManagedUsersPage
      organizationId={organizationId}
    />
  );
}

function OrganizationAdminCreateUserRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationCreateUserPage />;
}

function OrganizationAdminUserDetailsRoute(): React.JSX.Element {
  const { organizationId, userId } =
    useParams<{
      organizationId: string;
      userId: string;
    }>();

  if (!organizationId || !userId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationUserDetailsPage />;
}

function OrganizationAdminDomainsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <OrganizationDomainsPage
      organizationId={organizationId}
    />
  );
}

function OrganizationAdminAddDomainRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationAddDomainPage />;
}

function OrganizationAdminDomainDetailsRoute(): React.JSX.Element {
  const { organizationId, domainId } =
    useParams<{
      organizationId: string;
      domainId: string;
    }>();

  if (!organizationId || !domainId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationDomainDetailsPage />;
}

function OrganizationAdminIdentitySettingsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationIdentitySettingsPage />;
}

// ============================================================================
// LEGACY CHURCH ORGANIZATION IDENTITY
// ============================================================================

function ChurchOrganizationIdentityHomeRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/church/organizations" replace />;
  }

  return (
    <OrganizationIdentityHomePage
      organizationId={organizationId}
    />
  );
}

function ChurchOrganizationManagedUsersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/church/organizations" replace />;
  }

  return (
    <OrganizationManagedUsersPage
      organizationId={organizationId}
    />
  );
}

function ChurchOrganizationDomainsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/church/organizations" replace />;
  }

  return (
    <OrganizationDomainsPage
      organizationId={organizationId}
    />
  );
}

// ============================================================================
// LEGACY CREATE USER REDIRECT
// ============================================================================

function LegacyOrganizationCreateUserRedirect(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/fockis-preview" replace />;
  }

  return (
    <Navigate
      to={`/organizations/${encodeURIComponent(
        organizationId,
      )}/identity/users/new`}
      replace
    />
  );
}

// ============================================================================
// MUSIC TEAM
// ============================================================================

function MusicProducerTeamRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organization-identity" replace />;
  }

  return <MusicProducerTeamPage />;
}

// ============================================================================
// UNIVERSAL CHECKOUT
// ============================================================================

export interface CheckoutRouteState {
  type?: string;
  amount?: number;
  currency?: string;
  country?: string;
  purpose?: string;
  referenceId?: string;
  title?: string;
  description?: string;
  metadata?: Record<string, string>;
}

function CheckoutRoute(): React.JSX.Element {
  const location = useLocation();

  const state =
    (location.state ?? {}) as CheckoutRouteState;

  const amount =
    typeof state.amount === "number" &&
    Number.isFinite(state.amount) &&
    state.amount > 0
      ? state.amount
      : 10;

  const currency =
    typeof state.currency === "string" &&
    state.currency.trim().length > 0
      ? state.currency.trim().toUpperCase()
      : "USD";

  const country =
    typeof state.country === "string" &&
    state.country.trim().length > 0
      ? state.country.trim().toUpperCase()
      : "US";

  const purpose =
    typeof state.purpose === "string" &&
    state.purpose.trim().length > 0
      ? state.purpose.trim().toLowerCase()
      : "other";

  const referenceId =
    typeof state.referenceId === "string" &&
    state.referenceId.trim().length > 0
      ? state.referenceId.trim()
      : `checkout-${Date.now()}`;

  const title =
    typeof state.title === "string" &&
    state.title.trim().length > 0
      ? state.title.trim()
      : "Fockis Checkout";

  const description =
    typeof state.description === "string" &&
    state.description.trim().length > 0
      ? state.description.trim()
      : "Complete your payment securely with Fockis.";

  const handleSuccess = (payment: unknown) => {
    console.log(
      "[Fockis Checkout] Payment succeeded:",
      payment,
    );
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/fockis-preview";
  };

  return (
    <StripeProvider>
      <CheckoutPage
        amount={amount}
        currency={currency}
        country={country}
        purpose={purpose}
        referenceId={referenceId}
        title={title}
        description={description}
        metadata={state.metadata}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </StripeProvider>
  );
}

// ============================================================================
// STRIPE TEST CHECKOUT
// ============================================================================

function TestCheckoutRoute(): React.JSX.Element {
  const handleCancel = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "/fockis-preview";
  };

  return (
    <StripeProvider>
      <CheckoutPage
        amount={10}
        currency="USD"
        country="US"
        purpose="other"
        referenceId="stripe-test-001"
        title="Fockis Stripe Test Payment"
        description="This is a test payment using your Fockis Stripe checkout."
        metadata={{
          test: "true",
          source: "fockis-stripe-test",
        }}
        onSuccess={(payment) => {
          console.log(
            "[Fockis Stripe Test] Payment succeeded:",
            payment,
          );
        }}
        onCancel={handleCancel}
      />
    </StripeProvider>
  );
}

// ============================================================================
// APP
// ============================================================================

function App(): React.JSX.Element {
  return (
    <Routes>
      {/* ====================================================================
          AUTH
      ==================================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* ====================================================================
          GLOBAL ADMIN
      ==================================================================== */}

      <Route
        path="/admin/*"
        element={<AdminRoutes />}
      />

      {/* ====================================================================
          PUBLIC LIVE
      ==================================================================== */}

      <Route
        path="/live/:id"
        element={<LiveViewer />}
      />

      <Route
        path="/live/view/:id"
        element={<LiveViewer />}
      />

      {/* ====================================================================
          MY LIVE
      ==================================================================== */}

      <Route
        path="/my-live"
        element={<MyLiveApp />}
      />

      <Route
        path="/my-live/studio"
        element={<MyLiveApp />}
      />

      <Route
        path="/my-live/manager"
        element={<LiveManagerPage />}
      />

      <Route
        path="/live/manager"
        element={<LiveManagerPage />}
      />

      <Route
        path="/my-live/:id"
        element={<MyLiveApp />}
      />

      <Route
        path="/live/studio"
        element={<MyLiveApp />}
      />

      <Route
        path="/live/studio/:id"
        element={<MyLiveApp />}
      />

      {/* ====================================================================
          CANONICAL ORGANIZATIONS
      ==================================================================== */}

      <Route
        path="/organizations"
        element={<ChurchOrganizationsPage />}
      />

      <Route
        path="/organizations/new"
        element={
          <ChurchOrganizationForm
            mode="create"
          />
        }
      />

      <Route
        path="/organization/member-portal"
        element={<OrganizationMemberPortalRoute />}
      />

      <Route
        path="/organization/member"
        element={<OrganizationMemberPortalRoute />}
      />

      <Route
        path="/organization/me"
        element={<OrganizationMemberPortalRoute />}
      />

      <Route
        path="/member/settings"
        element={<OrganizationMemberSettingsRoute />}
      />

      <Route
        path="/organizations/:organizationId"
        element={<OrganizationHomeRoute />}
      />

      <Route
        path="/organizations/:organizationId/visit"
        element={<OrganizationVisitRoute />}
      />

      <Route
        path="/organizations/:organizationId/members"
        element={<OrganizationMembersRoute />}
      />

      <Route
        path="/organizations/:organizationId/members/:memberId"
        element={<OrganizationMemberProfileRoute />}
      />

      <Route
        path="/organizations/:organizationId/departments"
        element={<OrganizationDepartmentsRoute />}
      />

      <Route
        path="/organizations/:organizationId/groups"
        element={<OrganizationGroupsRoute />}
      />

      {/* ====================================================================
          ORGANIZATION EVENTS
      ==================================================================== */}

      <Route
        path="/organizations/:organizationId/events"
        element={<OrganizationEventsRoute />}
      />

      <Route
        path="/organizations/:organizationId/events/create"
        element={<OrganizationCreateEventRoute />}
      />

      <Route
        path="/organizations/:organizationId/events/:eventId/edit"
        element={<OrganizationEditEventRoute />}
      />

      <Route
        path="/organizations/:organizationId/events/:eventId"
        element={<OrganizationEventDetailsRoute />}
      />

      <Route
        path="/organizations/:organizationId/live"
        element={<OrganizationLiveRoute />}
      />

      <Route
        path="/organizations/:organizationId/media"
        element={<OrganizationMediaRoute />}
      />

      <Route
        path="/organizations/:organizationId/communication"
        element={<OrganizationCommunicationRoute />}
      />

      <Route
        path="/organizations/:organizationId/attendance"
        element={<OrganizationAttendanceRoute />}
      />

      {/* ====================================================================
          ORGANIZATION ADMIN
      ==================================================================== */}

      <Route
        path="/organizations/:organizationId/admin"
        element={<OrganizationAdminDashboardRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/dashboard"
        element={<OrganizationAdminDashboardRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/members"
        element={<OrganizationAdminMembersRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/departments"
        element={<OrganizationAdminDepartmentsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/groups"
        element={<OrganizationAdminGroupsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/events"
        element={<OrganizationAdminEventsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/live"
        element={<OrganizationAdminLiveRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/media"
        element={<OrganizationAdminMediaRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/settings"
        element={<OrganizationAdminSettingsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/domains"
        element={<OrganizationAdminDomainsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/domains/new"
        element={<OrganizationAdminAddDomainRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/domains/:domainId"
        element={<OrganizationAdminDomainDetailsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity"
        element={<OrganizationAdminIdentityRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users"
        element={<OrganizationAdminManagedUsersRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users/new"
        element={<OrganizationAdminCreateUserRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users/create"
        element={<OrganizationAdminCreateUserRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users/:userId"
        element={<OrganizationAdminUserDetailsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/domains"
        element={<OrganizationAdminDomainsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/domains/new"
        element={<OrganizationAdminAddDomainRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/domains/:domainId"
        element={<OrganizationAdminDomainDetailsRoute />}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/settings"
        element={<OrganizationAdminIdentitySettingsRoute />}
      />

      {/* ====================================================================
          LEGACY CHURCH
      ==================================================================== */}

      <Route
        path="/church"
        element={<ChurchHomePage />}
      />

      <Route
        path="/church/me"
        element={<ChurchMemberPortalPage />}
      />

      <Route
        path="/church/member"
        element={<ChurchMemberPortalPage />}
      />

      <Route
        path="/church/member-portal"
        element={<ChurchMemberPortalPage />}
      />

      <Route
        path="/church/me/settings"
        element={<ChurchMemberSettingsPage />}
      />

      <Route
        path="/church/member/settings"
        element={<ChurchMemberSettingsPage />}
      />

      <Route
        path="/church/member-portal/settings"
        element={<ChurchMemberSettingsPage />}
      />

      <Route
        path="/church/live"
        element={<ChurchLivestreamPage />}
      />

      <Route
        path="/church/organizations"
        element={<ChurchOrganizationsPage />}
      />

      <Route
        path="/church/organizations/new"
        element={
          <ChurchOrganizationForm
            mode="create"
          />
        }
      />

      <Route
        path="/church/organizations/:organizationId"
        element={<ChurchOrganizationPage />}
      />

      <Route
        path="/church/organizations/:organizationId/visit"
        element={<ChurchPlanVisitPage />}
      />

      <Route
        path="/church/organizations/:organizationId/members"
        element={<ChurchMembersPage />}
      />

      <Route
        path="/church/organizations/:organizationId/members/:memberId"
        element={<ChurchMemberProfilePage />}
      />

      <Route
        path="/church/organizations/:organizationId/departments"
        element={<ChurchDepartmentsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/groups"
        element={<ChurchGroupsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/events"
        element={<ChurchEventsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/live"
        element={<ChurchLivePage />}
      />

      <Route
        path="/church/organizations/:organizationId/media"
        element={<ChurchMediaPage />}
      />

      <Route
        path="/church/organizations/:organizationId/communication"
        element={<ChurchCommunicationPage />}
      />

      <Route
        path="/church/organizations/:organizationId/attendance"
        element={<ChurchAttendancePage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin"
        element={<ChurchAdminDashboard />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/dashboard"
        element={<ChurchAdminDashboard />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/members"
        element={<ChurchMemberManagement />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/departments"
        element={<ChurchDepartmentManagement />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/groups"
        element={<ChurchGroupManagement />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/events"
        element={<ChurchEventManagement />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/live"
        element={<ChurchAdminLivestreamPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/media"
        element={<ChurchAdminMediaPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/settings"
        element={<ChurchSettings />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/domains"
        element={<ChurchOrganizationDomainsRoute />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/domains/new"
        element={<OrganizationAddDomainPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/domains/:domainId"
        element={<OrganizationDomainDetailsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity"
        element={<ChurchOrganizationIdentityHomeRoute />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users"
        element={<ChurchOrganizationManagedUsersRoute />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users/new"
        element={<OrganizationCreateUserPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users/create"
        element={<OrganizationCreateUserPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users/:userId"
        element={<OrganizationUserDetailsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/domains"
        element={<ChurchOrganizationDomainsRoute />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/domains/new"
        element={<OrganizationAddDomainPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/domains/:domainId"
        element={<OrganizationDomainDetailsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/settings"
        element={<OrganizationIdentitySettingsPage />}
      />

      <Route
        path="/church/admin"
        element={<ChurchAdminDashboard />}
      />

      <Route
        path="/church/admin/dashboard"
        element={<ChurchAdminDashboard />}
      />

      <Route
        path="/church/admin/organizations/new"
        element={
          <ChurchOrganizationForm
            mode="create"
          />
        }
      />

      <Route
        path="/church/admin/organizations/:organizationId/edit"
        element={
          <ChurchOrganizationForm
            mode="edit"
          />
        }
      />

      <Route
        path="/church/admin/members"
        element={<ChurchMemberManagement />}
      />

      <Route
        path="/church/admin/departments"
        element={<ChurchDepartmentManagement />}
      />

      <Route
        path="/church/admin/groups"
        element={<ChurchGroupManagement />}
      />

      <Route
        path="/church/admin/events"
        element={<ChurchEventManagement />}
      />

      <Route
        path="/church/admin/live"
        element={<ChurchAdminLivestreamPage />}
      />

      <Route
        path="/church/admin/media"
        element={<ChurchAdminMediaPage />}
      />

      <Route
        path="/church/admin/settings"
        element={<ChurchSettings />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/domains"
        element={<ChurchOrganizationDomainsRoute />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/domains/new"
        element={<OrganizationAddDomainPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/domains/:domainId"
        element={<OrganizationDomainDetailsPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity"
        element={<ChurchOrganizationIdentityHomeRoute />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users"
        element={<ChurchOrganizationManagedUsersRoute />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users/new"
        element={<OrganizationCreateUserPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users/create"
        element={<OrganizationCreateUserPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users/:userId"
        element={<OrganizationUserDetailsPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/domains"
        element={<ChurchOrganizationDomainsRoute />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/domains/new"
        element={<OrganizationAddDomainPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/domains/:domainId"
        element={<OrganizationDomainDetailsPage />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/settings"
        element={<OrganizationIdentitySettingsPage />}
      />

      {/* ====================================================================
          MAIN FOCKIS APPLICATION
      ==================================================================== */}

      <Route element={<Layout />}>

        {/* HOME */}

        <Route
          path="/"
          element={
            <Navigate
              to="/fockis-preview"
              replace
            />
          }
        />

        {/* FEED */}

        <Route
          path="/fockis-preview"
          element={<FockisFeedPage />}
        />

        {/* SHOP */}

        {shopRoutes.map((route) => (
          <Route
            key={String(route.path)}
            path={route.path}
            element={route.element}
          />
        ))}

        {/* ================================================================
            FOCKIS TRAVEL
        ================================================================ */}

        <Route
          path="/travel/*"
          element={<TravelRoutes />}
        />

        {/* ================================================================
            ACADEMY
        ================================================================ */}

        <Route
          path="/academy/*"
          element={<AcademyRoutes />}
        />

        {/* ==================================================================
            CREATE
        ================================================================== */}

        <Route
          path="/create"
          element={<FockisCreatePage />}
        />

        {/* ==================================================================
            FOCKIS AI STUDIO
        ================================================================== */}

        <Route
          path="/create/ai"
          element={<AiStudioPage />}
        />

        <Route
          path="/create/ai/video"
          element={<AiVideoPage />}
        />

        {/* AI VIDEO RESULT
            This route prevents completed AI jobs from falling through
            to the global /fockis-preview fallback.
        */}
        <Route
          path="/ai/jobs/:jobId/media"
          element={<AiVideoResultPage />}
        />

        <Route
          path="/create/ai/music"
          element={<AiMusicPage />}
        />

        <Route
          path="/create/ai/image"
          element={<AiImagePage />}
        />

        <Route
          path="/create/ai/design"
          element={<AiDesignPage />}
        />

        <Route
          path="/create/ai/voice"
          element={<AiVoicePage />}
        />

        <Route
          path="/create/ai/history"
          element={<AiHistoryPage />}
        />

        {/* ==================================================================
            FOCKIS AI — USER ASSISTANT
        ================================================================== */}

        <Route
          path="/fockis-ai"
          element={<FockisAiPage />}
        />

        <Route
          path="/create/documents/new"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/document"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/documents/:documentId"
          element={<DocumentEditorPage />}
        />

        <Route
          path="/create/scanner"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/scan"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/passport-photo"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/id-photo"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/background-remover"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/remove-background"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/handwriting-to-text"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/pdf"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/pdf-scanner"
          element={<DocumentScannerPage />}
        />

        <Route
          path="/create/logo"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/flyer"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/banner"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/badge"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/business-card"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/poster"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/invitation"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/certificate"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/social-media"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/menu"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/letterhead"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/brochure"
          element={<CreateDocumentPage />}
        />

        <Route
          path="/create/templates"
          element={<FockisCreatePage />}
        />

        {/* ==================================================================
            MARKETING
        ================================================================== */}

        <Route
          path="/dashboard"
          element={<MarketingDashboard />}
        />

        <Route
          path="/marketing"
          element={<MarketingDashboard />}
        />

        <Route
          path="/marketing/dashboard"
          element={<MarketingDashboard />}
        />

        <Route
          path="/marketing/campaigns"
          element={<MarketingCampaignsPage />}
        />

        <Route
          path="/marketing/campaigns/create"
          element={<CreateCampaignPage />}
        />

        <Route
          path="/marketing/campaigns/:campaignId"
          element={<CampaignDetailsPage />}
        />

        <Route
          path="/marketing/campaigns/:campaignId/analytics"
          element={<CampaignAnalyticsPage />}
        />

        <Route
          path="/marketing/campaigns/:campaignId/billing"
          element={<MarketingBillingPage />}
        />

        <Route
          path="/marketing/ads"
          element={<AdsManagerPage />}
        />

        <Route
          path="/marketing/ads-manager"
          element={<AdsManagerPage />}
        />

        <Route
          path="/marketing/campaigns/:campaignId/ads"
          element={<AdsManagerPage />}
        />

        <Route
          path="/marketing/review"
          element={<MarketingPendingReviewPage />}
        />

        <Route
          path="/marketing/pending-review"
          element={<MarketingPendingReviewPage />}
        />

        <Route
          path="/marketing/campaigns/:campaignId/review"
          element={<MarketingPendingReviewPage />}
        />

        {/* ==================================================================
            MESSAGES
        ================================================================== */}

        <Route
          path="/messages"
          element={<MessagesPage />}
        />

        <Route
          path="/messages/profile/:userId"
          element={<FockisProfilePage />}
        />

        {/* ==================================================================
            FOCKIS ID
        ================================================================== */}

        <Route
          path="/settings/fockis-id"
          element={<FockisIdPage />}
        />

        {/* ==================================================================
            MEETINGS
        ================================================================== */}

        {/* ----------------------------------------------------------------
            DIRECT MEETING LINK

            Shareable Fockis meeting links use:

              /meet/:joinToken

            Example:

              /meet/Grrlj8qHDSESy0w1IKWkQ-Io

            The join page reads the token from the route and lets the
            participant continue to the lobby.
        ---------------------------------------------------------------- */}

        <Route
          path="/meet/:joinToken"
          element={<MeetingJoinPage />}
        />

        {/* ----------------------------------------------------------------
            MEETINGS APPLICATION

            Dashboard, schedule, invitations, history, lobby, room, etc.
        ---------------------------------------------------------------- */}

        <Route
          path="/meetings/*"
          element={<MeetingsRoutes />}
        />

        {/* ==================================================================
            EVENTS
        ================================================================== */}

        <Route
          path="/events"
          element={<EventsPage />}
        />

        <Route
          path="/events/create"
          element={<CreateEventPage />}
        />

        <Route
          path="/events/my-events"
          element={<MyEventsPage />}
        />

        <Route
          path="/events/my-rsvps"
          element={<MyRsvpsPage />}
        />

        <Route
          path="/events/:eventId/edit"
          element={<EditEventPage />}
        />

        <Route
          path="/events/:eventId"
          element={<EventDetailsPage />}
        />

        {/* ==================================================================
            BUSINESSES
        ================================================================== */}

        <Route
          path="/businesses"
          element={<BusinessesPage />}
        />

        <Route
          path="/business"
          element={<BusinessPage />}
        />

        <Route
          path="/business/manager"
          element={<BusinessManagerPage />}
        />

        <Route
          path="/businesses/manager"
          element={<BusinessManagerPage />}
        />

        <Route
          path="/business/create"
          element={<CreateBusinessPage />}
        />

        <Route
          path="/businesses/create"
          element={<CreateBusinessPage />}
        />

        <Route
          path="/business/deals"
          element={<BusinessManagerPage />}
        />

        <Route
          path="/businesses/deals"
          element={<BusinessManagerPage />}
        />

        <Route
          path="/business/spotlight"
          element={<BusinessManagerPage />}
        />

        <Route
          path="/businesses/spotlight"
          element={<BusinessManagerPage />}
        />

        <Route
          path="/businesses/manage"
          element={
            <Navigate
              to="/business/manager"
              replace
            />
          }
        />

        <Route
          path="/business/:businessId"
          element={<BusinessPage />}
        />

        <Route
          path="/businesses/:businessId"
          element={<BusinessPage />}
        />

        {/* ==================================================================
            MAP
        ================================================================== */}

        <Route
          path="/map"
          element={<FockisMap />}
        />

        {/* ==================================================================
            PROFILE
        ================================================================== */}

        <Route
          path="/profile"
          element={<FockisProfilePage />}
        />

        <Route
          path="/profile/:userId"
          element={<FockisProfilePage />}
        />

        {/* ==================================================================
            FRIENDS
        ================================================================== */}

        <Route
          path="/friends"
          element={<FockisFriendsPage />}
        />

        <Route
          path="/friends/requests"
          element={
            <FockisFriendsPage
              initialTab="requests"
            />
          }
        />

        <Route
          path="/friends/sent"
          element={<FockisSentRequestsPage />}
        />

        <Route
          path="/friends/suggestions"
          element={
            <FockisFriendsPage
              initialTab="suggestions"
            />
          }
        />

        <Route
          path="/friends/blocked"
          element={<FockisBlockedUsersPage />}
        />

        {/* ==================================================================
            MUSIC
        ================================================================== */}

        <Route
          path="/music"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/become-producer"
          element={<MusicBecomeProducerPage />}
        />

        <Route
          path="/music/producer/dashboard"
          element={<MusicProducerDashboardPage />}
        />

        <Route
          path="/music/producer/profile"
          element={<MusicProducerProfilePage />}
        />

        <Route
          path="/music/producer/team"
          element={
            <Navigate
              to="/organization-identity"
              replace
            />
          }
        />

        <Route
          path="/organizations/:organizationId/music/producer/team"
          element={<MusicProducerTeamRoute />}
        />

        <Route
          path="/music/studio"
          element={<MusicProducerDashboardPage />}
        />

        <Route
          path="/music/studio/create"
          element={<MusicCreateReleasePage />}
        />

        <Route
          path="/music/explore"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/charts"
          element={<MusicChartsPage />}
        />

        <Route
          path="/music/tracks"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/videos"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/albums"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/producers"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/premium"
          element={<MusicHomePage />}
        />

        <Route
          path="/music/content/:id"
          element={<MusicContentDetailsPage />}
        />

        <Route
          path="/music/:id"
          element={<MusicContentDetailsPage />}
        />

        {/* ==================================================================
            ORGANIZATION IDENTITY
        ================================================================== */}

        <Route
          path="/organization-identity"
          element={<OrganizationIdentityLauncherPage />}
        />

        <Route
          path="/organizations/:organizationId/identity"
          element={<OrganizationIdentityHomeRoute />}
        />

        <Route
          path="/organizations/:organizationId/identity/users"
          element={<OrganizationManagedUsersRoute />}
        />

        <Route
          path="/organizations/:organizationId/identity/users/new"
          element={<OrganizationCreateUserPage />}
        />

        <Route
          path="/organizations/:organizationId/identity/users/create"
          element={<LegacyOrganizationCreateUserRedirect />}
        />

        <Route
          path="/organizations/:organizationId/identity/users/:userId"
          element={<OrganizationUserDetailsPage />}
        />

        <Route
          path="/organizations/:organizationId/identity/domains"
          element={<OrganizationDomainsRoute />}
        />

        <Route
          path="/organizations/:organizationId/identity/domains/new"
          element={<OrganizationAddDomainPage />}
        />

        <Route
          path="/organizations/:organizationId/identity/domains/:domainId"
          element={<OrganizationDomainDetailsPage />}
        />

        <Route
          path="/organizations/:organizationId/identity/settings"
          element={<OrganizationIdentitySettingsPage />}
        />

        {/* ==================================================================
            GIFTS
        ================================================================== */}

        <Route
          path="/gifts"
          element={<GiftStorePage />}
        />

        <Route
          path="/gifts/history"
          element={<GiftHistoryPage />}
        />

        {/* ==================================================================
            EARNINGS
        ================================================================== */}

        <Route
          path="/earnings"
          element={<EarningsPage />}
        />

        <Route
          path="/earnings/cash-out"
          element={<EarningsPage />}
        />

        <Route
          path="/cash-out"
          element={<EarningsPage />}
        />

        <Route
          path="/creator/earnings"
          element={<EarningsPage />}
        />

        {/* ==================================================================
            WALLET
        ================================================================== */}

        <Route
          path="/wallet"
          element={<BuyCoinsPage />}
        />

        <Route
          path="/wallet/buy"
          element={<BuyCoinsPage />}
        />

        <Route
          path="/wallet/buy-coins"
          element={<BuyCoinsPage />}
        />

        {/* ==================================================================
            UNIVERSAL CHECKOUT
        ================================================================== */}

        <Route
          path="/checkout"
          element={<CheckoutRoute />}
        />

        {/* ==================================================================
            STRIPE TEST CHECKOUT
        ================================================================== */}

        <Route
          path="/test-checkout"
          element={<TestCheckoutRoute />}
        />

        {/* ==================================================================
            SUBSCRIPTIONS
        ================================================================== */}

        <Route
          path="/subscriptions"
          element={<SubscriptionPage />}
        />

        <Route
          path="/subscriptions/plans"
          element={<SubscriptionPlansPage />}
        />

        <Route
          path="/subscriptions/billing"
          element={<SubscriptionBillingPage />}
        />

        <Route
          path="/subscriptions/success"
          element={<SubscriptionSuccessPage />}
        />

        <Route
          path="/subscriptions/cancel"
          element={<SubscriptionCancelPage />}
        />

        <Route
          path="/subscriptions/plan-management"
          element={<SubscriptionPlanManagementPage />}
        />

        {/* ==================================================================
            REAL ESTATE
        ================================================================== */}

        {RealestateRoutes()}

        {/* ==================================================================
            CAREERS
        ================================================================== */}

        {CareersRoutes()}

        {/* ==================================================================
            SELLER
        ================================================================== */}

        {SellerRoutes()}

        {/* ==================================================================
            ORDERS
        ================================================================== */}

        <Route
          path="/orders"
          element={<OrdersPage />}
        />
      </Route>

      {/* ====================================================================
          FINAL FALLBACK
      ==================================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/fockis-preview"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;