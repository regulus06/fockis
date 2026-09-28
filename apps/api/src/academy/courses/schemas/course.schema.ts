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