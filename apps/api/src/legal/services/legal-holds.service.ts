import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { CreateHoldDto, ListHoldsQueryDto, UpdateHoldDto } from "../dto/legal.dto";
import { PAGE_SIZE } from "../legal.constants";
import { LegalHold, LegalHoldDocument, LegalRequest, LegalRequestDocument } from "../schemas/legal.schemas";
import { LegalAuditService } from "./legal-audit.service";
import { LegalCommonService, UploadedLegalFile, escapeRegex, oid } from "./legal-common.service";

/**
 * Legal holds. An active hold stops covered accounts and records from
 * being deleted (account deletion, post purge, retention job). Holds are
 * only ever created by compliance staff — never by a content report.
 */
@Injectable()
export class LegalHoldsService {
  constructor(
    @InjectModel(LegalHold.name) private readonly holds: Model<LegalHoldDocument>,
    @InjectModel(LegalRequest.name) private readonly requests: Model<LegalRequestDocument>,
    private readonly common: LegalCommonService,
    private readonly audit: LegalAuditService,
  ) {}

  /* ---------------- checks used across Fockis ---------------- */

  /** Active holds naming this account. */
  async activeForUser(userId: string) {
    if (!userId) return [];
    return this.holds.find({ status: "active", "subjects.userId": String(userId) }).select("number caseReference").lean().exec();
  }

  /** Active holds covering one record (directly, or through its owner). */
  async activeForRecord(recordId: string, ownerId?: string) {
    const or: Record<string, unknown>[] = [{ "records.recordId": String(recordId) }];
    if (ownerId) or.push({ "subjects.userId": String(ownerId) });
    return this.holds.find({ status: "active", $or: or }).select("number caseReference").lean().exec();
  }

  /** IDs of evidence holds still active, for the retention job. */
  async activeIds(): Promise<Set<string>> {
    const rows = await this.holds.find({ status: "active" }).select("_id").lean().exec();
    return new Set(rows.map((r) => String(r._id)));
  }

  /* ---------------- views ---------------- */

  private async view(raw: any, detail = false) {
    const people = await this.common.people([raw.createdBy, raw.releasedBy, ...(raw.subjects ?? []).map((s: any) => s.userId), ...(detail ? (raw.history ?? []).map((h: any) => h.actorId) : [])]);
    const request = raw.requestId ? await this.requests.findById(raw.requestId).select("number").lean().exec() : null;
    const now = Date.now();
    return {
      id: String(raw._id),
      number: raw.number,
      caseReference: raw.caseReference,
      title: raw.title,
      legalBasis: raw.legalBasis,
      basisDetails: raw.basisDetails ?? "",
      scope: raw.scope ?? "",
      status: raw.status,
      subjects: (raw.subjects ?? []).map((s: any) => this.common.person(people, s.userId)),
      records: raw.records ?? [],
      recordCount: (raw.records ?? []).length,
      request: request ? { id: String(raw.requestId), number: (request as any).number } : null,
      reviewAt: raw.reviewAt ?? null,
      expiresAt: raw.expiresAt ?? null,
      reviewDue: raw.status === "active" && ((raw.reviewAt && new Date(raw.reviewAt).getTime() <= now) || (raw.expiresAt && new Date(raw.expiresAt).getTime() <= now)),
      documents: (raw.documents ?? []).map((d: any) => ({ key: d.key, name: d.name, mimeType: d.mimeType, size: d.size, sha256: d.sha256, addedAt: d.addedAt })),
      createdBy: this.common.person(people, raw.createdBy),
      createdAt: raw.createdAt,
      releasedBy: this.common.person(people, raw.releasedBy),
      releasedAt: raw.releasedAt ?? null,
      releaseReason: raw.releaseReason ?? "",
      ...(detail
        ? { history: (raw.history ?? []).map((h: any) => ({ action: h.action, note: h.note, at: h.at, actor: this.common.person(people, h.actorId) })) }
        : {}),
    };
  }

  async list(query: ListHoldsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    const status = query.status ?? "active";
    if (status !== "all") filter.status = status;
    if (query.search) {
      const term = query.search.replace(/^@/, "");
      const user = await this.common.resolveUser(term);
      const pattern = new RegExp(escapeRegex(term), "i");
      filter.$or = [
        { number: pattern },
        { caseReference: pattern },
        { title: pattern },
        { "records.recordId": term },
        ...(user ? [{ "subjects.userId": user.id }] : []),
      ];
    }
    const [rows, total] = await Promise.all([
      this.holds.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.holds.countDocuments(filter).exec(),
    ]);
    return { items: await Promise.all(rows.map((r) => this.view(r))), total, page, hasMore: page * PAGE_SIZE < total };
  }

  async get(id: string) {
    const hold = await this.holds.findById(oid(id, "legal hold")).lean().exec();
    if (!hold) throw new NotFoundException("That legal hold was not found.");
    return this.view(hold, true);
  }

  private async resolveSubjects(values: string[] = []) {
    const out: { userId: string }[] = [];
    for (const v of values) {
      const user = await this.common.resolveUser(v);
      if (!user) throw new BadRequestException(`No account matches "${v}".`);
      if (!out.some((s) => s.userId === user.id)) out.push({ userId: user.id });
    }
    return out;
  }

  /* ---------------- actions ---------------- */

