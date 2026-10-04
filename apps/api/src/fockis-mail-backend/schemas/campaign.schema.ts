import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

import {
  CampaignStatus,
  CampaignType,
} from '../enums/fockis-mail.enums';

export type CampaignDocument =
  HydratedDocument<Campaign>;

/**
 * Fockis Email Campaign
 *
 * Supports:
 * - Standard campaigns
 * - Newsletter campaigns
 * - Product promotions
 * - Events
 * - Welcome campaigns
 * - Abandoned cart
 * - Winback
 * - Transactional
 * - A/B tests
 * - EmailBuilder documents
 * - Audience / segment / tag targeting
 * - Fockis behavioral filters
 */
@Schema({
  timestamps: true,
  collection: 'fockis_mail_campaigns',
})
export class Campaign {
  /**
   * Campaign name shown in Fockis Marketing.
   */
  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  /**
   * Optional internal campaign description.
   */
  @Prop({
    default: '',
  })
  description: string;

  /**
   * Campaign type.
   */
  @Prop({
    required: true,
    enum: CampaignType,
    default: CampaignType.EMAIL,
  })
  type: CampaignType;

  /**
   * Campaign status.
   */
  @Prop({
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
    index: true,
  })
  status: CampaignStatus;

  /**
   * Sender information.
   */
  @Prop({
    default: '',
  })
  fromName: string;

  @Prop({
    default: '',
  })
  fromEmail: string;

  @Prop({
    default: '',
  })
  replyTo: string;

  /**
   * Email subject.
   */
  @Prop({
    default: '',
  })
  subject: string;

  /**
   * Inbox preview text.
   */
  @Prop({
    default: '',
  })
  previewText: string;

  /**
   * EmailBuilder document.
   *
   * This stores the complete visual email editor document.
   */
  @Prop({
    type: Object,
    default: null,
  })
  content: any;

  /**
   * Legacy HTML representation.
   *
   * Kept for compatibility with existing backend code.
   */
  @Prop({
    default: '',
  })
  html: string;

  /**
   * Legacy block representation.
   *
   * Kept for compatibility with existing templates/campaigns.
   */
  @Prop({
    type: [Object],
    default: [],
  })
  blocks: any[];

  /**
   * Primary audience selected by the composer.
   */
  @Prop({
    default: '',
  })
  audienceId: string;

  /**
   * Multiple audiences.
   */
  @Prop({
    type: [String],
    default: [],
  })
  audienceIds: string[];

  /**
   * Primary segment selected by the composer.
   */
  @Prop({
    default: '',
  })
  segmentId: string;

  /**
   * Multiple segments.
   */
  @Prop({
    type: [String],
    default: [],
  })
  segmentIds: string[];

  /**
   * Fockis Marketing tags.
   */
  @Prop({
    type: [String],
    default: [],
  })
  tagIds: string[];

  /**
   * Fockis behavioral/activity filters.
   *
   * The frontend currently stores these as filter values.
   * We keep this flexible so new behavior filters can be
   * added without breaking the schema.
   */
  @Prop({
    type: [Object],
    default: [],
  })
  fockisFilters: any[];

  /**
   * Resolved contacts.
   */
  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'Contact',
      },
    ],
    default: [],
  })
  recipients: Types.ObjectId[];

  /**
   * Campaign performance statistics.
   */
  @Prop({
    type: Object,
    default: {
      sent: 0,
      delivered: 0,
      opens: 0,
      clicks: 0,
      bounces: 0,
      unsubscribes: 0,
    },
  })
  stats: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    unsubscribes: number;
    [key: string]: any;
  };

  /**
   * Scheduled delivery time.
   */
  @Prop()
  scheduledAt?: Date;

  /**
   * Authenticated owner.
   */
  @Prop({
    required: true,
    index: true,
  })
  ownerId: Types.ObjectId;

  /**
   * Fockis Marketing workspace.
   */
  @Prop({
    required: true,
    index: true,
  })
  workspaceId: string;
}

export const CampaignSchema =
  SchemaFactory.createForClass(Campaign);

/**
 * Useful indexes.
 */
CampaignSchema.index({
  workspaceId: 1,
  createdAt: -1,
});

CampaignSchema.index({
  ownerId: 1,
  workspaceId: 1,
  status: 1,
});

CampaignSchema.index({
  workspaceId: 1,
  scheduledAt: 1,
});

CampaignSchema.index({
  workspaceId: 1,
  audienceIds: 1,
});

CampaignSchema.index({
  workspaceId: 1,
  segmentIds: 1,
});

CampaignSchema.index({
  workspaceId: 1,
  tagIds: 1,
});