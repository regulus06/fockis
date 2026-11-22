/**
 * Website Studio MongoDB schemas.
 * All collections are prefixed with "website_studio_" so they never collide
 * with existing Fockis collections (organizations, stores, shop, etc.).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

/* ------------------------------------------------------------------ */
/* CATEGORY                                                           */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_categories' })
export class WebsiteCategory {
  @Prop({ type: String, required: true, trim: true, maxlength: 80 }) name!: string;
  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true, trim: true, maxlength: 80 }) slug!: string;
  @Prop({ type: String, default: 'Other', maxlength: 80 }) group!: string;
  @Prop({ type: String, default: '', maxlength: 500 }) description!: string;
  @Prop({ type: String, default: 'LayoutGrid', maxlength: 40 }) icon!: string;
  @Prop({ type: String, default: '', maxlength: 2000 }) image!: string;
  @Prop({ type: Number, default: 0, index: true }) order!: number;
  @Prop({ type: String, enum: ['active', 'hidden'], default: 'active', index: true }) status!: 'active' | 'hidden';
  @Prop({ type: Types.ObjectId, default: null }) defaultTemplateId!: Types.ObjectId | null;
  @Prop({ type: Boolean, default: false }) isSeeded!: boolean;
}
export type WebsiteCategoryDocument = HydratedDocument<WebsiteCategory>;
export const WebsiteCategorySchema = SchemaFactory.createForClass(WebsiteCategory);

/* ------------------------------------------------------------------ */
/* TEMPLATE (master templates — never modified by customer websites)  */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_templates', minimize: false })
export class WebsiteTemplate {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 }) name!: string;
  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true, trim: true, maxlength: 80 }) slug!: string;
  @Prop({ type: [Types.ObjectId], default: [], index: true }) categoryIds!: Types.ObjectId[];
  @Prop({ type: String, default: '', maxlength: 1000 }) description!: string;
  @Prop({ type: String, default: '', maxlength: 2000 }) thumbnail!: string;
  @Prop({ type: [String], default: [] }) previewImages!: string[];
  @Prop({ type: [String], default: [] }) tags!: string[];
  /** Published master content. Customer websites receive a deep copy. */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) content!: Record<string, any>;
  /** Draft content edited by administrators in the visual editor. */
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) draftContent!: Record<string, any> | null;
  @Prop({ type: Number, default: 0 }) draftRevision!: number;
  @Prop({ type: Number, default: 1 }) version!: number;
  @Prop({ type: Boolean, default: false, index: true }) isOfficial!: boolean;
  @Prop({ type: [Types.ObjectId], default: [] }) defaultForCategoryIds!: Types.ObjectId[];
  @Prop({ type: Boolean, default: false, index: true }) isFeatured!: boolean;
  @Prop({ type: String, enum: ['free', 'premium'], default: 'free' }) accessLevel!: 'free' | 'premium';
  @Prop({ type: String, enum: ['public', 'private'], default: 'public', index: true }) visibility!: 'public' | 'private';
  @Prop({ type: String, enum: ['draft', 'published', 'unpublished'], default: 'published', index: true }) status!: 'draft' | 'published' | 'unpublished';
  @Prop({ type: Number, default: 0 }) seedVersion!: number;
  @Prop({ type: Boolean, default: false }) modifiedByAdmin!: boolean;
  @Prop({ type: Number, default: 0 }) order!: number;
}
export type WebsiteTemplateDocument = HydratedDocument<WebsiteTemplate>;
export const WebsiteTemplateSchema = SchemaFactory.createForClass(WebsiteTemplate);
WebsiteTemplateSchema.index({ status: 1, visibility: 1, isFeatured: -1, order: 1 });

/* ------------------------------------------------------------------ */
/* WEBSITE (customer-owned independent copy)                          */
/* ------------------------------------------------------------------ */
@Schema({ _id: false })
export class WebsiteManager {
  @Prop({ type: Types.ObjectId, required: true }) userId!: Types.ObjectId;
  @Prop({ type: String, enum: ['editor', 'admin'], default: 'editor' }) role!: 'editor' | 'admin';
  @Prop({ type: String, default: '' }) name!: string;
}
export const WebsiteManagerSchema = SchemaFactory.createForClass(WebsiteManager);

