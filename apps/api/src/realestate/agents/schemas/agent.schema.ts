import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({ _id: false })
export class SocialLinks {
  @Prop()
  facebook?: string;

  @Prop()
  instagram?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  website?: string;
}

const SocialLinksSchema = SchemaFactory.createForClass(SocialLinks);

@Schema({ timestamps: true })
export class Agent {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  })
  user: Types.ObjectId;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  licenseNumber: string;

  @Prop()
  brokerage?: string;

  @Prop()
  bio?: string;

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  officeAddress?: string;

  @Prop()
  profileImage?: string;

  @Prop()
  coverImage?: string;

  @Prop({ default: 0 })
  yearsExperience: number;

  @Prop({ type: [String], default: [] })
  specialties: string[];

  @Prop({ type: [String], default: [] })
  serviceAreas: string[];

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({
    enum: ['pending', 'verified', 'suspended'],
    default: 'pending',
  })
  verificationStatus: string;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ default: true })
  acceptingClients: boolean;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: 0 })
  totalSales: number;

  @Prop({ default: 0 })
  activeListings: number;

  @Prop({ default: 0 })
  soldListings: number;

  @Prop({ default: 0 })
  rentalListings: number;

  @Prop()
  commissionRate?: number;

  @Prop({ type: SocialLinksSchema })
  socialLinks?: SocialLinks;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);