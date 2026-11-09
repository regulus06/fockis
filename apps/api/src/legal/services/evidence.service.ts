import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { createHash } from "crypto";
import { createReadStream, promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Connection, Model, Types } from "mongoose";

import { ListEvidenceQueryDto, PreserveDto } from "../dto/legal.dto";
import { HASH_MAX_BYTES, PAGE_SIZE } from "../legal.constants";
import { EvidenceRecord, EvidenceRecordDocument, LegalHold, LegalHoldDocument, StoredFile } from "../schemas/legal.schemas";
import { canonical, LegalAuditService, sha256 } from "./legal-audit.service";
import { LegalCommonService, escapeRegex, oid } from "./legal-common.service";
import { LegalRequestsService } from "./legal-requests.service";

/** Fields never copied into evidence (credentials and secrets). */
const SECRET_FIELDS = [
  "password",
  "passwordHistory",
  "mfaSecret",
  "mfaRecoveryCodes",
  "resetPasswordToken",
  "emailChangeCodeHash",
  "refreshToken",
  "refreshTokens",
  "tokens",
];

const SOURCES: Record<string, { model: string; owner: (doc: any) => string; created: (doc: any) => Date | null }> = {
  post: { model: "Post", owner: (d) => String(d.user ?? ""), created: (d) => d.createdAt ?? null },
  comment: { model: "Comment", owner: (d) => String(d.userId ?? ""), created: (d) => d.createdAt ?? null },
  account: { model: "User", owner: (d) => String(d._id), created: (d) => d.createdAt ?? null },
  report_case: { model: "ModerationCase", owner: (d) => String(d.reportedUserId ?? ""), created: (d) => d.createdAt ?? d.firstReportAt ?? null },
  moderation_event: { model: "ModerationEvent", owner: (d) => String(d.metadata?.authorId ?? ""), created: (d) => d.at ?? null },
  support_ticket: { model: "SupportTicket", owner: (d) => String(d.userId ?? ""), created: (d) => d.createdAt ?? null },
};

function plainSnapshot(doc: any): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(doc ?? {}));
  for (const field of SECRET_FIELDS) delete copy[field];
  return copy;
}

