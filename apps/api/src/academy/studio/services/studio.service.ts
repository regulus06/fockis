import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HydratedDocument, Model, Types } from "mongoose";
import { randomBytes } from "crypto";
import { unlink } from "fs/promises";

import { Course, CourseLesson } from "../../courses/schemas/course.schema";
import { Enrollment, ensureEnrollmentNumber } from "../../courses/schemas/enrollment.schema";
import { AcademyUser } from "../../auth/schemas/academy-user.schema";
import { CertificateTemplate } from "../../certificates/schemas/certificate-template.schema";
import { CertificatesService } from "../../certificates/services/certificates.service";
import { LessonContent, LessonQuiz } from "../schemas/lesson-content.schema";
import { CreatorApplyDto, SaveStudioCourseDto, StudioLessonDto } from "../dto/studio.dto";
import { AcademyInstitution } from "../../institutions/schemas/institution.schema";

// Shared Fockis infrastructure — used read-only / through its public API, never modified.
import { Payment } from "../../../payments/schemas/payment.schema";
import { DomainBillingService } from "../../institutions/billing/domain-billing.service";
import { CloudStorageService } from "../../../uploads/cloud-storage.service";
import { mediaPath } from "../media-link";

export interface AcademyActor {
  userId: string;
  name: string;
  email: string;
  role: string;
  /** Set for student accounts created by a school. */
  institutionId?: string;
}

type CourseDoc = HydratedDocument<Course>;
type EnrollmentDoc = HydratedDocument<Enrollment>;

const STAFF = ["administrator", "staff"];
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
/** Payment purpose used for Academy purchases in the universal payment system. */
export const ACADEMY_PAYMENT_PURPOSE = "other";

function rand(len: number) {
  const b = randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return s;
}

function cleanUrl(value?: string): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (!/^https?:\/\//i.test(v)) throw new BadRequestException(`Links must start with http:// or https:// ("${v.slice(0, 60)}").`);
  return v;
}

