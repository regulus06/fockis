/**
 * church-media.service.ts
 * -----------------------------------------------------------------------------
 * Documents & Media library of an organization.
 *
 *   list / get    filtered by who is asking:
 *                   - managers (owner, administrators, ManageMedia): everything,
 *                     drafts included
 *                   - active members: published "public" and "members" items
 *                   - everyone else: published "public" items only
 *   upload        stores a file under uploads/organization-media/<orgId>/ and
 *                 returns its URL (managers only)
 *   create        from an uploaded file or an external https link
 *   update        edit any field (managers only)
 *   remove        deletes the record and its uploaded files (managers only)
 *
 * Every query is filtered by the organization's ObjectId (data isolation).
 * -----------------------------------------------------------------------------
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { Model, Types } from "mongoose";

import { promises as fs } from "fs";
import { basename, join, resolve } from "path";

import {
  ChurchMedia,
  ChurchMediaDocument,
  ChurchMediaType,
  ChurchMediaVisibility,
} from "../schemas/church-media.schema";

import { CreateMediaDto } from "../dto/create-media.dto";
import { UpdateMediaDto } from "../dto/update-media.dto";

import { MembersService } from "../../members/services/members.service";
import { ChurchPermission } from "../../enums/permission.enum";
import { MembershipStatus } from "../../enums/membership-status.enum";

/* ============================================================================
   UPLOAD SETTINGS
   ========================================================================== */

export const MEDIA_UPLOAD_ROOT = resolve(process.cwd(), "uploads", "organization-media");
export const MEDIA_PUBLIC_PREFIX = "/uploads/organization-media";
export const MEDIA_MAX_BYTES = 500 * 1024 * 1024;

/**
 * Allowed upload types → stored extension and media type. Script-capable
 * formats (HTML, SVG, JS) are never accepted: uploads are served as files.
 */
export const MEDIA_UPLOAD_TYPES: Record<string, { ext: string; type: ChurchMediaType }> = {
  "image/jpeg": { ext: "jpg", type: ChurchMediaType.Photo },
  "image/png": { ext: "png", type: ChurchMediaType.Photo },
  "image/webp": { ext: "webp", type: ChurchMediaType.Photo },
  "image/gif": { ext: "gif", type: ChurchMediaType.Photo },
  "image/heic": { ext: "heic", type: ChurchMediaType.Photo },
  "video/mp4": { ext: "mp4", type: ChurchMediaType.Video },
  "video/webm": { ext: "webm", type: ChurchMediaType.Video },
  "video/quicktime": { ext: "mov", type: ChurchMediaType.Video },
  "audio/mpeg": { ext: "mp3", type: ChurchMediaType.Audio },
  "audio/mp4": { ext: "m4a", type: ChurchMediaType.Audio },
  "audio/x-m4a": { ext: "m4a", type: ChurchMediaType.Audio },
  "audio/wav": { ext: "wav", type: ChurchMediaType.Audio },
  "audio/x-wav": { ext: "wav", type: ChurchMediaType.Audio },
  "audio/ogg": { ext: "ogg", type: ChurchMediaType.Audio },
  "application/pdf": { ext: "pdf", type: ChurchMediaType.Document },
  "application/msword": { ext: "doc", type: ChurchMediaType.Document },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", type: ChurchMediaType.Document },
  "application/vnd.ms-powerpoint": { ext: "ppt", type: ChurchMediaType.Document },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { ext: "pptx", type: ChurchMediaType.Document },
  "application/vnd.ms-excel": { ext: "xls", type: ChurchMediaType.Document },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", type: ChurchMediaType.Document },
  "text/plain": { ext: "txt", type: ChurchMediaType.Document },
  "text/csv": { ext: "csv", type: ChurchMediaType.Document },
};

const STORED_NAME = /^[a-f0-9]{24}-[0-9]+-[a-f0-9]{8}\.[a-z0-9]{2,5}$/;

/* ============================================================================
   QUERY
   ========================================================================== */

