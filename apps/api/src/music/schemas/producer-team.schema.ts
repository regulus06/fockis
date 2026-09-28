import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type ProducerTeamMemberDocument =
  HydratedDocument<ProducerTeamMember>;

export type ProducerTeamRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'editor'
  | 'marketing'
  | 'analyst'
  | 'moderator';

export type ProducerTeamMemberStatus =
  | 'active'
  | 'invited'
  | 'suspended';

@Schema({
  _id: false,
})
export class ProducerTeamPermissions {
  @Prop({ default: false })
  profile!: boolean;

  @Prop({ default: false })
  content!: boolean;

  @Prop({ default: false })
  publishing!: boolean;

  @Prop({ default: false })
  analytics!: boolean;

  @Prop({ default: false })
  marketing!: boolean;

  @Prop({ default: false })
  moderation!: boolean;

  @Prop({ default: false })
  team!: boolean;

  @Prop({ default: false })
  earnings!: boolean;
}

export const ProducerTeamPermissionsSchema =
  SchemaFactory.createForClass(
    ProducerTeamPermissions,
  );

@Schema({
  timestamps: true,
})
export class ProducerTeamMember {
  @Prop({
    type: Types.ObjectId,
    ref: 'ProducerProfile',
    required: true,
    index: true,
  })
  producerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: false,
    default: null,
    index: true,
  })
  userId!: Types.ObjectId | null;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  email!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    enum: [
      'owner',
      'admin',
      'manager',
      'editor',
      'marketing',
      'analyst',
      'moderator',
    ],
  })
  role!: ProducerTeamRole;

  @Prop({
    required: true,
    enum: [
      'active',
      'invited',
      'suspended',
    ],
    default: 'invited',
  })
  status!: ProducerTeamMemberStatus;

  @Prop({
    type: ProducerTeamPermissionsSchema,
    required: true,
    default: () => ({
      profile: false,
      content: false,
      publishing: false,
      analytics: false,
      marketing: false,
      moderation: false,
      team: false,
      earnings: false,
    }),
  })
  permissions!: ProducerTeamPermissions;

  @Prop({
    type: Date,
    default: null,
  })
  invitedAt!: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  joinedAt!: Date | null;
}

export const ProducerTeamMemberSchema =
  SchemaFactory.createForClass(
    ProducerTeamMember,
  );

ProducerTeamMemberSchema.index(
  {
    producerId: 1,
    email: 1,
  },
  {
    unique: true,
  },
);

ProducerTeamMemberSchema.index({
  producerId: 1,
  role: 1,
});

ProducerTeamMemberSchema.index({
  producerId: 1,
  status: 1,
});