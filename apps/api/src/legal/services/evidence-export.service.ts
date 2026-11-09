import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { CreateExportDto, PageQueryDto } from "../dto/legal.dto";
import { PAGE_SIZE } from "../legal.constants";
import { EvidenceExport, EvidenceExportDocument } from "../schemas/legal.schemas";
import { EvidenceService } from "./evidence.service";
import { LegalAuditService, sha256 } from "./legal-audit.service";
import { LegalCommonService, oid } from "./legal-common.service";
import { LegalRequestsService } from "./legal-requests.service";

/**
 * Evidence packages: a JSON bundle with snapshots, original and preserved
 * timestamps, file hashes and chain of custody, written to restricted
 * storage. Exports for a legal request need an approved disclosure.
 */
@Injectable()
export class EvidenceExportService {
  constructor(
    @InjectModel(EvidenceExport.name) private readonly exportsModel: Model<EvidenceExportDocument>,
    private readonly evidence: EvidenceService,
    private readonly requests: LegalRequestsService,
    private readonly common: LegalCommonService,
    private readonly audit: LegalAuditService,
  ) {}

  private view(r: any, people: Map<string, any>) {
    return {
      id: String(r._id),
      number: r.number,
      caseReference: r.caseReference,
      requestId: r.requestId ? String(r.requestId) : null,
      recordNumbers: r.recordNumbers ?? [],
      reason: r.reason,
      packageSha256: r.packageSha256,
      packageBytes: r.packageBytes,
      available: Boolean(r.packageKey) && !r.packageRemovedAt,
      exportedBy: this.common.person(people, r.exportedBy),
      exportedAt: r.exportedAt,
      downloads: r.downloads ?? 0,
      packageRemovedAt: r.packageRemovedAt ?? null,
    };
  }

  async list(query: PageQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const [rows, total] = await Promise.all([
      this.exportsModel.find({}).sort({ exportedAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.exportsModel.countDocuments({}).exec(),
    ]);
    const people = await this.common.people(rows.map((r) => r.exportedBy));
    return { items: rows.map((r) => this.view(r, people)), total, page, hasMore: page * PAGE_SIZE < total };
  }

  async create(actorId: string, dto: CreateExportDto) {
    const ids = Array.from(new Set(dto.recordIds));
    if (!ids.length) throw new BadRequestException("Choose at least one preserved record.");
    let requestNumber = "";
    if (dto.requestId) requestNumber = (await this.requests.assertDisclosureApproved(dto.requestId)).number;

    const rows = await this.evidence.forExport(ids);
    const custody = await this.audit.forTargets(rows.map((r) => String(r._id)));
    const people = await this.common.people([actorId, ...rows.map((r) => r.preservedBy), ...custody.map((c) => c.actorId)]);
    const who = (id: string) => {
      const p = this.common.person(people, id);
      return p ? { id: p.id, username: p.username } : null;
    };

    const number = await this.common.nextNumber("EX");
    const exportedAt = new Date();
    const pkg = {
      format: "fockis-evidence-package/1",
      package: number,
      caseReference: dto.caseReference,
      legalRequest: requestNumber || null,
      reason: dto.reason,
      exportedBy: who(actorId),
      exportedAt: exportedAt.toISOString(),
      records: rows.map((r) => ({
        number: r.number,
        recordType: r.recordType,
        recordId: r.recordId,
        accountId: r.userId || null,
        originalCreatedAt: r.originalCreatedAt ?? null,
        preservedAt: r.preservedAt,
        preservedBy: who(r.preservedBy),
        caseReference: r.caseReference,
        preservationReason: r.reason,
        reportIds: r.reportIds ?? [],
        snapshotSha256: r.snapshotHash,
        snapshot: r.snapshot,
        files: (r.files ?? []).map((f: any) => ({ name: f.name, storageKey: f.key, mimeType: f.mimeType, size: f.size, sha256: f.sha256 || null })),
      })),
      chainOfCustody: custody.map((c) => ({ ...c, actor: who(c.actorId) })),
    };
    const bytes = Buffer.from(JSON.stringify(pkg, null, 2), "utf8");
    const digest = sha256(bytes);
    const key = `evidence/exports/${number}.json`;
    await this.common.cloud.uploadBuffer(bytes, key, "application/json");

    const doc = await this.exportsModel.create({
      number,
      caseReference: dto.caseReference,
      requestId: dto.requestId ? new Types.ObjectId(dto.requestId) : null,
      recordNumbers: rows.map((r) => r.number),
      reason: dto.reason,
      packageKey: key,
      packageSha256: digest,
      packageBytes: bytes.length,
      exportedBy: actorId,
      exportedAt,
      downloads: 0,
      packageRemovedAt: null,
    });
    await this.audit.record({
      actorId,
      action: "evidence_exported",
      targetType: "evidence_export",
      targetId: String(doc._id),
      targetLabel: number,
      reason: dto.reason,
      caseReference: dto.caseReference,
      metadata: { records: rows.length, sha256: digest, bytes: bytes.length, legalRequest: requestNumber || null },
    });
    await this.common.notifyStaff("Evidence export ready", `${number} · ${dto.caseReference} · ${rows.length} record(s)`, "/admin/legal/exports", String(doc._id), "evidence_export", actorId);
    return this.view(doc.toObject(), people);
  }

  async download(actorId: string, id: string, reason: string) {
    const doc = await this.exportsModel.findById(oid(id, "export")).exec();
    if (!doc) throw new NotFoundException("That export was not found.");
    if (!doc.packageKey || doc.packageRemovedAt) throw new NotFoundException("This package was removed under the retention policy.");
    await this.exportsModel.updateOne({ _id: doc._id }, { $inc: { downloads: 1 } }).exec();
    await this.audit.record({ actorId, action: "export_downloaded", targetType: "evidence_export", targetId: id, targetLabel: doc.number, reason, caseReference: doc.caseReference, metadata: { sha256: doc.packageSha256 } });
    return this.common.link({ key: doc.packageKey, name: `${doc.number}.json`, mimeType: "application/json", size: doc.packageBytes, sha256: doc.packageSha256, addedAt: doc.exportedAt, addedBy: doc.exportedBy });
  }
}