@Schema({ _id: false })
export class WebsiteCoupon {
  @Prop({ type: String, required: true, uppercase: true, trim: true, maxlength: 40 }) code!: string;
  @Prop({ type: String, enum: ['percent', 'fixed'], default: 'percent' }) type!: 'percent' | 'fixed';
  @Prop({ type: Number, required: true, min: 0 }) value!: number;
  @Prop({ type: Boolean, default: true }) active!: boolean;
  @Prop({ type: Number, default: 0 }) usageCount!: number;
}
export const WebsiteCouponSchema = SchemaFactory.createForClass(WebsiteCoupon);

@Schema({ timestamps: true, collection: 'website_studio_websites', minimize: false })
export class Website {
  @Prop({ type: Types.ObjectId, required: true, index: true }) ownerId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, default: null, index: true }) organizationId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null, index: true }) templateId!: Types.ObjectId | null;
  @Prop({ type: String, default: null }) templateSlug!: string | null;
  @Prop({ type: Number, default: null }) templateVersion!: number | null;
  @Prop({ type: Types.ObjectId, default: null, index: true }) categoryId!: Types.ObjectId | null;
  @Prop({ type: String, default: null }) categorySlug!: string | null;
  @Prop({ type: String, required: true, trim: true, maxlength: 120 }) name!: string;
  /** Public slug — also the Fockis subdomain: <slug>.fockis.com */
  @Prop({ type: String, required: true, unique: true, index: true, lowercase: true, trim: true, maxlength: 63 }) slug!: string;
  @Prop({ type: String, default: null, index: true }) domain!: string | null;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) settings!: Record<string, any>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) theme!: Record<string, any>;
  @Prop({ type: String, enum: ['draft', 'published', 'suspended'], default: 'draft', index: true }) status!: 'draft' | 'published' | 'suspended';
  @Prop({ type: String, default: null }) statusBeforeSuspension!: string | null;
  @Prop({ type: String, default: null }) suspendedReason!: string | null;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) draftContent!: Record<string, any>;
  @Prop({ type: Number, default: 1 }) draftRevision!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: null }) publishedContent!: Record<string, any> | null;
  @Prop({ type: Number, default: null }) publishedVersion!: number | null;
  @Prop({ type: Date, default: null }) publishedAt!: Date | null;
  @Prop({ type: Boolean, default: true }) hasUnpublishedChanges!: boolean;
  @Prop({ type: String, default: '' }) thumbnail!: string;
  @Prop({ type: [WebsiteManagerSchema], default: [] }) managers!: WebsiteManager[];
  @Prop({ type: [WebsiteCouponSchema], default: [] }) coupons!: WebsiteCoupon[];
  @Prop({ type: Number, default: 0 }) orderCounter!: number;
  @Prop({ type: Date, default: null, index: true }) deletedAt!: Date | null;
}
export type WebsiteDocument = HydratedDocument<Website>;
export const WebsiteSchema = SchemaFactory.createForClass(Website);
WebsiteSchema.index({ 'managers.userId': 1 });
WebsiteSchema.index({ ownerId: 1, updatedAt: -1 });

/* ------------------------------------------------------------------ */
/* VERSIONS                                                           */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'website_studio_versions', minimize: false })
export class WebsiteVersion {
  @Prop({ type: Types.ObjectId, required: true, index: true }) websiteId!: Types.ObjectId;
  @Prop({ type: Number, required: true }) versionNumber!: number;
  @Prop({ type: String, default: '', maxlength: 160 }) label!: string;
  @Prop({ type: String, default: 'manual' }) kind!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) contentSnapshot!: Record<string, any>;
  @Prop({ type: Types.ObjectId, default: null }) createdBy!: Types.ObjectId | null;
  @Prop({ type: String, default: '' }) createdByName!: string;
}
export type WebsiteVersionDocument = HydratedDocument<WebsiteVersion>;
export const WebsiteVersionSchema = SchemaFactory.createForClass(WebsiteVersion);
WebsiteVersionSchema.index({ websiteId: 1, versionNumber: -1 }, { unique: true });

