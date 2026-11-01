import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ApproveRequestDto, CreateRequestDto, ListRequestsQueryDto, UpdateRequestDto, VerifyRequestDto } from "../dto/legal.dto";
import { PAGE_SIZE } from "../legal.constants";
import { LegalRequest, LegalRequestDocument } from "../schemas/legal.schemas";
import { LegalAuditService } from "./legal-audit.service";
import { LegalCommonService, UploadedLegalFile, escapeRegex, oid } from "./legal-common.service";

/**
 * Legal requests from authorities. Nothing is disclosed automatically:
 * a request must be verified, then approved (separate permission), and
 * every step is documented and logged.
 */
@Injectable()
export class LegalRequestsService {
  constructor(
    @InjectModel(LegalRequest.name) private readonly requests: Model<LegalRequestDocument>,
    private readonly common: LegalCommonService,
    private readonly audit: LegalAuditService,
  ) {}

  private async view(raw: any, detail = false) {
    const people = await this.common.people([raw.createdBy, raw.assignedTo, raw.verifiedBy, raw.approvedBy, ...(raw.subjectUserIds ?? []), ...(detail ? (raw.history ?? []).map((h: any) => h.actorId) : [])]);
    const deadline = raw.responseDeadline ? new Date(raw.responseDeadline) : null;
    const open = !["completed", "closed"].includes(raw.completionStatus);
    return {
      id: String(raw._id),
      number: raw.number,
      authority: raw.anonymizedAt ? "(removed under retention policy)" : raw.authority,
      authorityContact: raw.anonymizedAt ? "" : raw.authorityContact ?? "",
      requestType: raw.requestType,
      legalBasis: raw.legalBasis ?? "",
      jurisdiction: raw.jurisdiction ?? "",
      requestedRecords: raw.requestedRecords,
      subjects: (raw.subjectUserIds ?? []).map((id: string) => this.common.person(people, id)),
      verificationStatus: raw.verificationStatus,
      verificationNote: raw.verificationNote ?? "",
      verifiedBy: this.common.person(people, raw.verifiedBy),
      verifiedAt: raw.verifiedAt ?? null,
      preservationStatus: raw.preservationStatus,
      approvalStatus: raw.approvalStatus,
      approvalNote: raw.approvalNote ?? "",
      approvedBy: this.common.person(people, raw.approvedBy),
      approvedAt: raw.approvedAt ?? null,
      completionStatus: raw.completionStatus,
      completedAt: raw.completedAt ?? null,
      responseDeadline: raw.responseDeadline ?? null,
      overdue: Boolean(open && deadline && deadline.getTime() < Date.now()),
      receivedAt: raw.receivedAt,
      assignedTo: this.common.person(people, raw.assignedTo),
      holdId: raw.holdId ? String(raw.holdId) : null,
      createdBy: this.common.person(people, raw.createdBy),
      createdAt: raw.createdAt,
      ...(detail
        ? {
            notes: raw.notes ?? "",
            documents: (raw.documents ?? []).map((d: any) => ({ key: d.key, name: d.name, mimeType: d.mimeType, size: d.size, sha256: d.sha256, addedAt: d.addedAt })),
            history: (raw.history ?? []).map((h: any) => ({ action: h.action, note: h.note, at: h.at, actor: this.common.person(people, h.actorId) })),
          }
        : {}),
    };
  }

