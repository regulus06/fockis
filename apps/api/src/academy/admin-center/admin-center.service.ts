import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Course } from "../courses/schemas/course.schema";
import { Enrollment } from "../courses/schemas/enrollment.schema";
import { AcademyUser } from "../auth/schemas/academy-user.schema";
import { IssuedCertificate } from "../certificates/schemas/issued-certificate.schema";
import { AcademyInstitution } from "../institutions/schemas/institution.schema";
import { CertificatesService } from "../certificates/services/certificates.service";
import { InstitutionsService } from "../institutions/services/institutions.service";
import { DomainBillingService } from "../institutions/billing/domain-billing.service";

/* ============================================================================
   ACADEMY IN THE FOCKIS ADMIN CENTER  (/admin/academy/*)
   Fockis administrators (main Fockis accounts, academy.view / academy.manage)
   oversee everything people publish on Fockis Academy:
     - classes, seminars, workshops and live classes (take down / restore,
       open or close enrollment, see learners and sales)
     - schools & organizations (approve, reject, block, unblock)
     - certificates (search, revoke, restore)
     - learner and creator accounts (suspend, reactivate)
   Payments are only read from enrollments; nothing here moves money.
============================================================================ */

export interface AdminActor {
  id: string;
  name: string;
}

const PAGE = 25;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const KINDS = ["course", "seminar", "live_class", "workshop"];

type ClassStatus = "live" | "draft" | "unlisted" | "taken_down" | "school_blocked";

function classStatus(c: { visibility?: string; takenDown?: boolean; institutionBlocked?: boolean }): ClassStatus {
  if (c.takenDown) return "taken_down";
  if (c.institutionBlocked) return "school_blocked";
  if (c.visibility === "draft") return "draft";
  if (!c.visibility || c.visibility === "public") return "live";
  return "unlisted";
}

function addRevenue(target: Record<string, number>, rows: { currency?: string; amount?: number }[]) {
  for (const r of rows) {
    if (r.amount && r.currency) target[r.currency] = Math.round(((target[r.currency] ?? 0) + r.amount) * 100) / 100;
  }
  return target;
}

