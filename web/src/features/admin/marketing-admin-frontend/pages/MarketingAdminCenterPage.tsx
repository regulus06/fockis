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

  marketingAdminControlApi,

} from "../api/marketingAdminControlApi";

import type {

  MarketingAdAdmin,

  MarketingAuditEvent,

  MarketingCampaignAdmin,

  MarketingCampaignStatus,

  MarketingWorkflowSettings,

} from "../types/marketingAdmin.types";

import "../styles/marketingAdmin.scss";

type PageKey =

  | "overview"

  | "campaigns"

  | "ads"

  | "pending"

  | "analytics"

  | "advertisers"

  | "workflow"

  | "audit";

interface OverviewResponse {

  success: boolean;

  service: string;

  status: string;

  capabilities: string[];

  workflow: MarketingWorkflowSettings;

  campaignStatuses: string[];

  permissions: string[];

}

const STATUS_OPTIONS: MarketingCampaignStatus[] = [

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

function getPageKey(pathname: string): PageKey {

  if (

    pathname === "/admin/marketing-admin" ||

    pathname === "/admin/marketing-admin/"

  ) {

    return "overview";

  }

  if (pathname.includes("/marketing/campaigns")) {

    return "campaigns";

  }

  if (pathname.includes("/marketing/ads")) {

    return "ads";

  }

  if (pathname.includes("/marketing/pending-review")) {

    return "pending";

  }

  if (pathname.includes("/marketing/analytics")) {

    return "analytics";

  }

  if (

    pathname.includes(

      "/marketing-admin/advertisers",

    )

  ) {

    return "advertisers";

  }

  if (

    pathname.includes(

      "/marketing-admin/workflow",

    )

  ) {

    return "workflow";

  }

  if (

    pathname.includes(

      "/marketing-admin/audit",

    )

  ) {

    return "audit";

  }

  return "overview";

}

function formatDate(value?: string) {

  if (!value) {

    return "—";

  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {

    return value;

  }

  return date.toLocaleString();

}

function formatCurrency(value?: number) {

  if (typeof value !== "number") {

    return "$0.00";

  }

  return value.toLocaleString("en-US", {

    style: "currency",

    currency: "USD",

  });

}

function formatNumber(value?: number) {

  if (typeof value !== "number") {

    return "0";

  }

  return value.toLocaleString();

}

function statusClass(status?: string) {

  return (

    `marketing-admin-status marketing-admin-status--${String(

      status ?? "unknown",

    )

      .toLowerCase()

      .replace(/\_/g, "-")}`

  );

}

function getErrorMessage(error: unknown) {

  if (error instanceof Error) {

    return error.message;

  }

  return "Marketing Admin request failed.";

}

export default function MarketingAdminCenterPage() {

  const location = useLocation();

  const page = getPageKey(

    location.pathname,

  );

  const [overview, setOverview] =

    useState<OverviewResponse | null>(null);

  const [campaigns, setCampaigns] =

    useState<MarketingCampaignAdmin[]>([]);

  const [ads, setAds] =

    useState<MarketingAdAdmin[]>([]);

  const [auditEvents, setAuditEvents] =
    useState<MarketingAuditEvent[]>([]);

  const [loading, setLoading] =

    useState(false);

  const [error, setError] =

    useState<string | null>(null);

  const [search, setSearch] =

    useState("");

  const [statusFilter, setStatusFilter] =

    useState<string>("");

  const [refreshKey, setRefreshKey] =

    useState(0);

  const loadOverview =

    useCallback(async () => {

      try {

        setLoading(true);

        setError(null);

        const response =

          await marketingAdminControlApi

            .getOverview();

        setOverview(response);

      } catch (err) {

        setError(

          getErrorMessage(err),

        );

      } finally {

        setLoading(false);

      }

    }, []);

  const loadCampaigns =

    useCallback(async () => {

      try {

        setLoading(true);

        setError(null);

        const response =

          await marketingAdminControlApi

            .listCampaigns({

              status:

                statusFilter || undefined,

              search:

                search.trim() || undefined,

            });

        setCampaigns(

          Array.isArray(response)

            ? response

            : [],

        );

      } catch (err) {

        setError(

          getErrorMessage(err),

        );

      } finally {

        setLoading(false);

      }

    }, [

      search,

      statusFilter,

    ]);

  const loadAds =

    useCallback(async () => {

      try {

        setLoading(true);

        setError(null);

        const response =

          await marketingAdminControlApi

            .listAds({

              status:

                statusFilter || undefined,

              search:

                search.trim() || undefined,

            });

        setAds(

          Array.isArray(response)

            ? response

            : [],

        );

      } catch (err) {

        setError(

          getErrorMessage(err),

        );

      } finally {

        setLoading(false);

      }

    }, [

      search,

      statusFilter,

    ]);

  const loadAudit =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await marketingAdminControlApi
            .getAudit();

        setAuditEvents(
          Array.isArray(response)
            ? response
            : [],
        );
      } catch (err) {
        setError(
          getErrorMessage(err),
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {

    if (page === "overview") {

      void loadOverview();

    }

    if (

      page === "campaigns" ||

      page === "pending"

    ) {

      void loadCampaigns();

    }

    if (page === "ads") {

      void loadAds();

    }

    if (page === "audit") {

      void loadAudit();

    }

  }, [

    page,

    refreshKey,

    loadOverview,

    loadCampaigns,

    loadAds,

    loadAudit,

  ]);

  const pendingCampaigns =

    useMemo(

      () =>

        campaigns.filter(

          (campaign) =>

            campaign.status ===

            "PENDING_REVIEW",

        ),

      [campaigns],

    );

  const activeCampaigns =

    useMemo(

      () =>

        campaigns.filter(

          (campaign) =>

            campaign.status ===

            "ACTIVE",

        ),

      [campaigns],

    );

  const blockedCampaigns =

    useMemo(

      () =>

        campaigns.filter(

          (campaign) =>

            campaign.status ===

            "BLOCKED",

        ),

      [campaigns],

    );

  const totalBudget =

    useMemo(

      () =>

        campaigns.reduce(

          (sum, campaign) =>

            sum +

            Number(campaign.budget ?? 0),

          0,

        ),

      [campaigns],

    );

  const totalSpent =

    useMemo(

      () =>

        campaigns.reduce(

          (sum, campaign) =>

            sum +

            Number(campaign.spent ?? 0),

          0,

        ),

      [campaigns],

    );

  const totalImpressions =

    useMemo(

      () =>

        campaigns.reduce(

          (sum, campaign) =>

            sum +

            Number(

              campaign.impressions ?? 0,

            ),

          0,

        ),

      [campaigns],

    );

  const totalClicks =

    useMemo(

      () =>

        campaigns.reduce(

          (sum, campaign) =>

            sum +

            Number(

              campaign.clicks ?? 0,

            ),

          0,

        ),

      [campaigns],

    );

  const refresh = () => {

    setRefreshKey(

      (value) => value + 1,

    );

  };

  const renderHeader = () => {

    const titles: Record<

      PageKey,

      string

    > = {

      overview: "Marketing Admin",

      campaigns: "Campaign Management",

      ads: "Advertisement Management",

      pending: "Pending Review",

      analytics: "Marketing Analytics",

      advertisers: "Advertisers",

      workflow: "Workflow & Settings",

      audit: "Marketing Audit",

    };

    const descriptions: Record<

      PageKey,

      string

    > = {

      overview:

        "Manage platform-wide campaigns, advertisements, approvals, workflow, and marketing governance.",

      campaigns:

        "Review and manage marketing campaigns across Fockis.",

      ads:

        "Review advertisements and control their publishing lifecycle.",

      pending:

        "Review campaigns and advertisements waiting for administrative approval.",

      analytics:

        "Review marketing performance across campaigns and advertisements.",

      advertisers:

        "Review advertiser activity and marketing relationships.",

      workflow:

        "Configure how campaigns and advertisements move through the approval lifecycle.",

      audit:

        "Review administrative actions performed in Marketing Admin.",

    };

    return (

      <div className="marketing-admin__header">

        <div>

          <div className="marketing-admin__eyebrow">

            FOCKIS MARKETING

          </div>

          <h1>

            {titles[page]}

          </h1>

          <p>

            {descriptions[page]}

          </p>

        </div>

        <button

          type="button"

          className="marketing-admin__refresh"

          onClick={refresh}

          disabled={loading}

        >

          {loading

            ? "Refreshing..."

            : "Refresh"}

        </button>

      </div>

    );

  };

  const renderNavigation = () => (

    <div className="marketing-admin__tabs">

      <NavLink

        to="/admin/marketing-admin"

        end

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Overview

      </NavLink>

      <NavLink

        to="/admin/marketing/campaigns"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Campaigns

      </NavLink>

      <NavLink

        to="/admin/marketing/ads"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Ads

      </NavLink>

      <NavLink

        to="/admin/marketing/pending-review"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Pending Review

      </NavLink>

      <NavLink

        to="/admin/marketing/analytics"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Analytics

      </NavLink>

      <NavLink

        to="/admin/marketing-admin/advertisers"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Advertisers

      </NavLink>

      <NavLink

        to="/admin/marketing-admin/workflow"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Workflow

      </NavLink>

      <NavLink

        to="/admin/marketing-admin/audit"

        className={({ isActive }) =>

          `marketing-admin__tab${

            isActive

              ? " marketing-admin__tab--active"

              : ""

          }`

        }

      >

        Audit

      </NavLink>

    </div>

  );

  const renderError = () => {

    if (!error) {

      return null;

    }

    return (

      <div className="marketing-admin__error">

        <strong>

          Marketing Admin request failed

        </strong>

        <span>{error}</span>

        <button

          type="button"

          onClick={refresh}

        >

          Try Again

        </button>

      </div>

    );

  };

  const renderOverview =

    () => {

      return (

        <>

          <div className="marketing-admin__stats">

            <StatCard

              label="Service"

              value={

                overview?.status ??

                "Unknown"

              }

              detail={

                overview?.service ??

                "marketing-admin"

              }

            />

            <StatCard

              label="Capabilities"

              value={

                String(

                  overview?.capabilities

                    ?.length ?? 0,

                )

              }

              detail="Marketing modules"

            />

            <StatCard

              label="Permissions"

              value={

                String(

                  overview?.permissions

                    ?.length ?? 0,

                )

              }

              detail="Available permissions"

            />

            <StatCard

              label="Campaign statuses"

              value={

                String(

                  overview

                    ?.campaignStatuses

                    ?.length ?? 0,

                )

              }

              detail="Lifecycle states"

            />

          </div>

          <div className="marketing-admin__grid">

            <section className="marketing-admin__card">

              <div className="marketing-admin__card-header">

                <div>

                  <h2>

                    Marketing Control Center

                  </h2>

                  <p>

                    Administrative controls

                    for Fockis marketing.

                  </p>

                </div>

                <span className="marketing-admin__ready">

                  ● Ready

                </span>

              </div>

              <div className="marketing-admin__capabilities">

                {(

                  overview?.capabilities ??

                  []

                ).map(

                  (capability) => (

                    <span

                      key={capability}

                      className="marketing-admin__capability"

                    >

                      {capability}

                    </span>

                  ),

                )}

              </div>

            </section>

            <section className="marketing-admin__card">

              <div className="marketing-admin__card-header">

                <div>

                  <h2>

                    Approval Workflow

                  </h2>

                  <p>

                    Current marketing

                    governance configuration.

                  </p>

                </div>

              </div>

              {overview?.workflow ? (

                <WorkflowSummary

                  workflow={

                    overview.workflow

                  }

                />

              ) : (

                <div className="marketing-admin__empty">

                  Workflow information is

                  not available yet.

                </div>

              )}

            </section>

          </div>

        </>

      );

    };

  const renderCampaigns =

    () => {

      return (

        <>

          <FilterBar

            search={search}

            setSearch={setSearch}

            status={statusFilter}

            setStatus={setStatusFilter}

          />

          <div className="marketing-admin__stats">

            <StatCard

              label="Campaigns"

              value={String(

                campaigns.length,

              )}

              detail="Loaded campaigns"

            />

            <StatCard

              label="Pending Review"

              value={String(

                pendingCampaigns.length,

              )}

              detail="Awaiting approval"

            />

            <StatCard

              label="Active"

              value={String(

                activeCampaigns.length,

              )}

              detail="Currently active"

            />

            <StatCard

              label="Blocked"

              value={String(

                blockedCampaigns.length,

              )}

              detail="Delivery blocked"

            />

          </div>

          <CampaignTable

            campaigns={campaigns}

            onRefresh={refresh}

          />

        </>

      );

    };

  const renderAds = () => {

    return (

      <>

        <FilterBar

          search={search}

          setSearch={setSearch}

          status={statusFilter}

          setStatus={setStatusFilter}

        />

        <div className="marketing-admin__stats">

          <StatCard

            label="Ads"

            value={String(

              ads.length,

            )}

            detail="Loaded advertisements"

          />

          <StatCard

            label="Active"

            value={String(

              ads.filter(

                (ad) =>

                  ad.status ===

                  "ACTIVE",

              ).length,

            )}

            detail="Active advertisements"

          />

          <StatCard

            label="Blocked"

            value={String(

              ads.filter(

                (ad) =>

                  ad.status ===

                  "BLOCKED",

              ).length,

            )}

            detail="Blocked advertisements"

          />

          <StatCard

            label="Clicks"

            value={formatNumber(

              ads.reduce(

                (sum, ad) =>

                  sum +

                  Number(

                    ad.clicks ?? 0,

                  ),

                0,

              ),

            )}

            detail="Total clicks"

          />

        </div>

        <AdTable

          ads={ads}

          onRefresh={refresh}

        />

      </>

    );

  };

  const renderPending =

    () => {

      const pendingAds =

        ads.filter(

          (ad) =>

            ad.status ===

            "PENDING_REVIEW",

        );

      return (

        <>

          <div className="marketing-admin__stats">

            <StatCard

              label="Campaigns Awaiting Review"

              value={String(

                pendingCampaigns.length,

              )}

              detail="Campaign approval queue"

            />

            <StatCard

              label="Ads Awaiting Review"

              value={String(

                pendingAds.length,

              )}

              detail="Advertisement approval queue"

            />

          </div>

          <div className="marketing-admin__grid">

            <section className="marketing-admin__card">

              <div className="marketing-admin__card-header">

                <div>

                  <h2>

                    Campaign Review Queue

                  </h2>

                  <p>

                    Campaigns currently

                    waiting for approval.

                  </p>

                </div>

              </div>

              {pendingCampaigns.length ===

              0 ? (

                <EmptyState

                  message="No campaigns are currently waiting for review."

                />

              ) : (

                <CampaignTable

                  campaigns={

                    pendingCampaigns

                  }

                  onRefresh={refresh}

                />

              )}

            </section>

            <section className="marketing-admin__card">

              <div className="marketing-admin__card-header">

                <div>

                  <h2>

                    Advertisement Review Queue

                  </h2>

                  <p>

                    Ads currently waiting

                    for approval.

                  </p>

                </div>

              </div>

              {pendingAds.length ===

              0 ? (

                <EmptyState

                  message="No advertisements are currently waiting for review."

                />

              ) : (

                <AdTable

                  ads={pendingAds}

                  onRefresh={refresh}

                />

              )}

            </section>

          </div>

        </>

      );

    };

  const renderAnalytics =

    () => {

      const ctr =

        totalImpressions > 0

          ? (

              (totalClicks /

                totalImpressions) *

              100

            ).toFixed(2)

          : "0.00";

      return (

        <>

          <div className="marketing-admin__stats">

            <StatCard

              label="Budget"

              value={formatCurrency(

                totalBudget,

              )}

              detail="Campaign budget"

            />

            <StatCard

              label="Spend"

              value={formatCurrency(

                totalSpent,

              )}

              detail="Campaign spend"

            />

            <StatCard

              label="Impressions"

              value={formatNumber(

                totalImpressions,

              )}

              detail="Total impressions"

            />

            <StatCard

              label="CTR"

              value={`${ctr}%`}

              detail="Click-through rate"

            />

          </div>

          <section className="marketing-admin__card">

            <div className="marketing-admin__card-header">

              <div>

                <h2>

                  Campaign Performance

                </h2>

                <p>

                  Performance data returned

                  by the Marketing Admin API.

                </p>

              </div>

            </div>

            {campaigns.length ===

            0 ? (

              <EmptyState

                message="No campaign analytics are available yet."

              />

            ) : (

              <div className="marketing-admin__table-wrap">

                <table className="marketing-admin__table">

                  <thead>

                    <tr>

                      <th>

                        Campaign

                      </th>

                      <th>

                        Budget

                      </th>

                      <th>

                        Spend

                      </th>

                      <th>

                        Impressions

                      </th>

                      <th>

                        Clicks

                      </th>

                      <th>

                        Conversions

                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {campaigns.map(

                      (

                        campaign,

                      ) => (

                        <tr

                          key={

                            campaign.id

                          }

                        >

                          <td>

                            <strong>

                              {

                                campaign.name

                              }

                            </strong>

                            <small>

                              {

                                campaign.advertiserName

                              }

                            </small>

                          </td>

                          <td>

                            {formatCurrency(

                              campaign.budget,

                            )}

                          </td>

                          <td>

                            {formatCurrency(

                              campaign.spent,

                            )}

                          </td>

                          <td>

                            {formatNumber(

                              campaign.impressions,

                            )}

                          </td>

                          <td>

                            {formatNumber(

                              campaign.clicks,

                            )}

                          </td>

                          <td>

                            {formatNumber(

                              campaign.conversions,

                            )}

                          </td>

                        </tr>

                      ),

                    )}

                  </tbody>

                </table>

              </div>

            )}

          </section>

        </>

      );

    };

  const renderAdvertisers =

    () => {

      type AdvertiserSummary = {
        id: string;
        name: string;
        campaigns: number;
        spend: number;
      };

      const advertisers: AdvertiserSummary[] =
        Array.from(
          new Map<string, AdvertiserSummary>(
            campaigns.map((campaign) => [
              campaign.advertiserId,
              {
                id: campaign.advertiserId,
                name: campaign.advertiserName,
                campaigns: 0,
                spend: 0,
              },
            ]),
          ).values(),
        );

      campaigns.forEach(

        (campaign) => {

          const advertiser =

            advertisers.find(

              (item) =>

                item.id ===

                campaign.advertiserId,

            );

          if (!advertiser) {

            return;

          }

          advertiser.campaigns += 1;

          advertiser.spend +=

            Number(

              campaign.spent ?? 0,

            );

        },

      );

      return (

        <section className="marketing-admin__card">

          <div className="marketing-admin__card-header">

            <div>

              <h2>

                Advertisers

              </h2>

              <p>

                Advertisers represented

                by the campaigns currently

                returned by the API.

              </p>

            </div>

          </div>

          {advertisers.length ===

          0 ? (

            <EmptyState

              message="No advertiser records are available yet."

            />

          ) : (

            <div className="marketing-admin__table-wrap">

              <table className="marketing-admin__table">

                <thead>

                  <tr>

                    <th>

                      Advertiser

                    </th>

                    <th>

                      Campaigns

                    </th>

                    <th>

                      Spend

                    </th>

                  </tr>

                </thead>

                <tbody>

                  {advertisers.map(

                    (

                      advertiser,

                    ) => (

                      <tr

                        key={

                          advertiser.id

                        }

                      >

                        <td>

                          <strong>

                            {

                              advertiser.name

                            }

                          </strong>

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

                          {formatCurrency(

                            advertiser.spend,

                          )}

                        </td>

                      </tr>

                    ),

                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      );

    };

  const renderWorkflow =

    () => {

      const workflow =

        overview?.workflow;

      if (!workflow) {

        return (

          <section className="marketing-admin__card">

            <EmptyState

              message="Workflow settings are not available. Return to Overview or refresh the page."

            />

          </section>

        );

      }

      return (

        <WorkflowEditor

          workflow={workflow}

          onSaved={(next) => {

            setOverview(

              (current) =>

                current

                  ? {

                      ...current,

                      workflow:

                        next,

                    }

                  : current,

            );

          }}

        />

      );

    };

  const renderAudit =

    () => {

      return (

        <section className="marketing-admin__card">

          <div className="marketing-admin__card-header">

            <div>

              <h2>

                Marketing Audit

              </h2>

              <p>

                Administrative marketing

                actions recorded by the

                platform.

              </p>

            </div>

          </div>

          {!auditEvents ||

          auditEvents.length ===

            0 ? (

            <EmptyState

              message="No marketing audit events are available yet."

            />

          ) : (

            <div className="marketing-admin__table-wrap">

              <table className="marketing-admin__table">

                <thead>

                  <tr>

                    <th>

                      Action

                    </th>

                    <th>

                      Resource

                    </th>

                    <th>

                      Actor

                    </th>

                    <th>

                      Reason

                    </th>

                    <th>

                      Date

                    </th>

                  </tr>

                </thead>

                <tbody>

                  {auditEvents.map(

                    (event) => (

                      <tr

                        key={

                          event.id

                        }

                      >

                        <td>

                          <span className="marketing-admin__action">

                            {

                              event.action

                            }

                          </span>

                        </td>

                        <td>

                          <strong>

                            {

                              event.resourceType

                            }

                          </strong>

                          <small>

                            {

                              event.resourceId

                            }

                          </small>

                        </td>

                        <td>

                          {

                            event.actorName ??

                            event.actorId

                          }

                        </td>

                        <td>

                          {

                            event.reason ??

                            event.note ??

                            "—"

                          }

                        </td>

                        <td>

                          {formatDate(

                            event.createdAt,

                          )}

                        </td>

                      </tr>

                    ),

                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      );

    };

  return (

    <main className="marketing-admin">

      {renderHeader()}

      {renderNavigation()}

      {renderError()}

      {page === "overview" &&

        renderOverview()}

      {page === "campaigns" &&

        renderCampaigns()}

      {page === "ads" &&

        renderAds()}

      {page === "pending" &&

        renderPending()}

      {page === "analytics" &&

        renderAnalytics()}

      {page === "advertisers" &&

        renderAdvertisers()}

      {page === "workflow" &&

        renderWorkflow()}

      {page === "audit" &&

        renderAudit()}

    </main>

  );

}

function StatCard({

  label,

  value,

  detail,

}: {

  label: string;

  value: string;

  detail: string;

}) {

  return (

    <div className="marketing-admin__stat">

      <span>

        {label}

      </span>

      <strong>

        {value}

      </strong>

      <small>

        {detail}

      </small>

    </div>

  );

}

function FilterBar({

  search,

  setSearch,

  status,

  setStatus,

}: {

  search: string;

  setSearch: (

    value: string,

  ) => void;

  status: string;

  setStatus: (

    value: string,

  ) => void;

}) {

  return (

    <div className="marketing-admin__filters">

      <input

        type="search"

        value={search}

        onChange={(event) =>

          setSearch(

            event.target.value,

          )

        }

        placeholder="Search campaigns or ads..."

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

        {STATUS_OPTIONS.map(

          (option) => (

            <option

              key={option}

              value={option}

            >

              {option}

            </option>

          ),

        )}

      </select>

    </div>

  );

}

function CampaignTable({

  campaigns,

  onRefresh,

}: {

  campaigns: MarketingCampaignAdmin[];

  onRefresh: () => void;

}) {

  return (

    <section className="marketing-admin__card">

      <div className="marketing-admin__card-header">

        <div>

          <h2>

            Campaigns

          </h2>

          <p>

            Campaign lifecycle and

            delivery controls.

          </p>

        </div>

      </div>

      {campaigns.length === 0 ? (

        <EmptyState

          message="No campaigns were returned by the Marketing Admin API."

        />

      ) : (

        <div className="marketing-admin__table-wrap">

          <table className="marketing-admin__table">

            <thead>

              <tr>

                <th>

                  Campaign

                </th>

                <th>

                  Advertiser

                </th>

                <th>

                  Status

                </th>

                <th>

                  Budget

                </th>

                <th>

                  Spend

                </th>

                <th>

                  Performance

                </th>

                <th>

                  Actions

                </th>

              </tr>

            </thead>

            <tbody>

              {campaigns.map(

                (campaign) => (

                  <tr

                    key={

                      campaign.id

                    }

                  >

                    <td>

                      <strong>

                        {

                          campaign.name

                        }

                      </strong>

                      <small>

                        {

                          campaign.id

                        }

                      </small>

                    </td>

                    <td>

                      {

                        campaign.advertiserName

                      }

                    </td>

                    <td>

                      <span

                        className={statusClass(

                          campaign.status,

                        )}

                      >

                        {

                          campaign.status

                        }

                      </span>

                    </td>

                    <td>

                      {formatCurrency(

                        campaign.budget,

                      )}

                    </td>

                    <td>

                      {formatCurrency(

                        campaign.spent,

                      )}

                    </td>

                    <td>

                      <small>

                        {formatNumber(

                          campaign.impressions,

                        )}{" "}

                        impressions

                      </small>

                      <small>

                        {formatNumber(

                          campaign.clicks,

                        )}{" "}

                        clicks

                      </small>

                    </td>

                    <td>

                      <CampaignActions

                        campaign={

                          campaign

                        }

                        onRefresh={

                          onRefresh

                        }

                      />

                    </td>

                  </tr>

                ),

              )}

            </tbody>

          </table>

        </div>

      )}

    </section>

  );

}

function AdTable({

  ads,

  onRefresh,

}: {

  ads: MarketingAdAdmin[];

  onRefresh: () => void;

}) {

  return (

    <section className="marketing-admin__card">

      <div className="marketing-admin__card-header">

        <div>

          <h2>

            Advertisements

          </h2>

          <p>

            Advertisement lifecycle and

            delivery controls.

          </p>

        </div>

      </div>

      {ads.length === 0 ? (

        <EmptyState

          message="No advertisements were returned by the Marketing Admin API."

        />

      ) : (

        <div className="marketing-admin__table-wrap">

          <table className="marketing-admin__table">

            <thead>

              <tr>

                <th>

                  Advertisement

                </th>

                <th>

                  Campaign

                </th>

                <th>

                  Advertiser

                </th>

                <th>

                  Status

                </th>

                <th>

                  Placement

                </th>

                <th>

                  Performance

                </th>

                <th>

                  Actions

                </th>

              </tr>

            </thead>

            <tbody>

              {ads.map(

                (ad) => (

                  <tr

                    key={ad.id}

                  >

                    <td>

                      <strong>

                        {ad.id}

                      </strong>

                      <small>

                        Created{" "}

                        {formatDate(

                          ad.createdAt,

                        )}

                      </small>

                    </td>

                    <td>

                      {

                        ad.campaignName

                      }

                    </td>

                    <td>

                      {

                        ad.advertiserName

                      }

                    </td>

                    <td>

                      <span

                        className={statusClass(

                          ad.status,

                        )}

                      >

                        {

                          ad.status

                        }

                      </span>

                    </td>

                    <td>

                      {

                        ad.placement

                      }

                    </td>

                    <td>

                      <small>

                        {formatNumber(

                          ad.impressions,

                        )}{" "}

                        impressions

                      </small>

                      <small>

                        {formatNumber(

                          ad.clicks,

                        )}{" "}

                        clicks

                      </small>

                    </td>

                    <td>

                      <AdActions

                        ad={ad}

                        onRefresh={

                          onRefresh

                        }

                      />

                    </td>

                  </tr>

                ),

              )}

            </tbody>

          </table>

        </div>

      )}

    </section>

  );

}

function CampaignActions({

  campaign,

  onRefresh,

}: {

  campaign: MarketingCampaignAdmin;

  onRefresh: () => void;

}) {

  const [busy, setBusy] =

    useState(false);

  const execute =

    async (

      action:

        | "approve"

        | "publish"

        | "reject"

        | "pause"

        | "resume"

        | "block"

        | "unblock"

        | "archive",

    ) => {

      try {

        setBusy(true);

        const body = {

          reason:

            "Marketing Admin action",

          notifyAdvertiser:

            true,

        };

        if (action === "approve") {

          await marketingAdminControlApi

            .approveCampaign(

              campaign.id,

              body,

            );

        }

        if (action === "publish") {

          await marketingAdminControlApi

            .publishCampaign(

              campaign.id,

              body,

            );

        }

        if (action === "reject") {

          await marketingAdminControlApi

            .rejectCampaign(

              campaign.id,

              body,

            );

        }

        if (action === "pause") {

          await marketingAdminControlApi

            .pauseCampaign(

              campaign.id,

              body,

            );

        }

        if (action === "resume") {

          await marketingAdminControlApi

            .resumeCampaign(

              campaign.id,

              body,

            );

        }

        if (action === "block") {

          await marketingAdminControlApi

            .blockCampaign(

              campaign.id,

              {

                ...body,

                stopAllCampaignDelivery:

                  true,

              },

            );

        }

        if (action === "unblock") {

          await marketingAdminControlApi

            .unblockCampaign(

              campaign.id,

              body,

            );

        }

        if (action === "archive") {

          await marketingAdminControlApi

            .archiveCampaign(

              campaign.id,

              body,

            );

        }

        onRefresh();

      } catch (error) {

        window.alert(

          getErrorMessage(error),

        );

      } finally {

        setBusy(false);

      }

    };

  return (

    <div className="marketing-admin__actions">

      {campaign.status ===

        "PENDING_REVIEW" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "approve",

            )

          }

        >

          Approve

        </button>

      )}

      {campaign.status ===

        "APPROVED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "publish",

            )

          }

        >

          Publish

        </button>

      )}

      {campaign.status ===

        "ACTIVE" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "pause",

            )

          }

        >

          Pause

        </button>

      )}

      {campaign.status ===

        "PAUSED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "resume",

            )

          }

        >

          Resume

        </button>

      )}

      {campaign.status !==

        "BLOCKED" &&

        campaign.status !==

          "ARCHIVED" && (

          <button

            type="button"

            disabled={busy}

            onClick={() =>

              void execute(

                "block",

              )

            }

          >

            Block

          </button>

        )}

      {campaign.status ===

        "BLOCKED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "unblock",

            )

          }

        >

          Unblock

        </button>

      )}

      {campaign.status !==

        "ARCHIVED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "archive",

            )

          }

        >

          Archive

        </button>

      )}

    </div>

  );

}

