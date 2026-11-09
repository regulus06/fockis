import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HydratedDocument, Model, Types } from "mongoose";
import { randomBytes } from "crypto";

import { CertificateTemplate } from "../schemas/certificate-template.schema";
import { IssuedCertificate } from "../schemas/issued-certificate.schema";
import { Course } from "../../courses/schemas/course.schema";
import { Enrollment, ensureEnrollmentNumber } from "../../courses/schemas/enrollment.schema";
import { CampusEvent } from "../../events/schemas/event.schema";
import { AcademyUser } from "../../auth/schemas/academy-user.schema";
import { AcademyInstitution } from "../../institutions/schemas/institution.schema";
import { IssueCertificatesDto, SaveTemplateDto, UpdateTemplateDto } from "../dto/certificate.dto";
import { DEFAULT_CERT_DESIGN, withInstitutionLine } from "../default-design";

export interface AcademyActor {
  userId: string;
  name: string;
  email: string;
  role: string;
}

const STAFF = ["administrator", "staff"];
/** Campus seminars/workshops (admin events) can only be certified by teaching staff. */
const TEACHING = ["instructor", "administrator", "staff"];
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I

function code(len: number) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

@Injectable()
export class CertificatesService {
  constructor(
    @InjectModel(CertificateTemplate.name) private readonly templateModel: Model<CertificateTemplate>,
    @InjectModel(IssuedCertificate.name) private readonly certModel: Model<IssuedCertificate>,
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(CampusEvent.name) private readonly eventModel: Model<CampusEvent>,
    @InjectModel(AcademyUser.name) private readonly userModel: Model<AcademyUser>,
    @InjectModel(AcademyInstitution.name) private readonly instModel: Model<AcademyInstitution>,
  ) {}

  /**
   * Certificates are designed by people who teach: Academy instructors/staff,
   * creators approved by Fockis, and owners/staff of an approved school.
   * Students and other participants can only see certificates issued to them.
   */
  private async assertMayDesign(actor: AcademyActor) {
    if (TEACHING.includes(actor.role)) return;
    if (!Types.ObjectId.isValid(actor.userId)) throw new ForbiddenException("Only teachers can design certificates.");
    const uid = new Types.ObjectId(actor.userId);
    const user = await this.userModel.findById(uid, { creatorStatus: 1 }).lean().exec();
    if (user?.creatorStatus === "approved") return;
    const school = await this.instModel
      .exists({ status: "approved", $or: [{ ownerId: uid }, { "staff.userId": uid }] })
      .exec();
    if (school) return;
    throw new ForbiddenException("Only teachers can design certificates. Apply to teach in Creator Studio.");
  }

  // ------------------------------------------------------------------ templates

  listTemplates(actor: AcademyActor) {
    return this.templateModel.find({ ownerId: new Types.ObjectId(actor.userId) }).sort({ updatedAt: -1 }).lean().exec();
  }

  async getTemplate(id: string, actor: AcademyActor) {
    return this.ownedTemplate(id, actor);
  }

  async createTemplate(dto: SaveTemplateDto, actor: AcademyActor) {
    await this.assertMayDesign(actor);
    return this.templateModel.create({ ...dto, ownerId: new Types.ObjectId(actor.userId) });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto, actor: AcademyActor) {
    const t = await this.ownedTemplate(id, actor);
    Object.assign(t, dto);
    if (dto.design) t.markModified("design");
    await t.save();
    return t;
  }

  async duplicateTemplate(id: string, actor: AcademyActor) {
    await this.assertMayDesign(actor);
    const t = await this.ownedTemplate(id, actor);
    return this.templateModel.create({
      ownerId: new Types.ObjectId(actor.userId),
      name: `${t.name} (copy)`.slice(0, 120),
      baseTemplate: t.baseTemplate,
      design: t.design,
      status: "draft",
    });
  }

