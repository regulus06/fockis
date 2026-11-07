import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type CourseDocument =
  HydratedDocument<Course>;

@Schema({ _id: false })
export class CourseModuleItem {
  @Prop({
    required: true,
    min: 1,
  })
  order!: number;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;
}

export const CourseModuleItemSchema =
  SchemaFactory.createForClass(
    CourseModuleItem,
  );

@Schema({ _id: false })
export class CourseAssignment {
  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  dueDate!: Date;

  @Prop({
    enum: [
      "upcoming",
      "submitted",
      "graded",
    ],
    default: "upcoming",
  })
  status!: string;

  @Prop()
  gradeLabel?: string;
}

export const CourseAssignmentSchema =
  SchemaFactory.createForClass(
    CourseAssignment,
  );


/**
 * Public outline of one lesson (Creator Studio). Media links, PDF keys, quiz
 * answers and live join links are NOT stored here — they live in
 * academy_lesson_contents and are only served to enrolled learners.
 */
@Schema({ _id: false })
export class CourseLesson {
  @Prop({ required: true, trim: true })
  key!: string;

  @Prop({ required: true, min: 1 })
  order!: number;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ enum: ["video", "pdf", "text", "quiz", "live"], required: true })
  type!: "video" | "pdf" | "text" | "quiz" | "live";

  /** Free preview lesson, visible before enrolling. */
  @Prop({ default: false })
  preview!: boolean;

  @Prop({ min: 0 })
  durationMin?: number;

  /** Live sessions only: when it starts (public so learners can plan). */
  @Prop()
  startsAt?: Date;

  @Prop({ trim: true })
  section?: string;
}

export const CourseLessonSchema =
  SchemaFactory.createForClass(
    CourseLesson,
  );

@Schema({
  timestamps: true,
})
export class Course {
  @Prop({
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true,
  })
  code!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    type: Types.ObjectId,
    ref: "Program",
    index: true,
  })
  programId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "AcademyUser",
    required: true,
    index: true,
  })
  instructorId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  instructor!: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    type: [CourseModuleItemSchema],
    default: [],
  })
  modules!: CourseModuleItem[];

  @Prop({
    type: [CourseAssignmentSchema],
    default: [],
  })
  assignments!: CourseAssignment[];

  /**
   * Who can find this course (Instructor Dashboard → Visibility).
   *   public  — listed in the catalog
   *   hidden  — not listed; reachable by direct link
   *   private — not listed; for invited students
   *   draft   — not listed; instructor/admin only
   *   school  — not listed publicly; only students of the course's school can join
   * Changing visibility never removes enrollments.
   */
  @Prop({
    enum: ["public", "hidden", "private", "draft", "school"],
    default: "public",
    index: true,
  })
  visibility!: string;

  /** When false, the course stays visible but new enrollment is closed. */
  @Prop({
    default: true,
  })
  enrollmentOpen!: boolean;

  // --------------------------------------------------------------------------
  // CREATOR STUDIO (open marketplace) — all optional, older courses unaffected
  // --------------------------------------------------------------------------

  /** What is being offered. */
  @Prop({
    enum: ["course", "seminar", "live_class", "workshop"],
    default: "course",
    index: true,
  })
  kind!: string;

  /** Business / brand shown as the provider, e.g. "Bell Bakery". */
  @Prop({ trim: true })
  brandName?: string;

  @Prop({ trim: true, index: true })
  category?: string;

  @Prop({ enum: ["beginner", "intermediate", "advanced", "all"], default: "all" })
  level!: string;

  @Prop({ trim: true })
  language?: string;

  @Prop({ trim: true })
  summary?: string;

  @Prop({ trim: true })
  coverUrl?: string;

  @Prop({ default: true, index: true })
  isFree!: boolean;

  @Prop({ default: 0, min: 0 })
  price!: number;

  @Prop({ default: "USD", uppercase: true, trim: true })
  currency!: string;

  /** Seminars / live classes: first session date (for listings). */
  @Prop()
  startsAt?: Date;

  /** 0 = unlimited seats. */
  @Prop({ default: 0, min: 0 })
  capacity!: number;

  @Prop({ type: [CourseLessonSchema], default: [] })
  lessons!: CourseLesson[];

  /** Issue a Fockis certificate automatically when a learner completes everything. */
  @Prop({ default: true })
  certificateEnabled!: boolean;

  @Prop({ type: Types.ObjectId, ref: "CertificateTemplate" })
  certificateTemplateId?: Types.ObjectId;

  /** Offered by an approved school (verified badge, members-only classes). */
  @Prop({ type: Types.ObjectId, ref: "AcademyInstitution", index: true })
  institutionId?: Types.ObjectId;

  /** The school teacher who teaches this class (key in the school's teacher list). */
  @Prop({ trim: true })
  teacherKey?: string;

  /** Teacher's name at the time it was set (shown on certificates and lists). */
  @Prop({ trim: true })
  teacherName?: string;

  /** Set while the owning school is blocked: hidden from the catalog, closed to new learners. */
  @Prop({ default: false })
  institutionBlocked!: boolean;

  /** Created through the open Creator Studio. */
  @Prop({ default: false, index: true })
  studio!: boolean;
}


export const CourseSchema =
  SchemaFactory.createForClass(
    Course,
  );

CourseSchema.index({
  programId: 1,
});

CourseSchema.index({
  instructorId: 1,
  code: 1,
});