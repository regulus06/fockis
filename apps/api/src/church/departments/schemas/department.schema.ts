/**
 * department.schema.ts
 * ---------------------------------------------------------------------------
 * Mongoose schema for a Church Department.
 *
 * Department membership:
 * - Membership.departmentIds contains department IDs.
 *
 * Department leaders:
 * - leaderIds contains Membership IDs.
 *
 * Ownership:
 * - createdByUserId permanently records the user who created the department.
 *
 * Archive:
 * - isArchived is a soft-delete flag.
 * - archivedAt records when the department was archived.
 * - archivedByUserId records who archived it.
 *
 * IMPORTANT:
 * Archiving NEVER removes department IDs from Membership documents.
 * This preserves membership history and allows the department to be restored.
 * ---------------------------------------------------------------------------
 */

import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

import { DepartmentType } from "../../enums/department-type.enum";

export type DepartmentDocument =
  Department & Document;

@Schema({
  timestamps: true,
  collection: "church_departments",
})
export class Department {
  /**
   * Organization that owns this department.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /**
   * User who originally created this department.
   *
   * This is intentionally preserved forever, including after archive.
   *
   * Optional at the database level so existing departments created before
   * this field existed do not break.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  })
  createdByUserId?: Types.ObjectId | null;

  /**
   * Optional branch association.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Branch",
    default: null,
  })
  branchId?: Types.ObjectId | null;

  /**
   * Department name.
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  /**
   * Department type.
   */
  @Prop({
    type: String,
    enum: DepartmentType,
    required: true,
    index: true,
  })
  departmentType!: DepartmentType;

  /**
   * Department description.
   */
  @Prop({
    type: String,
  })
  description?: string;

  /**
   * Optional department photo.
   */
  @Prop({
    type: String,
    default: null,
  })
  photoUrl?: string | null;

  /**
   * Membership IDs that are department leaders.
   */
  @Prop({
    type: [Types.ObjectId],
    ref: "Membership",
    default: [],
  })
  leaderIds!: Types.ObjectId[];

  /**
   * Soft archive flag.
   *
   * false = active
   * true  = archived
   */
  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isArchived!: boolean;

  /**
   * Time the department was archived.
   */
  @Prop({
    type: Date,
    default: null,
  })
  archivedAt?: Date | null;

  /**
   * User who archived the department.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  archivedByUserId?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DepartmentSchema =
  SchemaFactory.createForClass(
    Department,
  );

/**
 * Normal organization lookup.
 */
DepartmentSchema.index({
  organizationId: 1,
  name: 1,
});

/**
 * Efficient active/archived filtering.
 */
DepartmentSchema.index({
  organizationId: 1,
  isArchived: 1,
});

/**
 * Useful when displaying departments by branch.
 */
DepartmentSchema.index({
  organizationId: 1,
  branchId: 1,
  isArchived: 1,
});