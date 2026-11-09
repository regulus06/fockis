/**
 * branch.schema.ts
 * -----------------------------------------------------------------------------
 * Mongoose schema for Church branches / locations.
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts -> Branch
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
   BRANCH ADDRESS
============================================================================ */

@Schema({ _id: false })
export class BranchAddress {
  @Prop({
    type: String,
    required: true,
  })
  line1!: string;

  @Prop({
    type: String,
  })
  line2?: string;

  @Prop({
    type: String,
    required: true,
  })
  city!: string;

  @Prop({
    type: String,
  })
  state?: string;

  @Prop({
    type: String,
  })
  postalCode?: string;

  @Prop({
    type: String,
    required: true,
  })
  country!: string;
}

export const BranchAddressSchema =
  SchemaFactory.createForClass(
    BranchAddress,
  );

/* ============================================================================
   BRANCH CONTACT
============================================================================ */

@Schema({ _id: false })
export class BranchContact {
  @Prop({
    type: String,
  })
  email?: string;

  @Prop({
    type: String,
  })
  phone?: string;

  @Prop({
    type: String,
  })
  website?: string;
}

export const BranchContactSchema =
  SchemaFactory.createForClass(
    BranchContact,
  );

/* ============================================================================
   BRANCH DOCUMENT
============================================================================ */

export type BranchDocument =
  Branch & Document;

/* ============================================================================
   BRANCH
============================================================================ */

@Schema({
  timestamps: true,
  collection: 'church_branches',
})
export class Branch {
  /* --------------------------------------------------------------------------
     ORGANIZATION
  -------------------------------------------------------------------------- */

  @Prop({
    type: Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* --------------------------------------------------------------------------
     NAME
  -------------------------------------------------------------------------- */

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  /* --------------------------------------------------------------------------
     MAIN LOCATION
  -------------------------------------------------------------------------- */

  @Prop({
    type: Boolean,
    default: false,
  })
  isMainLocation!: boolean;

  /* --------------------------------------------------------------------------
     ADDRESS
  -------------------------------------------------------------------------- */

  @Prop({
    type: BranchAddressSchema,
  })
  address?: BranchAddress;

  /* --------------------------------------------------------------------------
     CONTACT
  -------------------------------------------------------------------------- */

  @Prop({
    type: BranchContactSchema,
  })
  contact?: BranchContact;

  /* --------------------------------------------------------------------------
     SERVICE TIMES
  -------------------------------------------------------------------------- */

  @Prop({
    type: [String],
    default: [],
  })
  serviceTimes!: string[];

  /* --------------------------------------------------------------------------
     TIMEZONE
  -------------------------------------------------------------------------- */

  @Prop({
    type: String,
  })
  timezone?: string;

  /* --------------------------------------------------------------------------
     PHOTO
  -------------------------------------------------------------------------- */

  @Prop({
    type: String,
    default: null,
  })
  photoUrl?: string | null;

  /* --------------------------------------------------------------------------
     TIMESTAMPS
  -------------------------------------------------------------------------- */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA
============================================================================ */

export const BranchSchema =
  SchemaFactory.createForClass(
    Branch,
  );