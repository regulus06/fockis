import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

import { MarketingProvider } from "../components/MarketingProvider";
import { MailchimpLayout } from "../components/MailchimpLayout";
import { Skeleton } from "../components/ui/Feedback";

// FockisMail global styles
import "../styles/fockismail.scss";

// Marketing (/marketing/*)
const FockisMailDashboardPage = lazy(
  () => import("../pages/FockisMailDashboardPage"),
);

const CampaignsPage = lazy(
  () => import("../pages/CampaignsPage"),
);

const CampaignDetailsPage = lazy(
  () => import("../pages/CampaignDetailsPage"),
);

const EmailCampaignComposer = lazy(
  () => import("../pages/EmailCampaignComposer"),
);

const AudiencePage = lazy(
  () => import("../pages/AudiencePage"),
);

const ContactDetailsPage = lazy(
  () => import("../pages/ContactDetailsPage"),
);

const SegmentsPage = lazy(
  () => import("../pages/SegmentsPage"),
);

const TagsPage = lazy(
  () => import("../pages/TagsPage"),
);

const TemplatesPage = lazy(
  () => import("../pages/TemplatesPage"),
);

const AutomationsPage = lazy(
  () => import("../pages/AutomationsPage"),
);

const JourneysPage = lazy(
  () => import("../pages/JourneysPage"),
);

const FormsPage = lazy(
  () => import("../pages/FormsPage"),
);

const LandingPagesPage = lazy(
  () => import("../pages/LandingPagesPage"),
);

const ContentPage = lazy(
  () => import("../pages/ContentPage"),
);

const ReportsPage = lazy(
  () => import("../pages/ReportsPage"),
);

const AnalyticsPage = lazy(
  () => import("../pages/AnalyticsPage"),
);

const ABTestingPage = lazy(
  () => import("../pages/ABTestingPage"),
);

const TransactionalEmailPage = lazy(
  () => import("../pages/TransactionalEmailPage"),
);

const SMSMarketingPage = lazy(
  () => import("../pages/SMSMarketingPage"),
);

const SocialCampaignsPage = lazy(
  () => import("../pages/SocialCampaignsPage"),
);

const IntegrationsPage = lazy(
  () => import("../pages/IntegrationsPage"),
);

const MarketingSettingsPage = lazy(
  () => import("../pages/MarketingSettingsPage"),
);

const LegacyMailchimpPage = lazy(
  () => import("../pages/LegacyMailchimpPage"),
);

const MarketingNotFoundPage = lazy(
  () => import("../pages/MarketingNotFoundPage"),
);

// Agency (/marketing/agency/*)
const AgencyDashboardPage = lazy(
  () => import("../pages/agency/AgencyDashboardPage"),
);

const ApplicationsPage = lazy(
  () => import("../pages/agency/ApplicationsPage"),
);

const ApplicationDetailPage = lazy(
  () => import("../pages/agency/ApplicationDetailPage"),
);

const ClientsPage = lazy(
  () => import("../pages/agency/ClientsPage"),
);

const ClientOnboardingPage = lazy(
  () => import("../pages/agency/ClientOnboardingPage"),
);

const ClientDetailPage = lazy(
  () => import("../pages/agency/ClientDetailPage"),
);

const ClientTeamPage = lazy(
  () => import("../pages/agency/ClientTeamPage"),
);

const ApprovalsPage = lazy(
  () => import("../pages/agency/ApprovalsPage"),
);

const TasksPage = lazy(
  () => import("../pages/agency/TasksPage"),
);

const AgencyReportsPage = lazy(
  () => import("../pages/agency/AgencyReportsPage"),
);

const AgencyBillingPage = lazy(
  () => import("../pages/agency/AgencyBillingPage"),
);

const AgencySettingsPage = lazy(
  () => import("../pages/agency/AgencySettingsPage"),
);

// Billing & credits (/marketing/billing/*)
const BillingOverviewPage = lazy(
  () => import("../pages/billing/BillingOverviewPage"),
);

const CreditDetailPage = lazy(
  () => import("../pages/billing/CreditDetailPage"),
);

const CreditUsagePage = lazy(
  () => import("../pages/billing/CreditUsagePage"),
);

const PurchaseCreditsPage = lazy(
  () => import("../pages/billing/PurchaseCreditsPage"),
);

const TransactionsPage = lazy(
  () => import("../pages/billing/TransactionsPage"),
);

