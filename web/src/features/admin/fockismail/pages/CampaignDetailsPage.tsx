import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import type { CSSProperties } from "react";

import { useCampaign } from "../hooks/useCampaigns";

import {
  useAudiences,
  useSegments,
  useTags,
} from "../hooks/useAudience";

import { useMarketingPath } from "../hooks/useMailchimp";

import { useCampaignActions } from "../components/useCampaignActions";
import { EmailBlock } from "../components/EmailBlock";

import {
  Badge,
  TagChip,
} from "../components/ui/Badge";

import {
  Button,
  LinkButton,
} from "../components/ui/Button";

import { ActionMenu } from "../components/ui/Menu";

import {
  PageHeader,
  Panel,
  Stat,
  StatStrip,
} from "../components/ui/Layout";

import {
  EmptyState,
  Skeleton,
} from "../components/ui/Feedback";

import { Icon } from "../components/ui/Icon";

import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_TONES,
  CAMPAIGN_TYPE_LABELS,
  FOCKIS_BEHAVIOR_LABELS,
} from "../utils/labels";

import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  rate,
} from "../utils/format";

/**
 * Local campaign shape used by this page.
 *
 * This intentionally does not depend on TypeScript inference from
 * useCampaign(). The API/backend contract remains unchanged.
 */
type CampaignPageData = {
  id: string;
  businessId?: string;

  name: string;
  description?: string;

  subject: string;
  previewText?: string;

  fromName: string;
  fromEmail: string;
  replyTo: string;

  type: string;
  status: string;

  audienceId?: string;
  segmentId?: string;

  tagIds: string[];

  fockisFilters?: string[];

  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;

  stats: {
    recipients: number;
    delivered: number;
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
    bounces: number;
    unsubscribes: number;
    spamComplaints: number;
    conversions: number;
    revenue: number;
    [key: string]: number;
  };

  content?: {
    contentWidth?: number | string;
    background?: string;
    blocks?: any[];
    [key: string]: any;
  };

  [key: string]: any;
};

type CampaignHookState = {
  data: CampaignPageData | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
};

/**
 * Explicit lookup types prevent useAudiences(), useSegments(), and
 * useTags() from producing `never` during Array.find() inference.
 *
 * These are frontend-only types and do not change the API contract.
 */
type AudienceLookup = {
  id: string;
  name: string;
  contactCount?: number;
};

type SegmentLookup = {
  id: string;
  name: string;
};

type TagLookup = {
  id: string;
  name: string;
  color: string;
};

