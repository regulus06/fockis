# Fockis Marketing — Agency, Workspaces, Billing & Credits (phase 3)

Frontend only. No backend code was created or changed, and no dependencies were added.
This builds on the phase-1 module: 53 files created, 26 modified, 0 removed. About 22,000 lines total.

## 1. Install

Extract over your existing `web/src/features/marketing/mailchimp/`. This package **replaces**
26 files from phase 1 (listed in section 8). If you edited any of them since phase 1, merge by hand.
Your own `components/MailchimpMarketingPanel.tsx` and `components/EmailCampaignComposer.tsx`
are not in this package and are not touched.

```bash
# from the repo root: overwrite phase-1 files, keep anything else you have
unzip -o fockis-marketing-phase3.zip
```

## 2. Change `web/src/App.tsx`

Add these imports (the existing `MailchimpMarketingPanel` / `EmailCampaignComposer` imports stay):

```tsx
import FockisMarketingRoutes from "./features/marketing/mailchimp/routes/FockisMarketingRoutes";
import MarketingRequestRoute from "./features/marketing/mailchimp/routes/MarketingRequestRoute";
```

Inside `<Route element={<Layout />}>`, replace the `/marketing/mailchimp` route(s) with:

```tsx
<Route
  path="/marketing/mailchimp/*"
  element={
    <FockisMarketingRoutes
      section="mailchimp"
      audienceId={import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""}
      legacyPanel={<MailchimpMarketingPanel audienceId={import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""} />}
      legacyComposer={<EmailCampaignComposer audienceId={import.meta.env.VITE_MAILCHIMP_AUDIENCE_ID || ""} />}
    />
  }
/>
<Route path="/marketing/agency/*" element={<FockisMarketingRoutes section="agency" />} />
<Route path="/marketing/billing/*" element={<FockisMarketingRoutes section="billing" />} />
```

**Outside** `<Layout />` (next to `/login`), add the public request page:

```tsx
<Route path="/marketing/request" element={<MarketingRequestRoute />} />
```

None of these collide with your existing `/marketing`, `/marketing/campaigns/...`, `/marketing/ads`,
or `/marketing/review` routes. If you already mounted phase 1 with `<MailchimpRoutes />`, that still
works; it's now a thin wrapper around `section="mailchimp"`.