  async deleteTemplate(id: string, actor: AcademyActor) {
    const t = await this.ownedTemplate(id, actor);
    await t.deleteOne();
    return { deleted: true };
  }

  private async ownedTemplate(id: string, actor: AcademyActor) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Template not found.");
    const t = await this.templateModel.findById(id).exec();
    if (!t) throw new NotFoundException("Template not found.");
    if (String(t.ownerId) !== actor.userId && !STAFF.includes(actor.role)) throw new ForbiddenException("This template belongs to another instructor.");
    return t;
  }

  // ------------------------------------------------------------------ eligibility

  /** Enrollments of one of the instructor's courses, with issued status. */
  async courseRoster(courseCode: string, actor: AcademyActor) {
    const course = await this.ownedCourse(courseCode, actor);
    const enrollments = await this.enrollmentModel.find({ courseCode: course.code }).sort({ createdAt: 1 }).exec();
    await Promise.all(enrollments.map((e) => ensureEnrollmentNumber(e)));
    const userIds = enrollments.map((e) => e.studentId);
    const users = await this.userModel.find({ _id: { $in: userIds } }, { name: 1, email: 1 }).lean().exec();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const issued = await this.certModel
      .find({ activityType: "course", activityRef: course.code, status: "valid" }, { studentId: 1, certificateNumber: 1 })
      .lean()
      .exec();
    const issuedBy = new Map(issued.map((c) => [String(c.studentId), c.certificateNumber]));
    return {
      course: { code: course.code, name: course.name },
      students: enrollments.map((e) => {
        const u = byId.get(String(e.studentId));
        return {
          enrollmentId: String(e._id),
          enrollmentNumber: e.enrollmentNumber,
          studentId: String(e.studentId),
          name: u?.name ?? "Student",
          email: u?.email ?? "",
          progress: e.progress ?? 0,
          grade: e.grade,
          eligible: (e.progress ?? 0) >= 100,
          certificateNumber: issuedBy.get(String(e.studentId)) ?? null,
        };
      }),
    };
  }

  private async ownedCourse(courseCode: string, actor: AcademyActor) {
    const course = await this.courseModel.findOne({ code: String(courseCode).trim().toUpperCase() }).exec();
    if (!course) throw new NotFoundException(`Course "${courseCode}" not found.`);
    const owner = (course as unknown as { instructorId?: Types.ObjectId }).instructorId;
    if (!STAFF.includes(actor.role) && String(owner) !== actor.userId) throw new ForbiddenException("You can only issue certificates for your own courses.");
    return course;
  }

  // ------------------------------------------------------------------ issuing

  async issue(dto: IssueCertificatesDto, actor: AcademyActor) {
    const template = await this.ownedTemplate(dto.templateId, actor);
    const completionDate = dto.completionDate ? new Date(dto.completionDate) : new Date();
    if (Number.isNaN(completionDate.getTime())) throw new BadRequestException("Invalid completion date.");

    let activityName = dto.activityName?.trim() ?? "";
    type Target = { studentId?: Types.ObjectId; enrollmentId?: Types.ObjectId; enrollmentNumber?: string; name: string; email?: string; grade?: string };
    const targets: Target[] = [];

    if (dto.activityType === "course") {
      const course = await this.ownedCourse(dto.activityRef, actor);
      activityName = activityName || course.name;
      const ids = dto.recipients.map((r) => r.enrollmentId).filter((x): x is string => !!x && Types.ObjectId.isValid(x));
      if (!ids.length) throw new BadRequestException("Select at least one enrolled student.");
      const enrollments = await this.enrollmentModel.find({ _id: { $in: ids }, courseCode: course.code }).exec();
      if (enrollments.length !== ids.length) throw new BadRequestException("Some students are not enrolled in this course.");
      const notDone = enrollments.filter((e) => (e.progress ?? 0) < 100);
      if (notDone.length) throw new BadRequestException(`${notDone.length} selected student(s) have not completed the course yet.`);
      const users = await this.userModel.find({ _id: { $in: enrollments.map((e) => e.studentId) } }, { name: 1, email: 1 }).lean().exec();
      const byId = new Map(users.map((u) => [String(u._id), u]));
      for (const e of enrollments) {
        await ensureEnrollmentNumber(e);
        const u = byId.get(String(e.studentId));
        targets.push({ studentId: e.studentId, enrollmentId: e._id, enrollmentNumber: e.enrollmentNumber, name: u?.name ?? "Student", email: u?.email, grade: e.grade && e.grade !== "—" ? e.grade : undefined });
      }
    } else {
      if (!TEACHING.includes(actor.role)) throw new ForbiddenException("Campus seminar certificates are issued by Academy instructors. Certify your own courses and seminars from the Creator Studio.");
      if (!Types.ObjectId.isValid(dto.activityRef)) throw new BadRequestException("Choose the seminar or workshop.");
      const event = await this.eventModel.findById(dto.activityRef).lean().exec();
      if (!event) throw new NotFoundException("Seminar not found.");
      activityName = activityName || event.title;
      if (new Date(event.date).getTime() > Date.now()) throw new BadRequestException("Certificates can be issued once the seminar has taken place.");
      for (const r of dto.recipients) {
        const name = r.name?.trim();
        if (!name) throw new BadRequestException("Every attendee needs a name.");
        const email = r.email?.trim().toLowerCase();
        const user = email ? await this.userModel.findOne({ email }, { _id: 1 }).lean().exec() : null;
        targets.push({ name, email, studentId: user?._id as Types.ObjectId | undefined });
      }
    }

    const instructor = await this.userModel.findById(actor.userId, { name: 1 }).lean().exec();
    const issued: HydratedDocument<IssuedCertificate>[] = [];
    const skipped: string[] = [];
    for (const t of targets) {
      const dupe = await this.certModel
        .findOne({
          activityType: dto.activityType,
          activityRef: dto.activityType === "course" ? String(dto.activityRef).toUpperCase() : dto.activityRef,
          status: "valid",
          ...(t.studentId ? { studentId: t.studentId } : { recipientEmail: t.email ?? null, recipientName: t.name }),
        })
        .lean()
        .exec();
      if (dupe) {
        skipped.push(`${t.name} (already has ${dupe.certificateNumber})`);
        continue;
      }
      issued.push(
        await this.createUnique({
          templateId: template._id,
          design: template.design,
          studentId: t.studentId,
          enrollmentId: t.enrollmentId,
          enrollmentNumber: t.enrollmentNumber,
          recipientName: t.name,
          recipientEmail: t.email,
          activityType: dto.activityType,
          activityRef: dto.activityType === "course" ? String(dto.activityRef).toUpperCase() : dto.activityRef,
          activityName,
          instructorId: new Types.ObjectId(actor.userId),
          instructorName: instructor?.name ?? actor.name,
          institutionName: dto.institutionName?.trim() || "Fockis Academy",
          duration: dto.duration?.trim() || undefined,
          finalGrade: t.grade,
          completionDate,
          issuedAt: new Date(),
          status: "valid",
          history: [],
        }),
      );
    }
    return { issued, skipped };
  }

  private async createUnique(data: Partial<IssuedCertificate>) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.certModel.create({
          ...data,
          certificateNumber: `FA-${new Date().getFullYear()}-${code(6)}`,
          verificationId: code(16),
        });
      } catch (e) {
        if ((e as { code?: number }).code !== 11000) throw e; // retry only on duplicate key
      }
    }
    throw new BadRequestException("Could not generate a unique certificate number. Try again.");
  }

  // ------------------------------------------------------------------ automatic (Creator Studio)

  /**
   * Issues the course's certificate to a learner who has completed every lesson.
   * Idempotent: returns the existing certificate if one was already issued.
   * Template: the course's chosen template, else the owner's latest, else a
   * "Fockis Signature" template created for the owner on first use.
   */
  async autoIssueForEnrollment(enrollmentId: string | Types.ObjectId) {
    const enrollment = await this.enrollmentModel.findById(enrollmentId).exec();
    if (!enrollment || (enrollment.progress ?? 0) < 100) return null;
    if (enrollment.certificateId) {
      const existing = await this.certModel.findById(enrollment.certificateId).lean().exec();
      if (existing) return existing;
    }
    const course = await this.courseModel.findOne({ code: enrollment.courseCode }).exec();
    if (!course || course.certificateEnabled === false) return null;

    const ownerId = course.instructorId;
    let template = course.certificateTemplateId
      ? await this.templateModel.findOne({ _id: course.certificateTemplateId, ownerId }).exec()
      : null;
    if (!template) template = await this.templateModel.findOne({ ownerId }).sort({ updatedAt: -1 }).exec();
    // Older auto-created default templates: add the institution line.
    if (template && template.name === "Fockis Signature (default)") {
      const upgraded = withInstitutionLine(template.design);
      if (upgraded !== template.design) {
        template.design = upgraded;
        template.markModified("design");
        await template.save();
      }
    }
    if (!template) {
      template = await this.templateModel.create({
        ownerId,
        name: "Fockis Signature (default)",
        baseTemplate: "signature",
        design: DEFAULT_CERT_DESIGN,
        status: "published",
      });
    }

    const activityType: "course" | "seminar" | "workshop" =
      course.kind === "seminar" ? "seminar" : course.kind === "workshop" ? "workshop" : "course";
    const dupe = await this.certModel
      .findOne({ activityRef: course.code, studentId: enrollment.studentId, status: "valid" })
      .lean()
      .exec();
    if (dupe) {
      enrollment.certificateId = dupe._id;
      await enrollment.save();
      return dupe;
    }

    await ensureEnrollmentNumber(enrollment);
    const [student, owner] = await Promise.all([
      this.userModel.findById(enrollment.studentId, { name: 1, email: 1 }).lean().exec(),
      this.userModel.findById(ownerId, { name: 1 }).lean().exec(),
    ]);
    const minutes = (course.lessons ?? []).reduce((sum, l) => sum + (l.durationMin ?? 0), 0);
    const duration = minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} hours` : minutes > 0 ? `${minutes} minutes` : undefined;

    const cert = await this.createUnique({
      templateId: template._id,
      design: template.design,
      studentId: enrollment.studentId,
      enrollmentId: enrollment._id,
      enrollmentNumber: enrollment.enrollmentNumber,
      recipientName: student?.name ?? "Learner",
      recipientEmail: student?.email,
      activityType,
      activityRef: course.code,
      activityName: course.name,
      instructorId: ownerId,
      // The class's school teacher if one is set, otherwise its creator.
      instructorName: course.teacherName || owner?.name || course.instructor,
      institutionName: course.brandName?.trim() || "Fockis Academy",
      duration,
      finalGrade: enrollment.grade && enrollment.grade !== "—" ? enrollment.grade : undefined,
      completionDate: enrollment.completedAt ?? new Date(),
      issuedAt: new Date(),
      status: "valid",
      history: [],
    });
    enrollment.certificateId = cert._id;
    await enrollment.save();
    return cert.toObject();
  }

  // ------------------------------------------------------------------ listing

  async issuedByMe(actor: AcademyActor) {
    const q = STAFF.includes(actor.role) ? {} : { instructorId: new Types.ObjectId(actor.userId) };
    const rows = await this.certModel.find(q).sort({ issuedAt: -1 }).limit(1000).lean().exec();
    return rows.map((c) => ({ ...c, design: withInstitutionLine(c.design) }));
  }

  async mine(actor: AcademyActor) {
    return this.certModel
      .find({ $or: [{ studentId: new Types.ObjectId(actor.userId) }, { recipientEmail: String(actor.email || "").toLowerCase() || "__none__" }] })
      .sort({ issuedAt: -1 })
      .lean()
      .exec()
      .then((rows) => rows.map((c) => ({ ...c, design: withInstitutionLine(c.design) })));
  }

  async getOne(id: string, actor: AcademyActor) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Certificate not found.");
    const c = await this.certModel.findById(id).lean().exec();
    if (!c) throw new NotFoundException("Certificate not found.");
    const isOwner = String(c.studentId) === actor.userId || (!!c.recipientEmail && c.recipientEmail === String(actor.email).toLowerCase());
    const isIssuer = String(c.instructorId) === actor.userId || STAFF.includes(actor.role);
    if (!isOwner && !isIssuer) throw new ForbiddenException("You can only view your own certificates.");
    return { ...c, design: withInstitutionLine(c.design) };
  }

  async setStatus(id: string, revoke: boolean, reason: string | undefined, actor: AcademyActor) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException("Certificate not found.");
    const c = await this.certModel.findById(id).exec();
    if (!c) throw new NotFoundException("Certificate not found.");
    if (String(c.instructorId) !== actor.userId && !STAFF.includes(actor.role)) throw new ForbiddenException("Only the issuing instructor can change this certificate.");
    c.status = revoke ? "revoked" : "valid";
    c.history.push({ action: revoke ? "revoked" : "restored", reason, by: new Types.ObjectId(actor.userId), byName: actor.name, at: new Date() });
    c.markModified("history");
    await c.save();
    return c;
  }

  // ------------------------------------------------------------------ public verification

  /** Accepts a certificate number, verification id or enrollment number. */
  async verify(raw: string) {
    const q = String(raw || "").trim().toUpperCase();
    if (!q || q.length > 40) throw new NotFoundException("Nothing found for that code.");

    const cert = await this.certModel.findOne({ $or: [{ verificationId: q }, { certificateNumber: q }] }).lean().exec();
    if (cert) {
      const last = cert.history?.length ? cert.history[cert.history.length - 1] : undefined;
      return {
        kind: "certificate",
        status: cert.status,
        certificateNumber: cert.certificateNumber,
        verificationId: cert.verificationId,
        recipientName: cert.recipientName,
        activityType: cert.activityType,
        activityName: cert.activityName,
        instructorName: cert.instructorName,
        institutionName: cert.institutionName ?? "Fockis Academy",
        enrollmentNumber: cert.enrollmentNumber ?? null,
        completionDate: cert.completionDate,
        issuedAt: cert.issuedAt,
        revokedAt: cert.status === "revoked" ? last?.at ?? null : null,
        revokedReason: cert.status === "revoked" ? last?.reason ?? null : null,
        design: withInstitutionLine(cert.design),
      };
    }

    const enr = await this.enrollmentModel.findOne({ enrollmentNumber: q }).lean().exec();
    if (enr) {
      const [user, course] = await Promise.all([
        this.userModel.findById(enr.studentId, { name: 1 }).lean().exec(),
        this.courseModel.findOne({ code: enr.courseCode }, { name: 1, code: 1 }).lean().exec(),
      ]);
      const certs = await this.certModel.find({ enrollmentId: enr._id }, { certificateNumber: 1, status: 1 }).lean().exec();
      return {
        kind: "enrollment",
        status: "valid",
        enrollmentNumber: enr.enrollmentNumber,
        recipientName: user?.name ?? "Student",
        activityType: "course",
        activityName: course?.name ?? enr.courseCode,
        courseCode: enr.courseCode,
        progress: enr.progress ?? 0,
        enrolledAt: (enr as unknown as { createdAt?: Date }).createdAt ?? null,
        certificates: certs.map((c) => ({ certificateNumber: c.certificateNumber, status: c.status })),
      };
    }
    throw new NotFoundException("No certificate or enrollment matches that code.");
  }
}
