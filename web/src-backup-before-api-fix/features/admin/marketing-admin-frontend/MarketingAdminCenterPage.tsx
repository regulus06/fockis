import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
} from "react-router-dom";

import {
  marketingAdminControlApi as api,
} from "./api/marketingAdminControlApi";

import {
  MARKETING_PERMISSIONS as P,
} from "./constants/marketingPermissions";

import type {
  MarketingAction,
  MarketingAdAdmin,
  MarketingAuditEvent,
  MarketingCampaignAdmin,
  MarketingCampaignStatus,
  MarketingWorkflowSettings,
} from "./types/marketingAdmin.types";

import {
  MarketingActionButtons,
} from "./components/MarketingActionButtons";

import "./styles/marketingAdmin.scss";

/*
|--------------------------------------------------------------------------
| STATUS VALUES
|--------------------------------------------------------------------------
*/

const statuses: MarketingCampaignStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "BLOCKED",
  "REJECTED",
  "EXPIRED",
  "ARCHIVED",
];

/*
|--------------------------------------------------------------------------
| PAGE ROUTES
|--------------------------------------------------------------------------
|
| All Marketing Admin pages intentionally use:
|
| /admin/marketing-admin/*
|
*/

const pageMap: Record<string, string> = {
  "/admin/marketing-admin": "overview",
  "/admin/marketing-admin/campaigns": "campaigns",
  "/admin/marketing-admin/ads": "ads",
  "/admin/marketing-admin/pending-review": "pending",
  "/admin/marketing-admin/analytics": "analytics",
  "/admin/marketing-admin/advertisers": "advertisers",
  "/admin/marketing-admin/workflow": "workflow",
  "/admin/marketing-admin/audit": "audit",
};

const titles: Record<string, string> = {
  overview: "Marketing Admin",
  campaigns: "Campaign Management",
  ads: "Advertisement Management",
  pending: "Pending Review",
  analytics: "Marketing Analytics",
  advertisers: "Advertisers",
  workflow: "Workflow & Settings",
  audit: "Marketing Audit",
};

/*
|--------------------------------------------------------------------------
| PERMISSION MAP
|--------------------------------------------------------------------------
|
| These are permissions, NOT state-transition actions.
|
*/

const permissions: Record<string, string> = {
  CAMPAIGN_VIEW: P.CAMPAIGN_VIEW,
  CAMPAIGN_CREATE: P.CAMPAIGN_CREATE,
  CAMPAIGN_EDIT: P.CAMPAIGN_EDIT,
  CAMPAIGN_APPROVE: P.CAMPAIGN_APPROVE,
  CAMPAIGN_PUBLISH: P.CAMPAIGN_PUBLISH,
  CAMPAIGN_REJECT: P.CAMPAIGN_REJECT,
  CAMPAIGN_PAUSE: P.CAMPAIGN_PAUSE,
  CAMPAIGN_RESUME: P.CAMPAIGN_RESUME,
  CAMPAIGN_BLOCK: P.CAMPAIGN_BLOCK,
  CAMPAIGN_UNBLOCK: P.CAMPAIGN_UNBLOCK,
  CAMPAIGN_ARCHIVE: P.CAMPAIGN_ARCHIVE,

  AD_VIEW: P.AD_VIEW,
  AD_CREATE: P.AD_CREATE,
  AD_EDIT: P.AD_EDIT,
  AD_APPROVE: P.AD_APPROVE,
  AD_PUBLISH: P.AD_PUBLISH,
  AD_REJECT: P.AD_REJECT,
  AD_PAUSE: P.AD_PAUSE,
  AD_RESUME: P.AD_RESUME,
  AD_BLOCK: P.AD_BLOCK,
  AD_UNBLOCK: P.AD_UNBLOCK,
  AD_ARCHIVE: P.AD_ARCHIVE,

  ADVERTISER_VIEW: P.ADVERTISER_VIEW,
  AUDIENCE_VIEW: P.AUDIENCE_VIEW,
  PLACEMENT_VIEW: P.PLACEMENT_VIEW,
  ANALYTICS_VIEW: P.ANALYTICS_VIEW,
  BILLING_VIEW: P.BILLING_VIEW,

  WORKFLOW_VIEW: P.WORKFLOW_VIEW,
  WORKFLOW_EDIT: P.WORKFLOW_EDIT,
  AUDIT_VIEW: P.AUDIT_VIEW,
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const money = (value: number) =>
  Number(value || 0).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
    },
  );