  async create(actorId: string, dto: CreateHoldDto) {
    const subjects = await this.resolveSubjects(dto.subjects);
    const records = (dto.records ?? []).map((r) => ({ recordType: r.recordType, recordId: r.recordId }));
    if (!subjects.length && !records.length) throw new BadRequestException("Name at least one account or record the hold covers.");
    let requestId: Types.ObjectId | null = null;
    if (dto.requestId) {
      const request = await this.requests.findById(oid(dto.requestId, "legal request")).exec();
      if (!request) throw new NotFoundException("That legal request was not found.");
      requestId = request._id;
    }
    const number = await this.common.nextNumber("LH");
    const hold = await this.holds.create({
      number,
      caseReference: dto.caseReference,
      title: dto.title,
      legalBasis: dto.legalBasis,
      basisDetails: dto.basisDetails ?? "",
      scope: dto.scope ?? "",
      subjects,
      records,
      status: "active",
      requestId,
      reviewAt: dto.reviewAt ? new Date(dto.reviewAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      documents: [],
      createdBy: actorId,
      history: [{ action: "created", actorId, note: dto.basisDetails ?? "", at: new Date() }],
    });
    if (requestId) {
      await this.requests.updateOne({ _id: requestId }, { $set: { holdId: hold._id, preservationStatus: "preserved" }, $push: { history: { action: "hold_created", actorId, note: number, at: new Date() } } }).exec();
    }
    await this.audit.record({ actorId, action: "hold_created", targetType: "legal_hold", targetId: String(hold._id), targetLabel: number, caseReference: dto.caseReference, holdNumber: number, reason: dto.title, metadata: { subjects: subjects.length, records: records.length, legalBasis: dto.legalBasis } });
    await this.common.notifyStaff("Legal hold created", `${number} · ${dto.caseReference}`, `/admin/legal/holds/${hold._id}`, String(hold._id), "legal_hold", actorId);
    return this.get(String(hold._id));
  }

  async update(actorId: string, id: string, dto: UpdateHoldDto) {
    const hold = await this.holds.findById(oid(id, "legal hold")).exec();
    if (!hold) throw new NotFoundException("That legal hold was not found.");
    if (hold.status !== "active") throw new ConflictException("Released holds can't be changed.");
    const set: Record<string, unknown> = {};
    if (dto.scope !== undefined) set.scope = dto.scope;
    if (dto.reviewAt !== undefined) set.reviewAt = dto.reviewAt ? new Date(dto.reviewAt) : null;
    if (dto.expiresAt !== undefined) set.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const addSubjects = (await this.resolveSubjects(dto.addSubjects)).filter((s) => !hold.subjects.some((x) => x.userId === s.userId));
    const addRecords = (dto.addRecords ?? []).filter((r) => !hold.records.some((x) => x.recordId === r.recordId && x.recordType === r.recordType));
    const update: Record<string, unknown> = {
      $push: {
        history: { action: "updated", actorId, note: dto.note ?? "", at: new Date() },
        ...(addSubjects.length ? { subjects: { $each: addSubjects } } : {}),
        ...(addRecords.length ? { records: { $each: addRecords } } : {}),
      },
    };
    if (Object.keys(set).length) update.$set = set;
    await this.holds.updateOne({ _id: hold._id }, update).exec();
    await this.audit.record({ actorId, action: "hold_updated", targetType: "legal_hold", targetId: id, targetLabel: hold.number, caseReference: hold.caseReference, holdNumber: hold.number, reason: dto.note ?? "", metadata: { addedSubjects: addSubjects.length, addedRecords: addRecords.length } });
    return this.get(id);
  }

  async release(actorId: string, id: string, reason: string) {
    const hold = await this.holds.findById(oid(id, "legal hold")).exec();
    if (!hold) throw new NotFoundException("That legal hold was not found.");
    if (hold.status !== "active") throw new ConflictException("This hold is already released.");
    await this.holds
      .updateOne(
        { _id: hold._id, status: "active" },
        { $set: { status: "released", releasedBy: actorId, releasedAt: new Date(), releaseReason: reason }, $push: { history: { action: "released", actorId, note: reason, at: new Date() } } },
      )
      .exec();
    await this.audit.record({ actorId, action: "hold_released", targetType: "legal_hold", targetId: id, targetLabel: hold.number, caseReference: hold.caseReference, holdNumber: hold.number, reason });
    await this.common.notifyStaff("Legal hold released", `${hold.number} · ${hold.caseReference}`, `/admin/legal/holds/${id}`, id, "legal_hold", actorId);
    return this.get(id);
  }

  async addDocument(actorId: string, id: string, file: UploadedLegalFile | undefined) {
    const hold = await this.holds.findById(oid(id, "legal hold")).exec();
    if (!hold) throw new NotFoundException("That legal hold was not found.");
    const stored = await this.common.storeDocument(file, actorId, `holds/${id}`);
    await this.holds.updateOne({ _id: hold._id }, { $push: { documents: stored, history: { action: "document_added", actorId, note: stored.name, at: new Date() } } }).exec();
    await this.audit.record({ actorId, action: "document_uploaded", targetType: "legal_hold", targetId: id, targetLabel: hold.number, caseReference: hold.caseReference, holdNumber: hold.number, metadata: { name: stored.name, sha256: stored.sha256 } });
    return this.get(id);
  }

  async documentLink(actorId: string, id: string, key: string, reason: string) {
    const hold = await this.holds.findById(oid(id, "legal hold")).lean().exec();
    const doc = hold?.documents?.find((d) => d.key === key);
    if (!hold || !doc) throw new NotFoundException("That document was not found.");
    await this.audit.record({ actorId, action: "document_opened", targetType: "legal_hold", targetId: id, targetLabel: hold.number, caseReference: hold.caseReference, holdNumber: hold.number, reason, metadata: { name: doc.name } });
    return this.common.link(doc);
  }

  async counts() {
    const now = new Date();
    const [active, reviewDue] = await Promise.all([
      this.holds.countDocuments({ status: "active" }).exec(),
      this.holds.countDocuments({ status: "active", $or: [{ reviewAt: { $lte: now } }, { expiresAt: { $lte: now } }] }).exec(),
    ]);
    return { active, reviewDue };
  }
}
