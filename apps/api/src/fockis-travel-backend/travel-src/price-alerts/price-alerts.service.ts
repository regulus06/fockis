import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  PriceAlert,
  PriceAlertDocument,
} from './price-alert.schema';

@Injectable()
export class PriceAlertsService {
  constructor(
    @InjectModel(PriceAlert.name)
    private readonly model: Model<PriceAlertDocument>,
  ) {}

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private requireUser(
    userId: string,
  ): string {
    if (
      typeof userId !== 'string' ||
      !userId.trim()
    ) {
      throw new BadRequestException(
        'Authenticated user is required.',
      );
    }

    return userId.trim();
  }

  private normalizeCurrency(
    currency: unknown,
  ): string {
    if (
      typeof currency === 'string' &&
      currency.trim()
    ) {
      return currency.trim();
    }

    return '$';
  }

  private normalizePrice(
    value: unknown,
    fallback = 0,
  ): number {
    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
  }

  // ==========================================================================
  // LIST
  // ==========================================================================

  async list(userId: string) {
    const ownerId =
      this.requireUser(userId);

    return this.model
      .find({
        userId: ownerId,
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  async create(
    userId: string,
    data: Record<string, unknown>,
  ) {
    const ownerId =
      this.requireUser(userId);

    // ------------------------------------------------------------------------
    // DESTINATION
    // ------------------------------------------------------------------------

    const destination =
      typeof data.destination === 'string'
        ? data.destination.trim()
        : '';

    if (!destination) {
      throw new BadRequestException(
        'Destination is required.',
      );
    }

    // ------------------------------------------------------------------------
    // TARGET PRICE
    // ------------------------------------------------------------------------

    const targetPrice =
      this.normalizePrice(
        data.targetPrice,
        NaN,
      );

    if (
      !Number.isFinite(targetPrice) ||
      targetPrice <= 0
    ) {
      throw new BadRequestException(
        'A valid target price greater than zero is required.',
      );
    }

    // ------------------------------------------------------------------------
    // CURRENT / ORIGINAL PRICE
    // ------------------------------------------------------------------------

    const currentPrice =
      this.normalizePrice(
        data.currentPrice,
        targetPrice,
      );

    const originalPrice =
      this.normalizePrice(
        data.originalPrice,
        currentPrice,
      );

    // ------------------------------------------------------------------------
    // OPTIONAL LISTING
    // ------------------------------------------------------------------------

    const listingId =
      typeof data.listingId === 'string' &&
      data.listingId.trim()
        ? data.listingId.trim()
        : undefined;

    // ------------------------------------------------------------------------
    // CURRENCY
    // ------------------------------------------------------------------------

    const currency =
      this.normalizeCurrency(
        data.currency,
      );

    // ------------------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------------------

    const paused =
      typeof data.paused === 'boolean'
        ? data.paused
        : false;

    const active =
      typeof data.active === 'boolean'
        ? data.active
        : !paused;

    // ------------------------------------------------------------------------
    // METADATA
    // ------------------------------------------------------------------------

    const metadata =
      data.metadata &&
      typeof data.metadata === 'object' &&
      !Array.isArray(data.metadata)
        ? data.metadata
        : {};

    // ------------------------------------------------------------------------
    // CREATE
    // ------------------------------------------------------------------------

    const created =
      await this.model.create({
        userId: ownerId,

        destination,

        listingId,

        originalPrice,

        currentPrice,

        targetPrice,

        currency,

        paused,

        active,

        metadata,
      });

    return created.toObject();
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  async update(
    userId: string,
    id: string,
    data: Record<string, unknown>,
  ) {
    const ownerId =
      this.requireUser(userId);

    if (
      typeof id !== 'string' ||
      !id.trim()
    ) {
      throw new BadRequestException(
        'Price alert ID is required.',
      );
    }

    const alert =
      await this.model.findOne({
        _id: id,
        userId: ownerId,
      });

    if (!alert) {
      throw new NotFoundException(
        'Price alert not found.',
      );
    }

    // ------------------------------------------------------------------------
    // DESTINATION
    // ------------------------------------------------------------------------

    if (
      data.destination !== undefined
    ) {
      if (
        typeof data.destination !== 'string' ||
        !data.destination.trim()
      ) {
        throw new BadRequestException(
          'Destination must be a non-empty string.',
        );
      }

      alert.destination =
        data.destination.trim();
    }

    // ------------------------------------------------------------------------
    // TARGET PRICE
    // ------------------------------------------------------------------------

    if (
      data.targetPrice !== undefined
    ) {
      const targetPrice =
        this.normalizePrice(
          data.targetPrice,
          NaN,
        );

      if (
        !Number.isFinite(targetPrice) ||
        targetPrice <= 0
      ) {
        throw new BadRequestException(
          'Target price must be greater than zero.',
        );
      }

      alert.targetPrice =
        targetPrice;
    }

    // ------------------------------------------------------------------------
    // ORIGINAL PRICE
    // ------------------------------------------------------------------------

    if (
      data.originalPrice !== undefined
    ) {
      const originalPrice =
        this.normalizePrice(
          data.originalPrice,
          NaN,
        );

      if (
        !Number.isFinite(originalPrice) ||
        originalPrice < 0
      ) {
        throw new BadRequestException(
          'Original price must be a valid number.',
        );
      }

      alert.originalPrice =
        originalPrice;
    }

    // ------------------------------------------------------------------------
    // CURRENT PRICE
    // ------------------------------------------------------------------------

    if (
      data.currentPrice !== undefined
    ) {
      const currentPrice =
        this.normalizePrice(
          data.currentPrice,
          NaN,
        );

      if (
        !Number.isFinite(currentPrice) ||
        currentPrice < 0
      ) {
        throw new BadRequestException(
          'Current price must be a valid number.',
        );
      }

      alert.currentPrice =
        currentPrice;
    }

    // ------------------------------------------------------------------------
    // CURRENCY
    // ------------------------------------------------------------------------

    if (
      data.currency !== undefined
    ) {
      alert.currency =
        this.normalizeCurrency(
          data.currency,
        );
    }

    // ------------------------------------------------------------------------
    // PAUSED
    // ------------------------------------------------------------------------

    if (
      typeof data.paused === 'boolean'
    ) {
      alert.paused =
        data.paused;

      /*
       * Keep active synchronized with paused.
       *
       * paused = true  -> active = false
       * paused = false -> active = true
       */
      alert.active =
        !data.paused;
    }

    // ------------------------------------------------------------------------
    // ACTIVE
    // ------------------------------------------------------------------------

    if (
      typeof data.active === 'boolean'
    ) {
      alert.active =
        data.active;

      /*
       * Keep paused synchronized with active.
       */
      alert.paused =
        !data.active;
    }

    // ------------------------------------------------------------------------
    // OPTIONAL LISTING
    // ------------------------------------------------------------------------

    if (
      data.listingId !== undefined
    ) {
      if (
        data.listingId === null ||
        data.listingId === ''
      ) {
        alert.listingId =
          undefined;
      } else if (
        typeof data.listingId === 'string'
      ) {
        alert.listingId =
          data.listingId.trim();
      }
    }

    // ------------------------------------------------------------------------
    // METADATA
    // ------------------------------------------------------------------------

    if (
      data.metadata !== undefined &&
      data.metadata !== null &&
      typeof data.metadata === 'object' &&
      !Array.isArray(data.metadata)
    ) {
      alert.metadata = {
        ...(alert.metadata ?? {}),
        ...(data.metadata as Record<
          string,
          unknown
        >),
      };
    }

    await alert.save();

    return alert.toObject();
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  async remove(
    userId: string,
    id: string,
  ) {
    const ownerId =
      this.requireUser(userId);

    if (
      typeof id !== 'string' ||
      !id.trim()
    ) {
      throw new BadRequestException(
        'Price alert ID is required.',
      );
    }

    const deleted =
      await this.model.findOneAndDelete({
        _id: id,
        userId: ownerId,
      });

    if (!deleted) {
      throw new NotFoundException(
        'Price alert not found.',
      );
    }

    return {
      ok: true,
      id,
    };
  }
}