function AdActions({

  ad,

  onRefresh,

}: {

  ad: MarketingAdAdmin;

  onRefresh: () => void;

}) {

  const [busy, setBusy] =

    useState(false);

  const execute =

    async (

      action:

        | "approve"

        | "publish"

        | "reject"

        | "pause"

        | "resume"

        | "block"

        | "unblock"

        | "archive",

    ) => {

      try {

        setBusy(true);

        const body = {

          reason:

            "Marketing Admin action",

          notifyAdvertiser:

            true,

        };

        if (action === "approve") {

          await marketingAdminControlApi

            .approveAd(

              ad.id,

              body,

            );

        }

        if (action === "publish") {

          await marketingAdminControlApi

            .publishAd(

              ad.id,

              body,

            );

        }

        if (action === "reject") {

          await marketingAdminControlApi

            .rejectAd(

              ad.id,

              body,

            );

        }

        if (action === "pause") {

          await marketingAdminControlApi

            .pauseAd(

              ad.id,

              body,

            );

        }

        if (action === "resume") {

          await marketingAdminControlApi

            .resumeAd(

              ad.id,

              body,

            );

        }

        if (action === "block") {

          await marketingAdminControlApi

            .blockAd(

              ad.id,

              body,

            );

        }

        if (action === "unblock") {

          await marketingAdminControlApi

            .unblockAd(

              ad.id,

              body,

            );

        }

        if (action === "archive") {

          await marketingAdminControlApi

            .archiveAd(

              ad.id,

              body,

            );

        }

        onRefresh();

      } catch (error) {

        window.alert(

          getErrorMessage(error),

        );

      } finally {

        setBusy(false);

      }

    };

  return (

    <div className="marketing-admin__actions">

      {ad.status ===

        "PENDING_REVIEW" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "approve",

            )

          }

        >

          Approve

        </button>

      )}

      {ad.status ===

        "APPROVED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "publish",

            )

          }

        >

          Publish

        </button>

      )}

      {ad.status ===

        "ACTIVE" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "pause",

            )

          }

        >

          Pause

        </button>

      )}

      {ad.status ===

        "PAUSED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "resume",

            )

          }

        >

          Resume

        </button>

      )}

      {ad.status !==

        "BLOCKED" &&

        ad.status !==

          "ARCHIVED" && (

          <button

            type="button"

            disabled={busy}

            onClick={() =>

              void execute(

                "block",

              )

            }

          >

            Block

          </button>

        )}

      {ad.status ===

        "BLOCKED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "unblock",

            )

          }

        >

          Unblock

        </button>

      )}

      {ad.status !==

        "ARCHIVED" && (

        <button

          type="button"

          disabled={busy}

          onClick={() =>

            void execute(

              "archive",

            )

          }

        >

          Archive

        </button>

      )}

    </div>

  );

}

