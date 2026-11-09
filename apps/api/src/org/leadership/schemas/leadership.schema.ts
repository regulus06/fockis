/**
 * leadership.schema.ts
 * -----------------------------------------------------------------------------
 * Mongoose schema for a Leadership record.
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts -> LeadershipMember
 *
 * LeadershipRole is defined locally because there is no dedicated
 * leadership-role.enum.ts file in the Church enums.
 * -----------------------------------------------------------------------------
 */

import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Types,
} from 'mongoose';

/* ============================================================================
   LEADERSHIP ROLE
   ========================================================================== */

export enum LeadershipRole {
  Owner = 'owner',
  Administrator = 'administrator',
  PastorDirector = 'pastor_director',
  Leader = 'leader',
  Staff = 'staff',
}

export type LeadershipDocument =
  Leadership & Document;

/* ============================================================================
   USER SNAPSHOT
   ========================================================================== */

@Schema({
  _id: false,
})
export class LeadershipUserSnapshot {
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  id!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  displayName!: string;

  @Prop({
    type: String,
    default: null,
  })
  avatarUrl?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  email?: string | null;
}

export const LeadershipUserSnapshotSchema =
  SchemaFactory.createForClass(
    LeadershipUserSnapshot,
  );

/* ============================================================================
   LEADERSHIP
   ========================================================================== */

@Schema({
  timestamps: true,
  collection: 'church_leadership',
})
export class Leadership {
  /* --------------------------------------------------------------------------
     ORGANIZATION
     ------------------------------------------------------------------------ */

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
     USER SNAPSHOT
     ------------------------------------------------------------------------ */

  @Prop({
    type: LeadershipUserSnapshotSchema,
    required: true,
  })
  user!: LeadershipUserSnapshot;

  /* --------------------------------------------------------------------------
     ROLE
     ------------------------------------------------------------------------ */

  @Prop({
    type: String,
    enum: LeadershipRole,
    required: true,
    index: true,
  })
  role!: LeadershipRole;

  /* --------------------------------------------------------------------------
     PROFILE
     ------------------------------------------------------------------------ */

  @Prop({
    type: String,
  })
  title?: string;

  @Prop({
    type: String,
  })
  bio?: string;

  /* --------------------------------------------------------------------------
     DISPLAY ORDER
     ------------------------------------------------------------------------ */

  @Prop({
    type: Number,
    default: 0,
  })
  order?: number;

  /* --------------------------------------------------------------------------
     TIMESTAMPS
     ------------------------------------------------------------------------ */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA
   ========================================================================== */

export const LeadershipSchema =
  SchemaFactory.createForClass(
    Leadership,
  );

/* ============================================================================
   INDEXES
   ========================================================================== */

LeadershipSchema.index(
  {
    organizationId: 1,
    'user.id': 1,
    role: 1,
  },
  {
    unique: true,
  },
);