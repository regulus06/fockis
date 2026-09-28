import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type AcademyRole =
  | "student"
  | "instructor"
  | "advisor"
  | "admissions"
  | "employer"
  | "staff"
  | "administrator";

export type AcademyUserDocument =
  HydratedDocument<AcademyUser>;

export interface AcademySession {
  id: string;
  device?: string;
  browser?: string;
  ipAddress?: string;
  location?: string;
  createdAt?: Date;
  lastActiveAt?: Date;
  current?: boolean;
}

export interface AcademyLoginHistoryItem {
  id: string;
  email?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  success: boolean;
  createdAt?: Date;
}

export interface AcademySecurityEvent {
  id: string;
  type: string;
  description?: string;
  ipAddress?: string;
  createdAt?: Date;
}

@Schema({
  _id: false,
})
export class AcademySessionSchemaClass {
  @Prop({
    required: true,
  })
  id!: string;

  @Prop()
  device?: string;

  @Prop()
  browser?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  location?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  lastActiveAt?: Date;

  @Prop({
    default: false,
  })
  current?: boolean;
}

@Schema({
  _id: false,
})
export class AcademyLoginHistorySchemaClass {
  @Prop({
    required: true,
  })
  id!: string;

  @Prop()
  email?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  device?: string;

  @Prop()
  browser?: string;

  @Prop({
    required: true,
  })
  success!: boolean;

  @Prop()
  createdAt?: Date;
}

@Schema({
  _id: false,
})
export class AcademySecurityEventSchemaClass {
  @Prop({
    required: true,
  })
  id!: string;

  @Prop({
    required: true,
  })
  type!: string;

  @Prop()
  description?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  createdAt?: Date;
}

@Schema({
  timestamps: true,
})
export class AcademyUser {
  _id!: Types.ObjectId;

  createdAt!: Date;

  updatedAt!: Date;

  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    default: "student",
    enum: [
      "student",
      "instructor",
      "advisor",
      "admissions",
      "employer",
      "staff",
      "administrator",
    ],
    index: true,
  })
  role!: AcademyRole;

  @Prop({
    required: false,
    trim: true,
    index: true,
  })
  studentSlug?: string;

  @Prop({
    default: true,
    index: true,
  })
  isActive!: boolean;

  @Prop({
    default: false,
  })
  twoFactorEnabled!: boolean;

  @Prop({
    select: false,
  })
  twoFactorSecret?: string;

  @Prop({
    type: [AcademySessionSchemaClass],
    default: [],
  })
  sessions!: AcademySession[];

  @Prop({
    type: [AcademyLoginHistorySchemaClass],
    default: [],
  })
  loginHistory!: AcademyLoginHistoryItem[];

  @Prop({
    type: [AcademySecurityEventSchemaClass],
    default: [],
  })
  securityEvents!: AcademySecurityEvent[];
}

export const AcademyUserSchema =
  SchemaFactory.createForClass(
    AcademyUser,
  );