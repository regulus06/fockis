import { useState } from "react";







import { Link } from "react-router-dom";















import { useMailchimp } from "../hooks/useMailchimp";







import { useDashboard } from "../hooks/useAnalytics";







import { useCampaigns } from "../hooks/useCampaigns";







import { useAudiences } from "../hooks/useAudience";







import { useMarketingWorkspace } from "../hooks/useMarketingWorkspace";







import { useCredits } from "../hooks/useCredits";















import { KpiBand } from "../components/MarketingKpiCard";







import {







  AnalyticsChart,







  BarList,







} from "../components/AnalyticsChart";







import { CampaignTable } from "../components/CampaignTable";







import {







  DateRangeSelect,







  describeRange,







} from "../components/DateRangeSelect";







import { useCampaignActions } from "../components/useCampaignActions";















import { LinkButton } from "../components/ui/Button";







import { Panel } from "../components/ui/Layout";







import {







  EmptyState,







  ErrorState,







  Skeleton,







  SkeletonRows,







} from "../components/ui/Feedback";







import { Segmented } from "../components/ui/Tabs";







import {







  Icon,







  type IconName,







} from "../components/ui/Icon";















import {







  clickRate,







  openRate,







} from "../services/campaignsApi";















import {







  formatCurrency,







  formatNumber,







  formatPercent,







  greeting,







  timeAgo,







} from "../utils/format";















import type {







  ActivityItem,







  Audience,







} from "../types/fockis-mail.types";















type DashboardAudience = Audience & {







  name: string;







  contactCount: number;







  growthPct: number;







};















const ACTIVITY_ICONS: Record<







  ActivityItem["icon"],







  IconName
> = {







  send: "send",







  user: "users",







  cart: "cart",







  alert: "alert",







  flow: "route",







  form: "form",







};















type ChartKey =







  | "performance"







  | "opens"







  | "clicks"







  | "revenue"







  | "subscriberGrowth"







  | "conversions";















const CHART_TABS: Array<{







  id: ChartKey;







  label: string;







}> = [







  {







    id: "performance",







    label: "Performance",







  },







  {







    id: "opens",







    label: "Opens",







  },







  {







    id: "clicks",







    label: "Clicks",







  },







  {







    id: "revenue",







    label: "Revenue",







  },







  {







    id: "subscriberGrowth",







    label: "Subscribers",







  },







  {







    id: "conversions",







    label: "Conversions",







  },







];















function normalizeAudience(







  audience: Audience,







): DashboardAudience {







  const source = audience as Audience & {







    name?: string;







    contactCount?: number;







    contacts?: number;







    subscriberCount?: number;







    memberCount?: number;







    growthPct?: number;







    growth?: number;







    growthPercent?: number;







  };















  return {







    ...audience,







    name: source.name ?? "Audience",







    contactCount:







      source.contactCount ??







      source.contacts ??







      source.subscriberCount ??







      source.memberCount ??







      0,







    growthPct:







      source.growthPct ??







      source.growth ??







      source.growthPercent ??







      0,







  };







}