const numberFormat = (value: number) =>
  Number(value || 0).toLocaleString();

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString()
    : "—";

const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Marketing Admin request failed.";

/*
|--------------------------------------------------------------------------
| MAIN PAGE
|--------------------------------------------------------------------------
*/

export default function MarketingAdminCenterPage() {
  const location = useLocation();

  const page =
    Object.entries(pageMap).find(
      ([path]) =>
        location.pathname === path ||
        location.pathname.startsWith(
          `${path}/`,
        ),
    )?.[1] ?? "overview";

  const [overview, setOverview] =
    useState<any>(null);

  const [campaigns, setCampaigns] =
    useState<MarketingCampaignAdmin[]>([]);

  const [ads, setAds] =
    useState<MarketingAdAdmin[]>([]);

  const [audit, setAudit] =
    useState<MarketingAuditEvent[]>([]);

  const [permissionList, setPermissionList] =
    useState<string[]>([]);

  const [workflow, setWorkflow] =
    useState<MarketingWorkflowSettings | null>(
      null,
    );

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | PERMISSION CHECK
  |--------------------------------------------------------------------------
  */

  const can = useCallback(
    (permission: string) =>
      permissionList.includes(permission) ||
      permissionList.includes("*") ||
      permissionList.length === 0,
    [permissionList],
  );

  /*
  |--------------------------------------------------------------------------
  | LOAD DATA
  |--------------------------------------------------------------------------
  */

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (page === "overview") {
        const response =
          await api.getOverview();

        setOverview(response);
        setWorkflow(response.workflow);
        setPermissionList(
          response.permissions || [],
        );
      }

      if (
        page === "campaigns" ||
        page === "pending" ||
        page === "analytics" ||
        page === "advertisers"
      ) {
        const response =
          await api.listCampaigns({
            search:
              search.trim() || undefined,
            status:
              status || undefined,
          });

        setCampaigns(response);
      }

      if (
        page === "ads" ||
        page === "pending"
      ) {
        const response =
          await api.listAds({
            search:
              search.trim() || undefined,
            status:
              status || undefined,
          });

        setAds(response);
      }

      if (page === "workflow") {
        const [
          workflowResponse,
          permissionResponse,
        ] = await Promise.all([
          api.getWorkflow(),
          api.getPermissions(),
        ]);

        setWorkflow(
          workflowResponse.workflow,
        );

        setPermissionList(
          permissionResponse.permissions ||
            [],
        );
      }

      if (page === "audit") {
        const [
          auditResponse,
          permissionResponse,
        ] = await Promise.all([
          api.getAudit(),
          api.getPermissions(),
        ]);

        setAudit(auditResponse);

        setPermissionList(
          permissionResponse.permissions ||
            [],
        );
      }

      if (
        page !== "overview" &&
        page !== "workflow" &&
        page !== "audit" &&
        permissionList.length === 0
      ) {
        try {
          const response =
            await api.getPermissions();

          setPermissionList(
            response.permissions || [],
          );
        } catch {
          // The primary request handles authorization errors.
        }
      }
    } catch (requestError) {
      setError(
        errorText(requestError),
      );
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    status,
    permissionList.length,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  /*
  |--------------------------------------------------------------------------
  | DERIVED DATA
  |--------------------------------------------------------------------------
  */

  const pendingCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.status ===
          "PENDING_REVIEW",
      ),
    [campaigns],
  );

  const pendingAds = useMemo(
    () =>
      ads.filter(
        (ad) =>
          ad.status ===
          "PENDING_REVIEW",
      ),
    [ads],
  );

  const totals = useMemo(
    () => ({
      budget: campaigns.reduce(
        (sum, campaign) =>
          sum +
          Number(
            campaign.budget || 0,
          ),
        0,
      ),

      spent: campaigns.reduce(
        (sum, campaign) =>
          sum +
          Number(
            campaign.spent || 0,
          ),
        0,
      ),

      impressions: campaigns.reduce(
        (sum, campaign) =>
          sum +
          Number(
            campaign.impressions || 0,
          ),
        0,
      ),

      clicks: campaigns.reduce(
        (sum, campaign) =>
          sum +
          Number(
            campaign.clicks || 0,
          ),
        0,
      ),
    }),
    [campaigns],
  );

  /*
  |--------------------------------------------------------------------------
  | ACTION HANDLER
  |--------------------------------------------------------------------------
  |
  | CREATE / EDIT / VIEW are permissions.
  |
  | APPROVE / PUBLISH / REJECT / PAUSE /
  | RESUME / BLOCK / UNBLOCK / ARCHIVE
  | are state-transition actions.
  |
  */

  const performAction = async (
    kind: "campaign" | "ad",
    item:
      | MarketingCampaignAdmin
      | MarketingAdAdmin,
    actionType: MarketingAction,
  ) => {
    const reason =
      window.prompt(
        `${actionType} reason (optional):`,
      ) ||
      "Marketing Admin action";

    try {
      setLoading(true);

      const body = {
        reason,
        notifyAdvertiser: true,
        stopAllCampaignDelivery:
          actionType === "BLOCK",
      };

      if (kind === "campaign") {
        const campaign =
          item as MarketingCampaignAdmin;

        switch (actionType) {
          case "APPROVE":
            await api.approveCampaign(
              campaign.id,
              body,
            );
            break;

          case "PUBLISH":
            await api.publishCampaign(
              campaign.id,
              body,
            );
            break;

          case "REJECT":
            await api.rejectCampaign(
              campaign.id,
              body,
            );
            break;

          case "PAUSE":
            await api.pauseCampaign(
              campaign.id,
              body,
            );
            break;

          case "RESUME":
            await api.resumeCampaign(
              campaign.id,
              body,
            );
            break;

          case "BLOCK":
            await api.blockCampaign(
              campaign.id,
              body,
            );
            break;

          case "UNBLOCK":
            await api.unblockCampaign(
              campaign.id,
              body,
            );
            break;

          case "ARCHIVE":
            await api.archiveCampaign(
              campaign.id,
              body,
            );
            break;

          default:
            throw new Error(
              `Unsupported campaign action: ${actionType}`,
            );
        }
      } else {
        const ad =
          item as MarketingAdAdmin;

        switch (actionType) {
          case "APPROVE":
            await api.approveAd(
              ad.id,
              body,
            );
            break;

          case "PUBLISH":
            await api.publishAd(
              ad.id,
              body,
            );
            break;

          case "REJECT":
            await api.rejectAd(
              ad.id,
              body,
            );
            break;

          case "PAUSE":
            await api.pauseAd(
              ad.id,
              body,
            );
            break;

          case "RESUME":
            await api.resumeAd(
              ad.id,
              body,
            );
            break;

          case "BLOCK":
            await api.blockAd(
              ad.id,
              body,
            );
            break;

          case "UNBLOCK":
            await api.unblockAd(
              ad.id,
              body,
            );
            break;

          case "ARCHIVE":
            await api.archiveAd(
              ad.id,
              body,
            );
            break;

          default:
            throw new Error(
              `Unsupported advertisement action: ${actionType}`,
            );
        }
      }

      await load();
    } catch (actionError) {
      window.alert(
        errorText(actionError),
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NAVIGATION
  |--------------------------------------------------------------------------
  */

  const navigation: Array<
    [string, string]
  > = [
    [
      "/admin/marketing-admin",
      "Overview",
    ],
    [
      "/admin/marketing-admin/campaigns",
      "Campaigns",
    ],
    [
      "/admin/marketing-admin/ads",
      "Ads",
    ],
    [
      "/admin/marketing-admin/pending-review",
      "Pending Review",
    ],
    [
      "/admin/marketing-admin/analytics",
      "Analytics",
    ],
    [
      "/admin/marketing-admin/advertisers",
      "Advertisers",
    ],
    [
      "/admin/marketing-admin/workflow",
      "Workflow",
    ],
    [
      "/admin/marketing-admin/audit",
      "Audit",
    ],
  ];

  return (
    <main className="marketing-admin">
      <header className="marketing-admin__header">
        <div>
          <span className="marketing-admin__eyebrow">
            FOCKIS MARKETING
          </span>

          <h1>
            {titles[page]}
          </h1>

          <p>
            Manage campaigns,
            advertisements,
            approvals,
            enforcement,
            workflow, and
            marketing governance.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void load()
          }
          disabled={loading}
        >
          {loading
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </header>

      <nav className="marketing-admin__tabs">
        {navigation.map(
          ([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? "marketing-admin__tab marketing-admin__tab--active"
                  : "marketing-admin__tab"
              }
            >
              {label}
            </NavLink>
          ),
        )}
      </nav>

      {error && (
        <div className="marketing-admin__error">
          <strong>
            Request failed
          </strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              void load()
            }
          >
            Try again
          </button>
        </div>
      )}

      {(page === "campaigns" ||
        page === "ads" ||
        page === "pending") && (
        <div className="marketing-admin__filters">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search…"
          />

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
          >
            <option value="">
              All statuses
            </option>

            {statuses.map(
              (statusValue) => (
                <option
                  key={statusValue}
                  value={statusValue}
                >
                  {statusValue}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {page === "overview" && (
        <Overview
          overview={overview}
          campaigns={campaigns}
          ads={ads}
        />
      )}

      {page === "campaigns" && (
        <Campaigns
          items={campaigns}
          can={can}
          onAction={(
            item,
            actionType,
          ) =>
            void performAction(
              "campaign",
              item,
              actionType,
            )
          }
        />
      )}

      {page === "ads" && (
        <Ads
          items={ads}
          can={can}
          onAction={(
            item,
            actionType,
          ) =>
            void performAction(
              "ad",
              item,
              actionType,
            )
          }
        />
      )}

      {page === "pending" && (
        <>
          <Queue title="Campaign Review Queue">
            <Campaigns
              items={pendingCampaigns}
              can={can}
              onAction={(
                item,
                actionType,
              ) =>
                void performAction(
                  "campaign",
                  item,
                  actionType,
                )
              }
            />
          </Queue>

          <Queue title="Advertisement Review Queue">
            <Ads
              items={pendingAds}
              can={can}
              onAction={(
                item,
                actionType,
              ) =>
                void performAction(
                  "ad",
                  item,
                  actionType,
                )
              }
            />
          </Queue>
        </>
      )}

      {page === "analytics" && (
        <Analytics
          totals={totals}
          campaigns={campaigns}
        />
      )}

      {page === "advertisers" && (
        <Advertisers
          campaigns={campaigns}
        />
      )}

      {page === "workflow" &&
        workflow && (
          <Workflow
            value={workflow}
            can={can}
            onSaved={(updatedWorkflow) => {
              setWorkflow(
                updatedWorkflow,
              );

              setOverview(
                (current: any) =>
                  current
                    ? {
                        ...current,
                        workflow:
                          updatedWorkflow,
                      }
                    : current,
              );
            }}
          />
        )}

      {page === "audit" && (
        <Audit
          items={audit}
        />
      )}
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| OVERVIEW
|--------------------------------------------------------------------------
*/

function Overview({
  overview,
  campaigns,
  ads,
}: {
  overview: any;
  campaigns: MarketingCampaignAdmin[];
  ads: MarketingAdAdmin[];
}) {
  return (
    <>
      <div className="marketing-admin__stats">
        <Stat
          label="Service"
          value={
            overview?.status ||
            "Unknown"
          }
        />

        <Stat
          label="Capabilities"
          value={String(
            overview?.capabilities
              ?.length || 0,
          )}
        />

        <Stat
          label="Permissions"
          value={String(
            overview?.permissions
              ?.length || 0,
          )}
        />

        <Stat
          label="Campaign statuses"
          value={String(
            overview?.campaignStatuses
              ?.length ||
              statuses.length,
          )}
        />
      </div>

      <div className="marketing-admin__grid">
        <Card title="Marketing Control Center">
          <div className="chips">
            {(
              overview?.capabilities || [
                "campaigns",
                "ads",
                "workflow",
                "audit",
              ]
            ).map(
              (capability: string) => (
                <span key={capability}>
                  {capability}
                </span>
              ),
            )}
          </div>
        </Card>

        <Card title="Current Activity">
          <p>
            {campaigns.length} campaigns
            loaded.
          </p>

          <p>
            {ads.length} advertisements
            loaded.
          </p>

          <p>
            {
              campaigns.filter(
                (campaign) =>
                  campaign.status ===
                  "PENDING_REVIEW",
              ).length
            } campaigns awaiting
            review.
          </p>

          <p>
            {
              ads.filter(
                (ad) =>
                  ad.status ===
                  "PENDING_REVIEW",
              ).length
            } ads awaiting review.
          </p>
        </Card>
      </div>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| STAT
|--------------------------------------------------------------------------
*/

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="marketing-admin__stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| CARD
|--------------------------------------------------------------------------
*/

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="marketing-admin__card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| QUEUE
|--------------------------------------------------------------------------
*/

function Queue({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="marketing-admin__card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| CAMPAIGNS
|--------------------------------------------------------------------------
*/

function Campaigns({
  items,
  can,
  onAction,
}: {
  items: MarketingCampaignAdmin[];
  can: (permission: string) => boolean;
  onAction: (
    item: MarketingCampaignAdmin,
    action: MarketingAction,
  ) => void;
}) {
  return (
    <Table empty="No campaigns found.">
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Advertiser</th>
            <th>Status</th>
            <th>Budget</th>
            <th>Spend</th>
            <th>Performance</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map(
            (item) => (
              <tr key={item.id}>
                <td>
                  <b>
                    {item.name}
                  </b>

                  <small>
                    {item.id}
                  </small>
                </td>

                <td>
                  {item.advertiserName}
                </td>

                <td>
                  <Badge
                    value={item.status}
                  />
                </td>

                <td>
                  {money(
                    item.budget,
                  )}
                </td>

                <td>
                  {money(
                    item.spent,
                  )}
                </td>

                <td>
                  {numberFormat(
                    item.impressions,
                  )}{" "}
                  imp. /{" "}
                  {numberFormat(
                    item.clicks,
                  )}{" "}
                  clicks
                </td>

                <td>
                  <MarketingActionButtons
                    status={item.status}
                    can={can}
                    permissions={
                      permissions
                    }
                    onAction={(
                      actionType,
                    ) =>
                      onAction(
                        item,
                        actionType,
                      )
                    }
                  />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </Table>
  );
}

/*
|--------------------------------------------------------------------------
| ADS
|--------------------------------------------------------------------------
*/

function Ads({
  items,
  can,
  onAction,
}: {
  items: MarketingAdAdmin[];
  can: (permission: string) => boolean;
  onAction: (
    item: MarketingAdAdmin,
    action: MarketingAction,
  ) => void;
}) {
  return (
    <Table empty="No advertisements found.">
      <table>
        <thead>
          <tr>
            <th>Ad</th>
            <th>Campaign</th>
            <th>Advertiser</th>
            <th>Status</th>
            <th>Placement</th>
            <th>Performance</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map(
            (item) => (
              <tr key={item.id}>
                <td>
                  <b>{item.id}</b>

                  <small>
                    {formatDate(
                      item.createdAt,
                    )}
                  </small>
                </td>

                <td>
                  {item.campaignName}
                </td>

                <td>
                  {item.advertiserName}
                </td>

                <td>
                  <Badge
                    value={item.status}
                  />
                </td>

                <td>
                  {item.placement}
                </td>

                <td>
                  {numberFormat(
                    item.impressions,
                  )}{" "}
                  imp. /{" "}
                  {numberFormat(
                    item.clicks,
                  )}{" "}
                  clicks
                </td>

                <td>
                  <AdButtons
                    ad={item}
                    can={can}
                    onAction={
                      onAction
                    }
                  />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </Table>
  );
}

/*
|--------------------------------------------------------------------------
| AD ACTION BUTTONS
|--------------------------------------------------------------------------
*/

function AdButtons({
  ad,
  can,
  onAction,
}: {
  ad: MarketingAdAdmin;
  can: (permission: string) => boolean;
  onAction: (
    item: MarketingAdAdmin,
    action: MarketingAction,
  ) => void;
}) {
  const button = (
    action: MarketingAction,
    permission: string,
    label: string,
  ) =>
    can(permission) ? (
      <button
        type="button"
        onClick={() =>
          onAction(
            ad,
            action,
          )
        }
      >
        {label}
      </button>
    ) : null;

  return (
    <div className="marketing-admin__actions">
      {ad.status ===
        "PENDING_REVIEW" &&
        button(
          "APPROVE",
          permissions.AD_APPROVE,
          "Approve",
        )}

      {ad.status ===
        "PENDING_REVIEW" &&
        button(
          "REJECT",
          permissions.AD_REJECT,
          "Reject",
        )}

      {ad.status ===
        "APPROVED" &&
        button(
          "PUBLISH",
          permissions.AD_PUBLISH,
          "Publish",
        )}

      {ad.status ===
        "ACTIVE" &&
        button(
          "PAUSE",
          permissions.AD_PAUSE,
          "Pause",
        )}

      {ad.status ===
        "PAUSED" &&
        button(
          "RESUME",
          permissions.AD_RESUME,
          "Resume",
        )}

      {![
        "BLOCKED",
        "ARCHIVED",
      ].includes(ad.status) &&
        button(
          "BLOCK",
          permissions.AD_BLOCK,
          "Block",
        )}

      {ad.status ===
        "BLOCKED" &&
        button(
          "UNBLOCK",
          permissions.AD_UNBLOCK,
          "Unblock",
        )}

      {ad.status !==
        "ARCHIVED" &&
        button(
          "ARCHIVE",
          permissions.AD_ARCHIVE,
          "Archive",
        )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| TABLE
|--------------------------------------------------------------------------
*/

function Table({
  children,
}: {
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <div className="marketing-admin__table-wrap">
      {children}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/

function Badge({
  value,
}: {
  value: string;
}) {
  return (
    <span
      className={`marketing-admin-status marketing-admin-status--${value
        .toLowerCase()
        .replace(/_/g, "-")}`}
    >
      {value}
    </span>
  );
}

/*
|--------------------------------------------------------------------------
| ANALYTICS
|--------------------------------------------------------------------------
*/

function Analytics({
  totals,
  campaigns,
}: {
  totals: {
    budget: number;
    spent: number;
    impressions: number;
    clicks: number;
  };
  campaigns: MarketingCampaignAdmin[];
}) {
  const ctr = totals.impressions
    ? (
        (totals.clicks /
          totals.impressions) *
        100
      ).toFixed(2)
    : "0.00";

  return (
    <>
      <div className="marketing-admin__stats">
        <Stat
          label="Budget"
          value={money(
            totals.budget,
          )}
        />

        <Stat
          label="Spend"
          value={money(
            totals.spent,
          )}
        />

        <Stat
          label="Impressions"
          value={numberFormat(
            totals.impressions,
          )}
        />

        <Stat
          label="CTR"
          value={`${ctr}%`}
        />
      </div>

      <Card title="Campaign Performance">
        <Table empty="No analytics available.">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Budget</th>
                <th>Spend</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>Conversions</th>
              </tr>
            </thead>

            <tbody>
              {campaigns.map(
                (item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                    </td>

                    <td>
                      {money(
                        item.budget,
                      )}
                    </td>

                    <td>
                      {money(
                        item.spent,
                      )}
                    </td>

                    <td>
                      {numberFormat(
                        item.impressions,
                      )}
                    </td>

                    <td>
                      {numberFormat(
                        item.clicks,
                      )}
                    </td>

                    <td>
                      {numberFormat(
                        item.conversions,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </Table>
      </Card>
    </>
  );
}

/*
|--------------------------------------------------------------------------
| ADVERTISERS
|--------------------------------------------------------------------------
*/

function Advertisers({
  campaigns,
}: {
  campaigns: MarketingCampaignAdmin[];
}) {
  const advertiserMap = new Map<
    string,
    {
      id: string;
      name: string;
      campaigns: number;
      spend: number;
    }
  >();

  campaigns.forEach(
    (campaign) => {
      const current =
        advertiserMap.get(
          campaign.advertiserId,
        ) || {
          id: campaign.advertiserId,
          name:
            campaign.advertiserName,
          campaigns: 0,
          spend: 0,
        };

      current.campaigns += 1;

      current.spend += Number(
        campaign.spent || 0,
      );

      advertiserMap.set(
        campaign.advertiserId,
        current,
      );
    },
  );

  return (
    <Card title="Advertisers">
      <Table empty="No advertisers available.">
        <table>
          <thead>
            <tr>
              <th>Advertiser</th>
              <th>Campaigns</th>
              <th>Spend</th>
            </tr>
          </thead>

          <tbody>
            {[
              ...advertiserMap.values(),
            ].map(
              (advertiser) => (
                <tr
                  key={
                    advertiser.id
                  }
                >
                  <td>
                    <b>
                      {
                        advertiser.name
                      }
                    </b>

                    <small>
                      {
                        advertiser.id
                      }
                    </small>
                  </td>

                  <td>
                    {
                      advertiser.campaigns
                    }
                  </td>

                  <td>
                    {money(
                      advertiser.spend,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </Table>
    </Card>
  );
}

/*
|--------------------------------------------------------------------------
| WORKFLOW
|--------------------------------------------------------------------------
*/

function Workflow({
  value,
  can,
  onSaved,
}: {
  value: MarketingWorkflowSettings;
  can: (permission: string) => boolean;
  onSaved: (
    workflow: MarketingWorkflowSettings,
  ) => void;
}) {
  const [form, setForm] =
    useState(value);

  useEffect(() => {
    setForm(value);
  }, [value]);

  const save = async () => {
    if (
      !can(
        permissions.WORKFLOW_EDIT,
      )
    ) {
      window.alert(
        "You do not have permission to edit the marketing workflow.",
      );

      return;
    }

    try {
      const response =
        await api.updateWorkflow(
          form,
        );

      onSaved(
        response.workflow,
      );

      window.alert(
        "Marketing workflow saved.",
      );
    } catch (saveError) {
      window.alert(
        errorText(saveError),
      );
    }
  };

  const toggle = (
    key: keyof MarketingWorkflowSettings,
  ) => (
    <label className="marketing-admin__check">
      <input
        type="checkbox"
        checked={Boolean(
          form[key],
        )}
        onChange={(event) =>
          setForm({
            ...form,
            [key]:
              event.target.checked,
          })
        }
      />

      <span>{key}</span>
    </label>
  );

  return (
    <Card title="Marketing Workflow">
      <div className="marketing-admin__form">
        <label>
          Campaign approval

          <select
            value={
              form.campaignApprovalMode
            }
            onChange={(event) =>
              setForm({
                ...form,
                campaignApprovalMode:
                  event.target
                    .value as any,
              })
            }
          >
            <option value="AUTO_PUBLISH">
              AUTO_PUBLISH
            </option>

            <option value="REQUIRE_ADMIN_APPROVAL">
              REQUIRE_ADMIN_APPROVAL
            </option>

            <option value="REQUIRE_TWO_ADMIN_APPROVALS">
              REQUIRE_TWO_ADMIN_APPROVALS
            </option>
          </select>
        </label>

        <label>
          Ad approval

          <select
            value={
              form.adApprovalMode
            }
            onChange={(event) =>
              setForm({
                ...form,
                adApprovalMode:
                  event.target
                    .value as any,
              })
            }
          >
            <option value="AUTO_PUBLISH">
              AUTO_PUBLISH
            </option>

            <option value="REQUIRE_ADMIN_APPROVAL">
              REQUIRE_ADMIN_APPROVAL
            </option>

            <option value="REQUIRE_TWO_ADMIN_APPROVALS">
              REQUIRE_TWO_ADMIN_APPROVALS
            </option>
          </select>
        </label>

        {toggle(
          "autoPublishTrustedAdvertisers",
        )}

        {toggle(
          "blockedCampaignStopsAds",
        )}

        {toggle(
          "blockedCampaignStopsScheduledAds",
        )}

        {toggle(
          "blockedCampaignStopsNotifications",
        )}

        {toggle(
          "notifyAdvertiserOnBlock",
        )}

        {toggle(
          "requireReviewBeforeReactivation",
        )}

        <button
          type="button"
          disabled={
            !can(
              permissions.WORKFLOW_EDIT,
            )
          }
          onClick={() =>
            void save()
          }
        >
          Save Changes
        </button>
      </div>
    </Card>
  );
}

/*
|--------------------------------------------------------------------------
| AUDIT
|--------------------------------------------------------------------------
*/

function Audit({
  items,
}: {
  items: MarketingAuditEvent[];
}) {
  return (
    <Card title="Marketing Audit">
      <Table empty="No audit events.">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>Actor</th>
              <th>Reason</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {items.map(
              (item) => (
                <tr key={item.id}>
                  <td>
                    {item.action}
                  </td>

                  <td>
                    {
                      item.resourceType
                    }

                    <small>
                      {
                        item.resourceId
                      }
                    </small>
                  </td>

                  <td>
                    {
                      item.actorName ||
                      item.actorId
                    }
                  </td>

                  <td>
                    {
                      item.reason ||
                      item.note ||
                      "—"
                    }
                  </td>

                  <td>
                    {formatDate(
                      item.createdAt,
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </Table>
    </Card>
  );
}