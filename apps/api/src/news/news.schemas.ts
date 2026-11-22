/**
 * news.schemas.ts — Fockis News & Media data model (collections news_*).
 *
 * A media outlet is its own record. It can be linked to an existing Fockis
 * organization the owner already has (organizationId) and to a Website Studio
 * website (websiteId) — nothing is duplicated. Articles are stored once; the
 * `distribution` block decides whether they also appear on central Fockis News.
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

/* ============================================================================
 * Vocabularies
 * ========================================================================== */

export const MEDIA_TYPES = [
  'online_newspaper',
  'news_journalism',
  'tv_channel',
  'radio_station',
  'digital_magazine',
  'media_entertainment',
  'podcast_network',
  'news_agency',
  'independent_journalism',
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const NEWS_CATEGORIES = [
  'politics',
  'business',
  'economy',
  'society',
  'education',
  'sports',
  'technology',
  'culture',
  'entertainment',
  'international',
  'local',
  'health',
  'opinion',
  'environment',
] as const;

export const NEWS_LANGUAGES = ['en', 'fr', 'ht', 'es'] as const;

export const MEDIA_ROLES = [
  'owner',
  'administrator',
  'editor_in_chief',
  'editor',
  'journalist',
  'reporter',
  'photographer',
  'video_producer',
  'advertising_manager',
] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];

/** Newsroom permissions. Defaults per role live in news-access.service.ts. */
export const MEDIA_PERMISSIONS = [
  'write_articles',
  'review_articles',
  'publish_articles',
  'manage_breaking',
  'manage_broadcast',
  'manage_media_library',
  'manage_team',
  'manage_requests',
  'view_confidential_tips',
  'manage_donations',
  'view_finance',
  'manage_ads',
  'manage_settings',
  'view_analytics',
  'moderate_comments',
] as const;
export type MediaPermission = (typeof MEDIA_PERMISSIONS)[number];

export const ARTICLE_STATUSES = ['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'scheduled', 'published', 'archived', 'rejected'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const FOLLOW_PREFS = ['breaking', 'articles', 'videos', 'liveTv', 'liveRadio', 'podcasts', 'announcements', 'dailyDigest'] as const;
export type FollowPref = (typeof FOLLOW_PREFS)[number];

export const REQUEST_TYPES = ['coverage', 'interview', 'news_tip', 'story', 'advertising', 'partnership', 'correction', 'general'] as const;
export const REQUEST_STATUSES = ['submitted', 'received', 'under_review', 'assigned', 'in_progress', 'more_info', 'completed', 'declined'] as const;

export const ITEM_KINDS = ['video', 'podcast', 'tv_program', 'radio_program'] as const;

/* ============================================================================
 * Outlet
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_outlets', minimize: false })
export class MediaOutlet {
  @Prop({ type: Types.ObjectId, required: true, index: true }) ownerUserId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null, index: true }) organizationId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null, index: true }) websiteId!: Types.ObjectId | null;
  @Prop({ type: String, required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 63 }) slug!: string;
  @Prop({ type: String, enum: MEDIA_TYPES, required: true, index: true }) mediaType!: MediaType;
  @Prop({ type: String, default: '' }) logoUrl!: string;
  @Prop({ type: String, default: '' }) coverUrl!: string;
  @Prop({ type: String, default: '', maxlength: 400 }) tagline!: string;
  @Prop({ type: String, default: '', maxlength: 6000 }) about!: string;
  @Prop({ type: String, default: '', index: true, maxlength: 80 }) country!: string;
  @Prop({ type: String, default: '', index: true, maxlength: 80 }) city!: string;
  @Prop({ type: String, default: '', maxlength: 300 }) address!: string;
  @Prop({ type: String, default: '', maxlength: 200 }) email!: string;
  @Prop({ type: String, default: '', maxlength: 40 }) phone!: string;
  @Prop({ type: String, default: 'en', index: true }) primaryLanguage!: string;
  @Prop({ type: [String], default: [] }) languages!: string[];
  @Prop({ type: Object, default: {} }) socials!: Record<string, string>;
  @Prop({ type: String, default: '' }) websiteUrl!: string;
  @Prop({ type: Number, default: null }) foundedYear!: number | null;
  /** Only Fockis staff can set this (verification process). */
  @Prop({ type: Boolean, default: false, index: true }) verified!: boolean;
  @Prop({ type: Date, default: null }) verifiedAt!: Date | null;
  @Prop({ type: String, enum: ['active', 'suspended'], default: 'active', index: true }) status!: 'active' | 'suspended';
  @Prop({ type: Number, default: 0, index: true }) followerCount!: number;
  @Prop({ type: Number, default: 0 }) articleCount!: number;
  @Prop({ type: Object, default: {} }) settings!: {
    commentsEnabled?: boolean;
    donationsEnabled?: boolean;
    requestsEnabled?: boolean;
    supportMessage?: string;
    currency?: string;
    seoTitle?: string;
    seoDescription?: string;
    allowIndexing?: boolean;
    rolePermissions?: Record<string, string[]>;
  };
  @Prop({ type: Object, default: {} }) live!: {
    tvStreamUrl?: string;
    tvLive?: boolean;
    tvTitle?: string;
    radioStreamUrl?: string;
    radioLive?: boolean;
    radioTitle?: string;
    liveStartedAt?: Date | null;
  };
  @Prop({ type: Date, default: null, index: true }) deletedAt!: Date | null;
}
export const MediaOutletSchema = SchemaFactory.createForClass(MediaOutlet);
MediaOutletSchema.index({ status: 1, followerCount: -1 });
MediaOutletSchema.index({ name: 'text', tagline: 'text', city: 'text' });

