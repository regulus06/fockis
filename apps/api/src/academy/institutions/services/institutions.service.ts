import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcrypt";
import { randomBytes, randomUUID } from "crypto";

import { AcademyInstitution, InstitutionDocument, InstitutionStatus, InstitutionTeacher } from "../schemas/institution.schema";
import { StudentApplication } from "../schemas/student-application.schema";
import { AcademyUser, AcademyUserDocument } from "../../auth/schemas/academy-user.schema";
import { Course } from "../../courses/schemas/course.schema";
import { AddStaffDto, ApplyDto, NewStudentDto, SaveInstitutionDto, TeacherDto } from "../dto/institution.dto";

// Existing Fockis storage, reused unchanged (signed link to the proof document).
import { CloudStorageService } from "../../../uploads/cloud-storage.service";

export interface AcademyActor {
  userId: string;
  name: string;
  email: string;
  role: string;
}

/** Root domain for school logins: amara.j@<slug>.fockis.com */
export const SCHOOL_DOMAIN_ROOT = "fockis.com";
const ADMINS = ["administrator", "staff"];
/** Sub-domains nobody can register. */
const RESERVED = new Set(["www", "mail", "api", "admin", "academy", "app", "support", "help", "static", "cdn", "fockis", "staff", "root", "test", "demo", "login", "auth", "billing", "pay", "payments", "meet", "meetings", "verify"]);
const PW_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export interface IssuedCredentials {
  userId: string;
  name: string;
  loginId: string;
  temporaryPassword: string;
  personalEmail?: string;
  /** Email delivery is not connected yet — staff hand the credentials over. */
  emailed: false;
}

