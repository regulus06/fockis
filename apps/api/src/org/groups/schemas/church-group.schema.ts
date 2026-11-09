/**
 * church-group.schema.ts
 * -----------------------------------------------------------------------------
 * Mongoose schema for a ChurchGroup.
 *
 * A group may optionally belong to a Department.
 *
 * Membership:
 * - leaderIds references Membership documents.
 * - Member roster/count is derived from Membership.groupIds.
 *
 * Creator:
 * - createdByUserId stores the authenticated user who originally created the
 *   group.
 * - This value is permanent and is never changed by archive/restore.
 * - The creator is NOT supplied by the client.
 * - ChurchGroupsService gets the creator from the authenticated JWT.
 *
 * Archive:
 * - Removing a group is a SOFT DELETE.
 * - The group document remains in MongoDB.
 * - Membership.groupIds remain unchanged.
 * - leaderIds remain unchanged.
 * - createdByUserId remains unchanged.
 * - createdAt remains unchanged.
 * - archivedAt records when the group was archived.
 * - archivedByUserId records who archived it.
 * -----------------------------------------------------------------------------
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

import { GroupType } from "../../enums/group-type.enum";

export type ChurchGroupDocument =
  ChurchGroup & Document;

@Schema({
  timestamps: true,
  collection: "church_groups",
})
export class ChurchGroup {
  /* =========================================================================
     ORGANIZATION
     ========================================================================= */

  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* =========================================================================
     CREATOR
     ========================================================================= */

  /**
   * Permanent creator of this group.
   *
   * IMPORTANT:
   * - This is populated by the backend from the authenticated JWT.
   * - The frontend must never be allowed to set this value.
   * - It remains preserved if the creator leaves the organization.
   * - It remains preserved if the group is archived.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  })
  createdByUserId?: Types.ObjectId | null;

  /* =========================================================================
     DEPARTMENT
     ========================================================================= */

  @Prop({
    type: Types.ObjectId,
    ref: "Department",
    default: null,
    index: true,
  })
  departmentId?: Types.ObjectId | null;

  /* =========================================================================
     BASIC INFORMATION
     ========================================================================= */

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    type: String,
    enum: GroupType,
    required: true,
    index: true,
  })
  groupType!: GroupType;

  @Prop({
    type: String,
    trim: true,
    default: "",
  })
  description?: string;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  photoUrl?: string | null;

  /* =========================================================================
     LEADERS
     ========================================================================= */

  /**
   * References Membership documents.
   *
   * This matches Department.leaderIds and the existing church membership
   * architecture.
   */
  @Prop({
    type: [Types.ObjectId],
    ref: "Membership",
    default: [],
  })
  leaderIds!: Types.ObjectId[];

  /* =========================================================================
     MEETING INFORMATION
     ========================================================================= */

  @Prop({
    type: String,
    trim: true,
  })
  meetingSchedule?: string;

  @Prop({
    type: String,
    trim: true,
  })
  location?: string;

  @Prop({
    type: Number,
    min: 1,
    default: null,
  })
  capacity?: number | null;

  /* =========================================================================
     ARCHIVE
     ========================================================================= */

  /**
   * Soft-delete state.
   *
   * false = active group
   * true  = archived group
   *
   * Default false ensures newly-created groups are visible.
   *
   * Legacy documents without this field are also treated as active by the
   * service queries.
   */
  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isArchived!: boolean;

  /**
   * Time at which the group was archived.
   */
  @Prop({
    type: Date,
    default: null,
  })
  archivedAt?: Date | null;

  /**
   * User who archived the group.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  archivedByUserId?: Types.ObjectId | null;

  /* =========================================================================
     TIMESTAMPS
     ========================================================================= */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ===========================================================================
   SCHEMA
   =========================================================================== */

export const ChurchGroupSchema =
  SchemaFactory.createForClass(
    ChurchGroup,
  );

/* ===========================================================================
   INDEXES
   =========================================================================== */

/**
 * Organization + name lookup.
 */
ChurchGroupSchema.index({
  organizationId: 1,
  name: 1,
});

/**
 * Organization + archive state.
 *
 * Helps normal active-group queries and administrator archive queries.
 */
ChurchGroupSchema.index({
  organizationId: 1,
  isArchived: 1,
});

/**
 * Useful when listing groups inside a department while respecting archive
 * state.
 */
ChurchGroupSchema.index({
  organizationId: 1,
  departmentId: 1,
  isArchived: 1,
});

/**
 * Useful for locating all groups created by a particular user.
 *
 * This supports creator visibility after the creator leaves the organization.
 */
ChurchGroupSchema.index({
  organizationId: 1,
  createdByUserId: 1,
});