/** Works out a storage key from the forms post media is saved in. */
export function mediaKey(value: string): string {
  const v = String(value ?? "").trim();
  if (!v || v.startsWith("data:") || v.startsWith("blob:")) return "";
  const marker = "/uploads/media/";
  const i = v.indexOf(marker);
  if (i >= 0) return decodeURIComponent(v.slice(i + marker.length).split("?")[0]);
  const gcs = /^https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/.exec(v.split("?")[0]);
  if (gcs) return decodeURIComponent(gcs[1]);
  if (/^https?:\/\//.test(v)) return "";
  return v.replace(/^\/+/, "").replace(/^uploads\/media\//, "");
}

/**
 * Evidence archive: preserved, immutable snapshots of records, created only
 * under a legal hold or verified legal request. Reading a snapshot always
 * needs a reason and is written to the evidence access log.
 */
@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @InjectModel(EvidenceRecord.name) private readonly records: Model<EvidenceRecordDocument>,
    @InjectModel(LegalHold.name) private readonly holds: Model<LegalHoldDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly common: LegalCommonService,
    private readonly audit: LegalAuditService,
    private readonly requests: LegalRequestsService,
  ) {}

  /* ---------------- preserve ---------------- */

  private async loadSource(recordType: string, recordId: string) {
    const source = SOURCES[recordType];
    if (!source) throw new BadRequestException("That record type can't be preserved.");
    const model = this.connection.models[source.model];
    if (!model) throw new BadRequestException("That kind of record isn't available on this server.");
    if (!Types.ObjectId.isValid(recordId)) throw new NotFoundException("That record was not found.");
    const doc: any = await model.findById(recordId).lean().exec();
    if (!doc) throw new NotFoundException("That record was not found. It may already have been deleted.");
    return { doc, source };
  }

  private async copyMedia(keys: string[], number: string, actorId: string): Promise<StoredFile[]> {
    const files: StoredFile[] = [];
    for (const [index, key] of keys.entries()) {
      try {
        if (!(await this.common.cloud.objectExists(key))) continue;
        const meta = await this.common.cloud.getFileMetadata(key);
        const name = key.split("/").pop() || `file-${index}`;
        const dest = `evidence/${number}/${index}-${name}`;
        await this.common.cloud.copyObject(key, dest);
        let digest = "";
        if (meta.size > 0 && meta.size <= HASH_MAX_BYTES) {
          const tmp = join(tmpdir(), `evidence-${number}-${index}`);
          try {
            await this.common.cloud.downloadToFile(dest, tmp);
            digest = await new Promise<string>((resolve, reject) => {
              const hash = createHash("sha256");
              createReadStream(tmp).on("data", (c) => hash.update(c)).on("end", () => resolve(hash.digest("hex"))).on("error", reject);
            });
          } finally {
            await fs.rm(tmp, { force: true });
          }
        }
        files.push({ key: dest, name, mimeType: meta.contentType, size: meta.size, sha256: digest, addedAt: new Date(), addedBy: actorId });
      } catch (error) {
        this.logger.warn(`Could not preserve media ${key}: ${String(error)}`);
      }
    }
    return files;
  }

  async preserve(actorId: string, dto: PreserveDto) {
    if (!dto.holdId && !dto.requestId) throw new BadRequestException("Preserve records under a legal hold or a legal request.");
    let hold: LegalHoldDocument | null = null;
    if (dto.holdId) {
      hold = await this.holds.findById(oid(dto.holdId, "legal hold")).exec();
      if (!hold || hold.status !== "active") throw new BadRequestException("Choose an active legal hold.");
    }
    let requestNumber = "";
    if (dto.requestId) {
      const request = await this.requests.get(dto.requestId);
      if (request.verificationStatus !== "verified") throw new BadRequestException("Only verified requests can justify preservation.");
      requestNumber = request.number;
    }
    const caseReference = hold?.caseReference ?? requestNumber;

    const existing = await this.records
      .findOne({ recordType: dto.recordType, recordId: dto.recordId, status: "preserved", ...(hold ? { holdId: hold._id } : { requestId: new Types.ObjectId(dto.requestId!) }) })
      .select("number")
      .lean()
      .exec();
    if (existing) throw new ConflictException(`Already preserved as ${existing.number}.`);

    const { doc, source } = await this.loadSource(dto.recordType, dto.recordId);
    const ownerId = source.owner(doc);
    const owner = ownerId && Types.ObjectId.isValid(ownerId) ? await this.common.people([ownerId]) : new Map();
    const username = (owner.get(ownerId) as any)?.username ?? doc.username ?? "";
    const snapshot = plainSnapshot(doc);
    const number = await this.common.nextNumber("EV");

    const mediaKeys = dto.recordType === "post" ? [doc.media, doc.thumbnail].filter(Boolean).map(mediaKey).filter(Boolean) : [];
    const files = await this.copyMedia(Array.from(new Set(mediaKeys)), number, actorId);

    const caseModel = this.connection.models["ModerationCase"];
    const reportIds =
      caseModel && ["post", "comment", "account"].includes(dto.recordType)
        ? (await caseModel.find({ targetId: dto.recordId }).select("_id").lean().exec()).map((c: any) => String(c._id))
        : [];

    const record = await this.records.create({
      number,
      recordType: dto.recordType,
      recordId: dto.recordId,
      userId: ownerId && Types.ObjectId.isValid(ownerId) ? ownerId : "",
      username,
      originalCreatedAt: source.created(doc),
      preservedAt: new Date(),
      preservedBy: actorId,
      caseReference,
      holdId: hold?._id ?? null,
      requestId: dto.requestId ? new Types.ObjectId(dto.requestId) : null,
      reason: dto.reason,
      snapshot,
      snapshotHash: sha256(canonical(snapshot)),
      files,
      reportIds,
      status: "preserved",
    });

    // The preserved record is now covered by the hold, so nothing deletes the original either.
    if (hold && !hold.records.some((r) => r.recordId === dto.recordId)) {
      await this.holds.updateOne({ _id: hold._id }, { $push: { records: { recordType: dto.recordType, recordId: dto.recordId } } }).exec();
    }
    if (dto.requestId) await this.requests.markPreserved(dto.requestId, actorId);

    await this.audit.record({
      actorId,
      action: "evidence_preserved",
      targetType: "evidence_record",
      targetId: String(record._id),
      targetLabel: number,
      reason: dto.reason,
      caseReference,
      holdNumber: hold?.number ?? "",
      metadata: { recordType: dto.recordType, recordId: dto.recordId, files: files.length, snapshotHash: record.snapshotHash },
    });
    return this.summary(record.toObject(), await this.common.people([actorId]));
  }

  /* ---------------- read ---------------- */

  private summary(r: any, people: Map<string, any>) {
    return {
      id: String(r._id),
      number: r.number,
      recordType: r.recordType,
      recordId: r.recordId,
      userId: r.userId,
      username: r.username,
      originalCreatedAt: r.originalCreatedAt ?? null,
      preservedAt: r.preservedAt,
      preservedBy: this.common.person(people, r.preservedBy),
      caseReference: r.caseReference,
      holdId: r.holdId ? String(r.holdId) : null,
      requestId: r.requestId ? String(r.requestId) : null,
      reason: r.reason,
      snapshotHash: r.snapshotHash,
      fileCount: (r.files ?? []).length,
      reportIds: r.reportIds ?? [],
      status: r.status,
      expiredAt: r.expiredAt ?? null,
    };
  }

  /** Metadata only. Listing never reveals preserved content. */
  async list(query: ListEvidenceQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    const status = query.status ?? "preserved";
    if (status !== "all") filter.status = status;
    if (query.recordType) filter.recordType = query.recordType;
    if (query.from || query.to) filter.preservedAt = { ...(query.from ? { $gte: new Date(query.from) } : {}), ...(query.to ? { $lte: new Date(query.to) } : {}) };
    if (query.search) {
      const term = query.search.replace(/^@/, "");
      const pattern = new RegExp(`^${escapeRegex(term)}$`, "i");
      filter.$or = [{ number: pattern }, { recordId: term }, { userId: term }, { username: pattern }, { caseReference: pattern }, { reportIds: term }];
    }
    const [rows, total] = await Promise.all([
      this.records.find(filter).select("-snapshot").sort({ preservedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.records.countDocuments(filter).exec(),
    ]);
    const people = await this.common.people(rows.map((r) => r.preservedBy));
    return { items: rows.map((r) => this.summary(r, people)), total, page, hasMore: page * PAGE_SIZE < total };
  }

  /** Full preserved content. Logged with the reason given. */
  async open(actorId: string, id: string, reason: string) {
    const r: any = await this.records.findById(oid(id, "evidence record")).lean().exec();
    if (!r) throw new NotFoundException("That evidence record was not found.");
    const hold = r.holdId ? await this.holds.findById(r.holdId).select("number").lean().exec() : null;
    await this.audit.record({ actorId, action: "evidence_viewed", targetType: "evidence_record", targetId: id, targetLabel: r.number, reason, caseReference: r.caseReference, holdNumber: (hold as any)?.number ?? "" });
    const people = await this.common.people([r.preservedBy]);
    const intact = r.status === "preserved" ? sha256(canonical(r.snapshot)) === r.snapshotHash : null;
    return {
      ...this.summary(r, people),
      snapshot: r.status === "preserved" ? r.snapshot : null,
      integrity: intact,
      files: (r.files ?? []).map((f: any) => ({ key: f.key, name: f.name, mimeType: f.mimeType, size: f.size, sha256: f.sha256 })),
      holdNumber: (hold as any)?.number ?? "",
    };
  }

  async fileLink(actorId: string, id: string, key: string, reason: string) {
    const r: any = await this.records.findById(oid(id, "evidence record")).lean().exec();
    const file = r?.files?.find((f: any) => f.key === key);
    if (!r || !file || r.status !== "preserved") throw new NotFoundException("That file was not found.");
    await this.audit.record({ actorId, action: "evidence_file_opened", targetType: "evidence_record", targetId: id, targetLabel: r.number, reason, caseReference: r.caseReference, metadata: { file: file.name } });
    return this.common.link(file);
  }

  /** Full records for an export package (caller logs the export). */
  async forExport(ids: string[]) {
    const objectIds = ids.map((id) => oid(id, "evidence record"));
    const rows: any[] = await this.records.find({ _id: { $in: objectIds }, status: "preserved" }).lean().exec();
    if (rows.length !== ids.length) throw new BadRequestException("Some records are missing or no longer preserved.");
    return rows;
  }

  async counts() {
    return { preserved: await this.records.countDocuments({ status: "preserved" }).exec() };
  }
}