Optional: pass `userName` (the signed-in user's first name) to each `FockisMarketingRoutes`.

## 3. Routes added

Agency: `/marketing/agency`, `/applications`, `/applications/:applicationId`, `/clients`,
`/clients/new`, `/clients/:clientId` (`?tab=overview|profile|services|credits`),
`/clients/:clientId/team`, `/approvals`, `/tasks`, `/reports`, `/billing` (client credits), `/settings`.

Billing & credits: `/marketing/billing`, `/email`, `/sms`, `/usage`, `/credits?type=email|sms` (buy),
`/transactions`, `/plans`, `/history`, `/payment-methods`, `/settings`.

Public: `/marketing/request`.

All phase-1 routes under `/marketing/mailchimp` are unchanged.

## 4. How the pieces connect

```
Business ──▶ Workspace (businessId / workspaceId)
   │            ├─ audiences, contacts, campaigns, automations, templates… (per business)
   │            └─ Plan ──▶ CreditBalance (email + SMS) ──▶ CreditTransaction ledger ──▶ Stripe
   └─ created from: MarketingApplication (approved → convert) or agency onboarding
```

- `useMarketingWorkspace()` returns `{ currentBusiness, businesses, switchBusiness, loading, refresh }`.
  The selection lives in a module-level store (`services/workspaceStore.ts`), shared by all three
  route mounts and remembered in localStorage.
- In mock mode, `services/mockDb.ts` points `db` at the active business's own store, so every
  existing service is automatically scoped per business. In real mode, each request carries
  `businessId`.
- Campaign sends check credits (`creditsApi.check`) and block when short. SMS uses
  recipients × message segments.

**Security note.** Workspace switching, roles, and permission-gated UI are cosmetic. The backend
must authorize every `businessId` and enforce roles on every request, and it must re-check and
atomically deduct credits at send time. The UI never deducts credits.

## 5. Environment variables

Unchanged from phase 1: `VITE_MAILCHIMP_AUDIENCE_ID`, plus the optional `VITE_MARKETING_API_URL`
and `VITE_MARKETING_USE_MOCKS`.

Never put `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MAILCHIMP_API_KEY`, SMS provider keys,
or SMTP credentials in any `VITE_*` variable.

## 6. Backend API contract to implement later

All paths are relative to `VITE_MARKETING_API_URL`. Every path is also defined in
`services/endpoints.ts` (`ENDPOINTS` and `PLATFORM_ENDPOINTS`). Request and response shapes are the
TypeScript types in `types/platform.types.ts` and `types/mailchimp.types.ts`. Requests are sent with
`credentials: "include"`.

| Area | Method & path | Body → Response |
|---|---|---|
| Viewer | `GET /marketing/me` | → `MarketingViewer` (role + permissions) |
| Businesses | `GET /marketing/businesses` · `POST` | `NewBusinessInput` → `Business` |
| | `GET/PATCH /marketing/businesses/:id` | `Partial<Business>` → `Business` |
| | `GET /marketing/businesses/:id/summary` | → `BusinessSummary` |
| | `PATCH /marketing/businesses/:id/services` | `{service, status}` → `Business` |
| Team | `GET/POST /marketing/businesses/:id/team` | `{name,email,role}` → `TeamMember` |
| | `PATCH/DELETE …/team/:memberId` · `POST …/team/:memberId/resend` | `{role}` → `TeamMember` |
| Agency | `GET /marketing/agency/dashboard` | → `AgencyDashboard` |
| | `GET /marketing/agency/reports?businessId&businessType&campaignType&days` | → `BusinessSummary[]` |
| | `GET /marketing/agency/activity` · `GET/PATCH /marketing/agency/settings` | `AgencySettings` |
| Tasks | `GET/POST /marketing/agency/tasks` · `PUT/DELETE …/:id` | `AgencyTask` |
| Approvals | `GET /marketing/agency/approvals` · `PATCH …/:id` | `{status, comment?}` → `Approval` |
| | `POST …/:id/comments` | `ApprovalComment` → `Approval` |
| Applications | `POST /marketing/applications` (**public, rate-limited, captcha recommended**) | `ApplicationDraft` → `MarketingApplication` |
| | `GET /marketing/applications?status&businessType&service&search&days` · `GET …/:id` | → `MarketingApplication[]` / one |
| | `PATCH …/:id/status` | `{status, note?}` → `MarketingApplication` |
| | `POST …/:id/messages` | `{visibility, kind, author, body}` → `MarketingApplication` |
| | `POST …/:id/convert` (one transaction: business + workspace + balance + owner invite) | `{planId}` → `{application, business}` |
| Plans | `GET /marketing/plans?businessId` · `GET …/:planId` · `POST` (custom plan) | `MarketingPlan` |
| | `GET /marketing/credit-packages?channel` | → `CreditPackage[]` |
| Credits | `GET /marketing/businesses/:id/credits` | → `CreditBalance` |
| | `POST …/credits/check` | `{channel, required}` → `CreditCheck` |
| | `POST …/credits/adjust` (agency permission) | `{channel, credits, reason}` → `CreditBalance` |
| | `GET /marketing/agency/credits` · `GET /marketing/agency/credits/usage?days` | → `CreditBalance[]` / `UsageBreakdown[]` |
| Ledger | `GET /marketing/businesses/:id/transactions?channel&type&days` | → `CreditTransaction[]` |
| | `GET …/usage?days` | → `UsageReport` |
| Billing | `POST …/billing/checkout-sessions` | `{kind:"credits",packageId}` or `{kind:"plan",planId}` → `CheckoutSession {mode:"redirect", url}` |
| | `POST …/billing/plan` | `{planId}` → `CheckoutSession` |
| | `GET …/billing/invoices` · `GET/DELETE/PATCH …/billing/payment-methods[/:id]` | `Invoice[]` / `PaymentMethod` |
| | `POST …/billing/setup-intents` (Stripe Elements client secret) | → `{clientSecret}` |
| | `GET/PATCH …/billing/settings` | `BillingSettings` |
| Notifications | `GET /marketing/notifications?businessId&includeAgency` · `POST …/:id/read` · `POST …/read-all` | `MarketingNotification` |

**Stripe flow the backend should implement.** First, create a Checkout Session with server-side prices.
Return its URL, and the UI redirects there. Then, on the `checkout.session.completed` webhook, add
credits or change the plan and write a `CreditTransaction` plus an `Invoice`. On `invoice.payment_failed`,
set `billingStatus: "past_due"`. Refunds write a `refund` transaction. Plan renewals reset the
included credits and keep purchased (bonus) credits.

**Notifications to emit:** `APPLICATION_SUBMITTED`, `APPLICATION_UNDER_REVIEW`, `APPLICATION_MORE_INFO`,
`APPLICATION_APPROVED`, `APPLICATION_REJECTED`, `WORKSPACE_CREATED`, `LOW_EMAIL_CREDITS`,
`LOW_SMS_CREDITS`, `EMAIL_CREDITS_EXHAUSTED`, `SMS_CREDITS_EXHAUSTED`, `PLAN_CHANGED`,
`CREDIT_PURCHASE_COMPLETED`, `CAMPAIGN_SENT`, and `APPROVAL_REQUESTED`.

**Low-credit thresholds** live in `data/billingMockData.ts` (`creditThresholds`): 15% remaining, or
1,000 email / 100 SMS credits. Serve them from the backend if you want them configurable.

## 7. Verification performed

Done in a scratch Vite 8 / React 19 / TypeScript strict / SCSS project, with a harness `App.tsx`
mirroring section 2 and stand-ins for your two legacy components:

- `tsc -b`: 0 errors. `npm run build`: passes with no warnings. No `any` anywhere.
- 1,103 relative imports checked: all match filename case (Windows-safe).
- Builds and runs on react-router-dom **7.18 and 6.30**.
- Headless Chromium: **52 routes × 5 widths (1920 / 1440 / 1024 / 768 / 390)**. Every page
  renders, with no horizontal overflow and zero console errors or React warnings.
- End-to-end, using in-app navigation:
  - Public request: validation, all 12 steps, review, submit, success with an application ID.
  - That application appears in the agency list. It was approved, then converted to a workspace,
    and the new client appeared in Clients and in the workspace switcher.
  - Switching workspaces shows each business's own campaigns.
  - Joe's Restaurant campaign blocked: 3,900 required, 450 available, shortfall 3,450. The buy modal
    pre-selected a package covering the shortfall; after the demo purchase the send was allowed and
    succeeded.
  - SMS send blocked: 1,170 credits required (recipients × segments), 35 available.
  - Upgrade from Starter to Growth updated the balance, the ledger, and the notifications.
  - The agency client-credits table flagged the exhausted client.

**Not verified:** your real repo. Run `npm run build` in `web/` after extracting.

## 8. Remaining limitations (by design for a frontend-only phase)

- Demo data resets on page reload. Uploads, logos, and application files are local previews only.
- Messages to applicants, team invitations, and SMS sends are not delivered; that needs the backend.
- Demo pages make 2–3 sequential ~320ms mock calls, so some pages take 1–2s to appear in demo mode.
- "Content" moved under Tools as "Media" (same `/marketing/mailchimp/content` route) to avoid two
  sidebar entries for one page.

## 9. Files

### Created
```
  components/ApplicationSummary.tsx
  components/ChoiceCards.tsx
  components/CreditMeter.tsx
  components/PurchaseCreditsModal.tsx
  components/TransactionTable.tsx
  components/WorkspaceSwitcher.tsx
  data/agencyMockData.ts
  data/applicationMockData.ts
  data/billingMockData.ts
  data/businessSeeds.ts
  data/demoTime.ts
  data/templateMockData.ts
  hooks/useCredits.ts
  hooks/useMarketingWorkspace.ts
  pages/agency/AgencyBillingPage.tsx
  pages/agency/AgencyDashboardPage.tsx
  pages/agency/AgencyReportsPage.tsx
  pages/agency/AgencySettingsPage.tsx
  pages/agency/ApplicationDetailPage.tsx
  pages/agency/ApplicationsPage.tsx
  pages/agency/ApprovalsPage.tsx
  pages/agency/ClientDetailPage.tsx
  pages/agency/ClientOnboardingPage.tsx
  pages/agency/ClientTeamPage.tsx
  pages/agency/ClientsPage.tsx
  pages/agency/TasksPage.tsx
  pages/billing/BillingHistoryPage.tsx
  pages/billing/BillingOverviewPage.tsx
  pages/billing/BillingSettingsPage.tsx
  pages/billing/CreditDetailPage.tsx
  pages/billing/CreditUsagePage.tsx
  pages/billing/PaymentMethodsPage.tsx
  pages/billing/PlansPage.tsx
  pages/billing/PurchaseCreditsPage.tsx
  pages/billing/TransactionsPage.tsx
  pages/request/MarketingRequestPage.tsx
  routes/FockisMarketingRoutes.tsx
  routes/MarketingRequestRoute.tsx
  services/agencyApi.ts
  services/applicationsApi.ts
  services/billingApi.ts
  services/contactsApi.ts
  services/creditsApi.ts
  services/marketingApi.ts
  services/notificationsApi.ts
  services/plansApi.ts
  services/platformDb.ts
  services/transactionsApi.ts
  services/workspaceStore.ts
  styles/platform.scss
  types/platform.types.ts
  utils/credits.ts
  utils/platformLabels.ts
```

### Modified (replaced)
```
  components/MailchimpHeader.tsx
  components/MailchimpLayout.tsx
  components/MailchimpSidebar.tsx
  components/navigation.ts
  data/mailchimpMockData.ts
  index.ts
  pages/AutomationsPage.tsx
  pages/EmailCampaignComposer.tsx
  pages/MailchimpDashboardPage.tsx
  pages/SMSMarketingPage.tsx
  pages/TemplatesPage.tsx
  routes/MailchimpRoutes.tsx
  services/analyticsApi.ts
  services/audienceApi.ts
  services/automationApi.ts
  services/campaignsApi.ts
  services/channelsApi.ts
  services/contentApi.ts
  services/endpoints.ts
  services/httpClient.ts
  services/mailchimpApi.ts
  services/mockDb.ts
  services/templatesApi.ts
  styles/mailchimp.scss
  types/mailchimp.types.ts
  utils/labels.ts
```
