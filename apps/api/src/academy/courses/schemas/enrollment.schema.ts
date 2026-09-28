import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

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