export default function FockisMailDashboardPage() {







  const {







    userName,







    dateRange,







    setDateRange,







    isMock,







  } = useMailchimp();















  const { currentBusiness } =







    useMarketingWorkspace();















  const credits = useCredits(







    currentBusiness?.id,







  );















  const to = (path: string) => {

    const normalized = path.replace(/^\/+/, "");



    if (normalized === "compose") {

      return "/admin/fockismail/campaigns/new";

    }



    if (!normalized) {

      return "/admin/fockismail";

    }



    return `/admin/fockismail/${normalized}`;

  };















  const dash = useDashboard(dateRange);















  const recent = useCampaigns({});















  const audiences = useAudiences();















  const actions = useCampaignActions(







    recent.reload,







  );















  const [chart, setChart] =







    useState<ChartKey>("performance");















  const dashboardAudiences: DashboardAudience[] =







    (audiences.data ?? []).map(normalizeAudience);















  const sent = (recent.data ?? []).filter(







    (campaign) => campaign.stats.delivered > 0,







  );















  const top = [...sent]







    .sort(







      (a, b) =>







        b.stats.revenue - a.stats.revenue,







    )







    .slice(0, 4);















  const totalAudienceContacts =







    dashboardAudiences.reduce(







      (sum, audience) =>







        sum + audience.contactCount,







      0,







    );















  return (







    <div className="fm-page fm-dashboard">







      <section className="fm-welcome">







        <div>







          <h1>







            {greeting()}, {userName}







          </h1>















          <p>







            {currentBusiness &&







            !currentBusiness.isAgencyOwner ? (







              <>







                Here's what's happening with{" "}







                <strong>







                  {currentBusiness.name}







                </strong>







                's marketing.







              </>







            ) : (







              "Here's what's happening with your marketing."







            )}







          </p>















          {credits.data && (







            <p className="fm-welcome__credits">







              <Link to="/admin/fockismail/billing">







                {formatNumber(







                  credits.data







                    .emailCreditsRemaining,







                )}{" "}







                email credits







              </Link>{" "}







              and{" "}







              <Link to="/admin/fockismail/billing">







                {formatNumber(







                  credits.data







                    .smsCreditsRemaining,







                )}{" "}







                SMS credits







              </Link>{" "}







              left this cycle







            </p>







          )}







        </div>















        <div className="fm-welcome__actions">







          <DateRangeSelect







            value={dateRange}







            onChange={setDateRange}







          />















          <LinkButton







            to={to("compose")}







            variant="primary"







            icon="plus"







          >







            Create campaign







          </LinkButton>







        </div>







      </section>















      {dash.error ? (







        <ErrorState







          message={dash.error}







          onRetry={dash.reload}







        />







      ) : (







        <KpiBand







          metrics={dash.data?.metrics}







          loading={dash.loading}







        />







      )}















      <div className="fm-grid fm-grid--main">







        <Panel







          title="Campaign performance"







          description={describeRange(dateRange)}







          actions={







            <Segmented







              label="Chart metric"







              value={chart}







              onChange={setChart}







              options={CHART_TABS.map(







                (tab) => ({







                  id: tab.id,







                  label: tab.label,







                }),







              )}







            />







          }







          className="fm-span-2"







        >







          {dash.loading || !dash.data ? (







            <Skeleton height={240} />







          ) : (







            <AnalyticsChart







              title={







                CHART_TABS.find(







                  (tab) => tab.id === chart,







                )?.label ?? ""







              }







              series={Array.isArray(dash.data[chart]) ? dash.data[chart] : []}







              type={







                chart === "conversions"







                  ? "bar"







                  : chart === "performance"







                    ? "line"







                    : "area"







              }







              format={







                chart === "performance"







                  ? "percent"







                  : chart === "revenue"







                    ? "currency"







                    : "number"







              }







              height={250}







            />







          )}







        </Panel>















        <Panel







          title="Recommended actions"







          description="Based on your recent results"







        >







          {dash.loading || !dash.data ? (







            <Skeleton height={200} />







          ) : (







            <ul className="fm-recs">







              {(Array.isArray(dash.data.recommendations) ? dash.data.recommendations : []).map(







                (recommendation) => (







                  <li key={recommendation.id}>







                    <Icon







                      name="sparkle"







                      size={16}







                    />















                    <div>







                      <strong>







                        {recommendation.title}







                      </strong>















                      <p>







                        {recommendation.body}







                      </p>















                      <Link







                        to={







                          recommendation.actionPath.startsWith(







                            "/",







                          )







                            ? recommendation.actionPath







                            : to(







                                recommendation.actionPath,







                              )







                        }







                        className="fm-linkbtn"







                      >







                        {







                          recommendation.actionLabel







                        }







                      </Link>







                    </div>







                  </li>







                ),







              )}







            </ul>







          )}







        </Panel>







      </div>















      <Panel







        title="Recent campaigns"







        actions={







          <LinkButton







            to={to("campaigns")}







            size="sm"







            variant="ghost"







          >







            View all campaigns







          </LinkButton>







        }







        flush







      >







        {recent.error ? (







          <ErrorState







            message={recent.error}







            onRetry={recent.reload}







          />







        ) : recent.loading ||







          !recent.data ? (







          <SkeletonRows







            rows={5}







            cols={7}







          />







        ) : recent.data.length === 0 ? (







          <EmptyState







            icon="send"







            title="No campaigns yet"







            body="Create your first email to start reaching your Fockis audience."







            action={







              <LinkButton







                to={to("compose")}







                variant="primary"







                icon="plus"







              >







                Create campaign







              </LinkButton>







            }







          />







        ) : (







          <CampaignTable







            campaigns={recent.data







              .filter(







                (campaign) =>







                  campaign.status !==







                  "archived",







              )







              .slice(0, 6)}







            audiences={audiences.data ?? []}







            actionsFor={actions.itemsFor}







            variant="compact"







          />







        )}







      </Panel>















      <div className="fm-grid fm-grid--three">







        <Panel







          title="Top performing campaigns"







          description="By attributed revenue"







        >







          {recent.loading ? (







            <Skeleton height={180} />







          ) : top.length === 0 ? (







            <EmptyState







              compact







              icon="chart"







              title="No results yet"







              body="Sent campaigns appear here."







            />







          ) : (







            <ol className="fm-toplist">







              {top.map((campaign, index) => (







                <li key={campaign.id}>







                  <span className="fm-toplist__rank">







                    {index + 1}







                  </span>















                  <div>







                    <Link







                      to={to(







                        `campaigns/${campaign.id}`,







                      )}







                    >







                      {campaign.name}







                    </Link>















                    <small>







                      {formatPercent(







                        openRate(campaign),







                      )}{" "}







                      opens ·{" "}







                      {formatPercent(







                        clickRate(campaign),







                      )}{" "}







                      clicks







                    </small>







                  </div>















                  <strong>







                    {formatCurrency(







                      campaign.stats.revenue,







                    )}







                  </strong>







                </li>







              ))}







            </ol>







          )}







        </Panel>















        <Panel title="Recent activity">







          {dash.loading ||







          !dash.data ? (







            <Skeleton height={180} />







          ) : (







            <ul className="fm-activity">







              {(Array.isArray(dash.data.activity) ? dash.data.activity : []).map(







                (activity) => (







                  <li key={activity.id}>







                    <span







                      className={`fm-activity__icon is-${activity.icon}`}







                    >







                      <Icon







                        name={







                          ACTIVITY_ICONS[







                            activity.icon







                          ]







                        }







                        size={14}







                      />







                    </span>















                    <div>







                      <p>







                        {activity.text}







                      </p>















                      <time







                        dateTime={







                          activity.at







                        }







                      >







                        {timeAgo(







                          activity.at,







                        )}







                      </time>







                    </div>







                  </li>







                ),







              )}







            </ul>







          )}







        </Panel>















        <Panel







          title="Audience growth"







          actions={







            isMock ? (







              <span







                className="fm-badge"







                aria-label="Demo data"







              >







                Demo data







              </span>







            ) : undefined







          }







        >







          {audiences.loading ||







          !audiences.data ? (







            <Skeleton height={180} />







          ) : (







            <>







              <p className="fm-bigstat">







                {formatNumber(







                  totalAudienceContacts,







                )}















                <small>







                  contacts across{" "}







                  {







                    dashboardAudiences.length







                  }{" "}







                  audiences







                </small>







              </p>















              <BarList







                items={[







                  ...dashboardAudiences,







                ]







                  .sort(







                    (a, b) =>







                      b.growthPct -







                      a.growthPct,







                  )







                  .slice(0, 5)







                  .map((audience) => ({







                    label: `${audience.name} (+${audience.growthPct}%)`,







                    value:







                      audience.contactCount,







                  }))}







              />















              <Link







                to={to("audience")}







                className="fm-linkbtn"







              >







                Manage audience







              </Link>







            </>







          )}







        </Panel>







      </div>















      {actions.scheduleModal}







    </div>







  );







}