const PlansPage = lazy(
  () => import("../pages/billing/PlansPage"),
);

const BillingHistoryPage = lazy(
  () => import("../pages/billing/BillingHistoryPage"),
);

const PaymentMethodsPage = lazy(
  () => import("../pages/billing/PaymentMethodsPage"),
);

const BillingSettingsPage = lazy(
  () => import("../pages/billing/BillingSettingsPage"),
);

export type MarketingSection =
  | "mailchimp"
  | "agency"
  | "billing";

export interface FockisMarketingRoutesProps {
  /**
   * Which route mount this instance serves.
   */
  section?: MarketingSection;

  /**
   * Public Mailchimp audience ID (VITE_MAILCHIMP_AUDIENCE_ID).
   */
  audienceId?: string;

  /**
   * Display name for greetings.
   * Pass the signed-in user's first name.
   */
  userName?: string;

  /**
   * The existing MailchimpMarketingPanel,
   * shown at /marketing/mailchimp/legacy.
   */
  legacyPanel?: ReactNode;

  /**
   * The existing EmailCampaignComposer,
   * shown at /marketing/mailchimp/legacy/compose.
   */
  legacyComposer?: ReactNode;
}

function PageFallback() {
  return (
    <div
      className="fm-page"
      role="status"
      aria-label="Loading page"
    >
      <Skeleton
        width={260}
        height={30}
      />

      <Skeleton
        height={120}
        className="fm-mt-16"
      />

      <Skeleton
        height={320}
        className="fm-mt-16"
      />
    </div>
  );
}

const page = (node: ReactNode) => (
  <Suspense fallback={<PageFallback />}>
    {node}
  </Suspense>
);

function MarketingChildRoutes({
  legacyPanel,
  legacyComposer,
}: Pick<
  FockisMarketingRoutesProps,
  "legacyPanel" | "legacyComposer"
>) {
  return (
    <>
      <Route
        index
        element={
          page(
            <FockisMailDashboardPage />
          )
        }
      />

      <Route
        path="campaigns"
        element={
          page(
            <CampaignsPage />
          )
        }
      />

      <Route
        path="campaigns/:id"
        element={
          page(
            <CampaignDetailsPage />
          )
        }
      />

      <Route
        path="compose"
        element={
          page(
            <EmailCampaignComposer />
          )
        }
      />

      <Route
        path="audience"
        element={
          page(
            <AudiencePage />
          )
        }
      />

      <Route
        path="audience/:id"
        element={
          page(
            <ContactDetailsPage />
          )
        }
      />

      <Route
        path="contacts"
        element={
          page(
            <AudiencePage />
          )
        }
      />

      <Route
        path="contacts/:id"
        element={
          page(
            <ContactDetailsPage />
          )
        }
      />

      <Route
        path="segments"
        element={
          page(
            <SegmentsPage />
          )
        }
      />

      <Route
        path="tags"
        element={
          page(
            <TagsPage />
          )
        }
      />

      <Route
        path="templates"
        element={
          page(
            <TemplatesPage />
          )
        }
      />

      <Route
        path="automations"
        element={
          page(
            <AutomationsPage />
          )
        }
      />

      <Route
        path="journeys"
        element={
          page(
            <JourneysPage />
          )
        }
      />

      <Route
        path="forms"
        element={
          page(
            <FormsPage />
          )
        }
      />

      <Route
        path="landing-pages"
        element={
          page(
            <LandingPagesPage />
          )
        }
      />

      <Route
        path="content"
        element={
          page(
            <ContentPage />
          )
        }
      />

      <Route
        path="reports"
        element={
          page(
            <ReportsPage />
          )
        }
      />

      <Route
        path="analytics"
        element={
          page(
            <AnalyticsPage />
          )
        }
      />

      <Route
        path="ab-testing"
        element={
          page(
            <ABTestingPage />
          )
        }
      />

      <Route
        path="transactional"
        element={
          page(
            <TransactionalEmailPage />
          )
        }
      />

      <Route
        path="sms"
        element={
          page(
            <SMSMarketingPage />
          )
        }
      />

      <Route
        path="social"
        element={
          page(
            <SocialCampaignsPage />
          )
        }
      />

      <Route
        path="integrations"
        element={
          page(
            <IntegrationsPage />
          )
        }
      />

      <Route
        path="settings"
        element={
          page(
            <MarketingSettingsPage />
          )
        }
      />

      {/* ================================================================
          BILLING & CREDITS
          These routes are available directly from the main
          /marketing workspace.
      ================================================================ */}

      {/* /marketing/credits */}
      <Route
        path="credits"
        element={
          page(
            <PurchaseCreditsPage />
          )
        }
      />

      {/* /marketing/billing/*
          Reuse the existing billing route tree.
      */}
      <Route path="billing">
        {BillingChildRoutes()}
      </Route>

      <Route
        path="legacy"
        element={
          page(
            <LegacyMailchimpPage
              title="Classic Mailchimp panel"
            >
              {legacyPanel}
            </LegacyMailchimpPage>
          )
        }
      />

      <Route
        path="legacy/compose"
        element={
          page(
            <LegacyMailchimpPage
              title="Classic email composer"
            >
              {legacyComposer}
            </LegacyMailchimpPage>
          )
        }
      />
    </>
  );
}

