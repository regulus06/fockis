import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Template,
  TemplateDocument,
} from '../schemas/create-template.schema';

import {
  TemplateVersion,
  TemplateVersionDocument,
} from '../schemas/create-template-version.schema';

import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { PaginatedResult } from '../dto/pagination.dto';

import {
  InvalidTemplateException,
  TemplateInactiveException,
  TemplateNotFoundException,
} from '../constants/errors';

import { assertValidObjectId } from '../utils/object-id.util';
import { slugify } from '../utils/slugify.util';

import { CreateToolType } from '../interfaces/editor.interfaces';

export interface TemplateListQuery {
  page?: number;
  limit?: number;
  sort?: string;
  category?: string;
  type?: CreateToolType;
  premium?: boolean;
  featured?: boolean;
  search?: string;
  includeInactive?: boolean;
}

@Injectable()
export class CreateTemplateService {
  constructor(
    @InjectModel(Template.name)
    private readonly templateModel: Model<TemplateDocument>,

    @InjectModel(TemplateVersion.name)
    private readonly templateVersionModel: Model<TemplateVersionDocument>,
  ) {}

  // ==========================================================================
  // PUBLIC / BROWSING
  // ==========================================================================

  async list(
    query: TemplateListQuery = {},
  ): Promise<PaginatedResult<TemplateDocument>> {
    const page =
      query.page && query.page > 0
        ? query.page
        : 1;

    const limit =
      query.limit && query.limit > 0
        ? Math.min(query.limit, 100)
        : 20;

    /**
     * Do not use Mongoose FilterQuery here.
     * Your installed Mongoose version does not export it.
     *
     * Record<string, any> works cleanly with the current version.
     */
    const filter: Record<string, any> =
      query.includeInactive
        ? {}
        : { isActive: true };

    if (query.category) {
      filter.categoryId =
        Types.ObjectId.isValid(query.category)
          ? new Types.ObjectId(query.category)
          : query.category;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.premium !== undefined) {
      filter.isPremium = query.premium;
    }

    if (query.featured !== undefined) {
      filter.isFeatured = query.featured;
    }

    if (query.search?.trim()) {
      filter.$text = {
        $search: query.search.trim(),
      };
    }

    const sort =
      this.parseSort(query.sort) || {
        createdAt: -1,
      };

    const [items, total] =
      await Promise.all([
        this.templateModel
          .find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec(),

        this.templateModel.countDocuments(filter),
      ]);

    return {
      items: items as any,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(
          1,
          Math.ceil(total / limit),
        ),
      },
    };
  }

  async findFeatured(limit = 12) {
    return this.templateModel
      .find({
        isActive: true,
        isFeatured: true,
      })
      .sort({
        updatedAt: -1,
      })
      .limit(limit)
      .lean()
      .exec();
  }

  async findPopular(limit = 12) {
    return this.templateModel
      .find({
        isActive: true,
      })
      .sort({
        usageCount: -1,
      })
      .limit(limit)
      .lean()
      .exec();
  }

  async findRecent(limit = 12) {
    return this.templateModel
      .find({
        isActive: true,
      })
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean()
      .exec();
  }

  async findByCategory(
    categoryId: string,
    query: TemplateListQuery = {},
  ) {
    assertValidObjectId(categoryId);

    return this.list({
      ...query,
      category: categoryId,
    });
  }

  async search(
    q: string,
    query: TemplateListQuery = {},
  ) {
    return this.list({
      ...query,
      search: q,
    });
  }

  async findById(
    id: string,
    opts: {
      requireActive?: boolean;
    } = {
      requireActive: true,
    },
  ) {
    assertValidObjectId(id);

    const template =
      await this.templateModel
        .findById(id)
        .lean()
        .exec();

    if (!template) {
      throw new TemplateNotFoundException(id);
    }

    if (
      opts.requireActive &&
      !template.isActive
    ) {
      throw new TemplateInactiveException();
    }

    return template;
  }

  async findBySlug(
    slug: string,
    opts: {
      requireActive?: boolean;
    } = {
      requireActive: true,
    },
  ) {
    const template =
      await this.templateModel
        .findOne({
          slug: slug.toLowerCase(),
        })
        .lean()
        .exec();

    if (!template) {
      throw new TemplateNotFoundException(
        slug,
      );
    }

    if (
      opts.requireActive &&
      !template.isActive
    ) {
      throw new TemplateInactiveException();
    }

    return template;
  }

  // ==========================================================================
  // VERSIONS
  // ==========================================================================

  async getVersionSnapshot(
    templateId: string,
    version: number,
  ) {
    assertValidObjectId(templateId);

    return this.templateVersionModel
      .findOne({
        templateId:
          new Types.ObjectId(templateId),
        version,
      })
      .lean()
      .exec();
  }

  async incrementUsage(
    templateId: string,
  ) {
    assertValidObjectId(templateId);

    await this.templateModel.updateOne(
      {
        _id: new Types.ObjectId(
          templateId,
        ),
      },
      {
        $inc: {
          usageCount: 1,
        },
      },
    );
  }

  // ==========================================================================
  // ADMIN
  // ==========================================================================

  async create(
    dto: CreateTemplateDto,
    adminUserId: string,
  ) {
    if (
      !dto.fields?.length &&
      !dto.elements?.length
    ) {
      throw new InvalidTemplateException(
        'Template must define at least one field or element',
      );
    }

    assertValidObjectId(
      dto.categoryId,
    );

    assertValidObjectId(
      adminUserId,
    );

    const slug = (
      dto.slug ||
      slugify(dto.name)
    ).toLowerCase();

    const existing =
      await this.templateModel
        .findOne({ slug })
        .lean()
        .exec();

    if (existing) {
      throw new InvalidTemplateException(
        `Template slug "${slug}" already exists`,
      );
    }

    const template =
      await this.templateModel.create({
        ...dto,

        slug,

        categoryId:
          new Types.ObjectId(
            dto.categoryId,
          ),

        version: 1,

        isActive: false,

        createdBy:
          new Types.ObjectId(
            adminUserId,
          ),
      });

    await this.snapshotVersion(
      template,
      adminUserId,
      'Initial version',
    );

    return template;
  }

  async update(
    id: string,
    dto: UpdateTemplateDto,
    adminUserId: string,
  ) {
    assertValidObjectId(id);
    assertValidObjectId(adminUserId);

    const template =
      await this.templateModel
        .findById(id)
        .exec();

    if (!template) {
      throw new TemplateNotFoundException(
        id,
      );
    }

    const structuralChange =
      dto.fields !== undefined ||
      dto.elements !== undefined ||
      dto.canvas !== undefined;

    Object.assign(template, {
      ...dto,

      categoryId:
        dto.categoryId
          ? new Types.ObjectId(
              dto.categoryId,
            )
          : template.categoryId,
    });

    if (structuralChange) {
      template.version += 1;
    }

    await template.save();

    if (structuralChange) {
      await this.snapshotVersion(
        template,
        adminUserId,
        dto.changeNote,
      );
    }

    return template;
  }

  async remove(id: string) {
    assertValidObjectId(id);

    const template =
      await this.templateModel
        .findByIdAndUpdate(
          id,
          {
            isActive: false,
          },
          {
            new: true,
          },
        )
        .exec();

    if (!template) {
      throw new TemplateNotFoundException(
        id,
      );
    }

    return {
      deleted: true,
    };
  }

  async publish(id: string) {
    return this.setFlag(
      id,
      'isActive',
      true,
    );
  }

  async unpublish(id: string) {
    return this.setFlag(
      id,
      'isActive',
      false,
    );
  }

  async feature(
    id: string,
    featured = true,
  ) {
    return this.setFlag(
      id,
      'isFeatured',
      featured,
    );
  }

  async setPremium(
    id: string,
    premium = true,
  ) {
    return this.setFlag(
      id,
      'isPremium',
      premium,
    );
  }

  async listVersions(id: string) {
    assertValidObjectId(id);

    return this.templateVersionModel
      .find({
        templateId:
          new Types.ObjectId(id),
      })
      .sort({
        version: -1,
      })
      .lean()
      .exec();
  }

  // ==========================================================================
  // PRIVATE
  // ==========================================================================

  private async setFlag(
    id: string,
    flag:
      | 'isActive'
      | 'isFeatured'
      | 'isPremium',
    value: boolean,
  ) {
    assertValidObjectId(id);

    const template =
      await this.templateModel
        .findByIdAndUpdate(
          id,
          {
            [flag]: value,
          },
          {
            new: true,
          },
        )
        .exec();

    if (!template) {
      throw new TemplateNotFoundException(
        id,
      );
    }

    return template;
  }

  private async snapshotVersion(
    template: TemplateDocument,
    adminUserId: string,
    changeNote?: string,
  ) {
    assertValidObjectId(
      adminUserId,
    );

    await this.templateVersionModel.create(
      {
        templateId:
          template._id,

        version:
          template.version,

        canvas:
          template.canvas,

        fields:
          template.fields,

        elements:
          template.elements,

        createdBy:
          new Types.ObjectId(
            adminUserId,
          ),

        changeNote,
      },
    );
  }

  private parseSort(
    sort?: string,
  ): Record<string, 1 | -1> | undefined {
    if (!sort) {
      return undefined;
    }

    const direction: 1 | -1 =
      sort.startsWith('-')
        ? -1
        : 1;

    const field =
      sort.replace(/^-/, '');

    return {
      [field]: direction,
    };
  }
}