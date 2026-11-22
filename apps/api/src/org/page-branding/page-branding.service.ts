/**
 * page-branding.service.ts
 * -----------------------------------------------------------------------------
 * Draft → publish workflow for per-page thumbnails, banners and logos.
 *
 * Who may edit: the organization owner and members whose role grants
 * ChurchPermission.ManageSettings (the "Settings & Roles" permission).
 * Everyone (signed in or not) may read what is PUBLISHED.
 *
 * Images must be files this organization uploaded (the shared
 * /uploads/organization-media/<orgId>/ folder); outside links are refused so a
 * page can never be made to load an arbitrary remote image.
 * -----------------------------------------------------------------------------
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { promises as fs } from "fs";

import { MembersService } from "../members/services/members.service";
import { ChurchPermission } from "../enums/permission.enum";
import { ChurchMediaType } from "../media/schemas/church-media.schema";
import { ChurchMediaService, MEDIA_PUBLIC_PREFIX, type UploadedMediaFile } from "../media/services/church-media.service";
import {
  PageBranding,
  type BrandImage,
  type PageBrandingContent,
  type PageBrandingDocument,
} from "./page-branding.schema";

export type { BrandImage, PageBrandingContent } from "./page-branding.schema";

const PAGE_KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RESOURCE_ID = /^[A-Za-z0-9_-]{0,64}$/;
const RESERVED_KEYS = new Set(["manage", "upload"]);
const ASPECTS = new Set(["1:1", "4:3", "16:9", "3:4", "3:1", "2:1", "4:1", "free"]);
const SHAPES = new Set(["rounded", "circle", "square"]);
const HEIGHTS = new Set(["small", "medium", "large"]);
const ALIGNS = new Set(["left", "center", "right"]);
const COLOR = /^#[0-9a-f]{6}$/i;
const POSITIONS = new Set(["top", "center", "bottom"]);
const FITS = new Set(["cover", "contain"]);
const THEME_KEYS = ["primary", "secondary", "button", "navActive", "sidebar"] as const;
const HEADER_STYLES = new Set(["image", "gradient", "solid"]);
/** The organization dashboard sidebar background (Profile & Locations → Branding). */
export const SIDEBAR_BACKGROUND_KEY = "sidebar-background";
const SIDEBAR_IMAGE = /\.(jpg|png|webp)$/;
/** Keep in step with the upload filename rule in ChurchMediaService. */
const STORED_FILE = /^[a-f0-9]{24}-[0-9]+-[a-f0-9]{8}\.(jpg|png|webp|gif)$/;

/** Published config of one page, as the sidebar / banner needs it. */
export interface PublicPageBranding {
  pageKey: string;
  resourceId: string;
  content: PageBrandingContent;
  publishedAt: string | null;
}

/** What the editor needs for one page. */
export interface ManagedPageBranding {
  pageKey: string;
  resourceId: string;
  draft: PageBrandingContent | null;
  published: PageBrandingContent | null;
  hasPrevious: boolean;
  hasUnpublishedChanges: boolean;
  updatedAt: string | null;
  publishedAt: string | null;
}

export interface ManagePageBrandingResponse {
  canEdit: boolean;
  items: ManagedPageBranding[];
}

export interface BrandingUploadResult {
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
}

interface LeanBranding {
  _id: Types.ObjectId;
  pageKey: string;
  resourceId: string;
  draft: PageBrandingContent | null;
  published: PageBrandingContent | null;
  previous: PageBrandingContent | null;
  updatedAt?: Date;
  publishedAt: Date | null;
}

function iso(d?: Date | null): string | null {
  return d ? new Date(d).toISOString() : null;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function num(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n * 1000) / 1000));
}

function text(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  return t ? t.slice(0, max) : undefined;
}

@Injectable()
export class PageBrandingService {
  constructor(
    @InjectModel(PageBranding.name)
    private readonly brandingModel: Model<PageBrandingDocument>,
    private readonly membersService: MembersService,
    private readonly mediaService: ChurchMediaService,
  ) {}

  /* ------------------------------------------------------------ helpers */

