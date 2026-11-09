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
import { HelpRoutes } from "./routes/HelpRoutes";
import { PolicyCenterRoutes } from "./routes/PolicyCenterRoutes";
import NotificationsPage from "./features/notifications/pages/NotificationsPage";
import { EmployerRoutes } from "./features/employer/routes/EmployerRoutes";

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

import OrganizationsHomePage from "./features/organizations/pages/OrganizationsHomePage";
import OrganizationsPage from "./features/organizations/pages/OrganizationsPage";
import OrganizationPage from "./features/organizations/pages/OrganizationPage";
import OrganizationMembersPage from "./features/organizations/pages/OrganizationMembersPage";
import OrganizationMemberProfilePage from "./features/organizations/pages/OrganizationMemberProfilePage";
import OrganizationDepartmentsPage from "./features/organizations/pages/OrganizationDepartmentsPage";
import OrganizationGroupsPage from "./features/organizations/pages/OrganizationGroupsPage";
import OrganizationEventsPage from "./features/organizations/pages/OrganizationEventsPage";
import OrganizationLivePage from "./features/organizations/pages/OrganizationLivePage";
import OrganizationLivestreamPage from "./features/organizations/pages/OrganizationLivestreamPage";
import OrganizationAttendancePage from "./features/organizations/pages/OrganizationAttendancePage";
import OrganizationCommunicationPage from "./features/organizations/pages/OrganizationCommunicationPage";
import OrganizationMediaLibrary from "./features/organizations/pages/OrganizationMediaLibrary";
import OrganizationPlanVisitPage from "./features/organizations/pages/OrganizationPlanVisitPage";
import OrganizationJoinPage from "./features/organizations/pages/OrganizationJoinPage";
import OrganizationMyHistoryPage from "./features/organizations/pages/OrganizationMyHistoryPage";
import OrganizationVisitRequestsPage from "./features/organizations/admin/OrganizationVisitRequestsPage";
import OrganizationBadgesPage from "./features/organizations/admin/OrganizationBadgesPage";
import OrganizationMyBadgePage from "./features/organizations/pages/OrganizationMyBadgePage";
import BadgeVerifyPage from "./features/organizations/badges/BadgeVerifyPage";

// ============================================================================
// ORGANIZATION MEMBER PORTAL
// ============================================================================

import OrganizationMemberPortalPage from "./features/organizations/pages/OrganizationMemberPortalPage";
import OrganizationMemberSettingsPage from "./features/organizations/pages/OrganizationMemberSettingsPage";

// ============================================================================
// ORGANIZATION ADMIN
// ============================================================================

import OrganizationAdminDashboard from "./features/organizations/admin/OrganizationAdminDashboard";
import OrganizationDepartmentManagement from "./features/organizations/admin/OrganizationDepartmentManagement";
import OrganizationEventManagement from "./features/organizations/admin/OrganizationEventManagement";
import OrganizationGroupManagement from "./features/organizations/admin/OrganizationGroupManagement";
import OrganizationMemberManagement from "./features/organizations/admin/OrganizationMemberManagement";
import OrganizationMembersAdminPage from "./features/organizations/admin/OrganizationMembersAdminPage";
import CreateOrganizationWizard from "./features/organizations/admin/CreateOrganizationWizard";
import RequireOrgAdmin, { LegacyAdminRedirect } from "./features/organizations/ui/RequireOrgAdmin";
import OrganizationForm from "./features/organizations/admin/OrganizationForm";
import OrganizationSettingsPage from "./features/organizations/admin/OrganizationSettingsPage";
import OrganizationAdminLivestreamPage from "./features/organizations/admin/live/OrganizationAdminLivestreamPage";

// ============================================================================
// AUTH
// ============================================================================

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// ============================================================================
// GENERAL
// ============================================================================

