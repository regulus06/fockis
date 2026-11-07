import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  SchemaTypes,
  Types,
} from "mongoose";

import { randomBytes } from "crypto";

const ENROLLMENT_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function newEnrollmentNumber(): string {
  const bytes = randomBytes(8);
  let out = "FAE-";
  for (let i = 0; i < 8; i++) out += ENROLLMENT_ALPHABET[bytes[i] % ENROLLMENT_ALPHABET.length];
  return out;
}

export type EnrollmentDocument =
  HydratedDocument<Enrollment>;

@Schema({
  timestamps: true,
})
export class Enrollment {
  _id!: Types.ObjectId;

  createdAt!: Date;

  updatedAt!: Date;

  @Prop({
    type: Types.ObjectId,
    ref: "AcademyUser",
    required: true,
    index: true,
  })
  studentId!: Types.ObjectId;

  @Prop({
    required: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  courseCode!: string;

  @Prop({
    default: 0,
    min: 0,
    max: 100,
  })
  progress!: number;

  @Prop({
    default: "—",
    trim: true,
  })
  grade!: string;

  @Prop({
    type: [Number],
    default: [],
  })
  completedModuleOrders!: number[];

  /**
   * Public enrollment verification number, e.g. FAE-7K3QX9M2.
   * Generated automatically for every new enrollment; older enrollments get
   * one the first time they are read (see ensureEnrollmentNumber).
   */
  @Prop({
    trim: true,
    uppercase: true,
  })
  enrollmentNumber?: string;

  // ---------------------------------------------------------------- studio
  /** How access was granted. */
  @Prop({ enum: ["free", "paid", "granted"], default: "free" })
  accessType!: string;

  /** Stripe PaymentIntent used to buy this enrollment (Fockis universal payments). */
  @Prop({ trim: true })
  paymentIntentId?: string;

  @Prop({ trim: true })
  paymentId?: string;

  @Prop({ min: 0 })
  paidAmount?: number;

  @Prop({ uppercase: true, trim: true })
  paidCurrency?: string;

  /** Lesson keys the learner finished (studio courses). */
  @Prop({ type: [String], default: [] })
  completedLessonKeys!: string[];

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  quizResults!: { lessonKey: string; score: number; passed: boolean; attempts: number; at: Date }[];

  @Prop()
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "IssuedCertificate" })
  certificateId?: Types.ObjectId;
}


export const EnrollmentSchema =
  SchemaFactory.createForClass(
    Enrollment,
  );

EnrollmentSchema.index(
  {
    studentId: 1,
    courseCode: 1,
  },
  {
    unique: true,
  },
);

EnrollmentSchema.index({
  courseCode: 1,
});

// A payment can unlock exactly one enrollment.
EnrollmentSchema.index(
  { paymentIntentId: 1 },
  { unique: true, partialFilterExpression: { paymentIntentId: { $type: "string" } } },
);

EnrollmentSchema.index(
  {
    enrollmentNumber: 1,
  },
  {
    unique: true,
    sparse: true,
  },
);

// Every new enrollment gets its verification number automatically.
EnrollmentSchema.pre("validate", function () {
  if (!this.enrollmentNumber) this.enrollmentNumber = newEnrollmentNumber();
});

/** Give an existing enrollment (created before numbers existed) its number. */
export async function ensureEnrollmentNumber(doc: EnrollmentDocument): Promise<string> {
  if (doc.enrollmentNumber) return doc.enrollmentNumber;
  for (let attempt = 0; attempt < 5; attempt++) {
    doc.enrollmentNumber = newEnrollmentNumber();
    try {
      await doc.save();
      return doc.enrollmentNumber;
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  throw new Error("Could not assign an enrollment number.");
}