export interface ListMediaQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  mediaType?: ChurchMediaType;
  category?: string;
  /** Managers only: "published" | "draft". */
  status?: string;
}

export interface UploadedMediaFile {
  path?: string;
  filename?: string;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

/* ============================================================================
   RESPONSE MAPPER
   ========================================================================== */

function toResponse(doc: ChurchMediaDocument) {
  return {
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    mediaType: doc.mediaType,
    category: doc.category ?? null,
    visibility: doc.visibility,
    title: doc.title,
    description: doc.description ?? "",
    thumbnailUrl: doc.thumbnailUrl ?? null,
    fileUrl: doc.fileUrl,
    fileName: doc.fileName ?? null,
    mimeType: doc.mimeType ?? null,
    fileSize: doc.fileSize ?? null,
    durationSeconds: doc.durationSeconds ?? null,
    speaker: doc.speaker ?? "",
    featured: Boolean(doc.featured),
    published: Boolean(doc.publishedAt),
    publishedAt: doc.publishedAt ?? null,
    createdAt: doc.createdAt ?? null,
    tags: doc.tags ?? [],
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Uploaded (local) or https link; never javascript:, data: or other schemes. */
function assertSafeUrl(value: string | undefined | null, field: string, organizationId: string): void {
  if (!value) return;
  const v = value.trim();
  if (v.startsWith(`${MEDIA_PUBLIC_PREFIX}/`)) {
    if (!v.startsWith(`${MEDIA_PUBLIC_PREFIX}/${organizationId}/`)) {
      throw new BadRequestException(`${field} must be a file uploaded to this organization.`);
    }
    return;
  }
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new BadRequestException(`${field} must be an uploaded file or a web link (https://…).`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new BadRequestException(`${field} must be a web link (https://…).`);
  }
}

/* ============================================================================
   SERVICE
   ========================================================================== */

@Injectable()
export class ChurchMediaService {
  constructor(
    @InjectModel(ChurchMedia.name)
    private readonly mediaModel: Model<ChurchMediaDocument>,

    private readonly membersService: MembersService,
  ) {}

  private oid(id: string, what: string): Types.ObjectId {
    if (!id || !Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${what}.`);
    return new Types.ObjectId(id);
  }

  /* ---------------------------------------------------------- access */

  async canManage(organizationId: string, userId?: string): Promise<boolean> {
    if (!userId || !Types.ObjectId.isValid(userId)) return false;
    if (await this.membersService.isAdmin(organizationId, userId)) return true;
    return this.membersService.hasPermission(organizationId, userId, ChurchPermission.ManageMedia);
  }

  private async requireManager(organizationId: string, userId: string) {
    if (!(await this.canManage(organizationId, userId))) {
      throw new ForbiddenException("Only administrators can manage media.");
    }
    return this.membersService.getMembershipOrNull(organizationId, userId);
  }

  private async viewerFilter(organizationId: string, userId?: string): Promise<{ manager: boolean; filter: Record<string, unknown> }> {
    if (await this.canManage(organizationId, userId)) return { manager: true, filter: {} };
    let member = false;
    if (userId && Types.ObjectId.isValid(userId)) {
      const m = await this.membersService.getMembershipOrNull(organizationId, userId);
      member = Boolean(m && m.status === MembershipStatus.Active);
    }
    return {
      manager: false,
      filter: {
        publishedAt: { $ne: null },
        visibility: { $in: member ? [ChurchMediaVisibility.Public, ChurchMediaVisibility.Members] : [ChurchMediaVisibility.Public] },
      },
    };
  }

  /* ------------------------------------------------------------ list */

  async listByOrganization(organizationId: string, query: ListMediaQuery, viewerUserId?: string) {
    const orgId = this.oid(organizationId, "organization ID");
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 24;

    const { manager, filter: access } = await this.viewerFilter(organizationId, viewerUserId);
    const filter: Record<string, unknown> = { organizationId: orgId, ...access };

    if (query.mediaType && (Object.values(ChurchMediaType) as string[]).includes(query.mediaType)) {
      filter.mediaType = query.mediaType;
    }
    if (query.category) filter.category = String(query.category).slice(0, 40);
    if (manager && query.status === "published") filter.publishedAt = { $ne: null };
    if (manager && query.status === "draft") filter.publishedAt = null;
    if (query.search?.trim()) {
      const rx = { $regex: escapeRegex(query.search.trim().slice(0, 100)), $options: "i" };
      filter.$or = [{ title: rx }, { description: rx }, { speaker: rx }, { tags: rx }];
    }

    const [docs, total] = await Promise.all([
      this.mediaModel
        .find(filter)
        .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.mediaModel.countDocuments(filter),
    ]);

    return {
      items: docs.map(toResponse),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      canManage: manager,
    };
  }

  async getById(organizationId: string, mediaId: string, viewerUserId?: string) {
    const { filter } = await this.viewerFilter(organizationId, viewerUserId);
    const doc = await this.mediaModel.findOne({
      _id: this.oid(mediaId, "media ID"),
      organizationId: this.oid(organizationId, "organization ID"),
      ...filter,
    });
    if (!doc) throw new NotFoundException("Media item not found.");
    return toResponse(doc);
  }

  /* ---------------------------------------------------------- upload */

  /**
   * Called after multer has written the file. Moves it from the temporary
   * folder into the organization's folder, or deletes it when the caller may
   * not upload.
   */
  async storeUpload(organizationId: string, userId: string, file?: UploadedMediaFile) {
    const orgId = this.oid(organizationId, "organization ID");
    try {
      await this.requireManager(organizationId, userId);
      if (!file?.path) throw new BadRequestException("Choose a file to upload.");
      const kind = MEDIA_UPLOAD_TYPES[String(file.mimetype ?? "").toLowerCase()];
      if (!kind) throw new BadRequestException("This file type is not supported.");

      const directory = join(MEDIA_UPLOAD_ROOT, String(orgId));
      await fs.mkdir(directory, { recursive: true });
      const name = basename(file.path);
      if (!STORED_NAME.test(name)) throw new BadRequestException("Invalid upload.");
      await fs.rename(file.path, join(directory, name));

      return {
        fileUrl: `${MEDIA_PUBLIC_PREFIX}/${String(orgId)}/${name}`,
        fileName: String(file.originalname ?? name).slice(0, 255),
        mimeType: file.mimetype ?? null,
        fileSize: file.size ?? null,
        mediaType: kind.type,
      };
    } catch (error) {
      if (file?.path) await fs.unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  private async deleteUploadedFile(organizationId: string, url?: string | null): Promise<void> {
    const prefix = `${MEDIA_PUBLIC_PREFIX}/${organizationId}/`;
    if (!url || !url.startsWith(prefix)) return;
    const name = url.slice(prefix.length);
    if (!STORED_NAME.test(name)) return;
    // Only remove the file if no other media item still uses it.
    const stillUsed = await this.mediaModel.exists({
      organizationId: new Types.ObjectId(organizationId),
      $or: [{ fileUrl: url }, { thumbnailUrl: url }],
    });
    if (stillUsed) return;
    await fs.unlink(join(MEDIA_UPLOAD_ROOT, organizationId, name)).catch(() => undefined);
  }

  /* ---------------------------------------------------------- create */

  async create(organizationId: string, dto: CreateMediaDto, actorUserId: string) {
    const orgId = this.oid(organizationId, "organization ID");
    const actor = await this.requireManager(organizationId, actorUserId);
    assertSafeUrl(dto.fileUrl, "The file", String(orgId));
    assertSafeUrl(dto.thumbnailUrl, "The thumbnail", String(orgId));

    const created = await this.mediaModel.create({
      organizationId: orgId,
      mediaType: dto.mediaType,
      category: dto.category ?? null,
      visibility: dto.visibility ?? ChurchMediaVisibility.Members,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      thumbnailUrl: dto.thumbnailUrl?.trim() || null,
      fileUrl: dto.fileUrl.trim(),
      fileName: dto.fileName ?? null,
      mimeType: dto.mimeType ?? null,
      fileSize: dto.fileSize ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      speaker: dto.speaker?.trim() || null,
      tags: (dto.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
      featured: Boolean(dto.featured),
      publishedAt: dto.published === false ? null : new Date(),
      uploadedByUserId: this.oid(actorUserId, "user ID"),
      uploadedByMembershipId: actor?._id ?? null,
    });

    return toResponse(created);
  }

  /* ---------------------------------------------------------- update */

  async update(organizationId: string, mediaId: string, dto: UpdateMediaDto, actorUserId: string) {
    await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, mediaId);
    assertSafeUrl(dto.fileUrl, "The file", organizationId);
    assertSafeUrl(dto.thumbnailUrl, "The thumbnail", organizationId);

    const oldFile = doc.fileUrl;
    const oldThumb = doc.thumbnailUrl ?? null;

    if (dto.title !== undefined) doc.title = dto.title.trim();
    if (dto.mediaType !== undefined) doc.mediaType = dto.mediaType;
    if (dto.category !== undefined) doc.category = dto.category;
    if (dto.visibility !== undefined) doc.visibility = dto.visibility;
    if (dto.description !== undefined) doc.description = dto.description.trim() || null;
    if (dto.thumbnailUrl !== undefined) doc.thumbnailUrl = dto.thumbnailUrl.trim() || null;
    if (dto.fileUrl !== undefined) {
      doc.fileUrl = dto.fileUrl.trim();
      doc.fileName = dto.fileName ?? null;
      doc.mimeType = dto.mimeType ?? null;
      doc.fileSize = dto.fileSize ?? null;
    }
    if (dto.durationSeconds !== undefined) doc.durationSeconds = dto.durationSeconds ?? null;
    if (dto.speaker !== undefined) doc.speaker = dto.speaker.trim() || null;
    if (dto.tags !== undefined) doc.tags = dto.tags.map((t) => t.trim()).filter(Boolean).slice(0, 20);
    if (dto.featured !== undefined) doc.featured = dto.featured;
    if (dto.published !== undefined) {
      if (dto.published && !doc.publishedAt) doc.publishedAt = new Date();
      if (!dto.published) doc.publishedAt = null;
    }

    await doc.save();

    if (oldFile !== doc.fileUrl) await this.deleteUploadedFile(organizationId, oldFile);
    if (oldThumb && oldThumb !== doc.thumbnailUrl) await this.deleteUploadedFile(organizationId, oldThumb);

    return toResponse(doc);
  }

  /* ---------------------------------------------------------- remove */

  async remove(organizationId: string, mediaId: string, actorUserId: string): Promise<void> {
    await this.requireManager(organizationId, actorUserId);
    const doc = await this.findOrThrow(organizationId, mediaId);
    const { fileUrl, thumbnailUrl } = doc;
    await this.mediaModel.deleteOne({ _id: doc._id, organizationId: doc.organizationId });
    await this.deleteUploadedFile(organizationId, fileUrl);
    await this.deleteUploadedFile(organizationId, thumbnailUrl ?? null);
  }

  /* ------------------------------------------- delete organization media */

  /** Used by OrganizationsService when an organization is deleted. */
  async deleteAllForOrganization(organizationId: string): Promise<void> {
    await this.mediaModel.deleteMany({ organizationId: this.oid(organizationId, "organization ID") });
    const directory = join(MEDIA_UPLOAD_ROOT, organizationId);
    if (Types.ObjectId.isValid(organizationId)) {
      await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /* ---------------------------------------------------------- helpers */

  private async findOrThrow(organizationId: string, mediaId: string): Promise<ChurchMediaDocument> {
    const doc = await this.mediaModel.findOne({
      _id: this.oid(mediaId, "media ID"),
      organizationId: this.oid(organizationId, "organization ID"),
    });
    if (!doc) throw new NotFoundException("Media item not found.");
    return doc;
  }
}
