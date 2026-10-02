import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type AdminRoleDocument =
  HydratedDocument<AdminRole>;

@Schema({
  timestamps: true,
  collection: "admin_roles",
})
export class AdminRole {
  @Prop({
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
    minlength: 2,
    maxlength: 100,
  })
  slug!: string;

  @Prop({
    default: "",
    trim: true,
    maxlength: 500,
  })
  description!: string;

  /**
   * Permissions belonging to this custom role.
   *
   * These are validated by AdminRoleService against
   * ADMIN_PERMISSION_CATALOG before being saved.
   */
  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  permissions!: string[];

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive!: boolean;

  /**
   * System roles are protected.
   *
   * Custom roles created by the Super Admin MUST
   * always have this set to false.
   */
  @Prop({
    type: Boolean,
    default: false,
    immutable: true,
  })
  isSystemRole!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  createdBy!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  updatedBy!: Types.ObjectId | null;
}

export const AdminRoleSchema =
  SchemaFactory.createForClass(AdminRole);

/**
 * Unique role slug.
 */
AdminRoleSchema.index(
  { slug: 1 },
  { unique: true },
);

/**
 * Useful indexes for administrator role management.
 */
AdminRoleSchema.index({
  name: 1,
});

AdminRoleSchema.index({
  isActive: 1,
});

AdminRoleSchema.index({
  permissions: 1,
});

AdminRoleSchema.index({
  isSystemRole: 1,
});