import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  MarketplaceCommission,
  MarketplaceCommissionDocument,
} from "../schemas/marketplace-commission.schema";
import { calculateCommission } from "../../marketplace-finance/payout-math";

export interface CommissionQuote {
  rate: number;
  fixedCents: number;
  minCents: number;
  maxCents: number | null;
  subtotalCents: number;
  commissionCents: number;
  sellerCents: number;
  source: "store" | "category" | "default";
}

export interface UpdateCommissionSettings {
  defaultRate?: number;
  defaultFixedCents?: number;
  minCommissionCents?: number;
  maxCommissionCents?: number | null;
  categoryRates?: Array<{ key: string; rate: number }>;
  storeRates?: Array<{ key: string; rate: number }>;
  isActive?: boolean;
}

/** Rates may have up to two decimals (12.25 %); they are stored as given. */
function toBps(rate: number): number {
  return Math.round(rate * 100);
}

const SETTINGS_ID = "marketplace";

@Injectable()
export class MarketplaceCommissionService {
  constructor(
    @InjectModel(MarketplaceCommission.name)
    private readonly settingsModel: Model<MarketplaceCommissionDocument>,
  ) {}

  private validateRate(rate: unknown, label = "Commission rate"): number {
    const value = Number(rate);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new BadRequestException(`${label} must be between 0 and 100.`);
    }
    return Math.round(value * 100) / 100;
  }

  private validateCents(value: unknown, label: string, allowNull = false): number | null {
    if (allowNull && (value === null || value === "")) return null;
    const cents = Number(value);
    if (!Number.isSafeInteger(cents) || cents < 0) {
      throw new BadRequestException(`${label} must be a whole number of cents, 0 or more.`);
    }
    return cents;
  }

  private normalizeOverrides(
    values: Array<{ key: string; rate: number }> | undefined,
    label: string,
  ) {
    if (values === undefined) return undefined;
    if (!Array.isArray(values)) {
      throw new BadRequestException(`${label} must be an array.`);
    }

    const seen = new Set<string>();
    return values.map((item) => {
      const key = String(item?.key ?? "").trim();
      if (!key) throw new BadRequestException(`${label} contains an empty key.`);
      if (seen.has(key)) {
        throw new BadRequestException(`${label} contains duplicate key "${key}".`);
      }
      seen.add(key);
      return { key, rate: this.validateRate(item.rate, `${label} rate`) };
    });
  }

  async getSettings() {
    const settings = await this.settingsModel
      .findOneAndUpdate(
        { _id: SETTINGS_ID },
        {
          $setOnInsert: {
            defaultRate: 10,
            defaultFixedCents: 0,
            minCommissionCents: 0,
            maxCommissionCents: null,
            categoryRates: [],
            storeRates: [],
            isActive: true,
            auditLog: [],
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    return settings;
  }

  async updateSettings(
    actorUserId: string,
    input: UpdateCommissionSettings,
  ) {
    if (!actorUserId?.trim()) {
      throw new BadRequestException("An authenticated admin ID is required.");
    }

    const current = await this.getSettings();
    const update: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (input.defaultRate !== undefined) {
      update.defaultRate = this.validateRate(input.defaultRate);
      changes.defaultRate = {
        from: current.defaultRate,
        to: update.defaultRate,
      };
    }
    if (input.defaultFixedCents !== undefined) {
      update.defaultFixedCents = this.validateCents(input.defaultFixedCents, "Fixed commission");
      changes.defaultFixedCents = { from: current.defaultFixedCents ?? 0, to: update.defaultFixedCents };
    }
    if (input.minCommissionCents !== undefined) {
      update.minCommissionCents = this.validateCents(input.minCommissionCents, "Minimum commission");
      changes.minCommissionCents = { from: current.minCommissionCents ?? 0, to: update.minCommissionCents };
    }
    if (input.maxCommissionCents !== undefined) {
      update.maxCommissionCents = this.validateCents(input.maxCommissionCents, "Maximum commission", true);
      changes.maxCommissionCents = { from: current.maxCommissionCents ?? null, to: update.maxCommissionCents };
    }
    const minAfter = (update.minCommissionCents as number | undefined) ?? current.minCommissionCents ?? 0;
    const maxAfter =
      update.maxCommissionCents !== undefined
        ? (update.maxCommissionCents as number | null)
        : current.maxCommissionCents ?? null;
    if (maxAfter !== null && maxAfter < minAfter) {
      throw new BadRequestException("Maximum commission cannot be lower than the minimum commission.");
    }
    if (input.categoryRates !== undefined) {
      update.categoryRates = this.normalizeOverrides(
        input.categoryRates,
        "Category rates",
      );
      changes.categoryRates = update.categoryRates;
    }
    if (input.storeRates !== undefined) {
      update.storeRates = this.normalizeOverrides(
        input.storeRates,
        "Store rates",
      );
      changes.storeRates = update.storeRates;
    }
    if (input.isActive !== undefined) {
      update.isActive = Boolean(input.isActive);
      changes.isActive = { from: current.isActive, to: update.isActive };
    }

    if (Object.keys(update).length === 0) {
      throw new BadRequestException("Provide at least one setting to update.");
    }

    const newDefaultRate =
      (update.defaultRate as number | undefined) ?? current.defaultRate;

    const updated = await this.settingsModel
      .findOneAndUpdate(
        { _id: SETTINGS_ID },
        {
          $set: update,
          $push: {
            auditLog: {
              $each: [{
                action: "commission_settings_updated",
                previousDefaultRate: current.defaultRate,
                newDefaultRate,
                changedBy: actorUserId,
                changedAt: new Date(),
                changes,
              }],
              $slice: -200,
            },
          },
        },
        { returnDocument: "after", runValidators: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    return updated;
  }

  async quote(input: {
    subtotalCents: number;
    storeId?: string;
    categoryId?: string;
  }): Promise<CommissionQuote> {
    const subtotalCents = Math.round(Number(input.subtotalCents));
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0) {
      throw new BadRequestException("subtotalCents must be a non-negative integer.");
    }

    const settings = await this.getSettings();
    if (!settings?.isActive) {
      throw new NotFoundException("Marketplace commission settings are disabled.");
    }

    const storeId = String(input.storeId ?? "");
    const categoryId = String(input.categoryId ?? "");

    const storeOverride = storeId
      ? settings.storeRates?.find((item) => item.key === storeId)
      : undefined;
    const categoryOverride = categoryId
      ? settings.categoryRates?.find((item) => item.key === categoryId)
      : undefined;

    const rate = storeOverride?.rate ??
      categoryOverride?.rate ??
      settings.defaultRate;

    const source: CommissionQuote["source"] = storeOverride
      ? "store"
      : categoryOverride
        ? "category"
        : "default";

    // Fixed, minimum and maximum amounts are marketplace-wide (per shipment).
    const fixedCents = settings.defaultFixedCents ?? 0;
    const minCents = settings.minCommissionCents ?? 0;
    const maxCents = settings.maxCommissionCents ?? null;

    const commissionCents = calculateCommission(subtotalCents, {
      percentBps: toBps(rate),
      fixedCents,
      minCents,
      maxCents,
    });
    return {
      rate,
      fixedCents,
      minCents,
      maxCents,
      subtotalCents,
      commissionCents,
      sellerCents: subtotalCents - commissionCents,
      source,
    };
  }
}
