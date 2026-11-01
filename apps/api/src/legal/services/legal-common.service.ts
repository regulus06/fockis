import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Connection, Model, Types } from "mongoose";

import { NotificationsService } from "../../notifications/notifications.service";
import { CloudStorageService } from "../../uploads/cloud-storage.service";
import { LEGAL_DOC_MAX_BYTES, LEGAL_DOC_TYPES, LEGAL_NOTIFICATION_TYPE } from "../legal.constants";
import { LegalCounter, StoredFile } from "../schemas/legal.schemas";
import { createHash } from "crypto";

export interface LegalPerson {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export interface UploadedLegalFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function oid(id: string, label = "record"): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`That ${label} was not found.`);
  return new Types.ObjectId(id);
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Shared helpers for the legal module: references, people, files, staff notifications. */
@Injectable()
export class LegalCommonService {
  private readonly logger = new Logger(LegalCommonService.name);
  private staffCache: { at: number; ids: string[] } | null = null;

  constructor(
    @InjectModel(LegalCounter.name) private readonly counters: Model<LegalCounter>,
    @InjectConnection() private readonly connection: Connection,
    private readonly storage: CloudStorageService,
    private readonly notifications: NotificationsService,
  ) {}

  get users() {
    return this.connection.models["User"];
  }

  /** Sequential, human-friendly references: LH-2026-0001. */
  async nextNumber(prefix: string) {
    const year = new Date().getFullYear();
    const id = `${prefix}-${year}`;
    const doc: any = await this.counters.findOneAndUpdate({ _id: id }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean().exec();
    return `${id}-${String(doc?.seq ?? 1).padStart(4, "0")}`;
  }

  async people(ids: (string | null | undefined)[]) {
    const unique = Array.from(new Set(ids.map((id) => String(id ?? "")).filter((id) => Types.ObjectId.isValid(id))));
    if (!unique.length || !this.users) return new Map<string, any>();
    const rows = await this.users.find({ _id: { $in: unique.map((id) => new Types.ObjectId(id)) } }).select("username firstName lastName profilePicture role createdAt isActive").lean().exec();
    return new Map(rows.map((u: any) => [String(u._id), u]));
  }

  person(map: Map<string, any>, id: string | null | undefined): LegalPerson | null {
    if (!id) return null;
    const u = map.get(String(id));
    if (!u) return { id: String(id), username: "", name: id === "system" ? "System" : "", avatar: "" };
    return {
      id: String(u._id),
      username: u.username ?? "",
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
      avatar: u.profilePicture ?? "",
    };
  }

  /** Accept "@name", a username or an account ID; returns the account ID. */
  async resolveUser(value: string): Promise<{ id: string; username: string } | null> {
    const term = String(value ?? "").trim().replace(/^@/, "");
    if (!term || !this.users) return null;
    const query = Types.ObjectId.isValid(term) ? { _id: new Types.ObjectId(term) } : { username: new RegExp(`^${escapeRegex(term)}$`, "i") };
    const u: any = await this.users.findOne(query).select("username").lean().exec();
    return u ? { id: String(u._id), username: u.username ?? "" } : null;
  }

  /* ---------------- restricted files ---------------- */

  /** Stores a supporting document under legal/ (never served by the public media gateway). */
  async storeDocument(file: UploadedLegalFile | undefined, actorId: string, folder: string): Promise<StoredFile> {
    if (!file?.buffer?.length) throw new BadRequestException("Choose a file to upload.");
    const ext = LEGAL_DOC_TYPES[file.mimetype];
    if (!ext) throw new BadRequestException("Upload a PDF, PNG, JPG or text file.");
    if (file.size > LEGAL_DOC_MAX_BYTES) throw new BadRequestException("Documents can be up to 20 MB.");
    if (!this.looksLike(file.buffer, file.mimetype)) throw new BadRequestException("The file doesn't match its type.");
    const key = `legal/${folder}/${randomUUID()}${ext}`;
    await this.storage.uploadBuffer(file.buffer, key, file.mimetype);
    return {
      key,
      name: String(file.originalname ?? "document").slice(0, 200),
      mimeType: file.mimetype,
      size: file.size,
      sha256: createHash("sha256").update(file.buffer).digest("hex"),
      addedAt: new Date(),
      addedBy: actorId,
    };
  }

  private looksLike(buffer: Buffer, mime: string) {
    const head = buffer.subarray(0, 8);
    if (mime === "application/pdf") return head.subarray(0, 4).toString("latin1") === "%PDF";
    if (mime === "image/png") return head[0] === 0x89 && head.subarray(1, 4).toString("latin1") === "PNG";
    if (mime === "image/jpeg") return head[0] === 0xff && head[1] === 0xd8;
    if (mime === "text/plain") return !buffer.subarray(0, 4096).includes(0);
    return false;
  }

  /** Short-lived link (5 minutes) that downloads the file. */
  async link(file: StoredFile) {
    const url = await this.storage.getSignedUrl(file.key, {
      expiresInSeconds: 300,
      responseDisposition: `attachment; filename="${String(file.name || "file").replace(/["\r\n]/g, "")}"`,
    });
    return { url };
  }

  get cloud() {
    return this.storage;
  }

  /* ---------------- staff ---------------- */

  /** Super admins plus anyone whose custom admin role grants legal.view. */
  async legalStaffIds(): Promise<string[]> {
    if (this.staffCache && Date.now() - this.staffCache.at < 5 * 60_000) return this.staffCache.ids;
    if (!this.users) return [];
    const roleModel = this.connection.models["AdminRole"];
    const roleIds = roleModel ? (await roleModel.find({ isActive: true, permissions: "legal.view" }).select("_id").lean().exec()).map((r: any) => r._id) : [];
    const rows = await this.users
      .find({ $or: [{ role: "super_admin" }, { isSuperAdmin: true }, { permissions: "legal.view" }, ...(roleIds.length ? [{ adminRoleId: { $in: roleIds } }] : [])] })
      .select("_id")
      .limit(200)
      .lean()
      .exec();
    const ids = rows.map((u: any) => String(u._id));
    this.staffCache = { at: Date.now(), ids };
    return ids;
  }

  async staff() {
    const ids = await this.legalStaffIds();
    const people = await this.people(ids);
    return ids.map((id) => this.person(people, id)!).filter(Boolean);
  }

  /** Internal notification to compliance staff. Never sent to the users concerned. */
  async notifyStaff(title: string, message: string, link: string, entityId: string, entityType: string, exceptId?: string) {
    const ids = (await this.legalStaffIds()).filter((id) => id !== exceptId);
    await Promise.all(
      ids.map((recipientId) =>
        this.notifications
          .create({ recipientId, type: LEGAL_NOTIFICATION_TYPE, title, message, entityId, entityType, link } as any)
          .catch((error) => this.logger.warn(`Legal notification failed: ${String(error)}`)),
      ),
    );
  }
}