/* ------------------------------------------------------------------ */
/* MEDIA ASSETS                                                       */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_assets' })
export class WebsiteAsset {
  @Prop({ type: Types.ObjectId, required: true, index: true }) websiteId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 2000 }) url!: string;
  @Prop({ type: String, default: '', maxlength: 255 }) filename!: string;
  @Prop({ type: String, default: '', maxlength: 100 }) fileType!: string;
  @Prop({ type: String, default: '', maxlength: 80, index: true }) folder!: string;
  @Prop({ type: String, default: '', maxlength: 300 }) alt!: string;
  @Prop({ type: Number, default: 0 }) size!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata!: Record<string, any>;
  @Prop({ type: Types.ObjectId, default: null }) uploadedBy!: Types.ObjectId | null;
}
export type WebsiteAssetDocument = HydratedDocument<WebsiteAsset>;
export const WebsiteAssetSchema = SchemaFactory.createForClass(WebsiteAsset);

/* ------------------------------------------------------------------ */
/* DOMAINS                                                            */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_domains' })
export class WebsiteDomain {
  @Prop({ type: Types.ObjectId, required: true, index: true }) websiteId!: Types.ObjectId;
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 253 }) domain!: string;
  @Prop({ type: String, required: true }) verificationToken!: string;
  @Prop({ type: String, enum: ['pending', 'verified', 'failed'], default: 'pending', index: true }) verificationStatus!: 'pending' | 'verified' | 'failed';
  @Prop({ type: String, enum: ['pending', 'active', 'unavailable'], default: 'pending' }) sslStatus!: 'pending' | 'active' | 'unavailable';
  @Prop({ type: Date, default: null }) lastCheckedAt!: Date | null;
  @Prop({ type: String, default: null }) lastError!: string | null;
  @Prop({ type: Boolean, default: false }) isPrimary!: boolean;
}
export type WebsiteDomainDocument = HydratedDocument<WebsiteDomain>;
export const WebsiteDomainSchema = SchemaFactory.createForClass(WebsiteDomain);

/* ------------------------------------------------------------------ */
/* ORDERS (paid through the existing Fockis UniversalPaymentService)  */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_orders', minimize: false })
export class WebsiteOrder {
  @Prop({ type: Types.ObjectId, required: true, index: true }) websiteId!: Types.ObjectId;
  @Prop({ type: String, required: true, index: true }) orderNumber!: string;
  @Prop({ type: Types.ObjectId, required: true, index: true }) customerUserId!: Types.ObjectId;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) items!: Record<string, any>[];
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) fulfillment!: Record<string, any>;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) customer!: Record<string, any>;
  @Prop({ type: Number, required: true }) subtotal!: number;
  @Prop({ type: Number, default: 0 }) discount!: number;
  @Prop({ type: Number, default: 0 }) shipping!: number;
  @Prop({ type: Number, default: 0 }) tax!: number;
  @Prop({ type: Number, required: true }) total!: number;
  @Prop({ type: String, default: 'USD' }) currency!: string;
  @Prop({ type: String, default: null }) couponCode!: string | null;
  @Prop({ type: String, default: '', maxlength: 1000 }) notes!: string;
  @Prop({ type: String, default: 'pending_payment', index: true }) status!: string;
  @Prop({ type: String, default: 'requires_payment' }) paymentStatus!: string;
  @Prop({ type: String, default: null, index: true }) paymentId!: string | null;
  @Prop({ type: String, default: null, index: true }) paymentIntentId!: string | null;
  @Prop({ type: Date, default: null }) paidAt!: Date | null;
  @Prop({ type: Boolean, default: false }) inventoryApplied!: boolean;
  @Prop({ type: String, default: '' }) trackingNumber!: string;
}
export type WebsiteOrderDocument = HydratedDocument<WebsiteOrder>;
export const WebsiteOrderSchema = SchemaFactory.createForClass(WebsiteOrder);
WebsiteOrderSchema.index({ websiteId: 1, createdAt: -1 });

/* ------------------------------------------------------------------ */
/* SUBMISSIONS: contact, leads, bookings, reservations, newsletter    */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_submissions', minimize: false })
export class WebsiteSubmission {
  @Prop({ type: Types.ObjectId, required: true, index: true }) websiteId!: Types.ObjectId;
  @Prop({ type: String, required: true, index: true }) type!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) data!: Record<string, any>;
  @Prop({ type: String, default: 'new', index: true }) status!: string;
  @Prop({ type: String, required: true }) confirmationCode!: string;
  @Prop({ type: Types.ObjectId, default: null, index: true }) userId!: Types.ObjectId | null;
  /** For bookings/reservations: YYYY-MM-DD for fast availability lookups. */
  @Prop({ type: String, default: null, index: true }) date!: string | null;
}
export type WebsiteSubmissionDocument = HydratedDocument<WebsiteSubmission>;
export const WebsiteSubmissionSchema = SchemaFactory.createForClass(WebsiteSubmission);
WebsiteSubmissionSchema.index({ websiteId: 1, type: 1, date: 1 });