export default function CampaignDetailsPage() {
  const { id } =
    useParams<{ id: string }>();

  const to =
    useMarketingPath();

  const navigate =
    useNavigate();

  const isNewCampaign =
    id === "new";

  /*
   * Keep the hook unconditional.
   *
   * The result is explicitly normalized to CampaignHookState so
   * TypeScript cannot infer the campaign as never.
   */
  const campaign =
    useCampaign(
      isNewCampaign
        ? undefined
        : id,
    ) as unknown as CampaignHookState;

  const audiences =
    useAudiences();

  const segments =
    useSegments();

  const tags =
    useTags();

  /*
   * Keep this hook unconditional.
   */
  const actions =
    useCampaignActions(
      () => {
        campaign.reload();
      },
    ) as any;

  /*
   * "new" is a frontend route, not a database campaign ID.
   */
  if (isNewCampaign) {
    return (
      <Navigate
        to={to("compose")}
        replace
      />
    );
  }

  /*
   * Error state.
   */
  if (campaign.error) {
    return (
      <div className="fm-page">
        <EmptyState
          icon="send"
          title="Campaign not found"
          body={campaign.error}
          action={
            <LinkButton
              to={to("campaigns")}
            >
              Back to campaigns
            </LinkButton>
          }
        />
      </div>
    );
  }

  /*
   * Loading state.
   */
  if (
    campaign.loading ||
    !campaign.data
  ) {
    return (
      <div className="fm-page">
        <Skeleton
          width={320}
          height={30}
        />

        <Skeleton
          height={90}
          className="fm-mt-16"
        />

        <Skeleton
          height={320}
          className="fm-mt-16"
        />
      </div>
    );
  }

  /*
   * Explicitly normalize the campaign object.
   */
  const c: CampaignPageData =
    campaign.data;

  const st =
    c.stats;

  const sent =
    st.delivered > 0;

  /*
   * Normalize lookup collections before calling .find().
   *
   * This prevents TypeScript from inferring the callback parameter
   * as `never`.
   */
  const audienceList =
    (audiences.data ?? []) as AudienceLookup[];

  const segmentList =
    (segments.data ?? []) as SegmentLookup[];

  const tagList =
    (tags.data ?? []) as TagLookup[];

  const audience =
    audienceList.find(
      (a) =>
        a.id === c.audienceId,
    );

  const segment =
    segmentList.find(
      (s) =>
        s.id === c.segmentId,
    );

  const editable =
    c.status === "draft" ||
    c.status === "scheduled" ||
    c.status === "paused";

  /*
   * Build the custom CSS variable separately.
   */
  const emailCanvasStyle =
    {
      maxWidth:
        c.content?.contentWidth,
      "--eb-bg":
        c.content?.background,
    } as CSSProperties & {
      "--eb-bg"?: string;
    };

  /*
   * Resolve action items through an `any` boundary.
   *
   * This is intentional because the current useCampaignActions
   * type is producing the remaining `never` inference.
   */
  const campaignActionItems =
    actions.itemsFor(c as any);

  return (
    <div className="fm-page">
      <nav
        className="fm-breadcrumb"
        aria-label="Breadcrumb"
      >
        <Link
          to={to("campaigns")}
        >
          Campaigns
        </Link>

        <Icon
          name="chevronRight"
          size={14}
        />

        <span aria-current="page">
          {c.name}
        </span>
      </nav>

      <PageHeader
        title={c.name}
        description={
          c.description ||
          undefined
        }
        actions={
          <>
            {editable && (
              <LinkButton
                to={to(
                  `compose?campaign=${c.id}`,
                )}
                icon="edit"
              >
                Edit
              </LinkButton>
            )}

            {sent && (
              <LinkButton
                to={to(
                  `reports?campaign=${c.id}`,
                )}
                variant="primary"
                icon="report"
              >
                View report
              </LinkButton>
            )}

            <ActionMenu
              items={campaignActionItems.filter(
                (item: any) =>
                  item.label !==
                    "Open" &&
                  item.label !==
                    "Edit" &&
                  item.label !==
                    "View report",
              )}
              label="More campaign actions"
            />
          </>
        }
      >
        <div className="fm-row fm-row--wrap fm-mt-8">
          <Badge
            tone={
              CAMPAIGN_STATUS_TONES[
                c.status as keyof typeof CAMPAIGN_STATUS_TONES
              ]
            }
            dot
          >
            {
              CAMPAIGN_STATUS_LABELS[
                c.status as keyof typeof CAMPAIGN_STATUS_LABELS
              ]
            }
          </Badge>

          <Badge>
            {
              CAMPAIGN_TYPE_LABELS[
                c.type as keyof typeof CAMPAIGN_TYPE_LABELS
              ]
            }
          </Badge>

          {c.scheduledAt &&
            c.status ===
              "scheduled" && (
              <span className="fm-muted fm-small">
                Sends{" "}
                {formatDateTime(
                  c.scheduledAt,
                )}
              </span>
            )}

          {c.sentAt && (
            <span className="fm-muted fm-small">
              Sent{" "}
              {formatDateTime(
                c.sentAt,
              )}
            </span>
          )}
        </div>
      </PageHeader>

      {sent && (
        <StatStrip>
          <Stat
            label="Recipients"
            value={formatNumber(
              st.recipients,
            )}
            sub={`${formatPercent(
              rate(
                st.delivered,
                st.recipients,
              ),
            )} delivered`}
          />

          <Stat
            label="Open rate"
            value={formatPercent(
              rate(
                st.uniqueOpens,
                st.delivered,
              ),
            )}
            sub={`${formatNumber(
              st.uniqueOpens,
            )} unique opens`}
          />

          <Stat
            label="Click rate"
            value={formatPercent(
              rate(
                st.uniqueClicks,
                st.delivered,
              ),
            )}
            sub={`${formatNumber(
              st.uniqueClicks,
            )} unique clicks`}
          />

          <Stat
            label="Unsubscribes"
            value={formatNumber(
              st.unsubscribes,
            )}
            sub={formatPercent(
              rate(
                st.unsubscribes,
                st.delivered,
              ),
              2,
            )}
          />

          <Stat
            label="Revenue"
            value={formatCurrency(
              st.revenue,
            )}
            sub={`${formatNumber(
              st.conversions,
            )} orders`}
          />
        </StatStrip>
      )}

      <div className="fm-grid fm-grid--main">
        <Panel
          title="Email content"
          className="fm-span-2"
          actions={
            editable ? (
              <Button
                size="sm"
                icon="edit"
                onClick={() =>
                  navigate(
                    to(
                      `compose?campaign=${c.id}&step=design`,
                    ),
                  )
                }
              >
                Edit design
              </Button>
            ) : undefined
          }
        >
          <div className="fm-inbox-preview">
            <div className="fm-inbox-preview__head">
              <strong>
                {c.fromName}
              </strong>{" "}
              <span className="fm-muted">
                &lt;
                {c.fromEmail}
                &gt;
              </span>

              <p>
                {c.subject}
              </p>

              {c.previewText && (
                <small>
                  {c.previewText}
                </small>
              )}
            </div>

            {c.content?.blocks
              ?.length ? (
              <div
                className="fm-eb-canvas is-static"
                style={
                  emailCanvasStyle
                }
              >
                {c.content.blocks.map(
                  (block: any) => (
                    <EmailBlock
                      key={block.id}
                      block={block}
                    />
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                compact
                icon="layout"
                title="No saved design"
                body={
                  editable
                    ? "Open the builder to design this email."
                    : "This campaign was sent from HTML or an older editor."
                }
              />
            )}
          </div>
        </Panel>

        <Panel title="Setup">
          <dl className="fm-deflist">
            <div>
              <dt>From</dt>
              <dd>
                {c.fromName} &lt;
                {c.fromEmail}
                &gt;
              </dd>
            </div>

            <div>
              <dt>Reply-to</dt>
              <dd>
                {c.replyTo}
              </dd>
            </div>

            <div>
              <dt>Subject</dt>
              <dd>
                {c.subject}
              </dd>
            </div>

            <div>
              <dt>Preview text</dt>
              <dd>
                {c.previewText ||
                  "—"}
              </dd>
            </div>

            <div>
              <dt>Audience</dt>
              <dd>
                {audience
                  ? `${audience.name} (${formatNumber(
                      audience.contactCount ?? 0,
                    )})`
                  : "—"}
              </dd>
            </div>

            <div>
              <dt>Segment</dt>
              <dd>
                {segment?.name ??
                  "Entire audience"}
              </dd>
            </div>

            <div>
              <dt>Tags</dt>

              <dd className="fm-row fm-row--wrap">
                {c.tagIds.length ? (
                  c.tagIds.map(
                    (tagId) => {
                      const tag =
                        tagList.find(
                          (item) =>
                            item.id ===
                            tagId,
                        );

                      return tag ? (
                        <TagChip
                          key={tagId}
                          name={
                            tag.name
                          }
                          color={
                            tag.color ||
                            "#64748b"
                          }
                        />
                      ) : null;
                    },
                  )
                ) : (
                  "—"
                )}
              </dd>
            </div>

            <div>
              <dt>
                Fockis filters
              </dt>

              <dd>
                {c.fockisFilters
                  ?.length
                  ? c.fockisFilters
                      .map(
                        (filter) =>
                          FOCKIS_BEHAVIOR_LABELS[
                            filter as keyof typeof FOCKIS_BEHAVIOR_LABELS
                          ],
                      )
                      .join(", ")
                  : "None"}
              </dd>
            </div>

            <div>
              <dt>Created</dt>
              <dd>
                {formatDateTime(
                  c.createdAt,
                )}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      {actions.scheduleModal}
    </div>
  );
}