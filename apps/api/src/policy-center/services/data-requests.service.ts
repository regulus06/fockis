import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model, Types } from "mongoose";

import { CloudStorageService } from "../../uploads/cloud-storage.service";
import { CorrectionRequestDto, DataRequestsQueryDto, ResolveCorrectionDto } from "../dto/policy.dto";
import { EXPORT_LINK_DAYS, MAX_OPEN_DATA_REQUESTS, PAGE_SIZE } from "../policy.constants";
import {
  PolicyAcceptance,
  PolicyAcceptanceDocument,
  UserConsentEvent,
  UserConsentEventDocument,
  UserDataRequest,
  UserDataRequestDocument,
} from "../schemas/policy.schemas";
import { PolicyAuditService } from "./policy-audit.service";
import { PolicyCommonService, oid } from "./policy-common.service";
import { UserActivityService } from "./user-activity.service";
import { UserCenterService } from "./user-center.service";

const DAY = 86_400_000;
/** Never included in an export. */
const SECRET_FIELDS = ["password", "passwordHistory", "mfaSecret", "mfaRecoveryCodes", "resetPasswordToken", "resetPasswordExpires", "emailChangeCodeHash", "refreshToken", "refreshTokens", "tokens", "adminRoleId", "permissions"];

/**
 * "Download My Data" and "Request Data Correction". Users can only ever
 * create and read their own requests; staff resolve corrections.
 */
@Injectable()
export class DataRequestsService {
  private readonly logger = new Logger(DataRequestsService.name);

  constructor(
    @InjectModel(UserDataRequest.name) private readonly requests: Model<UserDataRequestDocument>,
    @InjectModel(PolicyAcceptance.name) private readonly acceptances: Model<PolicyAcceptanceDocument>,
    @InjectModel(UserConsentEvent.name) private readonly consentEvents: Model<UserConsentEventDocument>,
    private readonly storage: CloudStorageService,
    private readonly common: PolicyCommonService,
    private readonly center: UserCenterService,
    private readonly activity: UserActivityService,
    private readonly audit: PolicyAuditService,
  ) {}

  private view(r: any) {
    return {
      id: String(r._id),
      number: r.number,
      type: r.type,
      status: r.status === "completed" && r.type === "export" && r.expiresAt && new Date(r.expiresAt).getTime() < Date.now() ? "expired" : r.status,
      field: r.field ?? "",
      details: r.details ?? "",
      response: r.response ?? "",
      fileBytes: r.fileBytes ?? 0,
      createdAt: r.createdAt,
      completedAt: r.completedAt ?? null,
      expiresAt: r.expiresAt ?? null,
    };
  }

  private async number(prefix: string) {
    return `${prefix}-${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0, 4).toUpperCase()}`;
  }

  async mine(userId: string) {
    const rows = await this.requests.find({ userId }).sort({ createdAt: -1 }).limit(50).lean().exec();
    return rows.map((r) => this.view(r));
  }

  private async assertRoom(userId: string, type: string) {
    const open = await this.requests.countDocuments({ userId, type, status: { $in: ["pending", "processing"] } }).exec();
    if (open >= (type === "export" ? 1 : MAX_OPEN_DATA_REQUESTS)) {
      throw new ConflictException(type === "export" ? "Your previous export is still being prepared." : "You already have several correction requests open.");
    }
  }

  /* ---------------- export ---------------- */

  async requestExport(userId: string) {
    await this.assertRoom(userId, "export");
    const doc = await this.requests.create({ number: await this.number("EXP"), userId, type: "export", status: "processing", details: "", fileKey: "", fileBytes: 0 });
    await this.activity.add(userId, "data_export_requested", "Data download requested", "Your data export is being prepared.");
    setImmediate(() => void this.buildExport(String(doc._id), userId));
    return this.view(doc.toObject());
  }

  /** Builds the JSON export into restricted storage (privacy/…, never public). */
  async buildExport(requestId: string, userId: string) {
    try {
      const data = await this.collect(userId);
      const bytes = Buffer.from(JSON.stringify(data, null, 2), "utf8");
      const key = `privacy/exports/${userId}/${randomUUID()}.json`;
      await this.storage.uploadBuffer(bytes, key, "application/json");
      await this.requests
        .updateOne({ _id: new Types.ObjectId(requestId) }, { $set: { status: "completed", fileKey: key, fileBytes: bytes.length, completedAt: new Date(), expiresAt: new Date(Date.now() + EXPORT_LINK_DAYS * DAY) } })
        .exec();
      await this.activity.add(userId, "data_export_ready", "Data download ready", `Available for ${EXPORT_LINK_DAYS} days.`);
      await this.common.notify([userId], "Your data is ready to download", `Your Fockis data export is available for ${EXPORT_LINK_DAYS} days.`, "/settings/policy/data", requestId, "data_request");
    } catch (error) {
      this.logger.error(`Export ${requestId} failed: ${String(error)}`);
      await this.requests.updateOne({ _id: new Types.ObjectId(requestId) }, { $set: { status: "rejected", response: "We couldn't prepare your export. Please try again." } }).exec();
    }
  }

