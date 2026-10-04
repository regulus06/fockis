import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type SignupFormDocument = HydratedDocument<SignupForm>;

@Schema({ _id: false })
export class SignupFormField {
  @Prop({ required: true })
  id: string;

  @Prop({
    required: true,
    enum: [
      "first_name",
      "last_name",
      "email",
      "phone",
      "birthday",
      "address",
      "custom",
      "checkbox",
      "dropdown",
      "radio",
      "consent",
    ],
  })
  type: string;

  @Prop({ required: true, default: "" })
  label: string;

  @Prop({ default: "" })
  placeholder: string;

  @Prop({ default: false })
  required: boolean;

  @Prop({ type: [String], default: [] })
  options: string[];
}

export const SignupFormFieldSchema =
  SchemaFactory.createForClass(SignupFormField);

@Schema({
  timestamps: true,
  collection: "fockis_mail_forms",
})
export class SignupForm {
  @Prop({ required: true, index: true })
  name: string;

  /**
   * Frontend calls this businessId.
   *
   * Internally Fockis Mail uses workspaceId for tenant isolation.
   */
  @Prop({ required: true, index: true })
  workspaceId: string;

  /**
   * Owner of the form.
   */
  @Prop({
    required: true,
    index: true,
    type: Types.ObjectId,
  })
  ownerId: Types.ObjectId;

  /**
   * Audience/list that receives submissions.
   */
  @Prop({ required: true })
  audienceId: string;

  @Prop({
    required: true,
    enum: ["embed", "popup", "inline", "landing"],
    default: "inline",
  })
  display: string;

  @Prop({ default: "Join our list" })
  title: string;

  @Prop({ default: "Get updates from Fockis." })
  description: string;

  @Prop({ default: "Subscribe" })
  submitLabel: string;

  @Prop({
    type: [SignupFormFieldSchema],
    default: [],
  })
  fields: SignupFormField[];

  @Prop({ default: 0 })
  submissions: number;

  @Prop({ default: 0 })
  conversionRate: number;
}

export const SignupFormSchema =
  SchemaFactory.createForClass(SignupForm);

SignupFormSchema.index({
  workspaceId: 1,
  ownerId: 1,
  createdAt: -1,
});

SignupFormSchema.index({
  workspaceId: 1,
  audienceId: 1,
});