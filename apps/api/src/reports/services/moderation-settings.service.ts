import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  ModerationSettings,
  ModerationSettingsDocument,
} from "../schemas/moderation-settings.schema";
import { ModerationThresholds, resolveThresholds } from "../utils/report-policy";
import { UpdateModerationSettingsDto } from "../dto/moderation.dto";

const CACHE_MS = 30_000;

@Injectable()
export class ModerationSettingsService {
  private cache: { value: ModerationThresholds; at: number } | null = null;

  constructor(
    @InjectModel(ModerationSettings.name)
    private readonly settingsModel: Model<ModerationSettingsDocument>,
  ) {}

  async get(): Promise<ModerationThresholds> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) {
      return this.cache.value;
    }

    let stored: Partial<ModerationThresholds> | null = null;

    try {
      stored = (await this.settingsModel.findOne({ key: "default" }).lean().exec()) as any;
    } catch {
      stored = null;
    }

    const value = resolveThresholds(stored);

    this.cache = { value, at: Date.now() };

    return value;
  }

  async update(dto: UpdateModerationSettingsDto, actorId: string): Promise<ModerationThresholds> {
    const current = await this.get();
    const merged = resolveThresholds({ ...current, ...dto });

    await this.settingsModel
      .findOneAndUpdate(
        { key: "default" },
        { $set: { ...merged, updatedBy: actorId } },
        { upsert: true, returnDocument: "after" },
      )
      .exec();

    this.cache = null;

    return this.get();
  }
}