function WorkflowSummary({

  workflow,

}: {

  workflow: MarketingWorkflowSettings;

}) {

  return (

    <div className="marketing-admin__workflow-summary">

      <WorkflowRow

        label="Campaign approval"

        value={

          workflow.campaignApprovalMode

        }

      />

      <WorkflowRow

        label="Ad approval"

        value={

          workflow.adApprovalMode

        }

      />

      <WorkflowRow

        label="Trusted advertiser auto-publish"

        value={

          workflow.autoPublishTrustedAdvertisers

            ? "Enabled"

            : "Disabled"

        }

      />

      <WorkflowRow

        label="Blocked campaign stops ads"

        value={

          workflow.blockedCampaignStopsAds

            ? "Yes"

            : "No"

        }

      />

      <WorkflowRow

        label="Stops scheduled ads"

        value={

          workflow.blockedCampaignStopsScheduledAds

            ? "Yes"

            : "No"

        }

      />

      <WorkflowRow

        label="Stops notifications"

        value={

          workflow.blockedCampaignStopsNotifications

            ? "Yes"

            : "No"

        }

      />

      <WorkflowRow

        label="Notify advertiser"

        value={

          workflow.notifyAdvertiserOnBlock

            ? "Yes"

            : "No"

        }

      />

      <WorkflowRow

        label="Review before reactivation"

        value={

          workflow.requireReviewBeforeReactivation

            ? "Yes"

            : "No"

        }

      />

    </div>

  );

}

