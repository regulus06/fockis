import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { mediaPath } from "../media-link";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { unlink } from "fs/promises";

import { Course } from "../../courses/schemas/course.schema";
import { Enrollment } from "../../courses/schemas/enrollment.schema";
import { AcademyUser } from "../../auth/schemas/academy-user.schema";
import { CloudStorageService } from "../../../uploads/cloud-storage.service";
import { AssignmentSubmission, SubmissionFile } from "../schemas/assignment-submission.schema";
import { AcademyActor, StudioService } from "./studio.service";

/* ============================================================================
   HOMEWORK (assignment lessons)
   Learner: GET/POST /academy/learn/:code/lessons/:key/submission
   Owner:   GET /academy/studio/courses/:code/submissions
            POST /academy/studio/courses/:code/submissions/:id/review
   Files go to Fockis cloud storage (existing CloudStorageService) and are only
   served through short-lived signed links to the learner and the class owner.
============================================================================ */

export const MAX_SUBMISSION_FILES = 3;
export const MAX_SUBMISSION_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = [
  /^application\/pdf$/,
  /^image\//,
  /^text\/plain$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\./,
  /^application\/vnd\.ms-(excel|powerpoint)$/,
  /^application\/vnd\.oasis\.opendocument\./,
  /^application\/(zip|x-zip-compressed)$/,
  /^audio\//,
  /^video\//,
];

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<Enrollment>,
    @InjectModel(AcademyUser.name) private readonly userModel: Model<AcademyUser>,
    @InjectModel(AssignmentSubmission.name) private readonly submissionModel: Model<AssignmentSubmission>,
    private readonly storage: CloudStorageService,
    private readonly studio: StudioService,
  ) {}

  /* ---------------------------------------------------------------- helpers */

  private async course(code: string) {
    const course = await this.courseModel.findOne({ code: String(code ?? "").toUpperCase().trim() }).exec();
    if (!course) throw new NotFoundException("Class not found.");
    return course;
  }

  private assignmentLesson(course: { lessons?: { key: string; type: string; title: string; dueAt?: Date }[] }, key: string) {
    const lesson = (course.lessons ?? []).find((l) => l.key === key);
    if (!lesson) throw new NotFoundException("Lesson not found.");
    if (lesson.type !== "assignment") throw new BadRequestException("This lesson is not an assignment.");
    return lesson;
  }

  private async enrollment(courseCode: string, userId: string) {
    if (!Types.ObjectId.isValid(userId)) return null;
    return this.enrollmentModel.findOne({ courseCode, studentId: new Types.ObjectId(userId) }).exec();
  }

  private async ownedCourse(code: string, actor: AcademyActor) {
    const course = await this.course(code);
    if (String(course.instructorId) !== actor.userId) throw new ForbiddenException("Only the creator of this class can review homework.");
    return course;
  }

  private view(s: AssignmentSubmission, dueAt?: Date) {
    return {
      id: String(s._id),
      lessonKey: s.lessonKey,
      text: s.text ?? "",
      files: (s.files ?? []).map((f, i) => ({ index: i, fileName: f.fileName, mimeType: f.mimeType, size: f.size })),
      status: s.status,
      grade: s.grade ?? "",
      feedback: s.feedback ?? "",
      attempts: s.attempts ?? 1,
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt ?? null,
      gradedByName: s.gradedByName ?? "",
      late: !!dueAt && new Date(s.submittedAt).getTime() > new Date(dueAt).getTime(),
    };
  }

  private async cleanup(files: Express.Multer.File[] = []) {
    await Promise.all(files.map((f) => (f?.path ? unlink(f.path).catch(() => undefined) : undefined)));
  }

  /* ---------------------------------------------------------------- learner */

  async mine(code: string, key: string, actor: AcademyActor) {
    const course = await this.course(code);
    const lesson = this.assignmentLesson(course, key);
    const s = await this.submissionModel.findOne({ courseCode: course.code, lessonKey: key, studentId: new Types.ObjectId(actor.userId) }).exec();
    return s ? this.view(s, lesson.dueAt) : null;
  }

  async submit(code: string, key: string, text: string | undefined, keepFiles: number[], uploads: Express.Multer.File[], actor: AcademyActor) {
    try {
      const course = await this.course(code);
      const lesson = this.assignmentLesson(course, key);
      const enrollment = await this.enrollment(course.code, actor.userId);
      if (!enrollment) throw new ForbiddenException("Enroll in this class first.");

      const answer = String(text ?? "").trim().slice(0, 20000);
      for (const f of uploads) {
        const mime = (f.mimetype || "").toLowerCase();
        if (!ALLOWED_MIME.some((re) => re.test(mime))) throw new BadRequestException(`"${f.originalname}" can't be attached. Use PDF, Word, Excel, PowerPoint, images, audio, video or ZIP.`);
        if (f.size > MAX_SUBMISSION_BYTES) throw new BadRequestException(`"${f.originalname}" is larger than 25 MB.`);
      }

      const studentId = new Types.ObjectId(actor.userId);
      const existing = await this.submissionModel.findOne({ courseCode: course.code, lessonKey: key, studentId }).exec();
      if (existing?.status === "graded") throw new BadRequestException("This assignment is already graded. Ask your teacher to return it if you need to change it.");

      // Files kept from the previous hand-in (by position), plus the new uploads.
      const kept: SubmissionFile[] = existing ? (existing.files ?? []).filter((_f, i) => keepFiles.includes(i)) : [];
      if (kept.length + uploads.length > MAX_SUBMISSION_FILES) throw new BadRequestException(`Attach at most ${MAX_SUBMISSION_FILES} files.`);
      if (!answer && !kept.length && !uploads.length) throw new BadRequestException("Write your answer or attach a file.");

      const added: SubmissionFile[] = [];
      for (const f of uploads) {
        const mime = (f.mimetype || "").toLowerCase();
        const storageKey = this.storage.createObjectKey(`academy/submissions/${course.code}/${actor.userId}`, f.originalname);
        await this.storage.uploadFile(f.path, storageKey, mime);
        added.push({ storageKey, fileName: f.originalname.slice(0, 200), mimeType: mime, size: f.size });
      }

      const now = new Date();
      const doc =
        existing ??
        new this.submissionModel({ courseCode: course.code, lessonKey: key, studentId, enrollmentId: enrollment._id, attempts: 0, history: [] });
      doc.text = answer;
      doc.files = [...kept, ...added];
      doc.status = "submitted";
      doc.submittedAt = now;
      doc.attempts = (doc.attempts ?? 0) + 1;
      doc.history.push({ action: "submitted", at: now, byName: actor.name });
      await doc.save();
      this.logger.log(`Homework ${course.code}/${key} handed in by ${actor.userId} (attempt ${doc.attempts})`);
      return this.view(doc, lesson.dueAt);
    } finally {
      await this.cleanup(uploads);
    }
  }

  /** Signed link to an attached file: for the learner who sent it and the class owner. */
  async fileUrl(submissionId: string, index: number, actor: AcademyActor, asOwnerOf?: string) {
    if (!Types.ObjectId.isValid(submissionId)) throw new NotFoundException("Submission not found.");
    const s = await this.submissionModel.findById(submissionId).exec();
    if (!s) throw new NotFoundException("Submission not found.");
    if (asOwnerOf) {
      const course = await this.ownedCourse(asOwnerOf, actor);
      if (course.code !== s.courseCode) throw new NotFoundException("Submission not found.");
    } else if (String(s.studentId) !== actor.userId) {
      throw new ForbiddenException("This isn't your submission.");
    }
    const f = (s.files ?? [])[index];
    if (!f) throw new NotFoundException("File not found.");
    // A Fockis-signed link streamed by GET /academy/learn/media/:token.
    const url = mediaPath(f.storageKey, f.mimeType, f.fileName, true, 60 * 30);
    return { url, fileName: f.fileName };
  }

  /* ---------------------------------------------------------------- class owner */

  async listForOwner(code: string, actor: AcademyActor, status?: string) {
    const course = await this.ownedCourse(code, actor);
    const lessons = (course.lessons ?? []).filter((l) => l.type === "assignment");
    const filter: Record<string, unknown> = { courseCode: course.code };
    if (status === "submitted" || status === "returned" || status === "graded") filter.status = status;
    const rows = await this.submissionModel.find(filter).sort({ status: 1, submittedAt: 1 }).limit(1000).exec();
    const users = await this.userModel.find({ _id: { $in: rows.map((r) => r.studentId) } }, { name: 1, email: 1 }).lean().exec();
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const lessonByKey = new Map(lessons.map((l) => [l.key, l]));
    const learners = await this.enrollmentModel.countDocuments({ courseCode: course.code }).exec();
    return {
      assignments: lessons.map((l) => ({
        key: l.key,
        title: l.title,
        dueAt: l.dueAt ?? null,
        learners,
        handedIn: rows.filter((r) => r.lessonKey === l.key).length,
        toReview: rows.filter((r) => r.lessonKey === l.key && r.status === "submitted").length,
      })),
      items: rows
        .filter((r) => lessonByKey.has(r.lessonKey))
        .map((r) => {
          const u = byId.get(String(r.studentId));
          const l = lessonByKey.get(r.lessonKey)!;
          return { ...this.view(r, l.dueAt), lessonTitle: l.title, student: { id: String(r.studentId), name: u?.name ?? "Learner", email: u?.email ?? "" } };
        }),
    };
  }

  async review(code: string, submissionId: string, action: "grade" | "return", grade: string | undefined, feedback: string | undefined, actor: AcademyActor) {
    const course = await this.ownedCourse(code, actor);
    if (!Types.ObjectId.isValid(submissionId)) throw new NotFoundException("Submission not found.");
    const s = await this.submissionModel.findOne({ _id: new Types.ObjectId(submissionId), courseCode: course.code }).exec();
    if (!s) throw new NotFoundException("Submission not found.");
    const lesson = this.assignmentLesson(course, s.lessonKey);
    const note = String(feedback ?? "").trim().slice(0, 4000);
    const mark = String(grade ?? "").trim().slice(0, 40);
    if (action === "return" && note.length < 3) throw new BadRequestException("Tell the learner what to change.");
    if (action === "grade" && !mark && !note) throw new BadRequestException("Give a grade or some feedback.");

    const now = new Date();
    s.status = action === "grade" ? "graded" : "returned";
    s.grade = action === "grade" ? mark || undefined : s.grade;
    s.feedback = note || undefined;
    s.gradedAt = now;
    s.gradedByName = actor.name;
    s.history.push({ action: action === "grade" ? "graded" : "returned", at: now, byName: actor.name, grade: mark || undefined, feedback: note || undefined });
    await s.save();

    // A graded assignment completes the lesson (progress, and the certificate when everything is done).
    if (action === "grade") {
      const enrollment = await this.enrollment(course.code, String(s.studentId));
      if (enrollment) await this.studio.completeForGrading(course, enrollment, lesson.key);
    }
    this.logger.log(`Homework ${course.code}/${s.lessonKey} ${s.status} for ${s.studentId} by ${actor.userId}`);
    return this.view(s, lesson.dueAt);
  }
}