/* ============================================================================
 * Team
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_members' })
export class MediaMember {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: MEDIA_ROLES, required: true }) role!: MediaRole;
  @Prop({ type: String, default: '', maxlength: 120 }) displayName!: string;
  @Prop({ type: String, default: '', maxlength: 120 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 1000 }) bio!: string;
  @Prop({ type: String, default: '' }) avatarUrl!: string;
  @Prop({ type: Boolean, default: false }) showOnProfile!: boolean;
  @Prop({ type: String, enum: ['active', 'removed'], default: 'active', index: true }) status!: 'active' | 'removed';
}
export const MediaMemberSchema = SchemaFactory.createForClass(MediaMember);
MediaMemberSchema.index({ outletId: 1, userId: 1 }, { unique: true });

/* ============================================================================
 * Articles
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_articles', minimize: false })
export class NewsArticle {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) authorUserId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) authorName!: string;
  @Prop({ type: String, required: true, maxlength: 220 }) headline!: string;
  @Prop({ type: String, default: '', maxlength: 400 }) subtitle!: string;
  @Prop({ type: String, required: true, maxlength: 140 }) slug!: string;
  /** Sanitized HTML. */
  @Prop({ type: String, default: '' }) body!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) excerpt!: string;
  @Prop({ type: Object, default: null }) featuredImage!: { url: string; caption?: string; credit?: string } | null;
  @Prop({ type: [Object], default: [] }) gallery!: { url: string; caption?: string; credit?: string }[];
  @Prop({ type: String, default: '' }) videoUrl!: string;
  @Prop({ type: String, default: '' }) audioUrl!: string;
  @Prop({ type: [Object], default: [] }) sources!: { title: string; url?: string }[];
  @Prop({ type: String, default: 'local', index: true }) category!: string;
  @Prop({ type: [String], default: [], index: true }) tags!: string[];
  @Prop({ type: String, default: 'en', index: true }) language!: string;
  @Prop({ type: String, default: '', index: true }) country!: string;
  @Prop({ type: String, default: '', index: true }) city!: string;
  @Prop({ type: Object, default: {} }) seo!: { title?: string; description?: string; canonicalUrl?: string; shareImage?: string };
  @Prop({ type: String, enum: ARTICLE_STATUSES, default: 'draft', index: true }) status!: ArticleStatus;
  @Prop({ type: Boolean, default: false, index: true }) isBreaking!: boolean;
  @Prop({ type: Boolean, default: false }) featureRequested!: boolean;
  /** Set by Fockis News staff only. */
  @Prop({ type: Boolean, default: false, index: true }) featured!: boolean;
  @Prop({ type: Boolean, default: false }) sponsored!: boolean;
  @Prop({ type: Boolean, default: true }) commentsEnabled!: boolean;
  @Prop({ type: Object, default: { website: true, fockisNews: false } }) distribution!: { website: boolean; fockisNews: boolean; fockisNewsAt?: Date | null };
  @Prop({ type: Date, default: null, index: true }) publishedAt!: Date | null;
  @Prop({ type: Date, default: null, index: true }) fockisPublishedAt!: Date | null;
  @Prop({ type: Boolean, default: false }) notified!: boolean;
  @Prop({ type: Boolean, default: false }) aiAssisted!: boolean;
  @Prop({ type: Number, default: 1 }) readingMinutes!: number;
  @Prop({ type: Number, default: 0 }) views!: number;
  @Prop({ type: Number, default: 0 }) likes!: number;
  @Prop({ type: Number, default: 0 }) commentCount!: number;
  @Prop({ type: String, default: '', maxlength: 2000 }) reviewNote!: string;
  @Prop({ type: [Object], default: [] }) revisions!: { at: Date; byUserId: Types.ObjectId; byName: string; action: string; note?: string; headline?: string; bodyLength?: number }[];
  @Prop({ type: Date, default: null, index: true }) deletedAt!: Date | null;
}
export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);
NewsArticleSchema.index({ outletId: 1, slug: 1 }, { unique: true });
NewsArticleSchema.index({ status: 1, 'distribution.fockisNews': 1, fockisPublishedAt: -1 });
NewsArticleSchema.index({ outletId: 1, status: 1, publishedAt: -1 });
NewsArticleSchema.index({ headline: 'text', subtitle: 'text', tags: 'text' });