/* ------------------------------------------------------------------ */
/* REPORTS (abuse reports for admin review)                           */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_reports' })
export class WebsiteReport {
  @Prop({ type: Types.ObjectId, required: true, index: true }) websiteId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 2000 }) reason!: string;
  @Prop({ type: String, default: 'open', index: true }) status!: 'open' | 'resolved';
  @Prop({ type: Types.ObjectId, default: null }) reporterUserId!: Types.ObjectId | null;
}
export type WebsiteReportDocument = HydratedDocument<WebsiteReport>;
export const WebsiteReportSchema = SchemaFactory.createForClass(WebsiteReport);

/* ------------------------------------------------------------------ */
/* USER-SAVED REUSABLE SECTIONS                                       */
/* ------------------------------------------------------------------ */
@Schema({ timestamps: true, collection: 'website_studio_saved_sections', minimize: false })
export class WebsiteSavedSection {
  @Prop({ type: Types.ObjectId, required: true, index: true }) userId!: Types.ObjectId;
  @Prop({ type: String, required: true, maxlength: 120 }) name!: string;
  @Prop({ type: MongooseSchema.Types.Mixed, required: true }) section!: Record<string, any>;
}
export type WebsiteSavedSectionDocument = HydratedDocument<WebsiteSavedSection>;
export const WebsiteSavedSectionSchema = SchemaFactory.createForClass(WebsiteSavedSection);

/* ------------------------------------------------------------------ */
/* DAILY ANALYTICS                                                    */
/* ------------------------------------------------------------------ */
@Schema({ collection: 'website_studio_analytics', minimize: false })
export class WebsiteAnalyticsDay {
  @Prop({ type: Types.ObjectId, required: true }) websiteId!: Types.ObjectId;
  @Prop({ type: String, required: true }) date!: string;
  @Prop({ type: Number, default: 0 }) views!: number;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) paths!: Record<string, number>;
}
export type WebsiteAnalyticsDayDocument = HydratedDocument<WebsiteAnalyticsDay>;
export const WebsiteAnalyticsDaySchema = SchemaFactory.createForClass(WebsiteAnalyticsDay);
WebsiteAnalyticsDaySchema.index({ websiteId: 1, date: 1 }, { unique: true });

/** Model names are namespaced so they can never collide with other Fockis modules. */
export const WS_MODEL = {
  category: 'WebsiteStudioCategory',
  template: 'WebsiteStudioTemplate',
  website: 'WebsiteStudioWebsite',
  version: 'WebsiteStudioVersion',
  asset: 'WebsiteStudioAsset',
  domain: 'WebsiteStudioDomain',
  order: 'WebsiteStudioOrder',
  submission: 'WebsiteStudioSubmission',
  report: 'WebsiteStudioReport',
  savedSection: 'WebsiteStudioSavedSection',
  analytics: 'WebsiteStudioAnalyticsDay',
} as const;

export const WEBSITE_STUDIO_MODELS = [
  { name: WS_MODEL.category, schema: WebsiteCategorySchema },
  { name: WS_MODEL.template, schema: WebsiteTemplateSchema },
  { name: WS_MODEL.website, schema: WebsiteSchema },
  { name: WS_MODEL.version, schema: WebsiteVersionSchema },
  { name: WS_MODEL.asset, schema: WebsiteAssetSchema },
  { name: WS_MODEL.domain, schema: WebsiteDomainSchema },
  { name: WS_MODEL.order, schema: WebsiteOrderSchema },
  { name: WS_MODEL.submission, schema: WebsiteSubmissionSchema },
  { name: WS_MODEL.report, schema: WebsiteReportSchema },
  { name: WS_MODEL.savedSection, schema: WebsiteSavedSectionSchema },
  { name: WS_MODEL.analytics, schema: WebsiteAnalyticsDaySchema },
];
