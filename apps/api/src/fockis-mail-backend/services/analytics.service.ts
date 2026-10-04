import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Campaign,
  CampaignDocument,
} from '../schemas/campaign.schema';

import {
  Contact,
  ContactDocument,
} from '../schemas/contact.schema';

type DashboardRange = {
  preset?: string;
  from?: string;
  to?: string;
};

type TimeSeriesPoint = {
  label: string;
  value: number;
};

type ChartSeries = {
  name: string;
  points: TimeSeriesPoint[];
};

type AnalyticsMetric = {
  key: string;
  label: string;
  value: number;
  format: 'number' | 'percent' | 'currency';
  changePct: number;
  invert?: boolean;
  sparkline: number[];
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Campaign.name)
    private readonly campaigns: Model<CampaignDocument>,

    @InjectModel(Contact.name)
    private readonly contacts: Model<ContactDocument>,
  ) {}

  /**
   * --------------------------------------------------------------------------
   * Dashboard analytics
   * --------------------------------------------------------------------------
   *
   * Returns real MongoDB campaign/contact statistics for the authenticated
   * Fockis Mail workspace.
   *
   * The dashboard response matches the frontend DashboardSummary contract:
   * - metrics
   * - performance
   * - opens
   * - clicks
   * - revenue
   * - subscriberGrowth
   * - conversions
   * - activity
   * - recommendations
   *
   * No demo/mock marketing data is generated here.
   */
  async dashboard(
    ownerId: Types.ObjectId,
    workspaceId: string,
    range?: DashboardRange,
  ) {
    const dateFilter = this.buildDateFilter(range);

    const campaignFilter: Record<string, any> = {
      ownerId,
      workspaceId,
      ...dateFilter,
    };

    const [campaigns, contacts] = await Promise.all([
      this.campaigns
        .find(campaignFilter)
        .sort({ createdAt: -1, _id: -1 })
        .lean(),

      this.contacts.countDocuments({
        ownerId,
        workspaceId,
      }),
    ]);

    const totals = campaigns.reduce(
      (acc, campaign: any) => {
        const stats = campaign.stats ?? {};

        acc.sent += this.number(stats.sent ?? stats.recipients);
        acc.delivered += this.number(stats.delivered);
        acc.opens += this.number(
          stats.opens ?? stats.uniqueOpens,
        );
        acc.clicks += this.number(
          stats.clicks ?? stats.uniqueClicks,
        );
        acc.bounces += this.number(stats.bounces);
        acc.unsubscribes += this.number(stats.unsubscribes);
        acc.revenue += this.number(stats.revenue);
        acc.conversions += this.number(stats.conversions);

        return acc;
      },
      {
        sent: 0,
        delivered: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        unsubscribes: 0,
        revenue: 0,
        conversions: 0,
      },
    );

    const effectiveDelivered =
      totals.delivered || totals.sent;

    const openRate =
      effectiveDelivered > 0
        ? totals.opens / effectiveDelivered
        : 0;

    const clickRate =
      effectiveDelivered > 0
        ? totals.clicks / effectiveDelivered
        : 0;

    const bounceRate =
      totals.sent > 0
        ? totals.bounces / totals.sent
        : 0;

    const unsubscribeRate =
      effectiveDelivered > 0
        ? totals.unsubscribes / effectiveDelivered
        : 0;

    const conversionRate =
      effectiveDelivered > 0
        ? totals.conversions / effectiveDelivered
        : 0;

    const metrics: AnalyticsMetric[] = [
      {
        key: 'sent',
        label: 'Emails sent',
        value: totals.sent,
        format: 'number',
        changePct: 0,
        sparkline: [totals.sent],
      },
      {
        key: 'open_rate',
        label: 'Open rate',
        value: openRate,
        format: 'percent',
        changePct: 0,
        sparkline: [openRate],
      },
      {
        key: 'click_rate',
        label: 'Click rate',
        value: clickRate,
        format: 'percent',
        changePct: 0,
        sparkline: [clickRate],
      },
      {
        key: 'revenue',
        label: 'Revenue',
        value: totals.revenue,
        format: 'currency',
        changePct: 0,
        sparkline: [totals.revenue],
      },
      {
        key: 'subscribers',
        label: 'Subscribers',
        value: contacts,
        format: 'number',
        changePct: 0,
        sparkline: [contacts],
      },
      {
        key: 'conversions',
        label: 'Conversions',
        value: totals.conversions,
        format: 'number',
        changePct: 0,
        sparkline: [totals.conversions],
      },
    ];

    const performance: ChartSeries[] = [
      {
        name: 'Sent',
        points: [
          {
            label: 'Total',
            value: totals.sent,
          },
        ],
      },
      {
        name: 'Delivered',
        points: [
          {
            label: 'Total',
            value: totals.delivered,
          },
        ],
      },
    ];

    const opens: ChartSeries[] = [
      {
        name: 'Opens',
        points: [
          {
            label: 'Total',
            value: totals.opens,
          },
        ],
      },
    ];

    const clicks: ChartSeries[] = [
      {
        name: 'Clicks',
        points: [
          {
            label: 'Total',
            value: totals.clicks,
          },
        ],
      },
    ];

    const revenue: ChartSeries[] = [
      {
        name: 'Revenue',
        points: [
          {
            label: 'Total',
            value: totals.revenue,
          },
        ],
      },
    ];

    const subscriberGrowth: ChartSeries[] = [
      {
        name: 'Subscribers',
        points: [
          {
            label: 'Current',
            value: contacts,
          },
        ],
      },
    ];

    const conversions: ChartSeries[] = [
      {
        name: 'Conversions',
        points: [
          {
            label: 'Total',
            value: totals.conversions,
          },
        ],
      },
    ];

    const activity = campaigns
      .slice(0, 10)
      .map((campaign: any) => {
        const sent = this.number(
          campaign.stats?.sent ??
            campaign.stats?.recipients,
        );

        const createdAt =
          campaign.createdAt ??
          campaign.scheduledAt ??
          new Date();

        return {
          id: String(campaign._id),
          icon: 'send' as const,
          text:
            sent > 0
              ? `"${campaign.name}" sent ${sent} email${sent === 1 ? '' : 's'}.`
              : `"${campaign.name}" is ${String(campaign.status ?? 'draft').toLowerCase()}.`,
          at: new Date(createdAt).toISOString(),
        };
      });

    const recommendations = this.buildRecommendations({
      campaignsCount: campaigns.length,
      sent: totals.sent,
      delivered: totals.delivered,
      opens: totals.opens,
      clicks: totals.clicks,
      contacts,
      openRate,
      clickRate,
      bounceRate,
      unsubscribeRate,
    });

    return {
      metrics,
      performance,
      opens,
      clicks,
      revenue,
      subscriberGrowth,
      conversions,
      activity,
      recommendations,

      // Additional backend information retained for consumers
      // that use the richer dashboard response.
      contacts,
      campaigns: campaigns.length,
      totals,
      openRate,
      clickRate,
      bounceRate,
      unsubscribeRate,
      conversionRate,
      recentCampaigns: campaigns
        .slice(0, 10)
        .map((campaign: any) =>
          this.serializeCampaign(campaign),
        ),
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Campaign analytics
   * --------------------------------------------------------------------------
   */
  async campaign(
    ownerId: Types.ObjectId,
    workspaceId: string,
    id: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Campaign not found.',
      );
    }

    const campaign = await this.campaigns
      .findOne({
        _id: id,
        ownerId,
        workspaceId,
      })
      .lean();

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found.',
      );
    }

    const stats = campaign.stats ?? {};

    const sent = this.number(
      stats.sent ?? stats.recipients,
    );

    const delivered = this.number(
      stats.delivered,
    );

    const opens = this.number(
      stats.opens ?? stats.uniqueOpens,
    );

    const clicks = this.number(
      stats.clicks ?? stats.uniqueClicks,
    );

    const bounces = this.number(
      stats.bounces,
    );

    const unsubscribes = this.number(
      stats.unsubscribes,
    );

    const revenue = this.number(
      stats.revenue,
    );

    const conversions = this.number(
      stats.conversions,
    );

    const effectiveDelivered =
      delivered || sent;

    const openRate =
      effectiveDelivered > 0
        ? opens / effectiveDelivered
        : 0;

    const clickRate =
      effectiveDelivered > 0
        ? clicks / effectiveDelivered
        : 0;

    const bounceRate =
      sent > 0
        ? bounces / sent
        : 0;

    const unsubscribeRate =
      effectiveDelivered > 0
        ? unsubscribes / effectiveDelivered
        : 0;

    const conversionRate =
      effectiveDelivered > 0
        ? conversions / effectiveDelivered
        : 0;

    return {
      campaignId: String(campaign._id),
      campaignName: campaign.name,
      status: campaign.status,
      type: campaign.type,
      subject: campaign.subject,
      previewText: campaign.previewText,
      fromName: campaign.fromName,
      replyTo: campaign.replyTo,

      sentAt: campaign.scheduledAt
        ? new Date(campaign.scheduledAt).toISOString()
        : new Date(
            (campaign as any).createdAt ??
              Date.now(),
          ).toISOString(),

      stats: {
        ...stats,
        sent,
        delivered,
        opens,
        clicks,
        bounces,
        unsubscribes,
        revenue,
        conversions,
        recipients: this.number(
          stats.recipients ?? sent,
        ),
        uniqueOpens: this.number(
          stats.uniqueOpens ?? opens,
        ),
        uniqueClicks: this.number(
          stats.uniqueClicks ?? clicks,
        ),
        openRate,
        clickRate,
        bounceRate,
        unsubscribeRate,
        conversionRate,
      },

      opensOverTime: this.buildTimeSeries(
        opens,
      ),

      clicksOverTime: this.buildTimeSeries(
        clicks,
      ),

      revenueOverTime: this.buildRevenueSeries(
        revenue,
      ),

      devices: this.buildDevices(stats),
      locations: this.buildLocations(stats),
      links: this.buildLinks(stats),
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Date filtering
   * --------------------------------------------------------------------------
   *
   * Campaigns currently contain aggregate statistics. There is no separate
   * event/metric collection, so dashboard range filtering is applied to the
   * campaign creation timestamp. This is deliberately conservative rather
   * than pretending we have historical event-level analytics.
   */
  private buildDateFilter(
    range?: DashboardRange,
  ): Record<string, any> {
    const preset = range?.preset ?? '30d';

    let from: Date;
    let to: Date = new Date();

    if (
      preset === 'custom' &&
      range?.from &&
      range?.to
    ) {
      const parsedFrom = new Date(range.from);
      const parsedTo = new Date(range.to);

      if (
        !Number.isNaN(parsedFrom.getTime()) &&
        !Number.isNaN(parsedTo.getTime())
      ) {
        from = parsedFrom;
        to = parsedTo;
        to.setHours(23, 59, 59, 999);

        return {
          createdAt: {
            $gte: from,
            $lte: to,
          },
        };
      }
    }

    const days =
      preset === 'today'
        ? 1
        : preset === '7d'
          ? 7
          : preset === '90d'
            ? 90
            : 30;

    from = new Date();
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);

    return {
      createdAt: {
        $gte: from,
        $lte: to,
      },
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Recommendations
   * --------------------------------------------------------------------------
   *
   * Recommendations are derived only from real workspace data.
   */
  private buildRecommendations(input: {
    campaignsCount: number;
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    contacts: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  }) {
    const recommendations: Array<{
      id: string;
      title: string;
      body: string;
      actionLabel: string;
      actionPath: string;
    }> = [];

    if (input.campaignsCount === 0) {
      recommendations.push({
        id: 'create-first-campaign',
        title: 'Create your first campaign',
        body:
          'You do not have any campaigns in the selected period yet.',
        actionLabel: 'Create campaign',
        actionPath: '/marketing/campaigns/new',
      });

      if (input.contacts === 0) {
        recommendations.push({
          id: 'add-audience',
          title: 'Add contacts',
          body:
            'Your FockisMail workspace does not have any contacts yet.',
          actionLabel: 'Open audience',
          actionPath: '/marketing/audience',
        });
      }

      return recommendations;
    }

    if (input.sent === 0) {
      recommendations.push({
        id: 'send-campaign',
        title: 'Send a campaign',
        body:
          'Your workspace has campaigns, but none have recorded sends in this period.',
        actionLabel: 'View campaigns',
        actionPath: '/marketing/campaigns',
      });
    }

    if (
      input.sent > 0 &&
      input.openRate < 0.15
    ) {
      recommendations.push({
        id: 'improve-open-rate',
        title: 'Improve your open rate',
        body:
          'Your current open rate is below 15%. Consider testing a different subject line or sender name.',
        actionLabel: 'View campaigns',
        actionPath: '/marketing/campaigns',
      });
    }

    if (
      input.sent > 0 &&
      input.clickRate < 0.02
    ) {
      recommendations.push({
        id: 'improve-click-rate',
        title: 'Improve click engagement',
        body:
          'Your current click rate is below 2%. Consider testing stronger calls to action and clearer email content.',
        actionLabel: 'View campaigns',
        actionPath: '/marketing/campaigns',
      });
    }

    if (
      input.sent > 0 &&
      input.bounceRate > 0.05
    ) {
      recommendations.push({
        id: 'review-bounces',
        title: 'Review bounced addresses',
        body:
          'Your bounce rate is above 5%. Review your audience for invalid or outdated email addresses.',
        actionLabel: 'Review audience',
        actionPath: '/marketing/audience',
      });
    }

    if (input.contacts === 0) {
      recommendations.push({
        id: 'add-contacts',
        title: 'Add contacts',
        body:
          'Your workspace has no contacts available for future campaigns.',
        actionLabel: 'Open audience',
        actionPath: '/marketing/audience',
      });
    }

    return recommendations.slice(0, 4);
  }

  /**
   * --------------------------------------------------------------------------
   * Campaign serialization
   * --------------------------------------------------------------------------
   */
  private serializeCampaign(
    campaign: any,
  ) {
    if (!campaign) {
      return campaign;
    }

    return {
      ...campaign,
      id: String(campaign._id),
      audienceId:
        campaign.audienceId ||
        campaign.audienceIds?.[0] ||
        '',
      audienceIds:
        campaign.audienceIds || [],
      segmentId:
        campaign.segmentId ||
        campaign.segmentIds?.[0] ||
        '',
      segmentIds:
        campaign.segmentIds || [],
      tagIds:
        campaign.tagIds || [],
      fockisFilters:
        campaign.fockisFilters || [],
      content:
        campaign.content || null,
      html:
        campaign.html || '',
      blocks:
        campaign.blocks || [],
      recipients:
        campaign.recipients || [],
      stats: {
        sent: 0,
        delivered: 0,
        opens: 0,
        clicks: 0,
        bounces: 0,
        unsubscribes: 0,
        ...(campaign.stats || {}),
      },
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Time series
   * --------------------------------------------------------------------------
   */
  private buildTimeSeries(
    total: number,
  ): TimeSeriesPoint[] {
    return [
      {
        label: 'Total',
        value: total,
      },
    ];
  }

  /**
   * --------------------------------------------------------------------------
   * Revenue series
   * --------------------------------------------------------------------------
   */
  private buildRevenueSeries(
    revenue: number,
  ): TimeSeriesPoint[] {
    return [
      {
        label: 'Total',
        value: revenue,
      },
    ];
  }

  /**
   * --------------------------------------------------------------------------
   * Device analytics
   * --------------------------------------------------------------------------
   */
  private buildDevices(stats: any) {
    if (Array.isArray(stats?.devices)) {
      return stats.devices;
    }

    return [];
  }

  /**
   * --------------------------------------------------------------------------
   * Location analytics
   * --------------------------------------------------------------------------
   */
  private buildLocations(stats: any) {
    if (Array.isArray(stats?.locations)) {
      return stats.locations;
    }

    return [];
  }

  /**
   * --------------------------------------------------------------------------
   * Link analytics
   * --------------------------------------------------------------------------
   */
  private buildLinks(stats: any) {
    if (Array.isArray(stats?.links)) {
      return stats.links;
    }

    return [];
  }

  private number(value: unknown): number {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }
}