@Schema({ timestamps: true, collection: 'news_reactions' })
export class NewsReaction {
  @Prop({ type: Types.ObjectId, required: true, index: true }) articleId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: ['like', 'bookmark'], required: true }) kind!: 'like' | 'bookmark';
}
export const NewsReactionSchema = SchemaFactory.createForClass(NewsReaction);
NewsReactionSchema.index({ articleId: 1, userId: 1, kind: 1 }, { unique: true });

@Schema({ timestamps: true, collection: 'news_comments' })
export class NewsComment {
  @Prop({ type: Types.ObjectId, required: true, index: true }) articleId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, default: '' }) userName!: string;
  @Prop({ type: String, required: true, maxlength: 2000 }) body!: string;
  @Prop({ type: String, enum: ['visible', 'hidden'], default: 'visible', index: true }) status!: 'visible' | 'hidden';
}
export const NewsCommentSchema = SchemaFactory.createForClass(NewsComment);

/** One row per reader per article per day: unique readers without storing IPs. */
@Schema({ timestamps: false, collection: 'news_views' })
export class NewsView {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null, index: true }) articleId!: Types.ObjectId | null;
  @Prop({ type: String, required: true }) viewerKey!: string;
  @Prop({ type: String, required: true, index: true }) day!: string;
  @Prop({ type: String, default: '' }) country!: string;
  @Prop({ type: String, default: '' }) source!: string;
  @Prop({ type: String, default: '' }) language!: string;
}
export const NewsViewSchema = SchemaFactory.createForClass(NewsView);
NewsViewSchema.index({ articleId: 1, viewerKey: 1, day: 1 }, { unique: true });

/* ============================================================================
 * Following & notification preferences
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_follows' })
export class MediaFollow {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Boolean, default: false }) muted!: boolean;
  /** Following does NOT turn everything on: only breaking news by default. */
  @Prop({ type: Object, default: { breaking: true } }) prefs!: Partial<Record<FollowPref, boolean>>;
}
export const MediaFollowSchema = SchemaFactory.createForClass(MediaFollow);
MediaFollowSchema.index({ outletId: 1, userId: 1 }, { unique: true });

