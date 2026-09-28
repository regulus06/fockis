import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminRoleDocument = HydratedDocument<AdminRole>;

@Schema({
  timestamps: true,
  collection: 'admin_roles',
})
export class AdminRole {
  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  slug!: string;

  @Prop({
    default: '',
    trim: true,
    maxlength: 500,
  })
  description!: string;

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

  @Prop({
    type: Boolean,
    default: false,
  })
  isSystemRole!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  createdBy!: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  updatedBy!: Types.ObjectId | null;
}

export const AdminRoleSchema =
  SchemaFactory.createForClass(AdminRole);

AdminRoleSchema.index({
  name: 1,
});

AdminRoleSchema.index({
  isActive: 1,
});

AdminRoleSchema.index({
  permissions: 1,
});