function AgencyChildRoutes() {
  return (
    <>
      <Route
        index
        element={
          page(
            <AgencyDashboardPage />
          )
        }
      />

      <Route
        path="applications"
        element={
          page(
            <ApplicationsPage />
          )
        }
      />

      <Route
        path="applications/:applicationId"
        element={
          page(
            <ApplicationDetailPage />
          )
        }
      />

      <Route
        path="clients"
        element={
          page(
            <ClientsPage />
          )
        }
      />

      <Route
        path="clients/new"
        element={
          page(
            <ClientOnboardingPage />
          )
        }
      />

      <Route
        path="clients/:clientId"
        element={
          page(
            <ClientDetailPage />
          )
        }
      />

      <Route
        path="clients/:clientId/team"
        element={
          page(
            <ClientTeamPage />
          )
        }
      />

      <Route
        path="approvals"
        element={
          page(
            <ApprovalsPage />
          )
        }
      />

      <Route
        path="tasks"
        element={
          page(
            <TasksPage />
          )
        }
      />

      <Route
        path="reports"
        element={
          page(
            <AgencyReportsPage />
          )
        }
      />

      <Route
        path="billing"
        element={
          page(
            <AgencyBillingPage />
          )
        }
      />

      <Route
        path="settings"
        element={
          page(
            <AgencySettingsPage />
          )
        }
      />
    </>
  );
}

function BillingChildRoutes() {
  return (
    <>
      <Route
        index
        element={
          page(
            <BillingOverviewPage />
          )
        }
      />

      <Route
        path="email"
        element={
          <CreditDetailPage
            channel="email"
          />
        }
      />

      <Route
        path="sms"
        element={
          <CreditDetailPage
            channel="sms"
          />
        }
      />

      <Route
        path="usage"
        element={
          page(
            <CreditUsagePage />
          )
        }
      />

      <Route
        path="credits"
        element={
          page(
            <PurchaseCreditsPage />
          )
        }
      />

      <Route
        path="transactions"
        element={
          page(
            <TransactionsPage />
          )
        }
      />

      <Route
        path="plans"
        element={
          page(
            <PlansPage />
          )
        }
      />

      <Route
        path="history"
        element={
          page(
            <BillingHistoryPage />
          )
        }
      />

      <Route
        path="payment-methods"
        element={
          page(
            <PaymentMethodsPage />
          )
        }
      />

      <Route
        path="settings"
        element={
          page(
            <BillingSettingsPage />
          )
        }
      />
    </>
  );
}

/**
 * One shell, three mounts.
 *
 * /marketing/*          → section="mailchimp"
 * /marketing/agency/*   → section="agency"
 * /marketing/billing/* → section="billing"
 *
 * Workspace selection and mock data are shared across mounts.
 */
export default function FockisMarketingRoutes({
  section = "mailchimp",
  audienceId = "",
  userName = "Elince",
  legacyPanel,
  legacyComposer,
}: FockisMarketingRoutesProps) {
  return (
    <MarketingProvider
      audienceId={audienceId}
      basePath="/marketing/mailchimp"
      userName={userName}
    >
      <Routes>
        <Route element={<MailchimpLayout />}>
          {section === "mailchimp" &&
            MarketingChildRoutes({
              legacyPanel,
              legacyComposer,
            })}

          {section === "agency" &&
            AgencyChildRoutes()}

          {section === "billing" &&
            BillingChildRoutes()}

          <Route
            path="*"
            element={
              page(
                <MarketingNotFoundPage />
              )
            }
          />
        </Route>
      </Routes>
    </MarketingProvider>
  );
}