/* ============================================================================
 * Broadcast & media items
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_items', minimize: false })
export class MediaItem {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: String, enum: ITEM_KINDS, required: true, index: true }) kind!: (typeof ITEM_KINDS)[number];
  @Prop({ type: String, required: true, maxlength: 200 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 4000 }) description!: string;
  @Prop({ type: String, default: '' }) mediaUrl!: string;
  @Prop({ type: String, default: '' }) thumbnailUrl!: string;
  @Prop({ type: String, default: '' }) category!: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
  /** Podcast show / program name. */
  @Prop({ type: String, default: '', maxlength: 160 }) showName!: string;
  @Prop({ type: Number, default: null }) episodeNumber!: number | null;
  @Prop({ type: Number, default: null }) durationSec!: number | null;
  @Prop({ type: [String], default: [] }) presenters!: string[];
  /** Programs: weekly schedule. */
  @Prop({ type: Object, default: null }) schedule!: { days: number[]; startTime: string; endTime: string } | null;
  @Prop({ type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft', index: true }) status!: 'draft' | 'published' | 'scheduled';
  @Prop({ type: Date, default: null, index: true }) publishedAt!: Date | null;
  @Prop({ type: Boolean, default: false }) notified!: boolean;
  @Prop({ type: Number, default: 0 }) plays!: number;
  @Prop({ type: Types.ObjectId, default: null }) createdBy!: Types.ObjectId | null;
  @Prop({ type: Date, default: null, index: true }) deletedAt!: Date | null;
}
export const MediaItemSchema = SchemaFactory.createForClass(MediaItem);
MediaItemSchema.index({ outletId: 1, kind: 1, status: 1, publishedAt: -1 });

/* ============================================================================
 * Support: donations, pledges, campaigns
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_campaigns', minimize: false })
export class MediaCampaign {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 160 }) title!: string;
  @Prop({ type: String, default: '', maxlength: 5000 }) description!: string;
  @Prop({ type: String, default: '' }) coverUrl!: string;
  @Prop({ type: Number, required: true, min: 1 }) goal!: number;
  @Prop({ type: String, default: 'USD' }) currency!: string;
  @Prop({ type: String, default: '' }) deadline!: string;
  @Prop({ type: String, enum: ['draft', 'active', 'closed'], default: 'active', index: true }) status!: 'draft' | 'active' | 'closed';
  @Prop({ type: [Object], default: [] }) updates!: { at: Date; text: string; byName: string }[];
}
export const MediaCampaignSchema = SchemaFactory.createForClass(MediaCampaign);

@Schema({ timestamps: true, collection: 'news_donations' })
export class MediaDonation {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null, index: true }) campaignId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null, index: true }) pledgeId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) amount!: number;
  @Prop({ type: String, default: 'USD' }) currency!: string;
  @Prop({ type: String, enum: ['once', 'monthly', 'annual'], default: 'once' }) frequency!: 'once' | 'monthly' | 'annual';
  @Prop({ type: Boolean, default: false }) anonymous!: boolean;
  @Prop({ type: Boolean, default: false }) showName!: boolean;
  @Prop({ type: String, default: '', maxlength: 500 }) message!: string;
  @Prop({ type: String, default: '' }) donorName!: string;
  @Prop({ type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true }) status!: 'pending' | 'paid' | 'failed' | 'refunded';
  @Prop({ type: String, default: null }) paymentId!: string | null;
  @Prop({ type: String, default: null, index: true }) paymentIntentId!: string | null;
  @Prop({ type: Number, default: null }) chargedAmount!: number | null;
  @Prop({ type: String, default: null }) chargedCurrency!: string | null;
  @Prop({ type: String, default: '' }) receiptNumber!: string;
  @Prop({ type: Date, default: null, index: true }) paidAt!: Date | null;
  @Prop({ type: Date, default: null }) refundedAt!: Date | null;
}
export const MediaDonationSchema = SchemaFactory.createForClass(MediaDonation);
MediaDonationSchema.index({ outletId: 1, status: 1, paidAt: -1 });

/** Monthly / annual support: first gift charged now, renewal reminder each period. */
@Schema({ timestamps: true, collection: 'news_pledges' })
export class MediaPledge {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null }) campaignId!: Types.ObjectId | null;
  @Prop({ type: Number, required: true }) amount!: number;
  @Prop({ type: String, default: 'USD' }) currency!: string;
  @Prop({ type: String, enum: ['monthly', 'annual'], required: true }) frequency!: 'monthly' | 'annual';
  @Prop({ type: Boolean, default: false }) anonymous!: boolean;
  @Prop({ type: Boolean, default: false }) showName!: boolean;
  @Prop({ type: String, enum: ['pending', 'active', 'cancelled'], default: 'pending', index: true }) status!: 'pending' | 'active' | 'cancelled';
  @Prop({ type: Date, default: null, index: true }) nextDueAt!: Date | null;
  @Prop({ type: Date, default: null }) remindedAt!: Date | null;
  @Prop({ type: Number, default: 0 }) paymentsCount!: number;
}
export const MediaPledgeSchema = SchemaFactory.createForClass(MediaPledge);

