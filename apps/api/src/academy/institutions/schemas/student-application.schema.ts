import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type StudentApplicationDocument = HydratedDocument<StudentApplication>;

/** A person asking to join a school. Staff approve (creates their login) or reject. */
@Schema({ timestamps: true, collection: "academy_student_applications" })
export class StudentApplication {
  _id!: Types.ObjectId;
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: "AcademyInstitution", required: true, index: true })
  institutionId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string;

  /** The applicant's own email (where the temporary password will be sent once email is connected). */
  @Prop({ required: true, trim: true, lowercase: true })
  personalEmail!: string;

  @Prop({ trim: true }) phone?: string;
  @Prop({ trim: true, maxlength: 160 }) program?: string;
  @Prop({ trim: true, maxlength: 2000 }) message?: string;

  @Prop({ enum: ["pending", "approved", "rejected"], default: "pending", index: true })
  status!: "pending" | "approved" | "rejected";

  @Prop({ trim: true }) reason?: string;
  @Prop({ type: Types.ObjectId, ref: "AcademyUser" }) reviewedBy?: Types.ObjectId;
  @Prop() reviewedAt?: Date;

  /** The student account created on approval. */
  @Prop({ type: Types.ObjectId, ref: "AcademyUser" }) userId?: Types.ObjectId;
}

export const StudentApplicationSchema = SchemaFactory.createForClass(StudentApplication);
StudentApplicationSchema.index({ institutionId: 1, personalEmail: 1, status: 1 });