function tempPassword(): string {
  const b = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += PW_ALPHABET[b[i] % PW_ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

function usernameFrom(name: string): string {
  const parts = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "student";
  const first = parts[0].slice(0, 20);
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return last ? `${first}.${last}` : first;
}

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(
    @InjectModel(AcademyInstitution.name) private readonly instModel: Model<AcademyInstitution>,
    @InjectModel(StudentApplication.name) private readonly appModel: Model<StudentApplication>,
    @InjectModel(AcademyUser.name) private readonly userModel: Model<AcademyUser>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    private readonly storage: CloudStorageService,
  ) {}

  domainOf(inst: { slug: string }) {
    return `${inst.slug}.${SCHOOL_DOMAIN_ROOT}`;
  }

  // ======================================================================
  // PUBLIC
  // ======================================================================

  async slugAvailable(raw: string) {
    const slug = String(raw || "").trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(slug)) return { slug, available: false, reason: "Use 3–30 lowercase letters, numbers or dashes." };
    if (RESERVED.has(slug)) return { slug, available: false, reason: "That name is reserved." };
    const taken = await this.instModel.exists({ slug });
    return { slug, domain: `${slug}.${SCHOOL_DOMAIN_ROOT}`, available: !taken, reason: taken ? "Already taken." : undefined };
  }

  async directory() {
    const list = await this.instModel
      .find({ status: "approved" }, { name: 1, slug: 1, type: 1, city: 1, country: 1, logoUrl: 1, description: 1 })
      .sort({ name: 1 })
      .lean()
      .exec();
    return list.map((i) => ({ ...i, domain: this.domainOf(i) }));
  }

  async publicProfile(slug: string) {
    const inst = await this.instModel.findOne({ slug: String(slug).toLowerCase(), status: "approved" }).lean().exec();
    if (!inst) throw new NotFoundException("School not found.");
    const [classes, students] = await Promise.all([
      this.courseModel
        .find({ institutionId: inst._id, visibility: { $in: ["public", "school"] } })
        .select("code name kind brandName isFree price currency coverUrl summary lessons.type startsAt visibility")
        .sort({ updatedAt: -1 })
        .lean()
        .exec(),
      this.userModel.countDocuments({ institutionId: inst._id, isActive: true }).exec(),
    ]);
    return {
      _id: String(inst._id),
      name: inst.name,
      slug: inst.slug,
      domain: this.domainOf(inst),
      type: inst.type,
      description: inst.description,
      country: inst.country,
      city: inst.city,
      address: inst.address,
      website: inst.website,
      phone: inst.phone,
      contactEmail: inst.contactEmail,
      logoUrl: inst.logoUrl,
      allowApplications: inst.allowApplications !== false,
      verifiedAt: inst.reviewedAt,
      students,
      classes,
      teachers: await this.teachersWithClasses(inst, true),
    };
  }

  async apply(slug: string, dto: ApplyDto) {
    const inst = await this.instModel.findOne({ slug: String(slug).toLowerCase() }).exec();
    if (!inst || inst.status !== "approved") throw new NotFoundException("School not found.");
    if (inst.allowApplications === false) throw new BadRequestException("This school is not accepting applications online.");
    const personalEmail = dto.personalEmail.trim().toLowerCase();
    const pending = await this.appModel.exists({ institutionId: inst._id, personalEmail, status: "pending" });
    if (pending) throw new ConflictException("You already have an application waiting for review at this school.");
    await this.appModel.create({
      institutionId: inst._id,
      name: dto.name.trim(),
      personalEmail,
      phone: dto.phone?.trim(),
      program: dto.program?.trim(),
      message: dto.message?.trim(),
      status: "pending",
    });
    return { message: `Application sent to ${inst.name}. The school will review it and give you your login.` };
  }

  // ======================================================================
  // OWNER / STAFF
  // ======================================================================

  async register(dto: SaveInstitutionDto, actor: AcademyActor) {
    if (!dto.name?.trim()) throw new BadRequestException("Enter the name of your school or organization.");
    if (!dto.slug) throw new BadRequestException("Choose the domain name for your school.");
    const check = await this.slugAvailable(dto.slug);
    if (!check.available) throw new ConflictException(`${dto.slug}.${SCHOOL_DOMAIN_ROOT}: ${check.reason}`);
    const open = await this.instModel.countDocuments({ ownerId: new Types.ObjectId(actor.userId), status: { $in: ["pending", "rejected"] } });
    if (open >= 3) throw new BadRequestException("You already have registrations waiting for review.");

    const inst = await this.instModel.create({
      ...this.pickDetails(dto),
      name: dto.name.trim(),
      slug: check.slug,
      ownerId: new Types.ObjectId(actor.userId),
      staff: [],
      status: "pending",
      history: [{ action: "submitted", by: new Types.ObjectId(actor.userId), byName: actor.name, at: new Date() }],
    });
    return this.forStaff(inst);
  }

  async mine(actor: AcademyActor) {
    const uid = new Types.ObjectId(actor.userId);
    const list = await this.instModel.find({ $or: [{ ownerId: uid }, { "staff.userId": uid }] }).sort({ createdAt: -1 }).exec();
    return Promise.all(list.map((i) => this.forStaff(i, actor)));
  }

  async getForStaff(id: string, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    return this.forStaff(inst, actor);
  }

  async update(id: string, dto: SaveInstitutionDto, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false, true);
    if (inst.status === "blocked") throw new ForbiddenException("This school is blocked. Contact Fockis Academy support.");
    Object.assign(inst, this.pickDetails(dto));
    if (dto.name?.trim()) inst.name = dto.name.trim();
    if (dto.slug && dto.slug !== inst.slug) {
      if (inst.status === "approved") throw new BadRequestException("The domain of an approved school can't be changed — student logins depend on it.");
      const check = await this.slugAvailable(dto.slug);
      if (!check.available) throw new ConflictException(`${dto.slug}.${SCHOOL_DOMAIN_ROOT}: ${check.reason}`);
      inst.slug = check.slug;
    }
    await inst.save();
    if (dto.name?.trim()) await this.courseModel.updateMany({ institutionId: inst._id }, { $set: { brandName: inst.name } }).exec();
    return this.forStaff(inst, actor);
  }

  async resubmit(id: string, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false, true);
    if (inst.status !== "rejected") throw new BadRequestException("Only a rejected registration can be sent again.");
    inst.status = "pending";
    inst.statusReason = undefined;
    inst.history.push({ action: "resubmitted", by: new Types.ObjectId(actor.userId), byName: actor.name, at: new Date() });
    inst.markModified("history");
    await inst.save();
    return this.forStaff(inst, actor);
  }

  // ---------------------------------------------------------------- staff members

  async addStaff(id: string, dto: AddStaffDto, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, true, true);
    const user = await this.userModel.findOne({ email: dto.email.trim().toLowerCase() }).exec();
    if (!user) throw new NotFoundException("No Academy account uses that email. Ask them to create one first.");
    if (String(user._id) === String(inst.ownerId) || inst.staff.some((s) => String(s.userId) === String(user._id))) {
      throw new ConflictException("That person is already on the staff.");
    }
    inst.staff.push({ userId: user._id, role: dto.role ?? "staff", addedAt: new Date() });
    inst.markModified("staff");
    await inst.save();
    return this.forStaff(inst, actor);
  }

  async removeStaff(id: string, userId: string, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, true, true);
    inst.staff = inst.staff.filter((s) => String(s.userId) !== userId);
    inst.markModified("staff");
    await inst.save();
    return this.forStaff(inst, actor);
  }

  // ---------------------------------------------------------------- teachers

  async addTeacher(id: string, dto: TeacherDto, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, true, true);
    if (inst.status === "blocked") throw new ForbiddenException("This school is blocked.");
    if ((inst.teachers ?? []).length >= 500) throw new BadRequestException("Teacher list is full.");
    inst.teachers = [...(inst.teachers ?? []), { key: `T${randomBytes(5).toString("hex")}`, ...this.cleanTeacher(dto) }];
    inst.markModified("teachers");
    await inst.save();
    return this.forStaff(inst, actor);
  }

  async updateTeacher(id: string, key: string, dto: TeacherDto, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, true, true);
    const i = (inst.teachers ?? []).findIndex((t) => t.key === key);
    if (i < 0) throw new NotFoundException("Teacher not found.");
    inst.teachers[i] = { key, ...this.cleanTeacher(dto) };
    inst.markModified("teachers");
    await inst.save();
    // Keep the name shown on this teacher's classes up to date.
    await this.courseModel.updateMany({ institutionId: inst._id, teacherKey: key }, { $set: { teacherName: inst.teachers[i].name } }).exec();
    return this.forStaff(inst, actor);
  }

  async removeTeacher(id: string, key: string, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, true, true);
    inst.teachers = (inst.teachers ?? []).filter((t) => t.key !== key);
    inst.markModified("teachers");
    await inst.save();
    // Their classes stay; they just no longer name a teacher (certificates already issued keep the name).
    await this.courseModel.updateMany({ institutionId: inst._id, teacherKey: key }, { $unset: { teacherKey: "", teacherName: "" } }).exec();
    return this.forStaff(inst, actor);
  }

  private cleanTeacher(dto: TeacherDto): Omit<InstitutionTeacher, "key"> {
    const t = (v?: string) => v?.trim() || undefined;
    const photoUrl = t(dto.photoUrl);
    if (photoUrl && !photoUrl.startsWith("/uploads/media/academy/covers/") && !/^https:\/\//.test(photoUrl)) throw new BadRequestException("Invalid photo.");
    const meetingUrl = t(dto.meetingUrl);
    if (meetingUrl && !/^https?:\/\//i.test(meetingUrl)) throw new BadRequestException("The meeting link must start with http:// or https://.");
    return {
      name: dto.name.trim(),
      title: t(dto.title),
      department: t(dto.department),
      bio: t(dto.bio),
      photoUrl,
      email: t(dto.email)?.toLowerCase(),
      contactEnabled: !!dto.contactEnabled,
      contactEmail: t(dto.contactEmail)?.toLowerCase(),
      contactPhone: t(dto.contactPhone),
      officeHours: t(dto.officeHours),
      meetingUrl,
    };
  }

  /** Each teacher with the classes (subjects) they teach. */
  private async teachersWithClasses(inst: { _id: Types.ObjectId; teachers?: InstitutionTeacher[] }, publicOnly: boolean) {
    const teachers = inst.teachers ?? [];
    if (!teachers.length) return [];
    const q: Record<string, unknown> = { institutionId: inst._id, teacherKey: { $in: teachers.map((t) => t.key) } };
    if (publicOnly) q.visibility = { $in: ["public", "school"] };
    const classes = await this.courseModel.find(q, { code: 1, name: 1, teacherKey: 1, visibility: 1 }).lean().exec();
    return teachers.map((t) => ({
      // The public school page never shows contact details — only enrolled students see them, in their class.
      ...(publicOnly
        ? { key: t.key, name: t.name, title: t.title, department: t.department, bio: t.bio, photoUrl: t.photoUrl }
        : t),
      classes: classes.filter((c) => c.teacherKey === t.key).map((c) => ({ code: c.code, name: c.name, visibility: c.visibility })),
    }));
  }

  // ---------------------------------------------------------------- applications

  async applications(id: string, status: string | undefined, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    const q: Record<string, unknown> = { institutionId: inst._id };
    if (status && ["pending", "approved", "rejected"].includes(status)) q.status = status;
    return this.appModel.find(q).sort({ createdAt: -1 }).limit(1000).lean().exec();
  }

  async approveApplication(id: string, appId: string, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    this.assertApproved(inst);
    const app = await this.appModel.findOne({ _id: this.oid(appId), institutionId: inst._id }).exec();
    if (!app) throw new NotFoundException("Application not found.");
    if (app.status !== "pending") throw new BadRequestException(`This application was already ${app.status}.`);
    const creds = await this.createStudent(inst, { name: app.name, personalEmail: app.personalEmail });
    app.status = "approved";
    app.userId = new Types.ObjectId(creds.userId);
    app.reviewedBy = new Types.ObjectId(actor.userId);
    app.reviewedAt = new Date();
    await app.save();
    return creds;
  }

  async rejectApplication(id: string, appId: string, reason: string | undefined, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    const app = await this.appModel.findOne({ _id: this.oid(appId), institutionId: inst._id }).exec();
    if (!app) throw new NotFoundException("Application not found.");
    if (app.status !== "pending") throw new BadRequestException(`This application was already ${app.status}.`);
    app.status = "rejected";
    app.reason = reason?.trim() || undefined;
    app.reviewedBy = new Types.ObjectId(actor.userId);
    app.reviewedAt = new Date();
    await app.save();
    return app.toObject();
  }

  // ---------------------------------------------------------------- students

  async students(id: string, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    const list = await this.userModel
      .find({ institutionId: inst._id, managed: true })
      .select("name email personalEmail isActive mustChangePassword suspendedReason createdAt loginHistory")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return list.map((u) => {
      const lastLogin = (u.loginHistory ?? []).find((h) => h.success)?.createdAt;
      return {
        userId: String(u._id),
        name: u.name,
        loginId: u.email,
        personalEmail: u.personalEmail,
        active: u.isActive !== false,
        mustChangePassword: !!u.mustChangePassword,
        suspendedReason: u.suspendedReason,
        createdAt: (u as { createdAt?: Date }).createdAt,
        lastLogin,
      };
    });
  }

  async addStudent(id: string, dto: NewStudentDto, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    this.assertApproved(inst);
    return this.createStudent(inst, dto);
  }

  async addStudents(id: string, list: NewStudentDto[], actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    this.assertApproved(inst);
    const created: IssuedCredentials[] = [];
    const failed: { name: string; error: string }[] = [];
    for (const s of list) {
      try {
        created.push(await this.createStudent(inst, s));
      } catch (e) {
        failed.push({ name: s.name, error: e instanceof Error ? e.message : "Could not create." });
      }
    }
    return { created, failed };
  }

  async resetStudentPassword(id: string, userId: string, actor: AcademyActor): Promise<IssuedCredentials> {
    const inst = await this.staffInstitution(id, actor, false);
    this.assertApproved(inst);
    const user = await this.schoolStudent(inst, userId);
    const pw = tempPassword();
    user.passwordHash = await bcrypt.hash(pw, 12);
    user.mustChangePassword = true;
    user.sessions = [];
    user.securityEvents.unshift({ id: randomUUID(), type: "password_reset_by_school", description: `Temporary password issued by ${inst.name}.`, createdAt: new Date() });
    await user.save();
    return { userId: String(user._id), name: user.name, loginId: user.email, temporaryPassword: pw, personalEmail: user.personalEmail, emailed: false };
  }

  async setStudentActive(id: string, userId: string, active: boolean, reason: string | undefined, actor: AcademyActor) {
    const inst = await this.staffInstitution(id, actor, false);
    const user = await this.schoolStudent(inst, userId);
    user.isActive = active;
    user.suspendedReason = active ? undefined : reason?.trim() || `Suspended by ${inst.name}.`;
    if (!active) user.sessions = [];
    await user.save();
    return { userId: String(user._id), active: user.isActive };
  }

  // ======================================================================
  // FOCKIS ACADEMY ADMINISTRATORS
  // ======================================================================

  async adminList(status?: string) {
    const q: Record<string, unknown> = {};
    if (status && ["pending", "approved", "rejected", "blocked"].includes(status)) q.status = status;
    const list = await this.instModel.find(q).sort({ updatedAt: -1 }).limit(2000).lean().exec();
    const owners = await this.userModel.find({ _id: { $in: list.map((i) => i.ownerId) } }, { name: 1, email: 1 }).lean().exec();
    const byId = new Map(owners.map((o) => [String(o._id), o]));
    const counts = await this.userModel
      .aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { institutionId: { $in: list.map((i) => i._id) } } }, { $group: { _id: "$institutionId", n: { $sum: 1 } } }])
      .exec();
    const nById = new Map(counts.map((c) => [String(c._id), c.n]));
    const totals = await this.instModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).exec();
    return {
      totals: Object.fromEntries(totals.map((t) => [t._id, t.n])),
      items: list.map((i) => ({
        ...i,
        domain: this.domainOf(i),
        owner: byId.get(String(i.ownerId)) ?? null,
        students: nById.get(String(i._id)) ?? 0,
        hasProof: !!i.proofStorageKey,
      })),
    };
  }

  async adminGet(id: string) {
    const inst = await this.instModel.findById(this.oid(id)).lean().exec();
    if (!inst) throw new NotFoundException("Institution not found.");
    const owner = await this.userModel.findById(inst.ownerId, { name: 1, email: 1, createdAt: 1 }).lean().exec();
    let proofUrl: string | undefined;
    if (inst.proofStorageKey) {
      proofUrl = await this.storage.getSignedUrl(inst.proofStorageKey, { expiresInSeconds: 3600 }).catch(() => undefined);
    }
    const [students, classes] = await Promise.all([
      this.userModel.countDocuments({ institutionId: inst._id }).exec(),
      this.courseModel.countDocuments({ institutionId: inst._id }).exec(),
    ]);
    return { ...inst, domain: this.domainOf(inst), owner, proofUrl, students, classes };
  }

  async adminSetStatus(id: string, action: "approve" | "reject" | "block" | "unblock", reason: string | undefined, actor: AcademyActor) {
    const inst = await this.instModel.findById(this.oid(id)).exec();
    if (!inst) throw new NotFoundException("Institution not found.");
    const allowed: Record<typeof action, InstitutionStatus[]> = {
      approve: ["pending", "rejected"],
      reject: ["pending"],
      block: ["approved", "pending", "rejected"],
      unblock: ["blocked"],
    };
    if (!allowed[action].includes(inst.status)) throw new BadRequestException(`A ${inst.status} institution can't be ${action === "unblock" ? "unblocked" : `${action}d`}.`);
    if ((action === "reject" || action === "block") && !reason?.trim()) throw new BadRequestException("Give a reason — the institution will see it.");

    const next: Record<typeof action, InstitutionStatus> = { approve: "approved", reject: "rejected", block: "blocked", unblock: "approved" };
    inst.status = next[action];
    inst.statusReason = action === "reject" || action === "block" ? reason!.trim() : undefined;
    inst.reviewedBy = new Types.ObjectId(actor.userId);
    inst.reviewedAt = new Date();
    inst.history.push({
      action: action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "block" ? "blocked" : "unblocked",
      reason: reason?.trim() || undefined,
      by: new Types.ObjectId(actor.userId),
      byName: actor.name,
      at: new Date(),
    });
    inst.markModified("history");
    await inst.save();

    // A blocked school's classes disappear from the catalog; unblocking restores them.
    if (action === "block" || action === "unblock") {
      await this.courseModel.updateMany({ institutionId: inst._id }, { $set: { institutionBlocked: action === "block" } }).exec();
    }
    this.logger.log(`Institution ${inst.slug} ${action} by ${actor.userId}`);
    return this.adminGet(id);
  }

  // ======================================================================
  // HELPERS (also used by Studio)
  // ======================================================================

  /** Approved institutions where this user is owner or staff. */
  async teachableFor(userId: string) {
    const uid = new Types.ObjectId(userId);
    return this.instModel.find({ status: "approved", $or: [{ ownerId: uid }, { "staff.userId": uid }] }, { name: 1, slug: 1 }).lean().exec();
  }

  private async createStudent(inst: InstitutionDocument, dto: NewStudentDto): Promise<IssuedCredentials> {
    const name = dto.name.trim();
    const personalEmail = dto.personalEmail?.trim().toLowerCase() || undefined;
    const domain = this.domainOf(inst);
    const base = (dto.username?.trim().toLowerCase() || usernameFrom(name)).replace(/[^a-z0-9._-]/g, "").slice(0, 30) || "student";

    let loginId = "";
    for (let n = 0; n < 50 && !loginId; n++) {
      const candidate = `${n === 0 ? base : `${base}${n + 1}`}@${domain}`;
      if (!(await this.userModel.exists({ email: candidate }))) loginId = candidate;
    }
    if (!loginId) throw new ConflictException(`Could not find a free username for ${name}.`);

    const pw = tempPassword();
    const user = await this.userModel.create({
      email: loginId,
      passwordHash: await bcrypt.hash(pw, 12),
      name,
      role: "student",
      isActive: true,
      managed: true,
      mustChangePassword: true,
      institutionId: inst._id,
      personalEmail,
      sessions: [],
      loginHistory: [],
      securityEvents: [{ id: randomUUID(), type: "account_created_by_school", description: `Account created by ${inst.name}.`, createdAt: new Date() }],
    });
    return { userId: String(user._id), name, loginId, temporaryPassword: pw, personalEmail, emailed: false };
  }

  private async schoolStudent(inst: InstitutionDocument, userId: string): Promise<AcademyUserDocument> {
    const user = await this.userModel.findOne({ _id: this.oid(userId), institutionId: inst._id, managed: true }).select("+passwordHash").exec();
    if (!user) throw new NotFoundException("Student not found in this school.");
    return user as AcademyUserDocument;
  }

  private assertApproved(inst: InstitutionDocument) {
    if (inst.status === "pending") throw new ForbiddenException("Your school is waiting for Fockis Academy approval. You can add students once it is approved.");
    if (inst.status === "rejected") throw new ForbiddenException("Your school registration was rejected. Update it and send it again.");
    if (inst.status === "blocked") throw new ForbiddenException("This school is blocked. Contact Fockis Academy support.");
  }

  /** Owner, staff admins (and, if !adminOnly, all staff) — plus Academy administrators. */
  private async staffInstitution(id: string, actor: AcademyActor, adminOnly: boolean, ownerOrAdminForEdit = false) {
    const inst = await this.instModel.findById(this.oid(id)).exec();
    if (!inst) throw new NotFoundException("School not found.");
    if (ADMINS.includes(actor.role)) return inst;
    const isOwner = String(inst.ownerId) === actor.userId;
    const member = inst.staff.find((s) => String(s.userId) === actor.userId);
    const isSchoolAdmin = isOwner || member?.role === "admin";
    if (!isOwner && !member) throw new ForbiddenException("You are not on this school's staff.");
    if ((adminOnly || ownerOrAdminForEdit) && !isSchoolAdmin) throw new ForbiddenException("Only the school's owner or admins can do this.");
    return inst;
  }

  private async forStaff(inst: InstitutionDocument, actor?: AcademyActor) {
    const obj = inst.toObject();
    const staffUsers = await this.userModel.find({ _id: { $in: [obj.ownerId, ...obj.staff.map((s) => s.userId)] } }, { name: 1, email: 1 }).lean().exec();
    const byId = new Map(staffUsers.map((u) => [String(u._id), u]));
    const [students, pendingApplications, classes] = await Promise.all([
      this.userModel.countDocuments({ institutionId: inst._id, managed: true }).exec(),
      this.appModel.countDocuments({ institutionId: inst._id, status: "pending" }).exec(),
      this.courseModel.countDocuments({ institutionId: inst._id }).exec(),
    ]);
    const myRole = !actor ? "owner" : String(obj.ownerId) === actor.userId ? "owner" : obj.staff.find((s) => String(s.userId) === actor.userId)?.role ?? (ADMINS.includes(actor.role) ? "fockis-admin" : "staff");
    return {
      ...obj,
      _id: String(obj._id),
      proofStorageKey: undefined,
      hasProof: !!obj.proofStorageKey,
      domain: this.domainOf(obj),
      owner: byId.get(String(obj.ownerId)) ?? null,
      staff: obj.staff.map((s) => ({ ...s, userId: String(s.userId), name: byId.get(String(s.userId))?.name, email: byId.get(String(s.userId))?.email })),
      myRole,
      teachers: await this.teachersWithClasses(obj, false),
      counts: { students, pendingApplications, classes },
    };
  }

  private pickDetails(dto: SaveInstitutionDto) {
    const out: Partial<AcademyInstitution> = {};
    const keys = ["type", "description", "country", "city", "address", "website", "phone", "contactEmail", "registrationNumber", "logoUrl", "proofStorageKey", "proofFileName", "allowApplications"] as const;
    for (const k of keys) {
      const v = dto[k];
      if (v === undefined) continue;
      (out as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() || undefined : v;
    }
    if (out.website && !/^https?:\/\//i.test(out.website)) out.website = `https://${out.website}`;
    if (out.proofStorageKey && !out.proofStorageKey.startsWith("academy/")) throw new BadRequestException("Upload the document through the form.");
    if (out.logoUrl && !out.logoUrl.startsWith("/uploads/media/academy/covers/") && !/^https:\/\//.test(out.logoUrl)) throw new BadRequestException("Invalid logo.");
    return out;
  }

  private oid(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException("Invalid id.");
    return new Types.ObjectId(id);
  }
}