/* ============================================================================
 * Requests (tips, coverage, interviews…)
 * ========================================================================== */

@Schema({ timestamps: true, collection: 'news_requests', minimize: false })
export class MediaRequest {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true }) reference!: string;
  @Prop({ type: String, enum: REQUEST_TYPES, required: true, index: true }) type!: (typeof REQUEST_TYPES)[number];
  @Prop({ type: String, required: true, maxlength: 200 }) subject!: string;
  @Prop({ type: String, required: true, maxlength: 8000 }) description!: string;
  @Prop({ type: String, default: '', maxlength: 120 }) contactName!: string;
  @Prop({ type: String, default: '', maxlength: 200 }) email!: string;
  @Prop({ type: String, default: '', maxlength: 40 }) phone!: string;
  @Prop({ type: String, default: '', maxlength: 200 }) location!: string;
  @Prop({ type: [String], default: [] }) attachments!: string[];
  @Prop({ type: Boolean, default: false }) confidential!: boolean;
  @Prop({ type: Boolean, default: false }) anonymous!: boolean;
  @Prop({ type: Types.ObjectId, default: null, index: true }) submitterUserId!: Types.ObjectId | null;
  /** sha256 of the tracking code given to the submitter. */
  @Prop({ type: String, required: true }) trackingHash!: string;
  @Prop({ type: String, enum: REQUEST_STATUSES, default: 'submitted', index: true }) status!: (typeof REQUEST_STATUSES)[number];
  @Prop({ type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' }) priority!: 'low' | 'normal' | 'high' | 'urgent';
  @Prop({ type: Types.ObjectId, default: null }) assigneeUserId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) assigneeName!: string;
  /** Staff only — never returned to the submitter. */
  @Prop({ type: [Object], default: [] }) internalNotes!: { at: Date; byName: string; text: string }[];
  @Prop({ type: [Object], default: [] }) messages!: { at: Date; from: 'staff' | 'submitter'; byName: string; text: string }[];
  @Prop({ type: [Object], default: [] }) history!: { at: Date; byName: string; action: string }[];
}
export const MediaRequestSchema = SchemaFactory.createForClass(MediaRequest);
MediaRequestSchema.index({ outletId: 1, status: 1, createdAt: -1 });

/* ============================================================================
 * Audit
 * ========================================================================== */

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'news_audit' })
export class MediaAudit {
  @Prop({ type: Types.ObjectId, required: true, index: true }) outletId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null }) actorUserId!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) actorName!: string;
  @Prop({ type: String, required: true }) action!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) detail!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) meta!: unknown;
}
export const MediaAuditSchema = SchemaFactory.createForClass(MediaAudit);

export const NEWS_MODEL = {
  outlet: 'NewsMediaOutlet',
  member: 'NewsMediaMember',
  article: 'NewsArticle',
  reaction: 'NewsReaction',
  comment: 'NewsComment',
  view: 'NewsView',
  follow: 'NewsMediaFollow',
  item: 'NewsMediaItem',
  campaign: 'NewsMediaCampaign',
  donation: 'NewsMediaDonation',
  pledge: 'NewsMediaPledge',
  request: 'NewsMediaRequest',
  audit: 'NewsMediaAudit',
} as const;

export const NEWS_MODELS = [
  { name: NEWS_MODEL.outlet, schema: MediaOutletSchema },
  { name: NEWS_MODEL.member, schema: MediaMemberSchema },
  { name: NEWS_MODEL.article, schema: NewsArticleSchema },
  { name: NEWS_MODEL.reaction, schema: NewsReactionSchema },
  { name: NEWS_MODEL.comment, schema: NewsCommentSchema },
  { name: NEWS_MODEL.view, schema: NewsViewSchema },
  { name: NEWS_MODEL.follow, schema: MediaFollowSchema },
  { name: NEWS_MODEL.item, schema: MediaItemSchema },
  { name: NEWS_MODEL.campaign, schema: MediaCampaignSchema },
  { name: NEWS_MODEL.donation, schema: MediaDonationSchema },
  { name: NEWS_MODEL.pledge, schema: MediaPledgeSchema },
  { name: NEWS_MODEL.request, schema: MediaRequestSchema },
  { name: NEWS_MODEL.audit, schema: MediaAuditSchema },
];