  private orgOid(organizationId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(organizationId)) throw new BadRequestException("Invalid organization ID.");
    return new Types.ObjectId(organizationId);
  }

  private key(pageKey: string): string {
    const k = String(pageKey ?? "").trim().toLowerCase();
    if (!PAGE_KEY.test(k) || RESERVED_KEYS.has(k)) throw new BadRequestException("Invalid page.");
    return k;
  }

  private resource(resourceId?: string | null): string {
    const r = String(resourceId ?? "").trim();
    if (!RESOURCE_ID.test(r)) throw new BadRequestException("Invalid page resource.");
    return r;
  }

  async canEdit(organizationId: string, userId?: string): Promise<boolean> {
    if (!userId) return false;
    return this.membersService.hasPermission(organizationId, userId, ChurchPermission.ManageSettings);
  }

  private async requireEditor(organizationId: string, userId: string): Promise<void> {
    if (!(await this.canEdit(organizationId, userId))) {
      throw new ForbiddenException("Only administrators with the Settings & Roles permission can change page branding.");
    }
  }

  private image(orgId: string, raw: unknown, label: string): BrandImage | null {
    if (raw == null || raw === "") return null;
    if (typeof raw !== "object") throw new BadRequestException(`${label}: invalid image.`);
    const r = raw as Record<string, unknown>;
    const own = (u: unknown, required: boolean): string | undefined => {
      if (u == null || u === "") {
        if (required) throw new BadRequestException(`${label}: upload an image.`);
        return undefined;
      }
      const s = String(u).trim();
      const prefix = `${MEDIA_PUBLIC_PREFIX}/${orgId}/`;
      if (!s.startsWith(prefix) || !STORED_FILE.test(s.slice(prefix.length))) {
        throw new BadRequestException(`${label}: use an image uploaded to this organization.`);
      }
      return s;
    };
    const out: BrandImage = { url: own(r.url, true) as string };
    const source = own(r.sourceUrl, false);
    if (source) out.sourceUrl = source;
    out.zoom = num(r.zoom, 1, 8, 1);
    out.x = num(r.x, -1, 1, 0);
    out.y = num(r.y, -1, 1, 0);
    out.rotate = num(r.rotate, -360, 360, 0);
    const aspect = String(r.aspect ?? "");
    if (ASPECTS.has(aspect)) out.aspect = aspect;
    const shape = String(r.shape ?? "");
    if (SHAPES.has(shape)) out.shape = shape;
    return out;
  }

  /** Whitelist every field; anything unknown is dropped. */
  private clean(orgId: string, raw: Record<string, unknown> | undefined): PageBrandingContent {
    const r = raw ?? {};
    const out: PageBrandingContent = {
      thumbnail: this.image(orgId, r.thumbnail, "Thumbnail"),
      logo: this.image(orgId, r.logo, "Logo"),
      bannerDesktop: this.image(orgId, r.bannerDesktop, "Desktop banner"),
      bannerMobile: this.image(orgId, r.bannerMobile, "Mobile banner"),
      showBanner: r.showBanner === true,
      bannerHeight: HEIGHTS.has(String(r.bannerHeight)) ? (r.bannerHeight as PageBrandingContent["bannerHeight"]) : "medium",
      textAlign: ALIGNS.has(String(r.textAlign)) ? (r.textAlign as PageBrandingContent["textAlign"]) : "left",
      overlayColor: COLOR.test(String(r.overlayColor ?? "")) ? String(r.overlayColor) : "#000000",
      overlayOpacity: num(r.overlayOpacity, 0, 0.9, 0.35),
    };
    const title = text(r.title, 80);
    const subtitle = text(r.subtitle, 140);
    const description = text(r.description, 400);
    if (title) out.title = title;
    if (subtitle) out.subtitle = subtitle;
    if (description) out.description = description;
    if (POSITIONS.has(String(r.bgPosition))) out.bgPosition = r.bgPosition as PageBrandingContent["bgPosition"];
    if (FITS.has(String(r.bgFit))) out.bgFit = r.bgFit as PageBrandingContent["bgFit"];
    if (typeof r.overlay === "boolean") out.overlay = r.overlay;
    if (r.theme && typeof r.theme === "object") {
      const t = r.theme as Record<string, unknown>;
      const theme: NonNullable<PageBrandingContent["theme"]> = {};
      for (const key of THEME_KEYS) {
        const v = t[key];
        if (typeof v === "string" && COLOR.test(v)) theme[key] = v.toLowerCase();
      }
      if (Object.keys(theme).length) out.theme = theme;
    }
    if (HEADER_STYLES.has(String(r.headerStyle))) out.headerStyle = r.headerStyle as PageBrandingContent["headerStyle"];
    if (typeof r.showTagline === "boolean") out.showTagline = r.showTagline;
    return out;
  }

  private toManaged(d: LeanBranding): ManagedPageBranding {
    const draft = d.draft ?? d.published ?? null;
    return {
      pageKey: d.pageKey,
      resourceId: d.resourceId ?? "",
      draft,
      published: d.published ?? null,
      hasPrevious: Boolean(d.previous),
      hasUnpublishedChanges: !same(draft, d.published),
      updatedAt: iso(d.updatedAt),
      publishedAt: iso(d.publishedAt),
    };
  }

  private async findOne(orgId: Types.ObjectId, pageKey: string, resourceId: string): Promise<LeanBranding | null> {
    return (await this.brandingModel
      .findOne({ organizationId: orgId, pageKey, resourceId })
      .lean()
      .exec()) as unknown as LeanBranding | null;
  }

  /* ------------------------------------------------------------- reads */

  /** Everything published for the organization (public: no sign-in needed). */
  async listPublished(organizationId: string): Promise<{ items: PublicPageBranding[] }> {
    const orgId = this.orgOid(organizationId);
    const docs = (await this.brandingModel
      .find({ organizationId: orgId, published: { $ne: null } })
      .select({ pageKey: 1, resourceId: 1, published: 1, publishedAt: 1 })
      .lean()
      .exec()) as unknown as LeanBranding[];
    return {
      items: docs
        .filter((d) => d.published)
        .map((d) => ({
          pageKey: d.pageKey,
          resourceId: d.resourceId ?? "",
          content: d.published as PageBrandingContent,
          publishedAt: iso(d.publishedAt),
        })),
    };
  }

  /** Drafts + published for editors; non-editors get canEdit:false and nothing else. */
  async listManaged(organizationId: string, userId: string): Promise<ManagePageBrandingResponse> {
    const orgId = this.orgOid(organizationId);
    if (!(await this.canEdit(organizationId, userId))) return { canEdit: false, items: [] };
    const docs = (await this.brandingModel.find({ organizationId: orgId }).lean().exec()) as unknown as LeanBranding[];
    return { canEdit: true, items: docs.map((d) => this.toManaged(d)) };
  }

  /* ------------------------------------------------------------ writes */

  async saveDraft(organizationId: string, userId: string, pageKey: string, resourceId: string | undefined, content: Record<string, unknown> | undefined): Promise<ManagedPageBranding> {
    const orgId = this.orgOid(organizationId);
    await this.requireEditor(organizationId, userId);
    const k = this.key(pageKey);
    const r = this.resource(resourceId);
    const draft = this.clean(String(orgId), content);
    if (k === SIDEBAR_BACKGROUND_KEY) {
      const url = draft.bannerDesktop?.url;
      if (url && !SIDEBAR_IMAGE.test(url)) throw new BadRequestException("Sidebar background: use a JPG, PNG or WebP image.");
    }
    const doc = (await this.brandingModel
      .findOneAndUpdate(
        { organizationId: orgId, pageKey: k, resourceId: r },
        {
          $set: { draft, updatedBy: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null },
          $setOnInsert: { organizationId: orgId, pageKey: k, resourceId: r },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec()) as unknown as LeanBranding;
    return this.toManaged(doc);
  }

  /** Publish the draft (or `content`, which is saved as the draft first). */
  async publish(organizationId: string, userId: string, pageKey: string, resourceId: string | undefined, content?: Record<string, unknown>): Promise<ManagedPageBranding> {
    const orgId = this.orgOid(organizationId);
    await this.requireEditor(organizationId, userId);
    const k = this.key(pageKey);
    const r = this.resource(resourceId);
    if (content) await this.saveDraft(organizationId, userId, k, r, content);
    const current = await this.findOne(orgId, k, r);
    const draft = current?.draft;
    if (!current || !draft) throw new BadRequestException("There is nothing to publish yet.");
    const actor = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const doc = (await this.brandingModel
      .findOneAndUpdate(
        { _id: current._id },
        {
          $set: {
            published: draft,
            // Keep the version being replaced so it can be restored.
            previous: current.published && !same(current.published, draft) ? current.published : current.previous,
            publishedBy: actor,
            publishedAt: new Date(),
            updatedBy: actor,
          },
        },
        { new: true },
      )
      .lean()
      .exec()) as unknown as LeanBranding;
    return this.toManaged(doc);
  }

  /** Bring back the previously published version (it becomes live and the draft). */
  async restorePrevious(organizationId: string, userId: string, pageKey: string, resourceId?: string): Promise<ManagedPageBranding> {
    const orgId = this.orgOid(organizationId);
    await this.requireEditor(organizationId, userId);
    const k = this.key(pageKey);
    const r = this.resource(resourceId);
    const current = await this.findOne(orgId, k, r);
    if (!current?.previous) throw new NotFoundException("There is no earlier version to restore.");
    const actor = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const doc = (await this.brandingModel
      .findOneAndUpdate(
        { _id: current._id },
        {
          $set: {
            published: current.previous,
            draft: current.previous,
            previous: current.published ?? null,
            publishedBy: actor,
            publishedAt: new Date(),
            updatedBy: actor,
          },
        },
        { new: true },
      )
      .lean()
      .exec()) as unknown as LeanBranding;
    return this.toManaged(doc);
  }

  /** Throw away unpublished changes. */
  async discardDraft(organizationId: string, userId: string, pageKey: string, resourceId?: string): Promise<ManagedPageBranding | null> {
    const orgId = this.orgOid(organizationId);
    await this.requireEditor(organizationId, userId);
    const k = this.key(pageKey);
    const r = this.resource(resourceId);
    const current = await this.findOne(orgId, k, r);
    if (!current) return null;
    if (!current.published && !current.previous) {
      await this.brandingModel.deleteOne({ _id: current._id }).exec();
      return null;
    }
    const doc = (await this.brandingModel
      .findOneAndUpdate({ _id: current._id }, { $set: { draft: current.published ?? null } }, { new: true })
      .lean()
      .exec()) as unknown as LeanBranding;
    return this.toManaged(doc);
  }

  /** Back to the default icon / no banner. The live version is kept as "previous" so it can be restored. */
  async resetToDefault(organizationId: string, userId: string, pageKey: string, resourceId?: string): Promise<ManagedPageBranding | null> {
    const orgId = this.orgOid(organizationId);
    await this.requireEditor(organizationId, userId);
    const k = this.key(pageKey);
    const r = this.resource(resourceId);
    const current = await this.findOne(orgId, k, r);
    if (!current) return null;
    const actor = Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : null;
    const doc = (await this.brandingModel
      .findOneAndUpdate(
        { _id: current._id },
        {
          $set: {
            previous: current.published ?? current.previous ?? null,
            published: null,
            draft: null,
            publishedAt: null,
            updatedBy: actor,
          },
        },
        { new: true },
      )
      .lean()
      .exec()) as unknown as LeanBranding;
    return this.toManaged(doc);
  }

  /* ------------------------------------------------------------ upload */

  /** Store a branding image in the organization's shared upload folder. */
  async upload(organizationId: string, userId: string, file?: UploadedMediaFile): Promise<BrandingUploadResult> {
    try {
      this.orgOid(organizationId);
      await this.requireEditor(organizationId, userId);
    } catch (error) {
      if (file?.path) await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }
    const stored = await this.mediaService.storeAuthorizedUpload(organizationId, file, ChurchMediaType.Photo);
    return { fileUrl: stored.fileUrl, fileName: stored.fileName, mimeType: stored.mimeType, fileSize: stored.fileSize };
  }
}
