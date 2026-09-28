import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  MusicPlatformRules,
  MusicPlatformRulesDocument,
} from './music-rules.schema';

import {
  UpdateMusicRulesDto,
} from './dto/update-music-rules.dto';

@Injectable()
export class MusicRulesService {

  constructor(
    @InjectModel(MusicPlatformRules.name)
    private readonly rulesModel:
      Model<MusicPlatformRulesDocument>,
  ) {}

  private getDefaultRules() {
    return {
      version: 1,

      releaseRules: [
        {
          type: 'single',
          label: 'Single',
          description:
            'A single release containing one or two pieces of content.',
          minItems: 1,
          maxItems: 2,
          enabled: true,
        },
        {
          type: 'ep',
          label: 'EP',
          description:
            'An extended play release containing three to six pieces of content.',
          minItems: 3,
          maxItems: 6,
          enabled: true,
        },
        {
          type: 'album',
          label: 'Album',
          description:
            'A full album containing seven to twenty-five pieces of content.',
          minItems: 7,
          maxItems: 25,
          enabled: true,
        },
        {
          type: 'series',
          label: 'Series',
          description:
            'A multi-episode release containing two to twenty-five episodes.',
          minItems: 2,
          maxItems: 25,
          enabled: true,
        },
        {
          type: 'video',
          label: 'Video',
          description:
            'A standalone video release.',
          minItems: 1,
          maxItems: 1,
          enabled: true,
        },
      ],

      preview: {
        enabled: true,
        minSeconds: 10,
        maxSeconds: 120,
        defaultSeconds: 30,
      },

      pricing: {
        enabled: true,
        minimumPrice: 0,
        maximumPrice: 999.99,
        defaultPrice: 0,
        allowFree: true,
        allowPaid: true,
        allowPreviewPaid: true,
        allowPremium: true,
        allowExclusive: true,
      },

      publishing: {
        allowDrafts: true,
        allowScheduledReleases: true,
        requireArtwork: false,
        requireDescription: false,
        requireGenre: false,
        requireTags: false,
        requireCreatorProfile: true,
        requireCreatorApproval: false,
      },

      video: {
        enabled: true,
        maxVideosPerRelease: 1,
        maxDurationMinutes: 180,
      },
    };
  }

  async getRules() {
    let rules =
      await this.rulesModel
        .findOne()
        .lean()
        .exec();

    if (!rules) {
      rules = await this.rulesModel
        .create(this.getDefaultRules());
    }

    return rules;
  }

  async updateRules(
    dto: UpdateMusicRulesDto,
    userId?: string,
  ) {

    this.validateRules(dto);

    const current =
      await this.rulesModel
        .findOne()
        .exec();

    const version =
      current
        ? current.version + 1
        : 1;

    const updated =
      await this.rulesModel.findOneAndUpdate(
        {},
        {
          ...dto,
          version,
          updatedBy:
            userId ||
            dto.updatedBy ||
            undefined,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      ).lean().exec();

    return updated;
  }

  async resetRules(userId?: string) {

    const defaults =
      this.getDefaultRules();

    const current =
      await this.rulesModel
        .findOne()
        .exec();

    const version =
      current
        ? current.version + 1
        : 1;

    return this.rulesModel
      .findOneAndUpdate(
        {},
        {
          ...defaults,
          version,
          updatedBy: userId,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean()
      .exec();
  }

  private validateRules(
    dto: UpdateMusicRulesDto,
  ) {

    if (
      !dto.releaseRules ||
      dto.releaseRules.length === 0
    ) {
      throw new BadRequestException(
        'At least one release rule is required.',
      );
    }

    for (
      const rule of dto.releaseRules
    ) {

      if (
        rule.minItems >
        rule.maxItems
      ) {
        throw new BadRequestException(
          `${rule.label}: minimum cannot be greater than maximum.`,
        );
      }

      if (
        rule.minItems < 0 ||
        rule.maxItems < 0
      ) {
        throw new BadRequestException(
          `${rule.label}: item limits cannot be negative.`,
        );
      }
    }

    if (
      dto.preview.minSeconds >
      dto.preview.maxSeconds
    ) {
      throw new BadRequestException(
        'Preview minimum cannot be greater than maximum.',
      );
    }

    if (
      dto.preview.defaultSeconds <
        dto.preview.minSeconds ||
      dto.preview.defaultSeconds >
        dto.preview.maxSeconds
    ) {
      throw new BadRequestException(
        'Preview default must be between the minimum and maximum preview duration.',
      );
    }

    if (
      dto.pricing.minimumPrice >
      dto.pricing.maximumPrice
    ) {
      throw new BadRequestException(
        'Minimum price cannot be greater than maximum price.',
      );
    }

    if (
      dto.pricing.defaultPrice <
        dto.pricing.minimumPrice ||
      dto.pricing.defaultPrice >
        dto.pricing.maximumPrice
    ) {
      throw new BadRequestException(
        'Default price must be between the minimum and maximum price.',
      );
    }

    if (
      dto.video.maxVideosPerRelease < 0
    ) {
      throw new BadRequestException(
        'Maximum videos per release cannot be negative.',
      );
    }

    if (
      dto.video.maxDurationMinutes < 0
    ) {
      throw new BadRequestException(
        'Maximum video duration cannot be negative.',
      );
    }
  }
}