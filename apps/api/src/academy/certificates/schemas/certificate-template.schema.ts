import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types, SchemaTypes } from "mongoose";

export type CertificateTemplateDocument = HydratedDocument<CertificateTemplate>;

/**
 * An instructor's certificate design. `design` is the full editor state
 * (base template key, colours, fonts, orientation, element list with
 * positions, uploaded logo/signature as data URLs). Issued certificates copy
 * it, so editing a template later never changes certificates already issued.
 */
@Schema({ timestamps: true, collection: "academy_certificate_templates" })
export class CertificateTemplate {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: "AcademyUser", required: true, index: true })
  ownerId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ required: true, trim: true })
  baseTemplate!: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  design!: Record<string, unknown>;

  @Prop({ enum: ["draft", "published"], default: "draft" })
  status!: "draft" | "published";
}

export const CertificateTemplateSchema = SchemaFactory.createForClass(CertificateTemplate);