function WorkflowRow({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="marketing-admin__workflow-row">

      <span>

        {label}

      </span>

      <strong>

        {value}

      </strong>

    </div>

  );

}

function WorkflowEditor({

  workflow,

  onSaved,

}: {

  workflow: MarketingWorkflowSettings;

  onSaved: (

    workflow: MarketingWorkflowSettings,

  ) => void;

}) {

  const [form, setForm] =

    useState<MarketingWorkflowSettings>(

      workflow,

    );

  const [saving, setSaving] =

    useState(false);

  useEffect(() => {

    setForm(workflow);

  }, [workflow]);

  const updateBoolean =

    (

      key: keyof MarketingWorkflowSettings,

      value: boolean,

    ) => {

      setForm(

        (current) => ({

          ...current,

          [key]: value,

        }),

      );

    };

  const save = async () => {

    try {

      setSaving(true);

      const response =

        await marketingAdminControlApi

          .updateWorkflow(form);

      onSaved(

        response.workflow,

      );

      window.alert(

        "Marketing workflow settings saved.",

      );

    } catch (error) {

      window.alert(

        getErrorMessage(error),

      );

    } finally {

      setSaving(false);

    }

  };

  return (

    <section className="marketing-admin__card">

      <div className="marketing-admin__card-header">

        <div>

          <h2>

            Marketing Workflow

          </h2>

          <p>

            Configure approval and

            enforcement behavior.

          </p>

        </div>

        <button

          type="button"

          className="marketing-admin__primary-button"

          disabled={saving}

          onClick={() =>

            void save()

          }

        >

          {saving

            ? "Saving..."

            : "Save Changes"}

        </button>

      </div>

      <div className="marketing-admin__form">

        <label>

          <span>

            Campaign approval mode

          </span>

          <select

            value={

              form.campaignApprovalMode

            }

            onChange={(event) =>

              setForm(

                (current) => ({

                  ...current,

                  campaignApprovalMode:

                    event.target

                      .value as MarketingWorkflowSettings["campaignApprovalMode"],

                }),

              )

            }

          >

            <option value="AUTO_PUBLISH">

              Auto Publish

            </option>

            <option value="REQUIRE_ADMIN_APPROVAL">

              Require Admin Approval

            </option>

            <option value="REQUIRE_TWO_ADMIN_APPROVALS">

              Require Two Admin Approvals

            </option>

          </select>

        </label>

        <label>

          <span>

            Ad approval mode

          </span>

          <select

            value={

              form.adApprovalMode

            }

            onChange={(event) =>

              setForm(

                (current) => ({

                  ...current,

                  adApprovalMode:

                    event.target

                      .value as MarketingWorkflowSettings["adApprovalMode"],

                }),

              )

            }

          >

            <option value="AUTO_PUBLISH">

              Auto Publish

            </option>

            <option value="REQUIRE_ADMIN_APPROVAL">

              Require Admin Approval

            </option>

            <option value="REQUIRE_TWO_ADMIN_APPROVALS">

              Require Two Admin Approvals

            </option>

          </select>

        </label>

        <Toggle

          label="Auto-publish trusted advertisers"

          checked={

            form.autoPublishTrustedAdvertisers

          }

          onChange={(value) =>

            updateBoolean(

              "autoPublishTrustedAdvertisers",

              value,

            )

          }

        />

        <Toggle

          label="Blocked campaigns stop advertisements"

          checked={

            form.blockedCampaignStopsAds

          }

          onChange={(value) =>

            updateBoolean(

              "blockedCampaignStopsAds",

              value,

            )

          }

        />

        <Toggle

          label="Blocked campaigns stop scheduled advertisements"

          checked={

            form.blockedCampaignStopsScheduledAds

          }

          onChange={(value) =>

            updateBoolean(

              "blockedCampaignStopsScheduledAds",

              value,

            )

          }

        />

        <Toggle

          label="Blocked campaigns stop notifications"

          checked={

            form.blockedCampaignStopsNotifications

          }

          onChange={(value) =>

            updateBoolean(

              "blockedCampaignStopsNotifications",

              value,

            )

          }

        />

        <Toggle

          label="Notify advertiser when blocked"

          checked={

            form.notifyAdvertiserOnBlock

          }

          onChange={(value) =>

            updateBoolean(

              "notifyAdvertiserOnBlock",

              value,

            )

          }

        />

        <Toggle

          label="Require review before reactivation"

          checked={

            form.requireReviewBeforeReactivation

          }

          onChange={(value) =>

            updateBoolean(

              "requireReviewBeforeReactivation",

              value,

            )

          }

        />

      </div>

    </section>

  );

}

function Toggle({

  label,

  checked,

  onChange,

}: {

  label: string;

  checked: boolean;

  onChange: (

    value: boolean,

  ) => void;

}) {

  return (

    <label className="marketing-admin__toggle">

      <span>

        {label}

      </span>

      <input

        type="checkbox"

        checked={checked}

        onChange={(event) =>

          onChange(

            event.target.checked,

          )

        }

      />

    </label>

  );

}

function EmptyState({

  message,

}: {

  message: string;

}) {

  return (

    <div className="marketing-admin__empty">

      {message}

    </div>

  );

}