@Injectable()
export class AcademyAdminCenterService {
  private readonly logger = new Logger(AcademyAdminCenterService.name);

  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(AcademyUser.name) private readonly userModel: Model<AcademyUser>,
    @InjectModel(IssuedCertificate.name) private readonly certModel: Model<IssuedCertificate>,
    @InjectModel(AcademyInstitution.name) private readonly instModel: Model<AcademyInstitution>,
    private readonly institutions: InstitutionsService,
    private readonly certificates: CertificatesService,
    private readonly billing: DomainBillingService,
  ) {}

  /** The Fockis admin, as the Academy services record decisions. */
  private academyActor(actor: AdminActor) {
    return { userId: actor.id, name: `${actor.name} (Fockis admin)`, email: "", role: "administrator" };
  }

  private page(n?: string | number) {
    return Math.max(1, Math.min(1000, Number(n) || 1));
  }

  /* ---------------------------------------------------------------- overview */

  async overview() {
    const since = new Date(Date.now() - 30 * 86400_000);
    const [kinds, statusRows, schools, learners, managed, suspended, enrollments, recentEnrollments, certs, revenueRows, newest, pendingSchools, creatorRows] = await Promise.all([
      this.courseModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: { $ifNull: ["$kind", "course"] }, n: { $sum: 1 } } }]).exec(),
      this.courseModel.find({}, { visibility: 1, takenDown: 1, institutionBlocked: 1 }).lean().exec(),
      this.instModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).exec(),
      this.userModel.countDocuments({}).exec(),
      this.userModel.countDocuments({ managed: true }).exec(),
      this.userModel.countDocuments({ isActive: false }).exec(),
      this.enrollmentModel.countDocuments({}).exec(),
      this.enrollmentModel.countDocuments({ createdAt: { $gte: since } }).exec(),
      this.certModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).exec(),
      this.enrollmentModel
        .aggregate<{ _id: string; amount: number }>([{ $match: { paidAmount: { $gt: 0 } } }, { $group: { _id: "$paidCurrency", amount: { $sum: "$paidAmount" } } }])
        .exec(),
      this.courseModel.find({}, { code: 1, name: 1, kind: 1, brandName: 1, instructor: 1, visibility: 1, takenDown: 1, institutionBlocked: 1, createdAt: 1, isFree: 1, price: 1, currency: 1 }).sort({ createdAt: -1 }).limit(6).lean().exec(),
      this.instModel.find({ status: "pending" }, { name: 1, slug: 1, type: 1, city: 1, country: 1, createdAt: 1 }).sort({ createdAt: 1 }).limit(6).lean().exec(),
      this.userModel.aggregate<{ _id: string; n: number }>([{ $match: { creatorStatus: { $in: ["pending", "approved", "rejected", "suspended"] } } }, { $group: { _id: "$creatorStatus", n: { $sum: 1 } } }]).exec(),
    ]);
    const byStatus: Record<ClassStatus, number> = { live: 0, draft: 0, unlisted: 0, taken_down: 0, school_blocked: 0 };
    for (const c of statusRows) byStatus[classStatus(c)]++;
    return {
      classes: {
        total: statusRows.length,
        byKind: Object.fromEntries(KINDS.map((k) => [k, kinds.find((r) => r._id === k)?.n ?? 0])),
        byStatus,
      },
      schools: Object.fromEntries(["pending", "approved", "rejected", "blocked"].map((s) => [s, schools.find((r) => r._id === s)?.n ?? 0])),
      accounts: { total: learners, schoolLogins: managed, suspended },
      enrollments: { total: enrollments, last30Days: recentEnrollments },
      certificates: { valid: certs.find((r) => r._id === "valid")?.n ?? 0, revoked: certs.find((r) => r._id === "revoked")?.n ?? 0 },
      revenue: Object.fromEntries(revenueRows.filter((r) => r._id).map((r) => [r._id, Math.round(r.amount * 100) / 100])),
      newestClasses: newest.map((c) => ({ ...c, status: classStatus(c) })),
      pendingSchools,
      creators: Object.fromEntries(["pending", "approved", "rejected", "suspended"].map((st) => [st, creatorRows.find((r) => r._id === st)?.n ?? 0])),
    };
  }

  /* ---------------------------------------------------------------- classes */

  async listClasses(query: { q?: string; kind?: string; status?: string; school?: string; price?: string; page?: string }) {
    const page = this.page(query.page);
    const filter: Record<string, unknown> = {};
    const and: Record<string, unknown>[] = [];
    if (query.kind && KINDS.includes(query.kind)) filter.kind = query.kind === "course" ? { $in: ["course", null] } : query.kind;
    switch (query.status) {
      case "live":
        and.push({ $or: [{ visibility: "public" }, { visibility: { $exists: false } }] }, { takenDown: { $ne: true } }, { institutionBlocked: { $ne: true } });
        break;
      case "draft":
        filter.visibility = "draft";
        break;
      case "unlisted":
        filter.visibility = { $in: ["hidden", "private", "school"] };
        break;
      case "taken_down":
        filter.takenDown = true;
        break;
      case "school_blocked":
        filter.institutionBlocked = true;
        break;
    }
    if (query.price === "free") filter.isFree = { $ne: false };
    if (query.price === "paid") filter.isFree = false;
    if (query.school && Types.ObjectId.isValid(query.school)) filter.institutionId = new Types.ObjectId(query.school);
    const q = String(query.q ?? "").trim().slice(0, 80);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      and.push({ $or: [{ name: re }, { code: re }, { brandName: re }, { instructor: re }, { teacherName: re }, { category: re }] });
    }
    if (and.length) filter.$and = and;

    const [rows, total] = await Promise.all([
      this.courseModel
        .find(filter as any, { lessons: 0, modules: 0, assignments: 0, description: 0 })
        .sort({ updatedAt: -1 })
        .skip((page - 1) * PAGE)
        .limit(PAGE)
        .lean()
        .exec(),
      this.courseModel.countDocuments(filter as any).exec(),
    ]);
    const codes = rows.map((r) => r.code);
    const stats = await this.enrollmentModel
      .aggregate<{ _id: string; learners: number; paid: { currency?: string; amount?: number }[] }>([
        { $match: { courseCode: { $in: codes } } },
        { $group: { _id: "$courseCode", learners: { $sum: 1 }, paid: { $push: { currency: "$paidCurrency", amount: "$paidAmount" } } } },
      ])
      .exec();
    const byCode = new Map(stats.map((s) => [s._id, s]));
    const schoolIds = rows.map((r) => r.institutionId).filter((id): id is Types.ObjectId => !!id);
    const schools = schoolIds.length ? await this.instModel.find({ _id: { $in: schoolIds } }, { name: 1, slug: 1, status: 1 }).lean().exec() : [];
    const schoolById = new Map(schools.map((s) => [String(s._id), s]));
    return {
      items: rows.map((c) => {
        const s = byCode.get(c.code);
        return {
          id: String(c._id),
          code: c.code,
          name: c.name,
          kind: c.kind || "course",
          brandName: c.brandName ?? "",
          instructor: c.teacherName || c.instructor,
          category: c.category ?? "",
          isFree: c.isFree !== false,
          price: c.price ?? 0,
          currency: c.currency ?? "USD",
          visibility: c.visibility ?? "public",
          enrollmentOpen: c.enrollmentOpen !== false,
          status: classStatus(c),
          studio: !!c.studio,
          school: c.institutionId ? (schoolById.get(String(c.institutionId)) ?? null) : null,
          learners: s?.learners ?? 0,
          revenue: addRevenue({}, s?.paid ?? []),
          startsAt: c.startsAt ?? null,
          updatedAt: (c as { updatedAt?: Date }).updatedAt ?? null,
        };
      }),
      page,
      total,
      hasMore: page * PAGE < total,
    };
  }

  private async findCourse(code: string) {
    const course = await this.courseModel.findOne({ code: String(code ?? "").toUpperCase().trim() }).exec();
    if (!course) throw new NotFoundException("Class not found.");
    return course;
  }

  async classDetail(code: string) {
    const course = await this.findCourse(code);
    const c = course.toObject();
    const [owner, school, enrollments, total, completed, paidRows, certificates] = await Promise.all([
      this.userModel.findById(c.instructorId, { name: 1, email: 1, role: 1, isActive: 1, createdAt: 1 }).lean().exec(),
      c.institutionId ? this.instModel.findById(c.institutionId, { name: 1, slug: 1, status: 1 }).lean().exec() : null,
      this.enrollmentModel.find({ courseCode: c.code }).sort({ createdAt: -1 }).limit(50).lean().exec(),
      this.enrollmentModel.countDocuments({ courseCode: c.code }).exec(),
      this.enrollmentModel.countDocuments({ courseCode: c.code, progress: { $gte: 100 } }).exec(),
      this.enrollmentModel.find({ courseCode: c.code, paidAmount: { $gt: 0 } }, { paidAmount: 1, paidCurrency: 1 }).lean().exec(),
      this.certModel.countDocuments({ activityRef: c.code }).exec(),
    ]);
    const students = await this.userModel.find({ _id: { $in: enrollments.map((e) => e.studentId) } }, { name: 1, email: 1 }).lean().exec();
    const studentById = new Map(students.map((s) => [String(s._id), s]));
    const lessonTypes: Record<string, number> = {};
    for (const l of c.lessons ?? []) lessonTypes[l.type] = (lessonTypes[l.type] ?? 0) + 1;
    return {
      id: String(c._id),
      code: c.code,
      name: c.name,
      kind: c.kind || "course",
      summary: c.summary ?? "",
      description: c.description ?? "",
      brandName: c.brandName ?? "",
      category: c.category ?? "",
      level: c.level,
      language: c.language ?? "",
      instructor: c.teacherName || c.instructor,
      isFree: c.isFree !== false,
      price: c.price ?? 0,
      currency: c.currency ?? "USD",
      capacity: c.capacity ?? 0,
      startsAt: c.startsAt ?? null,
      visibility: c.visibility ?? "public",
      enrollmentOpen: c.enrollmentOpen !== false,
      certificateEnabled: c.certificateEnabled !== false,
      status: classStatus(c),
      takenDownReason: c.takenDownReason ?? "",
      takenDownAt: c.takenDownAt ?? null,
      takenDownBy: c.takenDownBy ?? "",
      studio: !!c.studio,
      lessons: (c.lessons ?? []).map((l) => ({ key: l.key, order: l.order, title: l.title, type: l.type, preview: !!l.preview, section: l.section ?? "" })),
      lessonTypes,
      owner,
      school,
      stats: { learners: total, completed, certificates, revenue: addRevenue({}, paidRows.map((p) => ({ currency: p.paidCurrency, amount: p.paidAmount }))) },
      enrollments: enrollments.map((e) => ({
        id: String(e._id),
        student: studentById.get(String(e.studentId)) ?? null,
        progress: e.progress ?? 0,
        accessType: e.accessType ?? "free",
        paidAmount: e.paidAmount ?? 0,
        paidCurrency: e.paidCurrency ?? "",
        completedAt: e.completedAt ?? null,
        createdAt: e.createdAt ?? null,
      })),
      createdAt: (c as { createdAt?: Date }).createdAt ?? null,
      updatedAt: (c as { updatedAt?: Date }).updatedAt ?? null,
    };
  }

  async takeDown(code: string, reason: string | undefined, actor: AdminActor) {
    const text = String(reason ?? "").trim();
    if (text.length < 5) throw new BadRequestException("Give a reason — the creator sees it in Creator Studio.");
    const course = await this.findCourse(code);
    course.takenDown = true;
    course.takenDownReason = text.slice(0, 500);
    course.takenDownAt = new Date();
    course.takenDownBy = actor.name;
    await course.save();
    this.logger.log(`Class ${course.code} taken down by ${actor.id}: ${text}`);
    return this.classDetail(code);
  }

  async restore(code: string, actor: AdminActor) {
    const course = await this.findCourse(code);
    if (!course.takenDown) throw new BadRequestException("This class isn't taken down.");
    course.takenDown = false;
    course.takenDownReason = undefined;
    course.takenDownAt = undefined;
    course.takenDownBy = undefined;
    await course.save();
    this.logger.log(`Class ${course.code} restored by ${actor.id}`);
    return this.classDetail(code);
  }

  async setEnrollment(code: string, open: boolean, actor: AdminActor) {
    const course = await this.findCourse(code);
    course.enrollmentOpen = open;
    await course.save();
    this.logger.log(`Class ${course.code} enrollment ${open ? "opened" : "closed"} by ${actor.id}`);
    return this.classDetail(code);
  }

  /* ---------------------------------------------------------------- creators */

  async listCreators(query: { q?: string; status?: string; page?: string }) {
    const page = this.page(query.page);
    const statuses = ["pending", "approved", "rejected", "suspended"];
    const filter: Record<string, unknown> = { creatorStatus: statuses.includes(String(query.status)) ? query.status : { $in: statuses } };
    const q = String(query.q ?? "").trim().slice(0, 80);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: re }, { email: re }, { "creatorProfile.displayName": re }, { "creatorProfile.businessName": re }];
    }
    const sort: Record<string, 1 | -1> = query.status === "pending" || !query.status ? { creatorAppliedAt: 1 } : { creatorReviewedAt: -1 };
    const [rows, total, counts] = await Promise.all([
      this.userModel
        .find(filter as any, { name: 1, email: 1, creatorStatus: 1, creatorProfile: 1, creatorReason: 1, creatorAppliedAt: 1, creatorReviewedAt: 1, createdAt: 1 })
        .sort(sort)
        .skip((page - 1) * PAGE)
        .limit(PAGE)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter as any).exec(),
      this.userModel.aggregate<{ _id: string; n: number }>([{ $match: { creatorStatus: { $in: statuses } } }, { $group: { _id: "$creatorStatus", n: { $sum: 1 } } }]).exec(),
    ]);
    const classes = await this.courseModel
      .aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { instructorId: { $in: rows.map((r) => r._id) } } }, { $group: { _id: "$instructorId", n: { $sum: 1 } } }])
      .exec();
    const nBy = new Map(classes.map((c) => [String(c._id), c.n]));
    return {
      items: rows.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        status: u.creatorStatus,
        kind: u.creatorProfile?.kind ?? "person",
        displayName: u.creatorProfile?.displayName ?? u.name,
        businessName: u.creatorProfile?.businessName ?? "",
        topics: u.creatorProfile?.topics ?? "",
        city: u.creatorProfile?.city ?? "",
        country: u.creatorProfile?.country ?? "",
        reason: u.creatorReason ?? "",
        appliedAt: u.creatorAppliedAt ?? null,
        reviewedAt: u.creatorReviewedAt ?? null,
        classes: nBy.get(String(u._id)) ?? 0,
      })),
      counts: Object.fromEntries(statuses.map((st) => [st, counts.find((c) => c._id === st)?.n ?? 0])),
      page,
      total,
      hasMore: page * PAGE < total,
    };
  }

  async creatorDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Creator not found.");
    const u = await this.userModel
      .findById(id, { name: 1, email: 1, role: 1, isActive: 1, managed: 1, createdAt: 1, creatorStatus: 1, creatorProfile: 1, creatorReason: 1, creatorAppliedAt: 1, creatorReviewedAt: 1, creatorReviewedBy: 1, creatorHistory: 1 })
      .lean()
      .exec();
    if (!u) throw new NotFoundException("Creator not found.");
    const classes = await this.courseModel
      .find({ instructorId: u._id }, { code: 1, name: 1, kind: 1, visibility: 1, takenDown: 1, institutionBlocked: 1, creatorBlocked: 1, institutionId: 1, isFree: 1, price: 1, currency: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.isActive !== false,
      memberSince: u.createdAt ?? null,
      status: u.creatorStatus ?? "none",
      profile: u.creatorProfile ?? null,
      reason: u.creatorReason ?? "",
      appliedAt: u.creatorAppliedAt ?? null,
      reviewedAt: u.creatorReviewedAt ?? null,
      reviewedBy: u.creatorReviewedBy ?? "",
      history: u.creatorHistory ?? [],
      classes: classes.map((c) => ({
        code: c.code,
        name: c.name,
        kind: c.kind || "course",
        school: !!c.institutionId,
        status: c.creatorBlocked ? "creator_blocked" : classStatus(c),
        isFree: c.isFree !== false,
        price: c.price ?? 0,
        currency: c.currency ?? "USD",
      })),
    };
  }

  async setCreatorStatus(id: string, action: "approve" | "reject" | "suspend" | "unsuspend", reason: string | undefined, actor: AdminActor) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Creator not found.");
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException("Creator not found.");
    const text = String(reason ?? "").trim().slice(0, 500);
    const from = user.creatorStatus ?? "none";
    const allowed: Record<string, string[]> = {
      approve: ["pending", "rejected"],
      reject: ["pending"],
      suspend: ["approved"],
      unsuspend: ["suspended"],
    };
    if (!allowed[action]?.includes(from)) throw new BadRequestException(`This creator is "${from}" — that action isn't possible now.`);
    if ((action === "reject" || action === "suspend") && text.length < 5) throw new BadRequestException("Give a reason — the creator sees it in Creator Studio.");

    const next = action === "approve" || action === "unsuspend" ? "approved" : action === "reject" ? "rejected" : "suspended";
    const now = new Date();
    user.creatorStatus = next;
    user.creatorReason = action === "reject" || action === "suspend" ? text : undefined;
    user.creatorReviewedAt = now;
    user.creatorReviewedBy = actor.name;
    user.creatorHistory = [...(user.creatorHistory ?? []), { action: { approve: "approved", reject: "rejected", suspend: "suspended", unsuspend: "unsuspended" }[action], reason: text || undefined, byName: actor.name, at: now }];
    user.markModified("creatorHistory");
    await user.save();

    // Suspending hides the creator's own classes (not ones offered by a school); unsuspending brings them back.
    if (action === "suspend" || action === "unsuspend") {
      await this.courseModel
        .updateMany({ instructorId: user._id, $or: [{ institutionId: { $exists: false } }, { institutionId: null }] }, { $set: { creatorBlocked: action === "suspend" } })
        .exec();
    }
    this.logger.log(`Creator ${user.email} ${next} by ${actor.id}${text ? `: ${text}` : ""}`);
    return this.creatorDetail(id);
  }

  /* ---------------------------------------------------------------- schools */

  listSchools(status?: string) {
    return this.institutions.adminList(status);
  }

  getSchool(id: string) {
    return this.institutions.adminGet(id);
  }

  setSchoolStatus(id: string, action: string, reason: string | undefined, actor: AdminActor) {
    if (!["approve", "reject", "block", "unblock"].includes(action)) throw new BadRequestException("Unknown action.");
    return this.institutions.adminSetStatus(id, action as "approve" | "reject" | "block" | "unblock", reason, this.academyActor(actor));
  }

  /* ---------------------------------------------------------------- domain fees */

  schoolBilling(id: string, body: { action: "exempt" | "unexempt" | "set_paid_until" | "clear_paid"; until?: string; amount?: number; note?: string }, actor: AdminActor) {
    return this.billing.adminAction(id, body, `${actor.name} (Fockis admin)`);
  }

  /* ---------------------------------------------------------------- certificates */

  async listCertificates(query: { q?: string; status?: string; page?: string }) {
    const page = this.page(query.page);
    const filter: Record<string, unknown> = {};
    if (query.status === "valid" || query.status === "revoked") filter.status = query.status;
    const q = String(query.q ?? "").trim().slice(0, 80);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { certificateNumber: q.toUpperCase() },
        { verificationId: q.toUpperCase() },
        { enrollmentNumber: q.toUpperCase() },
        { recipientName: re },
        { recipientEmail: re },
        { activityName: re },
        { activityRef: q.toUpperCase() },
        { institutionName: re },
      ];
    }
    const [rows, total] = await Promise.all([
      this.certModel.find(filter as any, { design: 0 }).sort({ issuedAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean().exec(),
      this.certModel.countDocuments(filter as any).exec(),
    ]);
    return {
      items: rows.map((c) => ({
        id: String(c._id),
        certificateNumber: c.certificateNumber,
        verificationId: c.verificationId,
        enrollmentNumber: c.enrollmentNumber ?? "",
        recipientName: c.recipientName,
        recipientEmail: c.recipientEmail ?? "",
        activityType: c.activityType,
        activityRef: c.activityRef,
        activityName: c.activityName,
        instructorName: c.instructorName,
        institutionName: c.institutionName ?? "Fockis Academy",
        issuedAt: c.issuedAt,
        status: c.status,
        lastChange: c.history?.length ? c.history[c.history.length - 1] : null,
      })),
      page,
      total,
      hasMore: page * PAGE < total,
    };
  }

  async setCertificateStatus(id: string, revoke: boolean, reason: string | undefined, actor: AdminActor) {
    if (revoke && String(reason ?? "").trim().length < 5) throw new BadRequestException("Give a reason — it shows when someone checks the certificate.");
    const c = await this.certificates.setStatus(id, revoke, reason?.trim(), this.academyActor(actor));
    return { id: String(c._id), status: c.status };
  }

  /* ---------------------------------------------------------------- accounts */

  async listAccounts(query: { q?: string; role?: string; status?: string; page?: string }) {
    const page = this.page(query.page);
    const filter: Record<string, unknown> = {};
    if (query.role && /^[a-z_]{2,20}$/.test(query.role)) filter.role = query.role;
    if (query.status === "suspended") filter.isActive = false;
    if (query.status === "active") filter.isActive = { $ne: false };
    if (query.status === "school") filter.managed = true;
    const q = String(query.q ?? "").trim().slice(0, 80);
    if (q) {
      const re = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: re }, { email: re }, { personalEmail: re }];
    }
    const [rows, total] = await Promise.all([
      this.userModel
        .find(filter as any, { name: 1, email: 1, role: 1, isActive: 1, managed: 1, institutionId: 1, suspendedReason: 1, createdAt: 1, loginHistory: { $slice: 1 } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE)
        .limit(PAGE)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter as any).exec(),
    ]);
    const ids = rows.map((r) => r._id);
    const [owned, enrolled, schools] = await Promise.all([
      this.courseModel.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { instructorId: { $in: ids } } }, { $group: { _id: "$instructorId", n: { $sum: 1 } } }]).exec(),
      this.enrollmentModel.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { studentId: { $in: ids } } }, { $group: { _id: "$studentId", n: { $sum: 1 } } }]).exec(),
      this.instModel.find({ _id: { $in: rows.map((r) => r.institutionId).filter((id): id is Types.ObjectId => !!id) } }, { name: 1, slug: 1 }).lean().exec(),
    ]);
    const ownedBy = new Map(owned.map((o) => [String(o._id), o.n]));
    const enrolledBy = new Map(enrolled.map((o) => [String(o._id), o.n]));
    const schoolById = new Map(schools.map((s) => [String(s._id), s]));
    return {
      items: rows.map((u) => {
        const last = (u as { loginHistory?: { createdAt?: Date }[] }).loginHistory?.[0];
        return {
          id: String(u._id),
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.isActive !== false,
          suspendedReason: u.suspendedReason ?? "",
          schoolLogin: !!u.managed,
          school: u.institutionId ? (schoolById.get(String(u.institutionId)) ?? null) : null,
          classesCreated: ownedBy.get(String(u._id)) ?? 0,
          enrollments: enrolledBy.get(String(u._id)) ?? 0,
          createdAt: u.createdAt ?? null,
          lastLoginAt: last?.createdAt ?? null,
        };
      }),
      page,
      total,
      hasMore: page * PAGE < total,
    };
  }

  async setAccountActive(id: string, active: boolean, reason: string | undefined, actor: AdminActor) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Account not found.");
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException("Account not found.");
    if (!active) {
      const text = String(reason ?? "").trim();
      if (text.length < 5) throw new BadRequestException("Give a reason — the person sees it when they try to sign in.");
      if (user.role === "administrator") throw new BadRequestException("Academy administrator accounts can't be suspended here.");
      user.isActive = false;
      user.suspendedReason = text.slice(0, 300);
    } else {
      user.isActive = true;
      user.suspendedReason = undefined;
    }
    await user.save();
    this.logger.log(`Academy account ${user.email} ${active ? "reactivated" : "suspended"} by ${actor.id}`);
    return { id: String(user._id), active: user.isActive, suspendedReason: user.suspendedReason ?? "" };
  }
}
