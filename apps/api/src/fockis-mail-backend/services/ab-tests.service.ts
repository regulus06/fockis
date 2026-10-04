import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ABTest,
  ABTestDocument,
} from '../schemas/ab-test.schema';

import {
  CreateAbTestDto,
  UpdateAbTestDto,
} from '../dto/fockis-mail.dto';

@Injectable()
export class AbTestsService {
  constructor(
    @InjectModel(ABTest.name)
    private readonly model: Model<ABTestDocument>,
  ) {}

  private normalizeId(value: unknown): string {
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }

    return String(value);
  }

  private toApi(document: any) {
    if (!document) {
      return document;
    }

    const value =
      typeof document.toObject === 'function'
        ? document.toObject()
        : document;

    return {
      id: this.normalizeId(value._id),

      // The frontend contract calls this businessId.
      // The backend securely scopes records by workspaceId.
      businessId: String(value.workspaceId),

      name: value.name,
      variable: value.variable,
      status: value.status,
      testSizePct: value.testSizePct,
      winnerMetric: value.winnerMetric,

      variants: (value.variants ?? []).map((variant: any) => ({
        key: variant.key,
        label: variant.label,
        value: variant.value,
        recipients: Number(variant.recipients ?? 0),
        openRate: Number(variant.openRate ?? 0),
        clickRate: Number(variant.clickRate ?? 0),
        conversionRate: Number(
          variant.conversionRate ?? 0,
        ),
        revenue: Number(variant.revenue ?? 0),
      })),

      ...(value.declaredWinner
        ? {
            declaredWinner: value.declaredWinner,
          }
        : {}),

      ...(value.startedAt
        ? {
            startedAt:
              value.startedAt instanceof Date
                ? value.startedAt.toISOString()
                : value.startedAt,
          }
        : {}),
    };
  }

  private validateVariants(variants: any[]) {
    if (!Array.isArray(variants) || variants.length !== 2) {
      throw new BadRequestException(
        'An A/B test requires exactly two variants.',
      );
    }

    const keys = variants.map((variant) => variant?.key);

    if (
      !keys.includes('A') ||
      !keys.includes('B') ||
      new Set(keys).size !== 2
    ) {
      throw new BadRequestException(
        'A/B tests must contain exactly Variant A and Variant B.',
      );
    }

    for (const variant of variants) {
      if (!String(variant?.value ?? '').trim()) {
        throw new BadRequestException(
          `Variant ${variant?.key ?? ''} requires a value.`,
        );
      }
    }
  }

  async list(
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const tests = await this.model
      .find({
        ownerId,
        workspaceId,
      })
      .sort({ createdAt: -1 })
      .lean();

    return tests.map((test) => this.toApi(test));
  }

  async get(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid A/B test id.',
      );
    }

    const test = await this.model
      .findOne({
        _id: id,
        ownerId,
        workspaceId,
      })
      .lean();

    if (!test) {
      throw new NotFoundException(
        'A/B test not found.',
      );
    }

    return this.toApi(test);
  }

  async create(
    dto: CreateAbTestDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    this.validateVariants(dto.variants);

    const created = await this.model.create({
      name: dto.name.trim(),
      variable: dto.variable,
      status: dto.status ?? 'draft',
      testSizePct: dto.testSizePct,
      winnerMetric: dto.winnerMetric,

      variants: dto.variants.map((variant) => ({
        key: variant.key,
        label: variant.label,
        value: variant.value.trim(),
        recipients: variant.recipients ?? 0,
        openRate: variant.openRate ?? 0,
        clickRate: variant.clickRate ?? 0,
        conversionRate:
          variant.conversionRate ?? 0,
        revenue: variant.revenue ?? 0,
      })),

      declaredWinner: dto.declaredWinner,
      startedAt: dto.startedAt,

      ownerId,
      workspaceId,
    });

    return this.toApi(created);
  }

  async update(
    id: string,
    dto: UpdateAbTestDto,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid A/B test id.',
      );
    }

    if (dto.variants) {
      this.validateVariants(dto.variants);
    }

    const update: Record<string, any> = {
      ...dto,
    };

    if (typeof dto.name === 'string') {
      update.name = dto.name.trim();
    }

    if (dto.variants) {
      update.variants = dto.variants.map(
        (variant) => ({
          key: variant.key,
          label: variant.label,
          value: variant.value.trim(),
          recipients: variant.recipients ?? 0,
          openRate: variant.openRate ?? 0,
          clickRate: variant.clickRate ?? 0,
          conversionRate:
            variant.conversionRate ?? 0,
          revenue: variant.revenue ?? 0,
        }),
      );
    }

    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          ownerId,
          workspaceId,
        },
        update,
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException(
        'A/B test not found.',
      );
    }

    return this.toApi(updated);
  }

  async remove(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid A/B test id.',
      );
    }

    const deleted = await this.model.findOneAndDelete({
      _id: id,
      ownerId,
      workspaceId,
    });

    if (!deleted) {
      throw new NotFoundException(
        'A/B test not found.',
      );
    }

    return {
      success: true,
      id,
    };
  }
}