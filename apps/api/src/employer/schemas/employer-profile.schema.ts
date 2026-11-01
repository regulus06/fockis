import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmployerProfileDocument = HydratedDocument<EmployerProfile>;

@Schema({ timestamps: true, collection: 'employerprofiles' })
export class EmployerProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 160 })
  companyName!: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true, maxlength: 180 })
  slug!: string;

  @Prop({ trim: true, maxlength: 5000 })
  description?: string;

  @Prop({ trim: true, maxlength: 2048 })
  website?: string;

  @Prop({ trim: true, maxlength: 120 })
  industry?: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  country!: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  city!: string;

  @Prop({ trim: true, maxlength: 100 })
  stateProvince?: string;

  @Prop({ enum: ['not_submitted', 'pending', 'approved', 'rejected', 'more_information_required'], default: 'not_submitted', index: true })
  verificationStatus!: string;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  coverImageUrl?: string;
}

export const EmployerProfileSchema = SchemaFactory.createForClass(EmployerProfile);
EmployerProfileSchema.index({ ownerId: 1, createdAt: -1 });
