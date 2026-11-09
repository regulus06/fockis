import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

/**
 * CAREER PROFILE
 *
 * A job seeker's professional profile on Fockis Careers.
 * Name and photo come from the Fockis account (users collection);
 * this document holds career-specific data only.
 */
export type CareerProfileDocument = HydratedDocument<CareerProfile>;

@Schema()
export class CareerEducation {
  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  school!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  degree?: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  fieldOfStudy?: string;

  @Prop({ type: String, trim: true, maxlength: 20 })
  startYear?: string;

  @Prop({ type: String, trim: true, maxlength: 20 })
  endYear?: string;
}

@Schema()
export class CareerExperience {
  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  title!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  company!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  location?: string;

  /** YYYY-MM */
  @Prop({ type: String, trim: true, maxlength: 7 })
  startDate?: string;

  /** YYYY-MM, empty when current */
  @Prop({ type: String, trim: true, maxlength: 7 })
  endDate?: string;

  @Prop({ type: Boolean, default: false })
  current!: boolean;

  @Prop({ type: String, trim: true, maxlength: 3000 })
  description?: string;
}

@Schema()
export class CareerCertification {
  @Prop({ type: String, required: true, trim: true, maxlength: 150 })
  name!: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  issuer?: string;

  @Prop({ type: String, trim: true, maxlength: 20 })
  year?: string;

  @Prop({ type: Boolean, default: false })
  inProgress!: boolean;
}

@Schema({ _id: false })
export class CareerResume {
  @Prop({ type: String, required: true, trim: true, maxlength: 255 })
  fileName!: string;

  /** Private object key in Cloud Storage. Never exposed to clients. */
  @Prop({ type: String, required: true, trim: true, maxlength: 500 })
  storageKey!: string;

  @Prop({ type: String, required: true, maxlength: 120 })
  mimeType!: string;

  @Prop({ type: Number, required: true, min: 0 })
  size!: number;

  @Prop({ type: Date, required: true })
  uploadedAt!: Date;
}

@Schema()
export class CareerJobAlert {
  @Prop({ type: String, trim: true, maxlength: 150 })
  keywords?: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  location?: string;

  @Prop({ type: String, trim: true, maxlength: 30 })
  type?: string;

  @Prop({ type: Boolean, default: false })
  remoteOnly!: boolean;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  /** Jobs posted after this date count as "new" for the alert. */
  @Prop({ type: Date, required: true })
  lastViewedAt!: Date;
}

@Schema({
  timestamps: true,
  collection: "career_profiles",
})
export class CareerProfile {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, trim: true, maxlength: 150 })
  headline?: string;

  @Prop({ type: String, trim: true, maxlength: 3000 })
  summary?: string;

  @Prop({ type: String, trim: true, maxlength: 150 })
  location?: string;

  @Prop({ type: String, trim: true, maxlength: 30 })
  phone?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  linkedInUrl?: string;

  @Prop({ type: String, trim: true, maxlength: 2048 })
  websiteUrl?: string;

  @Prop({ type: String, enum: ["actively_looking", "open", "not_looking"], default: "open" })
  availability!: "actively_looking" | "open" | "not_looking";

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ type: [CareerEducation], default: [] })
  education!: (CareerEducation & { _id: Types.ObjectId })[];

  @Prop({ type: [CareerExperience], default: [] })
  experience!: (CareerExperience & { _id: Types.ObjectId })[];

  @Prop({ type: [CareerCertification], default: [] })
  certifications!: (CareerCertification & { _id: Types.ObjectId })[];

  @Prop({ type: CareerResume })
  resume?: CareerResume;

  @Prop({ type: [CareerJobAlert], default: [] })
  jobAlerts!: (CareerJobAlert & { _id: Types.ObjectId })[];
}

export const CareerProfileSchema = SchemaFactory.createForClass(CareerProfile);