  async list(query: ListRequestsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    const view = query.view ?? "open";
    if (view === "open") filter.completionStatus = { $in: ["open", "in_progress"] };
    if (view === "completed") filter.completionStatus = { $in: ["completed", "closed"] };
    if (view === "overdue") Object.assign(filter, { completionStatus: { $in: ["open", "in_progress"] }, responseDeadline: { $ne: null, $lt: new Date() } });
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ number: pattern }, { authority: pattern }, { requestedRecords: pattern }];
    }
    const [rows, total] = await Promise.all([
      this.requests.find(filter).sort({ responseDeadline: 1, createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.requests.countDocuments(filter).exec(),
    ]);
    return { items: await Promise.all(rows.map((r) => this.view(r))), total, page, hasMore: page * PAGE_SIZE < total };
  }

  private async load(id: string) {
    const doc = await this.requests.findById(oid(id, "legal request")).exec();
    if (!doc) throw new NotFoundException("That legal request was not found.");
    return doc;
  }

  async get(id: string) {
    const doc = await this.requests.findById(oid(id, "legal request")).lean().exec();
    if (!doc) throw new NotFoundException("That legal request was not found.");
    return this.view(doc, true);
  }

  async create(actorId: string, dto: CreateRequestDto) {
    const subjectUserIds: string[] = [];
    for (const s of dto.subjects ?? []) {
      const user = await this.common.resolveUser(s);
      if (!user) throw new BadRequestException(`No account matches "${s}".`);
      if (!subjectUserIds.includes(user.id)) subjectUserIds.push(user.id);
    }
    const number = await this.common.nextNumber("LR");
    const doc = await this.requests.create({
      number,
      authority: dto.authority,
      authorityContact: dto.authorityContact ?? "",
      requestType: dto.requestType,
      legalBasis: dto.legalBasis ?? "",
      jurisdiction: dto.jurisdiction ?? "",
      requestedRecords: dto.requestedRecords,
      subjectUserIds,
      responseDeadline: dto.responseDeadline ? new Date(dto.responseDeadline) : null,
      receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
      preservationStatus: dto.preservationRequested ? "pending" : "not_requested",
      verificationStatus: "pending",
      approvalStatus: "pending",
      completionStatus: "open",
      documents: [],
      createdBy: actorId,
      assignedTo: actorId,
      history: [{ action: "received", actorId, note: dto.authority, at: new Date() }],
    });
    await this.audit.record({ actorId, action: "request_received", targetType: "legal_request", targetId: String(doc._id), targetLabel: number, metadata: { requestType: dto.requestType, subjects: subjectUserIds.length } });
    await this.common.notifyStaff("Legal request received", `${number} · ${dto.requestType.replace(/_/g, " ")}`, `/admin/legal/requests/${doc._id}`, String(doc._id), "legal_request", actorId);
    return this.get(String(doc._id));
  }

  async verify(actorId: string, id: string, dto: VerifyRequestDto) {
    const doc = await this.load(id);
    if (doc.verificationStatus !== "pending") throw new ConflictException("This request has already been verified or rejected.");
    await this.requests
      .updateOne(
        { _id: doc._id },
        {
          $set: { verificationStatus: dto.status, verificationNote: dto.note, verifiedBy: actorId, verifiedAt: new Date(), ...(doc.completionStatus === "open" ? { completionStatus: "in_progress" } : {}) },
          $push: { history: { action: dto.status === "verified" ? "verified" : "rejected", actorId, note: dto.note, at: new Date() } },
        },
      )
      .exec();
    await this.audit.record({ actorId, action: dto.status === "verified" ? "request_verified" : "request_rejected", targetType: "legal_request", targetId: id, targetLabel: doc.number, reason: dto.note });
    return this.get(id);
  }

  /** Disclosure decision. Only possible after verification. */
  async approve(actorId: string, id: string, dto: ApproveRequestDto) {
    const doc = await this.load(id);
    if (doc.verificationStatus !== "verified") throw new ConflictException("Verify the request before deciding on disclosure.");
    if (doc.approvalStatus !== "pending") throw new ConflictException("A disclosure decision has already been recorded.");
    await this.requests
      .updateOne(
        { _id: doc._id },
        { $set: { approvalStatus: dto.status, approvalNote: dto.note, approvedBy: actorId, approvedAt: new Date() }, $push: { history: { action: `decision_${dto.status}`, actorId, note: dto.note, at: new Date() } } },
      )
      .exec();
    await this.audit.record({ actorId, action: `disclosure_${dto.status}`, targetType: "legal_request", targetId: id, targetLabel: doc.number, reason: dto.note });
    return this.get(id);
  }

  async update(actorId: string, id: string, dto: UpdateRequestDto) {
    const doc = await this.load(id);
    const set: Record<string, unknown> = {};
    const notes: string[] = [];
    if (dto.completionStatus && dto.completionStatus !== doc.completionStatus) {
      if (dto.completionStatus === "completed" && doc.verificationStatus === "verified" && doc.approvalStatus === "pending") {
        throw new ConflictException("Record the disclosure decision before completing the request.");
      }
      set.completionStatus = dto.completionStatus;
      set.completedAt = ["completed", "closed"].includes(dto.completionStatus) ? new Date() : null;
      notes.push(`status → ${dto.completionStatus}`);
    }
    if (dto.assignedTo !== undefined) {
      if (dto.assignedTo && !(await this.common.legalStaffIds()).includes(dto.assignedTo)) throw new BadRequestException("Assign the request to compliance staff.");
      set.assignedTo = dto.assignedTo;
      notes.push("assignment changed");
    }
    if (dto.responseDeadline !== undefined) {
      set.responseDeadline = dto.responseDeadline ? new Date(dto.responseDeadline) : null;
      notes.push("deadline changed");
    }
    if (dto.notes !== undefined) {
      set.notes = dto.notes;
      notes.push("notes edited");
    }
    if (!Object.keys(set).length) return this.get(id);
    await this.requests.updateOne({ _id: doc._id }, { $set: set, $push: { history: { action: "updated", actorId, note: notes.join(", "), at: new Date() } } }).exec();
    await this.audit.record({ actorId, action: "request_updated", targetType: "legal_request", targetId: id, targetLabel: doc.number, reason: notes.join(", ") });
    return this.get(id);
  }

  async addDocument(actorId: string, id: string, file: UploadedLegalFile | undefined) {
    const doc = await this.load(id);
    const stored = await this.common.storeDocument(file, actorId, `requests/${id}`);
    await this.requests.updateOne({ _id: doc._id }, { $push: { documents: stored, history: { action: "document_added", actorId, note: stored.name, at: new Date() } } }).exec();
    await this.audit.record({ actorId, action: "document_uploaded", targetType: "legal_request", targetId: id, targetLabel: doc.number, metadata: { name: stored.name, sha256: stored.sha256 } });
    return this.get(id);
  }

  async documentLink(actorId: string, id: string, key: string, reason: string) {
    const doc = await this.load(id);
    const file = doc.documents.find((d) => d.key === key);
    if (!file) throw new NotFoundException("That document was not found.");
    await this.audit.record({ actorId, action: "document_opened", targetType: "legal_request", targetId: id, targetLabel: doc.number, reason, metadata: { name: file.name } });
    return this.common.link(file);
  }

  /** For exports: an export tied to a request needs an approved disclosure. */
  async assertDisclosureApproved(id: string) {
    const doc = await this.load(id);
    if (doc.verificationStatus !== "verified" || !["approved", "partially_approved"].includes(doc.approvalStatus)) {
      throw new ConflictException("This request isn't verified and approved for disclosure.");
    }
    return doc;
  }

  async markPreserved(id: string, actorId: string) {
    await this.requests.updateOne({ _id: oid(id, "legal request"), preservationStatus: { $ne: "preserved" } }, { $set: { preservationStatus: "preserved" }, $push: { history: { action: "records_preserved", actorId, note: "", at: new Date() } } }).exec();
  }

  async counts() {
    const [open, overdue] = await Promise.all([
      this.requests.countDocuments({ completionStatus: { $in: ["open", "in_progress"] } }).exec(),
      this.requests.countDocuments({ completionStatus: { $in: ["open", "in_progress"] }, responseDeadline: { $ne: null, $lt: new Date() } }).exec(),
    ]);
    return { open, overdue };
  }
}