import FockisFeedPage from "./pages/FockisFeedPage";
import AccountSettingsPage from "./features/account/pages/AccountSettingsPage";
import MyFockisDomainPage from "./features/account/fockis-domain/MyFockisDomainPage";
import MyFockisDomainPayPage from "./features/account/fockis-domain/MyFockisDomainPayPage";
import FockisProfilePage from "./features/gifts/fockisprofile/pages/FockisProfilePage";
import LegalPolicyPage from "./pages/legal/LegalPolicyPage";

// ============================================================================
// MESSAGES
// ============================================================================

import MessagesPage from "./messages/pages/MessagesPage";
import FockisIdPage from "./messages/pages/FockisIdPage";
import CallLayer from "./messages/calls/CallLayer";

// ============================================================================
// MEETINGS
// ============================================================================

import MeetingsRoutes from "./features/meetings/pages/MeetingsRoutes";
import MeetingJoinPage from "./features/meetings/pages/MeetingJoinPage";

// ============================================================================
// MAP
// ============================================================================

import { FockisMap } from "./map/FockisMap";
import MapsApp from "./map/maps/MapsApp";

// ============================================================================
// FRIENDS
// ============================================================================

import FockisFriendsPage from "./features/gifts/fockisprofile/pages/FockisFriendsPage";
import FockisSentRequestsPage from "./features/gifts/fockisprofile/pages/FockisSentRequestsPage";
import FockisBlockedUsersPage from "./features/gifts/fockisprofile/pages/FockisBlockedUsersPage";

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

import FockisMarketingRoutes from "./features/admin/fockismail/routes/FockisMarketingRoutes";
import AdsRoutes from "./features/marketing/routes/AdsRoutes";

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

import SubscriptionPage from "./features/subscriptions/pages/SubscriptionPage";
import SubscriptionPlansPage from "./features/subscriptions/pages/SubscriptionPlans";
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
import MyPlaylistsPage from "./features/playlists/pages/MyPlaylistsPage";
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
import OrganizationDomainCheckoutPage from "./features/organization-identity/pages/OrganizationDomainCheckoutPage";
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
import MyModerationPage from "./features/reports/pages/MyModerationPage";

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

  return <OrganizationPage />;
}

function OrganizationMembersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationMembersPage />;
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

  return <OrganizationMemberProfilePage />;
}

function OrganizationDepartmentsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationDepartmentsPage />;
}

function OrganizationGroupsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationGroupsPage />;
}

// ============================================================================
// ORGANIZATION MEMBER PORTAL
// ============================================================================

function OrganizationMemberPortalRoute(): React.JSX.Element {
  return <OrganizationMemberPortalPage />;
}

function OrganizationMemberSettingsRoute(): React.JSX.Element {
  return <OrganizationMemberSettingsPage />;
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

  return <OrganizationLivePage />;
}

function OrganizationMediaRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationMediaLibrary />;
}

function OrganizationCommunicationRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationCommunicationPage />;
}

function OrganizationAttendanceRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationAttendancePage />;
}

function OrganizationVisitRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationPlanVisitPage />;
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

  return <OrganizationAdminDashboard />;
}

/**
 * /organizations — the Fockis Organizations homepage. Older links that carry
 * search filters (?search=, ?category=, ?type=, ?page=) still open the
 * directory, now at /organizations/discover.
 */
function OrganizationsLandingRoute(): React.JSX.Element {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (["search", "category", "type", "page"].some((k) => params.has(k))) {
    return <Navigate to={`/organizations/discover${search}`} replace />;
  }
  return <OrganizationsHomePage />;
}

function OrganizationAdminMembersRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationMembersAdminPage />;
}

function OrganizationAdminDepartmentsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationDepartmentManagement />;
}

function OrganizationAdminGroupsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationGroupManagement />;
}

function OrganizationAdminEventsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationEventManagement />;
}

function OrganizationAdminLiveRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationAdminLivestreamPage />;
}

function OrganizationAdminMediaRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationMediaLibrary />;
}

function OrganizationAdminSettingsRoute(): React.JSX.Element {
  const { organizationId } =
    useParams<{ organizationId: string }>();

  if (!organizationId) {
    return <Navigate to="/organizations" replace />;
  }

  return <OrganizationSettingsPage />;
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

/** /waves/:postId → that video in the feed's Waves player. */
function WaveRedirect() {
  const { postId = "" } = useParams();
  return <Navigate to={`/fockis-preview?waves=${encodeURIComponent(postId || "1")}`} replace />;
}

function App(): React.JSX.Element {
  return (
    <>
    {/* Incoming / outgoing calls ring on every page, not only in Messages. */}
    <CallLayer />
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

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* ====================================================================
          GLOBAL ADMIN
      ==================================================================== */}

      {/* ====================================================================
          FOCKIS MARKETING ADMIN

          These specific routes must be outside the main Layout route tree.
          The generic /admin/* route is handled by AdminRoutes, so keeping
          these routes inside Layout causes the marketing pages to fall into
          the generic admin router instead of rendering the marketing app.
      ==================================================================== */}

      <Route
        path="/admin/fockismail/*"
        element={
          <FockisMarketingRoutes
            section="mailchimp"
            audienceId={
              import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""
            }
          />
        }
      />

      <Route
        path="/admin/fockismail/agency/*"
        element={
          <FockisMarketingRoutes
            section="agency"
            audienceId={
              import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""
            }
          />
        }
      />

      <Route
        path="/admin/fockismail/billing/*"
        element={
          <FockisMarketingRoutes
            section="billing"
            audienceId={
              import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""
            }
          />
        }
      />

      {/* ====================================================================
          FOCKIS MARKETING ALIAS

          Keep the same Fockis Marketing application available from /marketing
          without introducing duplicate page imports or a second marketing
          router.
      ==================================================================== */}

      <Route
        path="/marketing/*"
        element={
          <FockisMarketingRoutes
            section="mailchimp"
            audienceId={
              import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""
            }
          />
        }
      />

      {/* ====================================================================
          FOCKIS ADS

          Advertiser dashboard (features/marketing). It has its own sidebar,
          so it sits outside the main Layout like Fockis Mail above.
      ==================================================================== */}

      <Route
        path="/ads/*"
        element={<AdsRoutes />}
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
        element={<OrganizationsLandingRoute />}
      />

      <Route
        path="/organizations/discover"
        element={<OrganizationsPage />}
      />

      <Route
        path="/organizations/new"
        element={<CreateOrganizationWizard />}
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

      {/* Shareable join link: a short form to ask to join. */}
      <Route
        path="/organizations/:organizationId/join"
        element={<OrganizationJoinPage />}
      />

      {/* A member's own badge (ID card with QR code). */}
      <Route
        path="/organizations/:organizationId/my-badge"
        element={<OrganizationMyBadgePage />}
      />

      {/* What a badge QR code opens. Public. */}
      <Route
        path="/badges/verify/:token"
        element={<BadgeVerifyPage />}
      />

      {/* A member's own history in this organization. */}
      <Route
        path="/organizations/:organizationId/my-history"
        element={<OrganizationMyHistoryPage />}
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
        element={<RequireOrgAdmin><OrganizationAdminDashboardRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/dashboard"
        element={<RequireOrgAdmin><OrganizationAdminDashboardRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/members"
        element={<RequireOrgAdmin><OrganizationAdminMembersRoute /></RequireOrgAdmin>}
      />

      {/* Join link, add a member by hand, member IDs (the previous members screen). */}
      <Route
        path="/organizations/:organizationId/admin/members/tools"
        element={<RequireOrgAdmin><OrganizationMemberManagement /></RequireOrgAdmin>}
      />

      {/* Member badges: templates, every member's badge, printing. */}
      <Route
        path="/organizations/:organizationId/admin/badges"
        element={<RequireOrgAdmin><OrganizationBadgesPage /></RequireOrgAdmin>}
      />

      {/* "Plan a visit" requests sent to this organization. */}
      <Route
        path="/organizations/:organizationId/admin/visits"
        element={<RequireOrgAdmin><OrganizationVisitRequestsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/departments"
        element={<RequireOrgAdmin><OrganizationAdminDepartmentsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/groups"
        element={<RequireOrgAdmin><OrganizationAdminGroupsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/events"
        element={<RequireOrgAdmin><OrganizationAdminEventsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/live"
        element={<RequireOrgAdmin><OrganizationAdminLiveRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/media"
        element={<RequireOrgAdmin><OrganizationAdminMediaRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/settings"
        element={<RequireOrgAdmin><OrganizationAdminSettingsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/domains"
        element={<RequireOrgAdmin><OrganizationAdminDomainsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/domains/new"
        element={<RequireOrgAdmin><OrganizationAdminAddDomainRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/domains/:domainId"
        element={<RequireOrgAdmin><OrganizationAdminDomainDetailsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity"
        element={<RequireOrgAdmin><OrganizationAdminIdentityRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users"
        element={<RequireOrgAdmin><OrganizationAdminManagedUsersRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users/new"
        element={<RequireOrgAdmin><OrganizationAdminCreateUserRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users/create"
        element={<RequireOrgAdmin><OrganizationAdminCreateUserRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/users/:userId"
        element={<RequireOrgAdmin><OrganizationAdminUserDetailsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/domains"
        element={<RequireOrgAdmin><OrganizationAdminDomainsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/domains/new"
        element={<RequireOrgAdmin><OrganizationAdminAddDomainRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/domains/:domainId"
        element={<RequireOrgAdmin><OrganizationAdminDomainDetailsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/organizations/:organizationId/admin/identity/settings"
        element={<RequireOrgAdmin><OrganizationAdminIdentitySettingsRoute /></RequireOrgAdmin>}
      />

      {/* ====================================================================
          LEGACY CHURCH
      ==================================================================== */}

      <Route
        path="/church"
        element={<OrganizationsHomePage />}
      />

      <Route
        path="/church/me"
        element={<OrganizationMemberPortalPage />}
      />

      <Route
        path="/church/member"
        element={<OrganizationMemberPortalPage />}
      />

      <Route
        path="/church/member-portal"
        element={<OrganizationMemberPortalPage />}
      />

      <Route
        path="/church/me/settings"
        element={<OrganizationMemberSettingsPage />}
      />

      <Route
        path="/church/member/settings"
        element={<OrganizationMemberSettingsPage />}
      />

      <Route
        path="/church/member-portal/settings"
        element={<OrganizationMemberSettingsPage />}
      />

      <Route
        path="/church/live"
        element={<OrganizationLivestreamPage />}
      />

      <Route
        path="/church/organizations"
        element={<OrganizationsPage />}
      />

      <Route
        path="/church/organizations/new"
        element={<CreateOrganizationWizard />}
      />

      <Route
        path="/church/organizations/:organizationId"
        element={<OrganizationPage />}
      />

      <Route
        path="/church/organizations/:organizationId/visit"
        element={<OrganizationPlanVisitPage />}
      />

      <Route
        path="/church/organizations/:organizationId/members"
        element={<OrganizationMembersPage />}
      />

      <Route
        path="/church/organizations/:organizationId/members/:memberId"
        element={<OrganizationMemberProfilePage />}
      />

      <Route
        path="/church/organizations/:organizationId/departments"
        element={<OrganizationDepartmentsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/groups"
        element={<OrganizationGroupsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/events"
        element={<OrganizationEventsPage />}
      />

      <Route
        path="/church/organizations/:organizationId/live"
        element={<OrganizationLivePage />}
      />

      <Route
        path="/church/organizations/:organizationId/media"
        element={<OrganizationMediaLibrary />}
      />

      <Route
        path="/church/organizations/:organizationId/communication"
        element={<OrganizationCommunicationPage />}
      />

      <Route
        path="/church/organizations/:organizationId/attendance"
        element={<OrganizationAttendancePage />}
      />

      <Route
        path="/church/organizations/:organizationId/admin"
        element={<RequireOrgAdmin><OrganizationAdminDashboard /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/dashboard"
        element={<RequireOrgAdmin><OrganizationAdminDashboard /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/members"
        element={<RequireOrgAdmin><OrganizationMemberManagement /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/departments"
        element={<RequireOrgAdmin><OrganizationDepartmentManagement /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/groups"
        element={<RequireOrgAdmin><OrganizationGroupManagement /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/events"
        element={<RequireOrgAdmin><OrganizationEventManagement /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/live"
        element={<RequireOrgAdmin><OrganizationAdminLivestreamPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/media"
        element={<RequireOrgAdmin><OrganizationMediaLibrary /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/settings"
        element={<RequireOrgAdmin><OrganizationSettingsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/domains"
        element={<RequireOrgAdmin><ChurchOrganizationDomainsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/domains/new"
        element={<RequireOrgAdmin><OrganizationAddDomainPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/domains/:domainId"
        element={<RequireOrgAdmin><OrganizationDomainDetailsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity"
        element={<RequireOrgAdmin><ChurchOrganizationIdentityHomeRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users"
        element={<RequireOrgAdmin><ChurchOrganizationManagedUsersRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users/new"
        element={<RequireOrgAdmin><OrganizationCreateUserPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users/create"
        element={<RequireOrgAdmin><OrganizationCreateUserPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/users/:userId"
        element={<RequireOrgAdmin><OrganizationUserDetailsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/domains"
        element={<RequireOrgAdmin><ChurchOrganizationDomainsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/domains/new"
        element={<RequireOrgAdmin><OrganizationAddDomainPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/domains/:domainId"
        element={<RequireOrgAdmin><OrganizationDomainDetailsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/organizations/:organizationId/admin/identity/settings"
        element={<RequireOrgAdmin><OrganizationIdentitySettingsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin"
        element={<LegacyAdminRedirect />}
      />

      <Route
        path="/church/admin/dashboard"
        element={<LegacyAdminRedirect />}
      />

      <Route
        path="/church/admin/organizations/new"
        element={<CreateOrganizationWizard />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/edit"
        element={<RequireOrgAdmin>
          <OrganizationForm
            mode="edit"
          />
        </RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/members"
        element={<LegacyAdminRedirect section="members" />}
      />

      <Route
        path="/church/admin/departments"
        element={<LegacyAdminRedirect section="departments" />}
      />

      <Route
        path="/church/admin/groups"
        element={<LegacyAdminRedirect section="groups" />}
      />

      <Route
        path="/church/admin/events"
        element={<LegacyAdminRedirect section="events" />}
      />

      <Route
        path="/church/admin/live"
        element={<LegacyAdminRedirect section="live" />}
      />

      <Route
        path="/church/admin/media"
        element={<LegacyAdminRedirect section="media" />}
      />

      <Route
        path="/church/admin/settings"
        element={<LegacyAdminRedirect section="settings" />}
      />

      <Route
        path="/church/admin/organizations/:organizationId/domains"
        element={<RequireOrgAdmin><ChurchOrganizationDomainsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/domains/new"
        element={<RequireOrgAdmin><OrganizationAddDomainPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/domains/:domainId"
        element={<RequireOrgAdmin><OrganizationDomainDetailsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity"
        element={<RequireOrgAdmin><ChurchOrganizationIdentityHomeRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users"
        element={<RequireOrgAdmin><ChurchOrganizationManagedUsersRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users/new"
        element={<RequireOrgAdmin><OrganizationCreateUserPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users/create"
        element={<RequireOrgAdmin><OrganizationCreateUserPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/users/:userId"
        element={<RequireOrgAdmin><OrganizationUserDetailsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/domains"
        element={<RequireOrgAdmin><ChurchOrganizationDomainsRoute /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/domains/new"
        element={<RequireOrgAdmin><OrganizationAddDomainPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/domains/:domainId"
        element={<RequireOrgAdmin><OrganizationDomainDetailsPage /></RequireOrgAdmin>}
      />

      <Route
        path="/church/admin/organizations/:organizationId/identity/settings"
        element={<RequireOrgAdmin><OrganizationIdentitySettingsPage /></RequireOrgAdmin>}
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

        {/* WAVES: the feed's full-screen video player (bottom navigation tab) */}

        <Route
          path="/waves"
          element={
            <Navigate
              to="/fockis-preview?waves=1"
              replace
            />
          }
        />

        <Route
          path="/waves/:postId"
          element={<WaveRedirect />}
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

        {/* ================================================================
            ACCOUNT SETTINGS
        ================================================================ */}

        <Route
          path="/settings"
          element={<AccountSettingsPage />}
        />

        <Route
          path="/settings/account"
          element={<AccountSettingsPage />}
        />

        {/* Personal Fockis domain (john.fockis.com) — price set in the Admin Center. */}
        <Route
          path="/settings/fockis-domain"
          element={<MyFockisDomainPage />}
        />

        <Route
          path="/settings/fockis-domain/pay"
          element={<MyFockisDomainPayPage />}
        />

        <Route
          path="/settings/appearance"
          element={<AccountSettingsPage />}
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
            MODERATION CENTER (decisions about me, appeals, my reports)
        ================================================================== */}

        <Route
          path="/moderation"
          element={<MyModerationPage />}
        />

        {/* ==================================================================
            HELP & SUPPORT: /help/*
        ================================================================== */}

        {HelpRoutes()}

        {/* ==================================================================
            POLICY, PRIVACY & SAFETY: /settings/policy/* and /policies/*
        ================================================================== */}

        {PolicyCenterRoutes()}

        {/* NOTIFICATIONS */}

        <Route
          path="/notifications"
          element={<NotificationsPage />}
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
          element={<MapsApp />}
        />

        <Route
          path="/map/p/:token"
          element={<MapsApp />}
        />

        {/* The previous Mapbox-based map, kept during the switch to MapLibre. */}
        <Route
          path="/map/classic"
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
            CREATOR PLAYLISTS
        ================================================================== */}

        <Route
          path="/creator/playlists"
          element={<MyPlaylistsPage />}
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

        {/* Pay / renew the Fockis domain (prices set in the Admin Center). */}
        <Route
          path="/organizations/:organizationId/identity/domains/pay"
          element={<OrganizationDomainCheckoutPage />}
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

        {/* EMPLOYER CENTER: /careers/employer/* */}
        <Route
          path="/careers/employer/*"
          element={<EmployerRoutes />}
        />

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

        {/* ==================================================================
            LEGAL & POLICIES
        ================================================================== */}

        <Route
          path="/privacy"
          element={<LegalPolicyPage slug="privacy" />}
        />

        <Route
          path="/terms"
          element={<LegalPolicyPage slug="terms" />}
        />

        <Route
          path="/community-guidelines"
          element={<LegalPolicyPage slug="community-guidelines" />}
        />

        <Route
          path="/child-safety"
          element={<LegalPolicyPage slug="child-safety" />}
        />

        <Route
          path="/payments"
          element={<LegalPolicyPage slug="payments" />}
        />

        <Route
          path="/copyright"
          element={<LegalPolicyPage slug="copyright" />}
        />

        <Route
          path="/shop-advertising"
          element={<LegalPolicyPage slug="shop-advertising" />}
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
    </>
  );
}

export default App;
