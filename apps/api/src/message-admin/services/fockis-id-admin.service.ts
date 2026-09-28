import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  FockisIdSettings,
  FockisIdSettingsDocument,
} from '../schemas/fockis-id-settings.schema';

import { UpdateFockisIdPricingDto } from '../dto/update-fockis-id-pricing.dto';
import { UpdateFockisIdSettingsDto } from '../dto/update-fockis-id-settings.dto';

@Injectable()
export class FockisIdAdminService {
  constructor(
    @InjectModel(FockisIdSettings.name)
    private readonly fockisIdSettingsModel: Model<FockisIdSettingsDocument>,
  ) {}

  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  async getSettings(): Promise<FockisIdSettings> {
    let settings =
      await this.fockisIdSettingsModel
        .findOne({})
        .lean()
        .exec();

    if (!settings) {
      const created =
        await this.fockisIdSettingsModel.create({
          price: null,
        });

      settings = created.toObject();
    }

    return settings as FockisIdSettings;
  }

  // ==========================================================================
  // PRICING
  // ==========================================================================

  async updatePricing(
    dto: UpdateFockisIdPricingDto,
  ): Promise<FockisIdSettings> {
    const update: Record<string, unknown> = {};

    // ------------------------------------------------------------------------
    // PRICE
    //
    // null means the administrator has not configured a price yet.
    // We intentionally do NOT provide a fallback price.
    // ------------------------------------------------------------------------

    if (dto.price !== undefined) {
      update.price =
        dto.price === null
          ? null
          : Number(dto.price);
    }

    // ------------------------------------------------------------------------
    // CURRENCY
    // ------------------------------------------------------------------------

    if (dto.currency !== undefined) {
      update.currency =
        String(dto.currency)
          .trim()
          .toUpperCase();
    }

    // ------------------------------------------------------------------------
    // PAYMENT TYPE
    // ------------------------------------------------------------------------

    if (dto.oneTime !== undefined) {
      update.oneTime =
        dto.oneTime;
    }

    if (dto.recurring !== undefined) {
      update.recurring =
        dto.recurring;
    }

    if (dto.requirePayment !== undefined) {
      update.requirePayment =
        dto.requirePayment;
    }

    // ------------------------------------------------------------------------
    // SAVE
    // ------------------------------------------------------------------------

    const settings =
      await this.fockisIdSettingsModel.findOneAndUpdate(
        {},
        {
          $set: update,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

    if (!settings) {
      throw new NotFoundException(
        'Fockis ID pricing could not be updated.',
      );
    }

    return settings.toObject();
  }

  // ==========================================================================
  // GENERAL FOCKIS ID SETTINGS
  // ==========================================================================

  async updateSettings(
    dto: UpdateFockisIdSettingsDto,
  ): Promise<FockisIdSettings> {
    const settings =
      await this.fockisIdSettingsModel.findOneAndUpdate(
        {},
        {
          $set: dto,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        },
      );

    if (!settings) {
      throw new NotFoundException(
        'Fockis ID settings could not be updated.',
      );
    }

    return settings.toObject();
  }

  // ==========================================================================
  // PUBLIC PRICING
  // ==========================================================================

  async getPublicPricing(): Promise<{
    price: number | null;
    currency: string;
    oneTime: boolean;
    recurring: boolean;
    requirePayment: boolean;
  }> {
    const settings =
      await this.getSettings();

    return {
      price:
        settings.price === null ||
        settings.price === undefined
          ? null
          : Number(settings.price),

      currency:
        String(
          settings.currency || 'USD',
        )
          .trim()
          .toUpperCase(),

      oneTime:
        settings.oneTime === true,

      recurring:
        settings.recurring === true,

      requirePayment:
        settings.requirePayment === true,
    };
  }

  // ==========================================================================
  // PUBLIC SETTINGS
  // ==========================================================================

  async getPublicSettings() {
    const settings =
      await this.getSettings();

    return {
      registrationEnabled:
        settings.registrationEnabled,

      uniquenessRequired:
        settings.uniquenessRequired,

      caseInsensitive:
        settings.caseInsensitive,

      minimumLength:
        settings.minimumLength,

      maximumLength:
        settings.maximumLength,

      allowedCharactersPattern:
        settings.allowedCharactersPattern,

      reservationDays:
        settings.reservationDays,

      allowUserChange:
        settings.allowUserChange,

      allowUsernameStyleIds:
        settings.allowUsernameStyleIds,

      allowNumbers:
        settings.allowNumbers,

      allowUnderscore:
        settings.allowUnderscore,

      allowHyphen:
        settings.allowHyphen,

      allowPeriod:
        settings.allowPeriod,

      // ----------------------------------------------------------------------
      // ADMIN-CONTROLLED PRICING
      // ----------------------------------------------------------------------

      price:
        settings.price === null ||
        settings.price === undefined
          ? null
          : Number(settings.price),

      currency:
        String(
          settings.currency || 'USD',
        )
          .trim()
          .toUpperCase(),

      oneTime:
        settings.oneTime === true,

      recurring:
        settings.recurring === true,

      requirePayment:
        settings.requirePayment === true,
    };
  }
}