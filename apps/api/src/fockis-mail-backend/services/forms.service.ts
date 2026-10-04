import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  SignupForm,
  SignupFormDocument,
} from "../schemas/signup-form.schema";

import {
  CreateSignupFormDto,
  UpdateSignupFormDto,
} from "../dto/fockis-mail.dto";

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(SignupForm.name)
    private readonly forms: Model<SignupFormDocument>,
  ) {}

  /**
   * Convert the MongoDB document into the exact shape
   * expected by the Fockis Mail frontend.
   */
  private serialize(form: SignupFormDocument | any) {
    const raw =
      typeof form.toObject === "function"
        ? form.toObject()
        : form;

    return {
      id: String(raw._id),

      businessId: String(raw.workspaceId),

      name: raw.name,

      audienceId: raw.audienceId,

      display: raw.display,

      title: raw.title,

      description: raw.description,

      submitLabel: raw.submitLabel,

      fields: Array.isArray(raw.fields)
        ? raw.fields.map((field: any) => ({
            id: field.id,
            type: field.type,
            label: field.label,
            placeholder: field.placeholder ?? "",
            required: Boolean(field.required),
            options: Array.isArray(field.options)
              ? field.options
              : [],
          }))
        : [],

      submissions: Number(raw.submissions ?? 0),

      conversionRate: Number(raw.conversionRate ?? 0),

      updatedAt:
        raw.updatedAt instanceof Date
          ? raw.updatedAt.toISOString()
          : raw.updatedAt,
    };
  }

  /**
   * GET /fockis-mail/forms
   */
  async list(
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const forms = await this.forms
      .find({
        ownerId,
        workspaceId,
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    return forms.map((form) => this.serialize(form));
  }

  /**
   * GET /fockis-mail/forms/:id
   */
  async get(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Form not found");
    }

    const form = await this.forms.findOne({
      _id: id,
      ownerId,
      workspaceId,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    return this.serialize(form);
  }

  /**
   * POST /fockis-mail/forms
   */
  async create(
    dto: CreateSignupFormDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!dto.name?.trim()) {
      throw new BadRequestException(
        "Form name is required.",
      );
    }

    if (!dto.audienceId?.trim()) {
      throw new BadRequestException(
        "Audience is required.",
      );
    }

    const form = await this.forms.create({
      name: dto.name.trim(),

      workspaceId,

      ownerId,

      audienceId: dto.audienceId.trim(),

      display: "inline",

      title: "Join our list",

      description: "Get updates from Fockis.",

      submitLabel: "Subscribe",

      submissions: 0,

      conversionRate: 0,

      fields: [
        {
          id: `f_${new Types.ObjectId().toString()}`,
          type: "email",
          label: "Email",
          placeholder: "you@example.com",
          required: true,
          options: [],
        },
      ],
    });

    return this.serialize(form);
  }

  /**
   * PUT /fockis-mail/forms/:id
   */
  async update(
    id: string,
    dto: UpdateSignupFormDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Form not found");
    }

    const form = await this.forms.findOne({
      _id: id,
      ownerId,
      workspaceId,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    if (
      dto.name !== undefined &&
      !dto.name.trim()
    ) {
      throw new BadRequestException(
        "Form name cannot be empty.",
      );
    }

    if (
      dto.audienceId !== undefined &&
      !dto.audienceId.trim()
    ) {
      throw new BadRequestException(
        "Audience cannot be empty.",
      );
    }

    if (dto.name !== undefined) {
      form.name = dto.name.trim();
    }

    if (dto.audienceId !== undefined) {
      form.audienceId = dto.audienceId.trim();
    }

    if (dto.display !== undefined) {
      form.display = dto.display;
    }

    if (dto.title !== undefined) {
      form.title = dto.title;
    }

    if (dto.description !== undefined) {
      form.description = dto.description;
    }

    if (dto.submitLabel !== undefined) {
      form.submitLabel = dto.submitLabel;
    }

    if (dto.fields !== undefined) {
      form.fields = dto.fields.map((field) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        placeholder: field.placeholder ?? "",
        required: Boolean(field.required),
        options: Array.isArray(field.options)
          ? field.options
          : [],
      }));
    }

    /**
     * These two properties are allowed for administrative
     * updates, but normal FormsPage saves will simply keep
     * their existing values.
     */
    if (dto.submissions !== undefined) {
      form.submissions = dto.submissions;
    }

    if (dto.conversionRate !== undefined) {
      form.conversionRate = dto.conversionRate;
    }

    await form.save();

    return this.serialize(form);
  }

  /**
   * DELETE /fockis-mail/forms/:id
   */
  async remove(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("Form not found");
    }

    const form = await this.forms.findOneAndDelete({
      _id: id,
      ownerId,
      workspaceId,
    });

    if (!form) {
      throw new NotFoundException("Form not found");
    }

    return {
      success: true,
      id,
    };
  }
}