  private async collect(userId: string) {
    const id = new Types.ObjectId(userId);
    const find = async (model: string, filter: Record<string, unknown>, select = "", limit = 5000) => {
      const m = this.common.model(model);
      if (!m) return [];
      return m.find(filter).select(select).limit(limit).lean().exec().catch(() => []);
    };
    const user: any = await this.common.users.findById(id).lean().exec();
    for (const f of SECRET_FIELDS) delete user?.[f];
    const [posts, comments, tickets, feedback, decisions, acceptances, consentHistory] = await Promise.all([
      find("Post", { user: userId }, "-likedBy -savedBy"),
      find("Comment", { userId }),
      find("SupportTicket", { userId: id }, "-notes -assignedTo"),
      find("SupportFeedback", { userId: id }, "-notes -assignedTo"),
      find("ModerationCase", { reportedUserId: id, "decision.outcome": "violation" }, "targetType decision.ruleLabel decision.consequences decision.decidedAt decision.userMessage appealStatus appeal.status appeal.message appeal.outcomeNote"),
      this.acceptances.find({ userId }).lean().exec(),
      this.consentEvents.find({ userId }).lean().exec(),
    ]);
    return {
      format: "fockis-personal-data/1",
      generatedAt: new Date().toISOString(),
      account: user,
      privacy: await this.center.getPrivacy(userId),
      consents: await this.center.getConsent(userId),
      consentHistory,
      policyAcceptances: acceptances,
      posts,
      comments,
      supportRequests: tickets,
      feedback,
      moderationDecisions: decisions,
      dataRequests: await this.mine(userId),
    };
  }

  async downloadLink(userId: string, requestId: string) {
    const r = await this.requests.findOne({ _id: oid(requestId, "request"), userId, type: "export" }).lean().exec();
    if (!r || r.status !== "completed" || !r.fileKey) throw new NotFoundException("That export isn't available.");
    if (r.expiresAt && new Date(r.expiresAt).getTime() < Date.now()) throw new NotFoundException("This export has expired. Request a new one.");
    const url = await this.storage.getSignedUrl(r.fileKey, { expiresInSeconds: 300, responseDisposition: `attachment; filename="fockis-data-${r.number}.json"` });
    return { url };
  }

  /** Removes expired export files (run by the retention job and on demand). */
  async purgeExpired() {
    const rows = await this.requests.find({ type: "export", status: "completed", expiresAt: { $lt: new Date() }, fileKey: { $ne: "" } }).select("_id fileKey").limit(500).lean().exec();
    for (const r of rows) {
      await this.storage.deleteObject(r.fileKey).catch(() => undefined);
      await this.requests.updateOne({ _id: r._id }, { $set: { fileKey: "", status: "expired" } }).exec();
    }
    return rows.length;
  }

  /* ---------------- corrections ---------------- */

  async requestCorrection(userId: string, dto: CorrectionRequestDto) {
    await this.assertRoom(userId, "correction");
    const doc = await this.requests.create({ number: await this.number("COR"), userId, type: "correction", status: "pending", field: dto.field, details: dto.details, fileKey: "", fileBytes: 0 });
    await this.activity.add(userId, "correction_requested", "Data correction requested", `Field: ${dto.field.replace(/_/g, " ")}`);
    const staff = await this.common.staffWith("policy.acceptance.view");
    await this.common.notify(staff, "Data correction request", `${doc.number}: ${dto.field.replace(/_/g, " ")}`, "/admin/policy-compliance/acceptance?tab=requests", String(doc._id), "data_request");
    return this.view(doc.toObject());
  }

  /* ---------------- staff ---------------- */

  async adminList(query: DataRequestsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const filter: Record<string, unknown> = {};
    if (query.type) filter.type = query.type;
    if ((query.view ?? "open") === "open") filter.status = { $in: ["pending", "processing"] };
    if (query.view === "completed") filter.status = { $in: ["completed", "rejected", "expired"] };
    const [rows, total] = await Promise.all([
      this.requests.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean().exec(),
      this.requests.countDocuments(filter).exec(),
    ]);
    const people = await this.common.people(rows.flatMap((r) => [r.userId, r.handledBy]));
    return {
      items: rows.map((r) => ({ ...this.view(r), user: this.common.person(people, r.userId), handledBy: this.common.person(people, r.handledBy) })),
      total,
      page,
      hasMore: page * PAGE_SIZE < total,
    };
  }

  async resolveCorrection(actorId: string, actorRole: string, requestId: string, dto: ResolveCorrectionDto, context: Record<string, unknown>) {
    const r = await this.requests.findOne({ _id: oid(requestId, "request"), type: "correction" }).lean().exec();
    if (!r) throw new NotFoundException("That request was not found.");
    if (!["pending", "processing"].includes(r.status)) throw new BadRequestException("This request is already closed.");
    await this.requests.updateOne({ _id: r._id }, { $set: { status: dto.status, response: dto.response, handledBy: actorId, completedAt: new Date() } }).exec();
    await this.audit.record({ actorId, actorRole, action: "data_correction_resolved", targetType: "data_request", targetId: requestId, targetLabel: r.number, summary: dto.status, context, sensitive: true });
    await this.common.notify([r.userId], dto.status === "completed" ? "Your correction request was completed" : "Update on your correction request", dto.response.slice(0, 200), "/settings/policy/data", requestId, "data_request");
    return (await this.adminList({ view: "all" })).items.find((x) => x.id === requestId) ?? null;
  }

  async counts() {
    const [exports, corrections] = await Promise.all([
      this.requests.countDocuments({ type: "export", status: { $in: ["pending", "processing"] } }).exec(),
      this.requests.countDocuments({ type: "correction", status: { $in: ["pending", "processing"] } }).exec(),
    ]);
    return { exports, corrections };
  }
}
