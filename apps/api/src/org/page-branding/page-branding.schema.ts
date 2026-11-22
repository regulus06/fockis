/**
 * page-branding.schema.ts
 * -----------------------------------------------------------------------------
 * Per-page look of an organization: the sidebar thumbnail, the page banner
 * (desktop + mobile), an optional logo and the banner text.
 *
 * One document per (organizationId, pageKey, resourceId):
 *   pageKey     "members", "admin-events", "attendance"… (derived from the
 *               page's route, so new pages work without code changes)
 *   resourceId  "" for the page itself, or an id for one ministry / group /
 *               event page that has its own look.
 *
 * Three copies of the content are kept:
 *   draft      what the editor is working on (only editors see it)
 *   published  what everyone sees
 *   previous   the published version before the last publish/reset, so it
 *              can be restored
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/** One image with the crop that produced it (so it can be re-edited). */
export interface BrandImage {
  /** The cropped image that is shown. */
  url: string;
  /** The original upload, kept so the crop can be changed later. */
  sourceUrl?: string;
  /** Crop editor state: zoom ≥ 1, x/y offset as a fraction, rotation in degrees. */
  zoom?: number;
  x?: number;
  y?: number;
  rotate?: number;
  /** "1:1", "4:3", "16:9", "3:4", "3:1", "2:1"… */
  aspect?: string;
  /** "rounded" | "circle" | "square" */
  shape?: string;
}

export interface PageBrandingContent {
  thumbnail?: BrandImage | null;
  logo?: BrandImage | null;
  bannerDesktop?: BrandImage | null;
  bannerMobile?: BrandImage | null;
  /** Show the banner at the top of the page. */
  showBanner?: boolean;
  bannerHeight?: "small" | "medium" | "large";
  /** Where the banner text sits. */
  textAlign?: "left" | "center" | "right";
  overlayColor?: string;
  /** 0 … 0.9 */
  overlayOpacity?: number;
  title?: string;
  subtitle?: string;
  description?: string;
  /** Sidebar background (pageKey "sidebar-background"): image position, scaling, dark overlay on/off. */
  bgPosition?: "top" | "center" | "bottom";
  bgFit?: "cover" | "contain";
  overlay?: boolean;
  /** Dashboard theme (pageKey "dashboard-theme"): colors as #rrggbb. */
  theme?: { primary?: string; secondary?: string; button?: string; navActive?: string; sidebar?: string };
  /** Dashboard header banner appearance (pageKey "dashboard-theme"). */
  headerStyle?: "image" | "gradient" | "solid";
  showTagline?: boolean;
}

@Schema({ collection: "organization_page_branding", timestamps: true })
export class PageBranding {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 64 })
  pageKey: string;

  @Prop({ type: String, default: "", trim: true, maxlength: 64 })
  resourceId: string;

  @Prop({ type: Object, default: null })
  draft: PageBrandingContent | null;

  @Prop({ type: Object, default: null })
  published: PageBrandingContent | null;

  @Prop({ type: Object, default: null })
  previous: PageBrandingContent | null;

  @Prop({ type: Types.ObjectId, default: null })
  updatedBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  publishedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type PageBrandingDocument = HydratedDocument<PageBranding>;
export const PageBrandingSchema = SchemaFactory.createForClass(PageBranding);
PageBrandingSchema.index({ organizationId: 1, pageKey: 1, resourceId: 1 }, { unique: true });
