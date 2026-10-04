import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  MailTag,
  MailTagDocument,
} from '../schemas/tag.schema';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(MailTag.name)
    private readonly tags: Model<MailTagDocument>,
  ) {}

  async list(
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    const tags = await this.tags
      .find({
        ownerId,
        workspaceId,
      })
      .sort({
        name: 1,
      })
      .lean();

    return tags.map((tag) => this.serialize(tag));
  }

  async create(
    ownerId: Types.ObjectId,
    workspaceId: string,
    input: {
      name: string;
      color?: string;
    },
  ) {
    const name = String(
      input.name ?? '',
    ).trim();

    if (!name) {
      throw new BadRequestException(
        'Tag name is required.',
      );
    }

    const existing =
      await this.tags.findOne({
        ownerId,
        workspaceId,
        name,
      });

    if (existing) {
      throw new BadRequestException(
        `A tag named "${name}" already exists.`,
      );
    }

    const tag = await this.tags.create({
      ownerId,
      workspaceId,
      name,
      color:
        input.color?.trim() ||
        '#2563eb',
      contactCount: 0,
      lastUsedAt: null,
    });

    return this.serialize(tag);
  }

  async update(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
    input: {
      name?: string;
      color?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid tag ID.',
      );
    }

    const update: Record<
      string,
      unknown
    > = {};

    if (input.name !== undefined) {
      const name = String(
        input.name,
      ).trim();

      if (!name) {
        throw new BadRequestException(
          'Tag name cannot be empty.',
        );
      }

      update.name = name;
    }

    if (input.color !== undefined) {
      update.color =
        String(input.color).trim() ||
        '#2563eb';
    }

    const tag =
      await this.tags.findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          ownerId,
          workspaceId,
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      );

    if (!tag) {
      throw new NotFoundException(
        'Tag not found.',
      );
    }

    return this.serialize(tag);
  }

  async remove(
    id: string,
    ownerId: Types.ObjectId,
    workspaceId: string,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid tag ID.',
      );
    }

    const result =
      await this.tags.deleteOne({
        _id: new Types.ObjectId(id),
        ownerId,
        workspaceId,
      });

    if (!result.deletedCount) {
      throw new NotFoundException(
        'Tag not found.',
      );
    }

    return {
      success: true,
    };
  }

  private serialize(
    tag: any,
  ) {
    return {
      id: String(tag._id),
      businessId: tag.workspaceId,
      workspaceId: tag.workspaceId,
      name: tag.name,
      color:
        tag.color || '#2563eb',
      contactCount:
        Number(tag.contactCount) || 0,
      lastUsedAt:
        tag.lastUsedAt
          ? new Date(
              tag.lastUsedAt,
            ).toISOString()
          : null,
      createdAt:
        tag.createdAt
          ? new Date(
              tag.createdAt,
            ).toISOString()
          : new Date().toISOString(),
      updatedAt:
        tag.updatedAt
          ? new Date(
              tag.updatedAt,
            ).toISOString()
          : new Date().toISOString(),
    };
  }
}