/** Reference that ties a payment to one learner and one course. */
export function paymentReference(code: string, userId: string) {
  return `academy-course:${code}:${userId}`;
}

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(AcademyUser.name) private readonly userModel: Model<AcademyUser>,
    @InjectModel(LessonContent.name) private readonly contentModel: Model<LessonContent>,
    @InjectModel(CertificateTemplate.name) private readonly templateModel: Model<CertificateTemplate>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @InjectModel(AcademyInstitution.name) private readonly instModel: Model<AcademyInstitution>,
    private readonly certificates: CertificatesService,
    private readonly storage: CloudStorageService,
    private readonly billing: DomainBillingService,
  ) {}

  // ======================================================================
  // CREATOR — permission to teach (approved by Fockis)
  // ======================================================================

  /** Approved schools this person owns or works for. */
  private async approvedSchoolIds(userId: string) {
    if (!Types.ObjectId.isValid(userId)) return [] as string[];
    const uid = new Types.ObjectId(userId);
    const rows = await this.instModel.find({ status: "approved", $or: [{ ownerId: uid }, { "staff.userId": uid }] }, { _id: 1 }).lean().exec();
    return rows.map((r) => String(r._id));
  }

  /**
   * Who may teach: creators approved by Fockis, Academy staff/instructors, and
   * owners/staff of an approved school (for that school's classes).
   */
  async creatorAccess(actor: AcademyActor) {
    const user = await this.userModel
      .findById(actor.userId, { creatorStatus: 1, creatorProfile: 1, creatorReason: 1, creatorAppliedAt: 1, creatorReviewedAt: 1, role: 1, name: 1, managed: 1 })
      .lean()
      .exec();
    if (!user) throw new ForbiddenException("Sign in to your Academy account.");
    const trusted = ["administrator", "staff", "instructor"].includes(String(user.role));
    const status = trusted ? "approved" : (user.creatorStatus ?? "none");
    const schools = await this.approvedSchoolIds(actor.userId);
    return {
      status,
      trusted,
      profile: user.creatorProfile ?? null,
      reason: user.creatorReason ?? "",
      appliedAt: user.creatorAppliedAt ?? null,
      reviewedAt: user.creatorReviewedAt ?? null,
      /** Can create classes under their own name / business. */
      canTeach: status === "approved",
      /** Can create classes offered by these approved schools even without creator approval. */
      schoolIds: schools,
      /** School student logins can't apply to teach. */
      canApply: !user.managed && !trusted && status !== "approved" && status !== "pending" && status !== "suspended",
    };
  }

  async applyAsCreator(dto: CreatorApplyDto, actor: AcademyActor) {
    const user = await this.userModel.findById(actor.userId).exec();
    if (!user || user.isActive === false) throw new ForbiddenException("Your Academy account is not active.");
    if (user.managed) throw new ForbiddenException("School student logins can't apply to teach. Use your own Academy account.");
    if (user.creatorStatus === "approved") throw new BadRequestException("You are already approved to teach.");
    if (user.creatorStatus === "pending") throw new BadRequestException("Your application is already waiting for review.");
    if (user.creatorStatus === "suspended") throw new ForbiddenException("Your teaching permission is suspended. Contact Fockis support.");
    if (dto.kind === "business" && !dto.businessName?.trim()) throw new BadRequestException("Enter the business or organization name.");
    const clean = (v?: string) => (v ?? "").trim() || undefined;
    let website = clean(dto.website);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    const now = new Date();
    user.creatorProfile = {
      kind: dto.kind,
      displayName: dto.displayName.trim(),
      businessName: dto.kind === "business" ? clean(dto.businessName) : undefined,
      phone: clean(dto.phone),
      country: clean(dto.country),
      city: clean(dto.city),
      website,
      topics: clean(dto.topics),
      about: dto.about.trim(),
      experience: clean(dto.experience),
      sampleUrl: clean(dto.sampleUrl),
    };
    user.creatorStatus = "pending";
    user.creatorReason = undefined;
    user.creatorAppliedAt = now;
    user.creatorHistory = [...(user.creatorHistory ?? []), { action: "applied", byName: user.name, at: now }];
    user.markModified("creatorProfile");
    user.markModified("creatorHistory");
    await user.save();
    this.logger.log(`Creator application from ${actor.userId}`);
    return this.creatorAccess(actor);
  }

  /** Throws unless this person may create/edit a class (offered by `institutionId` when given). */
  private async assertCanTeach(actor: AcademyActor, institutionId?: string | Types.ObjectId | null) {
    // A school's classes need its Fockis domain to be paid (price set by Fockis admins).
    if (institutionId && (await this.billing.inactiveIds()).has(String(institutionId))) {
      throw new ForbiddenException("This school's Fockis domain isn't paid. The school's owner can pay or renew it from the school dashboard.");
    }
    const a = await this.creatorAccess(actor);
    if (a.canTeach) return;
    if (institutionId && a.schoolIds.includes(String(institutionId))) return;
    if (a.status === "suspended") throw new ForbiddenException(`Your teaching permission is suspended${a.reason ? `: ${a.reason}` : "."}`);
    if (a.status === "pending") throw new ForbiddenException("Your creator application is waiting for Fockis review. You can create classes once it is approved.");
    if (a.schoolIds.length) throw new ForbiddenException("Choose your school in “Offered by”. To teach under your own name, apply to become a creator.");
    throw new ForbiddenException("Only creators approved by Fockis can publish classes. Apply in Creator Studio.");
  }

  // ======================================================================
  // CREATOR — my offerings
  // ======================================================================

  async listMine(actor: AcademyActor) {
    const courses = await this.courseModel
      .find({ instructorId: new Types.ObjectId(actor.userId) })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    if (!courses.length) return [];
    const stats = await this.enrollmentModel
      .aggregate<{ _id: string; learners: number; completed: number; paid: { currency: string; amount: number }[] }>([
        { $match: { courseCode: { $in: courses.map((c) => c.code) } } },
        {
          $group: {
            _id: "$courseCode",
            learners: { $sum: 1 },
            completed: { $sum: { $cond: [{ $gte: ["$progress", 100] }, 1, 0] } },
            paid: { $push: { currency: "$paidCurrency", amount: "$paidAmount" } },
          },
        },
      ])
      .exec();
    const byCode = new Map(stats.map((s) => [s._id, s]));
    return courses.map((c) => {
      const s = byCode.get(c.code);
      const revenue: Record<string, number> = {};
      for (const p of s?.paid ?? []) {
        if (p.amount && p.currency) revenue[p.currency] = Math.round(((revenue[p.currency] ?? 0) + p.amount) * 100) / 100;
      }
      return { ...c, learners: s?.learners ?? 0, completed: s?.completed ?? 0, revenue };
    });
  }

  /** Approved schools this creator can publish as. */
  async mySchools(actor: AcademyActor) {
    const uid = new Types.ObjectId(actor.userId);
    const list = await this.instModel
      .find({ $or: [{ ownerId: uid }, { "staff.userId": uid }] }, { name: 1, slug: 1, status: 1, teachers: 1 })
      .lean()
      .exec();
    return list.map((i) => ({
      _id: String(i._id),
      name: i.name,
      slug: i.slug,
      status: i.status,
      teachers: (i.teachers ?? []).map((t) => ({ key: t.key, name: t.name, title: t.title, department: t.department })),
    }));
  }

  async create(dto: SaveStudioCourseDto, actor: AcademyActor) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException("Give your class a title.");
    await this.assertCanTeach(actor, dto.institutionId);
    const user = await this.userModel.findById(actor.userId, { name: 1, isActive: 1 }).lean().exec();
    if (!user || user.isActive === false) throw new ForbiddenException("Your Academy account is not active.");

    const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "CLASS";
    let code = "";
    for (let i = 0; i < 6 && !code; i++) {
      const candidate = `${slug}-${rand(4)}`;
      if (!(await this.courseModel.exists({ code: candidate }))) code = candidate;
    }
    if (!code) throw new ConflictException("Could not generate a class code. Try again.");

    const course = await this.courseModel.create({
      code,
      name,
      instructorId: new Types.ObjectId(actor.userId),
      instructor: user.name,
      studio: true,
      kind: dto.kind ?? "course",
      visibility: "draft",
      enrollmentOpen: true,
      isFree: true,
      price: 0,
      currency: "USD",
      lessons: [],
      modules: [],
    });
    await this.applyChanges(course, { ...dto, name, visibility: dto.visibility ?? "draft" }, actor);
    return this.getForEditor(course.code, actor);
  }

  async getForEditor(code: string, actor: AcademyActor) {
    const course = await this.ownedCourse(code, actor);
    const contents = await this.contentModel.find({ courseCode: course.code }).lean().exec();
    const byKey = new Map(contents.map((c) => [c.lessonKey, c]));
    const obj = course.toObject();
    return {
      ...obj,
      lessons: (obj.lessons ?? []).map((l) => {
        const c = byKey.get(l.key);
        return {
          ...l,
          videoUrl: c?.videoUrl,
          storageKey: c?.storageKey,
          fileName: c?.fileName,
          mimeType: c?.mimeType,
          size: c?.size,
          body: c?.body,
          quiz: c?.quiz,
          joinUrl: c?.joinUrl,
          recordingUrl: c?.recordingUrl,
        };
      }),
    };
  }

  async update(code: string, dto: SaveStudioCourseDto, actor: AcademyActor) {
    const course = await this.ownedCourse(code, actor);
    await this.assertCanTeach(actor, dto.clearInstitution ? null : (dto.institutionId ?? course.institutionId));
    await this.applyChanges(course, dto, actor);
    return this.getForEditor(course.code, actor);
  }

  async remove(code: string, actor: AcademyActor) {
    const course = await this.ownedCourse(code, actor);
    const learners = await this.enrollmentModel.countDocuments({ courseCode: course.code }).exec();
    if (learners > 0) {
      // Never delete something people enrolled in (and maybe paid for): unpublish instead.
      course.visibility = "draft";
      course.enrollmentOpen = false;
      await course.save();
      return { archived: true, learners };
    }
    await this.contentModel.deleteMany({ courseCode: course.code }).exec();
    await this.courseModel.deleteOne({ _id: course._id }).exec();
    return { deleted: true };
  }

  async learners(code: string, actor: AcademyActor) {
    const course = await this.ownedCourse(code, actor);
    const enrollments = await this.enrollmentModel.find({ courseCode: course.code }).sort({ createdAt: -1 }).exec();
    await Promise.all(enrollments.map((e) => ensureEnrollmentNumber(e)));
    const users = await this.userModel
      .find({ _id: { $in: enrollments.map((e) => e.studentId) } }, { name: 1, email: 1 })
      .lean()
      .exec();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const quizKeys = (course.lessons ?? []).filter((l) => l.type === "quiz").map((l) => l.key);
    return enrollments.map((e) => {
      const u = byId.get(String(e.studentId));
      const enr = e.toObject() as Enrollment & { createdAt?: Date };
      return {
        enrollmentId: String(e._id),
        enrollmentNumber: e.enrollmentNumber,
        name: u?.name ?? "Learner",
        email: u?.email,
        enrolledAt: enr.createdAt,
        progress: e.progress ?? 0,
        completedAt: e.completedAt,
        accessType: e.accessType ?? "free",
        paidAmount: e.paidAmount,
        paidCurrency: e.paidCurrency,
        certificateId: e.certificateId ? String(e.certificateId) : undefined,
        quizzes: quizKeys.map((k) => e.quizResults?.find((q) => q.lessonKey === k) ?? null),
      };
    });
  }

  /** Upload a lesson video / PDF / cover image into Fockis cloud storage (existing CloudStorageService). */
  async upload(file: Express.Multer.File, kind: string, actor: AcademyActor) {
    if (!file) throw new BadRequestException("No file received.");
    try {
      const access = await this.creatorAccess(actor);
      if (!access.canTeach && !access.schoolIds.length) throw new ForbiddenException("Only approved creators can upload class material.");
      const mime = (file.mimetype || "").toLowerCase();
      const allowed: Record<string, (m: string) => boolean> = {
        video: (m) => m.startsWith("video/"),
        pdf: (m) => m === "application/pdf",
        image: (m) => m.startsWith("image/"),
      };
      const check = allowed[kind];
      if (!check) throw new BadRequestException("Unknown upload type.");
      if (!check(mime)) throw new BadRequestException(kind === "pdf" ? "Only PDF files can be attached here." : `Please choose a ${kind} file.`);

      const folder = kind === "image" ? "academy/covers" : `academy/content/${actor.userId}`;
      const storageKey = this.storage.createObjectKey(folder, file.originalname);
      await this.storage.uploadFile(file.path, storageKey, mime);
      return {
        storageKey,
        fileName: file.originalname,
        mimeType: mime,
        size: file.size,
        // Cover images are public: served by the existing /uploads/media/* gateway.
        url: kind === "image" ? `/uploads/media/${storageKey}` : undefined,
      };
    } finally {
      if (file?.path) await unlink(file.path).catch(() => undefined);
    }
  }

  // ======================================================================
  // LEARNER
  // ======================================================================

  /** Public course page; enrolled learners and the owner also get lesson content. */
  async coursePage(code: string, actor: AcademyActor | null) {
    const course = await this.findCourse(code);
    // Only the creator manages a class. Academy administrators/staff may look
    // inside every class (to review it) but can't edit it here; moderation is
    // done from the Fockis admin center.
    const isOwner = !!actor && String(course.instructorId) === actor.userId;
    const staffView = !!actor && !isOwner && STAFF.includes(actor.role);
    const canSee = isOwner || staffView;
    if (course.visibility === "draft" && !canSee) throw new NotFoundException("This class is not published yet.");
    if (course.institutionBlocked && !canSee) throw new NotFoundException("This class is not available.");
    if ((course.takenDown || course.creatorBlocked) && !canSee && !(actor && (await this.findEnrollment(course.code, actor.userId)))) {
      throw new NotFoundException("This class is not available.");
    }
    const school = course.institutionId
      ? await this.instModel.findById(course.institutionId, { name: 1, slug: 1, status: 1, teachers: 1 }).lean().exec()
      : null;
    const t = course.teacherKey ? (school?.teachers ?? []).find((x) => x.key === course.teacherKey) : undefined;
    const teacher = t
      ? { name: t.name, title: t.title, department: t.department, bio: t.bio, photoUrl: t.photoUrl }
      : course.teacherName
        ? { name: course.teacherName }
        : null;
    const memberOnly = course.visibility === "school";
    const isMember = !!actor?.institutionId && String(course.institutionId) === actor.institutionId;

    let enrollment = actor ? await this.findEnrollment(course.code, actor.userId) : null;
    // A purchase completed but never claimed (closed tab, webhook-only) unlocks on the next visit.
    if (actor && !enrollment && course.isFree === false) {
      enrollment = await this.claimFromPaidPayment(course, actor.userId).catch(() => null);
    }

    const [learners, owner] = await Promise.all([
      this.enrollmentModel.countDocuments({ courseCode: course.code }).exec(),
      this.userModel.findById(course.instructorId, { name: 1 }).lean().exec(),
    ]);

    const unlocked = canSee || !!enrollment;
    const lessons = [...(course.lessons ?? [])].sort((a, b) => a.order - b.order);
    const visibleKeys = lessons.filter((l) => unlocked || l.preview).map((l) => l.key);
    const contents = visibleKeys.length
      ? await this.contentModel.find({ courseCode: course.code, lessonKey: { $in: visibleKeys } }).lean().exec()
      : [];
    const byKey = new Map(contents.map((c) => [c.lessonKey, c]));

    const seatsLeft = course.capacity > 0 ? Math.max(0, course.capacity - learners) : null;
    let canEnroll = !enrollment && !canSee && course.enrollmentOpen !== false && seatsLeft !== 0 && (!memberOnly || isMember);
    let reason: string | undefined;
    if (enrollment) reason = "enrolled";
    else if (isOwner) reason = "owner";
    else if (staffView) reason = "Academy staff can review this class but not join it.";
    else if (memberOnly && !isMember) reason = `Only ${school?.name ?? "school"} students can join. Sign in with your school login.`;
    else if (course.enrollmentOpen === false) reason = "Enrollment is closed for this class.";
    else if (seatsLeft === 0) reason = "This class is full.";
    if (!actor) canEnroll = course.enrollmentOpen !== false && seatsLeft !== 0;
    if (!actor && memberOnly) reason = `Only ${school?.name ?? "school"} students can join. Sign in with your school login.`;

    // Teacher contact & meeting room: only for enrolled students (and the class owner),
    // and only if the school allows students to contact this teacher.
    const canSeeContact = !!t?.contactEnabled && (canSee || !!enrollment);
    const teacherContact = canSeeContact
      ? { email: t!.contactEmail, phone: t!.contactPhone, officeHours: t!.officeHours, meetingUrl: t!.meetingUrl }
      : null;
    const obj = course.toObject();
    return {
      code: obj.code,
      name: obj.name,
      kind: obj.kind ?? "course",
      brandName: obj.brandName,
      category: obj.category,
      level: obj.level,
      language: obj.language,
      summary: obj.summary,
      description: obj.description,
      coverUrl: obj.coverUrl,
      isFree: obj.isFree !== false,
      price: obj.price ?? 0,
      currency: obj.currency ?? "USD",
      startsAt: obj.startsAt,
      capacity: obj.capacity ?? 0,
      seatsLeft,
      visibility: obj.visibility,
      enrollmentOpen: obj.enrollmentOpen !== false,
      certificateEnabled: obj.certificateEnabled !== false,
      school: school && school.status === "approved" ? { name: school.name, slug: school.slug, verified: true } : null,
      membersOnly: memberOnly,
      teacher: teacher ? { ...teacher, contact: teacherContact } : null,
      instructor: teacher?.name ?? owner?.name ?? obj.instructor,
      instructorId: String(obj.instructorId),
      learners,
      totalMinutes: lessons.reduce((s, l) => s + (l.durationMin ?? 0), 0),
      updatedAt: (obj as { updatedAt?: Date }).updatedAt,
      // legacy courses (no studio lessons) still show their module list
      modules: lessons.length ? [] : obj.modules ?? [],
      lessons: lessons.map((l) => {
        const open = unlocked || l.preview;
        const c = open ? byKey.get(l.key) : undefined;
        return {
          key: l.key,
          order: l.order,
          title: l.title,
          type: l.type,
          preview: !!l.preview,
          durationMin: l.durationMin,
          startsAt: l.startsAt,
          dueAt: l.dueAt,
          section: l.section,
          locked: !open,
          ...(c
            ? {
                videoUrl: c.videoUrl,
                hasFile: !!c.storageKey,
                fileName: c.fileName,
                mimeType: c.mimeType,
                body: c.body,
                joinUrl: unlocked ? c.joinUrl : undefined,
                recordingUrl: unlocked ? c.recordingUrl : undefined,
                quiz: c.quiz
                  ? {
                      passPct: c.quiz.passPct,
                      questions: c.quiz.questions.map((q) => ({ prompt: q.prompt, options: q.options })),
                    }
                  : undefined,
              }
            : {}),
        };
      }),
      access: {
        signedIn: !!actor,
        isOwner,
        staffView,
        enrolled: !!enrollment,
        canEnroll,
        reason,
        enrollment: enrollment ? this.enrollmentSummary(enrollment) : null,
      },
    };
  }

  async enrollFree(code: string, actor: AcademyActor) {
    const course = await this.findCourse(code);
    const existing = await this.findEnrollment(course.code, actor.userId);
    if (existing) return this.enrollmentSummary(existing);
    if (course.isFree === false) throw new BadRequestException("This is a paid class. Use checkout to buy it.");
    await this.assertCanJoin(course, actor);
    const e = await this.enrollmentModel.create({
      studentId: new Types.ObjectId(actor.userId),
      courseCode: course.code,
      progress: 0,
      grade: "—",
      completedModuleOrders: [],
      accessType: "free",
    });
    return this.enrollmentSummary(e);
  }

  /** What the existing Fockis checkout needs to charge for this class. */
  async checkoutInfo(code: string, actor: AcademyActor) {
    const course = await this.findCourse(code);
    if (course.isFree !== false) throw new BadRequestException("This class is free — just enroll.");
    if (await this.findEnrollment(course.code, actor.userId)) throw new ConflictException("You are already enrolled.");
    await this.assertCanJoin(course, actor);
    if (!(course.price > 0)) throw new BadRequestException("The creator has not set a price yet.");
    return {
      purpose: ACADEMY_PAYMENT_PURPOSE,
      referenceId: paymentReference(course.code, actor.userId),
      amount: course.price,
      currency: course.currency || "USD",
      title: course.name,
      kind: course.kind ?? "course",
      provider: course.brandName || course.instructor,
      coverUrl: course.coverUrl,
      metadata: {
        source: "fockis-academy",
        academyCourse: course.code,
        academyUser: actor.userId,
      },
    };
  }

  /** Unlock a paid class after the existing Fockis payment flow succeeded. */
  async claim(code: string, paymentIntentId: string, actor: AcademyActor) {
    const course = await this.findCourse(code);
    const existing = await this.findEnrollment(course.code, actor.userId);
    if (existing) return this.enrollmentSummary(existing);

    const payment = await this.paymentModel.findOne({ stripePaymentIntentId: paymentIntentId.trim() }).lean().exec();
    if (!payment) throw new NotFoundException("Payment not found.");
    const e = await this.enrollFromPayment(course, actor.userId, payment);
    return this.enrollmentSummary(e);
  }

  async completeLesson(code: string, key: string, actor: AcademyActor) {
    const { course, enrollment, lesson } = await this.learnerLesson(code, key, actor);
    if (lesson.type === "quiz") throw new BadRequestException("Pass the quiz to complete this lesson.");
    if (lesson.type === "assignment") throw new BadRequestException("Hand in this assignment. It is completed when your teacher grades it.");
    return this.markComplete(course, enrollment, key);
  }

  async submitQuiz(code: string, key: string, answers: number[], actor: AcademyActor) {
    const { course, enrollment, lesson } = await this.learnerLesson(code, key, actor);
    if (lesson.type !== "quiz") throw new BadRequestException("This lesson is not a quiz.");
    const content = await this.contentModel.findOne({ courseCode: course.code, lessonKey: key }).lean().exec();
    const quiz = content?.quiz as LessonQuiz | undefined;
    if (!quiz?.questions?.length) throw new BadRequestException("This quiz has no questions yet.");

    const results = quiz.questions.map((q, i) => ({ correct: answers[i] === q.answer, answer: q.answer, explain: q.explain }));
    const right = results.filter((r) => r.correct).length;
    const score = Math.round((right / quiz.questions.length) * 100);
    const passed = score >= (quiz.passPct ?? 70);

    const prev = enrollment.quizResults?.find((r) => r.lessonKey === key);
    const entry = {
      lessonKey: key,
      score: Math.max(score, prev?.passed ? prev.score : 0),
      passed: passed || !!prev?.passed,
      attempts: (prev?.attempts ?? 0) + 1,
      at: new Date(),
    };
    enrollment.quizResults = [...(enrollment.quizResults ?? []).filter((r) => r.lessonKey !== key), entry];
    enrollment.markModified("quizResults");
    await enrollment.save();

    const progress = entry.passed ? await this.markComplete(course, enrollment, key) : this.enrollmentSummary(enrollment);
    return { score, passed, passPct: quiz.passPct, correct: right, total: quiz.questions.length, results, enrollment: progress };
  }

  /** Short-lived signed link to a lesson's uploaded video / PDF. */
  async fileUrl(code: string, key: string, download: boolean, actor: AcademyActor | null) {
    const course = await this.findCourse(code);
    const lesson = (course.lessons ?? []).find((l) => l.key === key);
    if (!lesson) throw new NotFoundException("Lesson not found.");
    const isOwner = !!actor && (String(course.instructorId) === actor.userId || STAFF.includes(actor.role));
    const enrolled = actor ? !!(await this.findEnrollment(course.code, actor.userId)) : false;
    if (!lesson.preview && !isOwner && !enrolled) throw new ForbiddenException("Enroll to open this lesson.");
    const content = await this.contentModel.findOne({ courseCode: course.code, lessonKey: key }).lean().exec();
    if (!content?.storageKey) throw new NotFoundException("This lesson has no uploaded file.");
    // A Fockis-signed link streamed by GET /academy/learn/media/:token
    // (see media-link.ts), relative to the Academy API base.
    const url = mediaPath(content.storageKey, content.mimeType, content.fileName || "lesson", download, 60 * 60 * 3);
    return { url, fileName: content.fileName, mimeType: content.mimeType, expiresInSeconds: 10800 };
  }

  async myLearning(actor: AcademyActor) {
    const enrollments = await this.enrollmentModel.find({ studentId: new Types.ObjectId(actor.userId) }).sort({ updatedAt: -1 }).exec();
    if (!enrollments.length) return [];
    const courses = await this.courseModel.find({ code: { $in: enrollments.map((e) => e.courseCode) } }).lean().exec();
    const byCode = new Map(courses.map((c) => [c.code, c]));
    return enrollments
      .filter((e) => byCode.has(e.courseCode))
      .map((e) => {
        const c = byCode.get(e.courseCode)!;
        const next = [...(c.lessons ?? [])].sort((a, b) => a.order - b.order).find((l) => !(e.completedLessonKeys ?? []).includes(l.key));
        const nextLive = (c.lessons ?? [])
          .filter((l) => l.type === "live" && l.startsAt && new Date(l.startsAt).getTime() > Date.now() - 3 * 3600e3)
          .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0];
        return {
          code: c.code,
          name: c.name,
          kind: c.kind ?? "course",
          brandName: c.brandName,
          instructor: c.teacherName || c.instructor,
          coverUrl: c.coverUrl,
          lessons: (c.lessons ?? []).length,
          nextLesson: next ? { key: next.key, title: next.title, type: next.type } : null,
          nextLive: nextLive ? { key: nextLive.key, title: nextLive.title, startsAt: nextLive.startsAt } : null,
          ...this.enrollmentSummary(e),
        };
      });
  }

  // ======================================================================
  // INTERNALS
  // ======================================================================

  private async applyChanges(course: CourseDoc, dto: SaveStudioCourseDto, actor: AcademyActor) {
    if (dto.name !== undefined) course.name = dto.name.trim();
    if (dto.kind !== undefined) course.kind = dto.kind;
    if (dto.brandName !== undefined) course.brandName = dto.brandName.trim() || undefined;
    if (dto.category !== undefined) course.category = dto.category.trim() || undefined;
    if (dto.level !== undefined) course.level = dto.level;
    if (dto.language !== undefined) course.language = dto.language.trim() || undefined;
    if (dto.summary !== undefined) course.summary = dto.summary.trim() || undefined;
    if (dto.description !== undefined) course.description = dto.description.trim() || undefined;
    if (dto.coverUrl !== undefined) {
      const v = dto.coverUrl.trim();
      if (v && !v.startsWith("/uploads/media/academy/covers/")) cleanUrl(v);
      course.coverUrl = v || undefined;
    }
    if (dto.isFree !== undefined) course.isFree = dto.isFree;
    if (dto.price !== undefined) course.price = Math.round(dto.price * 100) / 100;
    if (dto.currency !== undefined) {
      const cur = dto.currency.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(cur)) throw new BadRequestException("Invalid currency.");
      course.currency = cur;
    }
    if (dto.startsAt !== undefined) course.startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (dto.capacity !== undefined) course.capacity = dto.capacity;
    if (dto.visibility !== undefined) course.visibility = dto.visibility;
    if (dto.enrollmentOpen !== undefined) course.enrollmentOpen = dto.enrollmentOpen;
    if (dto.certificateEnabled !== undefined) course.certificateEnabled = dto.certificateEnabled;
    if (dto.clearCertificateTemplate) course.certificateTemplateId = undefined;
    if (dto.certificateTemplateId) {
      const owned = await this.templateModel.exists({ _id: dto.certificateTemplateId, ownerId: course.instructorId });
      if (!owned) throw new BadRequestException("Choose one of your own certificate templates.");
      course.certificateTemplateId = new Types.ObjectId(dto.certificateTemplateId);
    }

    if (dto.clearInstitution) {
      course.institutionId = undefined;
      course.teacherKey = undefined;
      course.teacherName = undefined;
    }
    if (dto.institutionId) {
      const uid = new Types.ObjectId(actor.userId);
      const inst = await this.instModel
        .findOne({ _id: dto.institutionId, $or: [{ ownerId: uid }, { "staff.userId": uid }] })
        .lean()
        .exec();
      if (!inst && !STAFF.includes(actor.role)) throw new ForbiddenException("You can only publish as a school you belong to.");
      const school = inst ?? (await this.instModel.findById(dto.institutionId).lean().exec());
      if (!school) throw new NotFoundException("School not found.");
      if (school.status !== "approved") throw new BadRequestException(`${school.name} must be approved by Fockis Academy before it can offer classes.`);
      course.institutionId = school._id;
      course.brandName = school.name;
      course.institutionBlocked = false;
    }
    if (dto.teacherKey !== undefined) {
      if (!dto.teacherKey) {
        course.teacherKey = undefined;
        course.teacherName = undefined;
      } else {
        if (!course.institutionId) throw new BadRequestException("Choose the school first, then its teacher.");
        const sch = await this.instModel.findById(course.institutionId, { teachers: 1 }).lean().exec();
        const t = (sch?.teachers ?? []).find((x) => x.key === dto.teacherKey);
        if (!t) throw new BadRequestException("That teacher is not on the school's teacher list.");
        course.teacherKey = t.key;
        course.teacherName = t.name;
      }
    }
    if (course.visibility === "school" && !course.institutionId) {
      throw new BadRequestException("“School members only” needs the class to be offered by your school.");
    }

    if (course.isFree === false && !(course.price > 0)) {
      throw new BadRequestException("Set a price above zero for a paid class, or make it free.");
    }

    if (dto.lessons) await this.saveLessons(course, dto.lessons);

    if (course.visibility === "public" && !(course.lessons ?? []).length) {
      throw new BadRequestException("Add at least one lesson or live session before publishing.");
    }
    await course.save();
    this.logger.log(`Studio course ${course.code} saved by ${actor.userId}`);
  }

  private async saveLessons(course: CourseDoc, input: StudioLessonDto[]) {
    const oldKeys = new Set((course.lessons ?? []).map((l) => l.key));
    const used = new Set<string>();
    const lessons: CourseLesson[] = [];
    const contents: Partial<LessonContent>[] = [];

    input.forEach((l, i) => {
      let key = l.key && oldKeys.has(l.key) && !used.has(l.key) ? l.key : "";
      while (!key || used.has(key)) key = `L${rand(7)}`;
      used.add(key);

      if (l.type === "live" && l.startsAt && Number.isNaN(new Date(l.startsAt).getTime())) {
        throw new BadRequestException(`Lesson ${i + 1}: invalid start time.`);
      }
      if (l.type === "assignment" && l.dueAt && Number.isNaN(new Date(l.dueAt).getTime())) {
        throw new BadRequestException(`Lesson ${i + 1}: invalid due date.`);
      }
      if (l.type === "assignment" && !l.body?.trim()) {
        throw new BadRequestException(`"${l.title}": write the assignment instructions.`);
      }
      if (l.type === "quiz") {
        const qs = l.quiz?.questions ?? [];
        qs.forEach((q, qi) => {
          const opts = q.options.map((o) => o.trim()).filter(Boolean);
          if (opts.length < 2) throw new BadRequestException(`"${l.title}" question ${qi + 1}: add at least two answers.`);
          if (q.answer >= opts.length) throw new BadRequestException(`"${l.title}" question ${qi + 1}: mark the correct answer.`);
        });
      }
      if (l.storageKey && !l.storageKey.startsWith("academy/")) {
        throw new BadRequestException(`Lesson ${i + 1}: upload the file through the Studio.`);
      }

      lessons.push({
        key,
        order: i + 1,
        title: l.title.trim(),
        type: l.type,
        preview: !!l.preview,
        durationMin: l.durationMin,
        startsAt: l.type === "live" && l.startsAt ? new Date(l.startsAt) : undefined,
        section: l.section?.trim() || undefined,
        dueAt: l.type === "assignment" && l.dueAt ? new Date(l.dueAt) : undefined,
      });
      contents.push({
        courseCode: course.code,
        lessonKey: key,
        videoUrl: l.type === "video" ? cleanUrl(l.videoUrl) : undefined,
        // Assignments may carry a worksheet (PDF) for learners to download.
        storageKey: l.type === "video" || l.type === "pdf" || l.type === "assignment" ? l.storageKey || undefined : undefined,
        fileName: l.fileName,
        mimeType: l.mimeType,
        size: l.size,
        body: l.body?.trim() || undefined,
        quiz:
          l.type === "quiz" && l.quiz
            ? {
                passPct: l.quiz.passPct,
                questions: l.quiz.questions.map((q) => ({
                  prompt: q.prompt.trim(),
                  options: q.options.map((o) => o.trim()).filter(Boolean),
                  answer: q.answer,
                  explain: q.explain?.trim() || undefined,
                })),
              }
            : undefined,
        joinUrl: l.type === "live" ? cleanUrl(l.joinUrl) : undefined,
        recordingUrl: l.type === "live" ? cleanUrl(l.recordingUrl) : undefined,
      });
    });

    course.lessons = lessons;
    // Keep the legacy module list in sync so existing pages show the curriculum.
    course.modules = lessons.map((l) => ({ order: l.order, title: l.title }));
    if (!course.startsAt) {
      const firstLive = lessons.filter((l) => l.startsAt).sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())[0];
      if (firstLive && course.kind !== "course") course.startsAt = firstLive.startsAt;
    }

    await this.contentModel.deleteMany({ courseCode: course.code, lessonKey: { $nin: [...used] } }).exec();
    for (const c of contents) {
      const unset = this.unsetEmpty(c);
      await this.contentModel
        .updateOne(
          { courseCode: c.courseCode, lessonKey: c.lessonKey },
          Object.keys(unset).length ? { $set: c, $unset: unset } : { $set: c },
          { upsert: true },
        )
        .exec();
    }
  }

  private unsetEmpty(c: Partial<LessonContent>) {
    const out: Record<string, ""> = {};
    for (const k of ["videoUrl", "storageKey", "fileName", "mimeType", "size", "body", "quiz", "joinUrl", "recordingUrl"] as const) {
      if (c[k] === undefined) out[k] = "";
    }
    for (const k of Object.keys(out)) delete (c as Record<string, unknown>)[k];
    return out;
  }

  /** Used by homework grading: a graded assignment counts as a completed lesson. */
  completeForGrading(course: CourseDoc, enrollment: EnrollmentDoc, key: string) {
    return this.markComplete(course, enrollment, key);
  }

  private async markComplete(course: CourseDoc, enrollment: EnrollmentDoc, key: string) {
    const keys = new Set(enrollment.completedLessonKeys ?? []);
    keys.add(key);
    const current = (course.lessons ?? []).map((l) => l.key);
    enrollment.completedLessonKeys = current.filter((k) => keys.has(k));
    const total = current.length || 1;
    enrollment.progress = Math.min(100, Math.round((enrollment.completedLessonKeys.length / total) * 100));
    enrollment.completedModuleOrders = (course.lessons ?? []).filter((l) => keys.has(l.key)).map((l) => l.order);

    const quizzes = enrollment.quizResults ?? [];
    const scored = quizzes.filter((q) => current.includes(q.lessonKey));
    if (scored.length) enrollment.grade = `${Math.round(scored.reduce((s, q) => s + q.score, 0) / scored.length)}%`;

    if (enrollment.progress >= 100 && !enrollment.completedAt) enrollment.completedAt = new Date();
    await enrollment.save();

    let certificate: unknown = null;
    if (enrollment.progress >= 100 && course.certificateEnabled !== false) {
      try {
        certificate = await this.certificates.autoIssueForEnrollment(enrollment._id);
      } catch (e) {
        this.logger.error(`Auto certificate failed for ${enrollment._id}`, e instanceof Error ? e.stack : String(e));
      }
    }
    const fresh = (await this.enrollmentModel.findById(enrollment._id).exec()) ?? enrollment;
    return { ...this.enrollmentSummary(fresh), certificate };
  }

  private async learnerLesson(code: string, key: string, actor: AcademyActor) {
    const course = await this.findCourse(code);
    const lesson = (course.lessons ?? []).find((l) => l.key === key);
    if (!lesson) throw new NotFoundException("Lesson not found.");
    const enrollment = await this.findEnrollment(course.code, actor.userId);
    if (!enrollment) throw new ForbiddenException("Enroll in this class first.");
    return { course, enrollment, lesson };
  }

  private async assertCanJoin(course: CourseDoc, actor: AcademyActor) {
    if (String(course.instructorId) === actor.userId) throw new BadRequestException("You own this class.");
    if (course.visibility === "draft") throw new BadRequestException("This class is not published yet.");
    if (course.institutionBlocked) throw new BadRequestException("This class is not available right now.");
    if (course.takenDown || course.creatorBlocked) throw new BadRequestException("This class is not available right now.");
    if (course.institutionId && (await this.billing.inactiveIds()).has(String(course.institutionId))) {
      throw new BadRequestException("New enrollments for this school are paused right now. Please try again later.");
    }
    if (course.visibility === "school" && (!actor.institutionId || String(course.institutionId) !== actor.institutionId)) {
      throw new ForbiddenException("Only students of this school can join. Sign in with your school login.");
    }
    if (course.enrollmentOpen === false) throw new BadRequestException("Enrollment is closed for this class.");
    if (course.capacity > 0) {
      const n = await this.enrollmentModel.countDocuments({ courseCode: course.code }).exec();
      if (n >= course.capacity) throw new BadRequestException("This class is full.");
    }
  }

  private async claimFromPaidPayment(course: CourseDoc, userId: string) {
    const payment = await this.paymentModel
      .findOne({ referenceId: paymentReference(course.code, userId), status: "paid" })
      .sort({ paidAt: -1 })
      .lean()
      .exec();
    if (!payment) return null;
    return this.enrollFromPayment(course, userId, payment);
  }

  /** Verifies a universal payment record (read-only) and creates the enrollment. */
  private async enrollFromPayment(course: CourseDoc, userId: string, payment: Payment) {
    if (payment.referenceId !== paymentReference(course.code, userId)) {
      throw new ForbiddenException("This payment was made for a different class or learner.");
    }
    if (payment.status !== "paid") throw new BadRequestException("The payment has not completed yet.");
    if (payment.purpose !== ACADEMY_PAYMENT_PURPOSE) throw new BadRequestException("Unexpected payment type.");
    if (String(payment.baseCurrency).toUpperCase() !== String(course.currency || "USD").toUpperCase()) {
      throw new BadRequestException("Payment currency does not match the class price.");
    }
    if (Number(payment.baseAmount) + 0.001 < Number(course.price)) {
      throw new BadRequestException("Payment amount is lower than the class price.");
    }
    const intentId = payment.stripePaymentIntentId;
    if (!intentId) throw new BadRequestException("Payment is missing its Stripe reference.");

    const used = await this.enrollmentModel.findOne({ paymentIntentId: intentId }).exec();
    if (used) {
      if (String(used.studentId) === userId && used.courseCode === course.code) return used;
      throw new ConflictException("This payment has already been used.");
    }
    try {
      return await this.enrollmentModel.create({
        studentId: new Types.ObjectId(userId),
        courseCode: course.code,
        progress: 0,
        grade: "—",
        completedModuleOrders: [],
        accessType: "paid",
        paymentIntentId: intentId,
        paymentId: payment.id,
        paidAmount: payment.baseAmount,
        paidCurrency: String(payment.baseCurrency).toUpperCase(),
      });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) {
        const again = await this.findEnrollment(course.code, userId);
        if (again) return again;
      }
      throw e;
    }
  }

  private enrollmentSummary(e: EnrollmentDoc) {
    return {
      enrollmentId: String(e._id),
      enrollmentNumber: e.enrollmentNumber,
      progress: e.progress ?? 0,
      grade: e.grade,
      completedLessonKeys: e.completedLessonKeys ?? [],
      completedModuleOrders: e.completedModuleOrders ?? [],
      quizResults: e.quizResults ?? [],
      accessType: e.accessType ?? "free",
      completedAt: e.completedAt,
      certificateId: e.certificateId ? String(e.certificateId) : undefined,
    };
  }

  private async findCourse(code: string) {
    const c = String(code || "").trim().toUpperCase();
    const course = await this.courseModel.findOne({ code: c }).exec();
    if (!course) throw new NotFoundException("Class not found.");
    return course;
  }

  private async ownedCourse(code: string, actor: AcademyActor) {
    const course = await this.findCourse(code);
    // Only the person who created the class can edit, delete or see its learner list.
    if (String(course.instructorId) !== actor.userId) {
      throw new ForbiddenException("You can only manage your own classes.");
    }
    return course;
  }

  private async findEnrollment(courseCode: string, userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    const e = await this.enrollmentModel.findOne({ courseCode, studentId: new Types.ObjectId(userId) }).exec();
    if (e) await ensureEnrollmentNumber(e);
    return e;
  }
}
